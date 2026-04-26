import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { radii, font, easing, duration } from '../../designTokens';

/**
 * KPI / Stat Card for dashboards.
 *
 * Props:
 *  - icon:  Lucide icon component
 *  - label: small text below value
 *  - value: the big number (string or ReactNode)
 *  - sub:   optional 3rd line (e.g. "5 Rechnungen offen")
 *  - color: accent color for icon-box + value gradient (defaults to primary)
 *  - to:    if set, makes the card clickable (navigate)
 *  - index: optional, used for stagger animation delay
 */
export default function StatCard({
  icon: Icon, label, value, sub, color, to, index = 0,
}) {
  const { c } = useTheme();
  const navigate = useNavigate();
  const accent = color || c.primary;
  const clickable = !!to;

  const handleClick = clickable ? () => navigate(to) : undefined;

  return (
    <div
      onClick={handleClick}
      className="vec-fade-in-up"
      style={{
        background: c.card,
        border: `0.5px solid ${c.borderSubtle}`,
        borderRadius: radii.lg,
        padding: '14px 16px 14px',
        cursor: clickable ? 'pointer' : 'default',
        transition: `transform ${duration.fast} ${easing.smooth}, box-shadow ${duration.fast} ${easing.smooth}, border-color ${duration.fast} ${easing.smooth}`,
        boxShadow: '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2)',
        animationDelay: `${index * 70}ms`,
        animationFillMode: 'both',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={clickable ? (e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 0 0 0.5px ${accent}33, 0 8px 28px ${accent}1F`;
        e.currentTarget.style.borderColor = `${accent}55`;
      } : undefined}
      onMouseLeave={clickable ? (e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2)';
        e.currentTarget.style.borderColor = c.borderSubtle;
      } : undefined}
    >
      {/* Top row: icon + pulse dot */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: radii.md,
          background: `${accent}1A`,
          border: `0.5px solid ${accent}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Icon && <Icon size={15} color={accent} strokeWidth={1.8} />}
        </div>
        <span
          className="vec-pulse"
          style={{
            width: 6, height: 6, borderRadius: '50%', background: accent,
            marginTop: 4, opacity: 0.6,
            animationDelay: `${index * 450}ms`,
          }}
        />
      </div>

      {/* Value */}
      <div style={{
        fontSize: 26, fontWeight: font.weight.bold, lineHeight: 1.05,
        letterSpacing: font.letterSpacing.tight,
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}AA 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        marginBottom: 4,
      }}>
        {value}
      </div>

      {/* Label */}
      <div style={{ fontSize: font.size.sm, color: c.textSecondary, fontWeight: font.weight.medium }}>
        {label}
      </div>

      {/* Sub */}
      {sub && (
        <div style={{ fontSize: font.size.xs, color: c.textTertiary, marginTop: 3, letterSpacing: font.letterSpacing.snug }}>
          {sub}
        </div>
      )}
    </div>
  );
}
