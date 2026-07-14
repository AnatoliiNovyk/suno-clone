/** Pulls a human-readable string out of any error shape. Supabase RPC
 *  errors are PostgrestError plain objects (not Error instances), so we
 *  probe their message/details/hint/code fields before giving up. */
function extractRawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    for (const field of ['message', 'details', 'hint', 'code'] as const) {
      const value = (err as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  if (typeof err === 'string') return err;
  return String(err);
}

/** Maps SECURITY DEFINER RPC exception codes to Ukrainian messages;
 *  keeps unknown values intact so the raw error still surfaces. */
export function rpcErrorMessage(err: unknown): string {
  const raw = extractRawMessage(err);
  const key = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    forbidden: 'Недостатньо прав.',
    reason_required: 'Причина обовʼязкова.',
    insufficient_credits_or_missing_user: 'Недостатньо кредитів або користувача не знайдено.',
    unknown_plan: 'Такого тарифу немає або він неактивний.',
    invalid_role: 'Невалідна роль.',
    cannot_demote_self: 'Не можна знімати роль admin у себе.',
    user_not_found: 'Користувача не знайдено.',
  };
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return raw || 'Помилка';
}
