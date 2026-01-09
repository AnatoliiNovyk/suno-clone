# Changelog: Log audio mime_type from GenAI

## Дата зміни / Date of Change
2026-01-08

## Короткий опис / Short Description
log-audio-mime-type

## Опис змін / Description of Changes

### До зміни / Before Change
- Python-сервіс логував лише розмір аудіо-чанків у байтах.
- Неможливо було підтвердити, який саме формат аудіо повертає модель (`audio/pcm`, `audio/wav`, `audio/mpeg` тощо), що ускладнювало діагностику проблеми відтворення (0:00).

### Після зміни / After Change
- Додано логування `part.inline_data.mime_type` для кожного отриманого аудіо-чанка в `python-service/main.py`.

### Переваги / Benefits
- Швидка валідація фактичного формату, який повертає модель.
- Дозволяє коректно обрати контейнеризацію (додавати WAV-заголовок лише для PCM, або не додавати для готових форматів).
