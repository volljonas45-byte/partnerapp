import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMobile } from '../hooks/useMobile';
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
  const isMobile = useMobile();
  const [searchParams] = useSearchParams();

  // 'form' | 'preview'
  const [step, setStep] = useState('form');

  const [projectId,  setProjectId]  = useState(searchParams.get('project_id') || null);
  const [clientId,   setClientId]   = useState(searchParams.get('client_id') || '');
  const [issueDate,  setIssueDate]  = useState(today());
  const [validUntil, setValidUntil] = useState(addDays(today(), 30));
  const [notes,      setNotes]      = useState('');
  const [items,      setItems]      = useState([
    { title: '', description: '', quantity: 1, unit_price: 0, tax_rate: 19, billing_cycle: 'once' },
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
    { title: '', description: '', quantity: 1, unit_price: 0, tax_rate: settings?.kleinunternehmer ? 0 : 19, billing_cycle: 'once' },
  ]);
  const removeItem = idx  => setItems(i => i.filter((_, j) => j !== idx));

  const CYCLES = ['once', 'yearly', 'monthly'];
  const CYCLE_LABEL = { once: 'Einmalig', yearly: 'Jährlich', monthly: 'Monatlich' };
  const CYCLE_STYLE = {
    once:    { background: '#F2F2F7', color: '#636366' },
    yearly:  { background: '#EBF4FF', color: '#0071E3' },
    monthly: { background: '#F3EEFF', color: '#7C3AED' },
  };
  const toggleCycle = (idx) => {
    const cur  = items[idx].billing_cycle || 'once';
    const next = CYCLES[(CYCLES.indexOf(cur) + 1) % CYCLES.length];
    updateItem(idx, 'billing_cycle', next);
  };
  const pv = v => parseFloat(String(v).replace(',', '.')) || 0;

  const updateItem = (idx, field, value) =>
    setItems(i => i.map((item, j) =>
      j !== idx ? item : {
        ...item,
        [field]: (field === 'title' || field === 'description' || field === 'billing_cycle' || field === 'unit_price' || field === 'quantity')
          ? value
          : parseFloat(value) || 0,
      }
    ));

  const subtotal = items.reduce((s, i) => s + pv(i.quantity) * pv(i.unit_price), 0);
  const taxTotal = items.reduce((s, i) => s + pv(i.quantity) * pv(i.unit_price) * (pv(i.tax_rate) / 100), 0);
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
      items: items.map(i => ({ ...i, quantity: pv(i.quantity), unit_price: pv(i.unit_price) })),
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

          {/* ── Positionen Desktop ── */}
          {!isMobile && (
            <>
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
                    <input className="input" placeholder="Leistungsbezeichnung *" value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)} required />
                    <input className="input text-xs text-gray-500" placeholder="Beschreibung (optional)" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-2 pt-0.5">
                    <input type="text" inputMode="numeric" className="input" placeholder="1" value={item.quantity === 0 ? '' : item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2 pt-0.5">
                    <div style={{ position: 'relative' }}>
                      <input type="text" inputMode="decimal" className="input" placeholder="0,00" style={{ paddingRight: '24px' }} value={item.unit_price === 0 ? '' : item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#8E8E93', pointerEvents: 'none' }}>€</span>
                    </div>
                  </div>
                  <div className="col-span-2 pt-0.5">
                    <select className="input" value={item.tax_rate} onChange={e => updateItem(idx, 'tax_rate', e.target.value)}>
                      {VAT_RATES.map(r => <option key={r} value={r}>{r} %</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex items-start gap-1 pt-1">
                    <select className="input" value={item.billing_cycle || 'once'} onChange={e => updateItem(idx, 'billing_cycle', e.target.value)}>
                      <option value="once">Einmalig</option>
                      <option value="yearly">Jährlich</option>
                      <option value="monthly">Monatlich</option>
                    </select>
                    {items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Positionen Mobile — gestackte Cards ── */}
          {isMobile && items.map((item, idx) => (
            <div key={idx} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '12px', background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Position {idx + 1}</span>
                {items.length > 1 && <button type="button" onClick={() => removeItem(idx)} style={{ padding: 4, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>}
              </div>
              <input className="input" placeholder="Leistungsbezeichnung *" value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)} required />
              <input className="input text-xs" placeholder="Beschreibung (optional)" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#86868B', fontWeight: 500, display: 'block', marginBottom: 3 }}>Menge</label>
                  <input type="text" inputMode="numeric" className="input" placeholder="1" value={item.quantity === 0 ? '' : item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#86868B', fontWeight: 500, display: 'block', marginBottom: 3 }}>Einzelpreis (€)</label>
                  <input type="text" inputMode="decimal" className="input" placeholder="0,00" value={item.unit_price === 0 ? '' : item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#86868B', fontWeight: 500, display: 'block', marginBottom: 3 }}>MwSt.</label>
                  <select className="input" value={item.tax_rate} onChange={e => updateItem(idx, 'tax_rate', e.target.value)}>
                    {VAT_RATES.map(r => <option key={r} value={r}>{r} %</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#86868B', fontWeight: 500, display: 'block', marginBottom: 3 }}>Abrechnung</label>
                  <select className="input" value={item.billing_cycle || 'once'} onChange={e => updateItem(idx, 'billing_cycle', e.target.value)}>
                    <option value="once">Einmalig</option>
                    <option value="yearly">Jährlich</option>
                    <option value="monthly">Monatlich</option>
                  </select>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>
                {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
          ))}

          {items.some(i => (i.billing_cycle || 'once') !== 'once') && (() => {
            const sums = {};
            items.forEach(i => {
              const c = i.billing_cycle || 'once';
              sums[c] = (sums[c] || 0) + (pv(i.quantity) * pv(i.unit_price));
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

        {/* ── Summen + Hinweise ── */}
        <div className={isMobile ? "flex flex-col gap-4" : "grid grid-cols-2 gap-6"}>
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
