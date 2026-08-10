/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · HOMEPAGE
   Tour departure slideshow + photo gallery strip.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  /* ── slideshow ─────────────────────────────────────────── */
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

    track.innerHTML = rows.map(W.WBSite.tourCard).join('');

    /* Cards render fine on their own; the carousel controls are a
       progressive enhancement. If the slideshow markup is missing
       (e.g. a stale cached page) the trips still show as a plain row. */
    if (!navWrap || !dotsEl || !prevBtn || !nextBtn) return;
    var cards = track.querySelectorAll('.wb-card');
    var n = cards.length;

    /* How many cards fit in view? Compute from first card width. */
    function perPage() {
      if (!cards[0]) return 3;
      var cw  = cards[0].offsetWidth + parseInt(
        getComputedStyle(track).gap || '20', 10);
      var vw  = track.parentElement.offsetWidth;
      return Math.max(1, Math.floor(vw / cw));
    }

    var step = 0, pages, pp;

    function totalPages() {
      pp = perPage();
      return Math.max(1, Math.ceil(n / pp));
    }

    function buildDots() {
      pages = totalPages();
      dotsEl.innerHTML = '';
      for (var i = 0; i < pages; i++) {
        var b = D.createElement('button');
        b.className = 'wb-slide-dot' + (i === 0 ? ' on' : '');
        b.setAttribute('aria-label', 'Go to page ' + (i + 1));
        b.dataset.idx = i;
        dotsEl.appendChild(b);
      }
    }

    function goTo(idx) {
      pages = totalPages();
      step  = Math.max(0, Math.min(idx, pages - 1));
      /* pixel offset: move by (step * perPage) card widths */
      var cw = cards[0] ? (cards[0].offsetWidth +
        parseInt(getComputedStyle(track).gap || '20', 10)) : 0;
      track.style.transform = 'translateX(-' + (step * pp * cw) + 'px)';
      /* dots */
      Array.prototype.forEach.call(dotsEl.children, function (d, i) {
        d.classList.toggle('on', i === step);
      });
      prevBtn.disabled = step === 0;
      nextBtn.disabled = step >= pages - 1;
    }

    buildDots();
    navWrap.hidden = false;

    prevBtn.addEventListener('click', function () { goTo(step - 1); });
    nextBtn.addEventListener('click', function () { goTo(step + 1); });
    dotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-idx]'); if (!b) return;
      goTo(parseInt(b.dataset.idx, 10));
    });

    /* Rebuild on resize */
    var resizeTm;
    W.addEventListener('resize', function () {
      clearTimeout(resizeTm);
      resizeTm = setTimeout(function () {
        buildDots(); goTo(Math.min(step, totalPages() - 1));
      }, 160);
    });

    goTo(0);

    /* Touch/swipe support */
    var touchX = null;
    track.addEventListener('touchstart', function (e) {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      goTo(dx < 0 ? step + 1 : step - 1);
    }, { passive: true });
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
