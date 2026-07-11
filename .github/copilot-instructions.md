# Suno Clone - AI Agent Instructions

## Project Overview
Full-stack music generation platform (Suno.com clone) with React/Vite frontend and Supabase backend. Users generate AI music using credits, with Stripe/LiqPay subscriptions for premium tiers.

**Stack**: React 18 + TypeScript + Vite | Tailwind CSS + lucide-react | Supabase (Auth, DB, Storage, Edge Functions) | Stripe/LiqPay | Python FastAPI + Google Lyria 3

## Architecture

### Frontend (`suno-clone/`)
- **Single-page app** with `react-router-dom` - all pages wrapped in `<BrowserRouter>` in [App.tsx](../suno-clone/src/App.tsx)
- **Global auth state** via React Context in [AuthContext.tsx](../suno-clone/src/contexts/AuthContext.tsx); import `useAuth()` from [useAuth.ts](../suno-clone/src/hooks/useAuth.ts)
- **Credit system**: Check `user.credits` before music generation; refresh after operations with `refreshUser()`
- **Pages structure**: `/create` (music generation), `/library` (user tracks), `/pricing` (subscription plans), `/profile` (user settings), `/hub` (public feed)

### Backend (`supabase/`)
- **Database tables** defined in `supabase/tables/*.sql`: `profiles` (user credits/plan/role), `tracks` (generated music), `plans`/`plan_prices`, `subscriptions` (Stripe/LiqPay sync)
- **Edge functions** (Deno runtime): 
  - `create-payment` - requires Bearer JWT, derives `userId/email` server-side, creates Stripe/LiqPay checkout
  - `payments-webhook` - verifies provider signatures and syncs profile/subscription state
  - `generate-music` - legacy compatibility proxy to `python-service/main.py`
- **Storage bucket**: `audio` (public, 50MB limit) stores demo tracks at `/samples/demo-{1-5}.mp3`

### Data Flow
1. User submits prompt on [CreatePage.tsx](../suno-clone/src/pages/CreatePage.tsx) or [AdvancedPage.tsx](../suno-clone/src/pages/AdvancedPage.tsx)
2. Frontend calls `{VITE_GENERATE_API_URL}/generate-music` with `Authorization: Bearer <supabase_jwt>`
3. Python service validates JWT, deducts credits through `adjust_credits`, inserts a pending track, runs Lyria 3, uploads audio, and updates status
4. Frontend refreshes user credits and polls the track row until `completed` or `failed`

## Key Conventions

### TypeScript Types
All shared types in [src/types/index.ts](../suno-clone/src/types/index.ts):
```typescript
interface User { credits: number; plan: 'free' | 'pro' | 'premier'; ... }
interface Track { status: 'pending' | 'processing' | 'completed' | 'failed'; ... }
```

### Supabase Client
Singleton instance in [src/lib/supabase.ts](../suno-clone/src/lib/supabase.ts). **Never re-initialize** - import and use:
```typescript
import { supabase } from '../lib/supabase';
```

### Styling Patterns
- **Dark theme**: Default background `bg-neutral-900`, text `text-neutral-50`
- **Primary color**: Orange gradient `from-[#FF6B35] via-primary-500 to-primary-700` for CTAs
- **Custom tokens**: [tailwind.config.js](../suno-clone/tailwind.config.js) defines `shadow-glow-orange`, font families `font-display` (Reckless Neue), `font-body` (Inter)
- **UI dependencies**: Keep dependencies minimal; add component libraries only when the current UI needs them.

### Error Handling
Edge functions return structured errors:
```typescript
{ error: { code: 'SUBSCRIPTION_FAILED', message: 'User-friendly message' } }
```
Frontend displays `error.message` to users - extract from caught exceptions.

## Development Workflows

### Running Locally
```bash
cd suno-clone
pnpm dev              # Vite dev server on http://localhost:5173
```

### Testing Edge Functions
```bash
supabase functions serve create-payment --env-file ../.env
supabase functions serve payments-webhook --env-file ../.env
# Test: curl -X POST ... with Authorization: Bearer <jwt>
```

### Environment Variables
- **Frontend**: root `.env` loaded by Vite `envDir`, with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GENERATE_API_URL`
- **Python service**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`, `CORS_ORIGINS`
- **Edge functions**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `STRIPE_*` and/or `LIQPAY_*`
- **Current state**: [lib/supabase.ts](../suno-clone/src/lib/supabase.ts) reads env vars only; never hardcode service-role or provider secrets in frontend code.

### Build & Deploy
```bash
pnpm build            # Outputs to suno-clone/dist/
```

## Integration Points

### Payment Flow
1. User clicks plan on [PricingPage.tsx](../suno-clone/src/pages/PricingPage.tsx)
2. Navigate to `/payment?plan=<plan>&interval=<month|year>&currency=<UAH|USD|EUR>`
3. [PaymentPage.tsx](../suno-clone/src/pages/PaymentPage.tsx) calls `create-payment` with `{ provider, planKey, currency, interval }`
4. `create-payment` validates JWT and derives `userId/email` server-side before creating Stripe/LiqPay checkout
5. `payments-webhook?provider=<stripe|liqpay>` verifies the provider signature and updates `profiles`/`subscriptions`

### Music Generation (Google Lyria Integration)
- Frontend calls the Python FastAPI service directly (`VITE_GENERATE_API_URL`, default `http://localhost:8000`)
- Legacy edge function `generate-music` is only a JWT-forwarding proxy to Python
- Process: validates JWT -> adjusts credits atomically -> creates pending track -> calls Lyria 3 -> uploads audio -> updates track status
- Generated audio stored at `/generated/{userId}/{trackId}.mp3` in Storage bucket

## Common Patterns

### Protected Routes
Check `user` in pages:
```typescript
const { user } = useAuth();
if (!user) { navigate('/login'); return; }
```

### Loading States
Use boolean state + Lucide icons:
```typescript
const [isGenerating, setIsGenerating] = useState(false);
// In button: {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />}
```

### Database Queries
Always use `maybeSingle()` for single-row queries:
```typescript
const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
```

## Known Gaps
- **Google Lyria API**: Requires a valid `GOOGLE_AI_API_KEY` with access to `lyria-3-pro-preview`; failed generation marks the track failed and attempts a credit refund
- **Payments**: Require provider sandbox/live keys plus `SITE_URL`
- **RLS policies**: Verify against a staging Supabase project after migrations
- **No automated tests**: Add targeted tests for payments, generation, and RLS-critical paths before production

## Quick Reference
- **Credit cost**: 10 credits per generation
- **Default credits**: 50 (on signup)
- **Plans**: Free (50 credits) | Pro (2500/month) | Premier (10000/month)

## Відповіді надавай виключно українською мовою.

## Після кожної зміни або правки створюй новий changelog, типу "changelog_"2026-01-01_example.md" в папці changelogs в корні проекту, де "2026-01-01" - це дата зміни у форматі рррр-мм-дд, а "example" - короткий опис зміни латиницею з дефісами замість пробілів. В описі вказати як було до зміни, яке покращення дасться після зміни. 

## Без погодження не виконуй жодних змін у файлах проекту, окрім файлів в папці changelogs.
