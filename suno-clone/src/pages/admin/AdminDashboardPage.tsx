import React, { useEffect, useState } from 'react';
import { Users, Music, Sparkles, Receipt, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Stats {
  users: number;
  tracksByStatus: Record<string, number>;
  creditsSpent7d: number;
  creditsSpent30d: number;
  activeSubscriptions: number;
  generationsByDay: { date: string; count: number }[];
}

const TRACK_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
const CHART_DAYS = 14;

async function loadStats(): Promise<Stats> {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

  const usersRes = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  if (usersRes.error) throw new Error(usersRes.error.message);
  const users = usersRes.count ?? 0;

  const tracksByStatus: Record<string, number> = {};
  for (const status of TRACK_STATUSES) {
    const res = await supabase
      .from('tracks')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    if (res.error) throw new Error(res.error.message);
    tracksByStatus[status] = res.count ?? 0;
  }

  const { data: spendRows, error: spendError } = await supabase
    .from('credit_transactions')
    .select('amount, created_at')
    .lt('amount', 0)
    .gte('created_at', daysAgo(30));
  if (spendError) throw new Error(spendError.message);
  const spent = (sinceIso: string) =>
    (spendRows ?? [])
      .filter((r) => r.created_at >= sinceIso)
      .reduce((sum, r) => sum + Math.abs(r.amount), 0);

  const subsRes = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  if (subsRes.error) throw new Error(subsRes.error.message);
  const activeSubscriptions = subsRes.count ?? 0;

  const { data: recentTracks, error: tracksError } = await supabase
    .from('tracks')
    .select('created_at')
    .gte('created_at', daysAgo(CHART_DAYS));
  if (tracksError) throw new Error(tracksError.message);

  const generationsByDay: { date: string; count: number }[] = [];
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const day = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    generationsByDay.push({
      date: day,
      count: (recentTracks ?? []).filter((t) => t.created_at.slice(0, 10) === day).length,
    });
  }

  return {
    users,
    tracksByStatus,
    creditsSpent7d: spent(daysAgo(7)),
    creditsSpent30d: spent(daysAgo(30)),
    activeSubscriptions,
    generationsByDay,
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-neutral-700/50 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-neutral-100 text-sm mb-2">
        <Icon className="w-4 h-4 text-primary-500" />
        {label}
      </div>
      <p className="text-3xl font-bold text-neutral-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-300">{hint}</p>}
    </div>
  );
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats()
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Помилка завантаження'));
  }, []);

  if (error) {
    return <p className="text-error text-sm">Не вдалося завантажити статистику: {error}</p>;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const totalTracks = Object.values(stats.tracksByStatus).reduce((a, b) => a + b, 0);
  const maxDay = Math.max(1, ...stats.generationsByDay.map((d) => d.count));

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-50 mb-6">Дашборд</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Користувачі" value={stats.users} />
        <StatCard
          icon={Music}
          label="Треки"
          value={totalTracks}
          hint={`✓ ${stats.tracksByStatus.completed} · ✗ ${stats.tracksByStatus.failed} · в роботі ${
            stats.tracksByStatus.pending + stats.tracksByStatus.processing
          }`}
        />
        <StatCard
          icon={Sparkles}
          label="Кредитів витрачено"
          value={stats.creditsSpent7d}
          hint={`за 7 днів · ${stats.creditsSpent30d} за 30 днів`}
        />
        <StatCard icon={Receipt} label="Активні підписки" value={stats.activeSubscriptions} />
      </div>

      <div className="bg-neutral-700/50 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm text-neutral-100 mb-4">
          Генерації за останні {CHART_DAYS} днів
        </h2>
        <div className="flex items-end gap-1.5 h-36">
          {stats.generationsByDay.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[10px] text-neutral-300">{d.count > 0 ? d.count : ''}</span>
              <div
                className="w-full rounded-t bg-primary-500/80 hover:bg-primary-500 transition-colors"
                style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? 4 : 1 }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-[10px] text-neutral-300 rotate-0 truncate w-full text-center">
                {d.date.slice(8, 10)}.{d.date.slice(5, 7)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
