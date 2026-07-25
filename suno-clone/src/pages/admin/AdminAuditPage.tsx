import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PAGE_SIZE = 25;
const ACTION_FILTERS = ['all', 'adjust_credits', 'set_plan', 'set_role'] as const;
type ActionFilter = (typeof ACTION_FILTERS)[number];

const ACTION_LABEL: Record<string, string> = {
  adjust_credits: 'Кредити',
  set_plan: 'Тариф',
  set_role: 'Роль',
};

interface AuditRow {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
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

function describeDetails(action: string, details: Record<string, unknown> | null): string {
  if (!details) return '—';
  if (action === 'adjust_credits') {
    const delta = Number(details.delta ?? 0);
    const sign = delta > 0 ? `+${delta}` : String(delta);
    return `${sign} кредитів · ${details.reason ?? ''}`;
  }
  if (action === 'set_plan') return `→ ${details.plan ?? ''}`;
  if (action === 'set_role') return `→ ${details.role ?? ''}`;
  return JSON.stringify(details);
}

export function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [action, setAction] = useState<ActionFilter>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [action]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    let query = supabase
      .from('admin_actions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (action !== 'all') query = query.eq('action', action);

    const { data, count, error: e } = await query;
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }

    const actions = (data ?? []) as AuditRow[];
    setRows(actions);
    setTotal(count ?? 0);

    const ids = [
      ...new Set(
        actions.flatMap((a) => [a.admin_id, a.target_user_id]).filter(Boolean) as string[],
      ),
    ];
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
  }, [action, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const nameOf = (id: string | null) =>
    id ? emails[id] || id.slice(0, 8) : '—';

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-bold text-neutral-50 mb-6">Журнал дій</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-300">Дія:</span>
          {ACTION_FILTERS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                action === a
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              {a === 'all' ? 'усі' : ACTION_LABEL[a] || a}
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
          <p className="p-6 text-sm text-neutral-300">Записів немає.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-300 border-b border-white/10">
                  <th className="px-4 py-3">Час</th>
                  <th className="px-4 py-3">Адмін</th>
                  <th className="px-4 py-3">Дія</th>
                  <th className="px-4 py-3">Над ким</th>
                  <th className="px-4 py-3">Деталі</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-4 py-3 text-neutral-300 whitespace-nowrap">
                      {formatDateTime(a.created_at)}
                    </td>
                    <td className="px-4 py-3 text-neutral-50 max-w-[12rem] truncate">
                      {nameOf(a.admin_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-white/10 text-neutral-100">
                        {ACTION_LABEL[a.action] || a.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-100 max-w-[12rem] truncate">
                      {nameOf(a.target_user_id)}
                    </td>
                    <td className="px-4 py-3 text-neutral-100">
                      {describeDetails(a.action, a.details)}
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
