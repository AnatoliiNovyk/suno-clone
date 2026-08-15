import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';

/** Catch-all for unmatched routes. Without it a typo in the URL rendered an
 *  empty page between the header and the footer, with no clue anything was
 *  wrong. */
export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-12 flex items-center justify-center">
      <div className="max-w-md px-4 text-center">
        <Compass className="w-16 h-16 text-neutral-500 mx-auto mb-6" />
        <p className="font-display text-5xl font-bold text-primary-500 mb-2">404</p>
        <h1 className="text-xl font-semibold text-neutral-50 mb-2">Сторінку не знайдено</h1>
        <p className="text-neutral-100 mb-8">
          Адреси <span className="font-mono text-neutral-50 break-all">{location.pathname}</span> не
          існує. Можливо, посилання застаріло.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold shadow-glow-orange hover:brightness-110 transition-all"
          >
            На головну
          </Link>
          <Link
            to="/create"
            className="px-6 py-3 rounded-full border border-white/15 text-neutral-50 font-medium hover:bg-neutral-700/80 transition-colors"
          >
            Створити музику
          </Link>
        </div>
      </div>
    </div>
  );
}
