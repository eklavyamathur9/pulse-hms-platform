import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearTokens, setTokens, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pulse_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('pulse_token') || null;
  });

  const login = (userData, jwtToken, refreshToken) => {
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
