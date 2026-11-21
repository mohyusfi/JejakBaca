import { createContext, useContext } from 'react';
import type { ActorState, AuthPayload, UserProfile } from '../types/domain';

export interface AuthContextValue {
  user: UserProfile | null;
  actor: ActorState;
  isHydrating: boolean;
  setSession: (payload: AuthPayload) => void;
  logout: () => void;
  refreshSession: () => Promise<UserProfile | null>;
  switchMockRole: (role: ActorState) => Promise<void>;
  resetMockData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
