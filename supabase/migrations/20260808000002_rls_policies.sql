-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
--
-- Posture: anyone (including Cabana, using the anon key) may READ
-- live tours and guides, and may CREATE a booking. Nobody anonymous
-- may read bookings back — otherwise guest phone numbers would be
-- public to anyone who found the key.
-- ═══════════════════════════════════════════════════════════

alter table public.guides          enable row level security;
alter table public.tours           enable row level security;
alter table public.bookings        enable row level security;
alter table public.partner_payouts enable row level security;

-- ── GUIDES ──────────────────────────────────────────────
drop policy if exists "guides public read" on public.guides;
create policy "guides public read"
  on public.guides for select
  to anon, authenticated
  using (active = true);

drop policy if exists "guides staff write" on public.guides;
create policy "guides staff write"
  on public.guides for all
  to authenticated
  using (true) with check (true);

-- ── TOURS ───────────────────────────────────────────────
-- Only bookable departures are visible anonymously.
-- Drafts, closed and cancelled tours stay internal.
drop policy if exists "tours public read" on public.tours;
create policy "tours public read"
  on public.tours for select
  to anon, authenticated
  using (status in ('open','full'));

drop policy if exists "tours staff all" on public.tours;
create policy "tours staff all"
  on public.tours for all
  to authenticated
  using (true) with check (true);

-- ── BOOKINGS ────────────────────────────────────────────
-- A guest (or Cabana on their behalf) may create a booking.
-- Guarded so a row cannot be created already marked settled.
drop policy if exists "bookings anon create" on public.bookings;
create policy "bookings anon create"
  on public.bookings for insert
  to anon, authenticated
  with check (
    payout_status = 'pending'
    and status in ('pending','confirmed')
    and guests > 0
  );

-- Deliberately NO anon SELECT policy.
-- Bookings are unreadable without authentication.
drop policy if exists "bookings staff read" on public.bookings;
create policy "bookings staff read"
  on public.bookings for select
  to authenticated
  using (true);

drop policy if exists "bookings staff update" on public.bookings;
create policy "bookings staff update"
  on public.bookings for update
  to authenticated
  using (true) with check (true);

-- ── PAYOUTS ─────────────────────────────────────────────
drop policy if exists "payouts staff only" on public.partner_payouts;
create policy "payouts staff only"
  on public.partner_payouts for all
  to authenticated
  using (true) with check (true);
