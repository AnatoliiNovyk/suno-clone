import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Music, ChevronDown, ChevronUp, Mic, Upload, Wand2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { generateMusic } from '../lib/generateApi';

const genres = [
  'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'Country', 'R&B',
  'Reggae', 'Metal', 'Folk', 'Blues', 'Indie', 'Punk', 'Soul', 'Funk',
  'Disco', 'House', 'Techno', 'Ambient', 'Lo-Fi', 'Synthwave', 'Orchestral'
];

const moods = ['Happy', 'Sad', 'Energetic', 'Calm', 'Dark', 'Uplifting', 'Romantic', 'Mysterious'];

export function AdvancedPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [mode, setMode] = useState<'song' | 'sample'>('song');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [customGenre, setCustomGenre] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [autoLyrics, setAutoLyrics] = useState(true);

  // Lyria 3 style input
  const [negativePrompt, setNegativePrompt] = useState('');

  const [expandedSections, setExpandedSections] = useState({
    lyrics: true,
    style: false,
    audio: false
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Must mirror GENERATION_COST in python-service/main.py.
  const generationCost = mode === 'sample' ? 4 : 10;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    const trimmedLyrics = lyrics.trim();
    const trimmedNegative = negativePrompt.trim();
    const useCustomLyrics = !instrumental && !autoLyrics && !!trimmedLyrics;

    if (!user) {
      navigate('/login');
      return;
    }

    // Prompt is required, unless the user provided their own lyrics to sing.
    if (!trimmedPrompt && !useCustomLyrics) {
      setError('Введіть опис музики');
      return;
    }

    if (user.credits < generationCost) {
      setError('Недостатньо кредитів');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const promptParts: string[] = [];

      const effectivePrompt = trimmedPrompt || (useCustomLyrics ? `A song based on the provided lyrics` : '');
      if (effectivePrompt) promptParts.push(effectivePrompt);
      if (selectedMood) promptParts.push(`Mood: ${selectedMood}`);
      if (instrumental) promptParts.push('Instrumental, no vocals');

      const finalPrompt = promptParts.join('. ');
      const finalGenre = (customGenre.trim() || selectedGenre || 'pop').toLowerCase();

      const data = await generateMusic({
        prompt: finalPrompt,
        genre: finalGenre,
        mode,
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(useCustomLyrics ? { lyrics: trimmedLyrics } : {}),
        ...(trimmedNegative ? { negative_prompt: trimmedNegative } : {}),
      });

      if (data?.track) {
        await refreshUser();
        navigate('/library');
      } else {
        throw new Error('Сервіс не повернув дані треку');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Помилка генерації';
      setError(message);
      await refreshUser();
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
            Повний контроль над створенням музики (Lyria 3 Pro)
          </p>
        </div>

        {/* Generation mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-100 mb-2">
            Тип генерації
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('song')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === 'song'
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              Повна пісня (10 кредитів)
            </button>
            <button
              type="button"
              onClick={() => setMode('sample')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === 'sample'
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              Семпл (4 кредити)
            </button>
          </div>
          {mode === 'sample' && (
            <p className="mt-2 text-xs text-neutral-300">
              Семпл — короткий кліп із точним контролем ритму (Lyria 3 Clip). Швидше й дешевше,
              підходить для чернеток та експериментів зі звучанням.
            </p>
          )}
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-100 mb-2">
            Назва треку
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Необов'язково — інакше візьмемо з опису"
            maxLength={100}
            className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
          />
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
                      onClick={() => {
                        setSelectedGenre(genre === selectedGenre ? '' : genre);
                        setCustomGenre('');
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        selectedGenre === genre && !customGenre
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={customGenre}
                  onChange={(e) => {
                    setCustomGenre(e.target.value);
                    if (e.target.value.trim()) setSelectedGenre('');
                  }}
                  placeholder="Або введіть свій стиль: напр. dark synthwave, ukrainian folk rock…"
                  className="mt-3 w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                />
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
                <label className="block text-xs text-neutral-300 mb-1">
                  Чого уникати (negative prompt)
                </label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Напр. no distortion, no spoken word"
                  className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                />
                <p className="mt-2 text-xs text-neutral-300">
                  Lyria 3 Pro генерує повноцінні пісні (до ~3 хв) з вокалом і структурою. Опиши стиль,
                  інструменти та настрій у полі опису — модель керується природною мовою.
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
                  Створити ({generationCost} {generationCost === 4 ? 'кредити' : 'кредитів'})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
