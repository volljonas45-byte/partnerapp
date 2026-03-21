import { useState, useEffect } from 'react';
import { Send, Paperclip } from 'lucide-react';
import Modal from './Modal';

/**
 * Reusable "E-Mail senden" modal for invoices and quotes.
 *
 * Props:
 *   open            boolean
 *   onClose         () => void
 *   onSend          ({ to, subject, message }) => Promise<void>
 *   sending         boolean
 *   type            'invoice' | 'quote'
 *   doc             invoice or quote object (needs client_email, contact_person, client_name,
 *                   invoice_number|quote_number, total, due_date|valid_until)
 *   agencyName      string  (from settings, optional)
 *   fromAlias       string  (from settings.email_alias, optional)
 */
export default function SendEmailModal({ open, onClose, onSend, sending, type, doc, agencyName, fromAlias }) {
  const isInvoice = type === 'invoice';
  const docNumber = isInvoice ? doc?.invoice_number : doc?.quote_number;
  const greeting  = doc?.contact_person || doc?.client_name || '';

  const defaultSubject = isInvoice
    ? `Ihre Rechnung ${docNumber}${agencyName ? ` von ${agencyName}` : ''}`
    : `Ihr Angebot ${docNumber}${agencyName ? ` von ${agencyName}` : ''}`;

  function buildDefaultMessage() {
    const salutation = greeting ? `Sehr geehrte(r) ${greeting}` : 'Sehr geehrte Damen und Herren';
    if (isInvoice) {
      return `${salutation},\n\nanbei erhalten Sie Ihre Rechnung ${docNumber}.\n\nBei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\n${agencyName || ''}`.trim();
    }
    return `${salutation},\n\nvielen Dank für Ihr Interesse. Anbei finden Sie unser Angebot ${docNumber}.\n\nBei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\n${agencyName || ''}`.trim();
  }

  const [to,      setTo]      = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Re-initialize when doc changes or modal opens
  useEffect(() => {
    if (!open || !doc) return;
    setTo(doc.client_email || '');
    setSubject(defaultSubject);
    setMessage(buildDefaultMessage());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc?.id]);

  const handleSend = () => {
    if (!to.trim()) return;
    onSend({ to: to.trim(), subject: subject.trim(), message: message.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isInvoice ? 'Rechnung per E-Mail senden' : 'Angebot per E-Mail senden'}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Recipient */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Empfänger</label>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="kunde@example.com"
            className="input w-full"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Betreff</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="input w-full"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nachricht</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={8}
            className="input w-full resize-none font-mono text-sm leading-relaxed"
          />
        </div>

        {/* Von-Adresse */}
        {fromAlias && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500">
            <span className="font-medium text-gray-400 shrink-0">Von:</span>
            <span>{fromAlias}</span>
          </div>
        )}

        {/* PDF attachment note */}
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <Paperclip size={14} className="shrink-0" />
          <span>
            <strong>{docNumber}.pdf</strong> wird automatisch angehängt
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary" disabled={sending}>
            Abbrechen
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="btn-primary"
          >
            <Send size={15} />
            {sending ? 'Wird gesendet…' : 'Senden'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
