# Suno Clone

A full-stack clone of the Suno music-generation experience. The project pairs a React + Vite front-end with Supabase Auth, Database, Storage, a Python generation service, and Stripe-powered subscription flows. It is designed as a reference implementation for experimenting with AI-assisted music tools and premium subscription tiers.

## Features

- 🎛️ **Multi-page React SPA** – Marketing, creation, library, and account views implemented with React Router and Tailwind CSS.
- 🔐 **Supabase Auth & Profiles** – Email-based auth flow, credit tracking, and profile management stored in Supabase Postgres tables.
- 🧠 **AI music generation workflow** – Python service (`python-service/main.py`) validates Supabase auth, deducts credits atomically, creates a track record, and runs Google Lyria 3 generation in the background.
- 💳 **Stripe subscription integration** – Supabase edge functions for creating checkout sessions and handling webhooks to keep subscriptions in sync.
- ☁️ **Supabase Storage access** – Demo audio/cover assets served through public Supabase storage buckets.

## Tech Stack

| Layer           | Tools |
|----------------|-------|
| Front-end       | React 18, TypeScript, Vite, React Router, Tailwind CSS, Radix UI, lucide-react |
| State & Forms   | React Context, React Hook Form, Zod |
| Backend & Infra | Supabase (Auth, Database, Storage, Edge Functions), Stripe |
| Tooling         | pnpm, ESLint, TypeScript, TailwindCSS Animate |

## Repository Layout

```
.
├── README.md                    # Root project overview (this file)
├── .gitignore
├── docs/                        # Research notes, UX plans, and design references
├── imgs/                        # Design inspiration & marketing assets
├── memories/                    # Project progress log
├── python-service/              # FastAPI generation service for Google Lyria music
├── suno-clone/                  # Front-end Vite project
│   ├── public/                  # Static assets served by Vite
│   ├── src/                     # React application source
│   ├── package.json             # Front-end dependencies and scripts
│   └── ...
└── supabase/                    # Supabase migrations, tables, and edge functions
    ├── tables/                  # SQL definitions for profiles, tracks, subscriptions...
    ├── migrations/              # Supabase migrations (enables RLS policies, etc.)
    └── functions/               # Deno edge functions (Stripe integration, music generation)
```

Refer to [`docs/`](docs) for deeper product and design context, including personas, component inventories, and system analyses.

## Prerequisites

1. **Node.js** ≥ 18 (matches Vite & Supabase CLI requirements)
2. **pnpm** ≥ 8 (`corepack enable` or `npm install -g pnpm`)
3. **Supabase CLI** (optional but recommended for running edge functions locally)<br>
   Install with `pnpm dlx supabase@latest init` or follow the [Supabase CLI docs](https://supabase.com/docs/guides/cli). 
4. **Stripe account** (or test mode) for subscription flows

## Environment Configuration

Copy `.env.example` → `.env` at the **repo root** and fill secrets. Vite loads this file via `envDir` in `suno-clone/vite.config.ts` (one env for frontend + Python).

Required for local music generation:

| Variable | Used by |
|----------|---------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Frontend |
| `VITE_GENERATE_API_URL` | Frontend → Python (default `http://localhost:8000`) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Python + edge |
| `GOOGLE_AI_API_KEY` | Python (Lyria 3) |
| `CORS_ORIGINS` | Python CORS allow-list |
| `SITE_URL` + Stripe/LiqPay keys | Payments edge functions |

Never commit `.env`. See `.env.example` for the full list.

## Getting Started

1. **Env**
   ```bash
   cp .env.example .env
   # fill VITE_*, SUPABASE_*, GOOGLE_AI_API_KEY
   ```

2. **Frontend**
   ```bash
   pnpm install --dir suno-clone
   pnpm --dir suno-clone dev
   ```
   Dev server: [http://localhost:5173](http://localhost:5173)

3. **Python generation service** (required for Create / Advanced)
   ```bash
   cd python-service
   pip install -r requirements.txt
   python main.py
   ```
   Health: [http://localhost:8000/](http://localhost:8000/) — requests need a Supabase user JWT.

4. **Build for production**
   ```bash
   pnpm --dir suno-clone build
   pnpm --dir suno-clone preview
   ```
   Set `VITE_GENERATE_API_URL` to your deployed Python URL.

5. **Supabase**
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   supabase functions deploy create-payment
   supabase functions deploy payments-webhook
   ```
   Optional admin: `UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';`  
   Then open `/admin/merchants`.

## Key Supabase Tables

- `profiles` – stores user metadata and credit balances
- `tracks` – generated track metadata, storage references, status
- `credit_transactions` – audit log of credit debits/credits
- `suno_plans`, `suno_subscriptions`, `subscriptions` – subscription metadata synced with Stripe

## Edge Functions Overview

| Function                 | Purpose |
|--------------------------|---------|
| `generate-music`         | Legacy compatibility path; current frontend uses `python-service/main.py` for generation and not this edge function |
| `create-subscription`    | Creates Stripe checkout sessions for available plans@supabase/functions/create-subscription/index.ts#12-88 |
| `stripe-webhook`         | (See `supabase/functions/stripe-webhook/index.ts`) Handles Stripe event callbacks to sync subscription state |
| `create-admin-user`      | Utility for seeding an admin account |
| `create-bucket-audio-temp` | Ensures audio storage bucket existence |

## Linting & Formatting

Run ESLint from the front-end project:

```bash
pnpm --dir suno-clone lint
```

Tailwind classes and design tokens are defined in [`suno-clone/tailwind.config.js`](suno-clone/tailwind.config.js#1-148). See the `docs/` folder for detailed design rationale.

## Contributing

1. Fork the repo and create a feature branch.
2. Keep commits scoped—frontend changes live under `suno-clone/`, edge functions under `supabase/functions/`, and database migrations under `supabase/tables/`.
3. Run linting and build checks before opening a PR.

## Security Notes

- **Never commit real Supabase or Stripe secrets.** Use environment variables locally and in CI/CD.
- The current `supabase.ts` file contains placeholder keys for demo purposes. Replace them with environment-driven values for production or public repositories.

## License

Specify a license (e.g., MIT) before publishing. Add the corresponding `LICENSE` file at the repository root.
