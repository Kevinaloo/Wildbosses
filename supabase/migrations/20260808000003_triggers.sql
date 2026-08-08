-- ═══════════════════════════════════════════════════════════
-- TRIGGERS
-- Keep spots_left honest in the database so no client can drift
-- the scarcity counts, and keep urgency reflecting reality.
-- ═══════════════════════════════════════════════════════════

-- ── updated_at ──────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tours_touch on public.tours;
create trigger tours_touch before update on public.tours
  for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ── claim spots on a confirmed booking ──────────────────
create or replace function public.claim_spots()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'confirmed' and new.tour_id is not null then
    update public.tours
       set spots_left = greatest(spots_left - new.guests, 0)
     where id = new.tour_id;

    update public.tours
       set status = 'full'
     where id = new.tour_id
       and spots_left = 0
       and status = 'open';
  end if;
  return new;
end $$;

drop trigger if exists booking_claims_spots on public.bookings;
create trigger booking_claims_spots after insert on public.bookings
  for each row execute function public.claim_spots();

-- ── release spots when cancelled ────────────────────────
create or replace function public.release_spots()
returns trigger language plpgsql security definer as $$
begin
  if old.status = 'confirmed'
     and new.status in ('cancelled','no_show')
     and new.tour_id is not null then

    update public.tours
       set spots_left = least(spots_left + old.guests, spots_total)
     where id = new.tour_id;

    update public.tours
       set status = 'open'
     where id = new.tour_id
       and status = 'full'
       and spots_left > 0;
  end if;
  return new;
end $$;

drop trigger if exists booking_releases_spots on public.bookings;
create trigger booking_releases_spots after update on public.bookings
  for each row execute function public.release_spots();

-- ── urgency reflects real scarcity ──────────────────────
create or replace function public.sync_urgency()
returns trigger language plpgsql as $$
begin
  new.urgency = case
    when new.spots_total = 0 then 'normal'
    when new.spots_left <= 2 then 'critical'
    when new.spots_left::numeric / nullif(new.spots_total,0) <= 0.4 then 'high'
    else 'normal'
  end;
  return new;
end $$;

drop trigger if exists tours_sync_urgency on public.tours;
create trigger tours_sync_urgency before insert or update of spots_left, spots_total
  on public.tours
  for each row execute function public.sync_urgency();
