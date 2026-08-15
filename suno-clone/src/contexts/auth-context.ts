import { createContext } from 'react';
import type { User } from '../types';

export interface SignUpResult {
  /** True when Supabase created no session, i.e. the address must be confirmed
   *  before the user can sign in. False means they are already signed in. */
  needsEmailConfirmation: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Set when a session exists but its profile could not be loaded — without
   *  it the app renders as logged out and says nothing. Retry via refreshUser. */
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
