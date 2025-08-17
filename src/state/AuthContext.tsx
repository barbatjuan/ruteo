import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../lib/storage';
import { getSupabase } from '../lib/supabase';

export type Role = 'Owner' | 'Admin' | 'Dispatcher' | 'Driver';
export type User = { id: string; email: string; name?: string; roles?: Role[]; appTenantUuid?: string | null };

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = storage.local.get('auth');
    if (saved) {
      setUser(saved.user);
      setToken(saved.token);
    }
    const sb = getSupabase();
    // Cargar sesión actual
    sb.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s) {
        const u: User = {
          id: s.user.id,
          email: s.user.email || '',
          name: (s.user.user_metadata as any)?.name,
          appTenantUuid: (s.user.app_metadata as any)?.tenant_uuid ?? null,
        };
        setUser(u);
        setToken(s.access_token);
        storage.local.set('auth', { user: u, token: s.access_token });
      }
    });
    // Suscribirse a cambios de auth
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const u: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: (session.user.user_metadata as any)?.name,
          appTenantUuid: (session.user.app_metadata as any)?.tenant_uuid ?? null,
        };
        setUser(u);
        setToken(session.access_token);
        storage.local.set('auth', { user: u, token: session.access_token });
      } else {
        setUser(null);
        setToken(null);
        storage.local.remove('auth');
      }
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const s = data.session;
    if (!s) throw new Error('No session');
    const u: User = {
      id: s.user.id,
      email: s.user.email || '',
      name: (s.user.user_metadata as any)?.name,
      appTenantUuid: (s.user.app_metadata as any)?.tenant_uuid ?? null,
    };
    setUser(u);
    setToken(s.access_token);
    storage.local.set('auth', { user: u, token: s.access_token });
  };

  const signup = async (email: string, password: string) => {
    const sb = getSupabase();
    const { error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
  };

  const logout = () => {
    const sb = getSupabase();
    sb.auth.signOut();
    setUser(null);
    setToken(null);
    storage.local.remove('auth');
  };

  const value = useMemo(() => ({ user, token, login, signup, logout }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
