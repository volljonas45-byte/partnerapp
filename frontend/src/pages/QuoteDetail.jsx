import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download, CheckCircle, ArrowLeft, Trash2, Send,
  XCircle, FileText, ArrowRightCircle, Clock, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { quotesApi } from '../api/quotes';
import { settingsApi } from '../api/settings';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';
import SendEmailModal from '../components/SendEmailModal';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { confirm, ConfirmDialogNode } = useConfirm();

  const [downloading, setDownloading] = useState(false);
  const [converting,  setConverting]  = useState(false);
  const [sending,     setSending]     = useState(false);
  const [emailModal,  setEmailModal]  = useState(false);

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quotes', id],
    queryFn: () => quotesApi.get(id).then(r => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['quotes'] });
    qc.invalidateQueries({ queryKey: ['quotes', id] });
  };

  const statusMutation = useMutation({
    mutationFn: status => quotesApi.updateStatus(id, { status }),
    onSuccess: () => { invalidate(); toast.success('Status aktualisiert'); },
    onError: err => toast.error(err.response?.data?.error || 'Aktualisierung fehlgeschlagen'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => quotesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Angebot gelöscht');
      navigate('/quotes');
    },
    onError: err => toast.error(err.response?.data?.error || 'Löschen fehlgeschlagen'),
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await quotesApi.downloadPDF(quote.id, quote.quote_number);
    } catch {
      toast.error('PDF konnte nicht heruntergeladen werden');
    } finally {
      setDownloading(false);
    }
  };

  const handleConvert = async () => {
    const ok = await confirm(`Angebot ${quote.quote_number} wird in eine Rechnung umgewandelt.`, { title: 'In Rechnung umwandeln', danger: false, confirmLabel: 'Umwandeln' });
    if (!ok) return;
    setConverting(true);
    try {
      const res = await quotesApi.convert(id);
      const invoice = res.data.invoice;
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Rechnung ${invoice.invoice_number} erstellt`);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Umwandlung fehlgeschlagen');
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm(`Angebot ${quote?.quote_number} wird endgültig gelöscht.`, { title: 'Angebot löschen' });
    if (!ok) return;
    deleteMutation.mutate();
  };

  const handleEmailSend = async ({ to, subject, message }) => {
    setSending(true);
    try {
      await quotesApi.send(id, { to, subject, message });
      invalidate();
      setEmailModal(false);
      toast.success(`Angebot gesendet an ${to}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Senden fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <LoadingSpinner className="h-64" />;
  if (!quote)    return <div className="p-8 text-gray-400">Angebot nicht gefunden.</div>;

  const isDraft     = quote.status === 'draft';
  const isSent      = quote.status === 'sent';
  const isConverted = quote.status === 'converted';

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotes')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{quote.quote_number}</h1>
              <StatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{quote.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isDraft && (
            <button
              onClick={() => statusMutation.mutate('sent')}
              disabled={statusMutation.isPending}
              className="btn-secondary"
            >
              <FileText size={15} /> Als gesendet markieren
            </button>
          )}

          {(isDraft || isSent) && quote.client_email && (
            <button onClick={() => setEmailModal(true)} disabled={sending} className="btn-secondary">
              <Send size={15} /> {sending ? 'Wird gesendet…' : 'E-Mail senden'}
            </button>
          )}

          {(isDraft || isSent) && (
            <button
              onClick={() => statusMutation.mutate('accepted')}
              disabled={statusMutation.isPending}
              className="btn-secondary"
            >
              <CheckCircle size={15} /> Akzeptiert
            </button>
          )}

          {(isDraft || isSent) && (
            <button
              onClick={() => statusMutation.mutate('rejected')}
              disabled={statusMutation.isPending}
              className="btn-secondary text-red-500 hover:text-red-600"
            >
              <XCircle size={15} /> Abgelehnt
            </button>
          )}

          {!isConverted && quote.status !== 'rejected' && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="btn-primary"
            >
              <ArrowRightCircle size={15} />
              {converting ? 'Wird umgewandelt…' : 'In Rechnung umwandeln'}
            </button>
          )}

          {!isConverted && (
            <button
              onClick={() => navigate(`/quotes/${id}/edit`)}
              className="btn-secondary"
            >
              <Pencil size={15} /> Bearbeiten
            </button>
          )}

          <button onClick={handleDownload} disabled={downloading} className="btn-secondary">
            <Download size={15} /> {downloading ? 'Wird erstellt…' : 'PDF'}
          </button>

          <button onClick={handleDelete} className="btn-danger p-2" title="Angebot löschen">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Info-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Angebotsdatum', value: formatDate(quote.issue_date) },
          { label: 'Gültig bis',    value: formatDate(quote.valid_until) },
          { label: 'Gesamtbetrag',  value: formatCurrency(quote.total)  },
          { label: 'Status',        value: <StatusBadge status={quote.status} /> },
        ].map(({ label, value }) => (
          <div key={label} className="card py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Absender / Empfänger */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Angebotsempfänger</p>
          <div className="space-y-0.5 text-sm text-gray-700">
            <p className="font-medium text-gray-900">{quote.client_name}</p>
            {quote.contact_person         && <p>{quote.contact_person}</p>}
            {quote.client_address         && <p>{quote.client_address}</p>}
            {(quote.client_postal_code || quote.client_city) && (
              <p>{[quote.client_postal_code, quote.client_city].filter(Boolean).join(' ')}</p>
            )}
            {quote.client_country         && <p>{quote.client_country}</p>}
            {quote.client_email           && <p className="text-gray-500">{quote.client_email}</p>}
            {quote.client_vat_id          && (
              <p className="text-gray-400 text-xs font-mono">USt-IdNr.: {quote.client_vat_id}</p>
            )}
          </div>
        </div>

        {quote.notes && (
          <div className="card">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Hinweise</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{quote.notes}</p>
          </div>
        )}
      </div>

      {/* Positionen */}
      <div className="card p-0 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Beschreibung</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">Menge</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">Einzelpreis</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">MwSt. %</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {quote.items?.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-50">
                <td className="px-6 py-3">
                  <p className="font-medium text-gray-900">{item.title || item.description}</p>
                  {item.title && item.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                  )}
                </td>
                <td className="px-6 py-3 text-right text-gray-600">{item.quantity}</td>
                <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                <td className="px-6 py-3 text-right text-gray-500">{item.tax_rate} %</td>
                <td className="px-6 py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <div className="w-60 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Nettobetrag</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Umsatzsteuer</span>
              <span>{formatCurrency(quote.tax_total)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
              <span>Gesamtbetrag</span>
              <span className="text-base">{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Umgewandelt-Hinweis */}
      {isConverted && (
        <div className="rounded-lg bg-purple-50 border border-purple-100 px-5 py-4 text-sm text-purple-700">
          <strong>Dieses Angebot wurde in eine Rechnung umgewandelt.</strong>{' '}
          <button
            onClick={() => navigate('/invoices')}
            className="underline hover:text-purple-900"
          >
            Zur Rechnungsübersicht
          </button>
        </div>
      )}
      {ConfirmDialogNode}

      <SendEmailModal
        open={emailModal}
        onClose={() => setEmailModal(false)}
        onSend={handleEmailSend}
        sending={sending}
        type="quote"
        doc={quote}
        agencyName={settings?.company_name}
      />
    </div>
  );
}
