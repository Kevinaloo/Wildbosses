/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT GATEWAY
   Vercel serverless function — proxy to PayHero STK push.

   PayHero restricts to specific domains on the Hobby plan, so all
   payment API calls must originate from this server (wildbosses.vercel.app),
   never directly from the browser.

   Env vars required (set in Vercel dashboard):
     PAYHERO_USERNAME   — PayHero API username
     PAYHERO_PASSWORD   — PayHero API password
     PAYHERO_CHANNEL_ID — PayHero channel_id
     SUPABASE_URL       — Supabase project URL
     SUPABASE_SERVICE_KEY — Supabase service role key (bypasses RLS)
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');

/* ── helpers ─────────────────────────────────────────────────────── */
function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).end(JSON.stringify(body));
}

function corsOk(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).end();
}

/* ── supabase patch ──────────────────────────────────────────────── */
async function patchBooking(bookingRef, patch) {
  const url  = process.env.SUPABASE_URL + '/rest/v1/bookings';
  const key  = process.env.SUPABASE_SERVICE_KEY;
  const qs   = '?booking_ref=eq.' + encodeURIComponent(bookingRef);
  const resp = await fetch(url + qs, {
    method:  'PATCH',
    headers: {
      apikey:          key,
      Authorization:   'Bearer ' + key,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal'
    },
    body: JSON.stringify(patch)
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error('Supabase PATCH failed: ' + t);
  }
}

/* ── payhero STK push ────────────────────────────────────────────── */
async function stkPush({ phone, amount, reference, description }) {
  const user   = process.env.PAYHERO_USERNAME;
  const pass   = process.env.PAYHERO_PASSWORD;
  const chanId = Number(process.env.PAYHERO_CHANNEL_ID);

  if (!user || !pass || !chanId) {
    throw new Error('PayHero credentials not configured');
  }

  const token  = Buffer.from(user + ':' + pass).toString('base64');

  /* Normalise phone: strip leading zeros / country prefix and re-add 254 */
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0'))   cleaned = '254' + cleaned.slice(1);
  if (cleaned.startsWith('254')) { /* good */ }
  else                           cleaned = '254' + cleaned;

  const body = JSON.stringify({
    amount:           amount,
    phone_number:     cleaned,
    channel_id:       chanId,
    provider:         'M-Pesa',
    external_reference: reference,
    customer_name:    description,
    callback_url:     'https://wildbosses.vercel.app/api/pay-callback'
  });

  const resp = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
    method:  'POST',
    headers: {
      Authorization:  'Basic ' + token,
      'Content-Type': 'application/json'
    },
    body: body
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || JSON.stringify(data));
  return data;  /* { success, reference, CheckoutRequestID, ... } */
}

/* ── main handler ────────────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsOk(res);
  if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' });

  try {
    const { phone, amount, booking_ref, guest_name } = req.body || {};

    if (!phone)       return json(res, 400, { error: 'Phone number is required' });
    if (!amount)      return json(res, 400, { error: 'Amount is required' });
    if (!booking_ref) return json(res, 400, { error: 'Booking reference is required' });

    const amountInt = Math.max(1, Math.round(Number(amount)));
    if (isNaN(amountInt) || amountInt < 1) {
      return json(res, 400, { error: 'Invalid amount' });
    }

    /* 1 · Fire STK push */
    const ph = await stkPush({
      phone:       phone,
      amount:      amountInt,
      reference:   booking_ref,
      description: guest_name || 'Wild Bosses Adventures'
    });

    /* 2 · Record the checkout request ID against the booking */
    if (booking_ref && ph.CheckoutRequestID) {
      await patchBooking(booking_ref, {
        payment_ref:    ph.CheckoutRequestID,
        payment_status: 'pending'
      }).catch(function(e) {
        console.error('patchBooking failed (non-fatal):', e.message);
      });
    }

    return json(res, 200, {
      ok:                  true,
      checkout_request_id: ph.CheckoutRequestID || ph.reference,
      message:             'STK push sent. Enter your M-Pesa PIN.'
    });

  } catch (err) {
    console.error('pay handler error:', err);
    return json(res, 502, { error: err.message || 'Payment request failed' });
  }
};
