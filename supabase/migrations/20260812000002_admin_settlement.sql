-- ═══════════════════════════════════════════════════════════════════
-- WILDBOSSES · ADMIN SETTLEMENT
--
-- The admin panel was writing `payment_status = 'paid'` straight onto
-- the row. That is a label, not a payment: paid_amount stayed 0,
-- paid_at stayed null, the departure never lost a seat, no receipt was
-- kept, and nothing was written to the audit log. A booking marked
-- paid by hand was indistinguishable from an unpaid one everywhere
-- except the pill in the list.
--
-- Money now enters through a function, whichever door it came in by.
--
-- ── SEATS ─────────────────────────────────────────────────────────
-- confirm_payment used `paid_at is null` as a proxy for "this booking
-- has not taken its seat yet". That held only while payment was the
-- single way a place got held. An admin confirming a pay-on-arrival
-- booking also holds a place, so the proxy breaks the moment there are
-- two doors. seat_taken makes it explicit, and it is the one flag both
-- doors test and set — so a seat can be taken once and returned once,
-- no matter which path got there first.
-- ═══════════════════════════════════════════════════════════════════

alter table public.bookings
  add column if not exists seat_taken boolean not null default false;

-- Anything already settled has, by definition, taken its seat.
update public.bookings
   set seat_taken = true
 where paid_at is not null
   and seat_taken = false;


-- ── Seat helpers ───────────────────────────────────────────────────
-- Internal. Both are no-ops unless the flag actually changes, so
-- calling them twice cannot move the count twice.
create or replace function public.wb_take_seat(p_ref text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where booking_ref = p_ref;
  if not found or b.seat_taken or b.tour_id is null then return; end if;

  update public.bookings set seat_taken = true where booking_ref = p_ref;
  update public.tours
     set spots_left = greatest(coalesce(spots_left, 0) - coalesce(b.guests, 1), 0)
   where id = b.tour_id and spots_left is not null;
end $$;

create or replace function public.wb_release_seat(p_ref text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where booking_ref = p_ref;
  if not found or not b.seat_taken or b.tour_id is null then return; end if;

  update public.bookings set seat_taken = false where booking_ref = p_ref;
  update public.tours
     set spots_left = coalesce(spots_left, 0) + coalesce(b.guests, 1)
   where id = b.tour_id and spots_left is not null;
end $$;


-- ── Gateway settlement (unchanged guarantees, explicit seat) ───────
create or replace function public.confirm_payment(
  p_ref       text,
  p_receipt   text,
  p_amount    int,
  p_checkout  text default null
)
returns table (applied boolean, reason text)
language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where booking_ref = p_ref for update;

  if not found then
    return query select false, 'no_such_booking'; return;
  end if;

  if v_booking.mpesa_receipt is not null
     and v_booking.mpesa_receipt = p_receipt then
    return query select false, 'duplicate_receipt'; return;
  end if;

  if p_receipt is not null and exists (
       select 1 from public.bookings
        where mpesa_receipt = p_receipt and booking_ref <> p_ref) then
    return query select false, 'receipt_reused'; return;
  end if;

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

  perform public.wb_take_seat(p_ref);

  return query select true, 'applied';
end $$;


-- ── Money that did not arrive through the gateway ──────────────────
-- Cash, a bank transfer, or an M-Pesa payment made straight to the
-- till. Same accounting as the gateway path, same replay protection,
-- and it records WHO recorded it.
create or replace function public.record_manual_payment(
  p_ref     text,
  p_amount  int,
  p_receipt text default null,
  p_method  text default 'manual'
)
returns table (applied boolean, reason text, paid_total int)
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
  v_total   int;
begin
  if not public.is_admin() then
    return query select false, 'not_admin', 0; return;
  end if;

  if coalesce(p_amount, 0) <= 0 then
    return query select false, 'amount_must_be_positive', 0; return;
  end if;

  select * into v_booking from public.bookings where booking_ref = p_ref for update;

  if not found then
    return query select false, 'no_such_booking', 0; return;
  end if;
  if v_booking.status = 'cancelled' then
    return query select false, 'booking_cancelled', coalesce(v_booking.paid_amount, 0); return;
  end if;

  /* An M-Pesa code entered by hand gets the same uniqueness the
     gateway path enforces, so typing the same code twice — or a code
     already used on another booking — cannot credit twice. */
  if p_receipt is not null and v_booking.mpesa_receipt = p_receipt then
    return query select false, 'duplicate_receipt', coalesce(v_booking.paid_amount, 0); return;
  end if;
  if p_receipt is not null and exists (
       select 1 from public.bookings
        where mpesa_receipt = p_receipt and booking_ref <> p_ref) then
    return query select false, 'receipt_reused', coalesce(v_booking.paid_amount, 0); return;
  end if;

  v_total := coalesce(v_booking.paid_amount, 0) + p_amount;

  update public.bookings
     set paid_amount    = v_total,
         mpesa_receipt  = coalesce(p_receipt, mpesa_receipt),
         payment_status = 'paid',
         status         = case when status = 'pending' then 'confirmed' else status end,
         payment_type   = case when total_amount > 0 and v_total >= total_amount
                               then 'full' else 'deposit' end,
         paid_at        = coalesce(paid_at, now()),
         updated_at     = now()
   where booking_ref = p_ref;

  perform public.wb_take_seat(p_ref);

  insert into public.payment_events (booking_ref, kind, outcome, amount, detail)
  values (p_ref, 'manual', 'ok', p_amount,
          jsonb_build_object('method', p_method, 'receipt', p_receipt,
                             'admin', auth.uid(), 'paid_total', v_total));

  return query select true, 'applied', v_total;
end $$;


-- ── Confirming a place without money ───────────────────────────────
-- Pay-on-arrival still holds a seat, so this takes one.
create or replace function public.confirm_booking(p_ref text)
returns table (applied boolean, reason text)
language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings%rowtype;
begin
  if not public.is_admin() then
    return query select false, 'not_admin'; return;
  end if;

  select * into v_booking from public.bookings where booking_ref = p_ref for update;
  if not found then
    return query select false, 'no_such_booking'; return;
  end if;
  if v_booking.status = 'cancelled' then
    return query select false, 'booking_cancelled'; return;
  end if;

  update public.bookings
     set status = 'confirmed', updated_at = now()
   where booking_ref = p_ref;

  perform public.wb_take_seat(p_ref);

  insert into public.payment_events (booking_ref, kind, outcome, detail)
  values (p_ref, 'admin', 'ok', jsonb_build_object('action', 'confirm', 'admin', auth.uid()));

  return query select true, 'applied';
end $$;


-- ── Cancelling gives the place back ────────────────────────────────
-- Money is NOT reversed here. A refund is a real-world act; the record
-- of what was collected stays, so it can be reconciled against one.
create or replace function public.cancel_booking(p_ref text)
returns table (applied boolean, reason text)
language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings%rowtype;
begin
  if not public.is_admin() then
    return query select false, 'not_admin'; return;
  end if;

  select * into v_booking from public.bookings where booking_ref = p_ref for update;
  if not found then
    return query select false, 'no_such_booking'; return;
  end if;
  if v_booking.status = 'cancelled' then
    return query select true, 'already_cancelled'; return;
  end if;

  perform public.wb_release_seat(p_ref);

  update public.bookings
     set status = 'cancelled', updated_at = now()
   where booking_ref = p_ref;

  insert into public.payment_events (booking_ref, kind, outcome, amount, detail)
  values (p_ref, 'admin', 'ok', coalesce(v_booking.paid_amount, 0),
          jsonb_build_object('action', 'cancel', 'admin', auth.uid(),
                             'paid_at_cancellation', coalesce(v_booking.paid_amount, 0)));

  return query select true, 'applied';
end $$;


-- ── Grants ─────────────────────────────────────────────────────────
-- The seat helpers are internals: nobody calls them directly.
revoke all on function public.wb_take_seat(text)    from public, anon, authenticated;
revoke all on function public.wb_release_seat(text) from public, anon, authenticated;

-- Gateway settlement stays service-role only. The browser cannot reach it.
revoke all on function public.confirm_payment(text, text, int, text) from public, anon, authenticated;
grant execute on function public.confirm_payment(text, text, int, text) to service_role;

-- Admin actions are reachable by a signed-in user, and every one of
-- them calls is_admin() before touching anything.
revoke all on function public.record_manual_payment(text, int, text, text) from public, anon;
revoke all on function public.confirm_booking(text)                        from public, anon;
revoke all on function public.cancel_booking(text)                         from public, anon;
grant execute on function public.record_manual_payment(text, int, text, text) to authenticated, service_role;
grant execute on function public.confirm_booking(text)                        to authenticated, service_role;
grant execute on function public.cancel_booking(text)                         to authenticated, service_role;


-- ── Let admins read the audit log ──────────────────────────────────
-- It stays invisible to anon. Writes remain service-role only; these
-- functions write through SECURITY DEFINER, not through this policy.
drop policy if exists payment_events_admin_read on public.payment_events;
create policy payment_events_admin_read on public.payment_events
  for select to authenticated using (public.is_admin());
