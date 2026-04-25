import { useTheme } from '../context/ThemeContext';

const DARK = {
  bg:    '#0D0D12',
  card:  '#16161E',
  card2: '#1C1C26',
  text:  '#F2F2F7',
  text2: '#C7C7CC',
  text3: '#8E8E93',
  border:'rgba(255,255,255,0.12)',
  borderSoft: 'rgba(255,255,255,0.06)',
  blue:  '#5B8CF5', blueL:  '#5B8CF514',
  green: '#34D399', greenL: '#34D39914',
  red:   '#FF453A', redL:   '#FF453A14',
  orange:'#FF9F0A', orangeL:'#FF9F0A14',
  purple:'#BF5AF2', purpleL:'#BF5AF214',
  pink:  '#FF6B9D', pinkL:  '#FF6B9D14',
  input: '#1C1C26',
  radius: 16,
  isDark: true,
};

const LIGHT = {
  bg:    '#F2F2F7',
  card:  '#FFFFFF',
  card2: '#F2F2F7',
  text:  '#1C1C1E',
  text2: '#636366',
  text3: '#AEAEB2',
  border:'rgba(0,0,0,0.07)',
  borderSoft: 'rgba(0,0,0,0.04)',
  blue:  '#007AFF', blueL:  '#007AFF14',
  green: '#34C759', greenL: '#34C75914',
  red:   '#FF3B30', redL:   '#FF3B3014',
  orange:'#FF9500', orangeL:'#FF950014',
  purple:'#AF52DE', purpleL:'#AF52DE14',
  pink:  '#FF2D92', pinkL:  '#FF2D9214',
  input: '#F2F2F7',
  radius: 16,
  isDark: false,
};

// Category tints for Intake / Partner inbox.
// Each category has: tint (solid), tintSoft (rgba ~10%), gradient, glow shadow color.
export const CATEGORY_TINTS = {
  webdesign: {
    label: 'Webdesign',
    tint: '#5B8CF5',
    tintSoft: 'rgba(91,140,245,0.10)',
    border: 'rgba(91,140,245,0.22)',
    gradient: 'linear-gradient(135deg,#4F8EF7 0%,#5B8CF5 100%)',
    glow: 'rgba(91,140,245,0.35)',
  },
  branding: {
    label: 'Branding',
    tint: '#BF5AF2',
    tintSoft: 'rgba(191,90,242,0.10)',
    border: 'rgba(191,90,242,0.22)',
    gradient: 'linear-gradient(135deg,#7C3AED 0%,#BF5AF2 100%)',
    glow: 'rgba(191,90,242,0.35)',
  },
  'social-media': {
    label: 'Social Media',
    tint: '#FF6B9D',
    tintSoft: 'rgba(255,107,157,0.10)',
    border: 'rgba(255,107,157,0.22)',
    gradient: 'linear-gradient(135deg,#FF6B9D 0%,#FF9F0A 100%)',
    glow: 'rgba(255,107,157,0.35)',
  },
  partner: {
    label: 'Partner',
    tint: '#34D399',
    tintSoft: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.22)',
    gradient: 'linear-gradient(135deg,#10B981 0%,#34D399 100%)',
    glow: 'rgba(52,211,153,0.35)',
  },
  default: {
    label: 'Anfrage',
    tint: '#8E8E93',
    tintSoft: 'rgba(142,142,147,0.10)',
    border: 'rgba(142,142,147,0.22)',
    gradient: 'linear-gradient(135deg,#5B8CF5 0%,#BF5AF2 100%)',
    glow: 'rgba(142,142,147,0.25)',
  },
};

export const ALL_CHIP_GRADIENT = 'linear-gradient(135deg,#5B8CF5 0%,#BF5AF2 100%)';
export const ALL_CHIP_GLOW = 'rgba(124,90,245,0.35)';

export function categoryFor(formType) {
  return CATEGORY_TINTS[formType] || CATEGORY_TINTS.default;
}

export function useD() {
  const { isDark } = useTheme();
  return isDark ? DARK : LIGHT;
}
