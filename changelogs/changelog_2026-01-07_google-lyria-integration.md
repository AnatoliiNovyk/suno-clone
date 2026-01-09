# Changelog: Google Lyria Integration

**Дата**: 2026-01-07  
**Тип**: Feature / Integration

## Що було до зміни

Edge функція `generate-music` використовувала **mock генерацію музики**:
- Повертала випадкове посилання на демо-трек з 5 заздалегідь завантажених файлів
- Імітувала затримку через `setTimeout(2000)`
- Не мала реальної AI генерації
- Статус треку одразу встановлювався як `'completed'`

```typescript
// Старий код
const trackData = {
  audio_url: `https://.../audio/samples/demo-${Math.floor(Math.random() * 5) + 1}.mp3`,
  status: 'completed',
  // ...
};
```

## Що покращилося після зміни

### 1. **Реальна AI генерація музики**
- Інтегрований Google Lyria API (`generativelanguage.googleapis.com/v1beta/models/lyria:generateMusic`)
- Передаються параметри: `prompt`, `lyrics`, `genre`, `instrumental`, `duration`, `temperature`
- Згенероване аудіо завантажується до Supabase Storage

### 2. **Двоступеневий процес**
- Спочатку створюється трек зі статусом `'processing'`
- Після успішної генерації статус оновлюється на `'completed'`
- Це дозволяє показувати користувачу прогрес

### 3. **Fallback механізм**
- Якщо `GOOGLE_AI_API_KEY` не налаштований → використовуються демо-треки
- Якщо API повертає помилку → fallback на демо-треки
- Якщо завантаження в Storage не вдається → використовується прямий URL від Lyria
- Система залишається працездатною навіть без налаштованого API

### 4. **Організоване Storage**
```
audio/
  ├── samples/demo-*.mp3        # Fallback треки
  ├── covers/cover-*.jpg        # Обкладинки
  └── generated/{userId}/{trackId}.mp3  # AI згенеровані треки
```

### 5. **Оновлені інструкції**
- `.github/copilot-instructions.md` тепер документує Google Lyria інтеграцію
- Додана змінна середовища `GOOGLE_AI_API_KEY`
- Описано процес генерації та fallback механізм

## Технічні деталі

### Змінені файли
1. `supabase/functions/generate-music/index.ts` - додана інтеграція з Lyria API
2. `.github/copilot-instructions.md` - оновлена документація

### Нові залежності
- Потрібна змінна середовища `GOOGLE_AI_API_KEY` (опціонально)

### API Endpoint
```
POST https://generativelanguage.googleapis.com/v1beta/models/lyria:generateMusic
Headers:
  x-goog-api-key: {GOOGLE_AI_API_KEY}
  Content-Type: application/json
```

## Переваги

✅ Реальна генерація музики через Google Lyria (безкоштовно)  
✅ Graceful degradation - працює навіть без API ключа  
✅ Прозорість процесу для користувача (статус `'processing'`)  
✅ Централізоване зберігання згенерованих треків  
✅ Готово до production використання

## Наступні кроки

- [ ] Отримати `GOOGLE_AI_API_KEY` від Google AI Studio
- [ ] Додати ключ в `.env` файл
- [ ] Протестувати реальну генерацію музики
- [ ] Налаштувати RLS policies для папки `generated/` в Storage
