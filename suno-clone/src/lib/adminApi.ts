import { supabase } from './supabase';
import { getGenerateApiBase } from './generateApi';

/**
 * Admin-only: delete a track (DB row + Storage file) via the Python service,
 * which holds the service-role key. The server re-verifies the admin role.
 */
export async function deleteTrackAsAdmin(trackId: string): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message || 'Не вдалося отримати сесію');
  if (!session?.access_token) throw new Error('Сесія недійсна. Увійдіть знову.');

  const base = getGenerateApiBase();
  let response: Response;
  try {
    response = await fetch(`${base}/admin/tracks/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    throw new Error(
      `Сервіс недоступний (${base}). Запустіть python-service (python main.py).`,
    );
  }

  if (!response.ok) {
    let message = 'Не вдалося видалити трек';
    try {
      const err = await response.json();
      if (typeof err?.detail === 'string') message = err.detail;
    } catch {
      // ignore parse errors
    }
    if (response.status === 401) throw new Error('Сесія недійсна. Увійдіть знову.');
    if (response.status === 403) throw new Error('Потрібні права адміністратора.');
    throw new Error(message);
  }
}
