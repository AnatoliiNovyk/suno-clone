import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Music, ChevronDown, ChevronUp, Mic, Upload, Wand2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const genres = [
  'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'Country', 'R&B',
  'Reggae', 'Metal', 'Folk', 'Blues', 'Indie', 'Punk', 'Soul', 'Funk',
  'Disco', 'House', 'Techno', 'Ambient', 'Lo-Fi', 'Synthwave', 'Orchestral'
];

const moods = ['Happy', 'Sad', 'Energetic', 'Calm', 'Dark', 'Uplifting', 'Romantic', 'Mysterious'];

function resolveLyriaScaleEnum(input: string): string {
  const raw = input.trim();
  if (!raw) return '';

  // Якщо користувач вже ввів enum (наприклад G_MAJOR_E_MINOR) — пропускаємо як є.
  if (/^[A-Z_]+$/.test(raw)) return raw;

  const normalized = raw
    .toLowerCase()
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/key\s*:\s*/g, '')
    .replace(/тональність\s*:\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Підтримка форм: "E minor", "G major", "E мінор", "G мажор"
  const match = normalized.match(/^([a-g])\s*([#b])?\s*(major|minor|maj|min|мажор|мінор)$/i);
  if (!match) return raw;

  const note = (match[1] + (match[2] || '')).toUpperCase();
  const mode = match[3].toLowerCase();

  // Мапа у формат Lyria: RELATIVE_MAJOR_RELATIVE_MINOR
  const majorToEnum: Record<string, string> = {
    'C': 'C_MAJOR_A_MINOR',
    'DB': 'D_FLAT_MAJOR_B_FLAT_MINOR',
    'D': 'D_MAJOR_B_MINOR',
    'EB': 'E_FLAT_MAJOR_C_MINOR',
    'E': 'E_MAJOR_D_FLAT_MINOR',
    'F': 'F_MAJOR_D_MINOR',
    'GB': 'G_FLAT_MAJOR_E_FLAT_MINOR',
    'G': 'G_MAJOR_E_MINOR',
    'AB': 'A_FLAT_MAJOR_F_MINOR',
    'A': 'A_MAJOR_G_FLAT_MINOR',
    'BB': 'B_FLAT_MAJOR_G_MINOR',
    'B': 'B_MAJOR_A_FLAT_MINOR',
  };

  const minorToEnum: Record<string, string> = {
    'A': 'C_MAJOR_A_MINOR',
    'BB': 'D_FLAT_MAJOR_B_FLAT_MINOR',
    'B': 'D_MAJOR_B_MINOR',
    'C': 'E_FLAT_MAJOR_C_MINOR',
    'C#': 'E_MAJOR_D_FLAT_MINOR',
    'DB': 'E_MAJOR_D_FLAT_MINOR',
    'D': 'F_MAJOR_D_MINOR',
    'EB': 'G_FLAT_MAJOR_E_FLAT_MINOR',
    'E': 'G_MAJOR_E_MINOR',
    'F': 'A_FLAT_MAJOR_F_MINOR',
    'F#': 'A_MAJOR_G_FLAT_MINOR',
    'GB': 'A_MAJOR_G_FLAT_MINOR',
    'G': 'B_FLAT_MAJOR_G_MINOR',
    'G#': 'B_MAJOR_A_FLAT_MINOR',
    'AB': 'B_MAJOR_A_FLAT_MINOR',
  };

  const isMajor = mode === 'major' || mode === 'maj' || mode === 'мажор';
  const isMinor = mode === 'minor' || mode === 'min' || mode === 'мінор';

  if (isMajor) return majorToEnum[note] || raw;
  if (isMinor) return minorToEnum[note] || raw;
  return raw;
}

export function AdvancedPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [autoLyrics, setAutoLyrics] = useState(true);

  // Lyria RealTime controls (optional)
  const [bpm, setBpm] = useState('');
  const [scale, setScale] = useState('');
  const [guidance, setGuidance] = useState('');
  const [density, setDensity] = useState('');
  const [brightness, setBrightness] = useState('');
  const [temperature, setTemperature] = useState('');
  const [topK, setTopK] = useState('');
  const [seed, setSeed] = useState('');
  const [musicGenerationMode, setMusicGenerationMode] = useState<'QUALITY' | 'DIVERSITY' | 'VOCALIZATION'>('QUALITY');
  const [muteBass, setMuteBass] = useState(false);
  const [muteDrums, setMuteDrums] = useState(false);
  const [onlyBassAndDrums, setOnlyBassAndDrums] = useState(false);
  
  const [expandedSections, setExpandedSections] = useState({
    lyrics: true,
    style: false,
    audio: false
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    const trimmedLyrics = lyrics.trim();

    if (!user) {
      navigate('/login');
      return;
    }

    if (!trimmedPrompt && !instrumental && !autoLyrics && trimmedLyrics) {
      // Дозволяємо генерацію “від тексту”, але бекенд очікує prompt, тож підставляємо його з лірики.
      // (Локальний python-service дедалі розширимо, якщо буде потрібно.)
    } else if (!trimmedPrompt) {
      setError('Введіть опис музики');
      return;
    }

    if (user.credits < 10) {
      setError('Недостатньо кредитів');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const promptParts: string[] = [];

      const effectivePrompt = trimmedPrompt || (!instrumental && !autoLyrics ? trimmedLyrics : '');
      if (effectivePrompt) promptParts.push(effectivePrompt);

      if (selectedMood) promptParts.push(`Mood: ${selectedMood}`);
      if (instrumental) promptParts.push('Instrumental');
      if (!instrumental && !autoLyrics && trimmedLyrics) promptParts.push(`Lyrics: ${trimmedLyrics}`);

      const finalPrompt = promptParts.join(' | ');
      const finalGenre = (selectedGenre || 'pop').toLowerCase();

      const parsedBpm = bpm.trim() ? Number(bpm) : undefined;
      const parsedGuidance = guidance.trim() ? Number(guidance) : undefined;
      const parsedDensity = density.trim() ? Number(density) : undefined;
      const parsedBrightness = brightness.trim() ? Number(brightness) : undefined;
      const parsedTemperature = temperature.trim() ? Number(temperature) : undefined;
      const parsedTopK = topK.trim() ? Number(topK) : undefined;
      const parsedSeed = seed.trim() ? Number(seed) : undefined;

      const body: Record<string, unknown> = {
        prompt: finalPrompt,
        genre: finalGenre,
        user_id: user.id,
        music_generation_mode: musicGenerationMode,
        mute_bass: muteBass,
        mute_drums: muteDrums,
        only_bass_and_drums: onlyBassAndDrums,
      };

      if (Number.isFinite(parsedBpm)) body.bpm = parsedBpm;
      if (Number.isFinite(parsedGuidance)) body.guidance = parsedGuidance;
      if (Number.isFinite(parsedDensity)) body.density = parsedDensity;
      if (Number.isFinite(parsedBrightness)) body.brightness = parsedBrightness;
      if (Number.isFinite(parsedTemperature)) body.temperature = parsedTemperature;
      if (Number.isFinite(parsedTopK)) body.top_k = parsedTopK;
      if (Number.isFinite(parsedSeed)) body.seed = parsedSeed;

      const trimmedScale = scale.trim();
      if (trimmedScale) {
        const resolvedScale = resolveLyriaScaleEnum(trimmedScale);
        body.scale = resolvedScale;
      }

      const response = await fetch('http://localhost:8000/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let message = 'Помилка генерації';
        try {
          const errJson = await response.json();
          message = errJson?.detail || errJson?.error?.message || message;
        } catch {
          // ignore json parse
        }
        throw new Error(message);
      }

      const data = await response.json();

      if (data?.track) {
        await refreshUser();
        navigate('/library');
      } else {
        throw new Error('Сервіс не повернув дані треку');
      }
    } catch (err: any) {
      setError(err.message || 'Помилка генерації');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-32">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-neutral-100 hover:text-neutral-50 mb-4"
          >
            Назад
          </button>
          <h1 className="text-3xl font-bold text-neutral-50">
            Розширений режим
          </h1>
          <p className="text-neutral-100 mt-2">
            Повний контроль над створенням музики
          </p>
        </div>

        {/* Prompt */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-100 mb-2">
            Опис музики
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опиши музику, яку хочеш створити..."
            rows={3}
            className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500 resize-none"
          />
        </div>

        {/* Lyrics Section */}
        <div className="mb-4 bg-neutral-700/50 rounded-xl border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection('lyrics')}
            className="w-full flex items-center justify-between px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-primary-500" />
              <span className="font-medium text-neutral-50">Текст пісні</span>
            </div>
            {expandedSections.lyrics ? (
              <ChevronUp className="w-5 h-5 text-neutral-100" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-100" />
            )}
          </button>
          
          {expandedSections.lyrics && (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instrumental}
                    onChange={(e) => setInstrumental(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-500 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-100">Інструментальна</span>
                </label>
              </div>

              {!instrumental && (
                <>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setAutoLyrics(true)}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        autoLyrics
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-700 text-neutral-100 border border-white/10'
                      }`}
                    >
                      Авто-текст
                    </button>
                    <button
                      onClick={() => setAutoLyrics(false)}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        !autoLyrics
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-700 text-neutral-100 border border-white/10'
                      }`}
                    >
                      Свій текст
                    </button>
                  </div>

                  {!autoLyrics && (
                    <textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Введіть текст пісні..."
                      rows={6}
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500 resize-none"
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Style Section */}
        <div className="mb-4 bg-neutral-700/50 rounded-xl border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection('style')}
            className="w-full flex items-center justify-between px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <span className="font-medium text-neutral-50">Стиль та жанр</span>
            </div>
            {expandedSections.style ? (
              <ChevronUp className="w-5 h-5 text-neutral-100" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-100" />
            )}
          </button>
          
          {expandedSections.style && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm text-neutral-100 mb-2">Жанр</label>
                <div className="flex flex-wrap gap-2">
                  {genres.slice(0, 12).map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre === selectedGenre ? '' : genre)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        selectedGenre === genre
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-neutral-100 mb-2">Настрій</label>
                <div className="flex flex-wrap gap-2">
                  {moods.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => setSelectedMood(mood === selectedMood ? '' : mood)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        selectedMood === mood
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="block text-sm font-medium text-neutral-100 mb-3">Параметри генерації (Lyria)</label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">BPM (60–200)</label>
                    <input
                      type="number"
                      min={60}
                      max={200}
                      value={bpm}
                      onChange={(e) => setBpm(e.target.value)}
                      placeholder="Напр. 174"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Scale (enum, напр. E_MAJOR_D_FLAT_MINOR)</label>
                    <input
                      type="text"
                      value={scale}
                      onChange={(e) => setScale(e.target.value)}
                      placeholder="Напр. E minor або G_MAJOR_E_MINOR"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                    {scale.trim() && resolveLyriaScaleEnum(scale.trim()) !== scale.trim() && (
                      <p className="mt-1 text-xs text-neutral-300">
                        Буде конвертовано в: <span className="text-neutral-100">{resolveLyriaScaleEnum(scale.trim())}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Guidance (0.0–6.0)</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      step={0.1}
                      value={guidance}
                      onChange={(e) => setGuidance(e.target.value)}
                      placeholder="4.0"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Temperature (0.0–3.0)</label>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="1.1"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Density (0.0–1.0)</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                      placeholder="(порожньо = auto)"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Brightness (0.0–1.0)</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={brightness}
                      onChange={(e) => setBrightness(e.target.value)}
                      placeholder="(порожньо = auto)"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Top K (1–1000)</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={topK}
                      onChange={(e) => setTopK(e.target.value)}
                      placeholder="40"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Seed (ціле число)</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="(порожньо = random)"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs text-neutral-300 mb-2">Mode</label>
                  <div className="flex flex-wrap gap-2">
                    {(['QUALITY', 'DIVERSITY', 'VOCALIZATION'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setMusicGenerationMode(mode)}
                        className={`px-3 py-1.5 rounded-full text-sm ${
                          musicGenerationMode === mode
                            ? 'bg-primary-500 text-white'
                            : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={muteBass}
                      onChange={(e) => setMuteBass(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-500 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-100">Mute bass</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={muteDrums}
                      onChange={(e) => setMuteDrums(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-500 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-100">Mute drums</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyBassAndDrums}
                      onChange={(e) => setOnlyBassAndDrums(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-500 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-100">Only bass & drums</span>
                  </label>
                </div>

                <p className="mt-3 text-xs text-neutral-300">
                  Підказка: для scale використовуй enum зі списку Lyria (напр. D_MAJOR_B_MINOR або SCALE_UNSPECIFIED).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Audio Reference Section */}
        <div className="mb-8 bg-neutral-700/50 rounded-xl border border-white/10 overflow-hidden">
          <button
            onClick={() => toggleSection('audio')}
            className="w-full flex items-center justify-between px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-primary-500" />
              <span className="font-medium text-neutral-50">Аудіо референс</span>
            </div>
            {expandedSections.audio ? (
              <ChevronUp className="w-5 h-5 text-neutral-100" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-100" />
            )}
          </button>
          
          {expandedSections.audio && (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex gap-4">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-neutral-500 text-neutral-100 hover:border-neutral-300 transition-colors">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Завантажити файл</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-neutral-500 text-neutral-100 hover:border-neutral-300 transition-colors">
                  <Mic className="w-5 h-5" />
                  <span className="text-sm">Записати</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-error mb-4">{error}</p>
        )}

        {/* Generate Button - Sticky */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-900/95 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold shadow-glow-orange hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Генерація...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Створити (10 кредитів)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
