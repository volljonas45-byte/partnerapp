import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  // Max-width mapping
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
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto',
        animation: 'backdropIn 0.2s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-modal-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: maxWidthPx,
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 24px 72px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.08)',
          flexShrink: 0,
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1D1D1F', margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6E6E73', padding: '2px', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = '#1D1D1F'}
            onMouseLeave={e => e.currentTarget.style.color = '#6E6E73'}
          >
            <X size={18} />
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
