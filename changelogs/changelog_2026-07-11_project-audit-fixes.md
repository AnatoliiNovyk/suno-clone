# Changelog 2026-07-11 — project audit fixes

## Було

- `create-payment` приймав `customerEmail` і `userId` з клієнтського body.
- Legacy `generate-music` edge function дублювала списання кредитів і створення треку замість поточного Python-сервісу.
- Production dependencies містили невикористані UI/form/chart пакети та `pnpm audit --prod` показував high/moderate findings.
- `AuthContext.tsx` експортував і provider, і hook, що давало React Fast Refresh warning.
- У профілі була кнопка видалення акаунта без реалізованої дії.
- `supabase/tables/*.sql`, README, Copilot/Claude інструкції містили застарілі Stripe-only/mock/hardcoded твердження.
- `python-service/__pycache__/main.cpython-314.pyc` був tracked у git попри `.gitignore`.

## Стало

- `create-payment` вимагає Bearer JWT, перевіряє Supabase session і визначає `userId/email` тільки на сервері.
- Legacy `create-subscription` більше не створює Stripe checkout без JWT і повертає `410 ENDPOINT_DEPRECATED`.
- Webhook використовує signed/server-generated `user_id` metadata першочергово, email лишився fallback для старих checkout-сесій.
- `generate-music` edge function стала thin proxy до Python service з forwarded Authorization header.
- Невикористані dependencies прибрано, runtime пакети оновлено, `tailwindcss-animate` перенесено в devDependencies, `pnpm audit --prod` чистий.
- `useAuth` винесено в `src/hooks/useAuth.ts`; dead delete-account CTA прибрано.
- SQL table definitions і документація синхронізовані з multi-provider payments та Python generation flow.
- Tracked Python bytecode видалено з індексу; `.gitignore` уже блокує нові `__pycache__/*.pyc`.
