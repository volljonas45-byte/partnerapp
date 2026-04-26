import { Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { font, spacing, radii } from '../../designTokens';
import { openGlobalSearch } from '../GlobalSearch';

/**
 * Standard page header (Eyebrow + H1 + Subtitle + Search + RightSlot).
 *
 * Always includes a search trigger (⌘K) right before the rightSlot —
 * keeps search consistently accessible without conflicting with page CTAs.
 *
 * Props:
 *  - eyebrow:  optional uppercase label above the title (e.g. "FINANZEN")
 *  - title:    the H1 text
 *  - subtitle: optional smaller line below the title
 *  - rightSlot: ReactNode placed top-right (CTAs)
 *  - gradient: if true, the H1 gets the white-to-grey gradient text effect
 *  - hideSearch: opt-out of the inline search button
 */
export default function PageHeader({
  eyebrow, title, subtitle, rightSlot, gradient = true, hideSearch = false,
}) {
  const { c } = useTheme();

  return (
    <div
      className="vec-fade-in"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: spacing.lg,
        flexWrap: 'wrap',
        marginBottom: spacing['2xl'],
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {eyebrow && (
          <p style={{
            fontSize: font.size.sm,
            fontWeight: font.weight.bold,
            color: 'rgba(255,255,255,0.32)',
            textTransform: 'uppercase',
            letterSpacing: font.letterSpacing.eyebrow,
            margin: `0 0 ${spacing.xs}px`,
          }}>
            {eyebrow}
          </p>
        )}
        <h1 style={{
          margin: 0,
          fontSize: font.size.h1,
          fontWeight: font.weight.bold,
          letterSpacing: font.letterSpacing.tight,
          lineHeight: 1.15,
          ...(gradient ? {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.62) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          } : { color: c.text }),
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            margin: `${spacing.xs}px 0 0`,
            fontSize: font.size.base,
            color: c.textSecondary,
            letterSpacing: font.letterSpacing.snug,
          }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexShrink: 0 }}>
        {!hideSearch && (
          <button
            onClick={openGlobalSearch}
            title="Suchen (⌘K)"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 12px',
              background: c.inputBg,
              border: `0.5px solid ${c.borderSubtle}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              color: c.textSecondary,
              fontFamily: 'inherit',
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = c.inputBgHover; e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = c.inputBg; e.currentTarget.style.borderColor = c.borderSubtle; e.currentTarget.style.color = c.textSecondary; }}
          >
            <Search size={13} strokeWidth={1.8} />
            <span style={{ fontSize: font.size.base, fontWeight: font.weight.medium }}>Suchen</span>
            <kbd style={{
              padding: '2px 6px', borderRadius: 5,
              fontSize: font.size.xs, fontFamily: 'inherit',
              background: c.cardSecondary,
              border: `0.5px solid ${c.borderSubtle}`,
              color: c.textTertiary,
            }}>⌘K</kbd>
          </button>
        )}
        {rightSlot}
      </div>
    </div>
  );
}
