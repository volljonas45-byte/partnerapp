import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('partner_user') || 'null'); } catch { return null; }
  });

  // Verify token on mount (stay logged in)
  useEffect(() => {
    const token = localStorage.getItem('partner_token');
    if (!token) return;
    api.get('/partner/me').then(res => {
      const u = res.data.user;
      localStorage.setItem('partner_user', JSON.stringify(u));
      setUser(u);
    }).catch(() => {
      // Token invalid — clear session
      localStorage.removeItem('partner_token');
      localStorage.removeItem('partner_user');
      setUser(null);
    });
  }, []);

  const loginWithGoogle = async (credential) => {
    const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_OWNER_ID || 1;
    const res = await api.post('/partner/google-auth', {
      credential,
      workspace_owner_id: Number(WORKSPACE_ID),
    });
    const data = res.data;
    if (data.token) {
      localStorage.setItem('partner_token', data.token);
      localStorage.setItem('partner_user', JSON.stringify(data.user));
      setUser(data.user);
    } else {
      localStorage.setItem('partner_user', JSON.stringify({ ...data.user, partnerStatus: 'new' }));
      setUser({ ...data.user, partnerStatus: 'new' });
    }
    return data.partnerStatus;
  };

  const loginWithEmail = async (email, password) => {
    const res = await api.post('/partner/login', { email, password });
    const data = res.data;
    localStorage.setItem('partner_token', data.token);
    localStorage.setItem('partner_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user.partnerStatus;
  };

  const register = async (name, email, password) => {
    const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_OWNER_ID || 1;
    await api.post('/partner/apply', {
      name, email, password,
      workspace_owner_id: Number(WORKSPACE_ID),
    });
    // Auto-login after registration
    return loginWithEmail(email, password);
  };

  const refreshStatus = async () => {
    const token = localStorage.getItem('partner_token');
    if (!token) return null;
    try {
      const res = await api.get('/partner/status');
      const data = res.data;
      if (data.token) localStorage.setItem('partner_token', data.token);
      localStorage.setItem('partner_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.partnerStatus;
    } catch { return null; }
  };

  const logout = () => {
    localStorage.removeItem('partner_token');
    localStorage.removeItem('partner_user');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isApproved      = user?.partnerStatus === 'approved';
  const isPending       = user?.partnerStatus === 'pending' || user?.partnerStatus === 'new';

  return (
    <AuthCtx.Provider value={{ user, loginWithGoogle, loginWithEmail, register, logout, refreshStatus, isAuthenticated, isApproved, isPending }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
