/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT GATEWAY — PayHero STK push proxy

   The client may REQUEST an amount. It cannot SET one. The ceiling is
   the booking's real outstanding balance, loaded from Postgres, and
   the reference must belong to a live unpaid booking. A crafted
   request cannot invent a price, aim a prompt at a stranger's phone,
   or fire in a loop.

   ── WHAT WAS BREAKING ─────────────────────────────────────────────
   PayHero answered every push with HTTP 500:

     pq: new row for relation "checkout_payment_requests" violates
     check constraint "checkout_payment_requests_gateway_check"

   That is PayHero's own database refusing our `provider` value. Their
   gateway column accepts the lowercase token "m-pesa"; we were
   sending "M-Pesa". `network_code` went too — it belongs to the
   sasapay and withdraw flows, not to an M-Pesa STK push.

   Second, quieter break: PayHero returns TWO ids per push. Status
   lookups take `reference` (PayHero's). We were storing and querying
   with `CheckoutRequestID` (Safaricom's), so no payment could ever
   confirm itself. Both are now stored, in their own columns.
   ═══════════════════════════════════════════════════════════════════ */

const PAYHERO_API = 'https://backend.payhero.co.ke/api/v2/payments';

/* Safaricom's per-transaction ceiling. Asking for more than this is
   rejected downstream, so we refuse it here with a sentence a human
   can act on rather than passing it through to a gateway error. */
const MPESA_MAX = 250000;

/* Windows and ceilings, per booking / per IP / per phone / per account.
   The phone and account numbers exist because of PayHero's own abuse
   rules: 10 successive failed pushes to one number blocks that number
   for 24 hours, and 50 failures in 6 hours restricts the whole account
   for 4. Tripping either would take the site's payments down for
   everyone, so we stay well underneath both. */
const LIMITS = [
  { field: 'booking_ref', windowMin:  15, max:  5, label: 'booking' },
  { field: 'ip',          windowMin:  15, max: 15, label: 'ip'      },
  { field: 'phone',       windowMin:  60, max:  5, label: 'phone'   },
  { field: null,          windowMin: 360, max: 40, label: 'account' }
];

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* ── plumbing ─────────────────────────────────────────────────────── */

const ALLOWED = [
  'https://wildbosses.vercel.app',
  'http://localhost:3000'
];

/* Also answers the deployment's own host, so preview builds and a
   future custom domain work without another code change. */
function setCors(req, res) {
  const origin = req.headers && req.headers.origin;
  if (!origin) return;
  let sameHost = false;
  try { sameHost = new URL(origin).host === req.headers.host; } catch { /* malformed */ }
  if (ALLOWED.includes(origin) || sameHost) {
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
  if (n.startsWith('0')) n = '254' + n.slice(1);
  if (!n.startsWith('254')) n = '254' + n;
  return n;
}

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

/* Counts recent attempts straight from the audit table, so limits hold
   across every serverless instance instead of per-container. Only rows
   we actually sent to PayHero count — a request we rejected ourselves
   never reached their abuse counters, so it must not consume our own
   allowance either. */
async function overRateLimit({ ref, ip, phone }) {
  const value = { booking_ref: ref, ip, phone };

  try {
    const checks = await Promise.all(LIMITS.map((lim) => {
      const since = new Date(Date.now() - lim.windowMin * 60000).toISOString();
      let q = 'payment_events?select=id&kind=eq.stk_request&outcome=eq.ok'
            + '&created_at=gte.' + since;
      if (lim.field) {
        const v = value[lim.field];
        if (!v) return Promise.resolve(null);           /* nothing to match on */
        q += '&' + lim.field + '=eq.' + encodeURIComponent(v);
      }
      return sb(q + '&limit=1', { headers: { Prefer: 'count=exact' } });
    }));

    for (let i = 0; i < checks.length; i++) {
      const r = checks[i];
      if (!r || !r.ok) continue;
      const cr = r.headers.get('content-range') || '';          /* "0-0/7" */
      const n  = Number(cr.split('/')[1]);
      if (Number.isFinite(n) && n >= LIMITS[i].max) return LIMITS[i].label;
    }
    return null;
  } catch (e) {
    console.warn('[pay] rate-limit check failed, allowing:', e.message);
    return null;   /* never block a real customer on an infra hiccup */
  }
}

/* ── PayHero ──────────────────────────────────────────────────────── */

/* Their error bodies come in at least three shapes. Dig out whatever
   sentence is in there rather than showing a bare status code. */
function payheroMessage(data) {
  if (!data || typeof data !== 'object') return null;
  const direct = data.error_message || data.message || data.error || data.detail;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (data.errors) {
    const flat = Array.isArray(data.errors)
      ? data.errors.join(', ')
      : Object.values(data.errors).flat().join(', ');
    if (flat) return flat;
  }
  return null;
}

/* PayHero's raw text is for the log, not the customer. Translate the
   failure modes we know into something a traveller can act on. */
function friendlyError(raw, status) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('gateway_check') || s.includes('constraint')) {
    return 'The payment gateway rejected our request. We have been alerted — please try again shortly, or reach us on WhatsApp.';
  }
  if (s.includes('insufficient') && s.includes('balance')) {
    return 'The payment service wallet needs topping up. Please reach us on WhatsApp and we will confirm your place.';
  }
  if (s.includes('blocked') || s.includes('restricted') || s.includes('abuse')) {
    return 'Too many attempts have been made from this number recently. Please wait a few hours, or reach us on WhatsApp.';
  }
  if (s.includes('channel')) {
    return 'The payment channel is not accepting requests right now. Please reach us on WhatsApp and we will confirm your place.';
  }
  if (status === 401 || status === 403) {
    return 'Payment service authentication failed. Please reach us on WhatsApp — your booking is saved.';
  }
  if (raw && raw.length < 160 && !s.includes('pq:') && !s.includes('relation')) return raw;
  return 'The payment service could not start this transaction. Please try again, or reach us on WhatsApp.';
}

async function stkPush({ phone, amount, reference, customerName }) {
  const user   = process.env.PAYHERO_USERNAME;
  const pass   = process.env.PAYHERO_PASSWORD;
  const chanId = Number(process.env.PAYHERO_CHANNEL_ID);
  const secret = process.env.WB_CALLBACK_SECRET;

  if (!user || !pass || !Number.isFinite(chanId) || chanId <= 0) {
    throw new Error('Payment system not configured. Please contact us on WhatsApp to complete your booking.');
  }
  if (!secret) {
    throw new Error('Payment system not configured (callback secret missing).');
  }

  const token = Buffer.from(user + ':' + pass).toString('base64');

  /* The callback lives on supabase.co — a verified production domain,
     so PayHero's block on free-tier callback hosts never applies and
     no custom domain is needed. The secret gates it; verifying every
     payment against PayHero's own API is what actually proves it. */
  const callbackUrl = SB_URL + '/functions/v1/pay-callback?k=' + encodeURIComponent(secret);

  const payload = {
    amount:             Math.round(amount),
    phone_number:       phone,
    channel_id:         chanId,
    provider:           'm-pesa',      /* lowercase — their gateway check is exact */
    external_reference: reference,
    customer_name:      (customerName || 'Wild Bosses Guest').slice(0, 100),
    callback_url:       callbackUrl
  };

  /* Log the shape, never the secret. */
  console.log('[pay] STK push:', JSON.stringify({
    phone, amount: payload.amount, ref: reference, chan: chanId
  }));

  const ctl  = new AbortController();
  const kill = setTimeout(function () { ctl.abort(); }, 12000);

  let resp, rawText;
  try {
    resp = await fetch(PAYHERO_API, {
      method:  'POST',
      headers: {
        Authorization:  'Basic ' + token,
        'Content-Type': 'application/json',
        Accept:         'application/json'
      },
      body:   JSON.stringify(payload),
      signal: ctl.signal
    });
    rawText = await resp.text();
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('The payment service did not respond in time. Please try again.');
    }
    throw new Error('Could not reach the payment service. Please check your connection and try again.');
  } finally {
    clearTimeout(kill);
  }

  let data;
  try { data = JSON.parse(rawText); }
  catch {
    console.error('[pay] PayHero non-JSON:', resp.status, rawText.slice(0, 400));
    throw new Error('The payment service returned an unexpected response. Please try again.');
  }

  if (!resp.ok) {
    /* Full body to the log so the next failure mode is one query away. */
    console.error('[pay] PayHero error', resp.status, 'raw body:', rawText.slice(0, 800));
    const err = new Error(friendlyError(payheroMessage(data), resp.status));
    err.upstream = { status: resp.status, body: rawText.slice(0, 400) };
    throw err;
  }
  if (data.success === false) {
    console.error('[pay] PayHero success:false:', rawText.slice(0, 400));
    const err = new Error(friendlyError(payheroMessage(data), 200));
    err.upstream = { status: 200, body: rawText.slice(0, 400) };
    throw err;
  }

  /* Two ids, two jobs.
       payheroRef  → what /transaction-status takes
       providerRef → Safaricom's, for matching an M-Pesa statement    */
  return {
    payheroRef:  data.reference || data.Reference || null,
    providerRef: data.CheckoutRequestID || data.checkout_request_id || null,
    status:      data.status || null
  };
}

/* ── handler ──────────────────────────────────────────────────────── */

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return corsOk(res);
  if (req.method !== 'POST')    return json(res, 405, { error: 'Method not allowed' });

  if (!SB_URL || !SB_KEY) {
    console.error('[pay] MISSING ENV — SUPABASE_URL:', !!SB_URL, 'SERVICE_ROLE_KEY:', !!SB_KEY);
    return json(res, 500, { error: 'Server not configured. Please contact us on WhatsApp.' });
  }

  const ip = clientIp(req);
  let target = null;

  try {
    const body = req.body || {};
    const ref  = String(body.booking_ref || '').trim();
    if (!ref) return json(res, 400, { error: 'Booking reference is required' });

    /* ── 1 · The booking is the authority on price ──────────────────
       Loaded before the rate-limit check so an unknown reference is
       answered honestly instead of being counted against a limit. */
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

    /* ── 2 · Bind the phone. Defaults to the number on the booking so
            this endpoint cannot push prompts at strangers. ─────────── */
    target = body.phone ? normalisePhone(body.phone) : normalisePhone(booking.guest_phone);
    if (target.length !== 12) {
      return json(res, 400, { error: 'Invalid M-Pesa number. Please use the format 0712 345 678.' });
    }

    /* ── 3 · Rate limit ─────────────────────────────────────────────
       Deliberately after identity is known, so the phone and account
       ceilings can be applied — those are the ones protecting us from
       PayHero's own 24-hour block. */
    const limited = await overRateLimit({ ref: ref, ip: ip, phone: target });
    if (limited) {
      await logEvent({
        booking_ref: ref, outcome: 'rejected', ip, phone: target,
        detail: { reason: 'rate_limit_' + limited }
      });
      const msg = limited === 'phone'
        ? 'That number has had several payment prompts recently. Please wait a while before trying again, or reach us on WhatsApp.'
        : 'Too many payment attempts. Please wait a few minutes, or reach us on WhatsApp.';
      return json(res, 429, { error: msg });
    }

    /* ── 4 · Bind the amount ────────────────────────────────────────
       A trip priced at 0 is pay-what-you-want, so it has no balance to
       clamp against. Everything else is clamped to what is still owed.
       "Pay any amount, even KES 1 to hold your place" survives both. */
    const total       = Math.max(0, Number(booking.total_amount) || 0);
    const alreadyPaid = Math.max(0, Number(booking.paid_amount)  || 0);
    const openEnded   = total === 0;
    const outstanding = openEnded ? MPESA_MAX : Math.max(0, total - alreadyPaid);

    if (outstanding <= 0) {
      return json(res, 409, { error: 'Nothing left to pay on this booking.' });
    }

    const requested = Math.round(Number(body.amount));
    let   charge    = Number.isFinite(requested) && requested > 0
      ? Math.min(requested, outstanding)
      : Math.min(outstanding, MPESA_MAX);

    if (charge > MPESA_MAX) {
      return json(res, 400, {
        error: 'M-Pesa caps a single payment at KES ' + MPESA_MAX.toLocaleString('en-KE') +
               '. Please pay a deposit now and the balance separately, or reach us on WhatsApp.'
      });
    }
    charge = Math.max(1, charge);

    const ph = await stkPush({
      phone:        target,
      amount:       charge,
      reference:    ref,
      customerName: body.guest_name || booking.guest_name
    });

    /* checkout_id is the id we query PayHero with. Fall back to
       Safaricom's only if PayHero somehow omitted its own. */
    const checkoutId = ph.payheroRef || ph.providerRef || null;

    if (checkoutId) {
      await sb('bookings?booking_ref=eq.' + encodeURIComponent(ref), {
        method:  'PATCH',
        headers: { Prefer: 'return=minimal' },
        body:    JSON.stringify({
          checkout_id:          checkoutId,
          provider_checkout_id: ph.providerRef,
          payment_status:       'pending',
          updated_at:           new Date().toISOString()
        })
      });
    } else {
      console.warn('[pay] PayHero accepted the push but returned no reference for', ref);
    }

    await logEvent({
      booking_ref: ref, outcome: 'ok', amount: charge,
      checkout_id: checkoutId, ip, phone: target,
      detail: {
        requested:    requested || null,
        outstanding:  openEnded ? 'open' : outstanding,
        provider_ref: ph.providerRef,
        ph_status:    ph.status
      }
    });

    return json(res, 200, {
      ok:                  true,
      checkout_request_id: checkoutId,
      amount:              charge,     /* so the modal shows what was really charged */
      message:             'STK push sent. Enter your M-Pesa PIN on your phone.'
    });

  } catch (err) {
    console.error('[pay] error:', err.message, err.upstream ? JSON.stringify(err.upstream) : '');
    await logEvent({
      booking_ref: String((req.body || {}).booking_ref || '') || null,
      outcome: 'error', ip, phone: target,
      detail: { error: err.message, upstream: err.upstream || null }
    });
    return json(res, 502, { error: err.message || 'Payment request failed. Please try again.' });
  }
};
