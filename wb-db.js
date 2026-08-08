/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · DATA LAYER  v2
   ─────────────────────────────────────────────────────────────────
   Talks to Supabase. Replaces the hardcoded tour array.

   Consumed by:
     • Wildbosses site   — tours, guides, booking
     • list-tour.html    — admin CRUD + payout reconciliation
     • Cabana            — reads tours, writes bookings, using the
                           SAME anon key (safe: RLS blocks reading
                           bookings back, so no data leaks)

   Falls back to WildbossesAPI's static catalogue if the network or
   the database is unreachable, so a Supabase outage degrades to
   stale-but-working rather than an empty page.
   ═══════════════════════════════════════════════════════════════════ */
(function (W) {
  'use strict';
  if (W.WildbossesDB) return;

  /* ── Project config ──────────────────────────────────
     The anon key is designed for client-side exposure and is
     protected by the RLS policies in supabase/migrations.
     It grants: read open tours + active guides, insert bookings.
     It does NOT grant: reading bookings, payouts, or any writes
     to the catalogue.                                            */
  var SUPABASE_URL  = W.WB_SUPABASE_URL  || '__SUPABASE_URL__';
  var SUPABASE_ANON = W.WB_SUPABASE_ANON || '__SUPABASE_ANON_KEY__';

  var configured = SUPABASE_URL.indexOf('__') !== 0;
  var sb = null;

  function client() {
    if (sb) return sb;
    if (!configured || !W.supabase || !W.supabase.createClient) return null;
    try {
      sb = W.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: false },
      });
    } catch (e) { sb = null; }
    return sb;
  }

  /* ── Fallback to the static catalogue ── */
  function fallbackTours() {
    return (W.WildbossesAPI && W.WildbossesAPI.getTours)
      ? W.WildbossesAPI.getTours()
      : [];
  }

  /* ── Row → the shape the UI already expects ── */
  function shape(r) {
    return {
      id:               r.slug || r.id,
      uuid:             r.id,
      slug:             r.slug,
      name:             r.name,
      subtitle:         r.subtitle,
      description:      r.description,
      category:         r.category,
      destination:      r.destination,
      country:          r.country,
      duration:         r.duration,
      group_min:        r.group_min,
      group_max:        r.group_max,
      price_kes:        r.price_kes,
      deposit_kes:      r.deposit_kes,
      deposit_pct:      r.deposit_pct,
      spots_total:      r.spots_total,
      spots_left:       r.spots_left,
      rating:           Number(r.rating) || 0,
      reviews:          r.reviews || 0,
      departure_date:   r.departure_date,
      return_date:      r.return_date,
      booking_deadline: r.booking_deadline,
      status:           r.status,
      urgency:          r.urgency,
      featured:         r.featured,
      image:            r.image,
      image_thumb:      r.image_thumb || r.image,
      tags:             r.tags || [],
      includes:         r.includes || [],
      excludes:         r.excludes || [],
      itinerary:        r.itinerary || [],
      guide:            r.guides ? r.guides.name : null,
      guide_rating:     r.guides ? Number(r.guides.rating) : null,
      guide_experience: r.guides ? r.guides.years_exp + ' years' : null,
    };
  }

  var DB = {

    ready: function () { return !!client(); },

    /* ── TOURS ─────────────────────────────────────── */
    getTours: async function (filters) {
      var c = client();
      if (!c) return fallbackTours();
      try {
        var q = c.from('tours')
                 .select('*, guides(name, rating, years_exp)')
                 .in('status', ['open', 'full']);
        if (filters) {
          if (filters.category)    q = q.eq('category', filters.category);
          if (filters.destination) q = q.eq('destination', filters.destination);
          if (filters.featured)    q = q.eq('featured', true);
          if (filters.maxPrice)    q = q.lte('price_kes', filters.maxPrice);
        }
        q = q.order('featured', { ascending: false })
             .order('departure_date', { ascending: true, nullsFirst: false });
        var res = await q;
        if (res.error || !res.data) return fallbackTours();
        return res.data.map(shape);
      } catch (e) { return fallbackTours(); }
    },

    getTour: async function (idOrSlug) {
      var c = client();
      if (!c) return fallbackTours().find(function (t) { return t.id === idOrSlug || t.slug === idOrSlug; }) || null;
      try {
        var res = await c.from('tours')
                         .select('*, guides(name, rating, years_exp)')
                         .or('slug.eq.' + idOrSlug + ',id.eq.' + idOrSlug)
                         .maybeSingle();
        if (res.error || !res.data) return null;
        return shape(res.data);
      } catch (e) { return null; }
    },

    getFeatured: async function () { return DB.getTours({ featured: true }); },

    getGuides: async function () {
      var c = client();
      if (!c) return [];
      try {
        var res = await c.from('guides').select('*').eq('active', true).order('rating', { ascending: false });
        return res.error ? [] : (res.data || []);
      } catch (e) { return []; }
    },

    /* ── PRICING ───────────────────────────────────── */
    price: function (tour, guests, feeRate) {
      guests  = guests || 1;
      feeRate = feeRate || 0;
      var base    = (tour.price_kes || 0) * guests;
      var fee     = Math.round(base * feeRate);
      var total   = base + fee;
      var depPct  = tour.deposit_pct != null ? tour.deposit_pct : 30;
      var deposit = tour.price_kes === 0 ? 0 : Math.round(total * depPct / 100);
      return {
        guests: guests, perPerson: tour.price_kes || 0,
        base: base, fee: fee, feePct: Math.round(feeRate * 100),
        total: total, deposit: deposit, balance: total - deposit,
        wildbosses_payout: base, partner_revenue: fee,
        currency: 'KES', isFree: (tour.price_kes || 0) === 0,
      };
    },

    /* ── BOOKING ───────────────────────────────────── */
    createBooking: async function (p) {
      var tour = await DB.getTour(p.tour_id);
      if (!tour) throw new Error('Tour not found: ' + p.tour_id);
      if (tour.status !== 'open') throw new Error('This departure is no longer open');

      var guests = p.guests || 1;
      if (guests > tour.spots_left) {
        throw new Error('Only ' + tour.spots_left + ' spot' + (tour.spots_left === 1 ? '' : 's') + ' left');
      }

      var pr  = DB.price(tour, guests, p.fee_rate || 0);
      var ref = 'WB-' + Date.now().toString(36).toUpperCase() +
                '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

      var row = {
        booking_ref:       ref,
        tour_id:           tour.uuid,
        tour_name:         tour.name,
        guest_name:        p.guest_name,
        guest_phone:       p.guest_phone,
        guest_email:       p.guest_email || null,
        guests:            guests,
        travel_date:       p.travel_date || tour.departure_date || 'Flexible',
        notes:             p.notes || null,
        currency:          'KES',
        base_amount:       pr.base,
        service_fee:       pr.fee,
        total_amount:      pr.total,
        deposit_paid:      p.deposit_paid || 0,
        wildbosses_payout: pr.wildbosses_payout,
        source:            p.source || 'direct',
        partner_id:        p.partner_id || null,
        partner_user_id:   p.partner_user_id || null,
        payment_ref:       p.payment_ref || null,
        payment_type:      p.payment_type || 'deposit',
        payment_status:    p.payment_status || 'pending',
        payout_status:     'pending',
        status:            'confirmed',
      };

      var c = client();
      if (c) {
        var res = await c.from('bookings').insert(row).select().maybeSingle();
        if (res.error) throw new Error(res.error.message);
      }

      /* notify Wildbosses regardless of DB outcome */
      DB._notify(row, pr);
      return Object.assign({}, row, { pricing: pr });
    },

    _notify: function (b, pr) {
      var msg = [
        '🌿 *NEW BOOKING*', '',
        '📋 ' + b.booking_ref,
        '🗺 ' + b.tour_name,
        '📅 ' + b.travel_date,
        '👥 ' + b.guests + ' guest' + (b.guests > 1 ? 's' : ''), '',
        '👤 ' + b.guest_name,
        '📞 ' + b.guest_phone,
        b.guest_email ? '📧 ' + b.guest_email : '', '',
        '💰 Total: KES ' + b.total_amount.toLocaleString(),
        b.service_fee ? '🔧 Partner fee: KES ' + b.service_fee.toLocaleString() : '',
        '💵 *Your payout: KES ' + b.wildbosses_payout.toLocaleString() + '*', '',
        '✅ ' + b.payment_type + (b.payment_ref ? ' · ' + b.payment_ref : ''),
        '📲 Source: ' + (b.source === 'direct' ? 'Wildbosses direct' : b.source),
        b.notes ? '📝 ' + b.notes : '',
      ].filter(Boolean).join('\n');

      try {
        var f = document.createElement('iframe');
        f.style.display = 'none';
        f.src = 'https://wa.me/254796818671?text=' + encodeURIComponent(msg);
        document.body.appendChild(f);
        setTimeout(function () { f.parentNode && f.parentNode.removeChild(f); }, 3000);
      } catch (e) {}
    },

    /* ── ADMIN (authenticated only — RLS enforces this) ── */
    admin: {
      listBookings: async function (limit) {
        var c = client(); if (!c) return [];
        var res = await c.from('bookings').select('*')
                         .order('created_at', { ascending: false })
                         .limit(limit || 100);
        return res.error ? [] : (res.data || []);
      },

      createTour: async function (t) {
        var c = client(); if (!c) throw new Error('Database not configured');
        var res = await c.from('tours').insert(t).select().maybeSingle();
        if (res.error) throw new Error(res.error.message);
        return shape(res.data);
      },

      updateTour: async function (id, patch) {
        var c = client(); if (!c) throw new Error('Database not configured');
        var res = await c.from('tours').update(patch).eq('id', id).select().maybeSingle();
        if (res.error) throw new Error(res.error.message);
        return shape(res.data);
      },

      /* what each partner still owes us */
      payoutSummary: async function () {
        var rows = await DB.admin.listBookings(500);
        var by = {};
        rows.forEach(function (b) {
          var k = b.partner_id || b.source || 'direct';
          if (!by[k]) by[k] = { partner: k, bookings: 0, gross: 0, fee: 0, owed: 0, paid: 0 };
          var s = by[k];
          s.bookings++;
          s.gross += b.total_amount || 0;
          s.fee   += b.service_fee || 0;
          if (b.payout_status === 'paid') s.paid += b.wildbosses_payout || 0;
          else s.owed += b.wildbosses_payout || 0;
        });
        return Object.keys(by).map(function (k) { return by[k]; });
      },

      markPaid: async function (refs) {
        var c = client(); if (!c) throw new Error('Database not configured');
        var res = await c.from('bookings')
                         .update({ payout_status: 'paid', payout_date: new Date().toISOString() })
                         .in('booking_ref', refs);
        if (res.error) throw new Error(res.error.message);
        return true;
      },
    },

    version: '2.0.0',
  };

  W.WildbossesDB = DB;

}(window));
