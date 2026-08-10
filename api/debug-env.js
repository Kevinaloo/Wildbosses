/* temporary diagnostic — remove after fix */
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const SB_URL  = process.env.SUPABASE_URL          || '';
  const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const PH_USER = process.env.PAYHERO_USERNAME       || '';
  const PH_PASS = process.env.PAYHERO_PASSWORD       || '';
  const PH_CHAN = process.env.PAYHERO_CHANNEL_ID     || '';

  /* Show first/last 6 chars of each key so you can verify without exposing them */
  function peek(s) {
    if (!s) return '(empty)';
    if (s.length <= 12) return s.slice(0,3) + '…';
    return s.slice(0,6) + '…' + s.slice(-6);
  }

  const envReport = {
    SUPABASE_URL:              { set: !!SB_URL,  peek: peek(SB_URL)  },
    SUPABASE_SERVICE_ROLE_KEY: { set: !!SB_KEY,  peek: peek(SB_KEY)  },
    PAYHERO_USERNAME:          { set: !!PH_USER, peek: peek(PH_USER) },
    PAYHERO_PASSWORD:          { set: !!PH_PASS, peek: peek(PH_PASS) },
    PAYHERO_CHANNEL_ID:        { set: !!PH_CHAN, peek: PH_CHAN        },
  };

  /* Test 1: raw Supabase REST ping */
  let supabasePing = null;
  if (SB_URL && SB_KEY) {
    try {
      const url = SB_URL.replace(/\/$/, '') + '/rest/v1/tours?select=id,slug,status&limit=3';
      const r   = await fetch(url, {
        headers: {
          apikey:        SB_KEY,
          Authorization: 'Bearer ' + SB_KEY,
          Accept:        'application/json'
        }
      });
      const txt = await r.text();
      supabasePing = { status: r.status, ok: r.ok, body: txt.slice(0,600) };
    } catch(e) {
      supabasePing = { error: e.message };
    }
  } else {
    supabasePing = 'skipped (env vars missing)';
  }

  /* Test 2: PayHero auth check */
  let payheroPing = null;
  if (PH_USER && PH_PASS) {
    try {
      const token = Buffer.from(PH_USER + ':' + PH_PASS).toString('base64');
      const r = await fetch('https://backend.payhero.co.ke/api/v2/payments?page=1&per_page=1', {
        headers: { Authorization: 'Basic ' + token, Accept: 'application/json' }
      });
      const txt = await r.text();
      payheroPing = { status: r.status, ok: r.ok, body: txt.slice(0,300) };
    } catch(e) {
      payheroPing = { error: e.message };
    }
  } else {
    payheroPing = 'skipped (env vars missing)';
  }

  return res.status(200).json({ envReport, supabasePing, payheroPing });
};
