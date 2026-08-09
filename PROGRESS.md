# Wild Bosses Adventures

## Pages

| Page | What it does |
|---|---|
| `/` | Claw intro → diagonal video rail → featured departures |
| `/tours.html` | Full catalogue, filtered by category |
| `/tour.html?t=slug` | Trip detail + live countdown + booking form |
| `/guides.html` | The guides |
| `/about.html` | The story |
| `/contact.html` | Enquiry form + WhatsApp / phone / email |
| `/admin.html` | Sign-in and run the whole site |
| `/_preview-intro.html` | Replay the claw intro on demand |

## Theme

Light by day, dark at night, decided in this order:

1. what the visitor last chose (persists)
2. the operating system, if it asks for dark
3. the clock where the visitor is — dark from 18:30 to 06:30

There is a toggle in the nav. `wb-theme.js` runs in `<head>` before first
paint, so the page never flashes the wrong face. An open tab rolls over on
its own at dusk.

The claw intro is **always black**, whatever the hour, so the tear marks
stay pronounced. The video rail is also a permanently dark stage — film and
photography carry on black, and dimmed cards recede instead of washing out
against a pale page. It fades into the light page below it.

## The bug in the screenshots

The intro guard returned early on a repeat visit **before** attaching the
skip handler. The overlay is fixed, full-screen and top-of-stack, so it
stayed in the DOM and silently blocked the entire site with a dead Skip
button. Any second visit or back-navigation was a dead end.

Fixed with four layers, because one was clearly not enough:

1. `wb-theme.js` stamps `wb-no-intro` in `<head>` — the overlay never paints
2. every exit path in `run()` now calls `kill()`, which removes the element
3. the Skip button is wired on the very first line, before anything can fail
4. a 9-second failsafe lifts the curtain no matter what went wrong

## Hero videos

Upload MP4 or WebM in **Admin → Hero videos**. The poster shows underneath
and the film fades in only once it can actually play, so a slow connection
shows a photograph rather than a black rectangle. Only the card at centre
stage decodes; the next one's metadata is pulled early so the hand-off is
seamless. Four videos decoding at once drops frames on a mid-range phone.

Keep files under ~200MB. Short loops of 10–20 seconds, muted, look best.

## Removed

The old green pages and their stylesheets, the Cabana ad engine
(`wb-showcase.js` — `advertiser`, `campaign_id`, `ad_impression`),
`cabana-wb-integration.js`, `wildbosses-api.js`, the dead `wb-db.js`, and the
public unauthenticated `list-tour.html` form.

## Security

- Writes gated on a `public.admins` allow-list via `is_admin()`, not on
  "is signed in"
- No anonymous SELECT on bookings — guest phone numbers are not public
- A booking cannot arrive already marked paid or confirmed
- Supabase SDK and all fonts self-hosted; no third-party requests

## Still to do

- Payment gateway (M-Pesa / card)
- Itinerary day-by-day on the trip page
- Guide profiles linked to trips
