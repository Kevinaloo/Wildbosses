/* Homepage: the tour grid under the rail. */
(function (W, D) {
  'use strict';
  function init() {
    var grid = D.getElementById('wb-grid');
    if (!grid || !W.WB) return;
    W.WB.tours({ limit: 6 }).then(function (rows) {
      grid.innerHTML = (rows && rows.length)
        ? rows.map(W.WBSite.tourCard).join('')
        : '<div class="wb-empty"><b>No departures published yet</b>' +
          'Trips added from the admin appear here straight away.</div>';
    });
  }
  D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', init) : init();
})(window, document);
