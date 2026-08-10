/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT GATEWAY
   Vercel serverless function — proxy to PayHero STK push.

   PayHero restricts to specific domains; all calls must originate
   from wildbosses.vercel.app, never directly from the browser.

   Env vars required (Vercel dashboard → Settings → Environment):
     PAYHERO_USERNAME   — PayHero API username
     PAYHERO_PASSWORD   — PayHero API password
     PAYHERO_CHANNEL_ID — PayHero channel_id (integer)
     SUPABASE_URL       — Supabase project URL
     SUPABASE_SERVICE_KEY — Supabase service role key
   ═══════════════════════════════════════════════════════════════════ */

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

/* ── helpers ─────────────────────────────────────────────────────── */
function normalisePhone(raw) {
  /* Accept: 07xx, +2547xx, 2547xx → always return 2547xxxxxxxx */
  let n = String(raw).replace(/\D/g, '');
  if (n.startsWith('0'))    n = '254' + n.slice(1);
  if (!n.startsWith('254')) n = '254' + n;
  return n;
}

/* ── supabase patch ──────────────────────────────────────────────── */
async function patchBooking(ref, patch) {
  const url  = process.env.SUPABASE_URL + '/rest/v1/bookings';
  const key  = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return; /* non-fatal if Supabase not configured */

  const resp = await fetch(url + '?booking_ref=eq.' + encodeURIComponent(ref), {
    method:  'PATCH',
    headers: {
      apikey:         key,
      Authorization:  'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer:         'return=minimal'
    },
    body: JSON.stringify(patch)
  });
  if (!resp.ok) {
    const t = await resp.text();
    console.warn('[pay] Supabase PATCH warning:', t);
  }
}

/* ── PayHero STK push ────────────────────────────────────────────── */
async function stkPush({ phone, amount, reference, customerName }) {
  const user   = process.env.PAYHERO_USERNAME;
  const pass   = process.env.PAYHERO_PASSWORD;
  const chanId = Number(process.env.PAYHERO_CHANNEL_ID);

  if (!user || !pass || !chanId) {
    throw new Error('Payment system not configured. Please contact us on WhatsApp to book.');
  }

  const token  = Buffer.from(user + ':' + pass).toString('base64');
  const cleaned = normalisePhone(phone);

  /* Validate phone length: 254XXXXXXXXX = 12 digits */
  if (cleaned.length !== 12) {
    throw new Error('Invalid phone number. Use format 07xx xxx xxx.');
  }

  const payload = {
    amount:             Math.round(amount),
    phone_number:       cleaned,
    channel_id:         chanId,
    provider:           'M-Pesa',
    external_reference: reference,
    customer_name:      customerName || 'Wild Bosses Guest',
    callback_url:       'https://wildbosses.vercel.app/api/pay-callback'
  };

  console.log('[pay] STK push → phone:', cleaned, 'amount:', payload.amount, 'ref:', reference);

  const resp = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
    method:  'POST',
    headers: {
      Authorization:  'Basic ' + token,
      'Content-Type': 'application/json',
      Accept:         'application/json'
    },
    body: JSON.stringify(payload)
  });

  let data;
  try {
    data = await resp.json();
  } catch (e) {
    const raw = await resp.text().catch(() => '(no body)');
    throw new Error('PayHero returned an unexpected response: ' + raw.slice(0, 200));
  }

  if (!resp.ok) {
    console.error('[pay] PayHero error:', resp.status, JSON.stringify(data));
    /* Surface a human-friendly message */
    const msg = data.message || data.error || data.detail || JSON.stringify(data);
    throw new Error('Payment request failed: ' + msg);
  }

  console.log('[pay] PayHero response:', JSON.stringify(data));
  return data;
  /* Expected shape: { success, reference, CheckoutRequestID, ResponseDescription, ... } */
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
      phone:        phone,
      amount:       amountInt,
      reference:    booking_ref,
      customerName: guest_name || 'Wild Bosses Guest'
    });

    /* 2 · Record checkout request ID in Supabase (non-fatal) */
    const checkoutId = ph.CheckoutRequestID || ph.checkout_request_id || ph.reference || null;
    if (booking_ref) {
      await patchBooking(booking_ref, {
        payment_ref:    checkoutId,
        payment_status: 'pending',
        updated_at:     new Date().toISOString()
      }).catch(function (e) {
        console.error('[pay] patchBooking non-fatal:', e.message);
      });
    }

    return json(res, 200, {
      ok:                  true,
      checkout_request_id: checkoutId,
      message:             'STK push sent. Check your phone and enter your M-Pesa PIN.'
    });

  } catch (err) {
    console.error('[pay] handler error:', err.message);
    return json(res, 502, {
      error: err.message || 'Payment request failed. Please try again.'
    });
  }
};
