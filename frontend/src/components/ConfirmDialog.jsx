import { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ConfirmDialog({
  open,
  title = 'Bist du sicher?',
  message,
  confirmLabel = 'Löschen',
  cancelLabel  = 'Abbrechen',
  danger       = true,
  onConfirm,
  onCancel,
}) {
  const { c, isDark } = useTheme();

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter')  onConfirm?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'absolute', inset: 0,
          background: c.overlayBg,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'backdropIn 0.15s cubic-bezier(0.22,1,0.36,1) both',
        }}
      />

      {/* Dialog */}
      <div
        className="animate-scale-in"
        style={{
          position: 'relative',
          width: '100%', maxWidth: 340,
          background: c.card,
          borderRadius: 14,
          border: `0.5px solid ${c.borderSubtle}`,
          boxShadow: isDark
            ? '0 24px 72px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)'
            : '0 24px 72px rgba(0,0,0,0.14), 0 8px 24px var(--color-border-subtle)',
        }}
      >
        {/* Close */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 26, height: 26, borderRadius: '50%',
            background: c.inputBg, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = c.inputBgHover}
          onMouseLeave={e => e.currentTarget.style.background = c.inputBg}
        >
          <X size={12} color={c.textSecondary} strokeWidth={2.5} />
        </button>

        {/* Content */}
        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: danger ? c.redLight : c.orangeLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            {danger
              ? <Trash2 size={18} color={c.red} />
              : <AlertTriangle size={18} color={c.orange} />
            }
          </div>

          <h3 style={{
            fontSize: 16, fontWeight: 600, color: c.text,
            margin: '0 0 6px', letterSpacing: '-0.016em',
          }}>{title}</h3>
          {message && (
            <p style={{
              fontSize: 14, color: c.textSecondary,
              lineHeight: 1.5, margin: 0, letterSpacing: '-0.006em',
            }}>{message}</p>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: '0 24px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={danger ? 'btn-danger' : 'btn-primary'}
            style={danger ? {
              background: c.red, color: '#fff',
              fontWeight: 500,
            } : {}}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
