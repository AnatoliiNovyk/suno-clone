import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, email?: string) => {
    const profile = await ensureProfile(userId, email || '');
    if (profile) {
      setUser(profile);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || undefined).finally(() =>
          setLoading(false),
        );
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || undefined);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      await ensureProfile(data.user.id, email);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id, session.user.email || undefined);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
