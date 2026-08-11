-- ═══════════════════════════════════════════════════════════════════
-- WILDBOSSES · PAYMENT INTEGRITY
--
-- Written defensively (if not exists / or replace) because the repo
-- migrations have drifted from the live database. Safe to run twice.
--
-- What this fixes:
--   1. paid_amount was written by the callback but never existed.
--   2. payment_ref was doing two jobs — PayHero checkout id AND the
--      M-Pesa receipt — so the link between them was lost on success.
--   3. Nothing stopped a replayed callback crediting a booking twice.
--   4. Two writers (Edge Function + /api/pay-status poll) could race
--      and both apply a payment.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · Columns the payment path actually needs ────────────────────
alter table public.bookings
  add column if not exists paid_amount   int  not null default 0,
  add column if not exists checkout_id   text,
  add column if not exists mpesa_receipt text,
  add column if not exists paid_at       timestamptz;

-- Carry over anything the old deposit_paid column was holding.
update public.bookings
   set paid_amount = deposit_paid
 where paid_amount = 0
   and coalesce(deposit_paid, 0) > 0;

-- Replay protection. One M-Pesa receipt can only ever credit once,
-- across the whole table — enforced by Postgres, not by application logic.
create unique index if not exists bookings_mpesa_receipt_uniq
  on public.bookings (mpesa_receipt)
  where mpesa_receipt is not null;

create index if not exists bookings_checkout_id_idx
  on public.bookings (checkout_id)
  where checkout_id is not null;


-- ── 2 · Append-only audit log ──────────────────────────────────────
-- Every STK attempt and every callback lands here whether it succeeds
-- or not. This is both the forensic trail and the rate-limit source.
create table if not exists public.payment_events (
  id           bigserial primary key,
  booking_ref  text,
  kind         text not null,          -- stk_request | callback | status_poll
  outcome      text,                   -- ok | rejected | duplicate | error
  amount       int,
  checkout_id  text,
  detail       jsonb,
  ip           text,
  created_at   timestamptz not null default now()
);

create index if not exists payment_events_ref_time_idx
  on public.payment_events (booking_ref, created_at desc);
create index if not exists payment_events_ip_time_idx
  on public.payment_events (ip, created_at desc);

alter table public.payment_events enable row level security;
-- No policies at all: unreachable with anon or authenticated keys.
-- Only the service role (which bypasses RLS) can read or write it.


-- ── 3 · Atomic, idempotent settlement ──────────────────────────────
-- The ONLY way a booking becomes paid. Callers pass what PayHero told
-- them; this decides whether it counts.
--
-- Guarantees:
--   · never downgrades an already-paid booking
--   · a repeated receipt is a no-op, not a second credit
--   · amount is recorded from the gateway, never from a request body
create or replace function public.confirm_payment(
  p_ref       text,
  p_receipt   text,
  p_amount    int,
  p_checkout  text default null
)
returns table (applied boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking
    from public.bookings
   where booking_ref = p_ref
   for update;

  if not found then
    return query select false, 'no_such_booking';
    return;
  end if;

  -- Already settled with this exact receipt: idempotent success.
  if v_booking.mpesa_receipt is not null
     and v_booking.mpesa_receipt = p_receipt then
    return query select false, 'duplicate_receipt';
    return;
  end if;

  -- Receipt already used on a different booking: refuse.
  if p_receipt is not null and exists (
       select 1 from public.bookings
        where mpesa_receipt = p_receipt
          and booking_ref  <> p_ref
     ) then
    return query select false, 'receipt_reused';
    return;
  end if;

  update public.bookings
     set paid_amount    = coalesce(paid_amount, 0) + greatest(coalesce(p_amount, 0), 0),
         mpesa_receipt  = coalesce(p_receipt, mpesa_receipt),
         checkout_id    = coalesce(p_checkout, checkout_id),
         payment_status = 'paid',
         status         = case when status = 'pending' then 'confirmed' else status end,
         payment_type   = case
                            when coalesce(paid_amount, 0) + coalesce(p_amount, 0)
                                 >= total_amount then 'full'
                            else 'deposit'
                          end,
         paid_at        = coalesce(paid_at, now()),
         updated_at     = now()
   where booking_ref = p_ref;

  return query select true, 'applied';
end;
$$;

-- Mark a payment attempt failed without ever touching a settled booking.
create or replace function public.fail_payment(
  p_ref    text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
     set payment_status = 'failed',
         updated_at     = now()
   where booking_ref     = p_ref
     and payment_status <> 'paid';   -- never downgrade a paid booking
end;
$$;

-- Reachable only by the service role. The browser cannot call these.
revoke all on function public.confirm_payment(text, text, int, text) from public, anon, authenticated;
revoke all on function public.fail_payment(text, text)                from public, anon, authenticated;
grant execute on function public.confirm_payment(text, text, int, text) to service_role;
grant execute on function public.fail_payment(text, text)               to service_role;
