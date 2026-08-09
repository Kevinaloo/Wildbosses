/* ═══════════════════════════════════════════════════════════════════════
   WILDBOSSES · CLAW INTRO ENGINE
   ─────────────────────────────────────────────────────────────────────
   An unseen lion tears the screen open.

   Beat 1  ↘  four claws rip the upper-left down to the lower-right
   Beat 2  ↙  the opposite diagonal, torn back the other way
   Beat 3     WILD BOSSES ADVENTURES is pulled out of the dark

   The claw shapes are generated, not drawn: every edge is walked
   point-by-point with seeded jitter and occasional deep notches, so a
   tear never repeats itself and never reads as a smooth vector stroke.

   Honours prefers-reduced-motion. Skippable by click, tap, Esc or Space.
   ═════════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  var CFG = {
    tearMs:  560,   // how long one diagonal takes to rip across
    gapMs:   260,   // second strike lands while the first is still bleeding
    holdMs:  200,   // a mark lingers this long after its own rip lands
    fadeMs:  300,   // and then bleeds away
    wordMs: 1150,   // wordmark reveal
    outMs:   620,   // whole curtain lifts
    replay: 'session' // 'session' | 'always' | 'never'
  };

  var VB_W = 1600, VB_H = 900;
  var NS = 'http://www.w3.org/2000/svg';

  /* ── seeded RNG so a tear is organic but reproducible per run ── */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ── one claw tear, drawn as a closed ragged outline ──────────
     Spine runs along +x. Width tapers to nothing at both ends so the
     tear enters and leaves the flesh instead of stopping square.     */
  function tearPath(len, maxW, seed) {
    var r = rng(seed), N = 68, i, t, x, w, e;
    var top = [], bot = [];

    /* Two slow waves per edge give the tear a flowing, hand-torn line;
       fine grain roughens it; a rare deep catch is where the claw snagged.
       Uniform per-point jitter alone reads as a zigzag, which is the tell
       of a generated edge — this is why the noise is layered.            */
    var p1 = r() * 6.283, f1 = 1.6 + r() * 1.8;
    var p2 = r() * 6.283, f2 = 3.4 + r() * 2.6;
    var p3 = r() * 6.283, f3 = 1.9 + r() * 1.7;
    var p4 = r() * 6.283, f4 = 3.1 + r() * 2.9;

    function edge(t, w, ph, fa, phb, fb, sign) {
      var wander = (Math.sin(t * fa * 6.283 + ph) * 0.52 +
                    Math.sin(t * fb * 6.283 + phb) * 0.26) * w * 0.30;
      var grain  = (r() * 2 - 1) * w * 0.075;
      var catch_ = r() > 0.945 ? sign * w * (0.34 + r() * 0.42) : 0;
      return wander + grain + catch_;
    }

    for (i = 0; i <= N; i++) {
      t = i / N;
      // fat around 45% along, needle-fine at both tips
      w = maxW * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.86)), 0.68);
      x = t * len;
      e = edge(t, w, p1, f1, p2, f2, -1);
      top.push([x, -w / 2 + e]);
      e = edge(t, w, p3, f3, p4, f4, 1);
      bot.push([x,  w / 2 + e]);
    }

    var d = 'M' + top[0][0].toFixed(1) + ' ' + top[0][1].toFixed(1);
    for (i = 1; i <= N; i++) d += 'L' + top[i][0].toFixed(1) + ' ' + top[i][1].toFixed(1);
    for (i = N; i >= 0; i--) d += 'L' + bot[i][0].toFixed(1) + ' ' + bot[i][1].toFixed(1);
    return d + 'Z';
  }

  /* ── a paw: four claws, middle two longest, slightly fanned ── */
  var PAW = [
    { off: -172, len: 0.72, w: 24, tilt: -3.1, shift: -120 },
    { off:  -60, len: 0.93, w: 33, tilt: -1.1, shift:  -30 },
    { off:   58, len: 1.00, w: 36, tilt:  1.1, shift:   25 },
    { off:  170, len: 0.76, w: 26, tilt:  3.1, shift:  135 }
  ];

  function el(name, attrs) {
    var n = D.createElementNS(NS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ── build one diagonal swipe ─────────────────────────────────
     Claws are drawn horizontally inside a rotated group, so the
     progressive reveal is a plain left-to-right clip sweep in that
     rotated frame — which lands on screen as a true diagonal rip.   */
  function buildSwipe(svg, id, angle, dir, seed) {
    var reach = 2100, cx = VB_W / 2, cy = VB_H / 2;

    /* The reveal front is one edge of a very wide rect.
       fwd → the rect trails left, its RIGHT edge does the cutting.
       rev → the rect trails right, its LEFT edge does the cutting.   */
    var TRAIL = 6000;
    var clip = el('clipPath', { id: 'wbClip' + id, clipPathUnits: 'userSpaceOnUse' });
    var wipe = el('rect', {
      x: dir === 'rev' ? 0 : -TRAIL, y: cy - 900,
      width: TRAIL, height: 1800
    });
    wipe.setAttribute('class', 'wb-wipe wb-wipe-' + dir);
    clip.appendChild(wipe);
    svg.appendChild(clip);

    var rot  = el('g', { transform: 'rotate(' + angle + ' ' + cx + ' ' + cy + ')' });
    var body = el('g', { 'clip-path': 'url(#wbClip' + id + ')' });

    PAW.forEach(function (c, i) {
      var len = reach * 0.92 * c.len;
      var d   = tearPath(len, c.w, seed + i * 977);
      var tx  = cx - len / 2 - (dir === 'rev' ? -40 : 40) + c.shift;
      var ty  = cy + c.off;
      var tf  = 'translate(' + tx + ' ' + ty + ') rotate(' + c.tilt + ' ' + (len / 2) + ' 0)';

      // heat spilling past the wound
      body.appendChild(el('path', {
        d: d, transform: tf, fill: '#D6521F',
        opacity: 0.42, filter: 'url(#wbBloom)'
      }));
      // the wound: coldest at the tips, white-hot where the claw bit deepest
      body.appendChild(el('path', { d: d, transform: tf, fill: 'url(#wbTearFill)' }));
    });

    // the point of the claw, currently cutting
    var spark = el('ellipse', {
      cx: 0, cy: cy, rx: 150, ry: 210, fill: 'url(#wbSpark)'
    });
    spark.setAttribute('class', 'wb-spark wb-spark-' + dir);
    body.appendChild(spark);

    rot.appendChild(body);
    svg.appendChild(rot);
    return rot;
  }

  function defs(svg) {
    var d = el('defs', {});

    /* Along the length, not across it: the tear fades to nothing at both
       tips and burns white where the claw sank deepest. Gradient runs on
       the path's own bounding box, so every claw gets the same profile
       regardless of how long it is. */
    var g1 = el('linearGradient', { id: 'wbTearFill', x1: '0', y1: '0', x2: '1', y2: '0' });
    [['0%','#C8922F','0'], ['7%','#C8922F','.85'], ['24%','#F0BE72','1'],
     ['48%','#FFF6E2','1'], ['72%','#F0BE72','1'], ['93%','#C8922F','.85'],
     ['100%','#C8922F','0']
    ].forEach(function (st) {
      g1.appendChild(el('stop', { offset: st[0], 'stop-color': st[1], 'stop-opacity': st[2] }));
    });
    d.appendChild(g1);

    var g3 = el('radialGradient', { id: 'wbSpark', cx: '50%', cy: '50%', r: '50%' });
    g3.appendChild(el('stop', { offset: '0%',   'stop-color': '#FFF6E2', 'stop-opacity': '.95' }));
    g3.appendChild(el('stop', { offset: '38%',  'stop-color': '#D6521F', 'stop-opacity': '.45' }));
    g3.appendChild(el('stop', { offset: '100%', 'stop-color': '#D6521F', 'stop-opacity': '0' }));
    d.appendChild(g3);

    var b = el('filter', { id: 'wbBloom', x: '-30%', y: '-140%', width: '160%', height: '380%' });
    b.appendChild(el('feGaussianBlur', { stdDeviation: '11' }));
    d.appendChild(b);

    svg.appendChild(d);
  }

  /* ── mount ───────────────────────────────────────────────────── */
  function run() {
    var root = D.getElementById('wb-intro');

    /* Nothing below this line may return without taking the curtain down.
       The overlay is a fixed, full-screen, top-of-stack element: if it is
       left in the DOM it silently blocks the entire site, and the Skip
       button is inert because its handler is attached further down. That
       is a trap, so every exit path calls kill(). */
    function kill() {
      D.documentElement.classList.remove('wb-intro-live');
      D.documentElement.classList.add('wb-intro-done');
      if (root && root.parentNode) root.parentNode.removeChild(root);
    }

    if (!root) return;

    if (D.documentElement.classList.contains('wb-intro-done')) { kill(); return; }

    // Skip must work from the very first paint, before anything else runs.
    var skipBtn = root.querySelector('.wb-intro-skip');
    if (skipBtn) skipBtn.addEventListener('click', function (e) {
      e.stopPropagation(); finish(root);
    });

    // Last-resort failsafe: however this goes wrong, the curtain lifts.
    var deadman = setTimeout(function () { finish(root); }, 6000);

    /* Back/forward navigation restores the page from bfcache: the DOM
       comes back exactly as it was and no script re-runs. If the visitor
       left while the curtain was up, it returns still up, with every
       timer that would have taken it down already discarded. pageshow is
       the only event that fires in that case, so it has to do the work. */
    W.addEventListener('pageshow', function (e) {
      if (e.persisted) kill();
    });

    var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (CFG.replay === 'never') { clearTimeout(deadman); kill(); return; }
    if (CFG.replay === 'session') {
      var seen = false;
      try { seen = !!sessionStorage.getItem('wb_intro_seen'); } catch (e) {}
      if (seen) { clearTimeout(deadman); kill(); return; }
    }
    try { sessionStorage.setItem('wb_intro_seen', '1'); } catch (e) {}

    D.documentElement.classList.add('wb-intro-live');

    if (reduce) { finish(root, true); return; }

    var svg = el('svg', {
      viewBox: '0 0 ' + VB_W + ' ' + VB_H,
      preserveAspectRatio: 'xMidYMid slice',
      'aria-hidden': 'true'
    });
    svg.setAttribute('class', 'wb-intro-svg');
    defs(svg);

    var seed = (Date.now() % 100000) | 0;
    var a = buildSwipe(svg, 'A',  31, 'fwd', seed);
    var b = buildSwipe(svg, 'B', -31, 'rev', seed + 31337);
    a.classList.add('wb-swipe', 'wb-swipe-a');
    b.classList.add('wb-swipe', 'wb-swipe-b');

    root.insertBefore(svg, root.firstChild);

    // drive the beats off CSS custom properties so timing lives in one place
    root.style.setProperty('--tear', CFG.tearMs + 'ms');
    root.style.setProperty('--gap',  CFG.gapMs  + 'ms');
    root.style.setProperty('--hold', CFG.holdMs + 'ms');
    root.style.setProperty('--fade', CFG.fadeMs + 'ms');
    root.style.setProperty('--word', CFG.wordMs + 'ms');
    root.style.setProperty('--out',  CFG.outMs  + 'ms');

    root.classList.add('go');

    // impact shake, once per rip
    setTimeout(function () { shake(root); }, 60);
    setTimeout(function () { shake(root); }, CFG.tearMs + CFG.gapMs + 60);

    var total = CFG.tearMs * 2 + CFG.gapMs + CFG.holdMs + 120 + CFG.wordMs + CFG.outMs;
    var done  = setTimeout(function () { finish(root); }, total);

    function skip() { clearTimeout(done); clearTimeout(deadman); finish(root); }
    root.addEventListener('click', skip);
    D.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        D.removeEventListener('keydown', onKey); skip();
      }
    });
  }

  function shake(root) {
    root.classList.remove('hit');
    void root.offsetWidth;
    root.classList.add('hit');
  }

  function finish(root, instant) {
    if (root.dataset.done) return;
    root.dataset.done = '1';
    root.classList.add('out');
    D.documentElement.classList.remove('wb-intro-live');
    D.documentElement.classList.add('wb-intro-done');
    setTimeout(function () {
      root.parentNode && root.parentNode.removeChild(root);
    }, instant ? 0 : CFG.outMs);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', run);
  else run();

  W.WBIntro = { config: CFG, replay: function () {
    try { sessionStorage.removeItem('wb_intro_seen'); } catch (e) {}
    location.reload();
  } };

})(window, document);
