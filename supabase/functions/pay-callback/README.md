# pay-callback Edge Function

Receives PayHero payment callbacks and updates bookings in Supabase.

## Why an Edge Function?
PayHero (Jul 2026 security update) blocks free-tier hosting (Vercel, Render,
Ngrok) as callback URLs. This function runs on supabase.co — a verified
production domain PayHero accepts.

## Callback URL to set in PayHero
```
https://uhoqbticmkeufuxnrate.supabase.co/functions/v1/pay-callback
```

## Deploy
```bash
supabase functions deploy pay-callback --project-ref uhoqbticmkeufuxnrate
```

## Required secrets (auto-available in Edge Functions)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
