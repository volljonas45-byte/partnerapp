import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, Save, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotesApi } from '../api/quotes';
import { clientsApi } from '../api/clients';
import { settingsApi } from '../api/settings';
import { formatCurrency, today, addDays } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import DocumentPreview from '../components/DocumentPreview';
import ClientLegalWidget from '../components/ClientLegalWidget';

const VAT_RATES = [0, 7, 19];

export default function NewQuote() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();

  // 'form' | 'preview'
  const [step, setStep] = useState('form');

  const [projectId,  setProjectId]  = useState(searchParams.get('project_id') || null);
  const [clientId,   setClientId]   = useState(searchParams.get('client_id') || '');
  const [issueDate,  setIssueDate]  = useState(today());
  const [validUntil, setValidUntil] = useState(addDays(today(), 30));
  const [notes,      setNotes]      = useState('');
  const [items,      setItems]      = useState([
    { title: '', description: '', quantity: 1, unit_price: 0, tax_rate: 19 },
  ]);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
  });

  // Smart defaults when settings load
  useEffect(() => {
    if (!settings) return;
    const days       = settings.default_payment_days || 30;
    const defaultVat = settings.kleinunternehmer ? 0 : 19;
    setValidUntil(addDays(issueDate, days));
    setItems(prev => prev.map(item => ({ ...item, tax_rate: defaultVat })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const createMutation = useMutation({
    mutationFn: quotesApi.create,
    onSuccess: quote => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(`Angebot ${quote.quote_number} gespeichert`);
      navigate(`/quotes/${quote.id}`);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const addItem    = () => setItems(i => [
    ...i,
    { title: '', description: '', quantity: 1, unit_price: 0, tax_rate: settings?.kleinunternehmer ? 0 : 19 },
  ]);
  const removeItem = idx  => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx, field, value) =>
    setItems(i => i.map((item, j) =>
      j !== idx ? item : {
        ...item,
        [field]: (field === 'title' || field === 'description') ? value : parseFloat(value) || 0,
      }
    ));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxTotal = items.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_rate / 100), 0);
  const total    = subtotal + taxTotal;

  // Validate and move to preview step
  const handlePreview = e => {
    e.preventDefault();
    if (!clientId) { toast.error('Bitte einen Kunden auswählen'); return; }
    if (items.some(i => !i.title?.trim())) {
      toast.error('Alle Positionen benötigen einen Titel'); return;
    }
    setStep('preview');
    window.scrollTo({ top: 0 });
  };

  // Actually save the quote
  const handleSave = () => {
    createMutation.mutate({
      client_id:  parseInt(clientId),
      issue_date: issueDate,
      valid_until: validUntil,
      notes,
      items,
      project_id: projectId ? parseInt(projectId) : undefined,
    });
  };

  if (clientsLoading) return <LoadingSpinner className="h-64" />;

  const previewForm = { clientId, issueDate, validUntil, notes, items };

  // ── PREVIEW STEP ──────────────────────────────────────────────────────────────
  if (step === 'preview') {
    return (
      <div className="min-h-full bg-gray-100">

        {/* Sticky action bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-150 shadow-sm px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('form')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={15} />
              Bearbeiten
            </button>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-medium text-gray-700">Vorschau</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep('form')}
              className="btn-secondary"
            >
              <Pencil size={14} /> Bearbeiten
            </button>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              <Save size={14} />
              {createMutation.isPending ? 'Wird gespeichert…' : 'Als Entwurf speichern'}
            </button>
          </div>
        </div>

        {/* Centered document preview */}
        <div className="flex justify-center py-10 px-4">
          <DocumentPreview
            type="quote"
            form={previewForm}
            clients={clients}
            settings={settings || {}}
            scale={1}
          />
        </div>

      </div>
    );
  }

  // ── FORM STEP ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col items-center py-8 px-4">
    <div className="w-full max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/quotes')}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Neues Angebot</h1>
          <p className="text-sm text-gray-500 mt-0.5">Angebotsnummer wird automatisch vergeben — als Entwurf gespeichert</p>
        </div>
      </div>

      <form onSubmit={handlePreview} className="space-y-6">

        {/* ── Angebotsdetails ── */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Angebotsdetails</h2>

          <div>
            <label className="label">Kunde *</label>
            <select
              className="input"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              required
            >
              <option value="">Kunde auswählen…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Noch keine Kunden.{' '}
                <button type="button" onClick={() => navigate('/clients')} className="underline">
                  Zuerst einen Kunden anlegen.
                </button>
              </p>
            )}
            <ClientLegalWidget clientId={clientId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Angebotsdatum *</label>
              <input
                type="date" className="input" value={issueDate} required
                onChange={e => {
                  setIssueDate(e.target.value);
                  setValidUntil(addDays(e.target.value, settings?.default_payment_days || 30));
                }}
              />
            </div>
            <div>
              <label className="label">
                Gültig bis *
                {settings?.default_payment_days && (
                  <span className="ml-1 text-gray-400 font-normal">({settings.default_payment_days} Tage)</span>
                )}
              </label>
              <input
                type="date" className="input" value={validUntil} required
                onChange={e => setValidUntil(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Positionen ── */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>

          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide pb-1 border-b border-gray-100">
            <div className="col-span-5">Leistung</div>
            <div className="col-span-2">Menge</div>
            <div className="col-span-2">Einzelpreis</div>
            <div className="col-span-2">MwSt. %</div>
            <div className="col-span-1" />
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5 space-y-1">
                <input
                  className="input"
                  placeholder="Leistungsbezeichnung *"
                  value={item.title}
                  onChange={e => updateItem(idx, 'title', e.target.value)}
                  required
                />
                <input
                  className="input text-xs text-gray-500"
                  placeholder="Beschreibung (optional)"
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                />
              </div>
              <div className="col-span-2 pt-0.5">
                <input
                  type="number" className="input" placeholder="1"
                  min="0" step="0.01" value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                />
              </div>
              <div className="col-span-2 pt-0.5">
                <input
                  type="number" className="input" placeholder="0,00"
                  min="0" step="0.01" value={item.unit_price}
                  onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                />
              </div>
              <div className="col-span-2 pt-0.5">
                <select
                  className="input"
                  value={item.tax_rate}
                  onChange={e => updateItem(idx, 'tax_rate', e.target.value)}
                >
                  {VAT_RATES.map(r => <option key={r} value={r}>{r} %</option>)}
                </select>
              </div>
              <div className="col-span-1 flex justify-center pt-1.5">
                {items.length > 1 && (
                  <button
                    type="button" onClick={() => removeItem(idx)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button" onClick={addItem}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Plus size={15} /> Position hinzufügen
          </button>
        </div>

        {/* ── Summen + Hinweise ── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <label className="label">Hinweise</label>
            <textarea
              className="input resize-none" rows={4}
              placeholder="Anmerkungen, Konditionen…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="card space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Nettobetrag</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Umsatzsteuer</span>
              <span className="font-medium">{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-3">
              <span>Gesamtbetrag</span>
              <span className="text-lg">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/quotes')} className="btn-secondary">
            Abbrechen
          </button>
          <button type="submit" className="btn-primary">
            Vorschau & Speichern →
          </button>
        </div>

      </form>
    </div>
    </div>
  );
}
