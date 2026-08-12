/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · CREATE BOOKING
   Runs server-side with the service role key so it bypasses RLS.
   The browser never writes to Postgres directly.
   ═══════════════════════════════════════════════════════════════════ */

/* Same-origin only. These endpoints create bookings and trigger real
   M-Pesa charges, so a wildcard here would let any page on the internet
   fire them from a visitor's browser. The site's own fetches are
   same-origin and send no Origin header we need to answer. */
const ALLOWED = [
  'https://wildbosses.vercel.app',
  'http://localhost:3000'
];
function setCors(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
}

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(body));
}

function corsOk(res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).end();
}

function makeRef() {
  return 'WB' + Date.now().toString(36).toUpperCase() +
         Math.random().toString(36).slice(2, 5).toUpperCase();
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return corsOk(res);
  if (req.method !== 'POST')   return json(res, 405, { error: 'Method not allowed' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SB_URL || !SB_KEY) {
    console.error('[book] MISSING ENV VARS — SUPABASE_URL:', !!SB_URL, 'SUPABASE_SERVICE_ROLE_KEY:', !!SB_KEY);
    return json(res, 500, {
      error: 'Server not configured. Please contact Wild Bosses directly on WhatsApp.'
    });
  }

  try {
    const b = req.body || {};

    if (!b.tour_slug)   return json(res, 400, { error: 'Missing trip' });
    if (!b.guest_name)  return json(res, 400, { error: 'Name is required' });
    if (!b.guest_phone) return json(res, 400, { error: 'Phone is required' });

    const travellers = Math.max(1, parseInt(b.travellers, 10) || 1);
    const intent = ['deposit', 'full', 'enquiry'].includes(b.intent) ? b.intent : 'enquiry';

    /* ── 1 · Load the trip server-side. Never trust client pricing ── */
    const tRes = await fetch(
      SB_URL + '/rest/v1/tours?select=id,name,price_kes,deposit_pct,spots_left,status,slug' +
      '&slug=eq.' + encodeURIComponent(b.tour_slug) + '&limit=1',
      {
        headers: {
          apikey:        SB_KEY,
          Authorization: 'Bearer ' + SB_KEY,
          Accept:        'application/json'
        }
      }
    );

    if (!tRes.ok) {
      const txt = await tRes.text();
      console.error('[book] Supabase tour fetch failed:', tRes.status, txt);
      throw new Error('Could not load trip details. Please try again.');
    }

    const tours = await tRes.json();
    const tour  = tours[0];
    if (!tour) return json(res, 404, { error: 'Trip not found. It may have been removed.' });
    if (tour.status === 'closed') {
      return json(res, 409, { error: 'This departure is no longer accepting bookings.' });
    }

    /* The old guard read `spots_left > 0 && travellers > spots_left`,
       which quietly waved through every booking on a departure with
       zero seats — the one case it most needed to catch. */
    if (tour.spots_left != null && travellers > tour.spots_left) {
      return json(res, 409, {
        error: tour.spots_left <= 0
          ? 'This departure is fully booked. Message us on WhatsApp and we will find you another date.'
          : 'Only ' + tour.spots_left + ' place' + (tour.spots_left === 1 ? '' : 's') + ' left on this departure.'
      });
    }

    /* ── 2 · Compute money server-side ── */
    const unit       = Number(tour.price_kes) || 0;
    const total      = unit * travellers;
    const depositPct = Number(tour.deposit_pct) || 30;
    const depositAmt = Math.ceil(total * depositPct / 100);

    const payNow = unit === 0          ? 0
                 : intent === 'full'   ? total
                 : intent === 'deposit'? depositAmt
                 : 0;

    /* ── 3 · Insert booking ── */
    const ref = makeRef();
    const row = {
      booking_ref:    ref,
      tour_id:        tour.id,
      tour_name:      tour.name,
      guest_name:     String(b.guest_name).trim().slice(0, 120),
      guest_phone:    String(b.guest_phone).trim().slice(0, 32),
      guest_email:    b.guest_email ? String(b.guest_email).trim().slice(0, 160) : null,
      guests:         travellers,
      notes:          b.notes ? String(b.notes).slice(0, 2000) : null,
      base_amount:    unit,
      total_amount:   total,
      source:         'direct',
      payment_type:   intent === 'enquiry' ? 'pending' : intent,
      payment_status: 'pending',
      status:         'pending'
    };

    const iRes = await fetch(SB_URL + '/rest/v1/bookings', {
      method:  'POST',
      headers: {
        apikey:         SB_KEY,
        Authorization:  'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal'
      },
      body: JSON.stringify(row)
    });

    if (!iRes.ok) {
      const txt = await iRes.text();
      console.error('[book] insert failed:', iRes.status, txt);
      /* Check for duplicate ref (extremely rare) and retry once */
      if (iRes.status === 409) {
        return json(res, 409, { error: 'A conflict occurred. Please try again.' });
      }
      throw new Error('Could not save your booking. Please try again.');
    }

    console.log('[book] created:', ref, 'tour:', tour.name, 'intent:', intent, 'payNow:', payNow);

    return json(res, 200, {
      ok:         true,
      ref:        ref,
      total:      total,
      deposit:    depositAmt,
      pay_now:    payNow,
      intent:     intent,
      tour_name:  tour.name,
      travellers: travellers
    });

  } catch (err) {
    console.error('[book] handler error:', err.message);
    return json(res, 500, {
      error: err.message || 'Something went wrong. Please try again or contact us on WhatsApp.'
    });
  }
};
