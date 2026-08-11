/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · SHARED BEHAVIOUR
   Nav, brand, and the tour card renderer. Every page that shows tours
   uses the same card function, so a change to how a price or a date
   reads happens once.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  var MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function whenLabel(iso) {
    if (!iso) return { top: 'Dates on request', main: 'Flexible' };
    var d = new Date(iso);
    if (isNaN(d)) return { top: 'Dates on request', main: 'Flexible' };
    var days = Math.ceil((d - new Date()) / 86400000);
    return {
      top: days > 0 ? 'in ' + days + ' day' + (days === 1 ? '' : 's') : 'Departed',
      main: d.getDate() + ' ' + MONTH[d.getMonth()] + ' ' + d.getFullYear(),
      days: days
    };
  }

  function money(kes) {
    if (kes === 0) return { main: 'Pay what you want', sub: 'at the end' };
    if (!kes) return { main: 'On request', sub: '' };
    return { main: 'KES ' + Number(kes).toLocaleString('en-KE'), sub: 'per person' };
  }

  function tourCard(t) {
    var w = whenLabel(t.departure_date), p = money(t.price_kes);
    var soon = w.days != null && w.days > 0 && w.days <= 30;
    var tag = t.spots_left === 0
      ? '<span class="wb-card-tag">Full</span>'
      : soon ? '<span class="wb-card-tag is-soon">Leaving soon</span>'
      : (t.spots_left != null ? '<span class="wb-card-tag">' + t.spots_left + ' left</span>' : '');

    return '<a class="wb-card" href="/tour.html?t=' + encodeURIComponent(t.slug) + '">' +
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
      '</div></a>';
  }

  function nav() {
    var burger = D.getElementById('wb-burger'), links = D.getElementById('wb-links');

    if (burger && links) {
      /* A scrim so the sheet reads as the layer in front, and so a tap
         anywhere else closes it — the old menu could only be dismissed by
         hitting the same 36x24 button again. */
      var scrim = D.createElement('div');
      scrim.className = 'wb-scrim';
      D.body.appendChild(scrim);

      function setOpen(open) {
        links.classList.toggle('open', open);
        scrim.classList.toggle('on', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        /* the sheet is inside a sticky bar, so the page behind it can still
           scroll away underneath; freeze it while the menu is up */
        D.body.style.overflow = open ? 'hidden' : '';
        if (open) {
          var first = links.querySelector('a');
          if (first) first.focus({ preventScroll: true });
        }
      }

      burger.addEventListener('click', function () {
        setOpen(burger.getAttribute('aria-expanded') !== 'true');
      });
      scrim.addEventListener('click', function () { setOpen(false); });
      /* choosing a destination should close the thing you chose it from */
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false);
      });
      D.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
          setOpen(false); burger.focus();
        }
      });
      /* rotating to landscape can cross the 820px line with the sheet open,
         which would leave the page scroll-locked and the menu invisible */
      W.addEventListener('resize', function () {
        if (W.innerWidth > 820) setOpen(false);
      });
    }

    /* lift the bar off the content once the page has moved */
    var bar = D.querySelector('.wb-nav');
    if (bar) {
      var stuck = false;
      var onScroll = function () {
        var now = W.scrollY > 8;
        if (now !== stuck) { stuck = now; bar.classList.toggle('is-stuck', now); }
      };
      W.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    var path = location.pathname.replace(/\/$/, '') || '/index.html';
    Array.prototype.forEach.call(D.querySelectorAll('.wb-links a'), function (a) {
      var href = a.getAttribute('href').replace(/\/$/, '');
      if (href === path || (path === '/index.html' && href === '/')) {
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  function brand() {
    if (!W.WB) return;
    W.WB.settings().then(function (s) {
      var b = s.brand || {}, c = s.contact || {};
      var slot = D.getElementById('wb-logo');
      /* If Supabase has a custom logo URL use it, otherwise the static
         wb-logo.png already baked into the HTML takes over.           */
      if (slot && b.logo_url) {
        var img = slot.querySelector('img');
        if (img) {
          img.src = b.logo_url;
        } else {
          /* Legacy: slot used to be a background-image div */
          slot.style.backgroundImage = 'url(' + b.logo_url + ')';
        }
        slot.classList.add('has-logo');
      }
      Array.prototype.forEach.call(D.querySelectorAll('[data-wa]'), function (a) {
        if (c.whatsapp) a.href = 'https://wa.me/' + c.whatsapp;
      });
      Array.prototype.forEach.call(D.querySelectorAll('[data-tel]'), function (a) {
        if (c.phone) { a.href = 'tel:' + c.phone; if (a.dataset.tel === 'text') a.textContent = c.phone; }
      });
      Array.prototype.forEach.call(D.querySelectorAll('[data-mail]'), function (a) {
        if (c.email) { a.href = 'mailto:' + c.email; if (a.dataset.mail === 'text') a.textContent = c.email; }
      });
    });
  }

  function reveal() {
    W.__wbRevealRan = true;                  // claim the promise made in <head>
    var all = D.querySelectorAll('[data-reveal]');
    if (!W.IntersectionObserver) {           // nothing to observe with: just show it
      Array.prototype.forEach.call(all, function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(all, function (n) { io.observe(n); });
  }

  function init() {
    var y = D.getElementById('wb-year');
    if (y) y.textContent = new Date().getFullYear();
    nav(); brand(); reveal();
  }

  W.WBSite = { esc: esc, tourCard: tourCard, whenLabel: whenLabel, money: money };

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();

})(window, document);
