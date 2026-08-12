# pay-callback Edge Function

Receives PayHero payment callbacks and settles bookings in Supabase.

## Why an Edge Function?
PayHero (Jul 2026 security update) blocks free-tier hosting (Vercel, Render,
Ngrok) as callback URLs. This function runs on supabase.co — a verified
production domain PayHero accepts. No custom domain needed.

## Callback URL
Set per-request by `/api/pay`, not in the PayHero dashboard:

```
https://uhoqbticmkeufuxnrate.supabase.co/functions/v1/pay-callback?k=<WB_CALLBACK_SECRET>
```

The secret may also be sent as an `x-wb-callback-key` header.

## The payload shape that matters
PayHero nests the real fields one level down, using Safaricom's names:

```json
{ "status": true,
  "response": {
    "ExternalReference": "WBMSPNG345NS8",
    "CheckoutRequestID": "ws_CO_1501202416432151...",
    "MpesaReceiptNumber": "SAE3YULR0Y",
    "ResultCode": 0,
    "Status": "Success",
    "Amount": 1
  } }
```

Reading only the top level — as this function originally did — finds no
reference and rejects every callback.

## Trust model
1. `?k=` secret — a doorman. Non-fatal: an unsigned caller is logged as
   `untrusted`, capped at 30 per 10 minutes, and still verified.
2. Booking must exist, be unpaid, and have a stored checkout id.
3. **The lock:** PayHero's own `/transaction-status` must return SUCCESS.
   Amount and receipt are taken from that response, never from the body.

Fails closed. A booking that cannot be verified is never settled — the
browser poll in `/api/pay-status` picks it up instead.

## Deploy
```bash
supabase functions deploy pay-callback --project-ref uhoqbticmkeufuxnrate --no-verify-jwt
```

## Required secrets
Set under Edge Functions → Secrets:
- `PAYHERO_USERNAME`, `PAYHERO_PASSWORD` — to verify transactions
- `WB_CALLBACK_SECRET` — must match the Vercel env var exactly
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — provided automatically
