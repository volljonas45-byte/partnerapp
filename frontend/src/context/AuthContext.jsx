import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('token'));
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync token to axios header whenever it changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Fetch current user on mount if token exists
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/api/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {
        // Token invalid — clear it
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []); // Run once on mount

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const refreshUser = () =>
    api.get('/api/auth/me').then(res => setUser(res.data)).catch(() => {});

  /** Convenience getter: role of the current user */
  const isCEO       = user?.role === 'ceo';
  const isAdmin     = isCEO || user?.role === 'admin';
  const isPM        = user?.role === 'pm';
  const isDeveloper = user?.role === 'developer';

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, refreshUser, isAuthenticated: !!token, isCEO, isAdmin, isPM, isDeveloper }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
