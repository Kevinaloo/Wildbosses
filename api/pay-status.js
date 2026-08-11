/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT STATUS POLL
   Client polls this every 3s after STK push.
   Also accepts ?checkout_id= to query PayHero directly for faster confirmation.
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

module.exports = async function handler(req, res) {
  setCors(req, res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') return res.status(405).end('{}');

  const ref = (req.query.ref || '').trim();
  if (!ref) return res.status(400).json({ error: 'ref is required' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const qs = '?booking_ref=eq.' + encodeURIComponent(ref) +
               '&select=payment_status,status,payment_ref,checkout_id,paid_amount&limit=1';

    const resp = await fetch(SB_URL + '/rest/v1/bookings' + qs, {
      headers: {
        apikey:        SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        Accept:        'application/json'
      }
    });

    if (!resp.ok) throw new Error('Supabase error ' + resp.status);

    const rows = await resp.json();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const row = rows[0];

    /* Also query PayHero directly if we have a checkout_request_id stored */
    let payheroStatus = null;
    const checkoutId  = row.checkout_id || row.payment_ref;  /* checkout_id is authoritative; payment_ref kept for legacy rows */

    if (checkoutId && process.env.PAYHERO_USERNAME && process.env.PAYHERO_PASSWORD) {
      try {
        const token = Buffer.from(
          process.env.PAYHERO_USERNAME + ':' + process.env.PAYHERO_PASSWORD
        ).toString('base64');

        const phResp = await fetch(
          'https://backend.payhero.co.ke/api/v2/transaction-status?reference=' +
          encodeURIComponent(checkoutId),
          {
            headers: {
              Authorization: 'Basic ' + token,
              Accept:        'application/json'
            }
          }
        );

        if (phResp.ok) {
          const phData = await phResp.json();
          console.log('[pay-status] PayHero direct status:', JSON.stringify(phData));
          payheroStatus = phData.status || null;

          /* Settle through the same atomic RPC the callback uses.
             This poll and the callback race constantly — a direct PATCH
             here would let both apply, crediting the booking twice.
             confirm_payment() is idempotent on the M-Pesa receipt, so
             whichever arrives second is a no-op. */
          if ((payheroStatus || '').toUpperCase() === 'SUCCESS' &&
               row.payment_status !== 'paid') {
            await fetch(SB_URL + '/rest/v1/rpc/confirm_payment', {
              method: 'POST',
              headers: {
                apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                p_ref:      ref,
                p_receipt:  phData.mpesa_receipt_number || null,
                p_amount:   Math.round(Number(phData.amount) || 0),
                p_checkout: checkoutId
              })
            }).catch(e => console.warn('[pay-status] confirm_payment failed:', e.message));

            row.payment_status = 'paid';
          }
        }
      } catch(e) {
        console.warn('[pay-status] PayHero direct query failed (non-fatal):', e.message);
      }
    }

    return res.status(200).json({
      ok:             true,
      payment_status: row.payment_status,
      status:         row.status,
      payment_ref:    row.payment_ref    || null,
      paid_amount:    row.paid_amount    || null,
      payhero_status: payheroStatus
    });

  } catch (err) {
    console.error('[pay-status] error:', err.message);
    return res.status(502).json({ error: err.message });
  }
};
