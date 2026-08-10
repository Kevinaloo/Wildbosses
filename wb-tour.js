/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · Trip detail + booking + M-Pesa STK push payment
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
      '<div><b>' + c.d  + '</b><i>days</i></div>' +
      '<div><b>' + pad(c.h) + '</b><i>hrs</i></div>' +
      '<div><b>' + pad(c.m) + '</b><i>min</i></div>' +
      '<div><b>' + pad(c.s) + '</b><i>sec</i></div></div>';
  }

  function tick() {
    if (!T || !T.departure_date) return;
    var box = D.getElementById('cd'); if (!box) return;
    var c = W.WB.countdown(T.departure_date); if (!c || c.past) return;
    var b = box.querySelectorAll('b');
    b[0].textContent = c.d; b[1].textContent = pad(c.h);
    b[2].textContent = pad(c.m); b[3].textContent = pad(c.s);
  }

  /* ── payment modal ─────────────────────────────────────────────── */
  function showPayModal(bookingRef, guestPhone, guestName, totalAmount) {
    /* Remove any existing modal */
    var old = D.getElementById('wb-pay-modal');
    if (old) old.parentNode.removeChild(old);

    var overlay = D.createElement('div');
    overlay.id = 'wb-pay-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Complete payment');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9000',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,.55)', 'backdrop-filter:blur(4px)',
      'padding:16px'
    ].join(';');

    var depositAmount = Math.ceil(totalAmount * 0.3);

    overlay.innerHTML =
      '<div class="glass" style="' + [
        'max-width:380px', 'width:100%', 'border-radius:var(--r-lg)',
        'padding:28px 24px', 'position:relative',
        'background:var(--bg)', 'box-shadow:0 24px 80px rgba(0,0,0,.3)'
      ].join(';') + '">' +

        /* Close btn */
        '<button id="wb-pay-close" type="button" aria-label="Close" style="' + [
          'position:absolute', 'top:14px', 'right:14px',
          'background:none', 'border:none', 'cursor:pointer',
          'color:var(--muted)', 'font-size:20px', 'line-height:1', 'padding:4px'
        ].join(';') + '">✕</button>' +

        /* Header */
        '<div style="margin-bottom:20px">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
            '<span style="font-size:24px">📲</span>' +
            '<h2 style="margin:0;font-size:1.1rem;font-weight:700">Pay via M-Pesa</h2>' +
          '</div>' +
          '<p style="margin:0;font-size:.85rem;color:var(--muted)">Ref: <b style="color:var(--fg)">' + e(bookingRef) + '</b></p>' +
        '</div>' +

        /* Amount selector */
        '<div id="wb-pay-amount-wrap" style="margin-bottom:18px">' +
          '<label style="display:block;margin-bottom:6px;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Amount to pay</label>' +
          '<div style="display:grid;gap:8px">' +
            '<label class="wb-pay-opt" style="' + optStyle() + '">' +
              '<input type="radio" name="wb_pay_amt" value="deposit" checked style="accent-color:var(--gold)"/>' +
              '<span>' +
                '<b>30% deposit — KES ' + Number(depositAmount).toLocaleString('en-KE') + '</b>' +
                '<small style="display:block;color:var(--muted);font-size:.8rem">Secures your place</small>' +
              '</span>' +
            '</label>' +
            '<label class="wb-pay-opt" style="' + optStyle() + '">' +
              '<input type="radio" name="wb_pay_amt" value="full" style="accent-color:var(--gold)"/>' +
              '<span>' +
                '<b>Full payment — KES ' + Number(totalAmount).toLocaleString('en-KE') + '</b>' +
                '<small style="display:block;color:var(--muted);font-size:.8rem">Best value</small>' +
              '</span>' +
            '</label>' +
          '</div>' +
        '</div>' +

        /* Phone */
        '<div style="margin-bottom:18px">' +
          '<label style="display:block;margin-bottom:6px;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">M-Pesa phone</label>' +
          '<input id="wb-pay-phone" type="tel" inputmode="tel" autocomplete="tel" ' +
            'value="' + e(guestPhone) + '" ' +
            'placeholder="07xxxxxxxx or +2547xxxxxxxx" ' +
            'style="' + inputStyle() + '"/>' +
        '</div>' +

        /* CTA */
        '<button id="wb-pay-btn" type="button" style="' + [
          'width:100%', 'padding:14px 0', 'border-radius:var(--r-md)',
          'background:var(--gold)', 'color:#000',
          'font-weight:700', 'font-size:1rem', 'border:none',
          'cursor:pointer', 'transition:opacity .15s'
        ].join(';') + '">' +
          'Send M-Pesa prompt' +
        '</button>' +

        /* Status */
        '<p id="wb-pay-msg" role="status" style="' + [
          'margin:12px 0 0', 'font-size:.85rem', 'text-align:center',
          'min-height:1.2em', 'color:var(--muted)'
        ].join(';') + '"></p>' +

        /* Footer note */
        '<p style="' + [
          'margin:14px 0 0', 'font-size:.75rem', 'text-align:center',
          'color:var(--muted)'
        ].join(';') + '">' +
          'A push notification will appear on your phone. Enter your M-Pesa PIN to confirm.' +
        '</p>' +
      '</div>';

    D.body.appendChild(overlay);
    D.body.style.overflow = 'hidden';

    /* Close handlers */
    function closeModal() {
      var m = D.getElementById('wb-pay-modal');
      if (m) { m.parentNode.removeChild(m); D.body.style.overflow = ''; }
    }
    D.getElementById('wb-pay-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) closeModal();
    });
    D.addEventListener('keydown', function esc(ev) {
      if (ev.key === 'Escape') { closeModal(); D.removeEventListener('keydown', esc); }
    });

    /* Pay button */
    D.getElementById('wb-pay-btn').addEventListener('click', function () {
      triggerSTK(bookingRef, guestName, totalAmount, depositAmount, closeModal);
    });
  }

  function optStyle() {
    return [
      'display:flex', 'align-items:center', 'gap:10px',
      'padding:10px 12px', 'border-radius:var(--r-md)',
      'border:1px solid var(--glass-border)',
      'cursor:pointer', 'user-select:none'
    ].join(';');
  }

  function inputStyle() {
    return [
      'width:100%', 'box-sizing:border-box',
      'padding:10px 12px', 'border-radius:var(--r-md)',
      'border:1px solid var(--glass-border)',
      'background:var(--glass)', 'color:var(--fg)',
      'font-size:.95rem'
    ].join(';');
  }

  function triggerSTK(bookingRef, guestName, totalAmount, depositAmount, closeModal) {
    var btn   = D.getElementById('wb-pay-btn');
    var msg   = D.getElementById('wb-pay-msg');
    var phone = (D.getElementById('wb-pay-phone') || {}).value || '';
    var choice = D.querySelector('input[name="wb_pay_amt"]:checked');
    var amount = choice && choice.value === 'full' ? totalAmount : depositAmount;

    /* Floor at 1 KES for testing without showing it obviously */
    amount = Math.max(1, Math.round(amount));

    phone = phone.trim();
    if (!phone) {
      msg.style.color = 'var(--bad, #e03)';
      msg.textContent = 'Please enter a phone number.';
      return;
    }

    btn.disabled = true;
    btn.style.opacity = '.6';
    btn.textContent = 'Sending prompt…';
    msg.style.color = 'var(--muted)';
    msg.textContent = 'Connecting to M-Pesa…';

    W.WB.stkPush({
      phone:       phone,
      amount:      amount,
      booking_ref: bookingRef,
      guest_name:  guestName
    }).then(function (r) {
      btn.textContent = 'Waiting for PIN…';
      msg.textContent = r.message || 'Check your phone and enter your M-Pesa PIN.';

      /* Poll for payment confirmation */
      return W.WB.pollPayment(bookingRef, { interval: 3000, timeout: 90000 });
    }).then(function () {
      /* Paid ✓ */
      btn.style.background = '#16a34a';
      btn.style.opacity    = '1';
      btn.textContent      = '✓ Payment received';
      msg.style.color      = '#16a34a';
      msg.textContent      = 'Your payment was confirmed. We will contact you soon.';
      setTimeout(closeModal, 3500);
    }).catch(function (err) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = 'Try again';
      msg.style.color = 'var(--bad, #e03)';
      msg.textContent = err.message || 'Payment failed. Please try again.';
    });
  }

  /* ── page render ───────────────────────────────────────────────── */
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
                'Book &amp; Pay via M-Pesa</button>' +
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

      btn.disabled = true; btn.textContent = 'Submitting…';

      var totalAmount = (t.price_kes || 0) * g;

      W.WB.createBooking({
        tour_id:      t.id,
        tour_name:    t.name,
        guest_name:   f.guest_name.value.trim(),
        guest_phone:  f.guest_phone.value.trim(),
        guest_email:  f.guest_email.value.trim(),
        guests:       g,
        notes:        f.notes.value.trim(),
        base_amount:  t.price_kes || 0,
        total_amount: totalAmount
      }).then(function (r) {
        /* Replace form with confirmation + trigger payment if there's an amount */
        var guestPhone = f.guest_phone.value.trim();
        var guestName  = f.guest_name.value.trim();

        var payNote = totalAmount > 0
          ? '<p style="margin-top:10px;font-size:.9rem;color:var(--muted)">Opening payment…</p>'
          : '';

        f.parentNode.innerHTML =
          '<div class="glass wb-form-ok" style="border-radius:var(--r-lg)">' +
            '<b>Booking confirmed!</b>' +
            '<p>Your place has been reserved. We will be in touch to confirm details.</p>' +
            '<p>Reference</p><p class="wb-ref">' + e(r.ref) + '</p>' +
            payNote +
          '</div>';

        /* Auto-open payment modal if there's an amount to pay */
        if (totalAmount > 0) {
          setTimeout(function () {
            showPayModal(r.ref, guestPhone, guestName, totalAmount);
          }, 800);
        }
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Book & Pay via M-Pesa';
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
