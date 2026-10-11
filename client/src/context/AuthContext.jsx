import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('compta_user') || sessionStorage.getItem('compta_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password, remember = true) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success && res.user) {
        setUser(res.user);
        if (remember) {
          localStorage.setItem('compta_user', JSON.stringify(res.user));
          if (res.token) localStorage.setItem('compta_token', res.token);
          sessionStorage.removeItem('compta_user');
          sessionStorage.removeItem('compta_token');
        } else {
          sessionStorage.setItem('compta_user', JSON.stringify(res.user));
          if (res.token) sessionStorage.setItem('compta_token', res.token);
          localStorage.removeItem('compta_user');
          localStorage.removeItem('compta_token');
        }
        return { success: true, user: res.user };
      }
      throw new Error(res.error || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (user?.name) {
        await api.logout(user.name);
      }
    } catch (e) {
      console.warn('Erreur logout:', e);
    } finally {
      setUser(null);
      localStorage.removeItem('compta_user');
      sessionStorage.removeItem('compta_user');
      localStorage.removeItem('compta_token');
      sessionStorage.removeItem('compta_token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider');
  }
  return ctx;
}
