# Suno Clone - Development Progress

## Завдання
Повнофункціональний клон Suno.com з AI-генерацією музики.

## Актуальна архітектура (2026-07)

- **Frontend:** `suno-clone/` — React 18 + Vite + TS + Tailwind + Supabase Auth
- **Генерація:** `python-service/` — FastAPI + Google Lyria 3 Pro (JWT auth, atomic credits)
- **Backend data:** Supabase Auth, Postgres, Storage, Edge Functions (`create-payment`, `payments-webhook`)
- **Legacy:** `generate-music` edge function — superseded by Python service

## Статус фаз

| Фаза | Статус |
|------|--------|
| Дизайн / tokens | Done |
| Frontend SPA | Done |
| Supabase schema + RLS | Done |
| Lyria 3 via Python | Done (needs GOOGLE_AI_API_KEY + service role) |
| Multi-provider payments | Code ready (needs Stripe/LiqPay + SITE_URL) |
| Merchant KYC + admin UI | Done (`/admin/merchants` for role=admin) |
| Env layout + JWT generate | Done (2026-07-11 hardening) |

## Потрібно від оператора (секрети, не в git)

1. `SUPABASE_SERVICE_ROLE_KEY` у root `.env`
2. `GOOGLE_AI_API_KEY` з доступом до `lyria-3-pro-preview`
3. Для оплат: `STRIPE_*` та/або `LIQPAY_*`, `SITE_URL`
4. Застосувати міграції на remote Supabase (`db push` / SQL editor), включно з `1783468900_profile_on_signup_trigger.sql`
5. Призначити admin: `UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';`

## Локальний запуск

```bash
# root .env already has VITE_* ; fill service role + Google key
cd python-service && python main.py
cd suno-clone && pnpm dev
```

## Deploy notes

- Frontend: set `VITE_SUPABASE_*` and `VITE_GENERATE_API_URL` to the public Python URL
- Python: deploy with `SUPABASE_*`, `GOOGLE_AI_API_KEY`, restricted `CORS_ORIGINS`
- Do not hardcode localhost in production builds
