/* Tours page: the full catalogue with category filters built from
   whatever categories actually have trips in them — no dead chips. */
(function (W, D) {
  'use strict';
  var ALL = [], active = 'all';

  function draw() {
    var grid = D.getElementById('wb-grid');
    var rows = active === 'all' ? ALL : ALL.filter(function (t) { return t.category === active; });
    grid.innerHTML = rows.length
      ? rows.map(W.WBSite.tourCard).join('')
      : '<div class="wb-empty"><b>Nothing here yet</b>No trips in this category right now.</div>';
  }

  function chips() {
    var box = D.getElementById('wb-filters');
    var cats = [];
    ALL.forEach(function (t) { if (t.category && cats.indexOf(t.category) < 0) cats.push(t.category); });
    if (cats.length < 2) { box.innerHTML = ''; return; }
    box.innerHTML = ['all'].concat(cats).map(function (c) {
      return '<button class="wb-chip' + (c === active ? ' on' : '') + '" data-cat="' + c + '">' +
        (c === 'all' ? 'All trips' : c) + '</button>';
    }).join('');
    box.querySelectorAll('[data-cat]').forEach(function (b) {
      b.onclick = function () {
        active = b.dataset.cat;
        box.querySelectorAll('.wb-chip').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        draw();
      };
    });
  }

  function init() {
    if (!W.WB) return;
    W.WB.tours().then(function (rows) { ALL = rows || []; chips(); draw(); });
  }
  D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', init) : init();
})(window, document);
