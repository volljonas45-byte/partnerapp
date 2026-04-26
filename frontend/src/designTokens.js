// ─── Vecturo Design Tokens ─────────────────────────────────────────────────────
// Single source of truth for the redesigned UI system.
// Used by ThemeContext (re-exported as `c`) and directly by ui/* components.

// ─── Colors ────────────────────────────────────────────────────────────────────
export const colors = {
  // Background hierarchy
  bg:            '#0D0D12',
  card:          '#16161E',
  cardSecondary: '#1C1C26',
  cardHover:     'rgba(255,255,255,0.04)',

  // Text hierarchy
  text:          '#F2F2F7',
  textSecondary: '#AEAEB2',
  textTertiary:  '#636366',

  // Borders
  border:        '#2A2A3A',
  borderSubtle:  'rgba(255,255,255,0.08)',

  // Inputs
  inputBg:       'rgba(255,255,255,0.05)',
  inputBgHover:  'rgba(255,255,255,0.09)',

  // ── Primary: Lila ──
  primary:        '#9B72F2',
  primaryLight:   'rgba(155,114,242,0.12)',
  primaryMuted:   'rgba(155,114,242,0.18)',
  primarySubtle:  'rgba(155,114,242,0.04)',
  primaryHover:   '#B89BFF', // 400
  primaryPress:   '#7C5CF5', // 600
  primaryGradient: 'linear-gradient(135deg, #9B72F2 0%, #7C5CF5 100%)',
  primaryTextGradient: 'linear-gradient(135deg, #B89BFF 0%, #9B72F2 100%)',
  primaryGlow:    '0 8px 32px rgba(155,114,242,0.18)',

  // ── Status (only for real status meaning) ──
  success:       '#34D399',
  successLight:  'rgba(52,211,153,0.12)',
  warning:       '#FBBF24',
  warningLight:  'rgba(251,191,36,0.12)',
  danger:        '#F87171',
  dangerLight:   'rgba(248,113,113,0.12)',
  info:          '#5B8CF5',
  infoLight:     'rgba(91,140,245,0.12)',

  // ── Sidebar ──
  sidebarBg:     'rgba(13,13,18,0.85)',
  overlayBg:     'rgba(0,0,0,0.75)',
};

// ─── Spacing scale (4px base) ──────────────────────────────────────────────────
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
};

// ─── Border radius ─────────────────────────────────────────────────────────────
export const radii = {
  xs:   6,
  sm:   7,
  md:   9,
  lg:   12,
  xl:   16,
  '2xl': 20,
  pill: 999,
};

// ─── Shadows ───────────────────────────────────────────────────────────────────
export const shadows = {
  sm:   '0 0 0 0.5px rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.3)',
  md:   '0 0 0 0.5px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.4)',
  lg:   '0 0 0 0.5px rgba(255,255,255,0.06), 0 12px 48px rgba(0,0,0,0.55)',
  glow: '0 0 0 0.5px rgba(155,114,242,0.18), 0 8px 32px rgba(155,114,242,0.18)',
  cardSubtle: '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.25), 0 6px 20px rgba(155,114,242,0.04)',
};

// ─── Animation ─────────────────────────────────────────────────────────────────
export const easing = {
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  swift:  'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut:  'cubic-bezier(0.4, 0, 0.2, 1)',
};

export const duration = {
  fast:   '0.15s',
  base:   '0.25s',
  slow:   '0.4s',
  slower: '0.6s',
};

// ─── Font ──────────────────────────────────────────────────────────────────────
export const font = {
  size: {
    xs:   10,
    sm:   11,
    base: 13,
    md:   14,
    lg:   15,
    xl:   18,
    h2:   22,
    h1:   28,
    display: 32,
  },
  weight: {
    regular: 400,
    medium:  500,
    semibold: 600,
    bold:    700,
  },
  letterSpacing: {
    tight:  '-0.025em',
    snug:   '-0.01em',
    normal: '0',
    wide:   '0.08em',
    eyebrow: '0.12em',
  },
};

// ─── Z-index scale ─────────────────────────────────────────────────────────────
export const zIndex = {
  base:    0,
  raised:  1,
  sticky:  30,
  drawer:  90,
  modal:   100,
  toast:   200,
  command: 9999,
};

// Default export for convenience
export default { colors, spacing, radii, shadows, easing, duration, font, zIndex };
