import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, Loader2, Shield, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Merchant } from '../types';

export function AdminMerchantsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState<Record<string, string>>({});

  const isAdmin = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: qError } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (qError) {
      setError(qError.message);
      setMerchants([]);
    } else {
      setMerchants((data as Merchant[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    load();
  }, [user, authLoading, isAdmin, navigate]);

  const setStatus = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    setError('');
    const { error: uError } = await supabase
      .from('merchants')
      .update({
        status,
        review_note: note[id]?.trim() || null,
      })
      .eq('id', id);

    if (uError) {
      setError(uError.message);
    } else {
      await load();
    }
    setBusyId(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-50 mb-2">Доступ заборонено</h1>
          <p className="text-neutral-100 mb-6">
            Ця сторінка лише для акаунтів з <code className="text-primary-500">profiles.role = admin</code>.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-full bg-primary-500 text-white font-medium"
          >
            На головну
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-neutral-50 mb-2">Admin · Мерчанти</h1>
        <p className="text-neutral-100 mb-8">
          Перегляд заявок і approve/reject (RLS: merchants_admin_update).
        </p>

        {error && <p className="text-sm text-error mb-4">{error}</p>}

        {merchants.length === 0 ? (
          <p className="text-neutral-100">Заявок поки немає.</p>
        ) : (
          <div className="space-y-4">
            {merchants.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-xl bg-neutral-700/50 border border-white/10 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-50">{m.legal_name}</h2>
                    <p className="text-sm text-neutral-100">
                      {m.contact_email} · {m.country}
                    </p>
                    <p className="text-xs text-neutral-300 mt-1">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : m.id}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm ${
                      m.status === 'approved'
                        ? 'text-success'
                        : m.status === 'rejected'
                          ? 'text-error'
                          : 'text-warning'
                    }`}
                  >
                    {m.status === 'approved' ? (
                      <Check className="w-4 h-4" />
                    ) : m.status === 'rejected' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    {m.status}
                  </span>
                </div>

                {m.review_note && (
                  <p className="text-sm text-neutral-100">Нотатка: {m.review_note}</p>
                )}

                {m.status === 'pending' && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <input
                      type="text"
                      value={note[m.id] || ''}
                      onChange={(e) => setNote((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="Нотатка рев'ю (опційно)"
                      className="w-full bg-neutral-700 border border-neutral-500 rounded-lg px-3 py-2 text-sm text-neutral-50"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => setStatus(m.id, 'approved')}
                        className="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
                      >
                        {busyId === m.id ? '…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => setStatus(m.id, 'rejected')}
                        className="px-4 py-2 rounded-full border border-white/15 text-neutral-50 text-sm font-medium disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
