# Changelog — 2026-01-08 — advanced-lyria-controls

## Було
- Розширений режим передавав у бекенд лише текстовий промпт (плюс жанр/настрій як частину рядка), без реальних параметрів Lyria RealTime.
- Встановлення темпу/тональності/«наскільки строго слідувати промпту» через текст працювало нестабільно, що могло давати «однорідні» результати.

## Стало
- Додано керовані параметри Lyria RealTime у розширеному інтерфейсі та прокидання їх у `python-service`:
  - `bpm`, `scale`, `guidance`, `density`, `brightness`, `temperature`, `top_k`, `seed`
  - `music_generation_mode` (QUALITY/DIVERSITY/VOCALIZATION)
  - `mute_bass`, `mute_drums`, `only_bass_and_drums`
- `python-service` приймає ці поля та формує `LiveMusicGenerationConfig` для Lyria RealTime.

## Ефект
- Користувач може стабільно задавати BPM/scale та інші параметри генерації без покладання на «магію» текстового промпта.
- Очікувано зменшується «однорідність» і зростає контроль над стилем/динамікою результату.
