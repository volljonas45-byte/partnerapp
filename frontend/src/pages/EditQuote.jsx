import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotesApi } from '../api/quotes';
import { clientsApi } from '../api/clients';
import { formatCurrency } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import ClientLegalWidget from '../components/ClientLegalWidget';

const EMPTY_ITEM = { title: '', description: '', quantity: 1, unit_price: 0, tax_rate: 19, billing_cycle: 'once' };

const CYCLES = ['once', 'yearly', 'monthly'];
const CYCLE_LABEL = { once: 'Einmalig', yearly: 'Jährlich', monthly: 'Monatlich' };
const CYCLE_STYLE = {
  once:    { background: '#F2F2F7', color: '#636366' },
  yearly:  { background: '#EBF4FF', color: '#0071E3' },
  monthly: { background: '#F3EEFF', color: '#7C3AED' },
};
const VAT_RATES  = [0, 7, 19];

export default function EditQuote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [clientId,   setClientId]   = useState('');
  const [issueDate,  setIssueDate]  = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes,      setNotes]      = useState('');
  const [items,      setItems]      = useState([{ ...EMPTY_ITEM }]);
  const [ready,      setReady]      = useState(false);

  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ['quotes', id],
    queryFn:  () => quotesApi.get(id).then(r => r.data),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => clientsApi.list().then(r => r.data),
  });

  // Pre-fill form once quote data is loaded
  useEffect(() => {
    if (quote && !ready) {
      setClientId(String(quote.client_id || ''));
      setIssueDate(quote.issue_date  || '');
      setValidUntil(quote.valid_until || '');
      setNotes(quote.notes           || '');
      setItems(
        quote.items?.length
          ? quote.items.map(i => ({
              title:         i.title         || '',
              description:   i.description   || '',
              quantity:      i.quantity,
              unit_price:    i.unit_price,
              tax_rate:      i.tax_rate,
              billing_cycle: i.billing_cycle || 'once',
            }))
          : [{ ...EMPTY_ITEM }]
      );
      setReady(true);
    }
  }, [quote, ready]);

  const updateMutation = useMutation({
    mutationFn: data => quotesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['quotes', id] });
      toast.success('Angebot aktualisiert');
      navigate(`/quotes/${id}`);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Aktualisieren'),
  });

  const addItem    = () => setItems(i => [...i, { ...EMPTY_ITEM }]);
  const removeItem = idx => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx, field, value) =>
    setItems(i => i.map((item, j) =>
      j !== idx ? item : {
        ...item,
        [field]: (field === 'title' || field === 'description' || field === 'billing_cycle') ? value : parseFloat(value) || 0,
      }
    ));
  const toggleCycle = (idx) => {
    const cur  = items[idx].billing_cycle || 'once';
    const next = CYCLES[(CYCLES.indexOf(cur) + 1) % CYCLES.length];
    updateItem(idx, 'billing_cycle', next);
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxTotal = items.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_rate / 100), 0);
  const total    = subtotal + taxTotal;

  const handleSubmit = e => {
    e.preventDefault();
    if (!clientId) { toast.error('Bitte einen Kunden auswählen'); return; }
    if (items.some(i => !i.title?.trim())) {
      toast.error('Alle Positionen benötigen einen Titel'); return;
    }
    updateMutation.mutate({
      client_id:   parseInt(clientId),
      issue_date:  issueDate,
      valid_until: validUntil,
      notes,
      items,
    });
  };

  if (quoteLoading || clientsLoading) return <LoadingSpinner className="h-64" />;
  if (!quote) return <div className="p-8 text-gray-400">Angebot nicht gefunden.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(`/quotes/${id}`)}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Angebot bearbeiten
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{quote.quote_number}</p>
        </div>
      </div>

      {quote.status !== 'draft' && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
          Dieses Angebot hat den Status <strong>{quote.status}</strong>. Änderungen werden trotzdem gespeichert.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Angebotsdetails */}
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
            <ClientLegalWidget clientId={clientId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Angebotsdatum *</label>
              <input
                type="date" className="input" value={issueDate} required
                onChange={e => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Gültig bis *</label>
              <input
                type="date" className="input" value={validUntil} required
                onChange={e => setValidUntil(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Positionen */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Positionen</h2>

          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide pb-1 border-b border-gray-100">
            <div className="col-span-4">Leistung</div>
            <div className="col-span-2">Menge</div>
            <div className="col-span-2">Einzelpreis</div>
            <div className="col-span-2">MwSt. %</div>
            <div className="col-span-2" />
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-4 space-y-1">
                <input
                  className="input" placeholder="Leistungsbezeichnung *"
                  value={item.title}
                  onChange={e => updateItem(idx, 'title', e.target.value)}
                  required
                />
                <input
                  className="input text-xs text-gray-500" placeholder="Beschreibung (optional)"
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                />
              </div>
              <div className="col-span-2 pt-0.5">
                <input
                  type="text" inputMode="numeric" className="input" placeholder="1"
                  value={item.quantity === 0 ? '' : item.quantity}
                  onChange={e => {
                    const v = e.target.value.replace(',', '.');
                    updateItem(idx, 'quantity', v === '' ? 0 : parseFloat(v) || 0);
                  }}
                  onBlur={e => { if (e.target.value === '') updateItem(idx, 'quantity', 0); }}
                />
              </div>
              <div className="col-span-2 pt-0.5">
                <input
                  type="text" inputMode="decimal" className="input" placeholder="0,00"
                  value={item.unit_price === 0 ? '' : item.unit_price}
                  onChange={e => {
                    const v = e.target.value.replace(',', '.');
                    updateItem(idx, 'unit_price', v === '' ? 0 : parseFloat(v) || 0);
                  }}
                  onBlur={e => { if (e.target.value === '') updateItem(idx, 'unit_price', 0); }}
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
              <div className="col-span-2 flex items-start gap-1 pt-1">
                <select
                  className="input"
                  value={item.billing_cycle || 'once'}
                  onChange={e => updateItem(idx, 'billing_cycle', e.target.value)}
                >
                  <option value="once">Einmalig</option>
                  <option value="yearly">Jährlich</option>
                  <option value="monthly">Monatlich</option>
                </select>
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

          {items.some(i => (i.billing_cycle || 'once') !== 'once') && (() => {
            const sums = {};
            items.forEach(i => {
              const c = i.billing_cycle || 'once';
              sums[c] = (sums[c] || 0) + (Number(i.quantity) * Number(i.unit_price));
            });
            return (
              <div style={{ background: '#F0F6FF', border: '1px solid #C5DCFF', borderRadius: '10px', padding: '12px 16px', marginTop: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#0071E3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kostenüberblick</p>
                {['once','yearly','monthly'].filter(c => sums[c]).map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '3px' }}>
                    <span style={{ color: '#636366' }}>{CYCLE_LABEL[c]}</span>
                    <span style={{ fontWeight: 600, color: '#1D1D1F' }}>
                      {sums[c].toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          <button
            type="button" onClick={addItem}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Plus size={15} /> Position hinzufügen
          </button>
        </div>

        {/* Summen + Hinweise */}
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

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/quotes/${id}`)}
            className="btn-secondary"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn-primary"
          >
            {updateMutation.isPending ? 'Wird gespeichert…' : 'Änderungen speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
