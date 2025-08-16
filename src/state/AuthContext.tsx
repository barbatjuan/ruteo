import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../lib/storage';

export type Role = 'Owner' | 'Admin' | 'Dispatcher' | 'Driver';
export type User = { id: string; email: string; name?: string; roles: Role[]; tenants: { id: string; name: string; plan: 'Free' | 'Pro' | 'Business' }[] };

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
  }, []);

  const login = async (email: string, _password: string) => {
    const mockUser: User = {
      id: 'u1',
      email,
      name: 'Demo User',
      roles: ['Owner', 'Dispatcher'],
      tenants: [
        { id: 'acme', name: 'Acme', plan: 'Pro' },
        { id: 'globex', name: 'Globex', plan: 'Free' },
      ],
    };
    const mockToken = 'mock-token';
    setUser(mockUser);
    setToken(mockToken);
    storage.local.set('auth', { user: mockUser, token: mockToken });
  };

  const signup = async (email: string, password: string) => login(email, password);

  const logout = () => {
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
