-- ═══════════════════════════════════════════════════════════
-- WILDBOSSES · PHOTO GALLERY
-- Replaces the guides table for public-facing use.
-- Photos from past tours, admin-managed.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  caption     text,
  alt_text    text,
  location    text,
  tour_id     uuid references public.tours(id) on delete set null,
  sort_order  int  default 0,
  active      boolean default true,
  created_at  timestamptz default now()
);

create index if not exists photos_active_idx on public.photos (active) where active = true;
create index if not exists photos_sort_idx   on public.photos (sort_order, created_at desc);

-- RLS: public can read active photos, only admins can write
alter table public.photos enable row level security;

create policy "photos_public_read" on public.photos
  for select using (active = true);

create policy "photos_admin_all" on public.photos
  for all using (
    exists (select 1 from public.admins where email = auth.email())
  );
