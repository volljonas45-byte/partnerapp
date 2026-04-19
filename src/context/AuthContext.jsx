import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('partner_user') || 'null'); } catch { return null; }
  });

  const loginWithGoogle = async (accessToken) => {
    const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_OWNER_ID || 1;
    const res = await api.post('/partner/google-auth', {
      access_token: accessToken,
      workspace_owner_id: WORKSPACE_ID,
    });
    const data = res.data;
    if (data.token) {
      localStorage.setItem('partner_token', data.token);
      localStorage.setItem('partner_user', JSON.stringify(data.user));
      setUser(data.user);
    } else {
      // New user — store temp user info for CompleteProfile screen
      localStorage.setItem('partner_user', JSON.stringify({ ...data.user, partnerStatus: 'new' }));
      setUser({ ...data.user, partnerStatus: 'new' });
    }
    return data.partnerStatus;
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
    <AuthCtx.Provider value={{ user, loginWithGoogle, logout, isAuthenticated, isApproved, isPending }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
