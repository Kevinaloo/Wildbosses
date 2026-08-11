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
    /* The poster sits underneath as a still. The film fades over it once
       it can actually play, so a slow connection shows a photograph
       rather than a black rectangle.

       Every row in the live table has poster_url NULL, which made this
       emit `background-image:url()` — not merely empty but invalid, and
       some engines resolve the bare url() against the document, firing a
       second request for the page itself. So the promise above was never
       being kept: the homepage opened on four black rectangles until the
       MP4s decoded. `v.poster` is filled in by mount() from the linked
       tour's own image, so the fallback is the operator's photograph and
       not a stand-in. */
    var poster = v.poster_url || v.poster || '';
    var still  = poster
      ? '<div class="rail-still" style="background-image:url(&quot;' + esc(poster) + '&quot;)"></div>'
      : '<div class="rail-still rail-still-bare"></div>';
    var media = still + (hasFilm
      ? '<video class="rail-film" playsinline muted loop autoplay preload="auto"' +
        (poster ? ' poster="' + esc(poster) + '"' : '') +
        ' src="' + esc(v.video_url) + '"></video>'
      : '');

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
    /* the four units are wrapped so they can be a fixed 4-column grid; as a
       bare wrapping flex row the seconds dropped to their own line and the
       body grew up through the title */
    return '<span class="rail-count-lab">Departs in</span>' +
      '<span class="rail-count-units">' +
        '<span class="rail-unit"><b class="wb-num">' + c.d + '</b><i>days</i></span>' +
        '<span class="rail-unit"><b class="wb-num">' + pad(c.h) + '</b><i>hrs</i></span>' +
        '<span class="rail-unit"><b class="wb-num">' + pad(c.m) + '</b><i>min</i></span>' +
        '<span class="rail-unit"><b class="wb-num">' + pad(c.s) + '</b><i>sec</i></span>' +
      '</span>';
  }

  function mount(root, rows) {
    if (!rows || !rows.length) { root.remove(); return; }

    var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // duplicated once so the loop can wrap without a visible seam
    var html = rows.map(cardHTML).join('');
    root.innerHTML =
      '<div class="rail-viewport">' +
        '<div class="rail-tilt" style="--tilt:' + TILT + 'deg">' +
          '<div class="rail-track">' +
            '<div class="rail-run">' + html + '</div>' +
            '<div class="rail-run" aria-hidden="true">' + html + '</div>' +
          '</div>' +
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

    /* ── phones scroll natively ─────────────────────────────────
       Below 640px the stylesheet drops the tilt and turns .rail-viewport
       into a scroll-snap row. Running the drift loop as well would mean a
       rAF writing transforms every frame that CSS then discards, and drag
       handlers competing with the browser's own momentum scrolling. Keep
       only the part that still earns its place: staging, so the card in
       front of the reader is the one whose film plays. */
    var phone = W.matchMedia && W.matchMedia('(max-width: 640px)').matches;
    if (phone) {
      var vp = root.querySelector('.rail-viewport');
      stage();
      var raf = null;
      vp.addEventListener('scroll', function () {
        if (raf) return;
        raf = requestAnimationFrame(function () { raf = null; stage(); });
      }, { passive: true });
      W.addEventListener('resize', function () { if (!W.matchMedia('(max-width: 640px)').matches) location.reload(); });
      D.addEventListener('visibilitychange', function () {
        if (D.hidden || !live) return;
        arm(live.querySelector('video'));
      });
      return;
    }

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
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      stage();
      requestAnimationFrame(frame);
    }

    /* ── playback ───────────────────────────────────────────
       Keep asking. A muted, playsinline video is allowed to autoplay
       everywhere that matters, but the first play() often lands before
       any data has arrived and rejects. Retrying on the events that mean
       "there is something to show now" is what makes it reliable.     */
    function arm(v) {
      if (!v) return;

      /* Never gate play() on readyState. With preload="metadata" the browser
         stops at readyState 1 and fetches nothing further, while loadeddata
         and canplay only fire at readyState 2 — so waiting for them is a
         deadlock the video can never leave. Calling play() is itself what
         starts the download. */
      function attempt() {
        var pr = v.play();
        if (pr && pr.catch) pr.catch(function () {});
      }

      if (!v.dataset.wired) {
        v.dataset.wired = '1';
        v.muted = true;          // property, not merely the attribute
        v.playsInline = true;
        v.loop = true;
        ['loadedmetadata', 'loadeddata', 'canplay', 'playing'].forEach(function (ev) {
          v.addEventListener(ev, function () {
            v.parentNode.parentNode.classList.remove('film-stuck');
            if (ev !== 'playing') attempt();
          });
        });
        v.addEventListener('error', function () { fail(v, v.error); });
      }

      v.preload = 'auto';
      if (v.readyState === 0) { try { v.load(); } catch (e) {} }
      attempt();

      /* Watchdog. If it still is not running, say so on the card instead of
         leaving a black rectangle nobody can explain. */
      clearTimeout(v._watch);
      v._watch = setTimeout(function () {
        if (!v.paused && v.readyState >= 2) return;
        attempt();
        setTimeout(function () {
          if (v.paused || v.readyState < 2) fail(v, v.error);
        }, 2200);
      }, 1800);
    }

    function fail(v, err) {
      var card = v.closest ? v.closest('.rail-card') : null;
      if (!card) return;
      card.classList.add('film-stuck');
      /* code 4 is MEDIA_ERR_SRC_NOT_SUPPORTED: the container is fine but this
         browser cannot decode the codec inside it — typically HEVC/H.265,
         which phones decode in hardware and desktop browsers do not. */
      var why = err && err.code === 4
        ? 'This browser cannot play that video file'
        : 'Tap to play';
      var b = card.querySelector('.rail-play');
      if (!b) {
        b = D.createElement('button');
        b.className = 'rail-play';
        b.type = 'button';
        card.appendChild(b);
        b.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          v.muted = true;
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        });
      }
      b.textContent = why;
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
      if (!live) return;
      live.classList.add('is-live');

      var v = live.querySelector('video');
      if (v) arm(v);

      /* pull the next film's metadata in early so the hand-off is seamless */
      var i = cards.indexOf(live), nx = cards[i + 1];
      var nv = nx && nx.querySelector('video');
      if (nv && !nv.dataset.armed) { nv.dataset.armed = '1'; nv.load(); }
    }

    requestAnimationFrame(function (t) { last = t; frame(t); });

    D.addEventListener('visibilitychange', function () {
      if (D.hidden || !live) return;
      arm(live.querySelector('video'));
    });

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

  /* ── the soonest departure, beside the headline ──────────────────
     The headline claims every trip already has a date. This stands the
     proof next to the claim, and fills a column that was otherwise ~800px
     of empty green on a laptop. Renders nothing if there is no upcoming
     trip, so an empty catalogue degrades to the single-column layout. */
  function nextDeparture(tours) {
    var host = D.getElementById('wb-next');
    if (!host || !tours || !tours.length) return;

    var now = Date.now();
    var soon = tours
      .filter(function (t) { return t.departure_date && new Date(t.departure_date).getTime() > now; })
      .sort(function (a, b) { return new Date(a.departure_date) - new Date(b.departure_date); })[0];
    if (!soon) return;

    var price = soon.price_kes === 0
      ? 'Pay what you want'
      : (soon.price_kes ? 'KES ' + Number(soon.price_kes).toLocaleString('en-KE') : 'On request');

    host.innerHTML =
      (soon.image ? '<div class="wb-next-media"><img src="' + esc(soon.image) +
        '" alt="" loading="lazy" decoding="async"/></div>' : '') +
      '<div class="wb-next-in">' +
        '<p class="wb-next-lab">Next departure</p>' +
        '<h2 class="wb-next-name">' + esc(soon.name) + '</h2>' +
        (soon.subtitle ? '<p class="wb-next-sub">' + esc(soon.subtitle) + '</p>' : '') +
        '<div class="wb-next-count" data-next-count></div>' +
        '<div class="wb-next-foot">' +
          '<span class="wb-next-price">' + esc(price) +
            (soon.price_kes ? '<small>per person</small>' : '') + '</span>' +
          '<a class="wb-btn wb-btn-gold" href="/tour.html?t=' +
            encodeURIComponent(soon.slug) + '">View this trip</a>' +
        '</div>' +
      '</div>';
    host.classList.add('is-on');

    var slot = host.querySelector('[data-next-count]');
    function tickNext() {
      var c = W.WB && W.WB.countdown ? W.WB.countdown(soon.departure_date) : null;
      if (!c || c.past) { slot.innerHTML = ''; return; }
      slot.innerHTML =
        '<div><b>' + c.d + '</b><i>days</i></div>' +
        '<div><b>' + pad(c.h) + '</b><i>hrs</i></div>' +
        '<div><b>' + pad(c.m) + '</b><i>min</i></div>' +
        '<div><b>' + pad(c.s) + '</b><i>sec</i></div>';
    }
    tickNext();
    setInterval(tickNext, 1000);
  }

  function init() {
    var root = D.getElementById('wb-rail');
    if (!W.WB) return;

    /* Join each rail row to its tour so a row with no poster_url can borrow
       the trip's own photograph. Both reads fail soft to [], and the join is
       optional — if the tours call fails the rail still mounts, just without
       the fallback stills. */
    Promise.all([W.WB.heroRail(), W.WB.tours({})]).then(function (res) {
      var rows  = res[0] || [];
      var tours = res[1] || [];
      var bySlug = {};
      tours.forEach(function (t) { if (t && t.slug) bySlug[t.slug] = t; });
      rows.forEach(function (r) {
        var t = r && r.tour_slug ? bySlug[r.tour_slug] : null;
        if (t && t.image) r.poster = t.image;
        /* the rail table can drift out of step with the catalogue; the
           catalogue is the source of truth for money and places left */
        if (t) {
          if (r.price_kes == null)  r.price_kes  = t.price_kes;
          if (r.spots_left == null) r.spots_left = t.spots_left;
          if (!r.departs_at && t.departure_date) r.departs_at = t.departure_date;
        }
      });
      nextDeparture(tours);
      if (root) mount(root, rows);
    }).catch(function () {
      if (root) W.WB.heroRail().then(function (rows) { mount(root, rows); });
    });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();

})(window, document);
