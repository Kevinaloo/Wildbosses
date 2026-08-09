/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · HOME
   Renders the tour grid from the database and applies the brand the
   client has set. No content is hardcoded here.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  var MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function whenLabel(iso) {
    if (!iso) return { top: 'Dates', main: 'On request' };
    var d = new Date(iso);
    if (isNaN(d)) return { top: 'Dates', main: 'On request' };
    var days = Math.ceil((d - new Date()) / 86400000);
    return {
      top: days > 0 ? 'in ' + days + ' day' + (days === 1 ? '' : 's') : 'Departed',
      main: d.getDate() + ' ' + MONTH[d.getMonth()] + ' ' + d.getFullYear()
    };
  }

  function money(kes) {
    if (kes === 0) return { main: 'Pay what you want', sub: 'at the end' };
    if (!kes) return { main: 'On request', sub: '' };
    return { main: 'KES ' + Number(kes).toLocaleString('en-KE'), sub: 'per person' };
  }

  function cardHTML(t) {
    var w = whenLabel(t.departure_date);
    var p = money(t.price_kes);
    var days = t.departure_date
      ? Math.ceil((new Date(t.departure_date) - new Date()) / 86400000) : null;
    var soon = days !== null && days > 0 && days <= 30;

    var tag = t.spots_left === 0
      ? '<span class="wb-card-tag">Full</span>'
      : (soon ? '<span class="wb-card-tag is-soon">Leaving soon</span>'
              : (t.spots_left != null
                  ? '<span class="wb-card-tag">' + t.spots_left + ' left</span>' : ''));

    return '' +
      '<a class="wb-card" href="/tours.html?tour=' + encodeURIComponent(t.slug) + '">' +
        '<div class="wb-card-img">' +
          (t.image ? '<img src="' + esc(t.image) + '" alt="' + esc(t.name) + '" loading="lazy" decoding="async"/>' : '') +
          tag +
        '</div>' +
        '<div class="wb-card-body">' +
          '<span class="wb-card-dest">' + esc(t.destination || '') +
            (t.duration ? ' · ' + esc(t.duration) : '') + '</span>' +
          '<h3 class="wb-card-name">' + esc(t.name) + '</h3>' +
          (t.subtitle ? '<p class="wb-card-sub">' + esc(t.subtitle) + '</p>' : '') +
          '<div class="wb-card-meta">' +
            '<span class="wb-card-price">' + esc(p.main) +
              (p.sub ? '<small>' + esc(p.sub) + '</small>' : '') + '</span>' +
            '<span class="wb-card-when"><b>' + esc(w.main) + '</b>' + esc(w.top) + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function renderTours() {
    var grid = D.getElementById('wb-grid');
    if (!grid || !W.WB) return;
    W.WB.tours().then(function (rows) {
      if (!rows || !rows.length) {
        grid.innerHTML =
          '<div class="wb-empty"><b>No departures published yet</b>' +
          'Trips added from the admin appear here straight away.</div>';
        return;
      }
      grid.innerHTML = rows.map(cardHTML).join('');
    });
  }

  function applyBrand() {
    if (!W.WB) return;
    W.WB.settings().then(function (s) {
      var b = s.brand || {};
      var slot = D.getElementById('wb-logo');
      if (slot && b.logo_url) {
        slot.style.backgroundImage = 'url(' + b.logo_url + ')';
        slot.classList.add('has-logo');
      }
    });
  }

  function nav() {
    var burger = D.getElementById('wb-burger');
    var links  = D.getElementById('wb-links');
    if (!burger || !links) return;
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function init() {
    var y = D.getElementById('wb-year');
    if (y) y.textContent = new Date().getFullYear();
    nav();
    applyBrand();
    renderTours();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();

})(window, document);
