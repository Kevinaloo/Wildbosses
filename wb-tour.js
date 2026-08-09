/* ═══════════════════════════════════════════════════════════════════
   Trip detail + booking.
   The booking goes in as pending/pending — the database will not accept
   anything else from a browser. An admin confirms it and records payment.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';
  var e, T = null, timer = null;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function countBox(iso) {
    var c = W.WB.countdown(iso);
    if (!c) return '<div class="wb-book-fact"><span>Departs</span><b>On request</b></div>';
    if (c.past) return '<div class="wb-book-fact"><span>Departs</span><b>Departed</b></div>';
    return '<div class="wb-count" id="cd">' +
      '<div><b>' + c.d + '</b><i>days</i></div><div><b>' + pad(c.h) + '</b><i>hrs</i></div>' +
      '<div><b>' + pad(c.m) + '</b><i>min</i></div><div><b>' + pad(c.s) + '</b><i>sec</i></div></div>';
  }

  function tick() {
    if (!T || !T.departure_date) return;
    var box = D.getElementById('cd'); if (!box) return;
    var c = W.WB.countdown(T.departure_date); if (!c || c.past) return;
    var b = box.querySelectorAll('b');
    b[0].textContent = c.d; b[1].textContent = pad(c.h);
    b[2].textContent = pad(c.m); b[3].textContent = pad(c.s);
  }

  function render(t) {
    T = t;
    var w = W.WBSite.whenLabel(t.departure_date);
    var p = W.WBSite.money(t.price_kes);
    var inc = (t.includes || []).map(function (i) { return '<li>' + e(i) + '</li>'; }).join('');

    D.getElementById('tour-root').innerHTML =
      '<div class="wb-wrap" style="padding-top:26px;padding-bottom:70px">' +
        '<div class="wb-trip-hero">' +
          (t.image ? '<img src="' + e(t.image) + '" alt="' + e(t.name) + '"/>' : '') +
          '<div class="wb-trip-hero-in"><h1>' + e(t.name) + '</h1>' +
          (t.subtitle ? '<p>' + e(t.subtitle) + '</p>' : '') + '</div>' +
        '</div>' +
        '<div class="wb-trip">' +
          '<div class="wb-trip-body">' +
            (t.description ? '<h2>About this trip</h2><p>' + e(t.description) + '</p>' : '') +
            (inc ? '<h2>What is included</h2><ul class="wb-inc">' + inc + '</ul>' : '') +
            '<h2>Book a place</h2>' +
            '<form id="bookForm" class="glass" style="border-radius:var(--r-lg);padding:24px;margin-top:14px">' +
              '<label>Your name<input name="guest_name" required autocomplete="name"/></label>' +
              '<label>Phone<input name="guest_phone" required autocomplete="tel" inputmode="tel"/></label>' +
              '<label>Email <span>optional</span><input name="guest_email" type="email" autocomplete="email"/></label>' +
              '<label>How many places?<input name="guests" type="number" min="1" max="' +
                (t.spots_left || 1) + '" value="1" id="guests"/></label>' +
              '<label>Anything we should know<textarea name="notes" rows="3"></textarea></label>' +
              '<button class="wb-btn wb-btn-gold wb-btn-lg" type="submit" id="bookBtn">' +
                'Request this place</button>' +
              '<p class="wb-form-msg" id="bookMsg" role="status"></p>' +
            '</form>' +
          '</div>' +
          '<aside class="wb-book glass">' +
            '<div class="wb-book-price">' + e(p.main) +
              (p.sub ? '<small>' + e(p.sub) + '</small>' : '') + '</div>' +
            countBox(t.departure_date) +
            '<div class="wb-book-facts">' +
              '<div class="wb-book-fact"><span>Departs</span><b>' + e(w.main) + '</b></div>' +
              (t.duration ? '<div class="wb-book-fact"><span>Length</span><b>' + e(t.duration) + '</b></div>' : '') +
              '<div class="wb-book-fact"><span>Destination</span><b>' + e(t.destination) + '</b></div>' +
              '<div class="wb-book-fact"><span>Places left</span><b>' +
                (t.spots_left > 0 ? t.spots_left : 'Full') + '</b></div>' +
            '</div>' +
            '<a class="wb-btn wb-btn-ghost" data-wa href="https://wa.me/254796818671" ' +
              'target="_blank" rel="noopener">Ask on WhatsApp</a>' +
          '</aside>' +
        '</div>' +
      '</div>';

    D.title = t.name + ' — Wild Bosses Adventures';
    timer = setInterval(tick, 1000);
    wireForm(t);
  }

  function wireForm(t) {
    var f = D.getElementById('bookForm');
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = D.getElementById('bookBtn'), msg = D.getElementById('bookMsg');
      msg.className = 'wb-form-msg'; msg.textContent = '';
      var g = parseInt(f.guests.value, 10) || 1;
      if (t.spots_left != null && g > t.spots_left) {
        msg.className = 'wb-form-msg bad';
        msg.textContent = 'Only ' + t.spots_left + ' place(s) left on this departure.';
        return;
      }
      btn.disabled = true; btn.textContent = 'Sending…';
      W.WB.createBooking({
        tour_id: t.id, tour_name: t.name,
        guest_name: f.guest_name.value.trim(),
        guest_phone: f.guest_phone.value.trim(),
        guest_email: f.guest_email.value.trim(),
        guests: g,
        notes: f.notes.value.trim(),
        base_amount: t.price_kes || 0,
        total_amount: (t.price_kes || 0) * g
      }).then(function (r) {
        f.parentNode.innerHTML =
          '<div class="glass wb-form-ok" style="border-radius:var(--r-lg)">' +
            '<b>Request received</b>' +
            '<p>We will confirm your place and payment details shortly.</p>' +
            '<p>Your reference</p><p class="wb-ref">' + e(r.ref) + '</p>' +
          '</div>';
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Request this place';
        msg.className = 'wb-form-msg bad';
        msg.textContent = 'That did not send. Please try WhatsApp instead.';
      });
    });
  }

  function init() {
    if (!W.WB || !W.WBSite) return;
    e = W.WBSite.esc;
    var slug = new URLSearchParams(location.search).get('t');
    if (!slug) { location.replace('/tours.html'); return; }
    W.WB.tourBySlug(slug).then(function (t) {
      if (!t) {
        D.getElementById('tour-root').innerHTML =
          '<div class="wb-wrap" style="padding:80px 0"><div class="wb-empty">' +
          '<b>Trip not found</b>It may have closed. ' +
          '<a href="/tours.html" style="color:var(--gold)">See every trip</a></div></div>';
        return;
      }
      render(t);
    });
  }
  D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', init) : init();
})(window, document);
