# changelog_2026-07-12_lyria3-drop-delivery-support-uri-audio

## Зміна
`python-service/main.py`: `response_format` для Lyria 3 скорочено до `{"type": "audio"}` (прибрано `"delivery": "inline"`), а обробку відповіді навчено приймати аудіо, доставлене як за `data` (base64 інлайн), так і за `uri` (посилання на файл): додано хелпери `_has_audio_payload()` і `_download_audio_uri()`, mime-type для uri-доставки додатково береться з заголовка `Content-Type`.

## Як було до зміни
Після виправлення `mime_type` (changelog_2026-07-12_lyria3-response-format-mime-type-fix) генерація падала з наступною помилкою контракту: `400 invalid_request: "Audio delivery mode is not supported"` — Google API для Lyria 3 Pro не приймає і поле `delivery` у `response_format`. Водночас код умів обробляти лише інлайнове аудіо (`audio.data`) і впав би з «No audio returned by Lyria 3», якби модель повернула аудіо посиланням.

## Що покращує зміна
Запит відповідає фактичному контракту API (лише обов'язковий `type: audio` — формат і спосіб доставки обирає модель), а сервіс коректно обробляє обидва можливі способи доставки результату: інлайновий base64 і завантаження за `uri` (з повтором із `x-goog-api-key` при 401/403). Генерація музики стає стійкою до подальших варіацій відповіді моделі.
