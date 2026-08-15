import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, CreditCard, LogOut, Check, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, error: authError, signOut, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'account' | 'subscription'>('account');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState(searchParams.get('success') === 'true');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // The profile arrives after the first render, so seeding this from useState
  // left the field permanently empty for anyone who loaded the page directly.
  useEffect(() => {
    setDisplayName(user?.display_name ?? '');
  }, [user?.display_name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-100 mb-4">
            {authError ?? 'Увійдіть для доступу до профілю'}
          </p>
          <button
            onClick={() => (authError ? refreshUser() : navigate('/login'))}
            className="px-6 py-3 rounded-full bg-primary-500 text-white font-medium"
          >
            {authError ? 'Спробувати ще' : 'Увійти'}
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError('');
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);

    if (error) {
      // Silently swallowing this used to leave the page looking unchanged with
      // no hint that the write had been refused.
      console.error('Profile update failed:', error);
      setSaveError(error.message || 'Не вдалося зберегти зміни.');
    } else {
      await refreshUser();
      setSuccess(true);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const tabs = [
    { id: 'account', label: 'Акаунт', icon: User },
    { id: 'subscription', label: 'Підписка', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-success/20 border border-success/30 rounded-xl flex items-center gap-3">
            <Check className="w-5 h-5 text-success" />
            <span className="text-success">Зміни збережено успішно!</span>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-neutral-700/50 rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold">
              {user.display_name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-50">
                {user.display_name || 'Користувач'}
              </h1>
              <p className="text-neutral-100">{user.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-700">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-neutral-50 font-medium">{user.credits}</span>
              <span className="text-neutral-100 text-sm">кредитів</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-500/10 text-primary-500'
                        : 'text-neutral-100 hover:bg-neutral-700/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-error hover:bg-error/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Вийти
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-neutral-700/50 rounded-2xl border border-white/10 p-6">
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-neutral-50">Налаштування акаунту</h2>
                  
                  <div>
                    <label className="block text-sm text-neutral-100 mb-2">Email</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-300 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-100 mb-2">Ім`я</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-50 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {saveError && <p className="text-sm text-error">{saveError}</p>}

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-3 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Збереження...' : 'Зберегти зміни'}
                  </button>
                </div>
              )}

              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-neutral-50">Підписка</h2>
                  
                  <div className="p-4 bg-neutral-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-neutral-50 capitalize">{user.plan} план</p>
                        <p className="text-sm text-neutral-100">
                          {user.credits} кредитів залишилось
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.plan === 'free' 
                          ? 'bg-neutral-500 text-neutral-100'
                          : 'bg-success/20 text-success'
                      }`}>
                        {user.plan === 'free' ? 'Безкоштовний' : 'Активна'}
                      </span>
                    </div>

                    {user.plan === 'free' && (
                      <button
                        onClick={() => navigate('/pricing')}
                        className="w-full py-3 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold shadow-glow-orange hover:brightness-110 transition-all"
                      >
                        Оновити план
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
