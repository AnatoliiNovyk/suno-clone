import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';

const articles = [
  {
    id: '1',
    title: 'Як AI змінює музичну індустрію',
    description: 'Дослідження впливу штучного інтелекту на створення та споживання музики.',
    category: 'Тренди',
    date: '2024-12-05',
    image: '/images/suno_music_7.jpg',
    featured: true
  },
  {
    id: '2',
    title: 'Поради для кращих промптів',
    description: 'Як писати ефективні описи для генерації унікальної музики.',
    category: 'Туторіали',
    date: '2024-12-03',
    image: '/images/suno_music_8.jpg'
  },
  {
    id: '3',
    title: 'Історії успіху наших користувачів',
    description: 'Як музиканти використовують AI для творчості.',
    category: 'Історії',
    date: '2024-12-01',
    image: '/images/suno_music_2.jpg'
  },
  {
    id: '4',
    title: 'Нові функції: Розширений режим',
    description: 'Огляд нових можливостей для професіоналів.',
    category: 'Оновлення',
    date: '2024-11-28',
    image: '/images/hero_music_7.jpg'
  },
  {
    id: '5',
    title: 'Жанри музики: Повний гайд',
    description: 'Все про музичні жанри та як їх використовувати в генерації.',
    category: 'Туторіали',
    date: '2024-11-25',
    image: '/images/hero_music_0.jpg'
  },
  {
    id: '6',
    title: 'Ліцензування AI музики',
    description: 'Правові аспекти використання згенерованої музики.',
    category: 'Правові питання',
    date: '2024-11-20',
    image: '/images/hero_music_9.jpg'
  }
];

export function HubPage() {
  const navigate = useNavigate();
  const featured = articles.find(a => a.featured);
  const regular = articles.filter(a => !a.featured);

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-50 mb-4">Hub</h1>
          <p className="text-lg text-neutral-100">
            Новини, туторіали та натхнення для творчості
          </p>
        </div>

        {/* Featured Article */}
        {featured && (
          <div className="mb-12">
            <div className="relative overflow-hidden rounded-2xl bg-neutral-700/50 border border-white/10 group cursor-pointer">
              <div className="grid md:grid-cols-2">
                <div className="aspect-video md:aspect-auto">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow"
                  />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <span className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-2">
                    {featured.category}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-neutral-50 mb-4">
                    {featured.title}
                  </h2>
                  <p className="text-neutral-100 mb-6">{featured.description}</p>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-primary-500 font-medium hover:gap-3 transition-all">
                      Читати далі
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <span className="flex items-center gap-1 text-sm text-neutral-300">
                      <Calendar className="w-4 h-4" />
                      {new Date(featured.date).toLocaleDateString('uk-UA')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regular.map((article) => (
            <article
              key={article.id}
              className="bg-neutral-700/50 rounded-xl border border-white/10 overflow-hidden group cursor-pointer hover:shadow-card-hover hover:-translate-y-1 transition-all duration-base"
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium text-primary-500">{article.category}</span>
                  <span className="text-xs text-neutral-300">
                    {new Date(article.date).toLocaleDateString('uk-UA')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-50 mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-sm text-neutral-100 line-clamp-2">{article.description}</p>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-neutral-50 mb-4">
            Готовий створити свою музику?
          </h2>
          <button
            onClick={() => navigate('/create')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold shadow-glow-orange hover:brightness-110 transition-all"
          >
            Почати створювати
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
