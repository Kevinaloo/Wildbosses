/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT GATEWAY — PayHero STK push proxy

   The client may REQUEST an amount. It cannot SET one.

   "Pay any amount, even KES 1 to hold your place" stays exactly as it
   is — that is a product decision and a good one. What changed is that
   the ceiling is now the booking's real outstanding balance, loaded
   from Postgres, and the reference must belong to a live unpaid
   booking. A crafted request can no longer invent its own price, aim
   an STK push at a stranger's phone, or fire in a loop.
   ═══════════════════════════════════════════════════════════════════ */

const ALLOWED = [
  'https://wildbosses.vercel.app',
  'http://localhost:3000'
];

/* Attempts allowed inside the window, per booking and per IP. */
const RATE_WINDOW_MIN  = 15;
const MAX_PER_BOOKING  = 5;
const MAX_PER_IP       = 15;

function setCors(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
}
function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).end(JSON.stringify(body));
}
function corsOk(res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).end();
}
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : String(fwd || '')).split(',')[0].trim()
      || req.socket?.remoteAddress || 'unknown';
}
function normalisePhone(raw) {
  let n = String(raw || '').replace(/\D/g, '');
  if (n.startsWith('0'))    n = '254' + n.slice(1);
  if (!n.startsWith('254')) n = '254' + n;
  return n;
}

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return await fetch(SB_URL + '/rest/v1/' + path, {
    ...init,
    headers: {
      apikey:         SB_KEY,
      Authorization:  'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
}

async function logEvent(row) {
  try {
    await sb('payment_events', {
      method:  'POST',
      headers: { Prefer: 'return=minimal' },
      body:    JSON.stringify({ kind: 'stk_request', ...row })
    });
  } catch (e) {
    console.warn('[pay] audit write failed:', e.message);
  }
}

/* Counts recent attempts straight from the audit table, so the limit
   holds across every serverless instance instead of per-container. */
async function overRateLimit(ref, ip) {
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const q = 'payment_events?select=id&kind=eq.stk_request&created_at=gte.' + since;

  try {
    const [byRef, byIp] = await Promise.all([
      sb(q + '&booking_ref=eq.' + encodeURIComponent(ref), { headers: { Prefer: 'count=exact' } }),
      sb(q + '&ip=eq.'          + encodeURIComponent(ip),  { headers: { Prefer: 'count=exact' } })
    ]);
    const count = (r) => {
      const cr = r.headers.get('content-range') || '';      /* "0-4/5" */
      const n  = Number(cr.split('/')[1]);
      return Number.isFinite(n) ? n : 0;
    };
    if (count(byRef) >= MAX_PER_BOOKING) return 'booking';
    if (count(byIp)  >= MAX_PER_IP)      return 'ip';
    return null;
  } catch (e) {
    console.warn('[pay] rate-limit check failed, allowing:', e.message);
    return null;   /* never block a real customer on an infra hiccup */
  }
}

async function stkPush({ phone, amount, reference, customerName }) {
  const user   = process.env.PAYHERO_USERNAME;
  const pass   = process.env.PAYHERO_PASSWORD;
  const chanId = Number(process.env.PAYHERO_CHANNEL_ID);
  const secret = process.env.WB_CALLBACK_SECRET;

  if (!user || !pass || !chanId) {
    throw new Error('Payment system not configured. Please contact us on WhatsApp to complete your booking.');
  }
  if (!secret) {
    /* Without the secret the callback would reject its own gateway. */
    throw new Error('Payment system not configured (callback secret missing).');
  }

  const token   = Buffer.from(user + ':' + pass).toString('base64');
  const cleaned = normalisePhone(phone);
  if (cleaned.length !== 12) {
    throw new Error('Invalid M-Pesa number. Please use format 0712 345 678.');
  }

  /* The callback lives on supabase.co — a verified production domain,
     so PayHero's hobby-host restriction never applies. No custom
     domain needed. The secret gates it; verification proves it. */
  const callbackUrl = SB_URL + '/functions/v1/pay-callback?k=' + encodeURIComponent(secret);

  const payload = {
    amount:             Math.round(amount),
    phone_number:       cleaned,
    channel_id:         chanId,
    provider:           'M-Pesa',
    network_code:       '63902',            /* Safaricom Kenya */
    external_reference: reference,
    customer_name:      (customerName || 'Wild Bosses Guest').slice(0, 100),
    callback_url:       callbackUrl
  };

  /* Log the shape, never the secret. */
  console.log('[pay] STK push:', JSON.stringify({
    phone: cleaned, amount: payload.amount, ref: reference, chan: chanId
  }));

  const resp    = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
    method:  'POST',
    headers: {
      Authorization:  'Basic ' + token,
      'Content-Type': 'application/json',
      Accept:         'application/json'
    },
    body: JSON.stringify(payload)
  });
  const rawText = await resp.text();

  let data;
  try { data = JSON.parse(rawText); }
  catch {
    console.error('[pay] PayHero non-JSON:', resp.status, rawText.slice(0, 400));
    throw new Error('PayHero returned an unexpected response (HTTP ' + resp.status + '). Please try again.');
  }

  if (!resp.ok) {
    /* Log the full body so we can see exactly what PayHero is rejecting. */
    console.error('[pay] PayHero error', resp.status, 'raw body:', rawText.slice(0, 800));
    throw new Error(
      data.message || data.error || data.detail ||
      (data.errors ? JSON.stringify(data.errors) : 'PayHero error ' + resp.status)
    );
  }
  if (data.success === false) {
    throw new Error(data.message || 'STK push was rejected by PayHero. Please try again.');
  }
  return data;
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return corsOk(res);
  if (req.method !== 'POST')    return json(res, 405, { error: 'Method not allowed' });

  if (!SB_URL || !SB_KEY) {
    console.error('[pay] MISSING ENV — SUPABASE_URL:', !!SB_URL, 'SERVICE_ROLE_KEY:', !!SB_KEY);
    return json(res, 500, { error: 'Server not configured. Please contact us on WhatsApp.' });
  }

  const ip = clientIp(req);

  try {
    const { phone, amount, booking_ref, guest_name } = req.body || {};
    const ref = String(booking_ref || '').trim();
    if (!ref) return json(res, 400, { error: 'Booking reference is required' });

    /* ── 1 · Rate limit before doing any work ──────────────────────── */
    const limited = await overRateLimit(ref, ip);
    if (limited) {
      await logEvent({ booking_ref: ref, outcome: 'rejected', ip, detail: { reason: 'rate_limit_' + limited } });
      return json(res, 429, {
        error: 'Too many payment attempts. Please wait a few minutes, or reach us on WhatsApp.'
      });
    }

    /* ── 2 · The booking is the authority on price ─────────────────── */
    const bRes = await sb(
      'bookings?select=booking_ref,guest_phone,guest_name,total_amount,paid_amount,' +
      'payment_status,status&booking_ref=eq.' + encodeURIComponent(ref) + '&limit=1'
    );
    if (!bRes.ok) throw new Error('Could not load your booking. Please try again.');

    const rows    = await bRes.json();
    const booking = rows && rows[0];

    if (!booking) {
      await logEvent({ booking_ref: ref, outcome: 'rejected', ip, detail: { reason: 'unknown_booking' } });
      return json(res, 404, { error: 'Booking not found. Please start again.' });
    }
    if (booking.payment_status === 'paid') {
      return json(res, 409, { error: 'This booking is already paid. Check your email or WhatsApp us.' });
    }
    if (booking.status === 'cancelled') {
      return json(res, 409, { error: 'This booking was cancelled.' });
    }

    /* ── 3 · Bind the amount ───────────────────────────────────────── */
    const total       = Math.max(0, Number(booking.total_amount) || 0);
    const alreadyPaid = Math.max(0, Number(booking.paid_amount)  || 0);
    const outstanding = Math.max(0, total - alreadyPaid);

    if (outstanding <= 0) {
      return json(res, 409, { error: 'Nothing left to pay on this booking.' });
    }

    /* The request is a preference, clamped to what is actually owed.
       Floor of 1 keeps "pay any amount to hold your place" working. */
    const requested = Math.round(Number(amount));
    const charge    = Number.isFinite(requested) && requested > 0
      ? Math.min(requested, outstanding)
      : outstanding;

    /* ── 4 · Bind the phone. Default to the number on the booking so
            this endpoint cannot be used to push prompts at strangers. */
    const target = phone ? normalisePhone(phone) : normalisePhone(booking.guest_phone);

    const ph = await stkPush({
      phone:        target,
      amount:       charge,
      reference:    ref,
      customerName: guest_name || booking.guest_name
    });

    const checkoutId = ph.CheckoutRequestID || ph.checkout_request_id || ph.reference || null;

    /* checkout_id gets its own column now — payment_ref is left for the
       M-Pesa receipt, so the link between push and receipt survives. */
    if (checkoutId) {
      await sb('bookings?booking_ref=eq.' + encodeURIComponent(ref), {
        method:  'PATCH',
        headers: { Prefer: 'return=minimal' },
        body:    JSON.stringify({
          checkout_id:    checkoutId,
          payment_status: 'pending',
          updated_at:     new Date().toISOString()
        })
      });
    }

    await logEvent({
      booking_ref: ref, outcome: 'ok', amount: charge,
      checkout_id: checkoutId, ip,
      detail: { requested: requested || null, outstanding }
    });

    return json(res, 200, {
      ok:                  true,
      checkout_request_id: checkoutId,
      amount:              charge,     /* so the modal shows what was really charged */
      message:             'STK push sent. Enter your M-Pesa PIN on your phone.'
    });

  } catch (err) {
    console.error('[pay] error:', err.message);
    await logEvent({
      booking_ref: String((req.body || {}).booking_ref || '') || null,
      outcome: 'error', ip, detail: { error: err.message }
    });
    return json(res, 502, { error: err.message || 'Payment request failed. Please try again.' });
  }
};
