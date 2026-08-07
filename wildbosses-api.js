/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES PUBLIC TOUR API  v2.0
   ─────────────────────────────────────────────────────────────────
   Single source of truth for all Wildbosses tours.
   Consumed by:
     1. Wildbosses.com  — directly (native display)
     2. Cabana / Apatmento — via <script src> embed (partner display)

   How tours are added:
     • Kevin posts a tour on list-tour.html on Wildbosses
     • It saves to the shared Supabase wb_tours table
     • This API fetches live from that table (fallback to static data)
     • Cabana picks it up instantly — no code changes ever needed

   Integration contract:
     • Cabana includes this file and calls WildbossesAPI.getTours()
       which returns a Promise (async — fetches from DB)
     • Cabana books via WildbossesAPI.createBooking(params) which
       stores the booking in Supabase AND fires a WhatsApp to Wildbosses
     • Cabana charges its own service fee (defined in PARTNER_CONFIG)
     • Wildbosses sees all bookings via WhatsApp + Supabase admin

   PARTNER CONFIG (Cabana-specific):
     SERVICE_FEE_RATE  — Cabana's cut (default 10%)
     PARTNER_LABEL     — How Wildbosses sees source of this booking
     NOTIFY_WA         — Wildbosses WhatsApp to receive booking alerts
   ═══════════════════════════════════════════════════════════════════ */

(function (W) {
  'use strict';
  if (W.WildbossesAPI) return; // singleton guard

  /* ── Shared Supabase (same project as Cabana) ── */
  var SB_URL  = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  /* ── Partner config — Cabana sets these, Wildbosses doesn't touch ── */
  var PARTNER_CONFIG = {
    SERVICE_FEE_RATE: 0.10,
    PARTNER_LABEL:    'Cabana',
    NOTIFY_WA:        '254796818671',
    WILDBOSSES_EMAIL: 'hello@wildbosses.co',
    CURRENCY:         'KES',
  };

  /* ════════════════════════════════════════════════════════════════
     STATIC FALLBACK CATALOGUE
     Used if Supabase is unreachable. When Kevin posts tours via
     list-tour.html they save to Supabase and override these.
     ════════════════════════════════════════════════════════════════ */
  var STATIC_TOURS = [
    {
      id: 'wb-migration-aug26',
      slug: 'masai-mara-migration-safari',
      name: 'Masai Mara Great Migration Safari',
      subtitle: '7 days across the Mara Triangle',
      category: 'safari',
      destination: 'masai-mara',
      country: 'Kenya',
      duration: '7 days · 6 nights',
      group_max: 8, group_min: 1,
      price_kes: 95000, deposit_kes: 28500, deposit_pct: 30,
      spots_total: 8, spots_left: 2,
      rating: 4.98, reviews: 156,
      departure_date: '2026-08-14',
      return_date: '2026-08-21',
      booking_deadline: '2026-08-13T23:59:00+03:00',
      status: 'open', urgency: 'critical', featured: true,
      image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
      image_thumb: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70',
      tags: ['Great Migration', 'Private 4×4', 'Big Five', 'Luxury Camp', 'Full Board'],
      guide: 'Grace Wanjiku', guide_rating: 4.95, guide_experience: '12 years',
      description: 'The greatest wildlife spectacle on earth. 1.5 million wildebeest crossing the Mara River, predators in pursuit, and you in a private vehicle at first light. Six nights in a luxury tented camp with full board and expert guided drives every day.',
      includes: ['All park & conservancy fees','Luxury tented camp × 6 nights','Full board throughout','Private 4×4 + expert guide','All internal transfers from Nairobi','Sundowners daily','Bush breakfast on Day 2'],
      excludes: ['International flights','Travel insurance','Personal spending'],
      itinerary: [
        {day:1,title:'Nairobi → Masai Mara',desc:'Morning drive to the Mara, afternoon game drive, settle into camp at sunset'},
        {day:2,title:'Full day migration tracking',desc:'Early morning drive, full day tracking the wildebeest columns and predator action'},
        {day:3,title:'River crossing & Mara Triangle',desc:'Position at the Mara River crossing points, maximum game drive time'},
        {day:4,title:'South Mara & predators',desc:'Focus on big cat activity — lion prides, cheetahs and leopards in the south'},
        {day:5,title:'Maasai village & cultural dinner',desc:'Morning drive, afternoon Maasai village visit, traditional dinner in camp'},
        {day:6,title:'Final drives & sundowner',desc:'Last morning and evening drives, celebration sundowner on the plains'},
        {day:7,title:'Return to Nairobi',desc:'Dawn final drive, brunch, drive back to Nairobi arriving evening'},
      ],
    },
    {
      id: 'wb-mara-big5',
      slug: 'masai-mara-big-five-game-drive',
      name: 'Masai Mara Big Five Game Drive',
      subtitle: 'Private sunrise drive through the Mara Triangle',
      category: 'safari',
      destination: 'masai-mara',
      country: 'Kenya',
      duration: 'Full day · 10h',
      group_max: 6, group_min: 1,
      price_kes: 12500, deposit_kes: 3750, deposit_pct: 30,
      spots_total: 6, spots_left: 3,
      rating: 4.97, reviews: 312,
      departure_date: null, return_date: null, booking_deadline: null,
      status: 'open', urgency: 'high', featured: true,
      image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
      image_thumb: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70',
      tags: ['Big Five', 'Private 4×4', 'Sunrise Start', 'Bush Lunch'],
      guide: 'Grace Wanjiku', guide_rating: 4.97, guide_experience: '12 years',
      description: 'A private sunrise drive through the most dramatic wildlife landscape on earth. We track lion, elephant, leopard, buffalo and rhino across the Mara Triangle. Lunch in the bush, sundowner on the plains.',
      includes: ['Private 4×4 + driver-guide','Park entry fees','Bush lunch & drinks','Sundowner','Return Nairobi transfer'],
      excludes: ['Tips','Personal items'],
      itinerary: [
        {day:1,title:'3:30am — Nairobi pickup',desc:'Early start from Nairobi for the 4.5h drive to the Mara'},
        {day:1,title:'6am — Enter Mara at golden hour',desc:'Arrive as the gates open at first light, immediate game drive'},
        {day:1,title:'Morning — Big Five tracking',desc:'Full morning of game viewing across the Mara Triangle'},
        {day:1,title:'12pm — Bush lunch by a waterhole',desc:'Stop for lunch in the bush watching wildlife at the waterhole'},
        {day:1,title:'5:30pm — Sundowner on the plains',desc:'Park at a scenic viewpoint for drinks and the sunset'},
        {day:1,title:'7pm — Return to Nairobi',desc:'Drive back, arriving Nairobi approximately 11pm'},
      ],
    },
    {
      id: 'wb-amboseli',
      slug: 'amboseli-elephants-kilimanjaro',
      name: 'Amboseli Elephants & Kilimanjaro Views',
      subtitle: 'Overnight safari with Kilimanjaro at dawn',
      category: 'safari',
      destination: 'amboseli',
      country: 'Kenya',
      duration: '2 days · 1 night',
      group_max: 8, group_min: 1,
      price_kes: 28000, deposit_kes: 8400, deposit_pct: 30,
      spots_total: 8, spots_left: 3,
      rating: 4.93, reviews: 412,
      departure_date: null, return_date: null, booking_deadline: null,
      status: 'open', urgency: 'high', featured: true,
      image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
      image_thumb: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70',
      tags: ['Elephants', 'Kilimanjaro', 'Overnight', 'Photography'],
      guide: 'Grace Wanjiku', guide_rating: 4.95, guide_experience: '12 years',
      description: 'The most photogenic safari in Kenya. Elephant herds crossing the Amboseli flats with Kilimanjaro rising above them at dawn. Overnight in a classic tented camp at the park boundary.',
      includes: ['Return Nairobi transfer','All park fees','Tented camp × 1 night','Full board × 2 days','Sunrise & sunset drives'],
      excludes: ['Tips','Personal spending','Travel insurance'],
      itinerary: [
        {day:1,title:'Nairobi → Amboseli',desc:'Early morning drive (3.5h), arrive for afternoon game drive'},
        {day:1,title:'Afternoon game drive',desc:'Elephant herd viewing, Kilimanjaro views, predator search'},
        {day:1,title:'Overnight in camp',desc:'Dinner around the campfire under the stars'},
        {day:2,title:'Pre-dawn Kilimanjaro shoot',desc:'Leave camp 5am for the magical dawn light on the mountain'},
        {day:2,title:'Brunch & return',desc:'Late brunch, drive back to Nairobi arriving afternoon'},
      ],
    },
    {
      id: 'wb-nairobi-walk',
      slug: 'nairobi-city-walking-tour',
      name: 'Nairobi City Walking Tour',
      subtitle: 'History, culture and markets of the capital',
      category: 'walking',
      destination: 'nairobi',
      country: 'Kenya',
      duration: '2h 30m',
      group_max: 16, group_min: 1,
      price_kes: 0, deposit_kes: 0, deposit_pct: 0,
      spots_total: 16, spots_left: 12,
      rating: 4.96, reviews: 1240,
      departure_date: null, return_date: null, booking_deadline: null,
      status: 'open', urgency: 'normal', featured: true,
      image: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
      image_thumb: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&q=70',
      tags: ['Free Tour', 'History', 'Culture', 'Markets', 'Parliament'],
      guide: 'James Mwangi', guide_rating: 4.96, guide_experience: '15 years',
      description: "Nairobi's essential walk. Parliament, KICC, Jamia Mosque, City Market, August 7th Memorial and Maasai Market — led by our resident city guide with 15 years of experience.",
      includes: ['Expert Wildbosses guide','Walking route map','Photography spots','Maasai Market visit'],
      excludes: ['Guide tip (appreciated)','Food & drinks'],
      itinerary: [
        {day:1,title:"9am — Dedan Kimathi Statue",desc:"Meet at the independence hero statue, intro to Nairobi's history"},
        {day:1,title:'9:30am — Parliament & KICC',desc:"Kenya's parliament buildings and the KICC tower"},
        {day:1,title:'10am — Jamia Mosque & City Market',desc:'Beautiful colonial mosque, vibrant city market stalls'},
        {day:1,title:'10:30am — August 7th Memorial',desc:'Sobering memorial to the 1998 US Embassy bombing victims'},
        {day:1,title:'11am — Maasai Market',desc:'Browse authentic Maasai beadwork and crafts'},
      ],
    },
    {
      id: 'wb-zanzibar',
      slug: 'zanzibar-stone-town-spice-farm',
      name: 'Zanzibar Stone Town & Spice Farm',
      subtitle: 'UNESCO heritage & aromatic spice gardens',
      category: 'culture',
      destination: 'zanzibar',
      country: 'Tanzania',
      duration: 'Full day · 8h',
      group_max: 12, group_min: 1,
      price_kes: 9500, deposit_kes: 2850, deposit_pct: 30,
      spots_total: 12, spots_left: 8,
      rating: 4.91, reviews: 623,
      departure_date: null, return_date: null, booking_deadline: null,
      status: 'open', urgency: 'normal', featured: true,
      image: 'https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=800&q=80',
      image_thumb: 'https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=400&q=70',
      tags: ['UNESCO', 'Spices', 'History', 'Seafood Lunch', 'Dhow Trip'],
      guide: 'Ali Hassan', guide_rating: 4.91, guide_experience: '10 years',
      description: 'Arab architecture, carved doors, Swahili cuisine and spice farms where vanilla, cloves and cinnamon grow wild. We finish with a seafood lunch and a dhow trip to Prison Island.',
      includes: ['Local guide','Stone Town walk (3h)','Spice Farm','Prison Island dhow trip','Seafood lunch'],
      excludes: ['Hotel transfer','Tips','Personal shopping'],
      itinerary: [
        {day:1,title:'9am — Stone Town walk',desc:'3-hour walk through UNESCO-listed Stone Town'},
        {day:1,title:'12pm — Forodhani Gardens lunch',desc:'Lunch at the famous seafood market'},
        {day:1,title:'2pm — Spice Farm',desc:'Taste and smell vanilla, cloves, cinnamon growing wild'},
        {day:1,title:'4pm — Prison Island',desc:'Dhow trip to see the Aldabra giant tortoises'},
      ],
    },
    {
      id: 'wb-diani',
      slug: 'diani-dhow-sunset-cruise',
      name: 'Diani Dhow Sunset Cruise & Dolphins',
      subtitle: 'Traditional dhow, dolphins & reef snorkelling',
      category: 'beach',
      destination: 'diani',
      country: 'Kenya',
      duration: '3h',
      group_max: 14, group_min: 2,
      price_kes: 5500, deposit_kes: 1650, deposit_pct: 30,
      spots_total: 14, spots_left: 8,
      rating: 4.85, reviews: 298,
      departure_date: null, return_date: null, booking_deadline: null,
      status: 'open', urgency: 'normal', featured: true,
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
      image_thumb: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=70',
      tags: ['Sunset', 'Dhow', 'Dolphins', 'Reef Snorkel'],
      guide: 'Omar Salim', guide_rating: 4.85, guide_experience: '14 years',
      description: 'Drift across the Indian Ocean on a traditional dhow. Chase spinner dolphins, snorkel the coral reef, and drift home as the sun sets in fire over the horizon.',
      includes: ['Dhow charter','Snorkel gear','Life jackets','Drinks & coconut','Dolphin spotting'],
      excludes: ['Hotel transfer','Tips'],
      itinerary: [
        {day:1,title:'4pm — Diani jetty',desc:'Board the traditional wooden dhow at Diani Beach jetty'},
        {day:1,title:'4:30pm — Dolphin encounter',desc:'Head offshore to find spinner dolphin pods'},
        {day:1,title:'5pm — Reef snorkel',desc:'Anchor at the coral reef, 30 min snorkel'},
        {day:1,title:'6pm — Sundowner sail',desc:'Sundowners on board as the sun sets over the Indian Ocean'},
      ],
    },
    {
      id: 'wb-kilimanjaro',
      slug: 'kilimanjaro-marangu-route-6-days',
      name: 'Kilimanjaro — Marangu Route 6 Days',
      subtitle: "Africa's highest peak — 89% summit success rate",
      category: 'adventure',
      destination: 'kilimanjaro',
      country: 'Tanzania',
      duration: '6 days · 5 nights',
      group_max: 8, group_min: 1,
      price_kes: 185000, deposit_kes: 55500, deposit_pct: 30,
      spots_total: 8, spots_left: 6,
      rating: 4.94, reviews: 389,
      departure_date: '2026-09-15',
      return_date: '2026-09-20',
      booking_deadline: '2026-09-10T23:59:00+03:00',
      status: 'open', urgency: 'normal', featured: true,
      image: 'https://images.unsplash.com/photo-1519923834699-ef0b7cde4712?w=800&q=80',
      image_thumb: 'https://images.unsplash.com/photo-1519923834699-ef0b7cde4712?w=400&q=70',
      tags: ['Summit 5,895m', '89% Success', 'Porters Included', 'All Meals', 'Certificate'],
      guide: 'Felix Massawe', guide_rating: 4.94, guide_experience: '18 years',
      description: "Africa's highest peak at 5,895m. Our Marangu route has an 89% summit success rate. We provide everything — porters, all meals, acclimatisation days, and a certified guide with 400+ successful summits.",
      includes: ['All KINAPA park fees','Hut accommodation × 5 nights','All meals on mountain','Porters × 2 per climber','Certified mountain guide','Summit certificate','Rescue deposit'],
      excludes: ['International flights','Travel insurance','Personal gear','Tips'],
      itinerary: [
        {day:1,title:'Moshi — Briefing & gear check',desc:'Arrive Moshi, gear check, briefing, overnight hotel'},
        {day:2,title:'Mandara Huts (2,720m)',desc:'Trek through rainforest to first hut, 5-7h'},
        {day:3,title:'Horombo Huts (3,720m)',desc:'Through moorland and giant heather, 6-8h'},
        {day:4,title:'Kibo Huts (4,700m)',desc:'Alpine desert, views open up, acclimatisation walk, 6-7h'},
        {day:5,title:'Summit push — Uhuru Peak (5,895m)',desc:"Midnight start, Gilman's Point, Uhuru Peak, descent to Horombo"},
        {day:6,title:'Descent & Moshi',desc:'Down to Marangu Gate, certificate presentation, Moshi'},
      ],
    },
  ];

  /* ════════════════════════════════════════════════════════════════
     DB HELPERS
     ════════════════════════════════════════════════════════════════ */
  function _sbFetch(path) {
    return fetch(SB_URL + '/rest/v1/' + path, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
      }
    }).then(function(r){ return r.json(); });
  }

  function _sbInsert(table, row) {
    return fetch(SB_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(row),
    }).then(function(r){ return r.json(); });
  }

  /* normalise a DB row → same shape as STATIC_TOURS */
  function _normalise(row) {
    return {
      id:               row.id,
      slug:             row.slug || row.id,
      name:             row.name,
      subtitle:         row.subtitle || '',
      category:         row.category || 'safari',
      destination:      row.destination || '',
      country:          row.country || 'Kenya',
      duration:         row.duration || '',
      group_max:        row.group_max || 999,
      group_min:        row.group_min || 1,
      price_kes:        row.price_kes || 0,
      deposit_kes:      row.deposit_kes || 0,
      deposit_pct:      row.deposit_pct || 30,
      spots_total:      row.spots_total || 999,
      spots_left:       row.spots_left || 999,
      rating:           row.rating || 0,
      reviews:          row.reviews || 0,
      departure_date:   row.departure_date || null,
      return_date:      row.return_date || null,
      booking_deadline: row.booking_deadline || null,
      status:           row.status || 'open',
      urgency:          row.urgency || 'normal',
      featured:         row.featured !== false,
      image:            (Array.isArray(row.photos) ? row.photos[0] : null) || row.image || '',
      image_thumb:      (Array.isArray(row.photos) ? row.photos[0] : null) || row.image_thumb || '',
      photos:           row.photos || [],
      tags:             row.tags || [],
      guide:            row.guide || '',
      guide_rating:     row.guide_rating || 0,
      guide_experience: row.guide_experience || '',
      description:      row.description || '',
      includes:         row.includes_list || row.includes || [],
      excludes:         row.excludes_list || row.excludes || [],
      itinerary:        row.itinerary || [],
      _source:          'db',
    };
  }

  /* ════════════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════════════ */
  var API = {

    /* ── Read (async — always call with .then()) ── */
    getTours: function (filters) {
      return _sbFetch('wb_tours?is_active=eq.true&order=created_at.desc')
        .then(function(rows) {
          var list = Array.isArray(rows) && rows.length
            ? rows.map(_normalise)
            : STATIC_TOURS.slice();

          if (!filters) return list;
          if (filters.category)    list = list.filter(function(t){ return t.category === filters.category; });
          if (filters.destination) list = list.filter(function(t){ return t.destination === filters.destination; });
          if (filters.featured)    list = list.filter(function(t){ return t.featured; });
          if (filters.status)      list = list.filter(function(t){ return t.status === filters.status; });
          if (filters.maxPrice)    list = list.filter(function(t){ return t.price_kes <= filters.maxPrice || t.price_kes === 0; });
          return list;
        })
        .catch(function() {
          var list = STATIC_TOURS.slice();
          if (!filters) return list;
          if (filters.category)    list = list.filter(function(t){ return t.category === filters.category; });
          return list;
        });
    },

    /* sync fallback — used by cabana-wb-integration.js initial render */
    getToursSync: function () { return STATIC_TOURS.slice(); },

    getTour: function (id) {
      return _sbFetch("wb_tours?or=(id.eq." + id + ",slug.eq." + id + ")&is_active=eq.true&limit=1")
        .then(function(rows) {
          if (Array.isArray(rows) && rows.length) return _normalise(rows[0]);
          return STATIC_TOURS.find(function(t){ return t.id === id || t.slug === id; }) || null;
        })
        .catch(function() {
          return STATIC_TOURS.find(function(t){ return t.id === id || t.slug === id; }) || null;
        });
    },

    getFeatured: function () {
      return API.getTours({ featured: true, status: 'open' });
    },

    /* ── Pricing helpers (sync — tour object passed in, not id) ── */
    getPricing: function (tour, guests, context) {
      if (!tour) return null;
      var ctx = context || 'direct';
      var base = tour.price_kes * guests;
      var deposit = tour.deposit_kes * guests;
      var serviceFeePct = ctx === 'cabana' ? PARTNER_CONFIG.SERVICE_FEE_RATE : 0;
      var serviceFee = Math.round(base * serviceFeePct);
      var total = base + serviceFee;
      var depositTotal = deposit + Math.round(deposit * (ctx === 'cabana' ? serviceFeePct : 0));
      return {
        base_per_person: tour.price_kes,
        guests: guests,
        base_total: base,
        service_fee: serviceFee,
        service_fee_pct: Math.round(serviceFeePct * 100),
        total: total,
        deposit_total: depositTotal,
        balance_due: total - depositTotal,
        wildbosses_payout: base,
        cabana_revenue: serviceFee,
        currency: PARTNER_CONFIG.CURRENCY,
        is_free: tour.price_kes === 0,
        context: ctx,
      };
    },

    /* ── Booking ── */
    createBooking: function (params) {
      return API.getTour(params.tour_id).then(function(tour) {
        if (!tour) throw new Error('Tour not found: ' + params.tour_id);
        if (tour.status !== 'open') throw new Error('Tour is not available for booking');

        var pricing = API.getPricing(tour, params.guests || 1, params.context || 'direct');
        var ref = 'WB-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();

        var booking = {
          booking_ref:       ref,
          tour_id:           tour.id,
          tour_name:         tour.name,
          tour_slug:         tour.slug,
          guest_name:        params.guest_name,
          guest_phone:       params.guest_phone,
          guest_email:       params.guest_email || '',
          guests:            params.guests || 1,
          travel_date:       params.travel_date || tour.departure_date || 'TBC',
          payment_reference: params.payment_reference || '',
          payment_type:      params.payment_type || 'deposit',
          context:           params.context || 'direct',
          partner_label:     params.context === 'cabana' ? PARTNER_CONFIG.PARTNER_LABEL : 'Direct',
          cabana_user_id:    params.cabana_user_id || null,
          pricing:           pricing,
          notes:             params.notes || '',
          status:            'confirmed',
          created_at:        new Date().toISOString(),
          wildbosses_payout: pricing.wildbosses_payout,
          cabana_revenue:    pricing.cabana_revenue,
          payout_status:     'pending',
        };

        /* save to Supabase */
        return _sbInsert('wb_bookings', {
          booking_ref:       booking.booking_ref,
          tour_id:           booking.tour_id,
          tour_name:         booking.tour_name,
          guest_name:        booking.guest_name,
          guest_phone:       booking.guest_phone,
          guest_email:       booking.guest_email,
          guests:            booking.guests,
          travel_date:       booking.travel_date,
          payment_reference: booking.payment_reference,
          payment_type:      booking.payment_type,
          context:           booking.context,
          partner_label:     booking.partner_label,
          cabana_user_id:    booking.cabana_user_id,
          pricing_json:      JSON.stringify(booking.pricing),
          notes:             booking.notes,
          status:            booking.status,
          wildbosses_payout: booking.wildbosses_payout,
          cabana_revenue:    booking.cabana_revenue,
          payout_status:     booking.payout_status,
        }).then(function() {
          API._notifyWildbosses(booking, tour);
          return booking;
        }).catch(function() {
          /* if DB insert fails, still notify and return booking */
          API._notifyWildbosses(booking, tour);
          return booking;
        });
      });
    },

    /* ── WhatsApp booking notification to Wildbosses ── */
    _notifyWildbosses: function (booking, tour) {
      var msg = [
        '🌿 *NEW BOOKING — Wildbosses*',
        '',
        '📋 Ref: ' + booking.booking_ref,
        '🗺 Tour: ' + booking.tour_name,
        '📅 Date: ' + booking.travel_date,
        '👥 Guests: ' + booking.guests,
        '',
        '👤 Guest: ' + booking.guest_name,
        '📞 Phone: ' + booking.guest_phone,
        booking.guest_email ? '📧 Email: ' + booking.guest_email : '',
        '',
        '💰 Tour price: KES ' + booking.pricing.base_total.toLocaleString(),
        booking.pricing.service_fee > 0 ? '🔧 Cabana fee: KES ' + booking.pricing.service_fee.toLocaleString() : '',
        '💵 Wildbosses payout: KES ' + booking.wildbosses_payout.toLocaleString(),
        '',
        '✅ Payment: ' + booking.payment_type + ' · Ref: ' + booking.payment_reference,
        '📲 Source: ' + booking.partner_label,
        booking.notes ? '📝 Notes: ' + booking.notes : '',
      ].filter(Boolean).join('\n');

      var waURL = 'https://wa.me/' + PARTNER_CONFIG.NOTIFY_WA + '?text=' + encodeURIComponent(msg);
      try {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = waURL;
        document.body.appendChild(iframe);
        setTimeout(function(){ if(iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 3000);
      } catch(e) { console.log('[WildbossesAPI] WA notify:', waURL); }
    },

    /* ── Utility ── */
    getPartnerConfig: function () { return Object.assign({}, PARTNER_CONFIG); },
    version: '2.0.0',
    partner: 'wildbosses',
  };

  W.WildbossesAPI = API;

}(window));
