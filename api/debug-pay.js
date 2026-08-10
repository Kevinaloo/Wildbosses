/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PayHero diagnostic (temporary — remove after fix)
   GET /api/debug-pay  — tests credentials and channel
   POST /api/debug-pay — fires a real test STK push to a number you pass
     body: { phone: "07xx", amount: 1 }
   ═══════════════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const user   = process.env.PAYHERO_USERNAME   || '';
  const pass   = process.env.PAYHERO_PASSWORD   || '';
  const chanId = process.env.PAYHERO_CHANNEL_ID || '';

  const creds = {
    PAYHERO_USERNAME:   user   ? user.slice(0,4)   + '…' : '(missing)',
    PAYHERO_PASSWORD:   pass   ? pass.slice(0,4)   + '…' : '(missing)',
    PAYHERO_CHANNEL_ID: chanId || '(missing)',
    channel_id_as_number: Number(chanId),
    channel_id_valid: Number(chanId) > 0
  };

  if (req.method === 'GET') {
    /* Just show credential status */
    return res.status(200).json({ creds });
  }

  if (req.method !== 'POST') return res.status(405).end('{}');

  const { phone = '0716206494', amount = 1 } = req.body || {};

  if (!user || !pass || !chanId) {
    return res.status(200).json({ creds, error: 'Missing PayHero credentials' });
  }

  const token   = Buffer.from(user + ':' + pass).toString('base64');
  let   cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0'))    cleaned = '254' + cleaned.slice(1);
  if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;

  /* Try multiple provider strings — PayHero is picky */
  const providers = ['M-Pesa', 'mpesa', 'MPESA', 'm-pesa'];
  const results   = [];

  for (const provider of providers) {
    const payload = {
      amount:             Number(amount),
      phone_number:       cleaned,
      channel_id:         Number(chanId),
      provider:           provider,
      external_reference: 'TEST-' + Date.now(),
      customer_name:      'Test User',
      callback_url:       'https://wildbosses.vercel.app/api/pay-callback'
    };

    try {
      const r   = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        method:  'POST',
        headers: { Authorization: 'Basic ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(payload)
      });
      const txt  = await r.text();
      let   body;
      try { body = JSON.parse(txt); } catch(e) { body = txt; }

      results.push({ provider, status: r.status, ok: r.ok, body });
      /* If one works, stop */
      if (r.ok) break;
    } catch(e) {
      results.push({ provider, error: e.message });
    }
  }

  return res.status(200).json({ creds, phone_sent: cleaned, amount, results });
};
