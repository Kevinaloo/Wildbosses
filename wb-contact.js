/* Contact form. An enquiry is stored as a booking with no tour attached
   when the visitor has not picked one, so nothing gets lost in an inbox. */
(function (W, D) {
  'use strict';
  function init() {
    if (!W.WB) return;
    var sel = D.getElementById('contactTour');
    W.WB.tours().then(function (rows) {
      (rows || []).forEach(function (t) {
        var o = D.createElement('option');
        o.value = t.id; o.textContent = t.name;
        o.dataset.name = t.name; o.dataset.price = t.price_kes || 0;
        sel.appendChild(o);
      });
      var pre = new URLSearchParams(location.search).get('tour');
      if (pre) sel.value = pre;
    });

    D.getElementById('contactForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target, btn = D.getElementById('contactBtn'), msg = D.getElementById('contactMsg');
      msg.className = 'wb-form-msg'; msg.textContent = '';
      btn.disabled = true; btn.textContent = 'Sending…';
      var opt = sel.options[sel.selectedIndex];
      var g = parseInt(f.guests.value, 10) || 1;
      var price = opt && opt.dataset.price ? parseInt(opt.dataset.price, 10) : 0;

      W.WB.createBooking({
        tour_id: sel.value || null,
        tour_name: (opt && opt.dataset.name) || 'General enquiry',
        guest_name: f.name.value.trim(),
        guest_phone: f.phone.value.trim(),
        guest_email: f.email.value.trim(),
        guests: g,
        travel_date: f.travel_date.value.trim(),
        notes: f.notes.value.trim(),
        base_amount: price,
        total_amount: price * g
      }).then(function (r) {
        f.parentNode.innerHTML =
          '<div class="wb-form-ok"><b>Thank you</b>' +
          '<p>We have your enquiry and will reply shortly.</p>' +
          '<p>Your reference</p><p class="wb-ref">' + W.WBSite.esc(r.ref) + '</p></div>';
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Send enquiry';
        msg.className = 'wb-form-msg bad';
        msg.textContent = 'That did not send. Please try WhatsApp instead.';
      });
    });
  }
  D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', init) : init();
})(window, document);
