import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthContext, type SignUpResult } from './auth-context';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

async function ensureProfile(userId: string, email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (data && !error) {
    return data as User;
  }

  // Create profile if missing (works with RLS insert-own; trigger may also
  // create it). credits/plan/role are set by DB defaults — never client-written
  // (those columns are locked to the service role at the RLS layer).
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('*')
    .maybeSingle();

  if (created && !insertError) {
    return created as User;
  }

  // Re-read after concurrent insert / DB trigger.
  const { data: again } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return (again as User) ?? null;
}

const PROFILE_LOAD_ERROR = 'Не вдалося завантажити профіль.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const pendingLoadRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadProfile = useCallback(async (userId: string, email?: string) => {
    try {
      const profile = await ensureProfile(userId, email || '');
      if (!mountedRef.current) return;
      if (profile) {
        setUser(profile);
        setError(null);
      } else {
        // A live session whose profile we cannot read. Reporting it beats
        // rendering the app as signed out with no explanation.
        setUser(null);
        setError(PROFILE_LOAD_ERROR);
      }
    } catch (err) {
      console.error('Profile load failed:', err);
      if (!mountedRef.current) return;
      setUser(null);
      setError(PROFILE_LOAD_ERROR);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      loadProfile(session.user.id, session.user.email ?? undefined).finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const { id, email } = session.user;
        // Supabase holds an internal lock while this callback runs; awaiting
        // another client call from inside it can deadlock. Defer to the next
        // tick instead of calling loadProfile directly.
        clearTimeout(pendingLoadRef.current);
        pendingLoadRef.current = setTimeout(() => {
          void loadProfile(id, email ?? undefined);
        }, 0);
        return;
      }
      setUser(null);
      setError(null);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(pendingLoadRef.current);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
  };

  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;

    // Without a session the client is still anonymous, so an insert would be
    // refused by RLS anyway — the handle_new_user trigger owns that case.
    if (data.user && data.session) {
      await ensureProfile(data.user.id, email);
    }

    return { needsEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    // Clear locally regardless: a failed network call must not leave the UI
    // showing a session the user asked to end.
    setUser(null);
    setError(null);
    if (signOutError) console.error('Sign out failed:', signOutError);
  };

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await loadProfile(session.user.id, session.user.email ?? undefined);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signIn, signUp, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
