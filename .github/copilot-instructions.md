# Suno Clone - AI Agent Instructions

## Project Overview
Full-stack music generation platform (Suno.com clone) with React/Vite frontend and Supabase backend. Users generate AI music using credits, with Stripe subscriptions for premium tiers.

**Stack**: React 18 + TypeScript + Vite | Tailwind CSS + Radix UI | Supabase (Auth, DB, Storage, Edge Functions) | Stripe

## Architecture

### Frontend (`suno-clone/`)
- **Single-page app** with `react-router-dom` - all pages wrapped in `<BrowserRouter>` in [App.tsx](../suno-clone/src/App.tsx)
- **Global auth state** via React Context in [AuthContext.tsx](../suno-clone/src/contexts/AuthContext.tsx) - `useAuth()` hook provides `user`, `signIn`, `signOut`, `refreshUser`
- **Credit system**: Check `user.credits` before music generation; refresh after operations with `refreshUser()`
- **Pages structure**: `/create` (music generation), `/library` (user tracks), `/pricing` (subscription plans), `/profile` (user settings), `/hub` (public feed)

### Backend (`supabase/`)
- **Database tables** defined in `supabase/tables/*.sql`: `profiles` (user credits/plan), `tracks` (generated music), `subscriptions` (Stripe sync)
- **Edge functions** (Deno runtime): 
  - `generate-music` - validates auth, deducts 10 credits, creates track record, returns mock audio URL
  - `create-subscription` - creates Stripe checkout session
  - `stripe-webhook` - syncs subscription status
- **Storage bucket**: `audio` (public, 50MB limit) stores demo tracks at `/samples/demo-{1-5}.mp3`

### Data Flow
1. User submits prompt on [CreatePage.tsx](../suno-clone/src/pages/CreatePage.tsx)
2. Calls `supabase.functions.invoke('generate-music', { body: { prompt, genre } })`
3. Edge function validates JWT, checks credits ≥ 10, deducts credits, inserts track row
4. Frontend calls `refreshUser()` to update displayed credits
5. Track appears in Library with `audio_url` pointing to Storage

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
- **Radix UI components**: Prefer Radix primitives (already installed) over custom implementations

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
supabase functions serve generate-music --env-file ../.env
# Test: curl -X POST ... with Authorization: Bearer <jwt>
```

### Environment Variables
- **Frontend**: `.env` in `suno-clone/` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Edge functions**: Root `.env` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `GOOGLE_AI_API_KEY`
- **⚠️ Current state**: Hardcoded credentials in [lib/supabase.ts](../suno-clone/src/lib/supabase.ts) - migrate to env vars before production

### Build & Deploy
```bash
pnpm build            # Outputs to suno-clone/dist/ (~618KB JS bundle)
```
Current deployment: https://oma3s6t4r5qr.space.minimax.io (Minimax hosting)

## Integration Points

### Stripe Subscription Flow
1. User clicks plan on [PricingPage.tsx](../suno-clone/src/pages/PricingPage.tsx)
2. Navigate to `/payment?plan=pro` 
3. [PaymentPage.tsx](../suno-clone/src/pages/PaymentPage.tsx) calls `create-subscription` edge function
4. Redirects to Stripe Checkout URL
5. Webhook (`stripe-webhook`) updates `subscriptions` table on success

### Music Generation (Google Lyria Integration)
- Edge function calls Google Lyria API (`generativelanguage.googleapis.com/v1beta/models/lyria:generateMusic`)
- Process: Creates pending track → Calls Lyria API → Downloads audio → Uploads to Supabase Storage → Updates track status
- **Fallback mechanism**: Returns demo track from Storage if API fails (`demo-1.mp3` to `demo-5.mp3`)
- **Cost**: Google Lyria is free (requires `GOOGLE_AI_API_KEY` in environment)
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
- **Google Lyria API**: Requires valid `GOOGLE_AI_API_KEY` - falls back to demo tracks if not configured
- **Stripe not configured**: Requires `STRIPE_SECRET_KEY` in environment
- **RLS policies**: Enabled but not fully tested for multi-tenant isolation
- **No tests**: Consider adding Vitest for critical paths
- **Hardcoded Supabase creds**: Move to environment variables

## Quick Reference
- **Test account**: uzhycqnx@minimax.com / av0SROaPNL
- **Credit cost**: 10 credits per generation
- **Default credits**: 50 (on signup)
- **Plans**: Free (50 credits) | Pro (500/month) | Premier (2500/month)

## Відповіді надавай виключно українською мовою.

## Після кожної зміни або правки створюй новий changelog, типу "changelog_"2026-01-01_example.md" в папці changelogs в корні проекту, де "2026-01-01" - це дата зміни у форматі рррр-мм-дд, а "example" - короткий опис зміни латиницею з дефісами замість пробілів. В описі вказати як було до зміни, яке покращення дасться після зміни. 

## Без погодження не виконуй жодних змін у файлах проекту, окрім файлів в папці changelogs.