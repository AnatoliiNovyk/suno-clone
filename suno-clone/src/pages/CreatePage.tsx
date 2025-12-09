import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Music, Wand2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Track } from '../types';

export function CreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<Track | null>(null);
  const [error, setError] = useState('');

  const suggestions = [
    'Веселий поп-трек про літо',
    'Розслаблюючий джаз для вечора',
    'Енергійний рок для тренування',
    'Романтична балада',
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Введіть опис музики');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (user.credits < 10) {
      setError('Недостатньо кредитів. Поповніть баланс.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-music', {
        body: { prompt, genre: 'pop' }
      });

      if (fnError) throw fnError;

      if (data?.data?.track) {
        setGeneratedTrack(data.data.track);
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'Помилка генерації');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-50 mb-4">
            Створи музику
          </h1>
          <p className="text-neutral-100">
            Опиши, яку музику ти хочеш почути
          </p>
        </div>

        {/* Credits indicator */}
        {user && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-700 border border-white/10">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-neutral-100">
                {user.credits} кредитів залишилось
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опиши музику, яку хочеш створити..."
              rows={4}
              className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-4 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 resize-none"
            />
            <div className="absolute bottom-3 right-3 text-xs text-neutral-300">
              {prompt.length}/500
            </div>
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setPrompt(suggestion)}
                className="px-3 py-1.5 rounded-full bg-neutral-700/50 border border-white/10 text-sm text-neutral-100 hover:bg-neutral-700 hover:border-white/20 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
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

        {/* Generated Track */}
        {generatedTrack && (
          <div className="mt-12 p-6 bg-neutral-700/50 rounded-xl border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg bg-neutral-500 overflow-hidden flex-shrink-0">
                {generatedTrack.cover_url && (
                  <img
                    src={generatedTrack.cover_url}
                    alt={generatedTrack.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-neutral-50 truncate">
                  {generatedTrack.title}
                </h3>
                <p className="text-sm text-neutral-100 mt-1">{generatedTrack.genre}</p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => navigate('/library')}
                    className="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    Відкрити в бібліотеці
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link to Advanced */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/advanced')}
            className="text-sm text-neutral-100 hover:text-neutral-50 underline underline-offset-4"
          >
            Потрібно більше контролю? Спробуй розширений режим
          </button>
        </div>
      </div>
    </div>
  );
}
