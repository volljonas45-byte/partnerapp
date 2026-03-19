import { useState, useCallback, useRef } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Drop-in replacement for browser confirm().
 *
 * Usage:
 *   const { confirm, ConfirmDialogNode } = useConfirm();
 *
 *   // in handler:
 *   const ok = await confirm('Wirklich löschen?', { title: 'Eintrag löschen' });
 *   if (!ok) return;
 *   doDelete();
 *
 *   // in JSX (at the end of your return):
 *   {ConfirmDialogNode}
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    const {
      title        = 'Bist du sicher?',
      confirmLabel = 'Löschen',
      cancelLabel  = 'Abbrechen',
      danger       = true,
    } = options;

    return new Promise(resolve => {
      resolveRef.current = resolve;
      setState({ open: true, message, title, confirmLabel, cancelLabel, danger });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState(null);
  }, []);

  const ConfirmDialogNode = state ? (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmDialogNode };
}
