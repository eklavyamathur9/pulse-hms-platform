import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setUnauthorizedHandler, apiJson } from '../lib/api';

export interface User {
  id: number;
  name: string;
  role: string;
  hospital_id: number;
  email?: string;
  contact?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  height?: string;
  weight_baseline?: string;
  allergies?: string;
  specialization?: string;
  is_available?: boolean;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('pulse_user');
    if (saved) {
      apiJson<{ user: User }>('/auth/me')
        .then((data) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('pulse_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData: User): void => {
    setUser(userData);
    localStorage.setItem('pulse_user', JSON.stringify(userData));
  };

  const logout = useCallback(() => {
    apiJson('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    localStorage.removeItem('pulse_user');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
