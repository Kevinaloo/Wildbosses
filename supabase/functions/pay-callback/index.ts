/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PayHero Callback — Supabase Edge Function
   URL: https://<project>.supabase.co/functions/v1/pay-callback?k=<secret>

   Runs on supabase.co, a verified production domain, so PayHero's
   block on free-tier callback hosts never applies. No custom domain
   required.

   ── THE RULE ──────────────────────────────────────────────────────
   The callback body is a HINT, never evidence. Anyone on the internet
   can POST here. All we take from it is "something happened for
   booking X". We then ask PayHero directly what actually happened and
   write PayHero's answer.

   A forged callback therefore achieves nothing: it triggers a status
   check that returns pending or failed, and no money is recorded.

   ── WHAT WAS BREAKING ─────────────────────────────────────────────
   PayHero nests the real payload one level down:

     { "status": true, "response": { "ExternalReference": "WB…",
       "MpesaReceiptNumber": "SAE3YULR0Y", "ResultCode": 0, … } }

   We were reading `external_reference` at the top level only, found
   nothing, and rejected every single callback as "no_reference".

   Second change: a missing or mangled ?k= no longer stops settlement.
   The secret is a doorman, not the lock — verification against
   PayHero is the lock. Making the doorman fatal meant that if PayHero
   ever dropped the query string, money would arrive and the booking
   would sit unpaid forever. Unsigned callers are now logged, capped,
   and still put through the same verification everyone else faces.
   ═══════════════════════════════════════════════════════════════════ */

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAYHERO_USER     = Deno.env.get('PAYHERO_USERNAME') ?? '';
const PAYHERO_PASS     = Deno.env.get('PAYHERO_PASSWORD') ?? '';
const CALLBACK_SECRET  = Deno.env.get('WB_CALLBACK_SECRET') ?? '';

const PAYHERO_STATUS_URL = 'https://backend.payhero.co.ke/api/v2/transaction-status';

/* How many unsigned callbacks we will verify in a 10-minute window
   before we stop answering them. Keeps an unsigned endpoint from being
   used to bounce traffic at PayHero. */
const UNSIGNED_BUDGET = 30;

/* Length-independent comparison — no early exit on the first differing byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/* Always 200 so PayHero stops retrying, and always the same shape so a
   prober learns nothing from the response. */
function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

async function sb(path: string, init: RequestInit = {}) {
  return await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...init,
    headers: {
      apikey:         SUPABASE_SRV_KEY,
      Authorization:  'Bearer ' + SUPABASE_SRV_KEY,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });
}

async function logEvent(row: Record<string, unknown>) {
  try {
    await sb('payment_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ kind: 'callback', ...row })
    });
  } catch (e) {
    console.error('[pay-callback] audit write failed:', (e as Error).message);
  }
}

/* ── reading PayHero ──────────────────────────────────────────────── */

type Bag = Record<string, unknown>;

/* Their payloads put the interesting fields either at the top level or
   nested under `response` with Safaricom's PascalCase names. Look in
   both places rather than betting on one. */
function inner(body: Bag): Bag {
  const r = body.response ?? body.Response ?? body.data;
  return (r && typeof r === 'object') ? r as Bag : body;
}

function pick(...vals: unknown[]): string {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

function readStatus(payload: Bag): { status: string; amount: number; receipt: string | null } {
  const r = inner(payload);

  let status = pick(r.status, r.Status, payload.status, payload.Status).toUpperCase();

  /* ResultCode is the most reliable signal when present: 0 means the
     customer completed the payment. It settles the ambiguity between
     "Success", "SUCCESS", and any status string PayHero has not
     documented. Guarded against `status: true`, which is a flag on the
     envelope rather than a transaction state. */
  const codeRaw = r.ResultCode ?? r.result_code;
  if (codeRaw !== undefined && codeRaw !== null && codeRaw !== '') {
    const code = Number(codeRaw);
    if (Number.isFinite(code)) status = code === 0 ? 'SUCCESS' : (status || 'FAILED');
  }
  if (status === 'TRUE' || status === 'FALSE') status = '';

  const amount = Number(r.amount ?? r.Amount ?? 0) || 0;

  const receipt = pick(
    r.mpesa_receipt_number, r.MpesaReceiptNumber, r.mpesa_code, r.receipt
  ) || null;

  return { status, amount, receipt };
}

/* Ask PayHero what really happened. The only source of truth.
   `reference` is PayHero's own id; Safaricom's is tried as a fallback
   so rows written before the two were separated still resolve. */
async function verifyWithPayHero(ids: (string | null)[]) {
  if (!PAYHERO_USER || !PAYHERO_PASS) {
    throw new Error('PayHero credentials not configured in this function');
  }
  const token = btoa(PAYHERO_USER + ':' + PAYHERO_PASS);
  const tried: string[] = [];
  let lastError = 'no usable reference';

  for (const id of ids) {
    if (!id || tried.includes(id)) continue;
    tried.push(id);

    const ctl  = new AbortController();
    const kill = setTimeout(() => ctl.abort(), 8000);
    try {
      const resp = await fetch(
        PAYHERO_STATUS_URL + '?reference=' + encodeURIComponent(id),
        {
          headers: { Authorization: 'Basic ' + token, Accept: 'application/json' },
          signal:  ctl.signal
        }
      );
      const text = await resp.text();
      if (!resp.ok) { lastError = 'PayHero ' + resp.status + ': ' + text.slice(0, 160); continue; }

      const parsed = readStatus(JSON.parse(text) as Bag);
      if (parsed.status) return parsed;
      lastError = 'PayHero returned no status for ' + id;
    } catch (e) {
      lastError = (e as Error).message;
    } finally {
      clearTimeout(kill);
    }
  }
  throw new Error(lastError);
}

/* ── handler ──────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method !== 'POST') return ok({});

  /* ── Doorman · shared secret in the callback URL ───────────────────
     A match means the caller is almost certainly PayHero. A miss does
     not stop the request — it just costs the caller trust and a slot
     in the unsigned budget below. */
  const url     = new URL(req.url);
  const key     = url.searchParams.get('k') ?? req.headers.get('x-wb-callback-key') ?? '';
  const trusted = CALLBACK_SECRET.length > 0 && safeEqual(key, CALLBACK_SECRET);

  let body: Bag = {};
  try { body = await req.json() as Bag; } catch { /* tolerate empty */ }

  const r = inner(body);
  const ref = pick(
    r.external_reference, r.ExternalReference,
    body.external_reference, body.ExternalReference,
    r.reference, body.reference
  );

  if (!ref) {
    console.warn('[pay-callback] no reference in payload:', JSON.stringify(body).slice(0, 300));
    await logEvent({ outcome: 'rejected', detail: { reason: 'no_reference', trusted } });
    return ok({ ok: false });
  }

  if (!trusted) {
    /* Cap how much work an unsigned caller can make us do. */
    try {
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const probe = await sb(
        'payment_events?select=id&kind=eq.callback&outcome=eq.untrusted' +
        '&created_at=gte.' + since + '&limit=1',
        { headers: { Prefer: 'count=exact' } }
      );
      const cr = probe.headers.get('content-range') ?? '';
      const n  = Number(cr.split('/')[1]);
      if (Number.isFinite(n) && n >= UNSIGNED_BUDGET) {
        console.warn('[pay-callback] unsigned budget exhausted, dropping');
        return ok({ ok: false });
      }
    } catch { /* if the probe fails, carry on — verification still gates it */ }

    console.warn('[pay-callback] unsigned callback for', ref, '— verifying anyway');
    await logEvent({ booking_ref: ref, outcome: 'untrusted', detail: { reason: 'bad_or_missing_secret' } });
  }

  try {
    /* Load the booking. We prefer OUR stored ids — not ones handed to
       us in the request — when asking PayHero what happened. */
    const bRes = await sb(
      'bookings?select=booking_ref,checkout_id,provider_checkout_id,payment_status,' +
      'total_amount,paid_amount&booking_ref=eq.' + encodeURIComponent(ref) + '&limit=1'
    );
    const rows    = await bRes.json();
    const booking = Array.isArray(rows) ? rows[0] : null;

    if (!booking) {
      await logEvent({ booking_ref: ref, outcome: 'rejected', detail: { reason: 'unknown_booking' } });
      return ok({ ok: false });
    }

    /* Already settled. Idempotent by design. */
    if (booking.payment_status === 'paid') {
      await logEvent({ booking_ref: ref, outcome: 'duplicate', detail: { reason: 'already_paid' } });
      return ok({ ok: true });
    }

    /* The body's CheckoutRequestID is last in the list: usable when our
       own write lost the race with PayHero's callback, but never
       preferred over what we stored ourselves. */
    const candidates = [
      booking.checkout_id ?? null,
      booking.provider_checkout_id ?? null,
      pick(r.CheckoutRequestID, r.checkout_request_id, body.CheckoutRequestID) || null
    ];

    if (!candidates.some(Boolean)) {
      await logEvent({ booking_ref: ref, outcome: 'error', detail: { reason: 'no_checkout_id' } });
      return ok({ ok: false });
    }

    /* ── The real gate. Ask PayHero. ────────────────────────────── */
    const ph = await verifyWithPayHero(candidates);
    console.log('[pay-callback]', ref, 'PayHero says', ph.status);

    if (ph.status === 'SUCCESS') {
      /* Amount and receipt come from PayHero, never from the request
         body. A forged "amount: 250000" is discarded here. */
      const rpc = await sb('rpc/confirm_payment', {
        method: 'POST',
        body: JSON.stringify({
          p_ref:      ref,
          p_receipt:  ph.receipt,
          p_amount:   Math.round(ph.amount),
          p_checkout: booking.checkout_id ?? null
        })
      });
      const result  = await rpc.json();
      const outcome = Array.isArray(result) ? result[0] : result;

      await logEvent({
        booking_ref: ref,
        outcome:     outcome?.applied ? 'ok' : (outcome?.reason ?? 'error'),
        amount:      Math.round(ph.amount),
        checkout_id: booking.checkout_id ?? null,
        detail:      { payhero_status: ph.status, receipt: ph.receipt, rpc: outcome, trusted }
      });
      return ok({ ok: true });
    }

    if (['FAILED', 'CANCELLED', 'CANCELED', 'TIMEOUT'].includes(ph.status)) {
      await sb('rpc/fail_payment', {
        method: 'POST',
        body: JSON.stringify({ p_ref: ref, p_reason: ph.status })
      });
      await logEvent({
        booking_ref: ref, outcome: 'ok', checkout_id: booking.checkout_id ?? null,
        detail: { payhero_status: ph.status, trusted }
      });
      return ok({ ok: true });
    }

    /* QUEUED / PENDING / unrecognised — do not settle. The browser
       poll will resolve it, or the next callback will. */
    await logEvent({
      booking_ref: ref, outcome: 'ok', checkout_id: booking.checkout_id ?? null,
      detail: { payhero_status: ph.status, note: 'not_terminal', trusted }
    });
    return ok({ ok: true });

  } catch (err) {
    /* Fail closed. Never settle a booking we could not verify. */
    console.error('[pay-callback] error:', (err as Error).message);
    await logEvent({
      booking_ref: ref, outcome: 'error',
      detail: { error: (err as Error).message, trusted }
    });
    return ok({ ok: false });
  }
});
