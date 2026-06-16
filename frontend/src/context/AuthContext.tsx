import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearTokens, setTokens, setUnauthorizedHandler } from '../lib/api';

interface User {
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
  token: string | null;
  login: (userData: User, jwtToken: string, refreshToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pulse_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('pulse_token') || null;
  });

  const login = (userData: User, jwtToken: string, refreshToken?: string): void => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('pulse_user', JSON.stringify(userData));
    setTokens(jwtToken, refreshToken);
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearTokens();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
