import { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * In-app confirmation dialog — replaces browser confirm().
 *
 * Props:
 *   open          boolean
 *   title         string
 *   message       string
 *   confirmLabel  string  (default "Löschen")
 *   cancelLabel   string  (default "Abbrechen")
 *   danger        boolean (default true — red confirm button)
 *   onConfirm     () => void
 *   onCancel      () => void
 */
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
  // Close on Escape
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      {/* Dialog card */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 animate-fade-in">

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={15} />
        </button>

        {/* Icon + content */}
        <div className="px-6 pt-6 pb-5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
            danger ? 'bg-red-50' : 'bg-amber-50'
          }`}>
            {danger
              ? <Trash2 size={20} className="text-red-500" />
              : <AlertTriangle size={20} className="text-amber-500" />
            }
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
          {message && (
            <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={
              danger
                ? 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-150 active:scale-[0.98]'
                : 'btn-primary'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
