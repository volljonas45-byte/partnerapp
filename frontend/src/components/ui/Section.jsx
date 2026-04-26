import { useTheme } from '../../context/ThemeContext';
import { spacing, font } from '../../designTokens';

/**
 * Page section with optional title + right action.
 *
 * Props:
 *  - title:    optional heading
 *  - action:   optional ReactNode rendered top-right (e.g. "Alle ›")
 *  - gap:      vertical spacing below title (default 12)
 *  - margin:   bottom margin (default 24)
 *  - children
 */
export default function Section({
  title, action, gap = 12, margin = 24, style, children,
}) {
  const { c } = useTheme();

  return (
    <section
      className="vec-fade-in-up"
      style={{ marginBottom: margin, ...style }}
    >
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: spacing.md, marginBottom: gap,
        }}>
          {title && (
            <h2 style={{
              margin: 0,
              fontSize: font.size.base,
              fontWeight: font.weight.semibold,
              letterSpacing: font.letterSpacing.snug,
              color: c.text,
            }}>
              {title}
            </h2>
          )}
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
