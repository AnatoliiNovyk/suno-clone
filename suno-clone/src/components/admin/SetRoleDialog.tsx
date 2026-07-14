import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { AdminActionDialog } from './AdminActionDialog';
import { rpcErrorMessage } from '../../lib/adminErrors';

interface Props {
  open: boolean;
  userId: string;
  userEmail: string;
  currentRole: 'user' | 'admin';
  onClose: () => void;
  onDone: () => void;
}

export function SetRoleDialog({
  open,
  userId,
  userEmail,
  currentRole,
  onClose,
  onDone,
}: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<'user' | 'admin'>(currentRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSelected(currentRole);
      setError('');
    }
  }, [open, currentRole]);

  const isSelfDemotion = user?.id === userId && selected !== 'admin';
  const canSubmit = selected !== currentRole && !isSelfDemotion && !busy;

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_role', {
        p_user_id: userId,
        p_role: selected,
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
      title={`Роль: ${userEmail}`}
      onClose={busy ? () => {} : onClose}
    >
      <p className="text-sm text-neutral-100">
        Поточна роль: <span className="text-neutral-50 font-medium">{currentRole}</span>
      </p>

      <div>
        <label className="block text-xs text-neutral-300 mb-1">Нова роль</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as 'user' | 'admin')}
          disabled={busy}
          className="w-full bg-neutral-900 border border-neutral-500 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-primary-500"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </div>

      {isSelfDemotion && (
        <p className="text-xs text-neutral-300">
          Не можна знімати роль admin у себе — інакше система залишиться без адміністраторів.
        </p>
      )}
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
