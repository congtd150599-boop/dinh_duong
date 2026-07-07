import type { UserRecord } from '@dinhduong/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/auth';
import { ApiError } from '../api/client';

interface AuthContextValue {
  user: UserRecord | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const { user } = await getMe();
        return user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const { user } = await apiLogin(email, password);
      queryClient.setQueryData(['me'], user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    // Set ['me'] first so the redirect to LoginPage is immediate and never
    // races with clearing the cache — calling queryClient.clear() before this
    // removed the ['me'] entry the active useQuery above is subscribed to,
    // which could re-trigger its own fetch and momentarily fight with the
    // null we were about to set, so the UI only updated on the next full
    // reload instead of right away.
    queryClient.setQueryData(['me'], null);
    // Then drop everything else — patient/growth-standards/foods queries are
    // cached per-browser-tab, not per-user, so a different account logging in
    // next in the same tab must not see the previous user's cached data.
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
  }, [queryClient]);

  return <AuthContext.Provider value={{ user: data ?? null, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
