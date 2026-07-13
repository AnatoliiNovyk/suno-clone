import { supabase } from './supabase';
import type { Track } from '../types';

export function getGenerateApiBase(): string {
  const fromEnv = import.meta.env.VITE_GENERATE_API_URL as string | undefined;
  return (fromEnv && fromEnv.trim()) || 'http://localhost:8000';
}

export interface GenerateMusicPayload {
  prompt: string;
  genre: string;
  mode?: 'song' | 'sample';
  title?: string;
  lyrics?: string;
  negative_prompt?: string;
}

export interface GenerateMusicResult {
  status: string;
  message?: string;
  track: Track;
  credits_remaining?: number;
}

/**
 * Call the local/remote Python generation service with the user's Supabase JWT.
 * user_id is derived server-side from the token — never trust a client-supplied id alone.
 */
export async function generateMusic(
  payload: GenerateMusicPayload,
): Promise<GenerateMusicResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || 'Не вдалося отримати сесію');
  }
  if (!session?.access_token) {
    throw new Error('Увійдіть, щоб генерувати музику');
  }

  const base = getGenerateApiBase();
  let response: Response;
  try {
    response = await fetch(`${base}/generate-music`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Сервіс генерації недоступний (${base}). Запустіть python-service (python main.py).`,
    );
  }

  if (!response.ok) {
    let message = 'Помилка генерації';
    try {
      const errJson = await response.json();
      const detail = errJson?.detail ?? errJson?.error?.message;
      if (typeof detail === 'string') message = detail;
      else if (Array.isArray(detail)) {
        message = detail.map((d) => d?.msg || String(d)).join('; ') || message;
      }
    } catch {
      // ignore parse errors
    }
    if (response.status === 401) {
      throw new Error(message || 'Сесія недійсна. Увійдіть знову.');
    }
    if (response.status === 402) {
      throw new Error(message || 'Недостатньо кредитів');
    }
    throw new Error(message);
  }

  return (await response.json()) as GenerateMusicResult;
}

/** Poll a track row until terminal status or timeout. */
export async function pollTrackStatus(
  trackId: string,
  userId: string,
  options?: { intervalMs?: number; timeoutMs?: number; onUpdate?: (t: Track) => void },
): Promise<Track> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 10 * 60 * 1000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) {
      const track = data as Track;
      options?.onUpdate?.(track);
      if (track.status === 'completed' || track.status === 'failed') {
        return track;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Час очікування генерації вичерпано. Перевірте бібліотеку пізніше.');
}
