import { createContext, useContext, useEffect } from 'react';
import { colors } from '../designTokens';

// ─── Vecturo Dark Palette ──────────────────────────────────────────────────────
// Sources tokens from designTokens.js. Exposes both new tokens (primary, *Light, etc.)
// and legacy aliases (blue, purple, etc.) for backwards-compatible page styling.
const DARK = {
  // ── New token names (primary source) ──
  ...colors,

  // ── Legacy aliases (kept for backwards compatibility with not-yet-migrated pages) ──
  blue:            colors.info,
  blueLight:       colors.infoLight,
  blueMuted:       'rgba(91,140,245,0.18)',
  red:             colors.danger,
  redLight:        colors.dangerLight,
  green:           colors.success,
  greenLight:      colors.successLight,
  orange:          '#FB923C',
  orangeLight:     'rgba(251,146,60,0.12)',
  purple:          colors.primary,
  purpleLight:     colors.primaryLight,
  yellow:          colors.warning,
  yellowLight:     colors.warningLight,
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
