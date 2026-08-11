/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · BOOT
   ─────────────────────────────────────────────────────────────────
   Loaded in <head> and run immediately, before first paint.

   This file used to resolve a light/dark theme from storage, the OS
   and the clock. The site now ships one committed palette, so all of
   that is gone — but the file stays, because it also carries the
   intro guard, and that has to run before any stylesheet paints.

   Do not fold this into a deferred bundle. If the guard runs late the
   claw overlay paints on a repeat visit; it is fixed, full-screen and
   top-of-stack, so it blocks the entire site. That failure has
   happened here before and it is silent — the page looks loaded and
   nothing responds. This is the first of the four layers that stop it.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  /* Promise the stylesheet that something will reveal [data-reveal] nodes.
     Stamped here, in <head>, so the hidden state applies before first paint
     rather than flashing content in and back out.

     The promise is made here but kept in wb-site.js, so it can be broken:
     block that file and every [data-reveal] section stays at opacity 0
     forever. Hence the failsafe below — the same shape as the one that
     lifts the intro curtain. If nothing has claimed the reveal within
     three seconds, drop the class and the content simply appears. */
  if (W.IntersectionObserver) {
    D.documentElement.className += ' wb-reveal';
    W.setTimeout(function () {
      if (!W.__wbRevealRan) {
        D.documentElement.className =
          D.documentElement.className.replace(/\bwb-reveal\b/, '');
      }
    }, 3000);
  }

  /* the intro overlay must not paint at all if it has already played */
  try {
    if (sessionStorage.getItem('wb_intro_seen')) {
      D.documentElement.className += ' wb-no-intro';
    }
  } catch (e) {}

})(window, document);
