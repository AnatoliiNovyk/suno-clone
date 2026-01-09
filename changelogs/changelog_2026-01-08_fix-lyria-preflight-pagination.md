# Changelog (2026-01-08) — fix-lyria-preflight-pagination

## Було
- Перевірка доступності Lyria RealTime читала лише першу сторінку `v1alpha/models` і могла хибно вирішувати, що Lyria недоступна.
- Через це `/generate-music` повертав `503`, навіть коли `models/lyria-realtime-exp` фактично був доступний.

## Стало
- Preflight тепер проходить всі сторінки `v1alpha/models`, використовуючи `nextPageToken`, і шукає конкретну модель `models/lyria-realtime-exp`.
- Перевірка кредитів більше не маскує `HTTPException` (наприклад, `402 Insufficient credits`) як `500`.

## Покращення
- Реальна генерація через Lyria RealTime більше не блокується помилковим `503`.
- Коректні статус-коди для помилок кредитів.
