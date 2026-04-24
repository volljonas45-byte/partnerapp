import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);

export function OnboardingProvider({ children }) {
  const { user } = useAuth();
  const key = `vp_ob_${user?.id ?? 'x'}`;

  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  });

  const save = useCallback((patch) => {
    setData(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  const markWelcomeSeen = useCallback(() => save({ welcomeSeen: true }), [save]);

  const isPageSeen  = useCallback((path) => (data.pagesSeen || []).includes(path), [data.pagesSeen]);
  const markPageSeen = useCallback((path) => {
    if ((data.pagesSeen || []).includes(path)) return;
    save({ pagesSeen: [...(data.pagesSeen || []), path] });
  }, [data.pagesSeen, save]);

  // Dev helper — reset all onboarding state
  const resetOnboarding = useCallback(() => {
    try { localStorage.removeItem(key); } catch {}
    setData({});
  }, [key]);

  return (
    <Ctx.Provider value={{
      welcomeSeen: !!data.welcomeSeen,
      markWelcomeSeen,
      isPageSeen,
      markPageSeen,
      resetOnboarding,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useOnboarding = () => useContext(Ctx);
