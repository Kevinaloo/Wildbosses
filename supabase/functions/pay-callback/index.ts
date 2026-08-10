/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PayHero Callback — Supabase Edge Function
   URL: https://uhoqbticmkeufuxnrate.supabase.co/functions/v1/pay-callback

   PayHero now blocks Vercel/Render free-tier as callback hosts.
   This Edge Function runs on supabase.co — a verified production domain.
   ═══════════════════════════════════════════════════════════════════ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function patchBooking(ref: string, patch: Record<string, unknown>) {
  const sb = createClient(SUPABASE_URL, SUPABASE_SRV_KEY);
  const { error } = await sb
    .from('bookings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('booking_ref', ref);
  if (error) throw new Error(error.message);
}

Deno.serve(async (req) => {
  /* PayHero sends POST; always respond 200 so it stops retrying */
  if (req.method !== 'POST') {
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* ignore */ }

  console.log('[pay-callback] received:', JSON.stringify(body));

  try {
    const rawStatus = String(body.status || body.Status || '').toUpperCase();
    const ref       = String(
      body.external_reference || body.ExternalReference ||
      body.reference          || ''
    );
    const mpesaRef  = String(
      body.mpesa_receipt_number || body.MpesaReceiptNumber ||
      body.mpesa_code           || ''
    ) || null;
    const amount = body.amount || body.Amount || null;

    if (!ref) {
      console.warn('[pay-callback] no reference in payload');
      return new Response(JSON.stringify({ ok: false, reason: 'no_reference' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let patch: Record<string, unknown>;

    switch (rawStatus) {
      case 'SUCCESS':
        patch = {
          payment_status: 'paid',
          status:         'confirmed',
          payment_type:   'deposit',
          ...(mpesaRef ? { payment_ref: mpesaRef } : {}),
          ...(amount   ? { paid_amount: Number(amount) } : {})
        };
        break;

      case 'FAILED':
      case 'CANCELLED':
      case 'TIMEOUT':
        patch = { payment_status: 'failed' };
        break;

      default:
        console.warn('[pay-callback] unknown status:', rawStatus);
        return new Response(
          JSON.stringify({ ok: false, reason: 'unknown_status:' + rawStatus }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }

    await patchBooking(ref, patch);
    console.log('[pay-callback] updated booking', ref, '→', patch.payment_status);

    return new Response(JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[pay-callback] error:', (err as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
