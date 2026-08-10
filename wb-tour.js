/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · Trip detail + booking + M-Pesa
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  var esc, T = null;
  /* state.customAmount: null = use auto-calculated deposit; number = user override */
  var state = { travellers: 1, intent: 'deposit', customAmount: null };

  function pad(n)  { return n < 10 ? '0' + n : '' + n; }
  function ksh(n)  { return 'KES\u00a0' + Number(n || 0).toLocaleString('en-KE'); }
  function num(n)  { return Number(n || 0); }

  function depositPct()  { return num(T && T.deposit_pct) || 30; }
  function unitPrice()   { return num(T && T.price_kes); }
  function total()       { return unitPrice() * state.travellers; }
  function minDeposit()  { return Math.ceil(total() * depositPct() / 100); }

  /* What goes to M-Pesa */
  function payNow() {
    if (state.intent === 'enquiry') return 0;
    if (state.intent === 'full')    return total();
    /* deposit: use custom if set and valid, else minimum */
    var c = state.customAmount;
    if (c && c >= 1 && c <= total()) return Math.round(c);
    return minDeposit();
  }

  /* Percentage of total the custom/auto amount represents */
  function payPct() {
    var t = total(); if (!t) return 0;
    return Math.round(payNow() / t * 100);
  }

  /* ── countdown ─────────────────────────────────────────────────── */
  function countBox(iso) {
    var c = W.WB.countdown(iso);
    if (!c)     return '<div class="wb-book-fact"><span>Departs</span><b>On request</b></div>';
    if (c.past) return '<div class="wb-book-fact"><span>Departs</span><b>Departed</b></div>';
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
    b[0].textContent = c.d;       b[1].textContent = pad(c.h);
    b[2].textContent = pad(c.m);  b[3].textContent = pad(c.s);
  }

  /* ── booking panel HTML ─────────────────────────────────────────── */
  function bookingPanel() {
    var maxT = T.spots_left != null && T.spots_left > 0 ? T.spots_left : 8;
    var free = unitPrice() === 0;
    var minDep = minDeposit();

    return '' +
    '<h2>Reserve your place</h2>' +
    '<form id="bookForm" class="glass wb-bookform" novalidate>' +

      /* who */
      '<div class="wb-fset">' +
        '<label class="wb-f"><span>Full name</span>' +
          '<input name="guest_name" required autocomplete="name" ' +
            'placeholder="As it appears on your ID"/></label>' +
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
          '<button type="button" id="tMinus" aria-label="One fewer">−</button>' +
          '<b id="tCount" aria-live="polite">1</b>' +
          '<button type="button" id="tPlus"  aria-label="One more">+</button>' +
          '<small id="tLeft">' + maxT + ' place' + (maxT === 1 ? '' : 's') + ' left</small>' +
        '</div>' +
      '</div>' +

      /* how to proceed */
      (free ? '' :
      '<div class="wb-fset">' +
        '<span class="wb-flabel">How would you like to proceed?</span>' +
        '<div class="wb-choices" id="intentGroup">' +

          '<label class="wb-choice is-on" data-intent="deposit">' +
            '<input type="radio" name="intent" value="deposit" checked/>' +
            '<span class="wb-choice-in">' +
              '<b>Pay a deposit</b>' +
              '<i>Hold your place now, settle the rest before departure</i>' +
              '<em id="amtDeposit">' + ksh(minDep) + '</em>' +
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

        /* ── custom amount block (shown only when deposit selected) ── */
        '<div class="wb-custom-amt" id="customAmtBlock">' +
          '<div class="wb-custom-amt-head">' +
            '<span class="wb-flabel">Amount to pay now</span>' +
            '<span class="wb-custom-pct" id="customPct">' + depositPct() + '% of total</span>' +
          '</div>' +
          '<div class="wb-custom-input-wrap">' +
            '<span class="wb-custom-prefix">KES</span>' +
            '<input id="customAmtInput" type="number" inputmode="numeric" min="1" ' +
              'max="' + total() + '" step="100" ' +
              'value="' + minDep + '" ' +
              'aria-label="Amount to pay now in KES"/>' +
          '</div>' +
          '<div class="wb-custom-range-wrap">' +
            '<input id="customAmtRange" type="range" min="1" max="' + total() + '" ' +
              'step="100" value="' + minDep + '" aria-label="Drag to set amount"/>' +
            '<div class="wb-custom-range-labels">' +
              '<span>KES 1</span>' +
              '<span id="rangeFullLabel">' + ksh(total()) + ' (full)</span>' +
            '</div>' +
          '</div>' +
          '<p class="wb-custom-hint" id="customHint">' +
            'Minimum deposit is ' + ksh(minDep) + ' (' + depositPct() + '%). ' +
            'You can pay any amount — even KES 1 to hold your place.' +
          '</p>' +
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
        '<div class="wb-summary-now"><span>Due today</span>' +
          '<b id="sNow">' + ksh(minDep) + '</b></div>' +
      '</div>') +

      '<button class="wb-btn wb-btn-gold wb-btn-lg wb-submit" type="submit" id="bookBtn">' +
        (free ? 'Request this place'
              : 'Continue to M-Pesa · <span id="btnAmt">' + ksh(minDep) + '</span>') +
      '</button>' +
      '<p class="wb-form-msg" id="bookMsg" role="status"></p>' +
      '<p class="wb-trust">Your place is held the moment payment clears. ' +
        'Full refund if we cancel the departure.</p>' +
    '</form>';
  }

  /* ── keep every number in sync ─────────────────────────────────── */
  function refresh() {
    var free = unitPrice() === 0;
    function set(id, v) { var n = D.getElementById(id); if (n) n.textContent = v; }

    set('tCount', state.travellers);
    if (free) return;

    set('sT',        state.travellers);
    set('sTotal',    ksh(total()));
    set('amtDeposit',ksh(state.intent === 'deposit' ? payNow() : minDeposit()));
    set('amtFull',   ksh(total()));
    set('sNow',      state.intent === 'enquiry' ? 'Nothing' : ksh(payNow()));

    /* custom amount block visibility */
    var block = D.getElementById('customAmtBlock');
    if (block) {
      block.style.display = state.intent === 'deposit' ? '' : 'none';
    }

    /* update percentage label */
    set('customPct', payPct() + '% of total');

    /* sync range max when travellers change */
    var range = D.getElementById('customAmtRange');
    var inp   = D.getElementById('customAmtInput');
    var full  = D.getElementById('rangeFullLabel');
    if (range) {
      range.max = total();
      /* clamp custom amount to new total */
      if (state.customAmount && state.customAmount > total()) {
        state.customAmount = total();
        range.value = total();
        if (inp) inp.value = total();
      }
      range.max = total();
    }
    if (inp)  inp.max = total();
    if (full) full.textContent = ksh(total()) + ' (full)';

    /* update hint */
    var hint = D.getElementById('customHint');
    if (hint) {
      hint.textContent = 'Minimum suggested deposit is ' + ksh(minDeposit()) +
        ' (' + depositPct() + '%). You can pay any amount — even KES 1 to hold your place.';
    }

    var btn = D.getElementById('bookBtn');
    if (btn) {
      btn.innerHTML = state.intent === 'enquiry'
        ? 'Send my enquiry'
        : 'Continue to M-Pesa · <span id="btnAmt">' + ksh(payNow()) + '</span>';
    }
  }

  /* ── wire custom amount input + range slider ─────────────────────── */
  function wireCustomAmount() {
    var inp   = D.getElementById('customAmtInput');
    var range = D.getElementById('customAmtRange');
    if (!inp || !range) return;

    function applyAmount(raw) {
      var v = Math.max(1, Math.min(Math.round(Number(raw) || 1), total()));
      state.customAmount = v;
      inp.value   = v;
      range.value = v;
      refresh();
    }

    /* Number input → update slider + state */
    inp.addEventListener('input', function () {
      applyAmount(inp.value);
    });
    inp.addEventListener('change', function () {
      applyAmount(inp.value);
    });

    /* Slider → update number input + state */
    range.addEventListener('input', function () {
      applyAmount(range.value);
    });
  }

  /* ── wire up the form ──────────────────────────────────────────── */
  function wireForm() {
    var f    = D.getElementById('bookForm');
    var maxT = T.spots_left != null && T.spots_left > 0 ? T.spots_left : 8;

    /* travellers stepper */
    var minus = D.getElementById('tMinus'), plus = D.getElementById('tPlus');
    if (minus) minus.addEventListener('click', function () {
      if (state.travellers > 1) { state.travellers--; refresh(); }
    });
    if (plus) plus.addEventListener('click', function () {
      var msg = D.getElementById('bookMsg');
      if (state.travellers < maxT) { state.travellers++; refresh(); msg.textContent = ''; }
      else {
        msg.className   = 'wb-form-msg bad';
        msg.textContent = 'That is every place left on this departure.';
      }
    });

    /* intent selector */
    var group = D.getElementById('intentGroup');
    if (group) group.addEventListener('change', function (ev) {
      if (ev.target.name !== 'intent') return;
      state.intent = ev.target.value;
      /* reset custom amount when switching intent */
      if (state.intent !== 'deposit') state.customAmount = null;
      Array.prototype.forEach.call(group.querySelectorAll('.wb-choice'), function (c) {
        c.classList.toggle('is-on', c.getAttribute('data-intent') === state.intent);
      });
      refresh();
    });

    /* wire custom amount */
    wireCustomAmount();

    /* submit */
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = D.getElementById('bookBtn');
      var msg = D.getElementById('bookMsg');
      msg.className = 'wb-form-msg'; msg.textContent = '';

      var name  = f.guest_name.value.trim();
      var phone = f.guest_phone.value.trim();

      if (!name)  { msg.className = 'wb-form-msg bad'; msg.textContent = 'Please tell us your name.';         f.guest_name.focus();  return; }
      if (!phone) { msg.className = 'wb-form-msg bad'; msg.textContent = 'We need an M-Pesa phone number.';  f.guest_phone.focus(); return; }

      var prevHtml    = btn.innerHTML;
      btn.disabled    = true;
      btn.textContent = 'Reserving…';

      W.WB.createBooking({
        tour_slug:   T.slug,
        guest_name:  name,
        guest_phone: phone,
        guest_email: f.guest_email ? f.guest_email.value.trim() : '',
        travellers:  state.travellers,
        intent:      unitPrice() === 0 ? 'enquiry' : state.intent,
        notes:       f.notes ? f.notes.value.trim() : '',
        custom_amount: state.customAmount  /* sent but server uses its own min-check */
      }).then(function (r) {
        /* Use the user's chosen amount, not necessarily server's deposit */
        var chargeNow = (state.intent === 'deposit' && state.customAmount)
          ? Math.round(state.customAmount)
          : r.pay_now;

        if (r.intent === 'enquiry' || !chargeNow) {
          replacePanelWithDone(r, false, phone, name);
        } else {
          replacePanelWithDone(r, true, phone, name);
          setTimeout(function () {
            showPayModal({
              ref:    r.ref,
              phone:  phone,
              name:   name,
              amount: chargeNow,
              total:  r.total,
              intent: r.intent
            });
          }, 400);
        }
      }).catch(function (err) {
        console.error('[WB] booking error:', err);
        btn.disabled  = false;
        btn.innerHTML = prevHtml;
        msg.className   = 'wb-form-msg bad';
        msg.textContent = err.message || 'That did not go through. Please try again.';
      });
    });
  }

  /* ── done panel ─────────────────────────────────────────────────── */
  function replacePanelWithDone(r, paying, phone, name) {
    var host = D.getElementById('bookForm');
    if (!host) return;
    r._phone = phone || '';
    r._name  = name  || '';

    host.outerHTML =
      '<div class="glass wb-done">' +
        '<div class="wb-done-tick">✓</div>' +
        '<b>' + (paying ? 'Place reserved!' : 'Enquiry received!') + '</b>' +
        '<p>' + (paying
          ? 'Complete payment on your phone to confirm your spot.'
          : 'We\'ll call you back shortly on the number you gave us.') + '</p>' +
        '<p class="wb-done-ref">Reference&nbsp;<span>' + esc(r.ref) + '</span></p>' +
        (paying
          ? '<button class="wb-btn wb-btn-ghost" type="button" id="reopenPay">Reopen payment prompt</button>'
          : '') +
        '<a class="wb-btn wb-btn-ghost" href="https://wa.me/254796818671" ' +
          'target="_blank" rel="noopener">Ask on WhatsApp</a>' +
      '</div>';

    var re = D.getElementById('reopenPay');
    if (re) re.addEventListener('click', function () {
      showPayModal({ ref: r.ref, phone: r._phone, name: r._name, amount: r.pay_now, total: r.total, intent: r.intent });
    });
  }

  /* ── payment modal ─────────────────────────────────────────────── */
  function showPayModal(opts) {
    var old = D.getElementById('wb-pay'); if (old) old.remove();

    var label = opts.intent === 'full' ? 'Full payment' : 'Deposit';

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
          '<p>Reference&nbsp;<b>' + esc(opts.ref) + '</b></p>' +
        '</div>' +

        '<div class="wb-pay-breakdown">' +
          '<div class="wb-pay-row">' +
            '<span>' + esc(label) + '</span>' +
            '<b id="modalPayAmt">' + ksh(opts.amount) + '</b>' +
          '</div>' +
          (opts.total && opts.intent === 'deposit'
            ? '<div class="wb-pay-row wb-pay-row-muted"><span>Total trip cost</span><span>' + ksh(opts.total) + '</span></div>'
            : '') +
        '</div>' +

        /* editable amount inside modal too */
        '<div class="wb-modal-custom">' +
          '<label class="wb-f">' +
            '<span>Adjust amount <i>optional</i></span>' +
            '<div class="wb-custom-input-wrap">' +
              '<span class="wb-custom-prefix">KES</span>' +
              '<input id="modalAmtInput" type="number" inputmode="numeric" ' +
                'min="1" max="' + (opts.total || opts.amount) + '" step="100" ' +
                'value="' + opts.amount + '"/>' +
            '</div>' +
          '</label>' +
        '</div>' +

        '<label class="wb-f">' +
          '<span>M-Pesa number to charge</span>' +
          '<input id="payPhone" type="tel" inputmode="tel" ' +
            'value="' + esc(opts.phone || '') + '" placeholder="07xx xxx xxx"/>' +
        '</label>' +

        '<button class="wb-btn wb-btn-gold wb-btn-lg wb-pay-go" id="payGo" type="button">' +
          'Send prompt · <span id="payGoAmt">' + ksh(opts.amount) + '</span>' +
        '</button>' +

        '<div class="wb-pay-state" id="payState" role="status"></div>' +

        '<p class="wb-pay-foot">Safaricom will ask for your M-Pesa PIN on this number. ' +
          'We never see or store your PIN.</p>' +
      '</div>';

    D.body.appendChild(ov);
    D.body.classList.add('wb-locked');
    requestAnimationFrame(function () { ov.classList.add('is-in'); });

    /* wire modal amount input */
    var mAmt = D.getElementById('modalAmtInput');
    if (mAmt) mAmt.addEventListener('input', function () {
      var v = Math.max(1, Math.round(Number(mAmt.value) || 1));
      var display = D.getElementById('modalPayAmt');
      var goAmt   = D.getElementById('payGoAmt');
      if (display) display.textContent = ksh(v);
      if (goAmt)   goAmt.textContent   = ksh(v);
    });

    function close() {
      ov.classList.remove('is-in');
      D.body.classList.remove('wb-locked');
      setTimeout(function () { if (ov.parentNode) ov.remove(); }, 220);
    }
    D.getElementById('payX').addEventListener('click', close);
    ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });

    function escKey(ev) {
      if (ev.key === 'Escape' && D.getElementById('wb-pay')) { close(); D.removeEventListener('keydown', escKey); }
    }
    D.addEventListener('keydown', escKey);

    D.getElementById('payGo').addEventListener('click', function () {
      /* use the (possibly adjusted) modal amount */
      var finalAmt = mAmt ? Math.max(1, Math.round(Number(mAmt.value) || opts.amount)) : opts.amount;
      runPayment(opts.ref, opts.name, finalAmt, close);
    });

    setTimeout(function () { var i = D.getElementById('payPhone'); if (i) { i.focus(); i.select(); } }, 260);
  }

  /* ── STK push + poll ─────────────────────────────────────────────── */
  function runPayment(ref, name, amount, closeFn) {
    var go    = D.getElementById('payGo');
    var st    = D.getElementById('payState');
    var phoneEl = D.getElementById('payPhone');
    var phone = phoneEl ? phoneEl.value.trim() : '';

    if (!phone) {
      st.className = 'wb-pay-state is-bad';
      st.textContent = 'Please enter the M-Pesa number to charge.';
      if (phoneEl) phoneEl.focus();
      return;
    }

    /* Basic Kenyan format check */
    var cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0'))    cleaned = '254' + cleaned.slice(1);
    if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
    if (cleaned.length !== 12) {
      st.className = 'wb-pay-state is-bad';
      st.textContent = 'Please use a valid Kenyan M-Pesa number (e.g. 0712 345 678).';
      if (phoneEl) phoneEl.focus();
      return;
    }

    go.disabled    = true;
    go.innerHTML   = 'Sending…';
    st.className   = 'wb-pay-state is-wait';
    st.innerHTML   = '<span class="wb-spin"></span> Contacting Safaricom…';

    W.WB.stkPush({ phone: phone, amount: amount, booking_ref: ref, guest_name: name })
    .then(function () {
      go.textContent = '⏳ Waiting for your PIN…';
      st.innerHTML   = '<span class="wb-spin"></span> Check your phone and enter your M-Pesa PIN. Times out in 2 mins.';
      return W.WB.pollPayment(ref, { interval: 3000, timeout: 120000 });
    })
    .then(function () {
      go.disabled    = false;
      go.className   += ' is-paid';
      go.textContent = '✓ Payment confirmed!';
      st.className   = 'wb-pay-state is-good';
      st.textContent = 'Your place is confirmed. A receipt is on its way.';
      setTimeout(function () { if (closeFn) closeFn(); }, 3500);
    })
    .catch(function (err) {
      go.disabled    = false;
      go.innerHTML   = 'Try again · <span id="payGoAmt">' + ksh(amount) + '</span>';
      st.className   = 'wb-pay-state is-bad';
      var msg = err.message || 'That did not complete.';
      if (/timed out/i.test(msg))                  st.textContent = 'The prompt timed out. Press "Try again" to send a new one.';
      else if (/declined|failed/i.test(msg))       st.textContent = 'Declined by M-Pesa. Check your balance and try again.';
      else if (/phone|invalid/i.test(msg))         st.textContent = msg;
      else                                          st.textContent = msg + ' — you can try again.';
    });
  }

  /* ── page render ───────────────────────────────────────────────── */
  function render(t) {
    T = t;
    state.travellers   = 1;
    state.customAmount = null;
    state.intent       = (num(t.price_kes) === 0) ? 'enquiry' : 'deposit';

    var w   = W.WBSite.whenLabel(t.departure_date);
    var p   = W.WBSite.money(t.price_kes);
    var inc = (t.includes || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('');

    D.getElementById('tour-root').innerHTML =
      '<div class="wb-wrap" style="padding-top:26px;padding-bottom:70px">' +
        '<div class="wb-trip-hero">' +
          (t.image ? '<img src="' + esc(t.image) + '" alt="' + esc(t.name) + '"/>' : '') +
          '<div class="wb-trip-hero-in"><h1>' + esc(t.name) + '</h1>' +
          (t.subtitle ? '<p>' + esc(t.subtitle) + '</p>' : '') + '</div>' +
        '</div>' +
        '<div class="wb-trip">' +
          '<div class="wb-trip-body">' +
            (t.description ? '<h2>About this trip</h2><p>' + esc(t.description) + '</p>' : '') +
            (inc ? '<h2>What is included</h2><ul class="wb-inc">' + inc + '</ul>' : '') +
            bookingPanel() +
          '</div>' +
          '<aside class="wb-book glass">' +
            '<div class="wb-book-price">' + esc(p.main) +
              (p.sub ? '<small>' + esc(p.sub) + '</small>' : '') + '</div>' +
            countBox(t.departure_date) +
            '<div class="wb-book-facts">' +
              '<div class="wb-book-fact"><span>Departs</span><b>'     + esc(w.main)       + '</b></div>' +
              (t.duration ? '<div class="wb-book-fact"><span>Length</span><b>' + esc(t.duration) + '</b></div>' : '') +
              '<div class="wb-book-fact"><span>Destination</span><b>' + esc(t.destination) + '</b></div>' +
              '<div class="wb-book-fact"><span>Places left</span><b>' + (t.spots_left > 0 ? t.spots_left : 'Full') + '</b></div>' +
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
    esc = W.WBSite.esc;
    var slug = new URLSearchParams(location.search).get('t');
    if (!slug) { location.replace('/tours.html'); return; }
    W.WB.tourBySlug(slug).then(function (t) {
      if (!t) {
        D.getElementById('tour-root').innerHTML =
          '<div class="wb-wrap" style="padding:80px 0"><div class="wb-empty">' +
          '<b>Trip not found</b>It may have closed. ' +
          '<a href="/tours.html" style="color:var(--gold)">See all trips</a></div></div>';
        return;
      }
      render(t);
    }).catch(function (err) {
      console.error('[WB] init error:', err);
      D.getElementById('tour-root').innerHTML =
        '<div class="wb-wrap" style="padding:80px 0"><div class="wb-empty">' +
        '<b>Could not load trip</b>Please refresh or ' +
        '<a href="https://wa.me/254796818671" target="_blank" rel="noopener">message us on WhatsApp</a>.' +
        '</div></div>';
    });
  }

  D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', init) : init();
})(window, document);
