/* ═══════════════════════════════════════════════════════════════════
   CABANA × WILDBOSSES INTEGRATION MODULE  v1.0
   ─────────────────────────────────────────────────────────────────
   Drop this ONE script into Cabana's tours.html (or any page).
   It auto-renders a Wildbosses section that looks completely native
   to Cabana — same fonts, same card styles, same booking flow.

   USAGE in Cabana:
     <script src="https://wildbosses.com/wildbosses-api.js"></script>
     <script src="https://wildbosses.com/cabana-wb-integration.js"></script>
     <div id="wb-partner-section"></div>

   WHAT IT DOES:
     1. Reads tours from WildbossesAPI (Wildbosses controls the data)
     2. Renders them in Cabana's native card style
     3. Booking modal opens inside Cabana — user never leaves Cabana
     4. Payment goes through Cabana's ApatmentoPay (M-Pesa STK push)
     5. On success: stores booking in Cabana's Supabase + notifies Wildbosses via WhatsApp
     6. Cabana's admin dashboard shows payout owed to Wildbosses

   TO REMOVE INTEGRATION: delete the two <script> tags. Zero residue.
   ═══════════════════════════════════════════════════════════════════ */

(function (W, D) {
  'use strict';
  if (W.__wbIntegration) return;
  W.__wbIntegration = true;

  /* ── Wait for WildbossesAPI to be ready ── */
  function whenReady(fn) {
    if (W.WildbossesAPI) { fn(); return; }
    var attempts = 0;
    var poll = setInterval(function() {
      attempts++;
      if (W.WildbossesAPI) { clearInterval(poll); fn(); return; }
      if (attempts > 20) { clearInterval(poll); console.warn('[Cabana×WB] WildbossesAPI not found'); }
    }, 150);
  }

  /* ═══════════════════════════════════════
     CABANA-NATIVE STYLES
     Matches Cabana's purple+dark palette
     ═══════════════════════════════════════ */
  var style = D.createElement('style');
  style.textContent = [
    /* section wrapper */
    '#wb-partner-section{margin:32px 0;font-family:"Space Grotesk","Inter",system-ui,sans-serif;}',

    /* section header */
    '.wb-sec-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px;}',
    '.wb-sec-badge{display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#6D28FF;padding:5px 12px;border-radius:100px;background:rgba(109,40,255,.09);border:1px solid rgba(109,40,255,.18);}',
    '.wb-sec-badge-dot{width:5px;height:5px;border-radius:50%;background:#6D28FF;animation:wbBdot 2s ease infinite;}',
    '@keyframes wbBdot{0%,100%{opacity:1}50%{opacity:.3}}',
    '.wb-sec-title{font-size:clamp(18px,2.8vw,26px);font-weight:700;color:#0F1117;letter-spacing:-.025em;margin-top:8px;}',
    '.wb-sec-title em{font-style:normal;background:linear-gradient(110deg,#6D28FF,#4F6DFF);-webkit-background-clip:text;background-clip:text;color:transparent;}',
    '.wb-sec-sub{font-size:13.5px;color:#5A5E70;margin-top:4px;}',
    '.wb-sec-link{font-size:13px;font-weight:600;color:#6D28FF;text-decoration:none;display:flex;align-items:center;gap:5px;white-space:nowrap;padding:9px 18px;border-radius:100px;border:1.5px solid rgba(109,40,255,.22);transition:all .22s;}',
    '.wb-sec-link:hover{background:#6D28FF;color:#fff;}',

    /* card grid */
    '.wb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;}',
    '@media(max-width:640px){.wb-grid{grid-template-columns:repeat(2,1fr);gap:11px;}}',
    '@media(max-width:400px){.wb-grid{grid-template-columns:1fr;}}',

    /* tour card — Cabana native style */
    '.wb-card{border-radius:18px;overflow:hidden;background:#fff;border:1px solid rgba(15,17,23,.08);cursor:pointer;transition:all .38s cubic-bezier(.22,1,.36,1);}',
    '.wb-card:hover{transform:translateY(-6px);box-shadow:0 20px 56px rgba(15,17,23,.12);border-color:transparent;}',
    '.wb-img{position:relative;height:196px;overflow:hidden;background:#F0EFF8;}',
    '.wb-img img{width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.22,1,.36,1);}',
    '.wb-card:hover .wb-img img{transform:scale(1.06);}',
    '.wb-img-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(15,17,23,.65) 0%,transparent 55%);}',

    /* card badges */
    '.wb-badge{position:absolute;top:11px;left:11px;font-size:10px;font-weight:700;padding:4px 10px;border-radius:100px;backdrop-filter:blur(8px);letter-spacing:.04em;}',
    '.wb-badge-crit{background:rgba(220,38,38,.90);color:#fff;}',
    '.wb-badge-high{background:rgba(200,138,0,.90);color:#fff;}',
    '.wb-badge-norm{background:rgba(109,40,255,.85);color:#fff;}',
    '.wb-partner-badge{position:absolute;bottom:10px;left:10px;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:100px;background:rgba(15,17,23,.72);color:rgba(255,255,255,.75);backdrop-filter:blur(6px);}',
    '.wb-rating{position:absolute;bottom:10px;right:10px;display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:100px;background:rgba(15,17,23,.72);color:#fff;font-size:10px;font-weight:600;}',

    /* card body */
    '.wb-body{padding:14px 16px 16px;}',
    '.wb-cat{font-size:10px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:#6D28FF;margin-bottom:6px;}',
    '.wb-name{font-size:15.5px;font-weight:700;color:#0F1117;margin-bottom:8px;line-height:1.25;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.wb-meta{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;}',
    '.wb-pill{font-size:10px;color:#5A5E70;padding:3px 8px;border-radius:100px;background:#F7F6F2;border:1px solid rgba(15,17,23,.07);}',
    '.wb-pill.hot{background:rgba(220,38,38,.07);border-color:rgba(220,38,38,.15);color:#DC2626;font-weight:600;}',
    '.wb-foot{display:flex;align-items:flex-end;justify-content:space-between;padding-top:12px;border-top:1px solid rgba(15,17,23,.07);}',
    '.wb-price-lbl{font-size:9.5px;color:#9499AD;margin-bottom:2px;}',
    '.wb-price{font-size:19px;font-weight:700;color:#0F1117;letter-spacing:-.025em;}',
    '.wb-price.free{color:#0D9467;font-size:15px;}',
    '.wb-price-per{font-size:10.5px;color:#9499AD;}',
    '.wb-price-dep{font-size:10px;color:#C48A00;font-weight:600;margin-top:2px;}',
    '.wb-cta{padding:9px 18px;border-radius:100px;background:linear-gradient(135deg,#6D28FF,#4F6DFF);color:#fff;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:all .22s;white-space:nowrap;box-shadow:0 4px 14px rgba(109,40,255,.30);letter-spacing:-.01em;}',
    '.wb-cta:hover{filter:brightness(1.10);transform:translateY(-1px);}',
    '.wb-cta.dep{background:linear-gradient(135deg,#DCA318,#D44010);box-shadow:0 4px 14px rgba(200,138,0,.30);}',

    /* BOOKING MODAL — Cabana native */
    '#wb-modal-overlay{position:fixed;inset:0;z-index:9600;background:rgba(15,17,23,.65);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:0;opacity:0;visibility:hidden;transition:all .34s;}',
    '@media(min-width:640px){#wb-modal-overlay{align-items:center;padding:24px;}}',
    '#wb-modal-overlay.open{opacity:1;visibility:visible;}',
    '#wb-modal-box{width:100%;max-width:580px;background:#fff;border-radius:22px 22px 0 0;max-height:92vh;overflow-y:auto;transform:translateY(48px);opacity:0;transition:all .46s cubic-bezier(.22,1,.36,1);}',
    '@media(min-width:640px){#wb-modal-box{border-radius:22px;transform:translateY(20px);}}',
    '#wb-modal-overlay.open #wb-modal-box{transform:none;opacity:1;}',
    '.wbm-img{height:220px;position:relative;overflow:hidden;}',
    '.wbm-img img{width:100%;height:100%;object-fit:cover;}',
    '.wbm-img-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(15,17,23,.72) 0%,transparent 55%);}',
    '.wbm-x{position:absolute;top:13px;right:13px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#0F1117;transition:transform .2s;}',
    '.wbm-x:hover{transform:scale(1.08)rotate(90deg);}',
    '.wbm-partner-tag{position:absolute;bottom:12px;left:12px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 11px;border-radius:100px;background:rgba(15,17,23,.78);color:rgba(255,255,255,.7);backdrop-filter:blur(6px);}',
    '.wbm-body{padding:22px 26px;}',
    '@media(max-width:480px){.wbm-body{padding:17px 17px;}}',
    '.wbm-eye{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6D28FF;margin-bottom:7px;}',
    '.wbm-title{font-size:clamp(18px,2.8vw,24px);font-weight:700;color:#0F1117;margin-bottom:13px;letter-spacing:-.025em;line-height:1.2;}',
    '.wbm-quick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}',
    '.wbm-q{padding:10px 12px;border-radius:12px;background:#F7F6F2;border:1px solid rgba(15,17,23,.07);}',
    '.wbm-ql{font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#9499AD;margin-bottom:3px;}',
    '.wbm-qv{font-size:13px;font-weight:700;color:#0F1117;letter-spacing:-.015em;}',
    '.wbm-urg{display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:12px;background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.15);margin-bottom:13px;}',
    '.wbm-urg-txt{font-size:12.5px;color:#DC2626;font-weight:600;}',

    /* booking form */
    '.wbm-form{display:flex;flex-direction:column;gap:11px;margin-bottom:16px;}',
    '.wbm-field{display:flex;flex-direction:column;gap:5px;}',
    '.wbm-label{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5A5E70;}',
    '.wbm-input,.wbm-select{padding:12px 14px;border-radius:12px;border:1.5px solid rgba(15,17,23,.12);background:#fff;font-family:"Space Grotesk","Inter",sans-serif;font-size:14px;color:#0F1117;outline:none;transition:border-color .2s;}',
    '.wbm-input:focus,.wbm-select:focus{border-color:#6D28FF;box-shadow:0 0 0 3px rgba(109,40,255,.10);}',
    '.wbm-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
    '@media(max-width:440px){.wbm-row{grid-template-columns:1fr;}}',

    /* pricing summary */
    '.wbm-pricing{background:#F7F6F2;border-radius:14px;padding:14px 16px;margin-bottom:14px;}',
    '.wbm-p-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:13px;color:#5A5E70;}',
    '.wbm-p-row:last-child{margin-bottom:0;font-weight:700;color:#0F1117;font-size:15px;border-top:1px solid rgba(15,17,23,.09);padding-top:8px;margin-top:6px;}',
    '.wbm-p-fee{display:flex;align-items:center;gap:5px;}',
    '.wbm-p-fee-tip{font-size:9.5px;font-weight:600;padding:2px 7px;border-radius:100px;background:rgba(109,40,255,.09);color:#6D28FF;}',
    '.wbm-p-note{font-size:11px;color:#9499AD;margin-top:8px;line-height:1.55;}',
    '.wbm-p-payout{font-size:11px;color:#0D9467;font-weight:600;margin-top:4px;}',

    /* error */
    '.wbm-err{font-size:12px;color:#DC2626;margin-top:6px;display:none;}',
    '.wbm-err.show{display:block;}',

    /* sticky CTA */
    '.wbm-cta-box{position:sticky;bottom:0;background:#fff;border-top:1px solid rgba(15,17,23,.08);padding:14px 26px 18px;margin:0 -26px -22px;}',
    '@media(max-width:480px){.wbm-cta-box{margin:0 -17px -17px;padding:12px 17px 16px;}}',
    '.wbm-book{width:100%;padding:14px;border-radius:13px;background:linear-gradient(135deg,#6D28FF,#4F6DFF);color:#fff;font-family:"Space Grotesk","Inter",sans-serif;font-weight:700;font-size:15px;border:none;cursor:pointer;transition:all .26s;box-shadow:0 6px 20px rgba(109,40,255,.28);letter-spacing:-.02em;}',
    '.wbm-book:hover{filter:brightness(1.08);transform:translateY(-2px);}',
    '.wbm-book:disabled{opacity:.55;cursor:not-allowed;transform:none;}',
    '.wbm-book.dep{background:linear-gradient(135deg,#DCA318,#D44010);box-shadow:0 6px 20px rgba(200,138,0,.28);}',
    '.wbm-book-note{font-size:11px;color:#9499AD;text-align:center;margin-top:9px;line-height:1.55;}',

    /* powered by footer */
    '.wb-powered{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:24px;font-size:11.5px;color:#9499AD;}',
    '.wb-powered a{color:#6D28FF;text-decoration:none;font-weight:600;}',
    '.wb-powered a:hover{text-decoration:underline;}',
    '.wb-powered-logo{width:18px;height:18px;border-radius:5px;background:linear-gradient(135deg,#0A3B1E,#135C2E);display:inline-flex;align-items:center;justify-content:center;}',
  ].join('\n');
  D.head.appendChild(style);

  /* ═══════════════════════════════════════
     RENDER SECTION INTO #wb-partner-section
     ═══════════════════════════════════════ */
  function render() {
    var mount = D.getElementById('wb-partner-section');
    if (!mount) return;

    var api = W.WildbossesAPI;
    var tours = api.getFeatured().slice(0, 6);

    var badgeClass = { critical: 'wb-badge-crit', high: 'wb-badge-high', normal: 'wb-badge-norm' };
    var badgeLabel = function(t) {
      if (t.spots_left <= 2 && t.spots_left > 0) return '🔴 ' + t.spots_left + ' spot' + (t.spots_left > 1 ? 's' : '') + ' left';
      if (t.spots_left <= 5 && t.spots_left > 0) return t.spots_left + ' spots left';
      if (t.price_kes === 0) return '✨ Free tour';
      return t.category.charAt(0).toUpperCase() + t.category.slice(1);
    };

    mount.innerHTML =
      '<div class="wb-sec-header">' +
        '<div>' +
          '<div class="wb-sec-badge"><span class="wb-sec-badge-dot"></span>Partner · Wildbosses Adventures</div>' +
          '<div class="wb-sec-title">Safaris & Tours with <em>Wildbosses</em></div>' +
          '<div class="wb-sec-sub">Expert-led safaris, city walks and adventures across Kenya & Tanzania</div>' +
        '</div>' +
        '<a href="https://wildbosses.com/tours" target="_blank" class="wb-sec-link">All tours <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17 17 7M7 7h10v10"/></svg></a>' +
      '</div>' +
      '<div class="wb-grid">' +
        tours.map(function(t) {
          var isFree = t.price_kes === 0;
          var isUrgent = t.spots_left <= 3 && t.spots_left > 0;
          var pricing = api.getPricing(t.id, 1, 'cabana');
          return (
            '<div class="wb-card" onclick="WBIntegration.openModal(\'' + t.id + '\')">' +
              '<div class="wb-img">' +
                '<img src="' + t.image_thumb + '" alt="' + t.name + '" loading="lazy"/>' +
                '<div class="wb-img-grad"></div>' +
                '<div class="wb-badge ' + (badgeClass[t.urgency] || 'wb-badge-norm') + '">' + badgeLabel(t) + '</div>' +
                '<div class="wb-partner-badge">Wildbosses</div>' +
                '<div class="wb-rating">★ ' + t.rating + ' <span style="opacity:.45">(' + t.reviews + ')</span></div>' +
              '</div>' +
              '<div class="wb-body">' +
                '<div class="wb-cat">' + t.category + ' · ' + t.destination.replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}) + '</div>' +
                '<div class="wb-name">' + t.name + '</div>' +
                '<div class="wb-meta">' +
                  '<span class="wb-pill">⏱ ' + t.duration + '</span>' +
                  '<span class="wb-pill">👥 Max ' + t.group_max + '</span>' +
                  (isUrgent ? '<span class="wb-pill hot">🔴 ' + t.spots_left + ' left</span>' : '') +
                '</div>' +
                '<div class="wb-foot">' +
                  '<div>' +
                    '<div class="wb-price-lbl">' + (isFree ? 'Pay what you want' : 'From') + '</div>' +
                    '<div class="wb-price' + (isFree ? ' free' : '') + '">' +
                      (isFree ? 'Free' : 'KES ' + t.price_kes.toLocaleString()) +
                    '</div>' +
                    (!isFree ? '<div class="wb-price-per">/person + ' + (pricing.service_fee_pct) + '% Cabana fee</div>' : '') +
                    (!isFree && t.deposit_kes ? '<div class="wb-price-dep">Deposit KES ' + t.deposit_kes.toLocaleString() + '</div>' : '') +
                  '</div>' +
                  '<button class="wb-cta' + (isUrgent && !isFree ? ' dep' : '') + '" onclick="event.stopPropagation();WBIntegration.openModal(\'' + t.id + '\')">' +
                    (isFree ? 'Reserve' : isUrgent ? 'Deposit' : 'Book') +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>'
          );
        }).join('') +
      '</div>' +
      '<div class="wb-powered">Powered by <div class="wb-powered-logo"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F2BE2E" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div> <a href="https://wildbosses.com" target="_blank">Wildbosses Adventures</a> · Independent tour partner</div>' +
      '<div id="wb-modal-overlay"><div id="wb-modal-box"></div></div>';

    /* close on overlay click */
    var overlay = D.getElementById('wb-modal-overlay');
    if (overlay) overlay.addEventListener('click', function(e){ if(e.target===overlay) WBIntegration.closeModal(); });
    D.addEventListener('keydown', function(e){ if(e.key==='Escape') WBIntegration.closeModal(); });
  }

  /* ═══════════════════════════════════════
     MODAL OPEN / CLOSE
     ═══════════════════════════════════════ */
  var WBIntegration = {

    openModal: function(tourId) {
      var api = W.WildbossesAPI;
      var t = api.getTour(tourId);
      if (!t) return;
      var isFree = t.price_kes === 0;
      var isUrgent = t.spots_left > 0 && t.spots_left <= 4;

      /* default pricing for 1 guest */
      var pricing = api.getPricing(t.id, 1, 'cabana');

      var box = D.getElementById('wb-modal-box');
      box.innerHTML =
        '<div class="wbm-img">' +
          '<img src="' + t.image + '" alt="' + t.name + '" loading="eager"/>' +
          '<div class="wbm-img-grad"></div>' +
          '<button class="wbm-x" onclick="WBIntegration.closeModal()" aria-label="Close">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
          '<div class="wbm-partner-tag">🌿 Wildbosses Adventures</div>' +
        '</div>' +
        '<div class="wbm-body">' +
          '<div class="wbm-eye">' + t.category + ' · ' + t.country + '</div>' +
          '<div class="wbm-title">' + t.name + '</div>' +
          '<div class="wbm-quick">' +
            '<div class="wbm-q"><div class="wbm-ql">Duration</div><div class="wbm-qv">' + t.duration + '</div></div>' +
            '<div class="wbm-q"><div class="wbm-ql">Max group</div><div class="wbm-qv">' + t.group_max + ' guests</div></div>' +
            '<div class="wbm-q"><div class="wbm-ql">Rating</div><div class="wbm-qv" style="color:#C48A00">★ ' + t.rating + '</div></div>' +
          '</div>' +
          (isUrgent ? '<div class="wbm-urg"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="wbm-urg-txt">Only ' + t.spots_left + ' spot' + (t.spots_left>1?'s':'') + ' remaining — this ' + (t.spots_left<=2?'is almost full':'is selling fast') + '</div></div>' : '') +

          '<p style="font-size:14px;color:#5A5E70;line-height:1.72;margin-bottom:18px;">' + t.description + '</p>' +

          /* booking form */
          '<div class="wbm-form">' +
            '<div class="wbm-row">' +
              '<div class="wbm-field"><label class="wbm-label">Full name</label><input class="wbm-input" id="wbf-name" type="text" placeholder="Your full name" autocomplete="name"/></div>' +
              '<div class="wbm-field"><label class="wbm-label">Phone / WhatsApp</label><input class="wbm-input" id="wbf-phone" type="tel" placeholder="+254 7..." autocomplete="tel"/></div>' +
            '</div>' +
            '<div class="wbm-row">' +
              '<div class="wbm-field"><label class="wbm-label">Number of guests</label>' +
                '<select class="wbm-select" id="wbf-guests" onchange="WBIntegration.updatePricing(\'' + t.id + '\')">' +
                  [1,2,3,4,5,6,7,8].filter(function(n){return n<=t.group_max;}).map(function(n){
                    return '<option value="'+n+'">'+(n===1?'1 person':n+' people')+'</option>';
                  }).join('') +
                '</select>' +
              '</div>' +
              '<div class="wbm-field"><label class="wbm-label">Travel date</label>' +
                '<input class="wbm-input" id="wbf-date" type="date" value="' + (t.departure_date || '') + '" min="' + new Date().toISOString().split('T')[0] + '"/>' +
              '</div>' +
            '</div>' +
            '<div class="wbm-field"><label class="wbm-label">Special requests (optional)</label><input class="wbm-input" id="wbf-notes" type="text" placeholder="Dietary needs, accessibility, pick-up location…"/></div>' +
          '</div>' +

          /* pricing summary */
          '<div class="wbm-pricing" id="wbm-pricing">' +
            WBIntegration._pricingHTML(pricing, isFree) +
          '</div>' +

          '<div class="wbm-cta-box">' +
            '<button class="wbm-book' + (isUrgent && !isFree ? ' dep' : '') + '" id="wbm-book-btn" onclick="WBIntegration.submitBooking(\'' + t.id + '\')">' +
              (isFree ? 'Reserve a spot' : isUrgent ? 'Pay deposit — secure your spot' : 'Book this tour') +
            '</button>' +
            '<div class="wbm-book-note">' +
              (isFree ? 'Free to book · Tip your guide on the day' :
               'Secure with ' + t.deposit_pct + '% deposit today · Balance due 14 days before · Powered by <strong>Cabana</strong>') +
            '</div>' +
          '</div>' +
        '</div>';

      var overlay = D.getElementById('wb-modal-overlay');
      if (overlay) overlay.classList.add('open');
      D.body.style.overflow = 'hidden';
    },

    _pricingHTML: function(p, isFree) {
      if (isFree) {
        return '<div class="wbm-p-row"><span>Tour price</span><span style="color:#0D9467;font-weight:700;">Free</span></div>' +
               '<div class="wbm-p-note">Pay what you want at the end of the tour. Tip goes directly to your Wildbosses guide.</div>';
      }
      return (
        '<div class="wbm-p-row"><span>Tour price (' + p.guests + ' guest' + (p.guests>1?'s':'') + ' × KES ' + p.base_per_person.toLocaleString() + ')</span><span>KES ' + p.base_total.toLocaleString() + '</span></div>' +
        (p.service_fee > 0 ?
          '<div class="wbm-p-row"><span class="wbm-p-fee">Cabana service fee <span class="wbm-p-fee-tip">' + p.service_fee_pct + '%</span></span><span>KES ' + p.service_fee.toLocaleString() + '</span></div>' : '') +
        '<div class="wbm-p-row"><span>Total</span><span>KES ' + p.total.toLocaleString() + '</span></div>' +
        '<div class="wbm-p-note">Pay KES ' + p.deposit_total.toLocaleString() + ' now to secure your spot. Balance of KES ' + p.balance_due.toLocaleString() + ' due 14 days before departure.</div>' +
        '<div class="wbm-p-payout">✅ KES ' + p.wildbosses_payout.toLocaleString() + ' goes directly to Wildbosses</div>'
      );
    },

    updatePricing: function(tourId) {
      var guests = parseInt(D.getElementById('wbf-guests').value || '1', 10);
      var api = W.WildbossesAPI;
      var t = api.getTour(tourId);
      if (!t) return;
      var pricing = api.getPricing(tourId, guests, 'cabana');
      var el = D.getElementById('wbm-pricing');
      if (el) el.innerHTML = WBIntegration._pricingHTML(pricing, t.price_kes === 0);
    },

    submitBooking: function(tourId) {
      var name  = (D.getElementById('wbf-name')  || {}).value || '';
      var phone = (D.getElementById('wbf-phone') || {}).value || '';
      var guests = parseInt((D.getElementById('wbf-guests') || {}).value || '1', 10);
      var date  = (D.getElementById('wbf-date')  || {}).value || '';
      var notes = (D.getElementById('wbf-notes') || {}).value || '';

      if (!name.trim()) { alert('Please enter your name'); return; }
      if (!phone.trim()) { alert('Please enter your phone number'); return; }

      var api = W.WildbossesAPI;
      var t = api.getTour(tourId);
      if (!t) return;
      var isFree = t.price_kes === 0;
      var pricing = api.getPricing(tourId, guests, 'cabana');

      var btn = D.getElementById('wbm-book-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

      /* Get Cabana session user if available */
      var cabanaSess = W.ApaSession ? W.ApaSession.get() : null;
      var cabanaUserId = cabanaSess && cabanaSess.user ? cabanaSess.user.id : null;

      if (isFree) {
        /* Free tour — create booking immediately, no payment */
        try {
          var booking = api.createBooking({
            tour_id: tourId, guests: guests,
            guest_name: name.trim(), guest_phone: phone.trim(),
            travel_date: date || 'Flexible',
            context: 'cabana',
            payment_reference: 'FREE-' + Date.now(),
            payment_type: 'full',
            cabana_user_id: cabanaUserId,
            notes: notes,
          });
          WBIntegration._showSuccess(booking, t);
          /* Store in Cabana's Supabase if available */
          WBIntegration._saveToCabana(booking);
        } catch(e) {
          if (btn) { btn.disabled = false; btn.textContent = 'Reserve a spot'; }
          alert('Booking failed: ' + e.message);
        }
        return;
      }

      /* Paid tour — use Cabana's ApatmentoPay STK push */
      if (!W.ApatmentoPay) {
        /* Fallback: direct WhatsApp if payment system not loaded */
        var waMsg = encodeURIComponent(
          'Hi Wildbosses! I\'d like to book "' + t.name + '" for ' + guests + ' guest' + (guests>1?'s':'') + '.\n' +
          'Name: ' + name + '\nPhone: ' + phone + '\nDate: ' + (date||'Flexible') + '\nNotes: ' + (notes||'None') +
          '\n\nBooked via Cabana. Total: KES ' + pricing.total.toLocaleString()
        );
        window.open('https://wa.me/254796818671?text=' + waMsg, '_blank');
        WBIntegration.closeModal();
        return;
      }

      var payAmount = t.price_kes === 0 ? 0 : pricing.deposit_total;
      var payRef = 'WB-CAB-' + Date.now();

      W.ApatmentoPay.start({
        amount: payAmount,
        phone: phone.trim(),
        reference: payRef,
        table: 'tour_bookings',
        description: t.name + (guests > 1 ? ' × ' + guests : '') + ' — via Wildbosses/Cabana',
        onSuccess: function() {
          try {
            var booking = api.createBooking({
              tour_id: tourId, guests: guests,
              guest_name: name.trim(), guest_phone: phone.trim(),
              travel_date: date || 'Flexible',
              context: 'cabana',
              payment_reference: payRef,
              payment_type: 'deposit',
              cabana_user_id: cabanaUserId,
              notes: notes,
            });
            WBIntegration._showSuccess(booking, t);
            WBIntegration._saveToCabana(booking);
          } catch(e) {
            console.warn('[WB] Booking record error:', e);
          }
        },
        onFailure: function() {
          if (btn) { btn.disabled = false; btn.textContent = 'Try again'; }
        },
      });
    },

    _showSuccess: function(booking, tour) {
      WBIntegration.closeModal();
      /* show Cabana-native success toast if available */
      var toastFns = [W.wbToast, W.apaToast, W.showToast];
      var toastFn = toastFns.find(function(f){ return typeof f === 'function'; });
      var msg = '🌿 Booked! ' + tour.name + ' · Ref: ' + booking.booking_ref;
      if (toastFn) {
        toastFn(msg, 5000);
      } else {
        alert('Booking confirmed! ✅\n\n' + msg + '\n\nWildbosses will contact you within 15 minutes on WhatsApp.');
      }
    },

    _saveToCabana: function(booking) {
      /* Store a minimal record in Cabana's Supabase tour_bookings table */
      if (!W.__APA_SB__) return;
      var sb = W.__APA_SB__;
      sb.from('tour_bookings').insert({
        partner:          'wildbosses',
        partner_tour_id:  booking.tour_id,
        tour_name:        booking.tour_name,
        booking_ref:      booking.booking_ref,
        guest_name:       booking.guest_name,
        guest_phone:      booking.guest_phone,
        guests:           booking.guests,
        travel_date:      booking.travel_date,
        payment_ref:      booking.payment_reference,
        payment_type:     booking.payment_type,
        total_kes:        booking.pricing.total,
        cabana_fee_kes:   booking.pricing.cabana_revenue,
        wb_payout_kes:    booking.wildbosses_payout,
        payout_status:    'pending',
        context:          'cabana',
        cabana_user_id:   booking.cabana_user_id,
        notes:            booking.notes,
        status:           'confirmed',
        created_at:       booking.created_at,
      }).then(function(res) {
        if (res.error) console.warn('[WB] Supabase save error:', res.error.message);
      });
    },

    closeModal: function() {
      var overlay = D.getElementById('wb-modal-overlay');
      if (overlay) overlay.classList.remove('open');
      D.body.style.overflow = '';
    },
  };

  W.WBIntegration = WBIntegration;

  /* ── Render when DOM is ready ── */
  whenReady(function() {
    if (D.readyState === 'loading') {
      D.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  });

}(window, document));
