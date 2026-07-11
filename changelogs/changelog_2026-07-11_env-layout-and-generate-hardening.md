# changelog_2026-07-11_env-layout-and-generate-hardening

## Before

- Frontend expected `suno-clone/.env` but only root had `VITE_*`; Vite default `envDir` did not load parent `.env` → app threw "Missing Supabase environment variables" when frontend env was absent.
- Root `.env` lacked backend keys (`SUPABASE_URL`, service role, Google, CORS, payments placeholders).
- Create/Advanced called hardcoded `http://localhost:8000/generate-music` with **no Authorization** and client-supplied `user_id` (spoofable credit drain).
- Create page did not poll track status; Library only polled the currently selected track.
- Signup profile insert was best-effort only; no DB trigger; no admin UI for merchant review.
- `memories/suno_clone_progress.md` contained a plaintext test password; RLS migration had a double semicolon.

## After / improvements

- Root `.env` structured for frontend + Python; `.env.example` added (root + frontend); Vite `envDir` points at monorepo root; frontend `.env` mirrored for local tools.
- Shared `src/lib/generateApi.ts`: `VITE_GENERATE_API_URL`, Bearer JWT, clear offline errors, `pollTrackStatus`.
- Python service: JWT verification via Supabase Auth `/user`, user id from token only, CORS from `CORS_ORIGINS`, health reports `ready`/`degraded`.
- Create: generate + poll until completed/failed + inline player; Advanced uses shared API; Library polls all pending/processing tracks.
- AuthContext `ensureProfile` upsert + re-read; migration `1783468900_profile_on_signup_trigger.sql`; fixed `;;` in RLS migration.
- Admin page `/admin/merchants` for `profiles.role = admin`; Header link; docs/CLAUDE/README/memories updated (secrets scrubbed from memories).
