/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT GATEWAY — PayHero STK push proxy
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

function normalisePhone(raw) {
  /* Accept: 07xx / 01xx / +2547xx / 2547xx → always 2547xxxxxxxx (12 digits) */
  let n = String(raw).replace(/\D/g, '');   /* strip everything non-digit */
  if (n.startsWith('0'))    n = '254' + n.slice(1);
  if (!n.startsWith('254')) n = '254' + n;
  return n;
}

async function patchBooking(ref, patch) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(url + '/rest/v1/bookings?booking_ref=eq.' + encodeURIComponent(ref), {
      method: 'PATCH',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(patch)
    });
  } catch(e) { console.warn('[pay] patchBooking non-fatal:', e.message); }
}

async function stkPush({ phone, amount, reference, customerName }) {
  const user   = process.env.PAYHERO_USERNAME;
  const pass   = process.env.PAYHERO_PASSWORD;
  const chanId = Number(process.env.PAYHERO_CHANNEL_ID);

  if (!user || !pass || !chanId) {
    throw new Error('Payment system not configured. Please contact us on WhatsApp to complete your booking.');
  }

  const token   = Buffer.from(user + ':' + pass).toString('base64');
  const cleaned = normalisePhone(phone);

  if (cleaned.length !== 12) {
    throw new Error('Invalid M-Pesa number. Please use format 0712 345 678.');
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

  console.log('[pay] STK push →', JSON.stringify({ phone: cleaned, amount: payload.amount, ref: reference, chan: chanId }));

  const resp = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
    method:  'POST',
    headers: { Authorization: 'Basic ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify(payload)
  });

  let data;
  try   { data = await resp.json(); }
  catch (e) { throw new Error('PayHero returned an unreadable response (status ' + resp.status + ')'); }

  console.log('[pay] PayHero response:', resp.status, JSON.stringify(data));

  if (!resp.ok) {
    /* Surface the most useful field from PayHero's error response */
    const msg = data.message || data.error || data.detail
      || (data.errors && JSON.stringify(data.errors))
      || 'PayHero error ' + resp.status;
    throw new Error(msg);
  }

  /* PayHero returns success=true when STK is queued */
  if (data.success === false) {
    throw new Error(data.message || 'STK push was rejected by PayHero');
  }

  return data;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsOk(res);
  if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' });

  try {
    const { phone, amount, booking_ref, guest_name } = req.body || {};

    if (!phone)       return json(res, 400, { error: 'Phone number is required' });
    if (!amount)      return json(res, 400, { error: 'Amount is required' });
    if (!booking_ref) return json(res, 400, { error: 'Booking reference is required' });

    const amountInt = Math.max(1, Math.round(Number(amount)));
    if (isNaN(amountInt)) return json(res, 400, { error: 'Invalid amount' });

    const ph = await stkPush({ phone, amount: amountInt, reference: booking_ref, customerName: guest_name });

    const checkoutId = ph.CheckoutRequestID || ph.checkout_request_id || ph.reference || null;

    /* Update booking with pending payment ref */
    await patchBooking(booking_ref, {
      payment_ref:    checkoutId,
      payment_status: 'pending',
      updated_at:     new Date().toISOString()
    });

    return json(res, 200, {
      ok:                  true,
      checkout_request_id: checkoutId,
      message:             'STK push sent. Enter your M-Pesa PIN on your phone.'
    });

  } catch (err) {
    console.error('[pay] error:', err.message);
    return json(res, 502, { error: err.message || 'Payment request failed. Please try again.' });
  }
};
