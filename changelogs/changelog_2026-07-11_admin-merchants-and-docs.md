# changelog_2026-07-11_admin-merchants-and-docs

## Before

- Merchant applications stayed `pending` with no in-app review UI.
- README still described legacy `generate-music` / Stripe-only deploy steps as primary.
- Progress memory file mixed outdated deploy notes with live credentials.

## After / improvements

- `AdminMerchantsPage` at `/admin/merchants` (approve/reject + optional review note) gated by `user.role === 'admin'`.
- README Getting Started rewritten for root env, Python service, `create-payment` / `payments-webhook`.
- CLAUDE.md architecture section matches JWT + `generateApi` + polling.
- Progress memory scrubbed and aligned with current stack.
