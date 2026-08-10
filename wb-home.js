/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · HOMEPAGE
   Tour departure slideshow + photo gallery strip.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  /* ── slideshow ─────────────────────────────────────────────
     An endless one-card-at-a-time drift. The real card list is
     duplicated so there is always something entering from the right;
     once the track has travelled exactly one full set it snaps back
     with the transition off, which is invisible and means the loop
     never runs out — even with only three or four trips on the books. */
  function initSlideshow(rows) {
    var track   = D.getElementById('wb-slide-track') || D.getElementById('wb-grid');
    var navWrap = D.getElementById('wb-slide-nav');
    var dotsEl  = D.getElementById('wb-slide-dots');
    var prevBtn = D.getElementById('wb-prev');
    var nextBtn = D.getElementById('wb-next');

    if (!track) return;

    if (!rows || !rows.length) {
      track.innerHTML =
        '<div class="wb-empty"><b>No departures published yet</b>' +
        'Trips added from the admin appear here.</div>';
      return;
    }

    var real = rows.length;
    var one  = rows.map(W.WBSite.tourCard).join('');

    /* Enough copies that the row is never half empty at any offset. */
    var copies = real <= 2 ? 4 : real <= 4 ? 3 : 2;
    var html = '';
    for (var c = 0; c < copies; c++) html += one;
    track.innerHTML = html;

    /* Controls are an enhancement — without them the cards still
       render as a plain row rather than nothing at all. */
    if (!navWrap || !dotsEl || !prevBtn || !nextBtn) return;

    var idx = 0, timer = null, paused = false;
    var REDUCED = W.matchMedia &&
      W.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function cardStep() {
      var card = track.querySelector('.wb-card');
      if (!card) return 0;
      var gap = parseFloat(getComputedStyle(track).gap) || 20;
      return card.offsetWidth + gap;
    }

    function paint(animate) {
      track.style.transition = animate
        ? 'transform .6s cubic-bezier(.4,0,.2,1)' : 'none';
      track.style.transform = 'translateX(-' + (idx * cardStep()) + 'px)';
      Array.prototype.forEach.call(dotsEl.children, function (d, i) {
        d.classList.toggle('on', i === ((idx % real) + real) % real);
      });
    }

    function go(delta) {
      if (!delta) return;
      idx += delta;
      if (idx < 0) {
        /* hop forward a full set unseen, then step back visibly */
        idx += real;
        paint(false);
        void track.offsetWidth;      /* flush so the next paint animates */
        idx -= 1;
      }
      paint(true);
      if (idx >= real) {             /* rewind silently once a set has passed */
        setTimeout(function () { idx -= real; paint(false); }, 620);
      }
    }

    /* one dot per real trip */
    dotsEl.innerHTML = '';
    for (var i = 0; i < real; i++) {
      var b = D.createElement('button');
      b.className = 'wb-slide-dot' + (i === 0 ? ' on' : '');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show trip ' + (i + 1));
      b.dataset.idx = i;
      dotsEl.appendChild(b);
    }
    navWrap.hidden = false;

    function start() {
      if (REDUCED || timer) return;
      timer = setInterval(function () { if (!paused) go(1); }, 3200);
    }
    function bump() {                /* hold still after a manual nudge */
      paused = true;
      clearTimeout(bump._t);
      bump._t = setTimeout(function () { paused = false; }, 6000);
    }

    prevBtn.addEventListener('click', function () { bump(); go(-1); });
    nextBtn.addEventListener('click', function () { bump(); go(1); });
    dotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-idx]'); if (!b) return;
      bump();
      go(parseInt(b.dataset.idx, 10) - (((idx % real) + real) % real));
    });

    track.addEventListener('mouseenter', function () { paused = true; });
    track.addEventListener('mouseleave', function () { paused = false; });
    D.addEventListener('visibilitychange', function () { paused = D.hidden; });

    var touchX = null;
    track.addEventListener('touchstart', function (e) {
      touchX = e.touches[0].clientX; paused = true;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null; bump();
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    var resizeTm;
    W.addEventListener('resize', function () {
      clearTimeout(resizeTm);
      resizeTm = setTimeout(function () { paint(false); }, 160);
    });

    paint(false);
    start();
  }

  /* ── photo gallery strip ───────────────────────────────── */
  function photoTile(p) {
    var e = W.WBSite.esc;
    var cap = p.caption ? p.caption : (p.location || '');
    return '<div class="wb-photo-tile" data-src="' + e(p.url) +
      '" data-cap="' + e(cap) + '" data-alt="' + e(p.alt_text || cap) + '">' +
      '<img src="' + e(p.url) + '" alt="' + e(p.alt_text || cap) +
      '" loading="lazy" decoding="async"/>' +
      (cap ? '<span class="wb-photo-tile-cap">' + e(cap) + '</span>' : '') +
      '</div>';
  }

  function initGallery(rows) {
    var run1 = D.getElementById('wb-gallery-run-1');
    var run2 = D.getElementById('wb-gallery-run-2');
    var sec  = D.getElementById('wb-gallery-sec');
    var empty = D.getElementById('wb-gallery-empty');
    if (!run1) return;

    if (!rows || !rows.length) {
      if (sec) sec.style.display = 'none';
      return;
    }

    var html = rows.map(photoTile).join('');
    run1.innerHTML = html;
    run2.innerHTML = html; /* clone for seamless loop */
    if (empty) empty.style.display = 'none';

    /* Lightbox */
    var lb     = D.getElementById('wb-lightbox');
    var lbImg  = D.getElementById('wb-lightbox-img');
    var lbCap  = D.getElementById('wb-lightbox-cap');
    var lbX    = D.getElementById('wb-lightbox-close');

    function openLB(src, alt, cap) {
      lbImg.src = src; lbImg.alt = alt;
      lbCap.textContent = cap || '';
      lb.classList.add('open');
      D.body.style.overflow = 'hidden';
    }
    function closeLB() {
      lb.classList.remove('open');
      D.body.style.overflow = '';
    }

    D.querySelector('.wb-gallery-runner').addEventListener('click', function (e) {
      var tile = e.target.closest('.wb-photo-tile'); if (!tile) return;
      openLB(tile.dataset.src, tile.dataset.alt, tile.dataset.cap);
    });
    if (lbX) lbX.addEventListener('click', closeLB);
    if (lb)  lb.addEventListener('click', function (e) {
      if (e.target === lb) closeLB();
    });
    D.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) closeLB();
    });
  }

  /* ── init ──────────────────────────────────────────────── */
  function init() {
    var track = D.getElementById('wb-slide-track') || D.getElementById('wb-grid');

    if (!W.WB) {
      if (track) track.innerHTML = '<div class="wb-empty"><b>Could not load trips</b>' +
        'Please refresh the page.</div>';
      return;
    }

    W.WB.tours({ limit: 12 })
      .then(initSlideshow)
      .catch(function (err) {
        if (track) track.innerHTML = '<div class="wb-empty"><b>Could not load trips</b>' +
          'Please refresh the page.</div>';
        if (W.console) console.error('[wb-home] tours failed', err);
      });

    W.WB.photos()
      .then(initGallery)
      .catch(function (err) {
        var sec = D.getElementById('wb-gallery-sec');
        if (sec) sec.style.display = 'none';
        if (W.console) console.error('[wb-home] photos failed', err);
      });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();

})(window, document);
