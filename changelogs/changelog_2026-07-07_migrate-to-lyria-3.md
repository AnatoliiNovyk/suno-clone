# changelog_2026-07-07_migrate-to-lyria-3

## Зміна
Повний перехід бекенду генерації музики з **Google Lyria RealTime** (`models/lyria-realtime-exp`) на **Google Lyria 3 Pro** (`lyria-3-pro-preview`) через Gemini Interactions API.

## Як було до зміни
- `python-service/main.py` відкривав потокову **WebSocket**-сесію Lyria RealTime (`client.aio.live.music.connect`), надсилав `WeightedPrompt` та `LiveMusicGenerationConfig`, збирав ~30с сирого PCM (48кГц/стерео/16-біт) у циклі `receive`, вручну загортав його у WAV-заголовок (`create_wav_header`) і віддавав **лише інструментал**.
- Був прелфайт `is_lyria_available()`, що пагінував `v1alpha/models` у пошуках `models/lyria-realtime-exp` (кеш 10 хв) і повертав 503 до списання кредитів.
- `GenerateRequest` містив набір RealTime-контролів: `bpm, guidance, density, brightness, temperature, top_k, seed, scale, music_generation_mode, mute_bass, mute_drums, only_bass_and_drums`.
- `AdvancedPage.tsx` мала UI під усі ці контролі та хелпер `resolveLyriaScaleEnum()` для конвертації тональності у Lyria-enum; клієнт будував `http_options={"api_version":"v1alpha"}`.

## Що покращує зміна
- **Повноцінні пісні замість інструменталу.** Lyria 3 Pro генерує треки до ~3 хв із **вокалом, таймованою лірикою та музичною структурою** (куплет/приспів/брідж), 44.1кГц стерео, із SynthID-водяним знаком.
- **Спрощений request/response замість стрімінгу.** Один виклик `await client.aio.interactions.create(model="lyria-3-pro-preview", input=<промпт+жанр+лірика/negative>, response_format={"type":"audio","mime_type":"audio/wav","delivery":"inline"})` з опитуванням `interactions.get(id)` до статусу `completed`. Аудіо береться з `interaction.output_audio.data` (base64), лірика — з `interaction.output_text`.
- **Прибрано ручне складання WAV** та хардкод форматних припущень: розширення файлу й `content_type` визначаються з `mime_type` відповіді; тривалість парситься з WAV (`wav_duration_seconds`).
- **Нові, релевантні входи в UI:** прибрано непідтримувані RealTime-повзунки та `resolveLyriaScaleEnum`; додано поле лірики (вже було) та `negative_prompt`. Тіло запиту спрощено до `{ prompt, genre, user_id, lyrics?, negative_prompt? }`.
- **Прелфайт спрощено** до перевірки конфігурації (`is_service_ready`: наявність `GOOGLE_AI_API_KEY` + Supabase). Оскільки Interactions API — GA, а preview-моделі ненадійно перелічуються у списку моделей, перевірку доступності моделі прибрано; реальні проблеми доступу спливають під час генерації і призводять до best-effort повернення 10 кредитів.
- `requirements.txt`: закріплено `google-genai>=2.10.0` (версія з Interactions API).

## Перевірка
- `python-service/main.py` імпортується без помилок; kwargs виклику `interactions.create` провалідовано проти реального SDK (`google-genai==2.10.0`), `lyria-3-pro-preview` — валідний ідентифікатор моделі, `client.aio.interactions.create` — корутина.
- Фронтенд: `tsc -b` та ESLint по `AdvancedPage.tsx` — без помилок.
- Для реальної генерації потрібен `GOOGLE_AI_API_KEY` з доступом до `lyria-3-pro-preview`.
