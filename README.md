# Suno Clone

A full-stack clone of the Suno music-generation experience. The project pairs a React + Vite front-end with Supabase Auth, Database, Storage, Edge Functions, and Stripe-powered subscription flows. It is designed as a reference implementation for experimenting with AI-assisted music tools and premium subscription tiers.

## Features

- 🎛️ **Multi-page React SPA** – Marketing, creation, library, and account views implemented with React Router and Tailwind CSS.
- 🔐 **Supabase Auth & Profiles** – Email-based auth flow, credit tracking, and profile management stored in Supabase Postgres tables.
- 🧠 **AI music generation workflow** – Edge function stub (`generate-music`) that validates auth, enforces credit usage, and simulates music generation responses.
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

Create a `.env` file at the project root for shared environment variables. The `.gitignore` already excludes it.

```
# Root .env (not committed)
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_ANON_KEY="<public-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
STRIPE_SECRET_KEY="<stripe-test-or-live-key>"
```

### Front-end (`suno-clone/`)

Vite exposes env vars prefixed with `VITE_`. Update `suno-clone/src/lib/supabase.ts` to read from env before shipping or sharing the repo:

```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

Create `suno-clone/.env` (ignored by Git):

```
VITE_SUPABASE_URL="https://<your-project>.supabase.co"
VITE_SUPABASE_ANON_KEY="<public-anon-key>"
```

### Supabase Edge Functions

Edge functions expect secrets via environment variables. When deploying/serving locally, provide:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`

Example when running locally:

```bash
supabase functions serve generate-music --env-file ../.env
```

## Getting Started

1. **Install dependencies**
   ```bash
   pnpm install --dir suno-clone
   ```

2. **Run the front-end**
   ```bash
   pnpm --dir suno-clone dev
   ```
   The dev server runs on [http://localhost:5173](http://localhost:5173) by default with hot module reloading.

3. **Build for production**
   ```bash
   pnpm --dir suno-clone build
   pnpm --dir suno-clone preview
   ```

4. **Supabase setup (optional)**
   ```bash
   supabase login
   supabase projects list
   supabase link --project-ref <your-project-ref>
   supabase db push        # Applies SQL schemas in supabase/tables and migrations
   supabase functions deploy generate-music
   supabase functions deploy create-subscription
   supabase functions deploy stripe-webhook
   ```

5. **Stripe webhook (optional)**
   Configure Stripe to call your deployed `stripe-webhook` (e.g., via Supabase Edge Function URL) or use the Stripe CLI while running `supabase functions serve stripe-webhook` locally.

## Key Supabase Tables

- `profiles` – stores user metadata and credit balances
- `tracks` – generated track metadata, storage references, status
- `credit_transactions` – audit log of credit debits/credits
- `suno_plans`, `suno_subscriptions`, `subscriptions` – subscription metadata synced with Stripe

## Edge Functions Overview

| Function                 | Purpose |
|--------------------------|---------|
| `generate-music`         | Validates auth, checks credits, and simulates music generation responses, deducting credits@supabase/functions/generate-music/index.ts#20-140 |
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
