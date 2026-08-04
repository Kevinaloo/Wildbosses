/* ═══════════════════════════════════════════════════════════════
   WILDBOSSES · SHELL  v1
   Injects on every page:
     1. WhatsApp FAB (bottom-left, non-intrusive)
     2. Route veil (page transition curtain)
     3. Promo / Ad window (configurable, frequency-capped)
     4. Scroll-reveal observer
     5. Toast utility
   ═══════════════════════════════════════════════════════════════ */
(function (W) {
  'use strict';
  if (W.__wbShell) return;
  W.__wbShell = true;

  var D = document;
  var LS = W.localStorage;

  /* ── helpers ── */
  function el(tag, cls, html) {
    var e = D.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }
  function lsGet(k) { try { return LS.getItem(k); } catch(e) { return null; } }
  function lsSet(k,v) { try { LS.setItem(k,v); } catch(e) {} }

  /* ══════════════════════════════════════════════════
     1. ROUTE VEIL
  ══════════════════════════════════════════════════ */
  var veil = el('div');
  veil.id = 'wb-veil';
  veil.innerHTML = '<div class="vp vp-t"></div><div class="vp vp-b"></div><div class="vl"></div>';
  D.body.appendChild(veil);

  D.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || href.startsWith('tel') ||
        href.startsWith('javascript') || a.target === '_blank') return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var dest = a.href;
      veil.classList.add('close');
      setTimeout(function () { W.location.href = dest; }, 340);
    });
  });

  /* ══════════════════════════════════════════════════
     2. WHATSAPP FAB — bottom-left
  ══════════════════════════════════════════════════ */
  var WA_NUM = '254796818671';
  var WA_MSG = encodeURIComponent("Hi Wildbosses! I'd like to enquire about a tour.");
  var fab = el('a');
  fab.id = 'wb-wa-fab';
  fab.href = 'https://wa.me/' + WA_NUM + '?text=' + WA_MSG;
  fab.target = '_blank';
  fab.rel = 'noopener';
  fab.setAttribute('aria-label', 'Chat with Wildbosses on WhatsApp');
  fab.innerHTML =
    '<div class="wa-bubble">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
    '</div>' +
    '<span class="wa-label">Chat with us</span>';
  D.body.appendChild(fab);

  /* ══════════════════════════════════════════════════
     3. TOAST
  ══════════════════════════════════════════════════ */
  var toast = el('div');
  toast.id = 'wb-toast';
  D.body.appendChild(toast);

  W.wbToast = function (msg, dur) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, dur || 3200);
  };

  /* ══════════════════════════════════════════════════
     4. SCROLL REVEAL
  ══════════════════════════════════════════════════ */
  if ('IntersectionObserver' in W) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    function observeReveals() { D.querySelectorAll('.reveal:not(.in)').forEach(function(el){ ro.observe(el); }); }
    observeReveals();
    // re-run after dynamic content
    setTimeout(observeReveals, 600);
  } else {
    D.querySelectorAll('.reveal').forEach(function (e) { e.classList.add('in'); });
  }

  /* ══════════════════════════════════════════════════
     5. PROMO / AD WINDOW
     Config lives here — update campaign key + content
  ══════════════════════════════════════════════════ */
  var PROMO = {
    campaign:   'mara-aug-2026',  /* change to force re-show */
    frequency:  'daily',          /* 'once' | 'daily' | 'always' */
    delay:      4000,             /* ms after page load */
    /* Content */
    badge:      '🔥 2 spots left',
    image:      'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
    eyebrow:    'Next departure · Aug 14–21, 2026',
    title:      'Masai Mara <em>Migration</em> Safari',
    sub:        '7 days across the Mara Triangle during the Great Migration. Private 4×4, expert guide, luxury tented camp.',
    details: [
      { icon: '📅', text: '14 – 21 August 2026' },
      { icon: '👥', text: 'Max 8 guests' },
      { icon: '💰', text: 'KES 95,000 / person' },
    ],
    spots:      2,
    totalSpots: 8,
    deadline:   '2026-08-13T23:59:00+03:00',
    ctaLabel:   'Secure your spot',
    ctaHref:    'tours.html#migration',
    ghostLabel: 'View itinerary',
    note:       '30% deposit secures your place · Balance due 14 days before departure',
  };

  function promoSeen() {
    var raw = lsGet('wb-promo');
    if (!raw) return false;
    try {
      var s = JSON.parse(raw);
      if (s.campaign !== PROMO.campaign) return false;
      if (PROMO.frequency === 'always') return false;
      if (PROMO.frequency === 'once') return true;
      if (PROMO.frequency === 'daily') return (Date.now() - (s.ts||0)) < 864e5;
      return false;
    } catch(e) { return false; }
  }
  function markPromoSeen() {
    lsSet('wb-promo', JSON.stringify({ campaign: PROMO.campaign, ts: Date.now() }));
  }

  function buildPromo() {
    var overlay = el('div');
    overlay.id = 'wb-promo-overlay';

    var pct = Math.round((PROMO.totalSpots - PROMO.spots) / PROMO.totalSpots * 100);

    var detHtml = PROMO.details.map(function(d){
      return '<div class="promo-det"><span>' + d.icon + '</span> ' + d.text + '</div>';
    }).join('');

    overlay.innerHTML =
      '<div id="wb-promo-card">' +
        '<div class="promo-img">' +
          '<img src="' + PROMO.image + '" alt="' + PROMO.title.replace(/<[^>]+>/g,'') + '" loading="eager"/>' +
          '<div class="promo-img-grad"></div>' +
          '<div class="promo-img-badge">' + PROMO.badge + '</div>' +
          '<button class="promo-close" id="wb-promo-close" aria-label="Close">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="promo-body">' +
          '<div class="promo-eyebrow"><span class="promo-pulse"></span>' + PROMO.eyebrow + '</div>' +
          '<div class="promo-title">' + PROMO.title + '</div>' +
          '<div class="promo-sub">' + PROMO.sub + '</div>' +
          '<div class="promo-details">' + detHtml + '</div>' +
          '<div class="promo-spots">' +
            '<div class="promo-bar"><div class="promo-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="promo-spots-txt"><strong>' + PROMO.spots + '</strong> of ' + PROMO.totalSpots + ' spots left</div>' +
          '</div>' +
          '<div class="promo-timer">' +
            '<div class="pt-unit"><div class="pt-num" id="pt-d">--</div><div class="pt-lbl">Days</div></div>' +
            '<div class="pt-unit"><div class="pt-num" id="pt-h">--</div><div class="pt-lbl">Hrs</div></div>' +
            '<div class="pt-unit"><div class="pt-num" id="pt-m">--</div><div class="pt-lbl">Min</div></div>' +
            '<div class="pt-unit"><div class="pt-num" id="pt-s">--</div><div class="pt-lbl">Sec</div></div>' +
          '</div>' +
          '<div class="promo-btns">' +
            '<button class="promo-btn-primary wb-sheen" id="wb-promo-cta">' + PROMO.ctaLabel + '</button>' +
            '<button class="promo-btn-ghost" id="wb-promo-ghost">' + PROMO.ghostLabel + '</button>' +
          '</div>' +
          '<div class="promo-note">' + PROMO.note + '</div>' +
        '</div>' +
      '</div>';

    D.body.appendChild(overlay);

    /* countdown inside promo */
    var deadline = new Date(PROMO.deadline);
    function tickPromo() {
      var diff = deadline - new Date();
      if (diff < 0) diff = 0;
      var pad = function(n){ return String(Math.floor(n)).padStart(2,'0'); };
      var pd = D.getElementById('pt-d'); if(pd) pd.textContent = pad(diff/864e5);
      var ph = D.getElementById('pt-h'); if(ph) ph.textContent = pad((diff%864e5)/36e5);
      var pm = D.getElementById('pt-m'); if(pm) pm.textContent = pad((diff%36e5)/6e4);
      var ps = D.getElementById('pt-s'); if(ps) ps.textContent = pad((diff%6e4)/1e3);
    }
    tickPromo();
    var promoTick = setInterval(tickPromo, 1000);

    /* close */
    function closePromo() {
      overlay.classList.remove('open');
      markPromoSeen();
      clearInterval(promoTick);
    }
    overlay.addEventListener('click', function(e){ if(e.target===overlay) closePromo(); });
    D.getElementById('wb-promo-close').addEventListener('click', closePromo);
    D.getElementById('wb-promo-ghost').addEventListener('click', closePromo);
    D.addEventListener('keydown', function(e){ if(e.key==='Escape') closePromo(); });

    /* CTA */
    D.getElementById('wb-promo-cta').addEventListener('click', function() {
      closePromo();
      setTimeout(function(){ W.location.href = PROMO.ctaHref; }, 200);
    });

    /* open */
    setTimeout(function() {
      overlay.classList.add('open');
    }, 60);
  }

  /* Show promo after delay if not seen */
  if (!promoSeen()) {
    setTimeout(function() {
      if (D.readyState === 'loading') {
        D.addEventListener('DOMContentLoaded', buildPromo);
      } else {
        buildPromo();
      }
    }, PROMO.delay);
  }

}(window));
