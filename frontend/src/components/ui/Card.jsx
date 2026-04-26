import { useTheme } from '../../context/ThemeContext';
import { radii, shadows, easing, duration } from '../../designTokens';

/**
 * Glass-morphism Card. Subtle lila tint via box-shadow.
 *
 * Props:
 *  - padding: number (default 18)
 *  - hover:   boolean — adds y-lift + glow on hover
 *  - onClick: makes it clickable (cursor + tap state)
 *  - glow:    boolean — permanent primary glow shadow
 *  - style:   merged into root style
 */
export default function Card({
  children, padding = 18, hover = false, onClick, glow = false, style, ...rest
}) {
  const { c } = useTheme();
  const clickable = !!onClick;

  return (
    <div
      onClick={onClick}
      style={{
        background:    c.card,
        border:        `0.5px solid ${c.borderSubtle}`,
        borderRadius:  radii.lg,
        padding,
        boxShadow:     glow ? shadows.glow : shadows.cardSubtle,
        cursor:        clickable ? 'pointer' : 'default',
        transition:    `transform ${duration.fast} ${easing.smooth}, box-shadow ${duration.fast} ${easing.smooth}, border-color ${duration.fast} ${easing.smooth}`,
        ...style,
      }}
      onMouseEnter={hover || clickable ? (e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = shadows.glow;
        e.currentTarget.style.borderColor = c.primaryLight;
      } : undefined}
      onMouseLeave={hover || clickable ? (e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = glow ? shadows.glow : shadows.cardSubtle;
        e.currentTarget.style.borderColor = c.borderSubtle;
      } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
