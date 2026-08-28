# Deploying to a VPS with Coolify

This project deploys as **two Coolify applications** from the same GitHub
repo, on two subdomains:

| App | Directory | Port | Example domain |
|-----|-----------|------|----------------|
| Frontend (Vite SPA → nginx) | `suno-clone/` | 80 | `app.example.com` |
| Python service (FastAPI) | `python-service/` | 8000 | `api.example.com` |

Supabase stays where it is — it's an external managed service, not deployed here.

---

## 0. Prerequisites

- A working Coolify instance on your VPS.
- A domain with DNS you control.
- The Supabase project URL + keys and a `GOOGLE_AI_API_KEY` (same values as your local `.env`).

## 1. DNS

Point both subdomains at your VPS public IP:

```
A   app.example.com   ->  <VPS_IP>
A   api.example.com   ->  <VPS_IP>
```

Coolify issues Let's Encrypt certificates automatically once DNS resolves.

## 2. Backend — Python service (deploy this first)

The frontend needs the API's final URL at build time, so bring the API up first.

In Coolify: **New Resource → Application → Public Repository** (or your GitHub app) → pick this repo.

- **Build Pack:** `Dockerfile`
- **Base Directory:** `/python-service`
- **Dockerfile Location:** `/python-service/Dockerfile` (relative to repo root)
- **Port:** `8000`
- **Domain:** `https://api.example.com`

**Environment variables** (Coolify → the app → Environment Variables):

```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase service_role key>
GOOGLE_AI_API_KEY=<google ai key>
CORS_ORIGINS=https://app.example.com
```

> `CORS_ORIGINS` **must** be the frontend's exact origin (scheme + host, no trailing slash),
> otherwise the browser blocks the generate requests. Multiple origins are comma-separated.

Deploy. Then check `https://api.example.com/` — it should return
`{"status":"ok",...}` (or `"degraded"` with a `reason` naming the missing key).

## 3. Frontend — Vite SPA

**New Resource → Application →** same repo.

- **Build Pack:** `Dockerfile`
- **Base Directory:** `/suno-clone`
- **Dockerfile Location:** `/suno-clone/Dockerfile`
- **Port:** `80`
- **Domain:** `https://app.example.com`

**Build arguments** (Coolify → the app → Build → Build Variables / Args) — these are
inlined into the bundle at build time, so they are **build args, not runtime env**:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>
VITE_GENERATE_API_URL=https://api.example.com
```

> If these are missing the app builds but shows a blank screen (the Supabase client
> throws on startup) and generation points at localhost. Double-check all three.

Deploy, then open `https://app.example.com`.

## 4. Verify end to end

1. `https://api.example.com/` → `{"status":"ok"}`.
2. Open `https://app.example.com`, sign up / sign in.
3. Create a track → it should reach `completed` and play.
4. If generation fails, check the browser console (CORS?) and the Python app logs in Coolify.

## 5. Redeploys

- Push to the branch Coolify watches (or click **Redeploy**).
- **Changing `VITE_GENERATE_API_URL` or any `VITE_*` needs a frontend rebuild** — they are
  baked into the bundle, not read at runtime. Backend env vars take effect on restart.

## Notes & limits

- **Payments** stay inactive until the Supabase edge functions (`create-payment`,
  `payments-webhook`) are deployed and provider keys are set — a separate task.
- **Lyria 3 access:** the `GOOGLE_AI_API_KEY` must have access to `lyria-3-pro-preview` /
  `lyria-3-clip-preview`, or generation fails and credits are refunded.
- The Python service keeps generation state in-process (FastAPI BackgroundTasks); run it as a
  single instance. The frontend can scale freely.
