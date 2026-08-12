/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · PAYMENT STATUS POLL

   The browser polls this every few seconds after an STK push. It is
   also the safety net: if PayHero's callback never lands — wrong URL,
   dropped request, their outage — this is what still notices the money
   arrived and settles the booking.

   Settlement always goes through confirm_payment(), the same atomic
   RPC the callback uses. This poll and the callback race constantly; a
   direct PATCH here would let both apply and credit twice. The RPC is
   idempotent on the M-Pesa receipt, so whichever arrives second is a
   no-op.
   ═══════════════════════════════════════════════════════════════════ */

const PAYHERO_STATUS_URL = 'https://backend.payhero.co.ke/api/v2/transaction-status';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED = [
  'https://wildbosses.vercel.app',
  'http://localhost:3000'
];
function setCors(req, res) {
  const origin = req.headers && req.headers.origin;
  if (!origin) return;
  let sameHost = false;
  try { sameHost = new URL(origin).host === req.headers.host; } catch { /* malformed */ }
  if (ALLOWED.includes(origin) || sameHost) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
}

async function sb(path, init) {
  init = init || {};
  return await fetch(SB_URL + '/rest/v1/' + path, {
    ...init,
    headers: {
      apikey:         SB_KEY,
      Authorization:  'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
}

/* PayHero answers in more than one shape depending on the endpoint and
   the age of the transaction. Sometimes the useful fields are at the
   top level; sometimes they are nested under `response` with Safaricom's
   PascalCase names. Read both rather than guessing which. */
function readStatus(data) {
  if (!data || typeof data !== 'object') return { status: '', amount: 0, receipt: null, desc: '', raw: '' };

  const r = (data.response && typeof data.response === 'object') ? data.response : data;

  let status = String(
    r.status || r.Status || data.status || data.Status || ''
  ).toUpperCase().trim();

  /* Safaricom's ResultCode is the most reliable signal when present:
     0 means the customer completed the payment, anything else is a
     failure. It settles the ambiguity of "Success" vs "SUCCESS" vs a
     status string PayHero has not documented. */
  const codeRaw = r.ResultCode !== undefined ? r.ResultCode : r.result_code;
  if (codeRaw !== undefined && codeRaw !== null && codeRaw !== '') {
    const code = Number(codeRaw);
    if (Number.isFinite(code)) status = code === 0 ? 'SUCCESS' : (status || 'FAILED');
  }

  const amount = Number(
    r.amount !== undefined ? r.amount : (r.Amount !== undefined ? r.Amount : 0)
  ) || 0;

  const receipt = String(
    r.mpesa_receipt_number || r.MpesaReceiptNumber || r.mpesa_code ||
    r.receipt || data.mpesa_receipt_number || ''
  ).trim() || null;

  /* Why it failed matters as much as that it failed. Kept out of the
     customer-facing response and written to the audit log instead. */
  var desc = '';
  var cands = [r.ResultDesc, r.result_desc, r.errorMessage, r.error_message,
               r.message, data.error_message, data.message];
  for (var i = 0; i < cands.length; i++) {
    if (cands[i] !== undefined && cands[i] !== null && String(cands[i]).trim()) {
      desc = String(cands[i]).trim(); break;
    }
  }

  var raw = '';
  try { raw = JSON.stringify(data).slice(0, 400); } catch (e) { raw = '(unserialisable)'; }

  return { status: status, amount: amount, receipt: receipt, desc: desc, raw: raw };
}

/* Ask PayHero what happened. `reference` is PayHero's own id; if that
   misses we retry with Safaricom's, so a booking written before the
   two ids were separated still resolves. */
async function queryPayHero(ids) {
  const user = process.env.PAYHERO_USERNAME;
  const pass = process.env.PAYHERO_PASSWORD;
  if (!user || !pass) return null;

  const token = Buffer.from(user + ':' + pass).toString('base64');
  const tried = [];

  for (const id of ids) {
    if (!id || tried.includes(id)) continue;
    tried.push(id);

    const ctl  = new AbortController();
    const kill = setTimeout(function () { ctl.abort(); }, 6000);
    try {
      const resp = await fetch(
        PAYHERO_STATUS_URL + '?reference=' + encodeURIComponent(id),
        {
          headers: { Authorization: 'Basic ' + token, Accept: 'application/json' },
          signal:  ctl.signal
        }
      );
      const text = await resp.text();
      if (!resp.ok) {
        console.warn('[pay-status] PayHero', resp.status, 'for', id, text.slice(0, 200));
        continue;
      }
      const parsed = readStatus(JSON.parse(text));
      if (parsed.status) {
        console.log('[pay-status]', id, '→', parsed.status, parsed.desc ? '— ' + parsed.desc : '', parsed.raw);
        return parsed;
      }
    } catch (e) {
      console.warn('[pay-status] query failed for', id, '—', e.message);
    } finally {
      clearTimeout(kill);
    }
  }
  return null;
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

  const ref = String((req.query && req.query.ref) || '').trim();
  if (!ref) return res.status(400).json({ error: 'ref is required' });

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  /* The browser numbers its polls. We only spend a PayHero call every
     other one — 3-second polling for two minutes would otherwise be 40
     upstream requests per payment. A client that sends no counter (an
     old cached script) gets the old every-time behaviour. */
  const nRaw   = (req.query && req.query.n);
  const attempt = nRaw === undefined ? null : (Number(nRaw) || 0);
  const askPayHero = attempt === null || attempt % 2 === 0 || attempt >= 20;

  try {
    const qs = '?booking_ref=eq.' + encodeURIComponent(ref) +
               '&select=payment_status,status,payment_ref,checkout_id,' +
               'provider_checkout_id,paid_amount,total_amount,mpesa_receipt&limit=1';

    const resp = await sb('bookings' + qs);
    if (!resp.ok) throw new Error('Supabase error ' + resp.status);

    const rows = await resp.json();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const row = rows[0];
    let payheroStatus = null;

    /* Already settled — nothing to ask anyone. */
    if (row.payment_status !== 'paid' && askPayHero) {
      const ph = await queryPayHero([
        row.checkout_id,
        row.provider_checkout_id,
        row.payment_ref            /* legacy rows, before the columns split */
      ]);

      if (ph) {
        payheroStatus = ph.status;

        if (ph.status === 'SUCCESS') {
          const rpc = await sb('rpc/confirm_payment', {
            method: 'POST',
            body:   JSON.stringify({
              p_ref:      ref,
              p_receipt:  ph.receipt,
              p_amount:   Math.round(ph.amount),
              p_checkout: row.checkout_id || null
            })
          }).catch(function (e) {
            console.warn('[pay-status] confirm_payment failed:', e.message);
            return null;
          });

          if (rpc && rpc.ok) {
            row.payment_status = 'paid';
            row.paid_amount    = (Number(row.paid_amount) || 0) + Math.round(ph.amount);
            row.mpesa_receipt  = ph.receipt || row.mpesa_receipt;
          }

        } else if (['FAILED', 'CANCELLED', 'CANCELED', 'TIMEOUT'].includes(ph.status)) {
          /* Ending the poll early matters: without this the customer
             stares at a spinner for two minutes after tapping Cancel. */
          await sb('rpc/fail_payment', {
            method: 'POST',
            body:   JSON.stringify({ p_ref: ref, p_reason: ph.status })
          }).catch(function (e) {
            console.warn('[pay-status] fail_payment failed:', e.message);
          });

          /* The reason belongs in the audit log, not in the response
             body — the customer does not need a Safaricom result code,
             but we do, and after the fact. */
          await sb('payment_events', {
            method:  'POST',
            headers: { Prefer: 'return=minimal' },
            body:    JSON.stringify({
              booking_ref: ref, kind: 'status_poll', outcome: 'ok',
              checkout_id: row.checkout_id || null,
              detail: { payhero_status: ph.status, reason: ph.desc, raw: ph.raw }
            })
          }).catch(function () { /* diagnostics must never break the poll */ });
          row.payment_status = 'failed';
        }
      }
    }

    return res.status(200).json({
      ok:             true,
      payment_status: row.payment_status,
      status:         row.status,
      payment_ref:    row.mpesa_receipt || row.payment_ref || null,
      paid_amount:    row.paid_amount   || null,
      total_amount:   row.total_amount  || null,
      payhero_status: payheroStatus
    });

  } catch (err) {
    console.error('[pay-status] error:', err.message);
    return res.status(502).json({ error: err.message });
  }
};
