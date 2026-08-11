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

## Palette

One committed palette. There is no light/dark switch any more — it asked a
visitor to have an opinion about something they came here to ignore, and it
halved the care that could go into either face.

Three colours, three jobs:

| | |
|---|---|
| **white** `#F5FAF1` | reads — the ground under the photographs |
| **green** `#073B29` | frames — nav, masthead, footer, the film rail |
| **gold** `#F7BE18` | acts — every button, badge and live state |

The ground is warm white because the product is photography. A saturated
wall behind a safari photograph makes the photograph negotiate with it —
gold grass, red earth and blue sky all lose. Green is worth more as the
frame than as the field.

Every page reads green → white → green: the nav and masthead are one mass
of forest at the top, the content sits on the light ground, the footer
closes it. A gold hairline marks the seam.

**Yellow is never type on the light ground.** At text size on anything pale
it is unreadable at any weight, so it is spent only where it can be loud on
purpose. Two tokens keep this honest and they are easy to confuse:

- `--gold` is the accent **as type** — dark amber `#8A5D00` on white
- `--sun` / `--grad-sun` is the accent **as a fill**, always with `--on-sun`

Using `--gold` as a background is the mistake to watch for; it goes muddy
brown. Seven places were doing it, including the tour filter chips.

### The dark band

`.wb-inverse` is not a second theme, it is a surface level: it repoints the
semantic tokens to the dark set, so a section can go deep green without a
second palette existing anywhere. Applied to `.wb-nav`, `.wb-foot`,
`.wb-hero` and `.wb-rail`.

`--ground` deliberately does **not** flip inside it, for anything needing
the light page colour while standing in a dark band.

The rail's bottom fade is a vignette into the stage's **own** darkness, not
a transition to the page. Pointing it at the light page put a milky white
band straight across the card content. The seam to the page is the gold
hairline instead, the same one under the masthead.

The rail card is capped by viewport **height** as well as width. It is 3/4
portrait inside a rotated row, so sized by width alone it stands taller
than the stage on a short laptop screen and every card loses its price and
countdown. The row also rides above centre, because `.rail-body` sits at
the bottom of each card and a centred row puts all of it under the fade.

`--focus` also flips per surface. Lime is 7:1 on green and 1.7:1 on white,
so a single focus colour cannot serve both.

Every text node on the shipped pages clears WCAG AA against the surface it
actually sits on, checked in the browser rather than on paper.

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

## Fixed along the way

Four things that were already broken before the repaint:

- `--muted`, `--fg` and `--glass-border` were used 40+ times in the booking
  form and defined nowhere. They died with the old stylesheets and left the
  form drawing unstyled type off dead variables. Now aliased, not renamed.
- `.wb-hero p` (0,1,1) outranked `.wb-eyebrow` (0,1,0), so the eyebrow on
  every inner page had silently been taking the lede colour instead of its
  accent. Resolved with `:not()`.
- `[data-reveal]` was hidden by CSS and revealed only by JS, and the reveal
  bailed early on browsers without `IntersectionObserver`. Any break in that
  chain erased whole sections permanently. Now the hidden state is scoped to
  a class the head script stamps, the observer-less path shows everything,
  and a three-second failsafe drops the class if nothing claims it — the
  same shape as the intro curtain failsafe.
- The booking CTA was `display:none` below 820px. Most of this traffic is
  phones, so that removed the one action the page exists for from the device
  most likely to take it. It shrinks instead.

## The 700px bug

`.wb-trip-hero` read `aspect-ratio:21/9; min-height:300px` on a box with an
auto width. CSS resolves that by transferring the minimum height back
*through* the ratio into a minimum **width** — 300 x 21/9 = 700px. So on a
390px phone the trip page forced the document to 716px: the sticky nav
painted only the real viewport while the content scrolled out from under it,
and the whole site looked broken rather than merely clipped.

21/9 is a cinema crop that only makes sense on a wide screen; on a phone it
is a 40px letterbox, which is why the min-height was propping it up. Each
width now gets the ratio it actually wants — 4/5, then 16/10, then 21/9 —
and `width:100%` makes the inline size definite so nothing can be
transferred into it again.

`html, body { overflow-x: clip }` is the net under it. `clip` and not
`hidden`: `overflow-x:hidden` silently turns the element into a scroll
container, which kills `position:sticky` on the nav. Anything the net
catches is still a bug.

## Removed for security

- `/api/debug-env` — unauthenticated, and it leaked the ends of
  `SUPABASE_SERVICE_ROLE_KEY` and `PAYHERO_PASSWORD`, the whole
  `PAYHERO_CHANNEL_ID`, and 600 characters of a service-role query result.
- `/api/debug-pay` — an unauthenticated POST fired a **real M-Pesa STK push
  to any phone number in the body**, billed to the PayHero account.

`/api/book`, `/api/pay` and `/api/pay-status` also answered
`Access-Control-Allow-Origin: *`, so any site could fire them from a
visitor's browser. They now answer only this origin.

## The rail had no posters

Every `hero_videos` row has `poster_url` NULL, so `cardHTML` emitted
`background-image:url()` — invalid — and the homepage opened on four black
rectangles until the MP4s decoded. Fixed in the `hero_rail` view rather than
by backfilling the column: the view already joins `tours`, so
`COALESCE(NULLIF(h.poster_url,''), t.image)` means the trip's own photograph
stands in and a poster is never missing again, including for rows the admin
creates later. An explicit poster still wins.

## The homepage had no h1

The whole top of the page was the rail: four dark cards drifting past and
nowhere a sentence saying what this company sells. The document opened on an
`h3` inside a card. There is now a copy band above the stage, sharing one
green mass that sinks into the stage's black, carrying the one thing that
actually distinguishes this operator: the trips already have dates.

Below 640px the rail drops the -8deg tilt and becomes an upright scroll-snap
row. Rotated, the leading card was sliced by the viewport edge, so the first
thing a phone visitor saw was half a title and a price cut down the middle.
The drift loop and drag handlers are skipped there too — they were a rAF
writing transforms every frame that CSS then discarded, fighting the
browser's own momentum scrolling.

## Not done on purpose

`tours.itinerary`, `rating` and `reviews` are empty. The day-by-day renderer
is built and appears the moment real content is entered, but nothing was
seeded. Inventing a schedule puts times and places in front of someone about
to pay for them, and inventing ratings is fabricated social proof on a page
that takes money.

## Still to do

- Payment gateway (M-Pesa / card)
- Itinerary day-by-day on the trip page
- Guide profiles linked to trips
