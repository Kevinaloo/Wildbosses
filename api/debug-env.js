/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · ENV DEBUG (temporary — remove after confirming)
   Hit /api/debug-env to see which env vars are present and test
   a live Supabase connection.
   ═══════════════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const SB_URL  = process.env.SUPABASE_URL;
  const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const PH_USER = process.env.PAYHERO_USERNAME;
  const PH_PASS = process.env.PAYHERO_PASSWORD;
  const PH_CHAN = process.env.PAYHERO_CHANNEL_ID;

  const envCheck = {
    SUPABASE_URL:             !!SB_URL,
    SUPABASE_SERVICE_ROLE_KEY:!!SB_KEY,
    PAYHERO_USERNAME:         !!PH_USER,
    PAYHERO_PASSWORD:         !!PH_PASS,
    PAYHERO_CHANNEL_ID:       !!PH_CHAN,
    SUPABASE_URL_value:       SB_URL ? SB_URL.slice(0,40) + '…' : null,
    PAYHERO_CHANNEL_ID_value: PH_CHAN || null,
  };

  let supabaseTest = null;
  if (SB_URL && SB_KEY) {
    try {
      const r = await fetch(
        SB_URL + '/rest/v1/tours?select=id,slug,name,status&limit=3',
        { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }
      );
      const body = await r.text();
      supabaseTest = {
        status: r.status,
        ok: r.ok,
        body: body.slice(0, 500)
      };
    } catch (e) {
      supabaseTest = { error: e.message };
    }
  }

  return res.status(200).json({ env: envCheck, supabaseTest });
};
