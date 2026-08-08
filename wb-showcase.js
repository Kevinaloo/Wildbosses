/* ═══════════════════════════════════════════════════════════════════════
   WILDBOSSES SHOWCASE ENGINE v3
   ─────────────────────────────────────────────────────────────────────
   THREE visible zones — all seen WITHOUT scrolling:

   [1] TICKER BAR   — fixed to very top of page (32px), always visible
                      Nav shifts down by 32px to sit below it
   [2] CINEMATIC HERO + CAROUSEL  — injected RIGHT AFTER .stats-bar
                      which sits just below the main hero section

   On mobile the hero is tall (fills screen), so stats-bar appears
   ~400-500px from top — still one quick scroll. The ticker is always
   visible instantly.
═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  const PAGE = 'wildbosses-index';

  function ga(ev, p) { window.gtag?.('event', ev, p); }
  function dbTrack(fn, id) {
    fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY },
      body: JSON.stringify({ p_campaign_id: id })
    }).catch(() => {});
  }
  function imp(id, fmt, adv) { ga('wb_ad_impression', { campaign_id: id, ad_format: fmt, advertiser: adv, page: PAGE }); dbTrack('increment_ad_impression', id); }
  function clk(id, fmt, adv) { ga('wb_ad_click',       { campaign_id: id, ad_format: fmt, advertiser: adv, page: PAGE }); dbTrack('increment_ad_click',      id); }

  /* ── DEMO DATA ── */
  const DEMOS = {
    hero: [
      { id:'wb_h1', advertiser:'Wildbosses', tag:'Featured · 2 spots left',
        headline:'The Great Migration\nis calling.',
        sub:'Masai Mara · 14–21 Aug 2026 · 7 days · Private 4×4',
        cta:'Secure your spot', url:'tours.html?id=migration',
        media:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1800&q=85',
        price:'From KES 95,000' },
      { id:'wb_h2', advertiser:'Wildbosses', tag:'Adventure',
        headline:'Kilimanjaro.\nConquer the roof.',
        sub:'Tanzania · Marangu Route · 6 days · All levels',
        cta:'View expedition', url:'tours.html?id=kilimanjaro',
        media:'https://images.unsplash.com/photo-1519923834699-ef0b7cde4712?w=1800&q=85',
        price:'From KES 185,000' },
      { id:'wb_h3', advertiser:'Wildbosses', tag:'Must See',
        headline:'Amboseli.\nElephants & Kilimanjaro.',
        sub:'Kenya · 2 days · Luxury tented camp',
        cta:'Book this trip', url:'tours.html?id=amboseli',
        media:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1800&q=85',
        price:'From KES 28,000' },
      { id:'wb_h4', advertiser:'Wildbosses', tag:'Coastal Escape',
        headline:'Zanzibar.\nWhere spice meets sea.',
        sub:'Tanzania · Stone Town · Spice Farm · Full day',
        cta:'Explore Zanzibar', url:'tours.html?id=zanzibar',
        media:'https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=1800&q=85',
        price:'From KES 9,500' },
    ],
    carousel: [
      { id:'wb_c1', advertiser:'Wildbosses', tag:'Free Tour',
        headline:'Nairobi City Walking Tour — Free',
        sub:'Kibera · Karura Forest · CBD · 4.96★ from 1,240+ guests',
        cta:'Join for free', url:'tours.html?id=nairobi-walk',
        grad:'linear-gradient(135deg,#0A3B1E,#1C7A3E)',
        icon:'<circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8z"/>' },
      { id:'wb_c2', advertiser:'Cabana Stays', tag:'Partner',
        headline:'Need a place to sleep near your safari?',
        sub:'Cabana-verified apartments across Kenya — zero commission',
        cta:'Find stays', url:'https://www.apatmento.space/',
        grad:'linear-gradient(135deg,#7B2FF7,#4361FF)',
        icon:'<path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9 20v-5a3 3 0 0 1 6 0v5"/>' },
      { id:'wb_c3', advertiser:'Wildbosses', tag:'Our People',
        headline:'Meet the guides who make it unforgettable',
        sub:'12 years guiding East Africa · Naturalist certified',
        cta:'Meet our guides', url:'guides.html',
        grad:'linear-gradient(135deg,#1C4A0A,#2E7A1E)',
        icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' },
      { id:'wb_c4', advertiser:'Wildbosses', tag:'Zero Fees',
        headline:'Price shown is price paid — always',
        sub:'KTB-registered · 4.97★ · WhatsApp reply in 15 min',
        cta:'Browse tours', url:'tours.html',
        grad:'linear-gradient(135deg,#0A2B3E,#135C7A)',
        icon:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
    ],
    ticker:'🦁 2 spots left — Masai Mara Migration Safari Aug 2026 · 🏔 Kilimanjaro from KES 185,000 · 🐘 Amboseli Elephants & Kili Views · 4.97★ from 1,240+ happy travellers · 🌊 Diani Beach escapes · Zero hidden fees · 🏝 Zanzibar Stone Town & Spice Farm · WhatsApp — reply in 15 min · 🔴 Aug dates filling fast',
  };

  /* ════════════════════════════════════════════════════════
     CSS
  ════════════════════════════════════════════════════════ */
  const CSS = `
/* ── TICKER: fixed very top, always visible ── */
#wbsc-ticker {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 32px;
  z-index: 10000;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #030F06;
  border-bottom: 1px solid rgba(255,255,255,.07);
  box-shadow: 0 2px 16px rgba(0,0,0,.35);
}
#wbsc-ticker .tk-badge {
  flex-shrink: 0;
  height: 100%;
  padding: 0 14px;
  background: linear-gradient(135deg,#DCA318,#D44010);
  display: flex; align-items: center; gap: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase;
  color: #fff; white-space: nowrap;
}
#wbsc-ticker .tk-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fff; flex-shrink: 0;
  animation: tkDot 1.4s ease-in-out infinite;
}
@keyframes tkDot { 0%,100%{opacity:1} 50%{opacity:.2} }
#wbsc-ticker .tk-track {
  flex: 1; overflow: hidden;
  -webkit-mask: linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent);
  mask: linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent);
}
#wbsc-ticker .tk-inner {
  display: flex; white-space: nowrap;
  animation: tkRun 30s linear infinite;
}
#wbsc-ticker .tk-inner:hover { animation-play-state: paused; }
@keyframes tkRun { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
#wbsc-ticker .tk-item {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0 18px;
  font-family: 'Inter', sans-serif;
  font-size: 11.5px; font-weight: 500;
  color: rgba(255,255,255,.55);
  white-space: nowrap;
}
#wbsc-ticker .tk-sep { color: rgba(255,255,255,.16); font-size: 7px; }

/* push nav below the fixed ticker */
body { padding-top: 32px !important; }
.nav  { top: 32px !important; }

/* showcase block sits in normal flow between nav and main hero */
#wbsc-block {
  width: 100%;
  background: #030F06;
  margin-top: 64px; /* clear the fixed nav (64px tall) */
}

/* cinematic hero */
.wbsc-hero {
  position: relative;
  width: 100%;
  aspect-ratio: 21/9;
  overflow: hidden;
  cursor: pointer;
  background: #040E07;
}
@media(max-width:860px){ .wbsc-hero{ aspect-ratio:16/9 } }
@media(max-width:540px){ .wbsc-hero{ aspect-ratio:4/3 } }

.wbsc-photo {
  position: absolute; inset:0;
  width:100%; height:100%; object-fit:cover;
  z-index:0; opacity:0;
  transition: opacity .7s ease;
  transform-origin: center;
  animation: wbKB 10s ease-out infinite alternate;
}
.wbsc-photo.on { opacity:1; }
@keyframes wbKB {
  0%   { transform:scale(1.07) translate(0,0); }
  100% { transform:scale(1.0)  translate(-1%,-.5%); }
}
.wbsc-grad {
  position:absolute; inset:0; z-index:1; pointer-events:none;
  background:
    linear-gradient(to bottom, rgba(3,15,6,.30) 0%, rgba(3,15,6,0) 25%, rgba(3,15,6,0) 48%, rgba(3,15,6,.92) 100%),
    linear-gradient(to right,  rgba(3,15,6,.70) 0%, rgba(3,15,6,.20) 55%, transparent 100%);
}
.wbsc-tag {
  position:absolute; top:16px; left:20px; z-index:4;
  font-family:'Inter',sans-serif; font-size:9px; font-weight:700;
  letter-spacing:.12em; text-transform:uppercase;
  color:rgba(255,255,255,.90);
  background:rgba(3,15,6,.50);
  backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.16);
  padding:5px 12px; border-radius:100px; white-space:nowrap;
}
.wbsc-dots {
  position:absolute; top:16px; right:18px; z-index:4;
  display:flex; gap:5px; align-items:center;
}
.wbsc-dot {
  height:5px; border-radius:3px;
  transition:all .45s cubic-bezier(.22,1,.36,1); cursor:pointer;
}
.wbsc-dot.on { background:#DCA318 !important; }
.wbsc-content {
  position:absolute; inset:0; z-index:3;
  display:flex; flex-direction:column; justify-content:flex-end;
  padding:clamp(16px,3vw,50px); pointer-events:none;
}
.wbsc-adv {
  font-family:'Inter',sans-serif; font-size:9.5px; font-weight:700;
  color:rgba(255,255,255,.48); margin-bottom:7px;
  letter-spacing:.10em; text-transform:uppercase;
  display:flex; align-items:center; gap:6px;
}
.wbsc-adv::before {
  content:''; width:5px; height:5px; border-radius:50%;
  background:#DCA318; flex-shrink:0;
}
.wbsc-h {
  font-family:'Geist','Inter',sans-serif; font-weight:700;
  font-size:clamp(22px,4vw,56px); color:#fff;
  line-height:1.0; letter-spacing:-.038em;
  margin-bottom:9px; white-space:pre-line;
  text-shadow:0 4px 32px rgba(0,0,0,.55);
  max-width:56%;
}
@media(max-width:600px){ .wbsc-h{ max-width:90%; } }
.wbsc-sub {
  font-family:'Inter',sans-serif;
  font-size:clamp(11px,1.3vw,13.5px);
  color:rgba(255,255,255,.65); margin-bottom:18px;
  max-width:50%; line-height:1.55;
}
@media(max-width:600px){ .wbsc-sub{ max-width:92%; } }
.wbsc-row { display:flex; align-items:center; gap:11px; flex-wrap:wrap; pointer-events:all; }
.wbsc-price {
  font-family:'Geist','Inter',sans-serif; font-size:clamp(12px,1.5vw,15px);
  font-weight:700; color:#F5C430; letter-spacing:-.02em;
}
.wbsc-cta {
  display:inline-flex; align-items:center; gap:8px;
  padding:11px 22px; border-radius:100px;
  background:linear-gradient(135deg,#DCA318,#D44010);
  color:#fff; font-family:'Geist','Inter',sans-serif;
  font-size:13px; font-weight:700; border:none; cursor:pointer;
  box-shadow:0 8px 26px rgba(200,138,0,.48);
  transition:all .3s; letter-spacing:-.018em; white-space:nowrap;
}
.wbsc-cta:hover { filter:brightness(1.1); transform:translateY(-2px); }
.wbsc-cta svg { width:13px; height:13px; flex-shrink:0; transition:transform .28s; }
.wbsc-cta:hover svg { transform:translateX(3px); }
.wbsc-bar {
  position:absolute; bottom:0; left:0; right:0;
  height:3px; background:rgba(255,255,255,.09); z-index:4;
}
.wbsc-fill {
  height:100%;
  background:linear-gradient(90deg,#DCA318,#2E9E54);
  width:0%; transition:width .09s linear;
}
.wbsc-spon {
  position:absolute; bottom:10px; right:14px; z-index:4;
  font-family:'Inter',sans-serif; font-size:8px; font-weight:600;
  letter-spacing:.10em; text-transform:uppercase;
  color:rgba(255,255,255,.18);
}

/* carousel strip */
.wbsc-carr {
  position:relative; background:rgba(4,14,7,.97);
  border-top:1px solid rgba(255,255,255,.06);
  overflow:hidden; height:88px;
}
@media(max-width:520px){ .wbsc-carr{ height:auto; min-height:82px; } }
.wbsc-slide {
  position:absolute; inset:0;
  display:flex; align-items:center;
  padding:0 clamp(14px,3vw,46px); gap:14px;
  opacity:0; transform:translateX(20px);
  transition:opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1);
  pointer-events:none; cursor:pointer;
}
.wbsc-slide.on { opacity:1; transform:none; pointer-events:all; }
.wbsc-ico {
  width:44px; height:44px; border-radius:12px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  color:#fff; border:1px solid rgba(255,255,255,.12);
}
.wbsc-ico svg { width:19px; height:19px; }
.wbsc-body { flex:1; min-width:0; }
.wbsc-who {
  font-family:'Inter',sans-serif; font-size:9px; font-weight:700;
  letter-spacing:.10em; text-transform:uppercase;
  color:rgba(255,255,255,.28); margin-bottom:2px;
}
.wbsc-sh {
  font-family:'Geist','Inter',sans-serif;
  font-size:clamp(12.5px,1.7vw,15px); font-weight:600;
  color:#fff; letter-spacing:-.02em;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.wbsc-ss {
  font-family:'Inter',sans-serif; font-size:10.5px;
  color:rgba(255,255,255,.34); margin-top:1px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.wbsc-scta {
  flex-shrink:0; padding:9px 17px; border-radius:100px;
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.13);
  color:rgba(255,255,255,.80);
  font-family:'Geist','Inter',sans-serif; font-size:11.5px; font-weight:700;
  cursor:pointer; transition:all .22s; white-space:nowrap;
}
.wbsc-scta:hover { background:rgba(255,255,255,.16); color:#fff; }
.wbsc-cprev,.wbsc-cnext {
  position:absolute; top:50%; transform:translateY(-50%);
  width:26px; height:26px; border-radius:50%; z-index:3;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.13);
  color:rgba(255,255,255,.60); cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:background .2s;
}
.wbsc-cprev:hover,.wbsc-cnext:hover { background:rgba(255,255,255,.20); color:#fff; }
.wbsc-cprev svg,.wbsc-cnext svg { width:11px; height:11px; }
.wbsc-cprev { left:7px; } .wbsc-cnext { right:7px; }
.wbsc-cdots {
  position:absolute; bottom:7px; left:50%; transform:translateX(-50%);
  display:flex; gap:4px; z-index:3;
}
.wbsc-cdot {
  width:4px; height:4px; border-radius:50%;
  background:rgba(255,255,255,.20); cursor:pointer;
  transition:all .35s;
}
.wbsc-cdot.on { width:15px; border-radius:2px; background:#DCA318; }
.wbsc-cprog {
  position:absolute; bottom:0; left:0; height:2px;
  background:rgba(200,138,0,.58); z-index:3;
  width:0%; transition:width .08s linear;
}
@media(prefers-reduced-motion:reduce){
  .wbsc-photo,.tk-inner{ animation:none !important; }
}
`;

  function injectCSS() {
    if (document.getElementById('wbsc-css')) return;
    const s = document.createElement('style');
    s.id = 'wbsc-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ════════ TICKER (fixed top) ════════ */
  function buildTicker(text) {
    const ticker = document.getElementById('wbsc-ticker') || document.createElement('div');
    ticker.id = 'wbsc-ticker';
    const items = text.split('·').map(s => s.trim()).filter(Boolean);
    const html = items.map(t =>
      `<span class="tk-item">${t}<span class="tk-sep">·</span></span>`
    ).join('');
    ticker.innerHTML = `
      <div class="tk-badge"><div class="tk-dot"></div>Live</div>
      <div class="tk-track"><div class="tk-inner">${html}${html}</div></div>`;
    if (!ticker.parentNode) document.body.insertAdjacentElement('afterbegin', ticker);
  }

  /* ════════ SHOWCASE BLOCK — renders into #wb-showcase-dock ════════ */
  function buildBlock(heroPool, carPool) {
    const dock = document.getElementById('wb-showcase-dock');
    if (!dock) return;
    // Use dock as the block container directly
    dock.id = 'wbsc-block';
    buildHero(dock, heroPool);
    buildCarousel(dock, carPool);
  }

  /* ════════ CINEMATIC HERO ════════ */
  function buildHero(root, pool) {
    let cur = 0, raf, t0;
    const DUR = 8000;
    const get = () => pool[cur % pool.length];

    const hero = document.createElement('div');
    hero.className = 'wbsc-hero';
    hero.innerHTML = `
      <img class="wbsc-photo" src="" alt="" loading="eager" fetchpriority="high"/>
      <div class="wbsc-grad"></div>
      <div class="wbsc-tag"></div>
      <div class="wbsc-dots">
        ${pool.map((_,i)=>`<div class="wbsc-dot${i===0?' on':''}" data-i="${i}" style="width:${i===0?'22px':'6px'};background:${i===0?'#DCA318':'rgba(255,255,255,.28)'}"></div>`).join('')}
      </div>
      <div class="wbsc-content">
        <div class="wbsc-adv"></div>
        <div class="wbsc-h"></div>
        <div class="wbsc-sub"></div>
        <div class="wbsc-row">
          <div class="wbsc-price"></div>
          <button class="wbsc-cta"><span class="wbsc-cta-t"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
          </button>
        </div>
      </div>
      <div class="wbsc-bar"><div class="wbsc-fill"></div></div>
      <div class="wbsc-spon">Sponsored</div>`;
    root.appendChild(hero);

    const photo=hero.querySelector('.wbsc-photo'),
          tag=hero.querySelector('.wbsc-tag'),
          adv=hero.querySelector('.wbsc-adv'),
          h=hero.querySelector('.wbsc-h'),
          sub=hero.querySelector('.wbsc-sub'),
          price=hero.querySelector('.wbsc-price'),
          ctaT=hero.querySelector('.wbsc-cta-t'),
          cta=hero.querySelector('.wbsc-cta'),
          fill=hero.querySelector('.wbsc-fill'),
          dots=[...hero.querySelectorAll('.wbsc-dot')];

    function show() {
      const c = get();
      photo.classList.remove('on');
      setTimeout(() => {
        photo.src = c.media;
        photo.onload = () => photo.classList.add('on');
        photo.onerror= () => photo.classList.add('on');
      }, 220);
      tag.textContent   = c.tag;
      adv.textContent   = c.advertiser + ' · Wildbosses';
      h.textContent     = c.headline;
      sub.textContent   = c.sub;
      price.textContent = c.price;
      ctaT.textContent  = c.cta;
      dots.forEach((d,i) => {
        const a = i === cur % pool.length;
        d.classList.toggle('on', a);
        d.style.width      = a ? '22px' : '6px';
        d.style.background = a ? '#DCA318' : 'rgba(255,255,255,.28)';
      });
      fill.style.width = '0%';
      t0 = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      imp(c.id, 'wbhero', c.advertiser);
    }
    function tick(ts) {
      if (document.hidden || !hero.isConnected) { raf=null; return; }
      const e = ts - t0;
      fill.style.width = Math.min((e/DUR)*100,100)+'%';
      if (e >= DUR) { cur=(cur+1)%pool.length; show(); return; }
      raf = requestAnimationFrame(tick);
    }
    cta.addEventListener('click', e => {
      e.stopPropagation();
      const c=get(); clk(c.id,'wbhero',c.advertiser);
      if(c.url && c.url!=='#') window.location.href=c.url;
    });
    hero.addEventListener('click', e => {
      if(e.target.closest('.wbsc-cta')||e.target.closest('.wbsc-dot')) return;
      cur=(cur+1)%pool.length; show();
    });
    dots.forEach(d => d.addEventListener('click', e => {
      e.stopPropagation(); cur=+d.dataset.i; show();
    }));
    // preload first
    photo.src = pool[0].media;
    photo.onload = () => photo.classList.add('on');
    show();
  }

  /* ════════ CAROUSEL STRIP ════════ */
  function buildCarousel(root, cs) {
    const DUR = 5500;
    const wrap = document.createElement('div');
    wrap.className = 'wbsc-carr';
    wrap.innerHTML = `
      ${cs.map((c,i)=>`
        <div class="wbsc-slide${i===0?' on':''}" data-i="${i}">
          <div class="wbsc-ico" style="background:${c.grad}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg>
          </div>
          <div class="wbsc-body">
            <div class="wbsc-who">${c.advertiser} · Sponsored</div>
            <div class="wbsc-sh">${c.headline}</div>
            <div class="wbsc-ss">${c.sub}</div>
          </div>
          <button class="wbsc-scta" data-url="${c.url}">${c.cta}</button>
        </div>`).join('')}
      <button class="wbsc-cprev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <button class="wbsc-cnext"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
      <div class="wbsc-cdots">${cs.map((_,i)=>`<div class="wbsc-cdot${i===0?' on':''}" data-i="${i}"></div>`).join('')}</div>
      <div class="wbsc-cprog"></div>`;
    root.appendChild(wrap);

    const slides=[...wrap.querySelectorAll('.wbsc-slide')],
          cdots=[...wrap.querySelectorAll('.wbsc-cdot')],
          prog=wrap.querySelector('.wbsc-cprog');
    let cur=0, elapsed=0, last=0, raf;

    function go(i) {
      slides[cur].classList.remove('on'); cdots[cur].classList.remove('on');
      cur=((i%slides.length)+slides.length)%slides.length;
      slides[cur].classList.add('on'); cdots[cur].classList.add('on');
      elapsed=0; prog.style.width='0%';
      imp(cs[cur].id,'wbcarousel',cs[cur].advertiser);
    }
    function tick(ts) {
      if(document.hidden||!wrap.isConnected){raf=null;return;}
      elapsed+=ts-last;
      prog.style.width=Math.min((elapsed/DUR)*100,100)+'%';
      if(elapsed>=DUR) go(cur+1);
      last=ts; raf=requestAnimationFrame(tick);
    }
    wrap.querySelectorAll('.wbsc-scta').forEach((btn,i)=>{
      btn.addEventListener('click',e=>{
        e.stopPropagation(); clk(cs[i].id,'wbcarousel',cs[i].advertiser);
        const u=btn.dataset.url; if(u&&u!=='#') window.location.href=u;
      });
    });
    slides.forEach((sl,i)=>sl.addEventListener('click',e=>{
      if(e.target.closest('.wbsc-scta')||e.target.closest('.wbsc-cprev')||e.target.closest('.wbsc-cnext')||e.target.closest('.wbsc-cdot')) return;
      clk(cs[i].id,'wbcarousel-card',cs[i].advertiser);
      if(cs[i].url&&cs[i].url!=='#') window.location.href=cs[i].url;
    }));
    cdots.forEach(d=>d.addEventListener('click',()=>go(+d.dataset.i)));
    wrap.querySelector('.wbsc-cprev').addEventListener('click',()=>go(cur-1));
    wrap.querySelector('.wbsc-cnext').addEventListener('click',()=>go(cur+1));
    let sx=0;
    wrap.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true});
    wrap.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>44)go(cur+(d<0?1:-1));},{passive:true});
    last=performance.now(); raf=requestAnimationFrame(tick);
    imp(cs[0].id,'wbcarousel',cs[0].advertiser);
  }

  /* ════════ INIT ════════ */
  async function init() {
    injectCSS();
    buildTicker(DEMOS.ticker);
    buildBlock(DEMOS.hero, DEMOS.carousel);
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
