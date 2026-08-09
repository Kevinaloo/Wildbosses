/* Guides page. Falls back to initials when a guide has no photo yet,
   which is better than a broken image frame. */
(function (W, D) {
  'use strict';
  function initials(n) {
    return String(n || '?').split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  function card(g) {
    var e = W.WBSite.esc;
    var face = g.photo
      ? '<div class="wb-guide-face" style="background-image:url(' + e(g.photo) + ')"></div>'
      : '<div class="wb-guide-face">' + e(initials(g.name)) + '</div>';
    var tags = (g.specialities || []).slice(0, 3)
      .map(function (s) { return '<span class="wb-tagpill">' + e(s) + '</span>'; }).join('');
    return '<article class="wb-guide glass">' + face +
      '<b>' + e(g.name) + '</b>' +
      '<span class="wb-guide-role">' +
        (g.years_exp ? g.years_exp + ' years guiding' : 'Guide') + '</span>' +
      (g.bio ? '<p>' + e(g.bio) + '</p>' : '') +
      (tags ? '<div class="wb-guide-tags">' + tags + '</div>' : '') +
      '</article>';
  }
  function init() {
    var box = D.getElementById('wb-guides');
    if (!box || !W.WB) return;
    W.WB.guides().then(function (rows) {
      box.innerHTML = (rows && rows.length)
        ? rows.map(card).join('')
        : '<div class="wb-empty"><b>Guides coming soon</b>' +
          'Guides added from the admin appear here.</div>';
    });
  }
  D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', init) : init();
})(window, document);
