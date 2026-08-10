/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · CREATE BOOKING
   Runs server-side with the service role key so it bypasses RLS.
   The browser never writes to Postgres directly — that avoids the
   anon-policy dead ends and lets us validate properly.
   ═══════════════════════════════════════════════════════════════════ */

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).end(JSON.stringify(body));
}

function makeRef() {
  return 'WB' + Date.now().toString(36).toUpperCase() +
         Math.random().toString(36).slice(2, 5).toUpperCase();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) {
    return json(res, 500, { error: 'Server not configured' });
  }

  try {
    const b = req.body || {};

    if (!b.tour_slug)   return json(res, 400, { error: 'Missing trip' });
    if (!b.guest_name)  return json(res, 400, { error: 'Name is required' });
    if (!b.guest_phone) return json(res, 400, { error: 'Phone is required' });

    const travellers = Math.max(1, parseInt(b.travellers, 10) || 1);
    const intent = ['deposit', 'full', 'enquiry'].includes(b.intent) ? b.intent : 'enquiry';

    /* ── 1 · Load the trip server-side. Never trust client pricing. ── */
    const tRes = await fetch(
      SB_URL + '/rest/v1/tours?select=id,name,price_kes,deposit_pct,spots_left,status' +
      '&slug=eq.' + encodeURIComponent(b.tour_slug) + '&limit=1',
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }
    );
    if (!tRes.ok) throw new Error('Could not load trip');
    const tours = await tRes.json();
    const tour = tours[0];
    if (!tour) return json(res, 404, { error: 'Trip not found' });

    if (tour.spots_left != null && travellers > tour.spots_left) {
      return json(res, 409, {
        error: 'Only ' + tour.spots_left + ' place(s) left on this departure.'
      });
    }

    /* ── 2 · Compute money on the server ── */
    const unit       = Number(tour.price_kes) || 0;
    const total      = unit * travellers;
    const depositPct = Number(tour.deposit_pct) || 30;
    const deposit    = Math.ceil(total * depositPct / 100);

    const payNow = intent === 'full'    ? total
                 : intent === 'deposit' ? deposit
                 : 0;

    /* ── 3 · Insert ── */
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
      method: 'POST',
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
      console.error('booking insert failed:', txt);
      return json(res, 502, { error: 'Could not save your booking. Please try again.' });
    }

    return json(res, 200, {
      ok:         true,
      ref:        ref,
      total:      total,
      deposit:    deposit,
      pay_now:    payNow,
      intent:     intent,
      tour_name:  tour.name,
      travellers: travellers
    });

  } catch (err) {
    console.error('book handler error:', err);
    return json(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};
