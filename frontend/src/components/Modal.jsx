import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const { c, isDark } = useTheme();

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const widthMap = {
    'max-w-sm':  '384px',
    'max-w-md':  '448px',
    'max-w-lg':  '512px',
    'max-w-xl':  '576px',
    'max-w-2xl': '672px',
  };
  const maxWidthPx = widthMap[maxWidth] || '512px';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: c.overlayBg,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflowY: 'auto',
        animation: 'backdropIn 0.2s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-modal-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: maxWidthPx,
          background: c.card,
          borderRadius: 14,
          border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'var(--color-border-subtle)'}`,
          boxShadow: isDark
            ? '0 24px 72px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)'
            : '0 24px 72px rgba(0,0,0,0.14), 0 8px 24px var(--color-border-subtle)',
          flexShrink: 0,
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px 14px',
          borderBottom: `0.5px solid ${c.borderSubtle}`,
        }}>
          <h3 style={{
            fontSize: 15, fontWeight: 600, color: c.text,
            margin: 0, letterSpacing: '-0.009em',
          }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: c.inputBg, border: 'none',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = c.inputBgHover}
            onMouseLeave={e => e.currentTarget.style.background = c.inputBg}
          >
            <X size={14} color={c.textSecondary} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
