-- ═══════════════════════════════════════════════════════════════════
-- WILDBOSSES · PAYHERO REFERENCE SPLIT + SETTLEMENT SIDE EFFECTS
--
-- PayHero hands back TWO identifiers for one STK push:
--
--   reference          "E8UWT7CLUW"                 ← PayHero's own id
--   CheckoutRequestID  "ws_CO_1501202416432151..."  ← Safaricom's id
--
-- /api/v2/transaction-status takes ?reference=, which is PayHero's id.
-- We were storing Safaricom's and querying with it, so every status
-- lookup missed and no payment could ever confirm itself.
--
-- checkout_id now means "the id we query PayHero with".
-- provider_checkout_id holds Safaricom's, for reconciliation against
-- an M-Pesa statement.
--
-- Also: settling a booking now takes the seat off the departure, once.
-- ═══════════════════════════════════════════════════════════════════

alter table public.bookings
  add column if not exists provider_checkout_id text;

create index if not exists bookings_provider_checkout_idx
  on public.bookings (provider_checkout_id)
  where provider_checkout_id is not null;

-- Rate limiting has to be able to count pushes per phone number:
-- PayHero blocks a number for 24h after 10 successive failed STKs.
alter table public.payment_events
  add column if not exists phone text;

create index if not exists payment_events_phone_time_idx
  on public.payment_events (phone, created_at desc);

create index if not exists payment_events_kind_time_idx
  on public.payment_events (kind, created_at desc);


-- ── Settlement, now with seat accounting ───────────────────────────
-- Unchanged guarantees: never downgrades a paid booking, a repeated
-- receipt is a no-op, the amount comes from the gateway.
--
-- New: the first time a booking settles, the departure loses a seat.
-- Gated on paid_at being null so a second (partial → full) payment
-- does not take a second seat.
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
  v_first   boolean;
begin
  select * into v_booking
    from public.bookings
   where booking_ref = p_ref
   for update;

  if not found then
    return query select false, 'no_such_booking';
    return;
  end if;

  if v_booking.mpesa_receipt is not null
     and v_booking.mpesa_receipt = p_receipt then
    return query select false, 'duplicate_receipt';
    return;
  end if;

  if p_receipt is not null and exists (
       select 1 from public.bookings
        where mpesa_receipt = p_receipt
          and booking_ref  <> p_ref
     ) then
    return query select false, 'receipt_reused';
    return;
  end if;

  v_first := v_booking.paid_at is null;

  update public.bookings
     set paid_amount    = coalesce(paid_amount, 0) + greatest(coalesce(p_amount, 0), 0),
         mpesa_receipt  = coalesce(p_receipt, mpesa_receipt),
         checkout_id    = coalesce(p_checkout, checkout_id),
         payment_status = 'paid',
         status         = case when status = 'pending' then 'confirmed' else status end,
         payment_type   = case
                            when total_amount > 0
                             and coalesce(paid_amount, 0) + coalesce(p_amount, 0)
                                 >= total_amount then 'full'
                            else 'deposit'
                          end,
         paid_at        = coalesce(paid_at, now()),
         updated_at     = now()
   where booking_ref = p_ref;

  -- One seat, once, and never below zero.
  if v_first and v_booking.tour_id is not null then
    update public.tours
       set spots_left = greatest(coalesce(spots_left, 0) - coalesce(v_booking.guests, 1), 0)
     where id = v_booking.tour_id
       and spots_left is not null;
  end if;

  return query select true, 'applied';
end;
$$;

revoke all on function public.confirm_payment(text, text, int, text) from public, anon, authenticated;
grant execute on function public.confirm_payment(text, text, int, text) to service_role;
