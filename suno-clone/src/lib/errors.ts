/** Pulls a human-readable string out of any thrown value.
 *
 *  `catch (err: any)` used to be the shortcut here, which silently gives up
 *  type checking on everything downstream. Supabase rejects with plain
 *  PostgrestError / AuthError objects rather than Error instances, so probing a
 *  few known fields covers what `err.message` alone would miss.
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    for (const field of ['message', 'details', 'hint', 'code'] as const) {
      const value = (err as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return '';
}

/** Same, with a caller-supplied fallback for empty/unknown shapes. */
export function errorMessage(err: unknown, fallback: string): string {
  return extractErrorMessage(err) || fallback;
}
