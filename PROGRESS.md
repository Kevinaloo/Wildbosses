# Wild Bosses Adventures — rebuild in progress

## Where we are

### Done and pushed
- **Claw intro engine** (`wb-intro.js` / `wb-intro.css`) — the ghost-lion
  screen tear. Preview it at **`/_test-intro.html`**.
- **Design foundation** (`wb-tokens.css`) — self-hosted Anton + Geist +
  Geist Mono in `/fonts` (312K, removes the render-blocking Google Fonts
  request), plus the colour/space/type token set.
- **Live database** — schema applied to Supabase project
  `uhoqbticmkeufuxnrate`. Tables: `guides`, `tours`, `bookings`,
  `hero_videos`, `site_settings`, `admins`. Storage buckets:
  `hero-videos`, `tour-photos`, `brand`.
- **Data layer** (`wb-data.js`) — replaces the dead `wb-db.js`, which was
  never loaded by any page and still had `__SUPABASE_URL__` placeholders.
- **Diagonal video rail** (`wb-rail.js`) — logic complete, styling next.

### Next
- `wb-rail.css`, then rebuild `index.html` around intro → rail → tour cards
- Strip `wb-showcase.js` (ad engine) and `cabana-wb-integration.js`
- Admin at `/admin` with real Supabase Auth login

## Two security findings from the audit

1. **`list-tour.html` is a public, unauthenticated form.** Anyone on the
   internet can post a tour to the site. It needs the admin gate.
2. The old RLS draft granted **any signed-up user** full write access
   (`to authenticated using (true)`). Replaced with an `admins` allow-list
   checked via `public.is_admin()`, so an open signup can never become an
   open catalogue.

## Notes
- Ratings and review counts seed at **0**, not invented numbers.
- Hero cards seed with posters and **no video** — the rail drifts the
  poster until real film is uploaded, so nothing on the page is a stand-in
  pretending to be the client's work.
