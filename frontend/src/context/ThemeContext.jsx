import { createContext, useContext, useEffect, useState, useMemo } from 'react';

// ─── Color Tokens (Apple HIG-aligned) ─────────────────────────────────────────
const LIGHT = {
  bg:              '#F5F5F7',
  card:            '#FFFFFF',
  cardSecondary:   '#F2F2F7',
  cardHover:       'rgba(0,0,0,0.02)',
  text:            '#1D1D1F',
  textSecondary:   '#86868B',
  textTertiary:    '#6E6E73',
  border:          '#D2D2D7',
  borderSubtle:    'rgba(0,0,0,0.06)',
  inputBg:         'rgba(118,118,128,0.08)',
  inputBgHover:    'rgba(118,118,128,0.12)',
  sidebarBg:       'rgba(246,246,248,0.80)',
  overlayBg:       'rgba(0,0,0,0.35)',
  blue:            '#007AFF',
  blueLight:       'rgba(0,122,255,0.08)',
  blueMuted:       'rgba(0,122,255,0.12)',
  red:             '#FF3B30',
  redLight:        'rgba(255,59,48,0.08)',
  green:           '#34C759',
  greenLight:      'rgba(52,199,89,0.08)',
  orange:          '#FF9500',
  orangeLight:     'rgba(255,149,0,0.08)',
  purple:          '#AF52DE',
  purpleLight:     'rgba(175,82,222,0.08)',
  yellow:          '#FFCC00',
  yellowLight:     'rgba(255,204,0,0.10)',
  shadow:          '0 0 0 0.5px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
  shadowSm:        '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
  shadowLg:        '0 0 0 0.5px rgba(0,0,0,0.03), 0 4px 24px rgba(0,0,0,0.10)',
};

const DARK = {
  bg:              '#0A0A0A',
  card:            '#1C1C1E',
  cardSecondary:   '#2C2C2E',
  cardHover:       'rgba(255,255,255,0.04)',
  text:            '#F5F5F7',
  textSecondary:   '#98989D',
  textTertiary:    '#8E8E93',
  border:          '#38383A',
  borderSubtle:    'rgba(255,255,255,0.06)',
  inputBg:         'rgba(118,118,128,0.20)',
  inputBgHover:    'rgba(118,118,128,0.28)',
  sidebarBg:       'rgba(22,22,24,0.88)',
  overlayBg:       'rgba(0,0,0,0.55)',
  blue:            '#0A84FF',
  blueLight:       'rgba(10,132,255,0.12)',
  blueMuted:       'rgba(10,132,255,0.18)',
  red:             '#FF453A',
  redLight:        'rgba(255,69,58,0.12)',
  green:           '#30D158',
  greenLight:      'rgba(48,209,88,0.12)',
  orange:          '#FF9F0A',
  orangeLight:     'rgba(255,159,10,0.12)',
  purple:          '#BF5AF2',
  purpleLight:     'rgba(191,90,242,0.12)',
  yellow:          '#FFD60A',
  yellowLight:     'rgba(255,214,10,0.12)',
  shadow:          '0 0 0 0.5px rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35)',
  shadowSm:        '0 0 0 0.5px rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.25)',
  shadowLg:        '0 0 0 0.5px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.45)',
};

// ─── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('vecturo-theme') || 'auto';
  });

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    // 'auto' — follow system
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  // Listen for system changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setThemeState(t => t); // force re-render
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Apply data-theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const setTheme = (value) => {
    localStorage.setItem('vecturo-theme', value);
    setThemeState(value);
  };

  const c = isDark ? DARK : LIGHT;

  const value = { isDark, theme, setTheme, c };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
