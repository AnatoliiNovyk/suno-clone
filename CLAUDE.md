# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## Working Agreement (READ FIRST)

These project-specific rules override default behavior and are enforced by the repo owner:

1. **Respond in Ukrainian.** All chat replies to the user must be in Ukrainian (Відповіді надавай виключно українською мовою). Code, identifiers, and commit messages stay in English.
2. **Do not change project files without approval.** The **only** exception is files inside `changelogs/`. For any other edit, propose the change and wait for the user to confirm before writing.
3. **Write a changelog after every change.** After each edit/fix, add a new file to `changelogs/` named `changelog_YYYY-MM-DD_short-description.md` (date of the change; description in latin letters with hyphens instead of spaces). The entry must describe **how it was before** the change and **what improvement** the change delivers.

> Note: `.github/copilot-instructions.md` contains an older version of these rules plus some now-stale technical claims (e.g. that generation is a "mock" in the edge function). Treat *this* file as the source of truth for architecture; treat the three rules above as binding conventions.

## What This Project Is

A full-stack clone of Suno's AI music-generation experience:

- **`suno-clone/`** — React 18 + TypeScript + Vite SPA (the user-facing app).
- **`python-service/`** — FastAPI service that performs the **actual** music generation via Google Lyria 3 Pro (Gemini Interactions API). This is the live generation backend today.
- **`supabase/`** — Postgres schema (`tables/`), one RLS migration (`migrations/`), Storage, and Deno **edge functions** (`functions/`). Auth, DB, and Storage are used in production; the `generate-music` edge function is now **legacy** (superseded by `python-service`).
- **`docs/`** — design system, tokens, and Suno UX analysis. **`imgs/`** — design/marketing assets. **`memories/`** — long-form progress log. **`changelogs/`** — per-change log (see rule 3).

**Stack:** React 18, TypeScript, Vite 6, Tailwind CSS 3 + Radix UI, React Router 6, React Hook Form + Zod, `@supabase/supabase-js` | Supabase (Auth, Postgres, Storage, Deno Edge Functions) | FastAPI + `google-genai` (Lyria 3 Pro via the Gemini Interactions API) | Stripe.

## Architecture & Data Flow

### Current music-generation flow (Lyria 3 via Python service)

Both the simple flow (`CreatePage.tsx`) and the advanced flow (`AdvancedPage.tsx`) call the **Python generation service** via `src/lib/generateApi.ts` (not the Supabase edge function):

1. Frontend `POST {VITE_GENERATE_API_URL}/generate-music` with `Authorization: Bearer <supabase_jwt>` and body `{ prompt, genre, lyrics?, negative_prompt? }`.
2. Service verifies the JWT (`GET {SUPABASE_URL}/auth/v1/user`), ignores spoofed `user_id`, runs preflight (`GOOGLE_AI_API_KEY` + Supabase), and **deducts 10 credits** via `adjust_credits` RPC.
3. It inserts a `tracks` row with `status: 'pending'`, returns accepted + track, and runs generation in a FastAPI `BackgroundTask`.
4. The background task calls **Google Lyria 3 Pro**, uploads audio to Storage `generated/{user_id}/{track_id}.{ext}`, sets `completed` (or `failed` + refund).
5. Create page polls track status until terminal; Library polls all pending/processing rows. `refreshUser()` updates credits.

The service talks to Supabase through `SimpleSupabaseClient` (raw `httpx` REST with the service-role key).

### Frontend

- `src/App.tsx` — `<BrowserRouter>` → `<AuthProvider>` → `Header` / routed `main` / `Footer`. Routes: `/`, `/create`, `/advanced`, `/library`, `/pricing`, `/payment`, `/hub`, `/profile`, `/login`, `/signup`.
- **Auth** — `src/contexts/AuthContext.tsx` exposes `useAuth()` with `{ user, loading, signIn, signUp, signOut, refreshUser }`. `user` includes `credits` and `plan`. Gate protected actions on `user`; call `refreshUser()` after anything that changes credits.
- **Supabase client** — singleton in `src/lib/supabase.ts`, initialized from `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (throws if missing). Import `{ supabase }`; never re-create the client.
- **Shared types** — `src/types/index.ts`: `User`, `Track` (`status: 'pending' | 'processing' | 'completed' | 'failed'`), `Subscription`, `PricingPlan`.
- **Structure** — `pages/` (route views), `components/{layout,audio,ui}/`, `hooks/`, `lib/`, `contexts/`, `types/`. Path alias `@` → `src/` (see `vite.config.ts` / `tsconfig`).

### Backend (Supabase)

- **Tables** (`supabase/tables/*.sql`): `profiles` (credits, plan, role), `tracks`, `credit_transactions`, `subscriptions` (provider-agnostic: `provider`, `currency`, `amount_minor`, `provider_*_id`), `plans` + `plan_prices` (single source of truth for plan credits and fixed per-currency prices in minor units), `merchants` + `merchant_documents` + `merchant_provider_accounts` (merchant onboarding), plus legacy `suno_plans`/`suno_subscriptions` (vestigial). RLS via `supabase/migrations/1765294229_enable_rls_policies.sql` and `1783468800_payments_multi_provider_and_merchants.sql`. Atomic credit moves go through the `adjust_credits(p_user_id, p_delta)` RPC (service-role only) — never read-modify-write `profiles.credits`.
- **Storage**: public `audio` bucket. Demo assets at `samples/demo-{1..5}.mp3`; generated audio at `generated/{userId}/{trackId}.{ext}` (extension from Lyria 3's returned `mime_type`, e.g. `.wav`).
- **Edge functions** (Deno, `supabase/functions/`): `create-payment` (provider-agnostic checkout), `payments-webhook` (signature-verified webhook for all providers), `create-admin-user`, `create-bucket-audio-temp`, plus legacy `create-subscription`/`stripe-webhook` (superseded) and `generate-music`.

### Payments (multi-provider, multi-currency)

Provider abstraction lives in `supabase/functions/_shared/payments/`: `provider.ts` (the `PaymentProvider` interface + crypto helpers), `stripe.ts` (USD/EUR, real HMAC webhook verification), `liqpay.ts` (UAH/USD/EUR, `base64(sha1(priv+data+priv))` signatures), `index.ts` (registry — adding a gateway = one file + one registry entry).

Flow: `PricingPage.tsx` (currency selector UAH/USD/EUR + interval) → `/payment?plan=<id>&interval=<i>&currency=<c>` → `PaymentPage.tsx` (provider choice per currency: UAH → LiqPay; USD/EUR → Stripe or LiqPay) invokes `create-payment` with `{ provider, planKey, currency, interval, customerEmail, userId }` → server loads the fixed price from `plan_prices` (never trusts client amounts) → redirect to the gateway → `payments-webhook?provider=<key>` verifies the signature, sets `profiles.plan`/`credits` (credits read from `plans`), and inserts a generalized `subscriptions` row.

Frontend money helpers are in `suno-clone/src/lib/pricing.ts` (`formatMoney`, `PROVIDERS_FOR_CURRENCY`, fallback price table mirroring the SQL seed). Requires `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` and/or `LIQPAY_PUBLIC_KEY`/`LIQPAY_PRIVATE_KEY`, plus `SITE_URL` for redirects.

### Merchant onboarding (minimal KYC)

`/merchant` (`MerchantRegisterPage.tsx`): name + email + country + **one document** is enough to submit. Documents upload to the private `merchant-docs` bucket (`{userId}/{merchantId}/...`, owner-scoped RLS); the application lands in `merchants` with `status: 'pending'`; review is done by admins (`profiles.role = 'admin'`, `is_admin()` helper). Gateway credentials are referenced via `merchant_provider_accounts.credentials_ref` — never stored as plaintext.

## Development Workflows

### Frontend (`suno-clone/`) — uses pnpm

```bash
cd suno-clone
pnpm install
pnpm dev        # Vite dev server on http://localhost:5173
pnpm lint       # ESLint (flat config, eslint.config.js)
pnpm build      # tsc -b + vite build → dist/  (build:prod for prod mode)
pnpm preview    # serve the production build
```

Note: the npm scripts run `pnpm install --prefer-offline` before each command by design.

### Python service (`python-service/`)

```bash
cd python-service
pip install -r requirements.txt        # fastapi, uvicorn, google-genai, python-dotenv, httpx
python main.py                         # uvicorn on 0.0.0.0:8000  (GET / is a health check)
python refill_credits.py               # interactive helper to top up a user's credits by email
```

Reads env from the **repo-root `.env`** (`load_dotenv("../.env")`): needs `GOOGLE_AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### Supabase edge functions (optional)

```bash
supabase functions serve create-subscription --env-file ../.env
supabase functions deploy create-subscription
supabase db push        # apply tables/ + migrations/
```

### Fresh Supabase project (bootstrap)

If the Supabase project is gone or you're starting from scratch, **`supabase/bootstrap.sql`** recreates everything in one shot: paste it into Dashboard → SQL Editor and run. It is idempotent (safe to re-run) and creates all tables, `is_admin()`/`adjust_credits()` functions, RLS policies, the `audio` (public) and `merchant-docs` (private) storage buckets, and seeds `plans`/`plan_prices`. Afterwards: update both `.env` files with the new project's URL/keys and deploy the edge functions (`create-payment`, `payments-webhook`).

### Environment variables

Prefer a **single root `.env`** (see `.env.example`). Vite loads it via `envDir: '..'` in `suno-clone/vite.config.ts`.

- **Frontend** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GENERATE_API_URL`.
- **Python service** — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`, `CORS_ORIGINS`.
- **Edge functions / payments** — plus `SITE_URL`, `STRIPE_*`, `LIQPAY_*`.
- All `.env` files are git-ignored — **never commit secrets.** Copy from `.env.example`.

## Conventions

- **Styling** — Tailwind with a dark-first design system in `tailwind.config.js`. Background `#0A0A0A` (`neutral-900`), primary/accent orange `#FF5722` (`primary` / `ring` / `accent`). Fonts: `font-display` (Reckless Neue serif), `font-body` (Inter), `font-mono`. Custom tokens include `shadow-glow-orange`, `animate-pulse-glow`, `animate-shimmer`. `darkMode: 'class'`.
- **UI components** — prefer the already-installed Radix primitives (`@radix-ui/*`) and `class-variance-authority` + `clsx` + `tailwind-merge` (`cn()` in `src/lib/utils.ts`). `components.json` configures the shadcn-style setup.
- **Single-row queries** — use `.maybeSingle()`.
- **Loading states** — boolean state + spinning Lucide icon (`<Loader2 className="animate-spin" />`).
- **Credits** — 10 credits per generation; 50 on signup. Plans: `free` / `pro` / `premier`.
- **TypeScript** — keep shared shapes in `src/types/index.ts`; use the `@/` import alias.

## Known Gaps / Caveats

- **Generation URL** — set `VITE_GENERATE_API_URL` (default `http://localhost:8000`). Production must point at the deployed Python service, not localhost.
- **Python JWT auth** — `/generate-music` requires `Authorization: Bearer <supabase_access_token>`; user id always comes from the verified session (`SUPABASE_ANON_KEY` required for Auth `/user` check).
- **Lyria 3 access** — generation requires a `GOOGLE_AI_API_KEY` with access to `lyria-3-pro-preview`. There is no model-availability preflight: a key without access is charged 10 credits, generation fails, and the credits are refunded (best-effort).
- **Payments** — inactive until provider keys are set (`STRIPE_SECRET_KEY`+`STRIPE_WEBHOOK_SECRET` for Stripe, `LIQPAY_PUBLIC_KEY`+`LIQPAY_PRIVATE_KEY` for LiqPay) and `SITE_URL` is configured. The legacy `create-subscription`/`stripe-webhook` functions are superseded by `create-payment`/`payments-webhook` but still deployed-compatible.
- **Merchant review** — `/admin/merchants` for `profiles.role = 'admin'`; applications otherwise stay `pending`.
- **No automated tests** — no test runner is configured; verify changes manually via the dev server and the Python service.
- **RLS** — policies are enabled but not exhaustively tested for multi-tenant isolation.
- **Secrets** — `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_AI_API_KEY` must be filled in root `.env` (not shipped in git).

## Repository Map

```
.
├── CLAUDE.md                 # This file
├── README.md                 # Human-facing project overview
├── .github/copilot-instructions.md   # Older AI instructions (see note above)
├── changelogs/               # One markdown file per change (required — see rule 3)
├── memories/                 # Long-form progress log (Ukrainian)
├── docs/                     # Design system, tokens, Suno UX analysis
├── imgs/                     # Design & marketing assets
├── python-service/           # FastAPI Lyria 3 generation backend (current)
│   ├── main.py               # /generate-music endpoint + background task
│   └── refill_credits.py     # credit top-up helper
├── suno-clone/               # React + Vite frontend
│   └── src/{pages,components,contexts,hooks,lib,types}/
└── supabase/
    ├── tables/               # SQL table definitions
    ├── migrations/           # RLS policies
    └── functions/            # Deno edge functions (Stripe live; generate-music legacy)
```
