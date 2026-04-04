import { createContext, useContext, useEffect, useState, useMemo } from 'react';

// ─── Color Tokens ──────────────────────────────────────────────────────────────
const LIGHT = {
  bg:              '#F5F5F7',
  card:            '#FFFFFF',
  cardSecondary:   '#F2F2F7',
  cardHover:       '#F7F7F9',
  text:            '#1D1D1F',
  textSecondary:   '#86868B',
  textTertiary:    '#6E6E73',
  border:          '#E5E5EA',
  borderSubtle:    'rgba(0,0,0,0.06)',
  inputBg:         'rgba(118,118,128,0.12)',
  inputBgHover:    'rgba(118,118,128,0.16)',
  sidebarBg:       'rgba(255,255,255,0.85)',
  overlayBg:       'rgba(0,0,0,0.4)',
  blue:            '#0071E3',
  blueLight:       'rgba(0,113,227,0.10)',
  red:             '#FF3B30',
  redLight:        'rgba(255,59,48,0.10)',
  green:           '#34C759',
  greenLight:      'rgba(52,199,89,0.10)',
  orange:          '#FF9500',
  orangeLight:     'rgba(255,149,0,0.10)',
  purple:          '#AF52DE',
  purpleLight:     'rgba(175,82,222,0.10)',
  yellow:          '#FFCC00',
  yellowLight:     'rgba(255,204,0,0.10)',
  shadow:          '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
  shadowSm:        '0 1px 2px rgba(0,0,0,0.06)',
  shadowLg:        '0 4px 24px rgba(0,0,0,0.12)',
};

const DARK = {
  bg:              '#000000',
  card:            '#1C1C1E',
  cardSecondary:   '#2C2C2E',
  cardHover:       '#3A3A3C',
  text:            '#F5F5F5',
  textSecondary:   '#8E8E93',
  textTertiary:    '#8E8E93',
  border:          '#38383A',
  borderSubtle:    'rgba(255,255,255,0.08)',
  inputBg:         'rgba(118,118,128,0.24)',
  inputBgHover:    'rgba(118,118,128,0.30)',
  sidebarBg:       'rgba(28,28,30,0.92)',
  overlayBg:       'rgba(0,0,0,0.6)',
  blue:            '#0A84FF',
  blueLight:       'rgba(10,132,255,0.15)',
  red:             '#FF453A',
  redLight:        'rgba(255,69,58,0.15)',
  green:           '#30D158',
  greenLight:      'rgba(48,209,88,0.15)',
  orange:          '#FF9F0A',
  orangeLight:     'rgba(255,159,10,0.15)',
  purple:          '#BF5AF2',
  purpleLight:     'rgba(191,90,242,0.15)',
  yellow:          '#FFD60A',
  yellowLight:     'rgba(255,214,10,0.15)',
  shadow:          '0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4)',
  shadowSm:        '0 1px 2px rgba(0,0,0,0.3)',
  shadowLg:        '0 4px 24px rgba(0,0,0,0.5)',
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
