import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminActionDialog } from './AdminActionDialog';
import { rpcErrorMessage } from '../../lib/adminErrors';

interface PlanRow {
  key: string;
  name: string;
}

interface Props {
  open: boolean;
  userId: string;
  userEmail: string;
  currentPlan: string;
  onClose: () => void;
  onDone: () => void;
}

export function SetPlanDialog({
  open,
  userId,
  userEmail,
  currentPlan,
  onClose,
  onDone,
}: Props) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [selected, setSelected] = useState(currentPlan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected(currentPlan);
    setError('');
    supabase
      .from('plans')
      .select('key,name')
      .eq('active', true)
      .then(({ data, error: e }) => {
        if (e) {
          setError(rpcErrorMessage(e));
          return;
        }
        setPlans((data ?? []) as PlanRow[]);
      });
  }, [open, currentPlan]);

  const canSubmit = selected && selected !== currentPlan && !busy;

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_plan', {
        p_user_id: userId,
        p_plan: selected,
      });
      if (rpcError) throw rpcError;
      onDone();
      onClose();
    } catch (err) {
      setError(rpcErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminActionDialog
      open={open}
      title={`Тариф: ${userEmail}`}
      onClose={busy ? () => {} : onClose}
    >
      <p className="text-sm text-neutral-100">
        Поточний тариф: <span className="text-neutral-50 font-medium">{currentPlan}</span>
      </p>

      <div>
        <label className="block text-xs text-neutral-300 mb-1">Новий тариф</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={busy || plans.length === 0}
          className="w-full bg-neutral-900 border border-neutral-500 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-primary-500"
        >
          {plans.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name} ({p.key})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="px-4 py-2 rounded-full text-sm text-neutral-100 hover:text-neutral-50 hover:bg-white/5 disabled:opacity-50"
        >
          Скасувати
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 rounded-full text-sm font-medium bg-primary-500 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Змінити
        </button>
      </div>
    </AdminActionDialog>
  );
}
