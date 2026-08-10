/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT CALLBACK
   PayHero posts here when M-Pesa confirms or fails the payment.
   We update the booking payment_status accordingly.

   PayHero v2 callback payload shapes (all seen in production):
     { status: 'SUCCESS', external_reference, mpesa_receipt_number, ... }
     { status: 'FAILED',  external_reference, ... }
     { status: 'CANCELLED', ... }
   ═══════════════════════════════════════════════════════════════════ */

async function patchBooking(ref, patch) {
  const url = process.env.SUPABASE_URL + '/rest/v1/bookings';
  const key = process.env.SUPABASE_SERVICE_KEY;
  const resp = await fetch(url + '?booking_ref=eq.' + encodeURIComponent(ref), {
    method:  'PATCH',
    headers: {
      apikey:         key,
      Authorization:  'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer:         'return=minimal'
    },
    body: JSON.stringify(patch)
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error('Supabase PATCH failed (' + resp.status + '): ' + txt);
  }
}

module.exports = async function handler(req, res) {
  /* Always respond 200 to PayHero so it stops retrying */
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(200).end('{}');
  }

  const body = req.body || {};
  console.log('[pay-callback] received:', JSON.stringify(body));

  try {
    /* PayHero v2 callback — try all known field names */
    const rawStatus = (body.status || body.Status || '').toUpperCase();
    const ref       = body.external_reference
                   || body.ExternalReference
                   || body.reference
                   || '';
    const mpesaRef  = body.mpesa_receipt_number
                   || body.MpesaReceiptNumber
                   || body.mpesa_code
                   || null;
    const amount    = body.amount || body.Amount || null;

    if (!ref) {
      console.warn('[pay-callback] no reference in payload:', JSON.stringify(body));
      return res.status(200).json({ ok: false, reason: 'no_reference' });
    }

    let paymentStatus, bookingStatus;

    switch (rawStatus) {
      case 'SUCCESS':
        paymentStatus = 'paid';
        bookingStatus = 'confirmed';
        break;
      case 'FAILED':
      case 'CANCELLED':
      case 'TIMEOUT':
        paymentStatus = 'failed';
        bookingStatus = null; /* leave booking status as-is */
        break;
      default:
        /* Unknown status — log and acknowledge */
        console.warn('[pay-callback] unknown status:', rawStatus);
        return res.status(200).json({ ok: false, reason: 'unknown_status:' + rawStatus });
    }

    const patch = {
      payment_status: paymentStatus,
      updated_at:     new Date().toISOString()
    };

    if (paymentStatus === 'paid') {
      patch.payment_type = 'deposit'; /* or 'full' — we don't distinguish here */
      if (mpesaRef)  patch.payment_ref = mpesaRef;
      if (amount)    patch.paid_amount = Number(amount);
      if (bookingStatus) patch.status  = bookingStatus;
    }

    await patchBooking(ref, patch);
    console.log('[pay-callback] updated booking', ref, '→', paymentStatus);

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[pay-callback] error:', err.message);
    /* Still 200 — PayHero must not retry endlessly */
    return res.status(200).json({ ok: false, error: err.message });
  }
};
