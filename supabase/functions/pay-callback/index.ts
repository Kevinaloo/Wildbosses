/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PayHero Callback — Supabase Edge Function
   URL: https://<project>.supabase.co/functions/v1/pay-callback?k=<secret>

   Runs on supabase.co, a verified production domain, so PayHero's
   block on hobby-tier callback hosts never applies. No custom domain
   required.

   ── THE RULE ──────────────────────────────────────────────────────
   The callback body is a HINT, never evidence. Anyone on the internet
   can POST here. All we take from the payload is "something happened
   for booking X". We then ask PayHero directly what actually happened
   and write PayHero's answer.

   A forged callback therefore achieves nothing: it triggers a status
   check that returns pending or failed, and no money is recorded.

   Fail-closed: if PayHero cannot be reached we settle NOTHING, and let
   the client-side poll in /api/pay-status resolve it later.
   ═══════════════════════════════════════════════════════════════════ */

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAYHERO_USER     = Deno.env.get('PAYHERO_USERNAME') ?? '';
const PAYHERO_PASS     = Deno.env.get('PAYHERO_PASSWORD') ?? '';
const CALLBACK_SECRET  = Deno.env.get('WB_CALLBACK_SECRET') ?? '';

const PAYHERO_STATUS_URL = 'https://backend.payhero.co.ke/api/v2/transaction-status';

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

/* Ask PayHero what really happened. The only source of truth. */
async function verifyWithPayHero(checkoutId: string) {
  if (!PAYHERO_USER || !PAYHERO_PASS) {
    throw new Error('PayHero credentials not configured in this function');
  }
  const token = btoa(PAYHERO_USER + ':' + PAYHERO_PASS);
  const resp  = await fetch(
    PAYHERO_STATUS_URL + '?reference=' + encodeURIComponent(checkoutId),
    { headers: { Authorization: 'Basic ' + token, Accept: 'application/json' } }
  );
  const text = await resp.text();
  if (!resp.ok) throw new Error('PayHero status ' + resp.status + ': ' + text.slice(0, 200));

  let data: Record<string, unknown>;
  try { data = JSON.parse(text); }
  catch { throw new Error('PayHero returned non-JSON: ' + text.slice(0, 200)); }

  return {
    status:  String(data.status ?? data.Status ?? '').toUpperCase(),
    amount:  Number(data.amount ?? data.Amount ?? 0) || 0,
    receipt: String(
      data.mpesa_receipt_number ?? data.MpesaReceiptNumber ?? data.mpesa_code ?? ''
    ) || null
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return ok({});

  /* ── Gate 1 · shared secret in the callback URL ────────────────────
     Cheap filter that stops drive-by probing. This is NOT the security
     boundary — verification below is. Both must hold. */
  const url = new URL(req.url);
  const key = url.searchParams.get('k') ?? '';
  if (!CALLBACK_SECRET || !safeEqual(key, CALLBACK_SECRET)) {
    console.warn('[pay-callback] rejected: bad or missing secret');
    await logEvent({ outcome: 'rejected', detail: { reason: 'bad_secret' } });
    return ok({ ok: false });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* tolerate empty */ }

  const ref = String(
    body.external_reference ?? body.ExternalReference ?? body.reference ?? ''
  ).trim();

  if (!ref) {
    await logEvent({ outcome: 'rejected', detail: { reason: 'no_reference' } });
    return ok({ ok: false });
  }

  try {
    /* Load the booking. We need OUR stored checkout id — not one handed
       to us in the request — to query PayHero. */
    const bRes = await sb(
      'bookings?select=booking_ref,checkout_id,payment_status,total_amount,paid_amount' +
      '&booking_ref=eq.' + encodeURIComponent(ref) + '&limit=1'
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

    const checkoutId = String(
      booking.checkout_id ??
      body.CheckoutRequestID ?? body.checkout_request_id ?? ''
    ).trim();

    if (!checkoutId) {
      await logEvent({ booking_ref: ref, outcome: 'error', detail: { reason: 'no_checkout_id' } });
      return ok({ ok: false });
    }

    /* ── Gate 2 · the real one. Ask PayHero. ───────────────────────── */
    const ph = await verifyWithPayHero(checkoutId);
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
          p_checkout: checkoutId
        })
      });
      const result  = await rpc.json();
      const outcome = Array.isArray(result) ? result[0] : result;

      await logEvent({
        booking_ref: ref,
        outcome:     outcome?.applied ? 'ok' : (outcome?.reason ?? 'error'),
        amount:      Math.round(ph.amount),
        checkout_id: checkoutId,
        detail:      { payhero_status: ph.status, receipt: ph.receipt, rpc: outcome }
      });
      return ok({ ok: true });
    }

    if (['FAILED', 'CANCELLED', 'TIMEOUT'].includes(ph.status)) {
      await sb('rpc/fail_payment', {
        method: 'POST',
        body: JSON.stringify({ p_ref: ref, p_reason: ph.status })
      });
      await logEvent({
        booking_ref: ref, outcome: 'ok', checkout_id: checkoutId,
        detail: { payhero_status: ph.status }
      });
      return ok({ ok: true });
    }

    /* QUEUED / PENDING / unrecognised — do not settle. */
    await logEvent({
      booking_ref: ref, outcome: 'ok', checkout_id: checkoutId,
      detail: { payhero_status: ph.status, note: 'not_terminal' }
    });
    return ok({ ok: true });

  } catch (err) {
    /* Fail closed. Never settle a booking we could not verify. */
    console.error('[pay-callback] error:', (err as Error).message);
    await logEvent({
      booking_ref: ref, outcome: 'error',
      detail: { error: (err as Error).message }
    });
    return ok({ ok: false });
  }
});
