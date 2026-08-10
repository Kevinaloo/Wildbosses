/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT STATUS
   Client polls this after STK push until payment resolves.
   Returns payment_status + booking status from Supabase.
   Service key bypasses RLS so guest can always check their booking.
   ═══════════════════════════════════════════════════════════════════ */

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') return res.status(405).end('{}');

  const ref = (req.query.ref || '').trim();
  if (!ref) return res.status(400).json({ error: 'ref is required' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const qs = '?booking_ref=eq.' + encodeURIComponent(ref) +
               '&select=payment_status,status,payment_ref,paid_amount&limit=1';

    const resp = await fetch(SB_URL + '/rest/v1/bookings' + qs, {
      headers: {
        apikey:        SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        Accept:        'application/json'
      }
    });

    if (!resp.ok) {
      throw new Error('Supabase error ' + resp.status);
    }

    const rows = await resp.json();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const row = rows[0];
    return res.status(200).json({
      ok:             true,
      payment_status: row.payment_status,   /* pending | paid | failed */
      status:         row.status,           /* pending | confirmed | cancelled */
      payment_ref:    row.payment_ref || null,
      paid_amount:    row.paid_amount || null
    });

  } catch (err) {
    console.error('[pay-status] error:', err.message);
    return res.status(502).json({ error: err.message });
  }
};
