import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Save, Plus, Trash2, Pencil, Check, Building2, FileText, Layers, Mail, Users, UserCircle, KeyRound, Moon, SunMoon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { settingsApi } from '../api/settings';
import { serviceTemplatesApi } from '../api/serviceTemplates';
import { teamApi } from '../api/team';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
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
  primary_color: 'var(--color-text)',
  footer_text: 'Vielen Dank für Ihr Vertrauen.',
  default_payment_days: 30,
  email_alias: '',
  email_signature: '',
};

const EMPTY_TMPL = { name: '', description: '', unit: 'Stunde', unit_price: '', tax_rate: '19' };

const AVATAR_COLORS = [
  '#6366f1', 'var(--color-blue)', '#34C759', '#FF9500',
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4',
];

const TABS = [
  { id: 'personal',    label: 'Persönlich',            icon: UserCircle },
  { id: 'company',     label: 'Unternehmen',            icon: Building2  },
  { id: 'documents',   label: 'Rechnungen & Angebote',  icon: FileText   },
  { id: 'email',       label: 'E-Mail',                 icon: Mail       },
  { id: 'templates',   label: 'Leistungsvorlagen',      icon: Layers     },
  { id: 'team',        label: 'Team',                   icon: Users      },
  { id: 'darstellung', label: 'Darstellung',            icon: SunMoon    },
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

// ── PersonalSettings ──────────────────────────────────────────────────────────
function PersonalSettings() {
  const { user, refreshUser } = useAuth();
  const avatarRef = useRef();
  const qc = useQueryClient();

  const [name, setName]           = useState('');
  const [color, setColor]         = useState('#6366f1');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar]   = useState(false);
  const [fullName, setFullName]   = useState('');

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });

  // Load geschaeftsfuehrer from settings
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get().then(r => r.data) });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setColor(user.color || '#6366f1');
      setAvatarPreview(user.avatar_base64 || null);
    }
  }, [user]);

  useEffect(() => {
    if (settings) setFullName(settings.geschaeftsfuehrer || '');
  }, [settings]);

  const profileMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: () => { refreshUser(); toast.success('Profil gespeichert'); setRemoveAvatar(false); },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Speichern'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => { toast.success('Passwort geändert'); setPwForm({ current: '', next: '', confirm: '' }); },
    onError: err => toast.error(err.response?.data?.error || 'Falsches Passwort'),
  });

  const handleAvatarChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Bitte eine Bilddatei wählen'); return; }
    if (file.size > 2_000_000) { toast.error('Bild muss kleiner als 2 MB sein'); return; }
    const reader = new FileReader();
    reader.onload = ev => { setAvatarPreview(ev.target.result); setRemoveAvatar(false); };
    reader.readAsDataURL(file);
  };

  const fullNameMutation = useMutation({
    mutationFn: (gf) => settingsApi.update({ ...settings, geschaeftsfuehrer: gf }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const handleProfileSave = e => {
    e.preventDefault();
    const data = { name, color };
    if (removeAvatar) data.avatar_base64 = null;
    else if (avatarPreview && avatarPreview !== user?.avatar_base64) data.avatar_base64 = avatarPreview;
    profileMutation.mutate(data);
    // Save full name for documents separately
    if (fullName !== (settings?.geschaeftsfuehrer || '')) {
      fullNameMutation.mutate(fullName);
    }
  };

  const handlePasswordSave = e => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { toast.error('Neue Passwörter stimmen nicht überein'); return; }
    if (pwForm.next.length < 6) { toast.error('Neues Passwort muss mindestens 6 Zeichen haben'); return; }
    passwordMutation.mutate({ current_password: pwForm.current, new_password: pwForm.next });
  };

  const initials = (name || user?.email || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5">

      {/* Profil */}
      <form onSubmit={handleProfileSave} className="space-y-5">
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Profilbild</h2>
          <div className="flex items-center gap-5">
            {/* Preview */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: avatarPreview && !removeAvatar ? 'transparent' : color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: '700', color: '#fff',
              overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            }}>
              {avatarPreview && !removeAvatar
                ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <button type="button" onClick={() => avatarRef.current?.click()} className="btn-secondary text-xs">
                <Upload size={13} /> Bild hochladen
              </button>
              {(avatarPreview && !removeAvatar) && (
                <button type="button" onClick={() => { setAvatarPreview(null); setRemoveAvatar(true); }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <X size={12} /> Bild entfernen
                </button>
              )}
              <p className="text-xs text-gray-400">PNG, JPG · max. 2 MB</p>
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Angaben</h2>
          <div>
            <label className="label">Anzeigename</label>
            <input className="input" placeholder="Max" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Voller Name (erscheint auf Rechnungen & Angeboten)</label>
            <input className="input" placeholder="Max Mustermann" value={fullName} onChange={e => setFullName(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Vor- und Nachname — wird als Geschäftsführer/Verantwortlicher auf Dokumenten angezeigt</p>
          </div>
          <div>
            <label className="label">E-Mail</label>
            <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            <p className="text-xs text-gray-400 mt-1">E-Mail kann nicht geändert werden</p>
          </div>
          <div>
            <label className="label">Avatar-Farbe (Initialen-Fallback)</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: 'none', cursor: 'pointer',
                    outline: color === c ? `3px solid ${c}` : '2px solid transparent',
                    outlineOffset: '2px', transition: 'outline 0.15s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={profileMutation.isPending} className="btn-primary">
            <Save size={15} /> {profileMutation.isPending ? 'Wird gespeichert…' : 'Profil speichern'}
          </button>
        </div>
      </form>

      {/* Passwort */}
      <form onSubmit={handlePasswordSave} className="space-y-5">
        <div className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Passwort ändern</h2>
            <p className="text-xs text-gray-400 mt-0.5">Gib dein aktuelles Passwort ein, dann zweimal das neue.</p>
          </div>
          <div>
            <label className="label">Aktuelles Passwort</label>
            <input type="password" className="input" placeholder="••••••••"
              value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Neues Passwort</label>
              <input type="password" className="input" placeholder="Min. 6 Zeichen"
                value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
            </div>
            <div>
              <label className="label">Neues Passwort bestätigen</label>
              <input type="password" className="input" placeholder="••••••••"
                value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                style={{ borderColor: pwForm.confirm && pwForm.next !== pwForm.confirm ? '#EF4444' : undefined }} />
            </div>
          </div>
          {pwForm.confirm && pwForm.next !== pwForm.confirm && (
            <p className="text-xs text-red-500">Passwörter stimmen nicht überein</p>
          )}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={passwordMutation.isPending || !pwForm.current || !pwForm.next} className="btn-primary">
            <KeyRound size={15} /> {passwordMutation.isPending ? 'Wird gespeichert…' : 'Passwort ändern'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── TeamSettings ──────────────────────────────────────────────────────────────
function TeamSettings() {
  const { c, isDark } = useTheme();
  const qc = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team', 'all'],
    queryFn: () => teamApi.list({ include_hidden: 1 }).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teamApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); qc.invalidateQueries({ queryKey: ['team-stats'] }); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '13px', fontWeight: '600', color: c.text, margin: 0 }}>Team Dashboard Sichtbarkeit</h2>
        <p style={{ fontSize: '12px', color: c.textSecondary, margin: '4px 0 0', lineHeight: 1.5 }}>
          Lege fest, welche Mitglieder in Aufgaben-Auswertungen und Zeiterfassungs-Statistiken erscheinen.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {members.map((m, i) => {
          const isVisible = m.show_in_dashboard !== false;
          const initials = (m.name || m.email || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 18px',
              borderBottom: i < members.length - 1 ? `0.5px solid ${c.borderSubtle}` : 'none',
            }}>
              {/* Avatar */}
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: m.color || '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0,
              }}>
                {initials}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: c.text, margin: 0, lineHeight: 1.3 }}>
                  {m.name || m.email}
                </p>
                <p style={{ fontSize: '11px', color: c.textSecondary, margin: '1px 0 0' }}>
                  {m.email} · {m.role}
                  {!m.workspace_owner_id && <span style={{ marginLeft: '6px', fontSize: '10px', background: c.blueLight, color: c.blue, borderRadius: '4px', padding: '1px 5px', fontWeight: '500' }}>Haupt-Account</span>}
                </p>
              </div>

              {/* Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: isVisible ? '#34C759' : c.textSecondary, fontWeight: '500' }}>
                  {isVisible ? 'Sichtbar' : 'Ausgeblendet'}
                </span>
                <div
                  onClick={() => updateMutation.mutate({ id: m.id, data: { show_in_dashboard: !isVisible } })}
                  style={{
                    width: '40px', height: '24px',
                    borderRadius: '12px',
                    background: isVisible ? '#34C759' : 'var(--color-border)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: isVisible ? '19px' : '3px',
                    width: '18px', height: '18px',
                    borderRadius: '50%',
                    background: 'var(--color-card)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s ease',
                  }} />
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const qc      = useQueryClient();
  const fileRef = useRef();
  const [activeTab, setActiveTab] = useState('personal');
  const { c } = useTheme();

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
        primary_color:        settings.primary_color        || 'var(--color-text)',
        footer_text:          settings.footer_text          || 'Vielen Dank für Ihr Vertrauen.',
        default_payment_days: settings.default_payment_days ?? 30,
        email_alias:          settings.email_alias          || '',
        email_signature:      settings.email_signature      || '',
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
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', background: c.bg }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(16px, 4vw, 32px)', paddingBottom: 64, boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: c.text, letterSpacing: '-0.025em', margin: 0, lineHeight: 1.15 }}>Einstellungen</h1>
          <p style={{ fontSize: '13px', color: c.textSecondary, margin: '3px 0 0', letterSpacing: '-0.01em' }}>Verwalte deine Unternehmens- und Dokumenteinstellungen</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', background: c.inputBg, borderRadius: '12px', padding: '4px', marginBottom: '24px', width: '100%' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '600' : '500',
                  background: active ? c.card : 'transparent', color: active ? c.text : c.textSecondary,
                  boxShadow: active ? (isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px var(--color-border-subtle)') : 'none', transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Persönlich ── */}
        {activeTab === 'personal' && <PersonalSettings />}

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

            {/* Bankdaten */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Bankdaten</h2>
              {field('bank_name', 'Bank', 'text', 'Deutsche Bank')}
              {field('iban', 'IBAN', 'text', 'DE89 3704 0044 0532 0130 00')}
              {field('bic', 'BIC', 'text', 'DEUTDEDB')}
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
                    value={form.primary_color || 'var(--color-text)'} onChange={e => setField('primary_color', e.target.value)} />
                  <input type="text" className="input flex-1" placeholder="#111827"
                    value={form.primary_color || 'var(--color-text)'} onChange={e => setField('primary_color', e.target.value)} />
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

        {/* ── Tab: E-Mail ── */}
        {activeTab === 'email' && (
          <form onSubmit={handleSave} className="space-y-5">

            {/* Absender-Alias */}
            <div className="card space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Absender-Alias</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Deine persönliche Absender-E-Mail-Adresse. E-Mails gehen von dieser Adresse aus —
                  jeder Nutzer kann hier seinen eigenen Alias eintragen (z. B. <em>jonas@jragencyservices.com</em>).
                  Der globale SMTP-Account in der .env wird zum Versenden verwendet.
                </p>
              </div>
              <div>
                <label className="label">E-Mail-Alias</label>
                <input
                  type="email"
                  className="input"
                  placeholder="jonas@jragencyservices.com"
                  value={form.email_alias}
                  onChange={e => setField('email_alias', e.target.value)}
                />
              </div>
            </div>

            {/* Signatur */}
            <div className="card space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">E-Mail-Signatur</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Wird automatisch unter jede gesendete E-Mail angehängt (nach einem "-- " Trennstrich).
                </p>
              </div>
              <div>
                <label className="label">Signatur (Freitext)</label>
                <textarea
                  rows={6}
                  className="input resize-none font-mono text-sm leading-relaxed"
                  placeholder={`Jonas Richter\nJR Agency Services\njragencyservices.com\n+49 123 456789`}
                  value={form.email_signature}
                  onChange={e => setField('email_signature', e.target.value)}
                />
              </div>
            </div>

            {/* Vorschau */}
            {(form.email_alias || form.email_signature) && (
              <div className="card space-y-2">
                <h2 className="text-sm font-semibold text-gray-700">Vorschau</h2>
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600 space-y-1">
                  {form.email_alias && (
                    <p><span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Von:</span>{' '}
                      {form.email_alias}
                    </p>
                  )}
                  {form.email_signature && (
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Signatur:</p>
                      <pre className="font-sans text-sm text-gray-600 whitespace-pre-wrap">{form.email_signature}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                <Save size={15} /> {updateMutation.isPending ? 'Wird gespeichert…' : 'Einstellungen speichern'}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: Leistungsvorlagen ── */}
        {activeTab === 'templates' && <ServiceTemplates />}

        {/* ── Tab: Team ── */}
        {activeTab === 'team' && <TeamSettings />}

        {/* ── Tab: Darstellung ── */}
        {activeTab === 'darstellung' && (
          <div className="card space-y-6">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 4 }}>Erscheinungsbild</h2>
              <p style={{ fontSize: 13, color: c.textSecondary }}>Das Design ist dauerhaft auf Dark Mode eingestellt.</p>
            </div>

            {/* Dark-only notice */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(155,114,242,0.1) 0%, rgba(91,140,245,0.08) 100%)',
              border: '0.5px solid rgba(155,114,242,0.2)',
            }}>
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(155,114,242,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Moon size={18} color="#9B72F2" strokeWidth={1.75} />
              </span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: 0 }}>Dark Mode aktiv</p>
                <p style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>
                  Vecturo verwendet ausschließlich das dunkle Premium-Design.
                </p>
              </div>
              <span style={{
                marginLeft: 'auto', padding: '3px 10px', borderRadius: 6,
                fontSize: 11, fontWeight: 600,
                background: 'rgba(155,114,242,0.15)', color: '#9B72F2',
              }}>
                Aktiv
              </span>
            </div>

            {/* Preview */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Vorschau</p>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: `0.5px solid ${c.borderSubtle}` }}>
                <div style={{ background: c.bg, padding: 16 }}>
                  <div style={{ background: c.card, borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 4 }}>Beispiel-Karte</div>
                    <div style={{ fontSize: 11.5, color: c.textSecondary }}>So sehen Inhalte im dunklen Modus aus.</div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                      <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.blueLight, color: c.blue }}>Aktiv</span>
                      <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.inputBg, color: c.textSecondary }}>Normal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
