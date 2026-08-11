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

## Still to do

- Payment gateway (M-Pesa / card)
- Itinerary day-by-day on the trip page
- Guide profiles linked to trips
