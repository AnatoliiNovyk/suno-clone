import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminActionDialog } from './AdminActionDialog';
import { rpcErrorMessage } from '../../lib/adminErrors';

interface Props {
  open: boolean;
  userId: string;
  userEmail: string;
  currentCredits: number;
  onClose: () => void;
  onDone: () => void;
}

export function AdjustCreditsDialog({
  open,
  userId,
  userEmail,
  currentCredits,
  onClose,
  onDone,
}: Props) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const parsedDelta = Number(delta);
  const deltaValid = delta.trim() !== '' && Number.isInteger(parsedDelta) && parsedDelta !== 0;
  const reasonValid = reason.trim().length > 0;
  const canSubmit = deltaValid && reasonValid && !busy;

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_adjust_credits', {
        p_user_id: userId,
        p_delta: parsedDelta,
        p_reason: reason.trim(),
      });
      if (rpcError) throw rpcError;
      setDelta('');
      setReason('');
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
      title={`Кредити: ${userEmail}`}
      onClose={busy ? () => {} : onClose}
    >
      <p className="text-sm text-neutral-100">
        Поточний баланс: <span className="text-neutral-50 font-medium">{currentCredits}</span>
      </p>

      <div>
        <label className="block text-xs text-neutral-300 mb-1">
          Зміна балансу (+ додати, − списати)
        </label>
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="Напр. 50 або -10"
          disabled={busy}
          className="w-full bg-neutral-900 border border-neutral-500 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs text-neutral-300 mb-1">Причина</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Опишіть, чому змінюєте баланс"
          disabled={busy}
          maxLength={200}
          className="w-full bg-neutral-900 border border-neutral-500 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-primary-500"
        />
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
          Застосувати
        </button>
      </div>
    </AdminActionDialog>
  );
}
