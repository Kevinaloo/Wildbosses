/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · DATA LAYER
   ─────────────────────────────────────────────────────────────────
   One place that talks to Postgres. Everything else asks this.

   The key below is a publishable key. It is meant to be in the page,
   and it is only as safe as the row level security behind it — which
   is why writes are gated on the admins table, not on "is signed in".

   Every read fails soft: a network problem returns an empty list and
   the page renders its empty state, rather than throwing and leaving
   a half-drawn screen.
   ═══════════════════════════════════════════════════════════════════ */
(function (W) {
  'use strict';

  var URL  = 'https://uhoqbticmkeufuxnrate.supabase.co';
  var KEY  = 'sb_publishable_eV3cqaqh_B_RDaUfXP0r_w_HDS2PLl8';
  var REST = URL + '/rest/v1/';

  var sb = null;
  function client() {
    if (sb) return sb;
    if (!W.supabase || !W.supabase.createClient) return null;
    sb = W.supabase.createClient(URL, KEY);
    return sb;
  }

  /* ── plain REST for reads, so public pages never need the SDK ── */
  function get(path) {
    return fetch(REST + path, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* Any request that has not answered in time is a failure, not a
     spinner that runs forever. */
  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, rej) {
        setTimeout(function () { rej(new Error('The request timed out. Please try again.')); }, ms);
      })
    ]);
  }

  var API = {
    url: URL,
    key: KEY,
    client: client,

    /* the diagonal rail on the homepage */
    heroRail: function () {
      return get('hero_rail?select=*').catch(function () { return []; });
    },

    /* published departures, soonest first */
    tours: function (opts) {
      opts = opts || {};
      var q = 'tours?select=*&status=in.(open,full)&order=departure_date.asc';
      if (opts.featured) q += '&featured=eq.true';
      if (opts.category) q += '&category=eq.' + encodeURIComponent(opts.category);
      if (opts.limit)    q += '&limit=' + opts.limit;
      return get(q).catch(function () { return []; });
    },

    tourBySlug: function (slug) {
      return get('tours?select=*&slug=eq.' + encodeURIComponent(slug) + '&limit=1')
        .then(function (r) { return r[0] || null; })
        .catch(function () { return null; });
    },

    guides: function () {
      return get('guides?select=*&active=eq.true&order=name.asc')
        .catch(function () { return []; });
    },

    photos: function (opts) {
      opts = opts || {};
      var q = 'photos?select=*&active=eq.true&order=sort_order.asc,created_at.desc';
      if (opts.limit) q += '&limit=' + opts.limit;
      return get(q).catch(function () { return []; });
    },

    settings: function () {
      return get('site_settings?select=key,value').then(function (rows) {
        var out = {};
        (rows || []).forEach(function (r) { out[r.key] = r.value; });
        return out;
      }).catch(function () { return {}; });
    },

    /* ── booking ────────────────────────────────────────────
       Arrives as pending/pending by policy. An admin confirms it and
       records payment; the browser is never trusted to say "paid".  */
    /* Booking now goes through our own serverless endpoint, which
       holds the service key, prices the trip server-side and writes
       past RLS. The browser never touches the bookings table. */
    createBooking: function (b) {
      return withTimeout(fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b)
      }), 20000).then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error || 'Booking failed');
          return d;
        });
      });
    }
  };

  /* ── payment: STK push via Vercel serverless ─────────────────────
     Calls our own /api/pay so the request always originates from
     wildbosses.vercel.app — satisfying PayHero's domain restriction. */
  API.stkPush = function (opts) {
    /* opts: { phone, amount, booking_ref, guest_name } */
    return withTimeout(fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts)
    }), 25000).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || 'Payment request failed');
        return d; /* { ok, checkout_request_id, message } */
      });
    });
  };

  /* Poll payment status — resolves when paid/failed or after timeout */
  API.pollPayment = function (ref, opts) {
    opts = opts || {};
    var interval = opts.interval || 3000;   /* ms between polls */
    var timeout  = opts.timeout  || 90000;  /* give up after 90 s */
    var started  = Date.now();

    return new Promise(function (resolve, reject) {
      function check() {
        fetch('/api/pay-status?ref=' + encodeURIComponent(ref))
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.payment_status === 'paid')   return resolve({ status: 'paid' });
            if (d.payment_status === 'failed') return reject(new Error('Payment declined by M-Pesa'));
            if (Date.now() - started >= timeout) return reject(new Error('Payment timed out'));
            setTimeout(check, interval);
          })
          .catch(function () {
            if (Date.now() - started >= timeout) return reject(new Error('Payment timed out'));
            setTimeout(check, interval);
          });
      }
      setTimeout(check, interval); /* first check after one interval */
    });
  };

  /* ── formatting shared by every surface ── */
  API.money = function (kes) {
    if (kes === 0 || kes === null || kes === undefined) return 'Pay what you want';
    return 'KES ' + Number(kes).toLocaleString('en-KE');
  };

  API.countdown = function (iso) {
    if (!iso) return null;
    var ms = new Date(iso).getTime() - Date.now();
    if (isNaN(ms)) return null;
    if (ms <= 0) return { past: true, d: 0, h: 0, m: 0, s: 0 };
    var s = Math.floor(ms / 1000);
    return {
      past: false,
      d: Math.floor(s / 86400),
      h: Math.floor(s % 86400 / 3600),
      m: Math.floor(s % 3600 / 60),
      s: s % 60
    };
  };

  W.WB = API;
})(window);
