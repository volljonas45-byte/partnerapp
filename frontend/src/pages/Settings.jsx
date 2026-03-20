import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Save, Plus, Trash2, Pencil, Check, Building2, FileText, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsApi } from '../api/settings';
import { serviceTemplatesApi } from '../api/serviceTemplates';
import { formatCurrency } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

const LEGAL_FORMS = [
  'Einzelunternehmen', 'Freiberufler', 'GbR',
  'UG (haftungsbeschränkt)', 'GmbH', 'AG', 'Sonstige',
];

const EMPTY_FORM = {
  company_name: '', address: '', city: '', postal_code: '', country: 'Deutschland',
  email: '', phone: '', vat_id: '', steuernummer: '',
  legal_form: 'Einzelunternehmen',
  geschaeftsfuehrer: '', handelsregister: '', registergericht: '',
  kleinunternehmer: false,
  bank_name: '', iban: '', bic: '',
  invoice_prefix: 'RE', quote_prefix: 'AN',
  primary_color: '#111827',
  footer_text: 'Vielen Dank für Ihr Vertrauen.',
  default_payment_days: 30,
};

const EMPTY_TMPL = { name: '', description: '', unit: 'Stunde', unit_price: '', tax_rate: '19' };

const TABS = [
  { id: 'company',   label: 'Unternehmen',        icon: Building2 },
  { id: 'documents', label: 'Rechnungen & Angebote', icon: FileText  },
  { id: 'templates', label: 'Leistungsvorlagen',   icon: Layers     },
];

// ── ServiceTemplates ───────────────────────────────────────────────────────────
function ServiceTemplates() {
  const qc = useQueryClient();
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_TMPL);
  const [editForm, setEditForm] = useState(EMPTY_TMPL);

  const { data: templates = [] } = useQuery({
    queryKey: ['service-templates'],
    queryFn: () => serviceTemplatesApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: serviceTemplatesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-templates'] }); toast.success('Vorlage erstellt'); setAdding(false); setForm(EMPTY_TMPL); },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => serviceTemplatesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-templates'] }); toast.success('Vorlage aktualisiert'); setEditing(null); },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const deleteMutation = useMutation({
    mutationFn: serviceTemplatesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-templates'] }); toast.success('Vorlage gelöscht'); },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  function startEdit(tmpl) {
    setEditing(tmpl.id);
    setEditForm({ name: tmpl.name, description: tmpl.description || '', unit: tmpl.unit, unit_price: tmpl.unit_price, tax_rate: tmpl.tax_rate });
  }

  function setF(k, v)  { setForm(f => ({ ...f, [k]: v })); }
  function setEF(k, v) { setEditForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Leistungsvorlagen</h2>
          <p className="text-xs text-gray-400 mt-0.5">Wiederverwendbare Positionen für Rechnungen & Angebote</p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn-primary text-xs">
            <Plus size={13} /> Vorlage erstellen
          </button>
        )}
      </div>

      {adding && (
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input autoFocus className="input" placeholder="z.B. Stundensatz Design" value={form.name} onChange={e => setF('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Beschreibung</label>
              <input className="input" placeholder="Optional" value={form.description} onChange={e => setF('description', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Einheit</label>
              <input className="input" placeholder="Stunde" value={form.unit} onChange={e => setF('unit', e.target.value)} />
            </div>
            <div>
              <label className="label">Preis (€)</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="0.00" value={form.unit_price} onChange={e => setF('unit_price', e.target.value)} />
            </div>
            <div>
              <label className="label">MwSt (%)</label>
              <input type="number" min="0" max="100" className="input" placeholder="19" value={form.tax_rate} onChange={e => setF('tax_rate', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY_TMPL); }} className="btn-secondary">Abbrechen</button>
            <button type="button" disabled={!form.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: form.name.trim(), description: form.description, unit: form.unit || 'Stunde', unit_price: parseFloat(form.unit_price) || 0, tax_rate: parseFloat(form.tax_rate) || 19 })}
              className="btn-primary">
              {createMutation.isPending ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-gray-50">
        {templates.length === 0 && !adding ? (
          <p className="text-sm text-gray-400 text-center py-8">Noch keine Vorlagen. Erstelle deine erste Leistungsvorlage.</p>
        ) : (
          templates.map(tmpl => (
            <div key={tmpl.id} className="py-3 first:pt-0 last:pb-0">
              {editing === tmpl.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input autoFocus className="input text-sm" value={editForm.name} onChange={e => setEF('name', e.target.value)} />
                    <input className="input text-sm" placeholder="Beschreibung" value={editForm.description} onChange={e => setEF('description', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input className="input text-sm" value={editForm.unit} onChange={e => setEF('unit', e.target.value)} />
                    <input type="number" min="0" step="0.01" className="input text-sm" value={editForm.unit_price} onChange={e => setEF('unit_price', e.target.value)} />
                    <input type="number" min="0" max="100" className="input text-sm" value={editForm.tax_rate} onChange={e => setEF('tax_rate', e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(null)} className="btn-secondary text-xs">Abbrechen</button>
                    <button type="button" disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: tmpl.id, data: { name: editForm.name.trim(), description: editForm.description, unit: editForm.unit, unit_price: parseFloat(editForm.unit_price) || 0, tax_rate: parseFloat(editForm.tax_rate) || 0 } })}
                      className="btn-primary text-xs"><Check size={12} /> Speichern</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{tmpl.name}</p>
                    {tmpl.description && <p className="text-xs text-gray-400 truncate">{tmpl.description}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{tmpl.unit}</span>
                  <span className="text-xs font-medium text-gray-700 shrink-0">{formatCurrency(tmpl.unit_price)}</span>
                  <span className="text-xs text-gray-400 shrink-0">{tmpl.tax_rate}% MwSt</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => startEdit(tmpl)} className="p-1 text-gray-400 hover:text-gray-700 rounded"><Pencil size={13} /></button>
                    <button type="button" onClick={() => deleteMutation.mutate(tmpl.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const qc      = useQueryClient();
  const fileRef = useRef();
  const [activeTab, setActiveTab] = useState('company');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
  });

  const [form, setForm]               = useState(EMPTY_FORM);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    if (settings) {
      setForm({
        company_name:         settings.company_name         || '',
        address:              settings.address              || '',
        city:                 settings.city                 || '',
        postal_code:          settings.postal_code          || '',
        country:              settings.country              || 'Deutschland',
        email:                settings.email                || '',
        phone:                settings.phone                || '',
        vat_id:               settings.vat_id               || '',
        steuernummer:         settings.steuernummer         || '',
        legal_form:           settings.legal_form           || 'Einzelunternehmen',
        geschaeftsfuehrer:    settings.geschaeftsfuehrer    || '',
        handelsregister:      settings.handelsregister      || '',
        registergericht:      settings.registergericht      || '',
        kleinunternehmer:     !!settings.kleinunternehmer,
        bank_name:            settings.bank_name            || '',
        iban:                 settings.iban                 || '',
        bic:                  settings.bic                  || '',
        invoice_prefix:       settings.invoice_prefix       || 'RE',
        quote_prefix:         settings.quote_prefix         || 'AN',
        primary_color:        settings.primary_color        || '#111827',
        footer_text:          settings.footer_text          || 'Vielen Dank für Ihr Vertrauen.',
        default_payment_days: settings.default_payment_days ?? 30,
      });
      setLogoPreview(settings.logo_base64 || null);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Einstellungen gespeichert'); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const logoMutation = useMutation({
    mutationFn: settingsApi.uploadLogo,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Logo hochgeladen'); },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Hochladen'),
  });

  const deleteLogoMutation = useMutation({
    mutationFn: settingsApi.deleteLogo,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); setLogoPreview(null); toast.success('Logo entfernt'); },
  });

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const handleSave = e => { e.preventDefault(); updateMutation.mutate(form); };

  const handleLogoChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Bitte eine Bilddatei wählen'); return; }
    if (file.size > 2_000_000)           { toast.error('Logo muss kleiner als 2 MB sein'); return; }
    const reader = new FileReader();
    reader.onload = ev => { const b64 = ev.target.result; setLogoPreview(b64); logoMutation.mutate(b64); };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <LoadingSpinner className="h-64" />;

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" placeholder={placeholder} value={form[key] || ''} onChange={e => setField(key, e.target.value)} />
    </div>
  );

  const needsHandelsregister = ['GmbH', 'UG (haftungsbeschränkt)', 'AG'].includes(form.legal_form);
  const year = new Date().getFullYear();

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F5F5F7' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 32px 64px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.03em', margin: 0 }}>Einstellungen</h1>
          <p style={{ fontSize: '13px', color: '#86868B', margin: '3px 0 0', letterSpacing: '-0.01em' }}>Verwalte deine Unternehmens- und Dokumenteinstellungen</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '600' : '500',
                  background: active ? '#fff' : 'transparent', color: active ? '#1D1D1F' : '#86868B',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', letterSpacing: '-0.01em' }}>
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Unternehmen ── */}
        {activeTab === 'company' && (
          <form onSubmit={handleSave} className="space-y-5">

            {/* Logo */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Logo</h2>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo" className="h-16 w-auto object-contain border border-gray-100 rounded-lg p-1 bg-white" />
                    <button type="button" onClick={() => deleteLogoMutation.mutate()}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">Kein Logo</div>
                )}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-xs">
                    <Upload size={13} /> Logo hochladen
                  </button>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG · max. 2 MB</p>
                </div>
              </div>
            </div>

            {/* Unternehmensinfo */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Unternehmensinfo</h2>
              {field('company_name', 'Unternehmensname *', 'text', 'Muster GmbH')}
              <div>
                <label className="label">Rechtsform</label>
                <select className="input" value={form.legal_form} onChange={e => setField('legal_form', e.target.value)}>
                  {LEGAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {needsHandelsregister && (
                <div className="grid grid-cols-2 gap-3">
                  {field('geschaeftsfuehrer', 'Geschäftsführer', 'text', 'Max Mustermann')}
                  {field('handelsregister', 'Handelsregister-Nr.', 'text', 'HRB 12345')}
                </div>
              )}
              {needsHandelsregister && field('registergericht', 'Registergericht', 'text', 'Amtsgericht Berlin')}
              {field('address', 'Straße & Hausnummer', 'text', 'Musterstraße 1')}
              <div className="grid grid-cols-3 gap-3">
                {field('postal_code', 'PLZ', 'text', '10115')}
                {field('city', 'Stadt', 'text', 'Berlin')}
                {field('country', 'Land', 'text', 'Deutschland')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('email', 'E-Mail', 'email', 'kontakt@muster.de')}
                {field('phone', 'Telefon', 'tel', '+49 30 12345678')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('vat_id', 'USt-IdNr.', 'text', 'DE123456789')}
                {field('steuernummer', 'Steuernummer', 'text', '12/345/67890')}
              </div>
            </div>

            {/* Bankdaten */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Bankdaten</h2>
              {field('bank_name', 'Bank', 'text', 'Deutsche Bank')}
              {field('iban', 'IBAN', 'text', 'DE89 3704 0044 0532 0130 00')}
              {field('bic', 'BIC', 'text', 'DEUTDEDB')}
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                <Save size={15} /> {updateMutation.isPending ? 'Wird gespeichert…' : 'Einstellungen speichern'}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: Rechnungen & Angebote ── */}

        {activeTab === 'documents' && (
          <form onSubmit={handleSave} className="space-y-5">

            {/* Nummerierung */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Nummerierung</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Rechnungs-Präfix</label>
                  <input type="text" className="input" placeholder="RE" maxLength={10}
                    value={form.invoice_prefix || 'RE'} onChange={e => setField('invoice_prefix', e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Beispiel: {form.invoice_prefix || 'RE'}-{year}-0001</p>
                </div>
                <div>
                  <label className="label">Angebots-Präfix</label>
                  <input type="text" className="input" placeholder="AN" maxLength={10}
                    value={form.quote_prefix || 'AN'} onChange={e => setField('quote_prefix', e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Beispiel: {form.quote_prefix || 'AN'}-{year}-0001</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Standard-Zahlungsziel (Tage)</label>
                  <input type="number" className="input" placeholder="30" min={1} max={365}
                    value={form.default_payment_days ?? 30} onChange={e => setField('default_payment_days', parseInt(e.target.value) || 30)} />
                  <p className="text-xs text-gray-400 mt-1">Wird bei neuen Rechnungen vorausgefüllt</p>
                </div>
              </div>
            </div>

            {/* Kleinunternehmer */}
            <div className="card">
              <div className="flex items-start gap-3">
                <input id="kleinunternehmer" type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  checked={!!form.kleinunternehmer} onChange={e => setField('kleinunternehmer', e.target.checked)} />
                <div>
                  <label htmlFor="kleinunternehmer" className="text-sm font-medium text-gray-900 cursor-pointer">Kleinunternehmerregelung (§ 19 UStG)</label>
                  <p className="text-xs text-gray-500 mt-0.5">Es wird keine Umsatzsteuer ausgewiesen. Auf Dokumenten erscheint: „Gemäß §19 UStG wird keine Umsatzsteuer berechnet."</p>
                </div>
              </div>
            </div>

            {/* Design */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Design & Branding</h2>
              <div>
                <label className="label">Primärfarbe</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-9 w-14 cursor-pointer rounded border border-gray-200"
                    value={form.primary_color || '#111827'} onChange={e => setField('primary_color', e.target.value)} />
                  <input type="text" className="input flex-1" placeholder="#111827"
                    value={form.primary_color || '#111827'} onChange={e => setField('primary_color', e.target.value)} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Wird als Akzentfarbe auf Rechnungen und Angeboten verwendet</p>
              </div>
              <div>
                <label className="label">Fußzeilentext</label>
                <input type="text" className="input" placeholder="Vielen Dank für Ihr Vertrauen."
                  value={form.footer_text || ''} onChange={e => setField('footer_text', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Erscheint am unteren Rand jeder Rechnung und jedes Angebots</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                <Save size={15} /> {updateMutation.isPending ? 'Wird gespeichert…' : 'Einstellungen speichern'}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: Leistungsvorlagen ── */}
        {activeTab === 'templates' && <ServiceTemplates />}
      </div>
    </div>
  );
}
