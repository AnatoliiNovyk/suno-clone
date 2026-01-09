# Changelog: Lyria RealTime API Research & Fallback Implementation

**Дата**: 2026-01-07  
**Тип зміни**: Research + Fallback Implementation

## Що було зроблено

### 1. Детальне дослідження Google Lyria RealTime API
- Вивчено офіційну документацію: https://ai.google.dev/gemini-api/docs/music-generation
- Перевірено Google Gen AI SDK: https://github.com/googleapis/js-genai
- Проаналізовано cookbook приклади: https://github.com/google-gemini/cookbook

### 2. Ключові висновки

**✅ Lyria RealTime API - ПУБЛІЧНО ДОСТУПНА**
- Модель: `models/lyria-realtime-exp` (експериментальна)
- Безкоштовна для використання з API key
- Real-time streaming генерація музики через WebSocket
- Формат виводу: Raw 16-bit PCM Audio, 48kHz, Stereo

**❌ Проблема: Підтримка тільки через Python SDK**
- Офіційний Python SDK: ✅ Підтримує (`client.aio.live.music.connect()`)
- JavaScript/TypeScript SDK: ❌ НЕ підтримує Lyria RealTime
- Напряму через WebSocket: ❌ НЕ працює (потрібен SDK для правильної аутентифікації)

### 3. Технічні деталі Lyria API

**WebSocket Endpoint:**
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key={API_KEY}
```

**Формат повідомлень:**
- Setup: `{setup: {model: 'models/lyria-realtime-exp'}}`
- Prompts: `{client_content: {weighted_prompts: [{text: '...', weight: 1.0}]}}`
- Config: `{client_content: {music_generation_config: {bpm, temperature, guidance, density, brightness}}}`
- Control: `{client_content: {playback_control: {play: {}}}}`

**Параметри генерації:**
- BPM: 60-200
- Temperature: 0.0-3.0
- Guidance: 0.0-6.0
- Density: 0.0-1.0 (щільність нот)
- Brightness: 0.0-1.0 (тональність)
- Scale: Музичний лад (C_MAJOR_A_MINOR, D_MAJOR_B_MINOR, etc.)

### 4. Реалізоване рішення

Оскільки JavaScript SDK не підтримує Lyria, реалізовано fallback на демо-треки:

**Файл**: `supabase/functions/generate-music/index.ts`

```typescript
// Note: Google Lyria RealTime API is currently only available through Python SDK
// JavaScript/TypeScript SDK does not support Lyria music generation yet
// Using demo tracks as fallback until JS SDK support is added
console.log('Using demo tracks (Lyria RealTime not available in JS SDK)');

const demoTracks = [
  { url: `${supabaseUrl}/storage/v1/object/public/audio/samples/demo-1.mp3`, duration: 120 },
  { url: `${supabaseUrl}/storage/v1/object/public/audio/samples/demo-2.mp3`, duration: 120 },
  { url: `${supabaseUrl}/storage/v1/object/public/audio/samples/demo-3.mp3`, duration: 120 },
  { url: `${supabaseUrl}/storage/v1/object/public/audio/samples/demo-4.mp3`, duration: 120 },
  { url: `${supabaseUrl}/storage/v1/object/public/audio/samples/demo-5.mp3`, duration: 120 }
];

const randomTrack = demoTracks[Math.floor(Math.random() * demoTracks.length)];
```

## Альтернативні рішення для майбутнього

### Варіант 1: Python Proxy Service
Створити окремий Python сервіс, який:
- Використовує офіційний Python SDK для Lyria
- Отримує запити від edge function
- Генерує музику через Lyria RealTime
- Повертає аудіо-файл

**Складність**: Висока (потрібна додаткова інфраструктура)

### Варіант 2: Очікування JS SDK
Зачекати, поки Google додасть підтримку Lyria в JavaScript SDK

**Часові рамки**: Невідомо

### Варіант 3: Інші Music Generation API
Розглянути альтернативні API:
- Suno AI API (платний, не офіційний)
- Stable Audio (Stability AI)
- MusicGen (Meta)

## Результат роботи

✅ Функція працює з демо-треками  
✅ Деплой успішний  
✅ Кредити списуються коректно  
✅ Треки створюються в базі даних  
✅ Аудіо програється в браузері  

❌ Реальна генерація музики через Lyria недоступна через обмеження SDK

## Наступні кроки

1. **Короткостроково**: Використовувати демо-треки (поточна реалізація)
2. **Середньостроково**: Слідкувати за оновленнями JavaScript SDK
3. **Довгостроково**: Якщо JS SDK не отримає підтримку, розглянути Python proxy service

## Посилання

- [Lyria RealTime Documentation](https://ai.google.dev/gemini-api/docs/music-generation)
- [Google Gen AI JavaScript SDK](https://github.com/googleapis/js-genai)
- [Cookbook Lyria Example (Python)](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started_LyriaRealTime.ipynb)
- [Prompt DJ Demo](https://aistudio.google.com/apps/bundled/promptdj)
