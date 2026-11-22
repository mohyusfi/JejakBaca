import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthContext, type AuthContextValue } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  getAuthToken,
  registerUnauthorizedHandler,
  setAuthToken,
} from '../../lib/api-client';
import { isMockModeEnabled } from '../../lib/env';
import { authService } from '../../services/auth-service';
import type { ActorState, AuthPayload, UserProfile } from '../../types/domain';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(() => Boolean(getAuthToken()));

  const clearSession = useCallback(
    (notifyExpired: boolean) => {
      const hadToken = Boolean(getAuthToken());
      setAuthToken(null);
      setUser(null);
      queryClient.clear();
      if (notifyExpired && hadToken) {
        showToast({
          title: 'Sesi berakhir',
          description: 'Silakan masuk kembali untuk melanjutkan.',
          tone: 'warning',
        });
        const isProtected =
          pathname === '/loans' ||
          pathname === '/readlist' ||
          pathname.startsWith('/admin');
        if (isProtected) {
          navigate({
            to: '/login',
            search: { redirect: pathname },
          });
        }
      }
    },
    [queryClient, showToast, pathname, navigate],
  );

  const refreshSession = useCallback(async (): Promise<UserProfile | null> => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsHydrating(false);
      return null;
    }

    setIsHydrating(true);
    try {
      const profile = await authService.getMe();
      setUser(profile);
      return profile;
    } catch {
      clearSession(true);
      return null;
    } finally {
      setIsHydrating(false);
    }
  }, [clearSession]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let active = true;
    authService
      .getMe()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) {
          clearSession(true);
        }
      })
      .finally(() => {
        if (active) setIsHydrating(false);
      });

    return () => {
      active = false;
    };
  }, [clearSession]);

  useEffect(() => {
    return registerUnauthorizedHandler(() => {
      clearSession(true);
    });
  }, [clearSession]);

  const setSession = useCallback(
    (payload: AuthPayload) => {
      setAuthToken(payload.token);
      setUser(payload.user);
      queryClient.clear();
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    clearSession(false);
    const isProtected =
      pathname === '/loans' ||
      pathname === '/readlist' ||
      pathname.startsWith('/admin');
    if (isProtected) {
      navigate({ to: '/' });
    }
  }, [clearSession, pathname, navigate]);

  const switchMockRole = useCallback(
    async (role: ActorState) => {
      if (!isMockModeEnabled()) return;
      const { switchMockSessionRole } = await import('../../lib/mock/mock-transport');
      const nextUser = switchMockSessionRole(role);
      setUser(nextUser);
      queryClient.clear();
    },
    [queryClient],
  );

  const resetMockData = useCallback(async () => {
    if (!isMockModeEnabled()) return;
    const { resetMockState } = await import('../../lib/mock/mock-transport');
    resetMockState();
    queryClient.invalidateQueries();
    showToast({
      title: 'Data seed mock direset',
      description: 'Seluruh koleksi, peminjaman, dan readlist kembali ke kondisi awal.',
      tone: 'info',
    });
  }, [queryClient, showToast]);

  const actor: ActorState = user ? user.role : 'guest';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      actor,
      isHydrating,
      setSession,
      logout,
      refreshSession,
      switchMockRole,
      resetMockData,
    }),
    [user, actor, isHydrating, setSession, logout, refreshSession, switchMockRole, resetMockData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
