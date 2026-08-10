/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT STATUS
   Client polls this after STK push to learn if payment succeeded.
   Returns booking payment_status from Supabase (service key reads
   past RLS so the guest can check their own booking status).
   ═══════════════════════════════════════════════════════════════════ */

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') return res.status(405).end('{}');

  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ error: 'ref is required' });

  try {
    const url  = process.env.SUPABASE_URL + '/rest/v1/bookings';
    const key  = process.env.SUPABASE_SERVICE_KEY;
    const qs   = '?booking_ref=eq.' + encodeURIComponent(ref) + '&select=payment_status,status&limit=1';

    const resp = await fetch(url + qs, {
      headers: {
        apikey:        key,
        Authorization: 'Bearer ' + key
      }
    });
    if (!resp.ok) throw new Error('Supabase error ' + resp.status);
    const rows = await resp.json();
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    return res.status(200).json({
      ok:             true,
      payment_status: rows[0].payment_status,
      status:         rows[0].status
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
