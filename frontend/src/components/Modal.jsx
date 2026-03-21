import { X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Generic modal dialog with overlay.
 * @param {boolean} open - Whether the modal is visible
 * @param {() => void} onClose - Close handler
 * @param {string} title - Modal title
 * @param {ReactNode} children
 */
export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
