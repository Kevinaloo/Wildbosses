/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT CALLBACK
   PayHero posts here when M-Pesa confirms or fails payment.
   We update the booking payment_status accordingly.
   ═══════════════════════════════════════════════════════════════════ */

async function patchBooking(bookingRef, patch) {
  const url = process.env.SUPABASE_URL + '/rest/v1/bookings';
  const key = process.env.SUPABASE_SERVICE_KEY;
  const qs  = '?booking_ref=eq.' + encodeURIComponent(bookingRef);
  const resp = await fetch(url + qs, {
    method:  'PATCH',
    headers: {
      apikey:         key,
      Authorization:  'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer:         'return=minimal'
    },
    body: JSON.stringify(patch)
  });
  if (!resp.ok) throw new Error(await resp.text());
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).end('{}');
  }

  try {
    const body = req.body || {};

    /*  PayHero callback shape (v2):
        { status: 'SUCCESS'|'FAILED', external_reference, ... } */
    const status   = (body.status   || '').toUpperCase();
    const ref      = body.external_reference || body.reference || '';
    const mpesaRef = body.mpesa_receipt_number || body.MpesaReceiptNumber || null;

    if (!ref) {
      console.warn('pay-callback: no reference in payload', body);
      return res.status(200).end('{}');
    }

    const patch = {
      payment_status: status === 'SUCCESS' ? 'paid' : 'failed',
      updated_at:     new Date().toISOString()
    };

    if (status === 'SUCCESS') {
      patch.payment_type = 'deposit';
      if (mpesaRef) patch.payment_ref = mpesaRef;
    }

    await patchBooking(ref, patch);
    console.log('pay-callback:', ref, '→', patch.payment_status);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('pay-callback error:', err.message);
    /* Always return 200 to PayHero so it stops retrying */
    return res.status(200).json({ ok: false, error: err.message });
  }
};
