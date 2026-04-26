import { useTheme } from '../../context/ThemeContext';
import { radii, font } from '../../designTokens';

/**
 * Status / tag badge.
 *
 * Props:
 *  - color:    accent color (defaults to primary)
 *  - variant:  'soft' (color tint bg) | 'solid' (color bg, white text) | 'outline'
 *  - dot:      show small leading dot
 *  - children
 */
export default function Badge({ color, variant = 'soft', dot = false, style, children }) {
  const { c } = useTheme();
  const accent = color || c.primary;

  const variants = {
    soft: {
      background: `${accent}1A`,
      color: accent,
      border: `0.5px solid ${accent}33`,
    },
    solid: {
      background: accent,
      color: '#fff',
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: accent,
      border: `0.5px solid ${accent}55`,
    },
  };
  const v = variants[variant] || variants.soft;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '2px 9px',
      borderRadius: radii.xs,
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      letterSpacing: font.letterSpacing.snug,
      whiteSpace: 'nowrap',
      ...v,
      ...style,
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: variant === 'solid' ? '#fff' : accent,
        }} />
      )}
      {children}
    </span>
  );
}
