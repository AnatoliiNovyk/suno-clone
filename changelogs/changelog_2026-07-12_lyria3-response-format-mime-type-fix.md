# changelog_2026-07-12_lyria3-response-format-mime-type-fix

## Зміна
Прибрано поле `"mime_type": "audio/wav"` з `response_format` у виклику `client.aio.interactions.create(...)` (`python-service/main.py`).

## Як було до зміни
Кожна спроба генерації падала одразу після старту фонової задачі: Google Interactions API відповідав `400 invalid_request: "Audio mime_type is not supported in response_format"`. Трек отримував статус `failed`, а користувачу автоматично повертались 10 кредитів (механізм відшкодування спрацьовував коректно). Помилка виявлена під час першого живого прогону генерації на новому проєкті Supabase.

## Що покращує зміна
Запит до Lyria 3 Pro знову відповідає актуальному контракту API: формат аудіо обирає модель, а поле `mime_type` у `response_format` більше не передається. Решта коду вже була готова до цього — фактичний `mime_type` читається з відповіді (`audio.mime_type`), розширення файлу підбирається через `_AUDIO_EXT_BY_MIME`, тривалість рахується лише для WAV. Генерація музики працює end-to-end.
