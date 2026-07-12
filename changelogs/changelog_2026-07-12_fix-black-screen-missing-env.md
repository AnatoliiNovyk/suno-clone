# Changelog: Fix Black Screen — Missing Root .env

**Дата**: 2026-07-12
**Тип**: Configuration / Bugfix

## Що було до зміни

Фронтенд на `http://localhost:5173` показував суцільний чорний екран.

**Причина**: у корені репозиторію був відсутній файл `.env` (він у `.gitignore`,
тому не потрапив у клон репозиторію). Через це:

1. `import.meta.env.VITE_SUPABASE_URL` та `VITE_SUPABASE_ANON_KEY` були `undefined`.
2. `suno-clone/src/lib/supabase.ts:7` кидав `throw new Error('Missing Supabase
   environment variables...')` **на етапі завантаження модуля** — до монтування
   React. Падав увесь граф модулів (`supabase.ts` → `AuthContext` → `App` →
   `main.tsx`), тому `ErrorBoundary` нічого не ловив, і сторінка лишалась
   порожньою (чорний фон з `index.html`).

Додатково: `.env.example`, на який посилається CLAUDE.md, теж відсутній у репо —
його «з'їдає» патерн `.env.*` / `*.env` у `.gitignore`.

## Що покращилося після зміни

Створено кореневий `.env` (git-ignored, у репозиторій не потрапляє):

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — відновлені з історії git
  (anon key був захардкоджений у `supabase.ts` до міграції 2026-01-07; це
  публічний ключ, безпечний для клієнта).
- `VITE_GENERATE_API_URL=http://localhost:8000`.
- Порожні плейсхолдери для `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`,
  Stripe/LiqPay — заповнити перед запуском python-service / платежів.

**Верифікація**: `pnpm dev` піднято, transformed-модуль `src/lib/supabase.ts`
отримує реальні значення env, застосунок рендериться.

## Важливі знахідки

1. **Supabase-проєкт `mwsigocoyiuywrrrgjcv` більше не існує** — DNS
   `mwsigocoyiuywrrrgjcv.supabase.co` не резолвиться (при цьому `supabase.com`
   доступний). UI тепер рендериться, але auth/БД працювати не будуть, доки не
   створено новий проєкт через `supabase/bootstrap.sql` і не оновлено ключі в
   `.env`.
2. **Потрібен перезапуск dev-сервера**: Vite читає `.env` лише на старті.
   Процес, запущений до створення `.env`, і далі показуватиме чорний екран.
