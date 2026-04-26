import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, font } from '../../designTokens';

/**
 * Empty state — for "no data" sections.
 *
 * Props:
 *  - icon:    Lucide icon component
 *  - title:   bold heading
 *  - message: lighter description
 *  - action:  optional ReactNode (e.g. <Button> ... </Button>)
 */
export default function EmptyState({ icon: Icon, title, message, action }) {
  const { c } = useTheme();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: `${spacing['4xl']}px ${spacing['2xl']}px`,
      textAlign: 'center',
    }}>
      {Icon && (
        <div style={{
          width: 56, height: 56, borderRadius: radii.xl,
          background: c.primaryLight,
          border: `0.5px solid ${c.primaryMuted}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: spacing.lg,
        }}>
          <Icon size={22} color={c.primary} strokeWidth={1.6} />
        </div>
      )}
      {title && (
        <h3 style={{
          margin: 0,
          fontSize: font.size.md,
          fontWeight: font.weight.semibold,
          color: c.text,
          letterSpacing: font.letterSpacing.snug,
        }}>
          {title}
        </h3>
      )}
      {message && (
        <p style={{
          margin: `${spacing.xs}px 0 ${action ? spacing.lg : 0}`,
          fontSize: font.size.base,
          color: c.textSecondary,
          maxWidth: 320,
          lineHeight: 1.5,
        }}>
          {message}
        </p>
      )}
      {action}
    </div>
  );
}
