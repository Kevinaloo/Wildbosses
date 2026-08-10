/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · Trip detail + booking + M-Pesa
   ─────────────────────────────────────────────────────────────────
   The booking panel is one clear decision at a time:
     who you are → how many of you → how you want to proceed.
   Price updates live as travellers change, so nobody is surprised
   by the number on the M-Pesa prompt.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';
  var e, T = null, state = { travellers: 1, intent: 'deposit' };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ksh(n) { return 'KES ' + Number(n || 0).toLocaleString('en-KE'); }

  function depositPct() { return Number(T && T.deposit_pct) || 30; }
  function unitPrice()  { return Number(T && T.price_kes) || 0; }
  function total()      { return unitPrice() * state.travellers; }
  function deposit()    { return Math.ceil(total() * depositPct() / 100); }
  function payNow()     {
    return state.intent === 'full'    ? total()
         : state.intent === 'deposit' ? deposit()
         : 0;
  }

  /* ── countdown ─────────────────────────────────────────────────── */
  function countBox(iso) {
    var c = W.WB.countdown(iso);
    if (!c)      return '<div class="wb-book-fact"><span>Departs</span><b>On request</b></div>';
    if (c.past)  return '<div class="wb-book-fact"><span>Departs</span><b>Departed</b></div>';
    return '<div class="wb-count" id="cd">' +
      '<div><b>' + c.d + '</b><i>days</i></div>' +
      '<div><b>' + pad(c.h) + '</b><i>hrs</i></div>' +
      '<div><b>' + pad(c.m) + '</b><i>min</i></div>' +
      '<div><b>' + pad(c.s) + '</b><i>sec</i></div></div>';
  }
  function tick() {
    if (!T || !T.departure_date) return;
    var box = D.getElementById('cd'); if (!box) return;
    var c = W.WB.countdown(T.departure_date); if (!c || c.past) return;
    var b = box.querySelectorAll('b');
    b[0].textContent = c.d;      b[1].textContent = pad(c.h);
    b[2].textContent = pad(c.m); b[3].textContent = pad(c.s);
  }

  /* ── the booking panel ─────────────────────────────────────────── */
  function bookingPanel() {
    var maxT = T.spots_left != null && T.spots_left > 0 ? T.spots_left : 1;
    var free = unitPrice() === 0;

    return '' +
    '<h2>Reserve your place</h2>' +
    '<form id="bookForm" class="glass wb-bookform" novalidate>' +

      /* who */
      '<div class="wb-fset">' +
        '<label class="wb-f"><span>Full name</span>' +
          '<input name="guest_name" required autocomplete="name" placeholder="As it appears on your ID"/></label>' +
        '<label class="wb-f"><span>M-Pesa phone</span>' +
          '<input name="guest_phone" required autocomplete="tel" inputmode="tel" ' +
            'placeholder="07xx xxx xxx"/></label>' +
        '<label class="wb-f"><span>Email <i>optional</i></span>' +
          '<input name="guest_email" type="email" autocomplete="email" ' +
            'placeholder="For your confirmation and itinerary"/></label>' +
      '</div>' +

      /* how many */
      '<div class="wb-fset">' +
        '<span class="wb-flabel">Travellers</span>' +
        '<div class="wb-stepper" role="group" aria-label="Number of travellers">' +
          '<button type="button" id="tMinus" aria-label="One fewer traveller">−</button>' +
          '<b id="tCount" aria-live="polite">1</b>' +
          '<button type="button" id="tPlus" aria-label="One more traveller">+</button>' +
          '<small id="tLeft">' + maxT + ' place' + (maxT === 1 ? '' : 's') + ' left</small>' +
        '</div>' +
      '</div>' +

      /* how you want to proceed */
      (free ? '' :
      '<div class="wb-fset">' +
        '<span class="wb-flabel">How would you like to proceed?</span>' +
        '<div class="wb-choices" id="intentGroup">' +

          '<label class="wb-choice is-on" data-intent="deposit">' +
            '<input type="radio" name="intent" value="deposit" checked/>' +
            '<span class="wb-choice-in">' +
              '<b>Pay a deposit</b>' +
              '<i>Hold your place now, settle the rest before departure</i>' +
              '<em id="amtDeposit">' + ksh(deposit()) + '</em>' +
            '</span>' +
          '</label>' +

          '<label class="wb-choice" data-intent="full">' +
            '<input type="radio" name="intent" value="full"/>' +
            '<span class="wb-choice-in">' +
              '<b>Pay in full</b>' +
              '<i>Everything settled today, nothing left to do</i>' +
              '<em id="amtFull">' + ksh(total()) + '</em>' +
            '</span>' +
          '</label>' +

          '<label class="wb-choice" data-intent="enquiry">' +
            '<input type="radio" name="intent" value="enquiry"/>' +
            '<span class="wb-choice-in">' +
              '<b>Enquire first</b>' +
              '<i>Ask a question — we will call you back, no payment</i>' +
              '<em>No payment</em>' +
            '</span>' +
          '</label>' +

        '</div>' +
      '</div>') +

      '<label class="wb-f"><span>Anything we should know <i>optional</i></span>' +
        '<textarea name="notes" rows="3" ' +
          'placeholder="Dietary needs, mobility, questions, who you are travelling with…"></textarea></label>' +

      /* running total */
      (free ? '' :
      '<div class="wb-summary" id="summary">' +
        '<div><span>' + ksh(unitPrice()) + ' × <b id="sT">1</b> traveller</span>' +
          '<b id="sTotal">' + ksh(total()) + '</b></div>' +
        '<div class="wb-summary-now"><span id="sNowLabel">Due today</span>' +
          '<b id="sNow">' + ksh(deposit()) + '</b></div>' +
      '</div>') +

      '<button class="wb-btn wb-btn-gold wb-btn-lg wb-submit" type="submit" id="bookBtn">' +
        (free ? 'Request this place' : 'Continue to M-Pesa · <span id="btnAmt">' + ksh(deposit()) + '</span>') +
      '</button>' +
      '<p class="wb-form-msg" id="bookMsg" role="status"></p>' +
      '<p class="wb-trust">Your place is held the moment payment clears. ' +
        'Full refund if we cancel the departure.</p>' +
    '</form>';
  }

  /* keep every number on screen agreeing with every other number */
  function refresh() {
    var free = unitPrice() === 0;
    var set = function (id, v) { var n = D.getElementById(id); if (n) n.textContent = v; };

    set('tCount', state.travellers);
    if (free) return;

    set('sT', state.travellers);
    set('sTotal', ksh(total()));
    set('amtDeposit', ksh(deposit()));
    set('amtFull', ksh(total()));

    var nowLabel = state.intent === 'enquiry' ? 'Due today' : 'Due today';
    set('sNowLabel', nowLabel);
    set('sNow', state.intent === 'enquiry' ? 'Nothing' : ksh(payNow()));

    var btn = D.getElementById('bookBtn');
    if (btn) {
      btn.innerHTML = state.intent === 'enquiry'
        ? 'Send my enquiry'
        : 'Continue to M-Pesa · <span id="btnAmt">' + ksh(payNow()) + '</span>';
    }
  }

  function wireForm() {
    var f = D.getElementById('bookForm');
    var maxT = T.spots_left != null && T.spots_left > 0 ? T.spots_left : 1;

    /* travellers stepper */
    var minus = D.getElementById('tMinus'), plus = D.getElementById('tPlus');
    if (minus) minus.addEventListener('click', function () {
      if (state.travellers > 1) { state.travellers--; refresh(); }
    });
    if (plus) plus.addEventListener('click', function () {
      if (state.travellers < maxT) { state.travellers++; refresh(); }
      else {
        var m = D.getElementById('bookMsg');
        m.className = 'wb-form-msg bad';
        m.textContent = 'That is every place left on this departure.';
      }
    });

    /* intent choices */
    var group = D.getElementById('intentGroup');
    if (group) group.addEventListener('change', function (ev) {
      if (ev.target.name !== 'intent') return;
      state.intent = ev.target.value;
      Array.prototype.forEach.call(group.querySelectorAll('.wb-choice'), function (c) {
        c.classList.toggle('is-on', c.getAttribute('data-intent') === state.intent);
      });
      refresh();
    });

    /* submit */
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = D.getElementById('bookBtn'), msg = D.getElementById('bookMsg');
      msg.className = 'wb-form-msg'; msg.textContent = '';

      var name  = f.guest_name.value.trim();
      var phone = f.guest_phone.value.trim();
      if (!name)  { msg.className = 'wb-form-msg bad'; msg.textContent = 'Please tell us your name.'; f.guest_name.focus(); return; }
      if (!phone) { msg.className = 'wb-form-msg bad'; msg.textContent = 'We need a phone number to reach you.'; f.guest_phone.focus(); return; }

      var prev = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Reserving…';

      W.WB.createBooking({
        tour_slug:   T.slug,
        guest_name:  name,
        guest_phone: phone,
        guest_email: f.guest_email.value.trim(),
        travellers:  state.travellers,
        intent:      unitPrice() === 0 ? 'enquiry' : state.intent,
        notes:       f.notes.value.trim()
      }).then(function (r) {
        if (r.intent === 'enquiry' || !r.pay_now) {
          done(r, false);
        } else {
          done(r, true);
          setTimeout(function () {
            showPayModal(r.ref, phone, name, r.pay_now, r.total, r.deposit);
          }, 500);
        }
      }).catch(function (err) {
        console.error('[WB] booking failed:', err);
        btn.disabled = false; btn.innerHTML = prev;
        msg.className = 'wb-form-msg bad';
        msg.textContent = err.message || 'That did not go through. Please try again.';
      });
    });
  }

  function done(r, paying) {
    var host = D.getElementById('bookForm');
    if (!host) return;
    host.outerHTML =
      '<div class="glass wb-done">' +
        '<div class="wb-done-tick">✓</div>' +
        '<b>' + (paying ? 'Place reserved' : 'Enquiry received') + '</b>' +
        '<p>' + (paying
          ? 'Complete payment on your phone to confirm it.'
          : 'We will call you back shortly on the number you gave us.') + '</p>' +
        '<p class="wb-done-ref">Reference<span>' + e(r.ref) + '</span></p>' +
        (paying ? '<button class="wb-btn wb-btn-ghost" type="button" id="reopenPay">' +
                    'Reopen payment</button>' : '') +
      '</div>';

    var re = D.getElementById('reopenPay');
    if (re) re.addEventListener('click', function () {
      showPayModal(r.ref, r._phone || '', r._name || '', r.pay_now, r.total, r.deposit);
    });
    if (re) { r._phone = r._phone; }
  }

  /* ── payment modal ─────────────────────────────────────────────── */
  function showPayModal(ref, phone, name, amount, totalAmt, depositAmt) {
    var old = D.getElementById('wb-pay'); if (old) old.remove();

    var ov = D.createElement('div');
    ov.id = 'wb-pay';
    ov.className = 'wb-modal';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Pay with M-Pesa');

    ov.innerHTML =
      '<div class="wb-modal-card glass">' +
        '<button class="wb-modal-x" id="payX" type="button" aria-label="Close">✕</button>' +

        '<div class="wb-pay-head">' +
          '<span class="wb-pay-badge">M-PESA</span>' +
          '<h3>Confirm your place</h3>' +
          '<p>Reference <b>' + e(ref) + '</b></p>' +
        '</div>' +

        '<div class="wb-pay-amt">' +
          '<span>Amount</span>' +
          '<b id="payAmt">' + ksh(amount) + '</b>' +
        '</div>' +

        '<label class="wb-f"><span>M-Pesa number</span>' +
          '<input id="payPhone" type="tel" inputmode="tel" value="' + e(phone) + '" ' +
            'placeholder="07xx xxx xxx"/></label>' +

        '<button class="wb-btn wb-btn-gold wb-btn-lg wb-pay-go" id="payGo" type="button">' +
          'Send prompt to my phone</button>' +

        '<div class="wb-pay-state" id="payState" role="status"></div>' +

        '<p class="wb-pay-foot">Safaricom will ask for your M-Pesa PIN on this number. ' +
          'We never see or store your PIN.</p>' +
      '</div>';

    D.body.appendChild(ov);
    D.body.classList.add('wb-locked');
    requestAnimationFrame(function () { ov.classList.add('is-in'); });

    function close() {
      ov.classList.remove('is-in');
      D.body.classList.remove('wb-locked');
      setTimeout(function () { ov.remove(); }, 200);
    }
    D.getElementById('payX').addEventListener('click', close);
    ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
    D.addEventListener('keydown', function esc(ev) {
      if (ev.key === 'Escape' && D.getElementById('wb-pay')) { close(); D.removeEventListener('keydown', esc); }
    });

    D.getElementById('payGo').addEventListener('click', function () {
      pay(ref, name, amount, close);
    });
    setTimeout(function () { var i = D.getElementById('payPhone'); if (i) i.focus(); }, 260);
  }

  function pay(ref, name, amount, close) {
    var go    = D.getElementById('payGo');
    var st    = D.getElementById('payState');
    var phone = (D.getElementById('payPhone') || {}).value || '';

    phone = phone.trim();
    if (!phone) {
      st.className = 'wb-pay-state is-bad';
      st.textContent = 'Please enter the number to charge.';
      return;
    }

    go.disabled = true;
    go.textContent = 'Sending…';
    st.className = 'wb-pay-state is-wait';
    st.innerHTML = '<span class="wb-spin"></span> Asking Safaricom to prompt your phone…';

    W.WB.stkPush({
      phone: phone, amount: amount, booking_ref: ref, guest_name: name
    }).then(function () {
      go.textContent = 'Waiting for your PIN';
      st.innerHTML = '<span class="wb-spin"></span> Check your phone and enter your M-Pesa PIN.';
      return W.WB.pollPayment(ref, { interval: 3000, timeout: 120000 });
    }).then(function () {
      go.classList.add('is-paid');
      go.textContent = '✓ Payment received';
      st.className = 'wb-pay-state is-good';
      st.textContent = 'You are confirmed. A receipt is on its way.';
      setTimeout(close, 3200);
    }).catch(function (err) {
      go.disabled = false;
      go.textContent = 'Try again';
      st.className = 'wb-pay-state is-bad';
      st.textContent = err.message || 'That did not complete. You can try again.';
    });
  }

  /* ── page ──────────────────────────────────────────────────────── */
  function render(t) {
    T = t;
    state.travellers = 1;
    state.intent = (Number(t.price_kes) || 0) === 0 ? 'enquiry' : 'deposit';

    var w   = W.WBSite.whenLabel(t.departure_date);
    var p   = W.WBSite.money(t.price_kes);
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
            bookingPanel() +
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
    setInterval(tick, 1000);
    wireForm();
    refresh();
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
