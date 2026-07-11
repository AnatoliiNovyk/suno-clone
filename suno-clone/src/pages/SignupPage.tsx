import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    if (password.length < 6) {
      setError('Пароль має бути не менше 6 символів');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 pb-12 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          <div className="bg-neutral-700/50 rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-50 mb-2">Перевірте пошту</h1>
            <p className="text-neutral-100 mb-6">
              Ми надіслали посилання для підтвердження на {email}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              Перейти до входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-12 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="bg-neutral-700/50 rounded-2xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-50 mb-2">Створіть акаунт</h1>
            <p className="text-neutral-100">Отримайте 50 безкоштовних кредитів</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-100 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="w-full bg-neutral-700 border border-neutral-500 rounded-xl pl-12 pr-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-100 mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Мінімум 6 символів"
                  className="w-full bg-neutral-700 border border-neutral-500 rounded-xl pl-12 pr-12 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-100"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-100 mb-2">Підтвердіть пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Повторіть пароль"
                  className="w-full bg-neutral-700 border border-neutral-500 rounded-xl pl-12 pr-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold shadow-glow-orange hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Реєстрація...
                </>
              ) : (
                'Зареєструватися'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-neutral-100">
              Вже маєте акаунт?{' '}
              <Link to="/login" className="text-primary-500 hover:underline">
                Увійти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
