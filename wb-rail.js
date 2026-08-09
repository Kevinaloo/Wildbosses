/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · DIAGONAL VIDEO RAIL
   ─────────────────────────────────────────────────────────────────
   Departure cards travelling along a diagonal, one taking the stage
   at a time. Each card carries its film, its destination and a real
   countdown to the day it leaves.

   Two things worth knowing:

   · Only the card at centre stage plays. The rest are paused. Four
     videos decoding at once will drop frames on a mid-range phone,
     and the three you aren't looking at buy you nothing.

   · A card with no film yet drifts its poster instead. The client
     uploads video from the admin; until then the rail still reads as
     intended rather than showing a black rectangle.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  var SPEED = 0.028;   // viewport widths per second — a slow, deliberate drift
  var TILT  = -8;      // degrees. enough to read as diagonal, not enough to fight the type

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function cardHTML(v) {
    var hasFilm = !!(v.video_url && v.video_url.trim());
    var media = hasFilm
      ? '<video class="rail-film" playsinline muted loop preload="none"' +
        (v.poster_url ? ' poster="' + esc(v.poster_url) + '"' : '') +
        '><source src="' + esc(v.video_url) + '" type="video/mp4"></video>'
      : '<div class="rail-still" style="background-image:url(' +
        esc(v.poster_url || '') + ')"></div>';

    var price = (v.price_kes === 0)
      ? 'Pay what you want'
      : (v.price_kes ? 'From KES ' + Number(v.price_kes).toLocaleString('en-KE') : '');

    var href = v.cta_href || (v.tour_slug ? '/tours?tour=' + encodeURIComponent(v.tour_slug) : '/tours');

    return '' +
      '<a class="rail-card" href="' + esc(href) + '" data-departs="' + esc(v.departs_at || '') + '">' +
        '<div class="rail-media">' + media + '</div>' +
        '<div class="rail-scrim"></div>' +
        '<div class="rail-body">' +
          '<h3 class="rail-title">' + esc(v.title) + '</h3>' +
          (v.subtitle ? '<p class="rail-sub">' + esc(v.subtitle) + '</p>' : '') +
          '<div class="rail-count" data-count>' +
            '<span class="rail-count-wait">Dates on request</span>' +
          '</div>' +
          '<div class="rail-foot">' +
            (price ? '<span class="rail-price">' + esc(price) + '</span>' : '') +
            (v.spots_left != null && v.spots_left > 0
              ? '<span class="rail-spots">' + v.spots_left + ' place' + (v.spots_left === 1 ? '' : 's') + ' left</span>'
              : '') +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function countMarkup(c) {
    if (!c) return '<span class="rail-count-wait">Dates on request</span>';
    if (c.past) return '<span class="rail-count-wait">Departed</span>';
    return '<span class="rail-count-lab">Departs in</span>' +
      '<span class="rail-unit"><b class="wb-num">' + c.d + '</b><i>days</i></span>' +
      '<span class="rail-unit"><b class="wb-num">' + pad(c.h) + '</b><i>hrs</i></span>' +
      '<span class="rail-unit"><b class="wb-num">' + pad(c.m) + '</b><i>min</i></span>' +
      '<span class="rail-unit"><b class="wb-num">' + pad(c.s) + '</b><i>sec</i></span>';
  }

  function mount(root, rows) {
    if (!rows || !rows.length) { root.remove(); return; }

    var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // duplicated once so the loop can wrap without a visible seam
    var html = rows.map(cardHTML).join('');
    root.innerHTML =
      '<div class="rail-viewport">' +
        '<div class="rail-track" style="--tilt:' + TILT + 'deg">' +
          '<div class="rail-run">' + html + '</div>' +
          '<div class="rail-run" aria-hidden="true">' + html + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="rail-hint"><span>Drag to explore</span></div>';

    var track = root.querySelector('.rail-track');
    var runs  = root.querySelectorAll('.rail-run');
    var cards = Array.prototype.slice.call(root.querySelectorAll('.rail-card'));

    /* ── countdowns ─────────────────────────────────────────
       One timer for the whole rail rather than one per card.   */
    function tickAll() {
      cards.forEach(function (card) {
        var iso = card.getAttribute('data-departs');
        var slot = card.querySelector('[data-count]');
        if (!slot) return;
        var c = (W.WB && W.WB.countdown) ? W.WB.countdown(iso) : null;
        slot.innerHTML = countMarkup(c);
      });
    }
    tickAll();
    setInterval(tickAll, 1000);

    if (reduce) { root.classList.add('rail-static'); return; }

    /* ── drift ──────────────────────────────────────────────── */
    var runW = 0, x = 0, last = performance.now(), dragging = false, dragX = 0, startX = 0;

    function measure() {
      runW = runs[0].getBoundingClientRect().width;
    }
    measure();
    W.addEventListener('resize', measure);

    function frame(now) {
      var dt = Math.min(now - last, 60); last = now;
      if (!dragging && runW) {
        x -= (W.innerWidth * SPEED) * (dt / 1000);
        if (x <= -runW) x += runW;
      }
      track.style.transform =
        'rotate(var(--tilt)) translate3d(' + x.toFixed(2) + 'px,0,0)';
      stage();
      requestAnimationFrame(frame);
    }

    /* ── centre stage: exactly one card live at a time ──────── */
    var live = null;
    function stage() {
      var mid = W.innerWidth / 2, best = null, bestD = Infinity;
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].getBoundingClientRect();
        if (r.right < -200 || r.left > W.innerWidth + 200) continue;
        var d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestD) { bestD = d; best = cards[i]; }
      }
      if (best === live) return;
      if (live) {
        live.classList.remove('is-live');
        var pv = live.querySelector('video');
        if (pv) { pv.pause(); }
      }
      live = best;
      if (live) {
        live.classList.add('is-live');
        var v = live.querySelector('video');
        if (v) {
          if (!v.dataset.armed) { v.dataset.armed = '1'; v.load(); }
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        }
      }
    }

    requestAnimationFrame(function (t) { last = t; frame(t); });

    /* ── drag to scrub ──────────────────────────────────────── */
    var moved = 0;
    function down(e) {
      dragging = true; moved = 0;
      startX = (e.touches ? e.touches[0].clientX : e.clientX);
      dragX = x;
      root.classList.add('is-dragging');
    }
    function move(e) {
      if (!dragging) return;
      var cx = (e.touches ? e.touches[0].clientX : e.clientX);
      moved = cx - startX;
      x = dragX + moved;
      if (runW) { while (x <= -runW) x += runW; while (x > 0) x -= runW; }
    }
    function up() {
      dragging = false;
      root.classList.remove('is-dragging');
    }
    root.addEventListener('mousedown', down);
    root.addEventListener('touchstart', down, { passive: true });
    W.addEventListener('mousemove', move);
    W.addEventListener('touchmove', move, { passive: true });
    W.addEventListener('mouseup', up);
    W.addEventListener('touchend', up);

    // a drag should not also count as a click through to the tour
    cards.forEach(function (c) {
      c.addEventListener('click', function (e) {
        if (Math.abs(moved) > 8) { e.preventDefault(); }
      });
    });
  }

  function init() {
    var root = D.getElementById('wb-rail');
    if (!root || !W.WB) return;
    W.WB.heroRail().then(function (rows) { mount(root, rows); });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();

})(window, document);
