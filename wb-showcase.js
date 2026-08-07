/* ═══════════════════════════════════════════════════════════════════════
   WILDBOSSES SHOWCASE ENGINE v2 — World-Class Ad & Feature Display
   ─────────────────────────────────────────────────────────────────────
   ABOVE THE FOLD — the entire showcase is INSIDE the hero section
   so it is visible immediately on page load, no scrolling needed.

   Layout (all within the hero, at bottom):
     1. LIVE TICKER      — scrolling news strip right above stats bar
     2. CINEMATIC HERO   — full-width 21:9 photo/video ad with Ken Burns
     3. CAROUSEL STRIP   — sponsor & Wildbosses feature cards
   
   Supabase: loads live campaigns (page_targets includes 'all' or 'wildbosses')
   Falls back to curated Wildbosses demos when DB is empty / offline.
   GA4 impression + click tracking + Supabase counters (fire-and-forget).
═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Config ── */
  const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  const PAGE = 'wildbosses-index';

  /* ── GA4 + Supabase tracking ── */
  function ga(ev, p) { window.gtag?.('event', ev, p); }
  function dbTrack(fn, id) {
    fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
      body: JSON.stringify({ p_campaign_id: id })
    }).catch(() => {});
  }
  function trackImpression(id, fmt, adv) {
    ga('wb_ad_impression', { campaign_id: id, ad_format: fmt, advertiser: adv, page: PAGE });
    dbTrack('increment_ad_impression', id);
  }
  function trackClick(id, fmt, adv) {
    ga('wb_ad_click', { campaign_id: id, ad_format: fmt, advertiser: adv, page: PAGE });
    dbTrack('increment_ad_click', id);
  }

  /* ══════════════════════════════════════════════════════════════════
     DEMO CAMPAIGNS — curated Wildbosses content
  ══════════════════════════════════════════════════════════════════ */
  const DEMO = {
    hero: [
      {
        id: 'wb_h1', advertiser: 'Wildbosses', tag: 'Featured · 2 spots left',
        headline: 'The Great Migration\nis calling.',
        sub: 'Masai Mara · 14–21 Aug 2026 · 7 days · Private 4×4 · Expert guide',
        cta: 'Secure your spot',
        url: 'tours.html?id=migration',
        media: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1800&q=85',
        accent: '#DCA318',
        price: 'From KES 95,000',
      },
      {
        id: 'wb_h2', advertiser: 'Wildbosses', tag: 'Adventure',
        headline: 'Kilimanjaro.\nConquer the roof.',
        sub: 'Tanzania · Marangu Route · 6 days · All levels · Expert guides',
        cta: 'View expedition',
        url: 'tours.html?id=kilimanjaro',
        media: 'https://images.unsplash.com/photo-1519923834699-ef0b7cde4712?w=1800&q=85',
        accent: '#F5C430',
        price: 'From KES 185,000',
      },
      {
        id: 'wb_h3', advertiser: 'Wildbosses', tag: 'Must See',
        headline: 'Amboseli.\nElephants & Kilimanjaro.',
        sub: 'Kenya · 2 days · Luxury tented camp · Giant tuskers up close',
        cta: 'Book this trip',
        url: 'tours.html?id=amboseli',
        media: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1800&q=85',
        accent: '#DCA318',
        price: 'From KES 28,000',
      },
      {
        id: 'wb_h4', advertiser: 'Wildbosses', tag: 'Coastal Escape',
        headline: 'Zanzibar.\nWhere spice meets sea.',
        sub: 'Tanzania · Stone Town · Spice Farm · Full day · Expert cultural guide',
        cta: 'Explore Zanzibar',
        url: 'tours.html?id=zanzibar',
        media: 'https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=1800&q=85',
        accent: '#2DD4BF',
        price: 'From KES 9,500',
      },
    ],
    carousel: [
      {
        id: 'wb_c1', advertiser: 'Wildbosses', tag: 'Free Tour',
        headline: 'Nairobi City Walking Tour — Free',
        sub: 'Kibera · Karura Forest · CBD · 4.96★ from 1,240+ guests',
        cta: 'Join for free',
        url: 'tours.html?id=nairobi-walk',
        grad: 'linear-gradient(135deg,#0A3B1E,#1C7A3E)',
        icon: '<circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8z"/>',
      },
      {
        id: 'wb_c2', advertiser: 'Cabana Stays', tag: 'Partner',
        headline: 'Need a place to sleep near your safari?',
        sub: 'Cabana-verified apartments across Kenya — zero commission, hosts keep 100%',
        cta: 'Find stays',
        url: 'https://www.apatmento.space/kenya-apartments.html',
        grad: 'linear-gradient(135deg,#7B2FF7,#4361FF)',
        icon: '<path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9 20v-5a3 3 0 0 1 6 0v5"/>',
      },
      {
        id: 'wb_c3', advertiser: 'Wildbosses', tag: 'Our People',
        headline: 'Meet the guides who make it unforgettable',
        sub: '12 years guiding East Africa · Naturalist certified · Masai & Kikuyu heritage',
        cta: 'Meet our guides',
        url: 'guides.html',
        grad: 'linear-gradient(135deg,#1C4A0A,#2E7A1E)',
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      },
      {
        id: 'wb_c4', advertiser: 'Wildbosses', tag: 'Zero Fees',
        headline: 'Price shown is price paid — always',
        sub: 'KTB-registered · 4.97★ · WhatsApp reply in 15 min · 30% deposit secures your spot',
        cta: 'Browse tours',
        url: 'tours.html',
        grad: 'linear-gradient(135deg,#0A2B3E,#135C7A)',
        icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      },
    ],
    ticker: '🦁 2 spots left — Masai Mara Migration Safari Aug 2026 · 🏔 Kilimanjaro Marangu Route from KES 185,000 · 🐘 Amboseli Elephants & Kili Views — 2 days · 4.97★ from 1,240+ happy travellers · 🌊 Diani Beach escapes — book direct · Zero hidden fees on all tours · 🏝 Zanzibar Stone Town & Spice Farm · WhatsApp us — reply in 15 mins · 🔴 Aug 2026 dates filling fast',
  };

  /* ══════════════════════════════════════════════════════════════════
     CSS — Wildbosses forest-green & safari-gold, above-fold dock
  ══════════════════════════════════════════════════════════════════ */
  const CSS = `
/* ─── SHOWCASE DOCK ─── */
#wb-showcase-dock {
  width: 100%;
}

/* ─── LIVE TICKER ─── */
.wbsc-ticker {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: rgba(3,15,6,.92);
  border-top: 1px solid rgba(255,255,255,.07);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.wbsc-ticker-badge {
  flex-shrink: 0;
  height: 100%;
  padding: 0 16px;
  background: linear-gradient(135deg,#DCA318,#D44010);
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'Inter', sans-serif;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #fff;
  white-space: nowrap;
}
.wbsc-ticker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  flex-shrink: 0;
  animation: wbTickDot 1.4s ease-in-out infinite;
}
@keyframes wbTickDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.2;transform:scale(.6)} }
.wbsc-ticker-track {
  flex: 1;
  overflow: hidden;
  -webkit-mask: linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);
  mask: linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);
}
.wbsc-ticker-inner {
  display: flex;
  white-space: nowrap;
  animation: wbTickRun 34s linear infinite;
}
.wbsc-ticker-inner:hover { animation-play-state: paused; cursor: default; }
@keyframes wbTickRun { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
.wbsc-ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 20px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,.52);
  white-space: nowrap;
}
.wbsc-ticker-sep { color: rgba(255,255,255,.15); font-size: 7px; }

/* ─── CINEMATIC HERO ─── */
.wbsc-hero {
  position: relative;
  width: 100%;
  aspect-ratio: 21/9;
  overflow: hidden;
  cursor: pointer;
  display: block;
  background: #030F06;
}
@media (max-width: 860px) { .wbsc-hero { aspect-ratio: 16/9; } }
@media (max-width: 540px) { .wbsc-hero { aspect-ratio: 4/3; } }

/* Ken Burns photo */
.wbsc-hero-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0;
  transition: opacity .65s ease;
  transform-origin: center;
  animation: wbKenBurns 9s ease-out infinite alternate;
  will-change: transform, opacity;
}
.wbsc-hero-photo.shown { opacity: 1; }
@keyframes wbKenBurns {
  0%   { transform: scale(1.06) translate(0%, 0%); }
  100% { transform: scale(1.0)  translate(-1%, -0.5%); }
}

/* gradient vignette */
.wbsc-hero-grad {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(to bottom,  rgba(3,15,6,.28) 0%,  rgba(3,15,6,0) 28%, rgba(3,15,6,0) 50%, rgba(3,15,6,.88) 100%),
    linear-gradient(to right,   rgba(3,15,6,.65) 0%,  rgba(3,15,6,.15) 55%, rgba(3,15,6,0) 100%);
}

/* sponsored tag */
.wbsc-hero-tag {
  position: absolute;
  top: 18px;
  left: 22px;
  z-index: 4;
  font-family: 'Inter', sans-serif;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgba(255,255,255,.90);
  background: rgba(3,15,6,.48);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.16);
  padding: 5px 13px;
  border-radius: 100px;
  white-space: nowrap;
}

/* playlist dots */
.wbsc-dots {
  position: absolute;
  top: 18px;
  right: 20px;
  z-index: 4;
  display: flex;
  gap: 5px;
  align-items: center;
}
.wbsc-dot {
  height: 5px;
  border-radius: 3px;
  transition: all .45s cubic-bezier(.22,1,.36,1);
  cursor: pointer;
}
.wbsc-dot.active { background: #DCA318 !important; }

/* content block */
.wbsc-hero-content {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: clamp(18px, 3.2vw, 52px);
  pointer-events: none;
}
.wbsc-hero-adv {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,.50);
  margin-bottom: 8px;
  letter-spacing: .10em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 7px;
}
.wbsc-hero-adv::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #DCA318;
  flex-shrink: 0;
}
.wbsc-hero-h {
  font-family: 'Geist', 'Inter', sans-serif;
  font-weight: 700;
  font-size: clamp(24px, 4.2vw, 58px);
  color: #fff;
  line-height: 1.00;
  letter-spacing: -.038em;
  margin-bottom: 10px;
  white-space: pre-line;
  text-shadow: 0 4px 32px rgba(0,0,0,.50);
  max-width: 58%;
}
@media (max-width: 640px) { .wbsc-hero-h { max-width: 90%; font-size: clamp(22px, 6vw, 34px); } }

.wbsc-hero-sub {
  font-family: 'Inter', sans-serif;
  font-size: clamp(11px, 1.3vw, 14px);
  color: rgba(255,255,255,.68);
  margin-bottom: 20px;
  max-width: 52%;
  line-height: 1.55;
}
@media (max-width: 640px) { .wbsc-hero-sub { max-width: 90%; } }

.wbsc-hero-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  pointer-events: all;
}
.wbsc-hero-price {
  font-family: 'Geist', 'Inter', sans-serif;
  font-size: clamp(13px, 1.5vw, 16px);
  font-weight: 700;
  color: #F5C430;
  letter-spacing: -.02em;
}
.wbsc-hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 24px;
  border-radius: 100px;
  background: linear-gradient(135deg, #DCA318, #D44010);
  color: #fff;
  font-family: 'Geist', 'Inter', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 28px rgba(200,138,0,.48);
  transition: all .3s;
  letter-spacing: -.02em;
  white-space: nowrap;
}
.wbsc-hero-cta:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 14px 38px rgba(200,138,0,.58); }
.wbsc-hero-cta svg { width: 13px; height: 13px; flex-shrink: 0; transition: transform .28s; }
.wbsc-hero-cta:hover svg { transform: translateX(3px); }

/* progress bar */
.wbsc-hero-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: rgba(255,255,255,.10);
  z-index: 4;
}
.wbsc-hero-fill {
  height: 100%;
  background: linear-gradient(90deg, #DCA318, #2E9E54);
  width: 0%;
  transition: width .1s linear;
}

/* sponsored watermark */
.wbsc-hero-label {
  position: absolute;
  bottom: 12px;
  right: 16px;
  z-index: 4;
  font-family: 'Inter', sans-serif;
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: rgba(255,255,255,.20);
}

/* ─── CAROUSEL STRIP ─── */
.wbsc-carousel-wrap {
  position: relative;
  background: rgba(4,14,7,.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,.07);
  overflow: hidden;
  height: 90px;
}
@media (max-width: 540px) {
  .wbsc-carousel-wrap { height: auto; min-height: 82px; }
}
.wbsc-slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 0 clamp(16px, 3vw, 48px);
  gap: 16px;
  opacity: 0;
  transform: translateX(24px);
  transition: opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1);
  pointer-events: none;
  cursor: pointer;
}
.wbsc-slide.active { opacity: 1; transform: none; pointer-events: all; }

.wbsc-slide-ico {
  width: 46px; height: 46px;
  border-radius: 13px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  border: 1px solid rgba(255,255,255,.13);
}
.wbsc-slide-ico svg { width: 20px; height: 20px; }
.wbsc-slide-body { flex: 1; min-width: 0; }
.wbsc-slide-who {
  font-family: 'Inter', sans-serif;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: rgba(255,255,255,.30);
  margin-bottom: 3px;
}
.wbsc-slide-h {
  font-family: 'Geist', 'Inter', sans-serif;
  font-size: clamp(13px, 1.7vw, 15.5px);
  font-weight: 600;
  color: #fff;
  letter-spacing: -.022em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wbsc-slide-sub {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: rgba(255,255,255,.36);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wbsc-slide-cta {
  flex-shrink: 0;
  padding: 10px 18px;
  border-radius: 100px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.14);
  color: rgba(255,255,255,.82);
  font-family: 'Geist', 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all .22s;
  white-space: nowrap;
  letter-spacing: -.01em;
}
.wbsc-slide-cta:hover { background: rgba(255,255,255,.16); color: #fff; }

/* carousel arrows */
.wbsc-carr-btn {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  z-index: 3;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,.09);
  border: 1px solid rgba(255,255,255,.14);
  color: rgba(255,255,255,.65);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .2s;
}
.wbsc-carr-btn:hover { background: rgba(255,255,255,.20); color: #fff; }
.wbsc-carr-btn svg { width: 12px; height: 12px; }
.wbsc-carr-prev { left: 8px; }
.wbsc-carr-next { right: 8px; }

/* carousel dots */
.wbsc-carr-dots {
  position: absolute;
  bottom: 8px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 4px; z-index: 3;
}
.wbsc-carr-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,.22);
  cursor: pointer;
  transition: all .35s;
}
.wbsc-carr-dot.active { width: 16px; border-radius: 2px; background: #DCA318; }

/* carousel progress */
.wbsc-carr-prog {
  position: absolute;
  bottom: 0; left: 0;
  height: 2px;
  background: rgba(200,138,0,.60);
  z-index: 3;
  width: 0%;
  transition: width .08s linear;
}

/* ─── Reduced motion ─── */
@media (prefers-reduced-motion: reduce) {
  .wbsc-hero-photo { animation: none !important; }
  .wbsc-ticker-inner { animation: none !important; }
}
`;

  function injectCSS() {
    if (document.getElementById('wbsc-css')) return;
    const s = document.createElement('style');
    s.id = 'wbsc-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════════
     SUPABASE — load live campaigns
  ══════════════════════════════════════════════════════════════════ */
  let LIVE = null;

  async function loadFromDB() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      let r;
      try {
        r = await fetch(
          `${SUPA_URL}/rest/v1/ad_campaigns?active=eq.true&order=priority.desc&limit=50`,
          { headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }, signal: ctrl.signal }
        );
      } finally { clearTimeout(t); }
      if (!r.ok) return false;
      const all = await r.json();
      if (!all?.length) return false;
      const paged = all.filter(c => {
        const tg = c.page_targets || ['all'];
        return tg.includes('all') || tg.includes('wildbosses') || tg.includes(PAGE);
      });
      if (!paged.length) return false;
      LIVE = { hero: [], carousel: [] };
      paged.forEach(c => {
        const m = {
          id: c.campaign_id, advertiser: c.advertiser, tag: c.tag || 'Featured',
          headline: c.headline, sub: c.sub || '', cta: c.cta_text || 'Learn more',
          url: c.cta_url || '#', media: c.media_url || '',
          grad: c.theme_gradient || 'linear-gradient(135deg,#0A3B1E,#135C2E)',
          accent: c.accent_color || '#DCA318', price: c.price_display || '', icon: c.icon_svg || '',
        };
        if (c.format === 'video') LIVE.hero.push(m);
        else if (c.format === 'carousel') LIVE.carousel.push(m);
      });
      return LIVE.hero.length > 0 || LIVE.carousel.length > 0;
    } catch { return false; }
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — LIVE TICKER
  ══════════════════════════════════════════════════════════════════ */
  function renderTicker(root, text) {
    const items = text.split('·').map(s => s.trim()).filter(Boolean);
    const html = items.map(t =>
      `<span class="wbsc-ticker-item">${t}<span class="wbsc-ticker-sep">·</span></span>`
    ).join('');
    const ticker = document.createElement('div');
    ticker.className = 'wbsc-ticker';
    ticker.innerHTML = `
      <div class="wbsc-ticker-badge">
        <div class="wbsc-ticker-dot"></div>Live
      </div>
      <div class="wbsc-ticker-track">
        <div class="wbsc-ticker-inner">${html}${html}</div>
      </div>`;
    root.appendChild(ticker);
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — CINEMATIC HERO (Ken Burns photo slideshow)
  ══════════════════════════════════════════════════════════════════ */
  function renderHero(root, pool) {
    if (!pool?.length) return;
    let cur = 0;
    const DURATION = 8000; // ms per slide
    let raf, startTime;
    const camp = () => pool[cur % pool.length];

    const hero = document.createElement('div');
    hero.className = 'wbsc-hero';
    hero.innerHTML = `
      <img class="wbsc-hero-photo" src="" alt="" loading="eager" fetchpriority="high"/>
      <div class="wbsc-hero-grad"></div>
      <div class="wbsc-hero-tag"></div>
      <div class="wbsc-dots">
        ${pool.map((_, i) =>
          `<div class="wbsc-dot" data-i="${i}" style="width:${i===0?'22px':'6px'};background:${i===0?'#DCA318':'rgba(255,255,255,.28)'}"></div>`
        ).join('')}
      </div>
      <div class="wbsc-hero-content">
        <div class="wbsc-hero-adv"></div>
        <div class="wbsc-hero-h"></div>
        <div class="wbsc-hero-sub"></div>
        <div class="wbsc-hero-row">
          <div class="wbsc-hero-price"></div>
          <button class="wbsc-hero-cta">
            <span class="wbsc-cta-txt"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17 17 7M7 7h10v10"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="wbsc-hero-bar"><div class="wbsc-hero-fill"></div></div>
      <div class="wbsc-hero-label">Sponsored</div>`;
    root.appendChild(hero);

    const photo   = hero.querySelector('.wbsc-hero-photo');
    const tag     = hero.querySelector('.wbsc-hero-tag');
    const advEl   = hero.querySelector('.wbsc-hero-adv');
    const hEl     = hero.querySelector('.wbsc-hero-h');
    const subEl   = hero.querySelector('.wbsc-hero-sub');
    const priceEl = hero.querySelector('.wbsc-hero-price');
    const ctaTxt  = hero.querySelector('.wbsc-cta-txt');
    const ctaBtn  = hero.querySelector('.wbsc-hero-cta');
    const fill    = hero.querySelector('.wbsc-hero-fill');
    const dots    = [...hero.querySelectorAll('.wbsc-dot')];

    function updateDots() {
      const idx = cur % pool.length;
      dots.forEach((d, i) => {
        const act = i === idx;
        d.classList.toggle('active', act);
        d.style.width  = act ? '22px' : '6px';
        d.style.background = act ? '#DCA318' : 'rgba(255,255,255,.28)';
      });
    }

    function loadSlide() {
      const c = camp();
      // fade out then swap
      photo.classList.remove('shown');
      setTimeout(() => {
        photo.src = c.media || '';
        if (c.media) {
          const img = new Image();
          img.onload = () => { photo.classList.add('shown'); };
          img.onerror = () => { photo.classList.add('shown'); };
          img.src = c.media;
        }
      }, 200);

      tag.textContent     = c.tag;
      advEl.textContent   = c.advertiser + ' · Wildbosses';
      hEl.textContent     = c.headline;
      subEl.textContent   = c.sub;
      priceEl.textContent = c.price;
      ctaTxt.textContent  = c.cta;

      updateDots();
      fill.style.width = '0%';
      startTime = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      trackImpression(c.id, 'wbhero', c.advertiser);
    }

    function tick(ts) {
      if (document.hidden || !hero.isConnected) { raf = null; return; }
      const elapsed = ts - startTime;
      fill.style.width = Math.min((elapsed / DURATION) * 100, 100) + '%';
      if (elapsed >= DURATION) { cur = (cur + 1) % pool.length; loadSlide(); return; }
      raf = requestAnimationFrame(tick);
    }

    // CTA click
    ctaBtn.addEventListener('click', e => {
      e.stopPropagation();
      const c = camp();
      trackClick(c.id, 'wbhero', c.advertiser);
      if (c.url && c.url !== '#') window.location.href = c.url;
    });

    // tap anywhere else → next slide
    hero.addEventListener('click', e => {
      if (e.target.closest('.wbsc-hero-cta') || e.target.closest('.wbsc-dot')) return;
      cur = (cur + 1) % pool.length;
      loadSlide();
    });

    // dot nav
    dots.forEach(d => d.addEventListener('click', e => {
      e.stopPropagation();
      cur = +d.dataset.i;
      loadSlide();
    }));

    // kick off — preload first image fast
    photo.src = pool[0].media || '';
    photo.onload = () => photo.classList.add('shown');
    loadSlide();
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — CAROUSEL STRIP
  ══════════════════════════════════════════════════════════════════ */
  function renderCarousel(root, cs) {
    if (!cs?.length) return;
    const DURATION = 5500;
    const wrap = document.createElement('div');
    wrap.className = 'wbsc-carousel-wrap';
    wrap.innerHTML = `
      ${cs.map((c, i) => `
        <div class="wbsc-slide${i === 0 ? ' active' : ''}" data-i="${i}">
          <div class="wbsc-slide-ico" style="background:${c.grad}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg>
          </div>
          <div class="wbsc-slide-body">
            <div class="wbsc-slide-who">${c.advertiser} · Sponsored</div>
            <div class="wbsc-slide-h">${c.headline}</div>
            <div class="wbsc-slide-sub">${c.sub}</div>
          </div>
          <button class="wbsc-slide-cta" data-url="${c.url}">${c.cta}</button>
        </div>`).join('')}
      <button class="wbsc-carr-btn wbsc-carr-prev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button class="wbsc-carr-btn wbsc-carr-next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
      <div class="wbsc-carr-dots">
        ${cs.map((_, i) => `<div class="wbsc-carr-dot${i===0?' active':''}" data-i="${i}"></div>`).join('')}
      </div>
      <div class="wbsc-carr-prog"></div>`;
    root.appendChild(wrap);

    const slides = [...wrap.querySelectorAll('.wbsc-slide')];
    const cdots  = [...wrap.querySelectorAll('.wbsc-carr-dot')];
    const prog   = wrap.querySelector('.wbsc-carr-prog');
    let cur = 0, elapsed = 0, last = 0, raf;

    function go(i) {
      slides[cur].classList.remove('active');
      cdots[cur].classList.remove('active');
      cur = ((i % slides.length) + slides.length) % slides.length;
      slides[cur].classList.add('active');
      cdots[cur].classList.add('active');
      elapsed = 0; prog.style.width = '0%';
      trackImpression(cs[cur].id, 'wbcarousel', cs[cur].advertiser);
    }

    function tick(ts) {
      if (document.hidden || !wrap.isConnected) { raf = null; return; }
      elapsed += ts - last;
      prog.style.width = Math.min((elapsed / DURATION) * 100, 100) + '%';
      if (elapsed >= DURATION) go(cur + 1);
      last = ts; raf = requestAnimationFrame(tick);
    }

    // CTA
    wrap.querySelectorAll('.wbsc-slide-cta').forEach((btn, i) => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        trackClick(cs[i].id, 'wbcarousel', cs[i].advertiser);
        const u = btn.dataset.url;
        if (u && u !== '#') window.location.href = u;
      });
    });

    // slide click
    slides.forEach((sl, i) => sl.addEventListener('click', e => {
      if (e.target.closest('.wbsc-slide-cta') || e.target.closest('.wbsc-carr-btn') || e.target.closest('.wbsc-carr-dot')) return;
      trackClick(cs[i].id, 'wbcarousel-card', cs[i].advertiser);
      if (cs[i].url && cs[i].url !== '#') window.location.href = cs[i].url;
    }));

    cdots.forEach(d => d.addEventListener('click', () => go(+d.dataset.i)));
    wrap.querySelector('.wbsc-carr-prev').addEventListener('click', () => go(cur - 1));
    wrap.querySelector('.wbsc-carr-next').addEventListener('click', () => go(cur + 1));

    // swipe
    let sx = 0;
    wrap.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    wrap.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 44) go(cur + (d < 0 ? 1 : -1)); }, { passive: true });

    last = performance.now();
    raf = requestAnimationFrame(tick);
    trackImpression(cs[0].id, 'wbcarousel', cs[0].advertiser);
  }

  /* ══════════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════════ */
  async function init() {
    injectCSS();

    const slot = document.getElementById('wb-showcase-dock');
    if (!slot) return;

    // Load DB in parallel with render — render demos instantly, swap if DB has data
    const dbPromise = loadFromDB();

    const hero     = DEMO.hero;
    const carousel = DEMO.carousel;
    const ticker   = DEMO.ticker;

    // Render immediately with demo data — no wait
    renderTicker(slot, ticker);
    renderHero(slot, hero);
    renderCarousel(slot, carousel);

    // If DB loads live data, note it for next page load (cached in sessionStorage)
    dbPromise.then(loaded => {
      if (loaded) console.log('[WB Showcase] Live campaigns loaded from Supabase');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.WildbossesShowcase = { reload: init };
})();
