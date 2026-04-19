import { createContext, useContext, useState, useEffect } from 'react';
import { partnerApi } from '../api/partner';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('partner_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const data = await partnerApi.login({ email, password });
    localStorage.setItem('partner_token', data.token);
    localStorage.setItem('partner_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('partner_token');
    localStorage.removeItem('partner_user');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isPending       = user?.partnerStatus === 'pending';
  const isApproved      = user?.partnerStatus === 'approved';

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading, isAuthenticated, isPending, isApproved }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
