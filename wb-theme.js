/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · THEME
   ─────────────────────────────────────────────────────────────────
   Order of authority:
     1. what the visitor last chose        (localStorage, wins always)
     2. the operating system, if it asks for dark
     3. the hour where the visitor is      (dark from 18:30 to 06:30)

   Loaded in <head> and run immediately, before first paint, so the page
   never flashes the wrong face. It also stamps the intro guard, because
   that decision has to be made before any stylesheet paints too.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  var KEY = 'wb_theme';
  var NIGHT_FROM = 18.5, NIGHT_TO = 6.5;

  function byClock() {
    var d = new Date();
    var h = d.getHours() + d.getMinutes() / 60;
    return (h >= NIGHT_FROM || h < NIGHT_TO) ? 'dark' : 'light';
  }

  function resolve() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved === 'light' || saved === 'dark') return saved;
    if (W.matchMedia && W.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return byClock();
  }

  function apply(t) {
    D.documentElement.setAttribute('data-theme', t);
    var m = D.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0B0D0C' : '#EFEBE3');
    var btns = D.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-label',
        t === 'dark' ? 'Switch to day' : 'Switch to night');
      btns[i].setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    }
  }

  apply(resolve());

  /* the intro overlay must not paint at all if it has already played */
  try {
    if (sessionStorage.getItem('wb_intro_seen')) {
      D.documentElement.className += ' wb-no-intro';
    }
  } catch (e) {}

  var API = {
    get: function () { return D.documentElement.getAttribute('data-theme'); },
    set: function (t) {
      try { localStorage.setItem(KEY, t); } catch (e) {}
      apply(t);
    },
    toggle: function () { API.set(API.get() === 'dark' ? 'light' : 'dark'); },
    clear: function () {           // back to automatic
      try { localStorage.removeItem(KEY); } catch (e) {}
      apply(resolve());
    }
  };
  W.WBTheme = API;

  /* follow the system if the visitor has expressed no preference */
  if (W.matchMedia) {
    var mq = W.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      var saved = null;
      try { saved = localStorage.getItem(KEY); } catch (e) {}
      if (!saved) apply(resolve());
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* and re-check the clock periodically, so an open tab rolls over at dusk */
  setInterval(function () {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (!saved) apply(resolve());
  }, 300000);

  D.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (b) { e.preventDefault(); API.toggle(); }
  });

})(window, document);
