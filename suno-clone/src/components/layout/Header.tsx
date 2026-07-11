import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: '/create', label: 'Створити' },
    { path: '/advanced', label: 'Розширений' },
    { path: '/library', label: 'Бібліотека' },
    { path: '/hub', label: 'Hub' },
    { path: '/merchant', label: 'Мерчантам' },
    ...(user?.role === 'admin'
      ? [{ path: '/admin/merchants', label: 'Admin' }]
      : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-neutral-700/60 backdrop-blur-[20px] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold tracking-wider text-neutral-50">
            SUNO
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-neutral-50 underline decoration-2 decoration-primary-500 underline-offset-4'
                    : 'text-neutral-100 hover:text-neutral-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-700/80">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-neutral-100">{user.credits}</span>
            </div>
          )}

          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-neutral-50 text-sm font-medium hover:bg-neutral-700/80 transition-colors"
              >
                <User className="w-4 h-4" />
                Профіль
              </Link>
              <button
                onClick={signOut}
                className="p-2 rounded-full hover:bg-neutral-700/80 transition-colors"
              >
                <LogOut className="w-4 h-4 text-neutral-100" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/pricing"
                className="text-sm text-neutral-100 hover:text-neutral-50 transition-colors"
              >
                Тарифи
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 rounded-full border border-white/15 text-neutral-50 text-sm font-medium hover:bg-neutral-700/80 transition-colors"
              >
                Увійти
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white text-sm font-semibold shadow-glow-orange hover:brightness-110 transition-all"
              >
                Зареєструватися
              </Link>
            </div>
          )}

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-neutral-50" />
            ) : (
              <Menu className="w-6 h-6 text-neutral-50" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-neutral-700/95 backdrop-blur-[20px] border-t border-white/5">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-md text-sm font-medium ${
                  isActive(link.path)
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-neutral-100 hover:bg-neutral-700/80'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-md text-sm font-medium text-neutral-100 hover:bg-neutral-700/80"
                >
                  Увійти
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white text-sm font-semibold text-center"
                >
                  Зареєструватися
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
