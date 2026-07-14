import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, CreditCard, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdjustCreditsDialog } from '../../components/admin/AdjustCreditsDialog';
import { SetPlanDialog } from '../../components/admin/SetPlanDialog';
import { SetRoleDialog } from '../../components/admin/SetRoleDialog';

interface ProfileDetail {
  id: string;
  email: string;
  display_name: string | null;
  credits: number;
  plan: string;
  role: 'user' | 'admin';
  created_at: string;
}

interface TransactionRow {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface TrackRow {
  id: string;
  title: string;
  genre: string | null;
  status: string;
  created_at: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()} ${hh}:${mi}`;
}

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creditsOpen, setCreditsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    setError('');
    setLoading(true);
    const [profileRes, txRes, tracksRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,email,display_name,credits,plan,role,created_at')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('credit_transactions')
        .select('id,amount,type,description,created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('tracks')
        .select('id,title,genre,status,created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (profileRes.error) {
      setError(profileRes.error.message);
      setLoading(false);
      return;
    }
    if (!profileRes.data) {
      setError('Користувача не знайдено.');
      setLoading(false);
      return;
    }

    setProfile(profileRes.data as ProfileDetail);
    setTransactions((txRes.data ?? []) as TransactionRow[]);
    setTracks((tracksRes.data ?? []) as TrackRow[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 text-sm text-neutral-100 hover:text-neutral-50 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> До списку
        </button>
        <p className="text-sm text-error">{error || 'Немає даних.'}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-sm text-neutral-100 hover:text-neutral-50 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> До списку
      </button>

      <div className="bg-neutral-700/50 border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-neutral-50 truncate">{profile.email}</h1>
            <p className="text-sm text-neutral-100 mt-1">
              {profile.display_name || '—'} · зареєстровано {formatDateTime(profile.created_at)}
            </p>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <span className="text-neutral-100">
                Баланс: <span className="text-neutral-50 font-semibold">{profile.credits}</span>
              </span>
              <span className="text-neutral-100">
                Тариф: <span className="text-neutral-50 font-medium">{profile.plan}</span>
              </span>
              <span className="text-neutral-100">
                Роль:{' '}
                {profile.role === 'admin' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-primary-500/15 text-primary-500">
                    admin
                  </span>
                ) : (
                  <span className="text-neutral-50">user</span>
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCreditsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary-500 text-white hover:bg-primary-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Кредити
            </button>
            <button
              type="button"
              onClick={() => setPlanOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-neutral-100 hover:text-neutral-50 border border-white/10 hover:border-white/20 transition-colors"
            >
              <CreditCard className="w-4 h-4" /> Тариф
            </button>
            <button
              type="button"
              onClick={() => setRoleOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-neutral-100 hover:text-neutral-50 border border-white/10 hover:border-white/20 transition-colors"
            >
              <Shield className="w-4 h-4" /> Роль
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-neutral-700/40 border border-white/10 rounded-xl overflow-hidden">
          <h2 className="px-5 py-3 border-b border-white/10 text-sm text-neutral-100">
            Операції з кредитами (30 останніх)
          </h2>
          {transactions.length === 0 ? (
            <p className="p-5 text-sm text-neutral-300">Операцій немає.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-300 border-b border-white/10">
                    <th className="px-4 py-2">Дата</th>
                    <th className="px-4 py-2 text-right">Сума</th>
                    <th className="px-4 py-2">Тип</th>
                    <th className="px-4 py-2">Опис</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2 text-neutral-300 whitespace-nowrap">
                        {formatDateTime(t.created_at)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums font-medium ${
                          t.amount >= 0 ? 'text-success' : 'text-error'
                        }`}
                      >
                        {t.amount > 0 ? `+${t.amount}` : t.amount}
                      </td>
                      <td className="px-4 py-2 text-neutral-100">{t.type}</td>
                      <td className="px-4 py-2 text-neutral-100">{t.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-neutral-700/40 border border-white/10 rounded-xl overflow-hidden">
          <h2 className="px-5 py-3 border-b border-white/10 text-sm text-neutral-100">
            Треки (20 останніх)
          </h2>
          {tracks.length === 0 ? (
            <p className="p-5 text-sm text-neutral-300">Треків немає.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {tracks.map((t) => (
                <li key={t.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-50 truncate">{t.title}</p>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      {t.genre || 'pop'} · {t.status} · {formatDateTime(t.created_at)}
                    </p>
                  </div>
                  <Link
                    to="/library"
                    className="text-xs text-primary-500 hover:underline whitespace-nowrap"
                  >
                    у бібліотеці
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AdjustCreditsDialog
        open={creditsOpen}
        userId={profile.id}
        userEmail={profile.email}
        currentCredits={profile.credits}
        onClose={() => setCreditsOpen(false)}
        onDone={reload}
      />
      <SetPlanDialog
        open={planOpen}
        userId={profile.id}
        userEmail={profile.email}
        currentPlan={profile.plan}
        onClose={() => setPlanOpen(false)}
        onDone={reload}
      />
      <SetRoleDialog
        open={roleOpen}
        userId={profile.id}
        userEmail={profile.email}
        currentRole={profile.role}
        onClose={() => setRoleOpen(false)}
        onDone={reload}
      />
    </div>
  );
}
