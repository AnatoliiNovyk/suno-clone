import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatMoney } from '../../lib/pricing';
import type { Currency, Subscription } from '../../types';

const PAGE_SIZE = 25;
const PROVIDER_FILTERS = ['all', 'stripe', 'liqpay'] as const;
const STATUS_FILTERS = ['all', 'active', 'cancelled', 'past_due'] as const;
type ProviderFilter = (typeof PROVIDER_FILTERS)[number];
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/15 text-success',
  cancelled: 'bg-error/15 text-error',
  past_due: 'bg-primary-500/15 text-primary-500',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<Subscription[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [provider, setProvider] = useState<ProviderFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [provider, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    let query = supabase
      .from('subscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (provider !== 'all') query = query.eq('provider', provider);
    if (status !== 'all') query = query.eq('status', status);

    const { data, count, error: e } = await query;
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }

    const subs = (data ?? []) as Subscription[];
    setRows(subs);
    setTotal(count ?? 0);

    const ids = [...new Set(subs.map((s) => s.user_id))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,email')
        .in('id', ids);
      const map: Record<string, string> = {};
      for (const p of profiles ?? []) map[p.id] = p.email;
      setEmails(map);
    }
    setLoading(false);
  }, [provider, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-bold text-neutral-50 mb-6">Підписки</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-300">Провайдер:</span>
          {PROVIDER_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                provider === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              {p === 'all' ? 'усі' : p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-300">Статус:</span>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                status === s
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              {s === 'all' ? 'усі' : s}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-300 ml-auto">Всього: {total}</p>
      </div>

      <div className="bg-neutral-700/40 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-error">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-neutral-300">Підписок немає.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-300 border-b border-white/10">
                  <th className="px-4 py-3">Користувач</th>
                  <th className="px-4 py-3">Тариф</th>
                  <th className="px-4 py-3">Провайдер</th>
                  <th className="px-4 py-3 text-right">Сума</th>
                  <th className="px-4 py-3">Інтервал</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Період до</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-4 py-3 text-neutral-50 max-w-[14rem] truncate">
                      {emails[s.user_id] || s.user_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-neutral-100">{s.plan}</td>
                    <td className="px-4 py-3 text-neutral-100">{s.provider || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-50">
                      {s.amount_minor != null && s.currency
                        ? formatMoney(s.amount_minor, s.currency as Currency)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-100">{s.interval || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${
                          STATUS_COLORS[s.status] || 'bg-white/10 text-neutral-100'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-300 whitespace-nowrap">
                      {formatDate(s.current_period_end)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 rounded-full text-neutral-100 hover:text-neutral-50 hover:bg-white/5 disabled:opacity-40"
          >
            ← Попередня
          </button>
          <span className="text-neutral-300">
            Сторінка {page + 1} з {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || loading}
            className="px-3 py-1.5 rounded-full text-neutral-100 hover:text-neutral-50 hover:bg-white/5 disabled:opacity-40"
          >
            Наступна →
          </button>
        </div>
      )}
    </div>
  );
}
