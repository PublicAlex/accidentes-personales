import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMe, loginUser, logoutUser, registerUser } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import type { User } from '../api/types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthValue {
  user: User | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let activo = true;
    getMe()
      .then((u) => {
        if (!activo) return;
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!activo) return;
        setUser(null);
        setStatus('anonymous');
      });
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
    return () => {
      activo = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await loginUser({ email, password });
    setUser(u);
    setStatus('authenticated');
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; fullName: string }) => {
      await registerUser(input);
      await login(input.email, input.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // aunque falle la red se limpia el estado local
    }
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
