import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  credits: number;
  plan: string;
  role: string;
  created_at: string;
}

const PAGE_SIZE = 25;
const PLAN_FILTERS = ['all', 'free', 'pro', 'premier'] as const;
const ROLE_FILTERS = ['all', 'user', 'admin'] as const;
type PlanFilter = (typeof PLAN_FILTERS)[number];
type RoleFilter = (typeof ROLE_FILTERS)[number];

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [plan, setPlan] = useState<PlanFilter>('all');
  const [role, setRole] = useState<RoleFilter>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, plan, role]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    let query = supabase
      .from('profiles')
      .select('id,email,display_name,credits,plan,role,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (plan !== 'all') query = query.eq('plan', plan);
    if (role !== 'all') query = query.eq('role', role);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().replace(/[%,]/g, '');
      query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
    }

    query.then(({ data, count, error: e }) => {
      if (cancelled) return;
      if (e) {
        setError(e.message);
      } else {
        setRows((data ?? []) as ProfileRow[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, plan, role, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-50 mb-6">Користувачі</h1>

      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за email або іменем"
            className="w-full pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-500 rounded-full text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
          />
        </div>
        <p className="text-xs text-neutral-300">Всього: {total}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-300">План:</span>
          {PLAN_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlan(p)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                plan === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              {p === 'all' ? 'усі' : p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-300">Роль:</span>
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                role === r
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              {r === 'all' ? 'усі' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-neutral-700/40 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-error">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-neutral-300">Нічого не знайдено.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-300 border-b border-white/10">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Імʼя</th>
                  <th className="px-4 py-3">План</th>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3 text-right">Кредити</th>
                  <th className="px-4 py-3">Зареєстровано</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/admin/users/${r.id}`)}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-neutral-50">{r.email}</td>
                    <td className="px-4 py-3 text-neutral-100">{r.display_name || '—'}</td>
                    <td className="px-4 py-3 text-neutral-100">{r.plan}</td>
                    <td className="px-4 py-3">
                      {r.role === 'admin' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-primary-500/15 text-primary-500">
                          admin
                        </span>
                      ) : (
                        <span className="text-neutral-100">user</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-50 text-right tabular-nums">{r.credits}</td>
                    <td className="px-4 py-3 text-neutral-300">{formatDate(r.created_at)}</td>
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
