import { createContext, useContext, useEffect } from 'react';

// ─── Partner-App Dark Palette ──────────────────────────────────────────────────
const DARK = {
  bg:              '#0D0D12',
  card:            '#16161E',
  cardSecondary:   '#1C1C26',
  cardHover:       'rgba(255,255,255,0.04)',
  text:            '#F2F2F7',
  textSecondary:   '#AEAEB2',
  textTertiary:    '#636366',
  border:          '#2A2A3A',
  borderSubtle:    'rgba(255,255,255,0.08)',
  inputBg:         'rgba(255,255,255,0.05)',
  inputBgHover:    'rgba(255,255,255,0.09)',
  sidebarBg:       'rgba(13,13,18,0.85)',
  overlayBg:       'rgba(0,0,0,0.75)',
  blue:            '#5B8CF5',
  blueLight:       'rgba(91,140,245,0.12)',
  blueMuted:       'rgba(91,140,245,0.18)',
  red:             '#F87171',
  redLight:        'rgba(248,113,113,0.12)',
  green:           '#34D399',
  greenLight:      'rgba(52,211,153,0.12)',
  orange:          '#FB923C',
  orangeLight:     'rgba(251,146,60,0.12)',
  purple:          '#9B72F2',
  purpleLight:     'rgba(155,114,242,0.12)',
  yellow:          '#FBBF24',
  yellowLight:     'rgba(251,191,36,0.12)',
  shadow:          '0 0 0 0.5px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.4)',
  shadowSm:        '0 0 0 0.5px rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.3)',
  shadowLg:        '0 0 0 0.5px rgba(255,255,255,0.05), 0 8px 48px rgba(0,0,0,0.6)',
};

// ─── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Always dark
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const value = { isDark: true, theme: 'dark', setTheme: () => {}, c: DARK };

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
