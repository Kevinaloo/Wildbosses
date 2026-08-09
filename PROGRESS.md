# Wild Bosses Adventures — rebuild

## Live now

- **Homepage** — claw intro → diagonal video rail → tour grid. Every word
  and price comes from the database. Nothing is hardcoded.
- **Admin** at **`/admin.html`** — real Supabase Auth sign-in.
- **Intro preview** at `/_preview-intro.html` (replays on demand).

## Signing in

    /admin.html
    admin@wildbosses.co

The temporary password was given separately. **Change it on first sign-in.**

Four tabs: **Hero videos**, **Tours**, **Bookings**, **Brand**. Videos and
photos upload straight from the forms into Supabase Storage.

## What was removed

| Removed | Why |
|---|---|
| `wb-showcase.js` | An ad server — `advertiser`, `campaign_id`, `ad_impression`, hardcoded `DEMOS`. Cabana graft. Also leaked live Supabase keys in client JS. |
| `cabana-wb-integration.js` | The Cabana coupling. |
| `wildbosses-api.js` | Cabana bridge plus a static fallback catalogue. |
| `wb-db.js` | Dead data layer. Never loaded by any page, credentials never filled in. |
| `list-tour.html` form | Was a **public, unauthenticated** form — anyone could post a tour. Now redirects to the admin. |

## Security fixes

1. Writes are gated on a `public.admins` allow-list via `is_admin()`, not on
   "is signed in". The earlier draft used `to authenticated using (true)`,
   which would hand the catalogue to anyone who created an account.
2. Bookings have **no anonymous SELECT**. Guest names and phone numbers are
   unreadable without an admin session.
3. A booking cannot arrive already marked paid or confirmed. Only an admin
   moves it to those states.
4. The Supabase JS SDK is self-hosted rather than pulled from a public CDN.

## Deliberate choices

- **Ratings and review counts start at 0.** Invented social proof is what
  made the old site feel fake.
- **Hero cards ship with posters and no video.** The rail drifts the poster
  until real film is uploaded, so the page never shows a stand-in pretending
  to be the client's work. Upload video in the admin and it plays.
- The intro plays **once per session**, not on every navigation.
- Fonts are self-hosted (312K) — no render-blocking Google Fonts request.

## Still to do

- `tours.html` detail view + booking flow wired to `WB.createBooking()`
- `guides.html` and `about.html` onto the live data layer
- M-Pesa / payment gateway
