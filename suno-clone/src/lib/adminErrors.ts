/** Maps SECURITY DEFINER RPC exception codes to Ukrainian messages;
 *  keeps unknown values intact so the raw error still surfaces. */
export function rpcErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
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
