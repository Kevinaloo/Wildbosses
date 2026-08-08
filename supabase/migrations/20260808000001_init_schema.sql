-- ═══════════════════════════════════════════════════════════
-- WILDBOSSES · CORE SCHEMA
-- guides · tours · bookings · partner_payouts
-- ═══════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── GUIDES ──────────────────────────────────────────────
create table if not exists public.guides (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  photo          text,
  bio            text,
  specialities   text[]       default '{}',
  languages      text[]       default '{en}',
  years_exp      int          default 0,
  rating         numeric(3,2) default 0 check (rating between 0 and 5),
  reviews        int          default 0,
  phone          text,
  email          text,
  certifications text[]       default '{}',
  active         boolean      default true,
  created_at     timestamptz  default now()
);

-- ── TOURS (single source of truth) ──────────────────────
create table if not exists public.tours (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,

  name             text not null,
  subtitle         text,
  description      text,

  category         text not null check (category in
                     ('safari','walking','culture','adventure','beach','birding','photo','night')),
  destination      text not null,
  country          text default 'Kenya',

  duration         text,
  group_min        int default 1,
  group_max        int default 8,

  price_kes        int not null default 0 check (price_kes >= 0),
  deposit_pct      int default 30 check (deposit_pct between 0 and 100),
  deposit_kes      int generated always as (round(price_kes * deposit_pct / 100.0)) stored,

  spots_total      int default 8 check (spots_total >= 0),
  spots_left       int default 8 check (spots_left  >= 0),

  rating           numeric(3,2) default 0 check (rating between 0 and 5),
  reviews          int default 0,

  departure_date   date,
  return_date      date,
  booking_deadline timestamptz,

  status           text default 'open'
                     check (status in ('draft','open','full','closed','cancelled')),
  urgency          text default 'normal'
                     check (urgency in ('normal','high','critical')),
  featured         boolean default false,

  image            text,
  image_thumb      text,
  gallery          text[] default '{}',

  tags             text[] default '{}',
  includes         text[] default '{}',
  excludes         text[] default '{}',
  itinerary        jsonb  default '[]',

  guide_id         uuid references public.guides(id) on delete set null,

  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),

  constraint spots_left_lte_total check (spots_left <= spots_total)
);

create index if not exists tours_status_idx      on public.tours (status);
create index if not exists tours_category_idx    on public.tours (category);
create index if not exists tours_destination_idx on public.tours (destination);
create index if not exists tours_featured_idx    on public.tours (featured) where featured = true;
create index if not exists tours_departure_idx   on public.tours (departure_date);

-- ── BOOKINGS (direct + every partner) ───────────────────
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  booking_ref       text unique not null,

  tour_id           uuid references public.tours(id) on delete restrict,
  tour_name         text not null,          -- denormalised: survives tour edits

  guest_name        text not null,
  guest_phone       text not null,
  guest_email       text,
  guests            int not null default 1 check (guests > 0),
  travel_date       text,
  notes             text,

  currency          text default 'KES',
  base_amount       int not null default 0,
  service_fee       int not null default 0,   -- partner's cut, 0 for direct
  total_amount      int not null default 0,
  deposit_paid      int default 0,
  wildbosses_payout int not null default 0,

  source            text default 'direct'
                      check (source in ('direct','cabana','partner','admin')),
  partner_id        text,
  partner_user_id   text,

  payment_ref       text,
  payment_type      text default 'deposit'
                      check (payment_type in ('deposit','full','pending','free')),
  payment_status    text default 'pending'
                      check (payment_status in ('pending','paid','failed','refunded')),

  payout_status     text default 'pending'
                      check (payout_status in ('pending','paid','reconciled','disputed')),
  payout_date       timestamptz,

  status            text default 'confirmed'
                      check (status in ('pending','confirmed','cancelled','completed','no_show')),

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists bookings_tour_idx    on public.bookings (tour_id);
create index if not exists bookings_source_idx  on public.bookings (source);
create index if not exists bookings_payout_idx  on public.bookings (payout_status) where payout_status = 'pending';
create index if not exists bookings_created_idx on public.bookings (created_at desc);
create index if not exists bookings_phone_idx   on public.bookings (guest_phone);

-- ── PARTNER PAYOUTS (reconciliation ledger) ─────────────
create table if not exists public.partner_payouts (
  id             uuid primary key default gen_random_uuid(),
  partner_id     text not null,
  period_start   date not null,
  period_end     date not null,
  bookings_count int default 0,
  gross_amount   int default 0,
  fee_amount     int default 0,
  payout_amount  int default 0,
  status         text default 'pending'
                   check (status in ('pending','invoiced','paid','disputed')),
  paid_at        timestamptz,
  reference      text,
  notes          text,
  created_at     timestamptz default now()
);

create index if not exists payouts_partner_idx on public.partner_payouts (partner_id, period_start desc);
