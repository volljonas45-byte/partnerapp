import { useTheme } from '../../context/ThemeContext';
import { radii, font, easing, duration, shadows } from '../../designTokens';

/**
 * Unified button. Three variants: primary (lila gradient), secondary, ghost.
 *
 * Props:
 *  - variant: 'primary' | 'secondary' | 'ghost' | 'danger' (default 'primary')
 *  - size:    'sm' | 'md' | 'lg' (default 'md')
 *  - icon:    optional Lucide icon component (rendered before children)
 *  - iconRight: optional icon after children
 *  - disabled
 *  - children
 *  - ...rest passed to button
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const { c } = useTheme();

  const sizes = {
    sm: { padding: '6px 12px',  fontSize: font.size.sm,   gap: 5, iconSize: 12 },
    md: { padding: '8px 14px',  fontSize: font.size.base, gap: 6, iconSize: 14 },
    lg: { padding: '10px 18px', fontSize: font.size.md,   gap: 7, iconSize: 16 },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: c.primaryGradient,
      color: '#fff',
      border: 'none',
      boxShadow: '0 4px 16px rgba(155,114,242,0.32)',
      fontWeight: font.weight.semibold,
    },
    secondary: {
      background: c.cardSecondary,
      color: c.text,
      border: `0.5px solid ${c.borderSubtle}`,
      fontWeight: font.weight.medium,
    },
    ghost: {
      background: 'transparent',
      color: c.textSecondary,
      border: '0.5px solid transparent',
      fontWeight: font.weight.medium,
    },
    danger: {
      background: c.dangerLight,
      color: c.danger,
      border: `0.5px solid ${c.dangerLight}`,
      fontWeight: font.weight.semibold,
    },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        letterSpacing: font.letterSpacing.snug,
        borderRadius: radii.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        transition: `transform ${duration.fast} ${easing.smooth}, filter ${duration.fast} ${easing.smooth}, background ${duration.fast} ${easing.smooth}, border-color ${duration.fast} ${easing.smooth}`,
        ...v,
        ...style,
      }}
      onMouseEnter={disabled ? undefined : (e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        if (variant === 'primary') e.currentTarget.style.filter = 'brightness(1.08)';
        if (variant === 'secondary') e.currentTarget.style.background = c.cardHover;
        if (variant === 'ghost') e.currentTarget.style.background = c.cardHover;
      }}
      onMouseLeave={disabled ? undefined : (e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.filter = '';
        if (variant === 'secondary') e.currentTarget.style.background = c.cardSecondary;
        if (variant === 'ghost') e.currentTarget.style.background = 'transparent';
      }}
      onMouseDown={disabled ? undefined : (e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={disabled ? undefined : (e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      {...rest}
    >
      {Icon && <Icon size={s.iconSize} strokeWidth={2} />}
      {children}
      {IconRight && <IconRight size={s.iconSize} strokeWidth={2} />}
    </button>
  );
}
