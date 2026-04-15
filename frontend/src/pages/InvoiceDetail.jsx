import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMobile } from '../hooks/useMobile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download, CheckCircle, ArrowLeft, Trash2, Clock,
  Send, XCircle, FileText, Copy, AlertTriangle,
  Plus, Euro, Bell, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';
import { useTheme } from '../context/ThemeContext';
import { invoicesApi } from '../api/invoices';
import { settingsApi } from '../api/settings';
import { formatCurrency, formatDate, today } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import SendEmailModal from '../components/SendEmailModal';

const REMINDER_LEVELS = [
  { value: 1, label: '1. Mahnung (7 Tage)' },
  { value: 2, label: '2. Mahnung (14 Tage)' },
  { value: 3, label: '3. Mahnung (30 Tage)' },
];

const INVOICE_TYPE_LABELS = {
  standard: 'Rechnung',
  abschlag: 'Abschlagsrechnung',
  schluss:  'Schlussrechnung',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useMobile();
  const { c, isDark } = useTheme();

  const { confirm, ConfirmDialogNode } = useConfirm();

  // Modals
  const [paidModal,       setPaidModal]       = useState(false);
  const [stornoModal,     setStornoModal]      = useState(false);
  const [paymentModal,    setPaymentModal]     = useState(false);
  const [reminderModal,   setReminderModal]    = useState(false);
  const [emailModal,      setEmailModal]       = useState(false);

  // Form state
  const [paymentDate,     setPaymentDate]      = useState(today());
  const [sending,         setSending]          = useState(false);
  const [downloading,     setDownloading]      = useState(false);
  const [duplicating,     setDuplicating]      = useState(false);

  // Payment form
  const [payAmount,       setPayAmount]        = useState('');
  const [payDate,         setPayDate]          = useState(today());
  const [payNotes,        setPayNotes]         = useState('');

  // Reminder form
  const [reminderLevel,   setReminderLevel]    = useState(1);
  const [reminderDate,    setReminderDate]     = useState(today());
  const [reminderNotes,   setReminderNotes]    = useState('');

  // Collapsible sections
  const [showPayments,    setShowPayments]     = useState(true);
  const [showReminders,   setShowReminders]    = useState(false);
  const [showHistory,     setShowHistory]      = useState(false);
  const [showArchive,     setShowArchive]      = useState(false);

  // Hover states
  const [hoverBackBtn,    setHoverBackBtn]     = useState(false);
  const [hoverAddPay,     setHoverAddPay]      = useState(false);
  const [hoverAddRemind,  setHoverAddRemind]   = useState(false);
  const [hoverPayDelete,  setHoverPayDelete]   = useState(null);
  const [hoverRemDelete,  setHoverRemDelete]   = useState(null);
  const [hoverArchiveDl,  setHoverArchiveDl]   = useState(null);
  const [hoverTakeAmount, setHoverTakeAmount]  = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoicesApi.get(id).then(r => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['invoices', id, 'payments'],
    queryFn: () => invoicesApi.getPayments(id).then(r => r.data.payments),
    enabled: !!invoice,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['invoices', id, 'reminders'],
    queryFn: () => invoicesApi.getReminders(id).then(r => r.data),
    enabled: showReminders,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['invoices', id, 'history'],
    queryFn: () => invoicesApi.getHistory(id).then(r => r.data),
    enabled: showHistory,
  });

  const { data: archive = [] } = useQuery({
    queryKey: ['invoices', id, 'archive'],
    queryFn: () => invoicesApi.getArchive(id).then(r => r.data),
    enabled: showArchive,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['invoices', id] });
  };

  const statusMutation = useMutation({
    mutationFn: data => invoicesApi.updateStatus(id, data),
    onSuccess: () => { invalidate(); toast.success('Status aktualisiert'); setPaidModal(false); },
    onError:   err => toast.error(err.response?.data?.error || 'Aktualisierung fehlgeschlagen'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => invoicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Entwurf gelöscht');
      navigate('/invoices');
    },
    onError: err => toast.error(err.response?.data?.error || 'Löschen fehlgeschlagen'),
  });

  const addPaymentMutation = useMutation({
    mutationFn: data => invoicesApi.addPayment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id, 'payments'] });
      invalidate();
      setPaymentModal(false);
      setPayAmount(''); setPayNotes(''); setPayDate(today());
      toast.success('Zahlung erfasst');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Speichern'),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: pid => invoicesApi.deletePayment(id, pid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id, 'payments'] });
      invalidate();
      toast.success('Zahlung entfernt');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const addReminderMutation = useMutation({
    mutationFn: data => invoicesApi.addReminder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id, 'reminders'] });
      setReminderModal(false);
      setReminderNotes('');
      toast.success('Mahnung erfasst');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const deleteReminderMutation = useMutation({
    mutationFn: rid => invoicesApi.deleteReminder(id, rid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', id, 'reminders'] });
      toast.success('Mahnung entfernt');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await invoicesApi.downloadPDF(invoice.id, invoice.invoice_number);
      // Refresh archive list after download
      qc.invalidateQueries({ queryKey: ['invoices', id, 'archive'] });
    } catch {
      toast.error('PDF konnte nicht heruntergeladen werden');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = () => setEmailModal(true);

  const handleEmailSend = async ({ to, subject, message }) => {
    setSending(true);
    try {
      await invoicesApi.send(id, { to, subject, message });
      invalidate();
      setEmailModal(false);
      toast.success(`Rechnung gesendet an ${to}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Senden fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await invoicesApi.duplicate(id);
      const newInvoice = res.data;
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Rechnung ${newInvoice.invoice_number} als Duplikat erstellt`);
      navigate(`/invoices/${newInvoice.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Duplizieren fehlgeschlagen');
    } finally {
      setDuplicating(false);
    }
  };

  const handleStorno = async () => {
    try {
      const res = await invoicesApi.storno(id);
      const stornoInvoice = res.data.storno_invoice;
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoices', id] });
      setStornoModal(false);
      toast.success(`Stornorechnung ${stornoInvoice.invoice_number} erstellt`);
      navigate(`/invoices/${stornoInvoice.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Stornierung fehlgeschlagen');
    }
  };

  const handleMarkPaid      = () => statusMutation.mutate({ status: 'paid', payment_date: paymentDate });
  const handleMarkSent      = () => statusMutation.mutate({ status: 'sent' });
  const handleMarkCancelled = async () => {
    const ok = await confirm('Die Rechnung wird als storniert markiert.', { title: 'Rechnung stornieren' });
    if (!ok) return;
    statusMutation.mutate({ status: 'cancelled' });
  };
  const handleMarkDraft = async () => {
    const ok = await confirm('Die Rechnung wird zurück in den Entwurfsstatus gesetzt.', { title: 'Zu Entwurf setzen', danger: false, confirmLabel: 'Zurücksetzen' });
    if (!ok) return;
    statusMutation.mutate({ status: 'draft' });
  };
  const handleDelete = async () => {
    const ok = await confirm(`Entwurf ${invoice?.invoice_number} wird endgültig gelöscht.`, { title: 'Rechnung löschen' });
    if (!ok) return;
    deleteMutation.mutate();
  };

  if (isLoading) return <LoadingSpinner className="h-64" />;
  if (!invoice)  return <div className="p-8" style={{ color: c.textTertiary }}>Rechnung nicht gefunden.</div>;

  const isPaid      = invoice.status === 'paid';
  const isDraft     = invoice.status === 'draft';
  const isCancelled = invoice.status === 'cancelled';
  const isStorno    = !!invoice.storno_of_id;

  const paidAmount    = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding   = Math.max(0, invoice.total - paidAmount);
  const hasPartialPay = paidAmount > 0 && paidAmount < invoice.total;

  const invoiceTypeLabel = INVOICE_TYPE_LABELS[invoice.invoice_type] || 'Rechnung';

  return (
    <div className={isMobile ? "p-4 max-w-4xl" : "p-8 max-w-4xl"}>
      {/* Header */}
      <div className={isMobile ? "flex flex-col gap-4 mb-6" : "flex items-start justify-between mb-8"}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-lg"
            style={{
              color: hoverBackBtn ? c.textSecondary : c.textTertiary,
              background: hoverBackBtn ? c.cardSecondary : 'transparent',
              transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
            }}
            onMouseEnter={() => setHoverBackBtn(true)}
            onMouseLeave={() => setHoverBackBtn(false)}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold" style={{ color: c.text }}>{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} />
              {invoice.invoice_type && invoice.invoice_type !== 'standard' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                  {invoiceTypeLabel}
                </span>
              )}
              {invoice.reverse_charge === 1 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                  &sect;13b UStG
                </span>
              )}
              {isStorno && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-full border border-red-100">
                  Stornorechnung
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: c.textTertiary }}>{invoice.client_name}</p>
          </div>
        </div>

        <div className={isMobile ? "flex items-center gap-2 flex-wrap" : "flex items-center gap-2 flex-wrap justify-end"}>
          {isDraft && (
            <button onClick={handleMarkSent} disabled={statusMutation.isPending} className="btn-secondary">
              <FileText size={15} /> Als gesendet markieren
            </button>
          )}

          {(isDraft || invoice.status === 'sent') && invoice.client_email && (
            <button onClick={handleSendEmail} disabled={sending} className="btn-secondary">
              <Send size={15} /> {sending ? 'Wird gesendet...' : 'E-Mail senden'}
            </button>
          )}

          {!isPaid && !isCancelled && (
            <button onClick={() => setPaidModal(true)} className="btn-secondary">
              <CheckCircle size={15} /> Als bezahlt markieren
            </button>
          )}

          {isPaid && (
            <button onClick={handleMarkDraft} className="btn-secondary">
              <Clock size={15} /> Zu Entwurf zurücksetzen
            </button>
          )}

          <button onClick={handleDuplicate} disabled={duplicating} className="btn-secondary">
            <Copy size={15} /> {duplicating ? 'Wird dupliziert...' : 'Duplizieren'}
          </button>

          <button onClick={handleDownload} disabled={downloading} className="btn-primary">
            <Download size={15} /> {downloading ? 'Wird erstellt...' : 'PDF herunterladen'}
          </button>

          {/* Storno — only for non-draft, non-cancelled, non-storno invoices */}
          {!isDraft && !isCancelled && !isStorno && (
            <button onClick={() => setStornoModal(true)} className="btn-danger">
              <XCircle size={15} /> Stornieren
            </button>
          )}

          {/* Hard-delete only for drafts */}
          {isDraft && (
            <button onClick={handleDelete} className="btn-danger p-2" title="Entwurf löschen">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Storno origin notice */}
      {isStorno && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
          Dies ist eine Stornorechnung zu einer ursprünglichen Rechnung.
        </div>
      )}

      {/* Info grid */}
      <div className={isMobile ? "grid grid-cols-2 gap-3 mb-5" : "grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"}>
        {[
          { label: 'Rechnungsdatum',  value: formatDate(invoice.issue_date) },
          { label: 'Fälligkeitsdatum', value: formatDate(invoice.due_date) },
          { label: 'Zahlungsdatum',   value: invoice.payment_date ? formatDate(invoice.payment_date) : '\u2014' },
          { label: 'Gesamtbetrag',    value: formatCurrency(invoice.total) },
        ].map(({ label, value }) => (
          <div key={label} className="card py-4">
            <p className="text-xs mb-1" style={{ color: c.textTertiary }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: c.text }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Leistungsdatum / Zeitraum */}
      {(invoice.leistungsdatum || invoice.leistungszeitraum_von) && (
        <div className="card py-4 mb-6 max-w-sm">
          {invoice.leistungsdatum ? (
            <>
              <p className="text-xs mb-1" style={{ color: c.textTertiary }}>Leistungsdatum</p>
              <p className="text-sm font-semibold" style={{ color: c.text }}>{formatDate(invoice.leistungsdatum)}</p>
            </>
          ) : (
            <>
              <p className="text-xs mb-1" style={{ color: c.textTertiary }}>Leistungszeitraum</p>
              <p className="text-sm font-semibold" style={{ color: c.text }}>
                {formatDate(invoice.leistungszeitraum_von)} – {formatDate(invoice.leistungszeitraum_bis)}
              </p>
            </>
          )}
        </div>
      )}

      {/* Partial payment progress */}
      {hasPartialPay && (
        <div className="card mb-6 py-4">
          <p className="text-xs mb-2" style={{ color: c.textTertiary }}>Zahlungsfortschritt</p>
          <div className="w-full rounded-full h-2 mb-3" style={{ background: c.cardSecondary }}>
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{
                width: `${Math.min(100, (paidAmount / invoice.total) * 100)}%`,
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-600 font-medium">Bezahlt: {formatCurrency(paidAmount)}</span>
            <span className="text-amber-600 font-medium">Offen: {formatCurrency(outstanding)}</span>
          </div>
        </div>
      )}

      {/* Rechnungssteller / Empfänger */}
      <div className={isMobile ? "grid grid-cols-1 gap-4 mb-6" : "grid grid-cols-2 gap-6 mb-6"}>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: c.textTertiary }}>Rechnungsempfänger</p>
          <div className="space-y-0.5 text-sm" style={{ color: c.textSecondary }}>
            <p className="font-medium" style={{ color: c.text }}>{invoice.client_name}</p>
            {invoice.contact_person     && <p>{invoice.contact_person}</p>}
            {invoice.client_address     && <p>{invoice.client_address}</p>}
            {(invoice.client_postal_code || invoice.client_city) && (
              <p>{[invoice.client_postal_code, invoice.client_city].filter(Boolean).join(' ')}</p>
            )}
            {invoice.client_country     && <p>{invoice.client_country}</p>}
            {invoice.client_email       && <p style={{ color: c.textTertiary }}>{invoice.client_email}</p>}
            {invoice.client_vat_id      && (
              <p className="text-xs font-mono" style={{ color: c.textTertiary }}>USt-IdNr.: {invoice.client_vat_id}</p>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: c.textTertiary }}>Hinweise</p>
            <p className="text-sm whitespace-pre-line" style={{ color: c.textSecondary }}>{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Positionen */}
      <div className="card p-0 overflow-hidden mb-6" style={{ borderRadius: 12 }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: c.cardSecondary, borderBottom: `0.5px solid ${c.borderSubtle}` }}>
              <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: c.textTertiary }}>Leistung</th>
              <th className="px-6 py-3 text-right text-xs font-medium" style={{ color: c.textTertiary }}>Menge</th>
              <th className="px-6 py-3 text-right text-xs font-medium" style={{ color: c.textTertiary }}>Einzelpreis</th>
              <th className="px-6 py-3 text-right text-xs font-medium" style={{ color: c.textTertiary }}>MwSt. %</th>
              <th className="px-6 py-3 text-right text-xs font-medium" style={{ color: c.textTertiary }}>Betrag</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
                <td className="px-6 py-3">
                  <p className="font-medium" style={{ color: c.text }}>{item.title || item.description}</p>
                  {item.title && item.description && (
                    <p className="text-xs mt-0.5" style={{ color: c.textTertiary }}>{item.description}</p>
                  )}
                </td>
                <td className="px-6 py-3 text-right" style={{ color: c.textSecondary }}>{item.quantity}</td>
                <td className="px-6 py-3 text-right" style={{ color: c.textSecondary }}>{formatCurrency(item.unit_price)}</td>
                <td className="px-6 py-3 text-right" style={{ color: c.textTertiary }}>
                  {invoice.reverse_charge ? '\u2014' : `${item.tax_rate} %`}
                </td>
                <td className="px-6 py-3 text-right font-medium" style={{ color: c.text }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-4 flex justify-end" style={{ borderTop: `0.5px solid ${c.borderSubtle}` }}>
          <div className="w-60 space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: c.textTertiary }}>Nettobetrag</span>
              <span style={{ color: c.text }}>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: c.textTertiary }}>Umsatzsteuer</span>
              <span style={{ color: c.text }}>{invoice.reverse_charge ? '\u2014' : formatCurrency(invoice.tax_total)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: `0.5px solid ${c.borderSubtle}` }}>
              <span style={{ color: c.text }}>Gesamtbetrag</span>
              <span className="text-base" style={{ color: c.text }}>{formatCurrency(invoice.total)}</span>
            </div>
            {paidAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Bereits bezahlt</span>
                  <span>&minus; {formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: `0.5px solid ${c.borderSubtle}` }}>
                  <span style={{ color: c.text }}>Offen</span>
                  <span className={outstanding > 0 ? 'text-amber-600' : 'text-green-600'}>
                    {formatCurrency(outstanding)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* -- PAYMENTS -- */}
      <div className="card mb-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowPayments(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Euro size={16} style={{ color: c.textTertiary }} />
            <span className="text-sm font-semibold" style={{ color: c.textSecondary }}>Zahlungseingang erfassen</span>
            {payments.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.cardSecondary, color: c.textSecondary }}>
                {payments.length}
              </span>
            )}
          </div>
          {showPayments
            ? <ChevronUp size={16} style={{ color: c.textTertiary }} />
            : <ChevronDown size={16} style={{ color: c.textTertiary }} />
          }
        </button>

        {showPayments && (
          <div className="mt-4 space-y-3">
            {payments.length === 0 ? (
              <p className="text-sm" style={{ color: c.textTertiary }}>Noch keine Zahlungen erfasst.</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2" style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: c.text }}>{formatCurrency(p.amount)}</p>
                      <p className="text-xs" style={{ color: c.textTertiary }}>{formatDate(p.payment_date)}{p.notes ? ` \u00b7 ${p.notes}` : ''}</p>
                    </div>
                    <button
                      onClick={async () => { const ok = await confirm('Diese Zahlung wird entfernt.', { title: 'Zahlung entfernen' }); if (ok) deletePaymentMutation.mutate(p.id); }}
                      className="p-1"
                      style={{
                        color: hoverPayDelete === p.id ? c.red : c.textTertiary,
                        transition: 'color 0.15s cubic-bezier(0.22,1,0.36,1)',
                      }}
                      onMouseEnter={() => setHoverPayDelete(p.id)}
                      onMouseLeave={() => setHoverPayDelete(null)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isPaid && !isCancelled && (
              <button
                onClick={() => setPaymentModal(true)}
                className="flex items-center gap-2 text-sm mt-2"
                style={{
                  color: hoverAddPay ? c.text : c.textTertiary,
                  transition: 'color 0.15s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={() => setHoverAddPay(true)}
                onMouseLeave={() => setHoverAddPay(false)}
              >
                <Plus size={14} /> Zahlung hinzufügen
              </button>
            )}
          </div>
        )}
      </div>

      {/* -- REMINDERS -- */}
      <div className="card mb-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowReminders(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: c.textTertiary }} />
            <span className="text-sm font-semibold" style={{ color: c.textSecondary }}>Mahnungen</span>
            {reminders.length > 0 && (
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                {reminders.length}
              </span>
            )}
          </div>
          {showReminders
            ? <ChevronUp size={16} style={{ color: c.textTertiary }} />
            : <ChevronDown size={16} style={{ color: c.textTertiary }} />
          }
        </button>

        {showReminders && (
          <div className="mt-4 space-y-3">
            {reminders.length === 0 ? (
              <p className="text-sm" style={{ color: c.textTertiary }}>Noch keine Mahnungen erfasst.</p>
            ) : (
              <div className="space-y-2">
                {reminders.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2" style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: c.text }}>
                        {REMINDER_LEVELS.find(l => l.value === r.reminder_level)?.label || `Mahnung ${r.reminder_level}`}
                      </p>
                      <p className="text-xs" style={{ color: c.textTertiary }}>{formatDate(r.sent_at)}{r.notes ? ` \u00b7 ${r.notes}` : ''}</p>
                    </div>
                    <button
                      onClick={() => deleteReminderMutation.mutate(r.id)}
                      className="p-1"
                      style={{
                        color: hoverRemDelete === r.id ? c.red : c.textTertiary,
                        transition: 'color 0.15s cubic-bezier(0.22,1,0.36,1)',
                      }}
                      onMouseEnter={() => setHoverRemDelete(r.id)}
                      onMouseLeave={() => setHoverRemDelete(null)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isPaid && !isCancelled && (
              <button
                onClick={() => setReminderModal(true)}
                className="flex items-center gap-2 text-sm"
                style={{
                  color: hoverAddRemind ? c.text : c.textTertiary,
                  transition: 'color 0.15s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={() => setHoverAddRemind(true)}
                onMouseLeave={() => setHoverAddRemind(false)}
              >
                <Plus size={14} /> Mahnung erfassen
              </button>
            )}
          </div>
        )}
      </div>

      {/* -- DOCUMENT HISTORY -- */}
      <div className="card mb-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowHistory(v => !v)}
        >
          <div className="flex items-center gap-2">
            <History size={16} style={{ color: c.textTertiary }} />
            <span className="text-sm font-semibold" style={{ color: c.textSecondary }}>Dokumenthistorie</span>
          </div>
          {showHistory
            ? <ChevronUp size={16} style={{ color: c.textTertiary }} />
            : <ChevronDown size={16} style={{ color: c.textTertiary }} />
          }
        </button>

        {showHistory && (
          <div className="mt-4">
            {history.length === 0 ? (
              <p className="text-sm" style={{ color: c.textTertiary }}>Keine Änderungen protokolliert.</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center justify-between py-2" style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
                    <p className="text-sm" style={{ color: c.textSecondary }}>Version {h.version}</p>
                    <p className="text-xs" style={{ color: c.textTertiary }}>{new Date(h.changed_at).toLocaleString('de-DE')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* -- PDF ARCHIVE -- */}
      <div className="card mb-6">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowArchive(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Download size={16} style={{ color: c.textTertiary }} />
            <span className="text-sm font-semibold" style={{ color: c.textSecondary }}>PDF-Archiv</span>
            {archive.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.cardSecondary, color: c.textSecondary }}>
                {archive.length}
              </span>
            )}
          </div>
          {showArchive
            ? <ChevronUp size={16} style={{ color: c.textTertiary }} />
            : <ChevronDown size={16} style={{ color: c.textTertiary }} />
          }
        </button>

        {showArchive && (
          <div className="mt-4">
            {archive.length === 0 ? (
              <p className="text-sm" style={{ color: c.textTertiary }}>Noch keine PDFs archiviert. Lade ein PDF herunter, um es zu archivieren.</p>
            ) : (
              <div className="space-y-2">
                {archive.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2" style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: c.text }}>{a.document_number}</p>
                      <p className="text-xs" style={{ color: c.textTertiary }}>
                        {new Date(a.generated_at).toLocaleString('de-DE')} &middot; {Math.round(a.file_size / 1024)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => invoicesApi.downloadArchivedPDF(invoice.id, a.id, a.document_number)}
                      className="text-xs flex items-center gap-1"
                      style={{
                        color: hoverArchiveDl === a.id ? c.text : c.textTertiary,
                        transition: 'color 0.15s cubic-bezier(0.22,1,0.36,1)',
                      }}
                      onMouseEnter={() => setHoverArchiveDl(a.id)}
                      onMouseLeave={() => setHoverArchiveDl(null)}
                    >
                      <Download size={13} /> Herunterladen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* -- MODALS -- */}

      {/* Als bezahlt markieren */}
      <Modal open={paidModal} onClose={() => setPaidModal(false)} title="Als bezahlt markieren">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: c.textSecondary }}>
            Zahlungsdatum für Rechnung <strong>{invoice.invoice_number}</strong> erfassen.
          </p>
          <div>
            <label className="label">Zahlungsdatum</label>
            <input
              type="date" className="input"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPaidModal(false)} className="btn-secondary">Abbrechen</button>
            <button onClick={handleMarkPaid} disabled={statusMutation.isPending} className="btn-primary">
              <CheckCircle size={15} /> Zahlung bestätigen
            </button>
          </div>
        </div>
      </Modal>

      {/* Stornieren */}
      <Modal open={stornoModal} onClose={() => setStornoModal(false)} title="Rechnung stornieren">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700">
              Es wird eine neue Stornorechnung mit negativen Beträgen erstellt. Die ursprüngliche
              Rechnung <strong>{invoice.invoice_number}</strong> wird als storniert markiert.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setStornoModal(false)} className="btn-secondary">Abbrechen</button>
            <button onClick={handleStorno} className="btn-danger">
              <XCircle size={15} /> Stornorechnung erstellen
            </button>
          </div>
        </div>
      </Modal>

      {/* Zahlung erfassen */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Zahlung erfassen">
        <div className="space-y-4">
          <div>
            <label className="label">Betrag *</label>
            <input
              type="number" className="input" placeholder="0,00"
              min="0.01" step="0.01"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
            />
            {outstanding > 0 && (
              <button
                type="button"
                onClick={() => setPayAmount(outstanding.toFixed(2))}
                className="text-xs mt-1"
                style={{
                  color: hoverTakeAmount ? c.textSecondary : c.textTertiary,
                  transition: 'color 0.15s cubic-bezier(0.22,1,0.36,1)',
                }}
                onMouseEnter={() => setHoverTakeAmount(true)}
                onMouseLeave={() => setHoverTakeAmount(false)}
              >
                Offenen Betrag übernehmen ({formatCurrency(outstanding)})
              </button>
            )}
          </div>
          <div>
            <label className="label">Zahlungsdatum *</label>
            <input
              type="date" className="input"
              value={payDate}
              onChange={e => setPayDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Notiz</label>
            <input
              className="input" placeholder="z.B. Überweisung, Barzahlung..."
              value={payNotes}
              onChange={e => setPayNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPaymentModal(false)} className="btn-secondary">Abbrechen</button>
            <button
              onClick={() => addPaymentMutation.mutate({ amount: parseFloat(payAmount), payment_date: payDate, notes: payNotes })}
              disabled={!payAmount || addPaymentMutation.isPending}
              className="btn-primary"
            >
              <Plus size={15} /> Zahlung speichern
            </button>
          </div>
        </div>
      </Modal>

      {/* Mahnung erfassen */}
      <Modal open={reminderModal} onClose={() => setReminderModal(false)} title="Mahnung erfassen">
        <div className="space-y-4">
          <div>
            <label className="label">Mahnstufe *</label>
            <select
              className="input"
              value={reminderLevel}
              onChange={e => setReminderLevel(Number(e.target.value))}
            >
              {REMINDER_LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Datum der Mahnung *</label>
            <input
              type="date" className="input"
              value={reminderDate}
              onChange={e => setReminderDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Notiz</label>
            <input
              className="input" placeholder="z.B. per E-Mail versendet..."
              value={reminderNotes}
              onChange={e => setReminderNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setReminderModal(false)} className="btn-secondary">Abbrechen</button>
            <button
              onClick={() => addReminderMutation.mutate({ reminder_level: reminderLevel, sent_at: reminderDate, notes: reminderNotes })}
              disabled={addReminderMutation.isPending}
              className="btn-primary"
            >
              <Bell size={15} /> Mahnung speichern
            </button>
          </div>
        </div>
      </Modal>
      {ConfirmDialogNode}

      <SendEmailModal
        open={emailModal}
        onClose={() => setEmailModal(false)}
        onSend={handleEmailSend}
        sending={sending}
        type="invoice"
        doc={invoice}
        agencyName={settings?.company_name}
        fromAlias={settings?.email_alias}
      />
    </div>
  );
}
