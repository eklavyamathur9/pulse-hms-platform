import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setUnauthorizedHandler } from '../lib/api';

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

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('pulse_user', JSON.stringify(userData));
    if (jwtToken) localStorage.setItem('pulse_token', jwtToken);
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pulse_user');
    localStorage.removeItem('pulse_token');
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
