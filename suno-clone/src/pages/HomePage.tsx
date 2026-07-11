import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const sampleTracks = [
  { id: '1', title: 'Sunset Vibes', genre: 'Lo-Fi', cover: '/images/suno_music_2.jpg' },
  { id: '2', title: 'Electric Dreams', genre: 'Synthwave', cover: '/images/suno_music_7.jpg' },
  { id: '3', title: 'Ocean Waves', genre: 'Ambient', cover: '/images/suno_music_8.jpg' },
];

export function HomePage() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreate = () => {
    if (prompt.trim()) {
      navigate(`/create?prompt=${encodeURIComponent(prompt)}`);
    } else {
      navigate('/create');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-700 to-[#2D1B0E]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,38,53,0.3)_0%,transparent_70%)]" />
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-50 tracking-tight leading-tight">
            Перетвори будь-яку ідею
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-[#FF6B35] bg-clip-text text-transparent">
              на музику
            </span>
          </h1>
          
          <p className="mt-6 text-lg md:text-xl text-neutral-100 max-w-2xl mx-auto">
            Просто опиши, яку музику ти хочеш створити. AI згенерує унікальний трек за лічені секунди.
          </p>

          {/* Chat Input */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="relative flex items-center bg-neutral-700 rounded-full border border-white/10 shadow-card p-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опиши свою музику..."
                className="flex-1 bg-transparent px-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold shadow-glow-orange hover:brightness-110 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Створити
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-neutral-100">
              <button
                onClick={() => navigate('/advanced')}
                className="flex items-center gap-1 hover:text-neutral-50 transition-colors"
              >
                Розширений режим
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Tracks */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-50 text-center mb-12">
            Приклади створеної музики
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sampleTracks.map((track) => (
              <div
                key={track.id}
                className="group relative bg-card backdrop-blur-[20px] rounded-xl border border-white/5 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-base overflow-hidden"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={track.cover}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:brightness-75 transition-all duration-base"
                  />
                  <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-base">
                    <div className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-glow-orange hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 ml-1" />
                    </div>
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-neutral-50">{track.title}</h3>
                  <p className="text-sm text-neutral-100 mt-1">{track.genre}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-neutral-900 to-neutral-700">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-50 mb-6">
            Готовий створити свою музику?
          </h2>
          <p className="text-lg text-neutral-100 mb-8">
            Почни безкоштовно з 50 кредитами. Без кредитної картки.
          </p>
          <button
            onClick={() => navigate(user ? '/create' : '/signup')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold text-lg shadow-glow-orange hover:brightness-110 transition-all"
          >
            {user ? 'Почати створювати' : 'Зареєструватися безкоштовно'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
}
