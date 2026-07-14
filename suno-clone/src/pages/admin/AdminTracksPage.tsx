import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Play, Eye, EyeOff, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { deleteTrackAsAdmin } from '../../lib/adminApi';
import { rpcErrorMessage } from '../../lib/adminErrors';
import { AudioPlayer } from '../../components/audio/AudioPlayer';
import { AdminActionDialog } from '../../components/admin/AdminActionDialog';
import type { Track } from '../../types';

const PAGE_SIZE = 25;
const STATUS_FILTERS = ['all', 'pending', 'processing', 'completed', 'failed'] as const;
const VISIBILITY_FILTERS = ['all', 'public', 'private'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type VisibilityFilter = (typeof VISIBILITY_FILTERS)[number];

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-success/15 text-success',
  failed: 'bg-error/15 text-error',
  processing: 'bg-primary-500/15 text-primary-500',
  pending: 'bg-white/10 text-neutral-100',
};

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

export function AdminTracksPage() {
  const [rows, setRows] = useState<Track[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [page, setPage] = useState(0);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, status, visibility]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');

    let query = supabase
      .from('tracks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (status !== 'all') query = query.eq('status', status);
    if (visibility !== 'all') query = query.eq('is_public', visibility === 'public');
    if (debouncedSearch.trim()) {
      query = query.ilike('title', `%${debouncedSearch.trim().replace(/[%,]/g, '')}%`);
    }

    return query.then(({ data, count, error: e }) => {
      if (e) {
        setError(e.message);
      } else {
        setRows((data ?? []) as Track[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    });
  }, [debouncedSearch, status, visibility, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const toggleVisibility = async (track: Track) => {
    setBusyId(track.id);
    const { error: e } = await supabase
      .from('tracks')
      .update({ is_public: !track.is_public })
      .eq('id', track.id);
    if (!e) {
      setRows((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, is_public: !t.is_public } : t)),
      );
    } else {
      setError(e.message);
    }
    setBusyId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setBusyId(deleteTarget.id);
    try {
      await deleteTrackAsAdmin(deleteTarget.id);
      if (currentTrack?.id === deleteTarget.id) setCurrentTrack(null);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(rpcErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-28">
      <h1 className="text-2xl font-bold text-neutral-50 mb-6">Треки</h1>

      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за назвою"
            className="w-full pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-500 rounded-full text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
          />
        </div>
        <p className="text-xs text-neutral-300">Всього: {total}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-300">Доступ:</span>
          {VISIBILITY_FILTERS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                visibility === v
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              {v === 'all' ? 'усі' : v === 'public' ? 'публічні' : 'приватні'}
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
                  <th className="px-4 py-3">Назва</th>
                  <th className="px-4 py-3">Жанр</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Доступ</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3 text-right">Дії</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const playable = t.status === 'completed' && Boolean(t.audio_url);
                  const busy = busyId === t.id;
                  return (
                    <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="px-4 py-3 text-neutral-50 max-w-[16rem] truncate">{t.title}</td>
                      <td className="px-4 py-3 text-neutral-100">{t.genre || 'pop'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${
                            STATUS_COLORS[t.status] || 'bg-white/10 text-neutral-100'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-100">
                        {t.is_public ? 'публічний' : 'приватний'}
                      </td>
                      <td className="px-4 py-3 text-neutral-300 whitespace-nowrap">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={!playable}
                            onClick={() => setCurrentTrack(t)}
                            title={playable ? 'Прослухати' : 'Немає аудіо'}
                            className="p-2 rounded-full text-neutral-100 hover:text-neutral-50 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleVisibility(t)}
                            title={t.is_public ? 'Зробити приватним' : 'Зробити публічним'}
                            className="p-2 rounded-full text-neutral-100 hover:text-neutral-50 hover:bg-white/10 disabled:opacity-40"
                          >
                            {t.is_public ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setDeleteError('');
                              setDeleteTarget(t);
                            }}
                            title="Видалити"
                            className="p-2 rounded-full text-error hover:bg-error/10 disabled:opacity-40"
                          >
                            {busy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      <AdminActionDialog
        open={Boolean(deleteTarget)}
        title="Видалити трек?"
        onClose={() => (busyId ? undefined : setDeleteTarget(null))}
      >
        <p className="text-sm text-neutral-100">
          Трек <span className="text-neutral-50 font-medium">{deleteTarget?.title}</span> буде
          видалено назавжди разом із аудіофайлом. Дію не можна скасувати.
        </p>
        {deleteError && <p className="text-sm text-error">{deleteError}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            disabled={Boolean(busyId)}
            className="px-4 py-2 rounded-full text-sm text-neutral-100 hover:text-neutral-50 hover:bg-white/5 disabled:opacity-50"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={Boolean(busyId)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-error text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
          >
            {busyId && <Loader2 className="w-4 h-4 animate-spin" />}
            Видалити
          </button>
        </div>
      </AdminActionDialog>

      {currentTrack && (
        <AudioPlayer track={currentTrack} onClose={() => setCurrentTrack(null)} />
      )}
    </div>
  );
}
