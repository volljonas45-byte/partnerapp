import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Building2, Search, ArrowRight, ChevronRight, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';
import { useMobile } from '../hooks/useMobile';
import { useTheme } from '../context/ThemeContext';

const EMPTY_FORM = {
  company_name: '', contact_person: '', address: '',
  city: '', postal_code: '', country: '',
  email: '', phone: '', vat_id: '',
};

const AVATAR_COLORS = [
  '#AF52DE', 'var(--color-blue)', '#34C759', '#FF9500', '#FF3B30', '#5AC8FA', '#FF6961', '#BF5AF2',
];

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ClientAvatar({ name }) {
  const letters = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bg = getAvatarColor(name);
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 12, fontWeight: 600,
      color: '#fff', flexShrink: 0, letterSpacing: '-0.01em',
    }}>
      {letters}
    </div>
  );
}

function ClientForm({ values, onChange }) {
  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={values[name] || ''}
        onChange={e => onChange(name, e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {field('company_name',   'Unternehmensname *', 'text',  'Muster GmbH')}
      {field('contact_person', 'Ansprechpartner',    'text',  'Max Mustermann')}
      <div className="grid grid-cols-2 gap-3">
        {field('email', 'E-Mail', 'email', 'info@muster.de')}
        {field('phone', 'Telefon', 'tel',  '+49 ...')}
      </div>
      {field('address', 'Straße & Hausnummer')}
      <div className="grid grid-cols-3 gap-3">
        {field('postal_code', 'PLZ')}
        {field('city',        'Stadt')}
        {field('country',     'Land')}
      </div>
      {field('vat_id', 'USt-IdNr.', 'text', 'DE123456789')}
    </div>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useMobile();
  const { c, isDark } = useTheme();

  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Kunde hinzugefügt');
      closeModal();
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Kunde aktualisiert');
      closeModal();
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Aktualisieren'),
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Kunde gelöscht');
    },
    onError: err => toast.error(err.response?.data?.error || 'Löschen fehlgeschlagen'),
  });

  const { confirm, ConfirmDialogNode } = useConfirm();

  const openAdd    = ()  => { setForm(EMPTY_FORM); setModal('add'); };
  const openEdit   = c   => { setEditing(c); setForm({ ...c }); setModal('edit'); };
  const closeModal = ()  => { setModal(null); setEditing(null); setForm(EMPTY_FORM); };

  const handleFieldChange = (name, val) => setForm(f => ({ ...f, [name]: val }));

  const handleSubmit = () => {
    if (!form.company_name.trim()) { toast.error('Unternehmensname ist erforderlich'); return; }
    if (modal === 'add') createMutation.mutate(form);
    else updateMutation.mutate({ id: editing.id, data: form });
  };

  const handleDelete = async (e, c) => {
    e.stopPropagation();
    const ok = await confirm(`„${c.company_name}" wird unwiderruflich gelöscht.`, { title: 'Kunden löschen' });
    if (!ok) return;
    deleteMutation.mutate(c.id);
  };

  const filtered = useMemo(() => clients.filter(c => {
    const q = search.toLowerCase();
    return !q
      || c.company_name.toLowerCase().includes(q)
      || c.contact_person?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q);
  }), [clients, search]);

  const cardStyle = {
    background: c.card,
    borderRadius: 12,
    border: `0.5px solid ${c.borderSubtle}`,
    boxShadow: isDark
      ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.25)'
      : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle), 0 6px 20px var(--color-border-subtle)',
  };

  if (isLoading) return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px' }}>
      <div className="page-header">
        <div>
          <div className="skeleton h-7 w-32 mb-2" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>
      <div className="skeleton h-9 w-56 rounded-xl mb-5" />
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < 4 ? `0.5px solid ${c.borderSubtle}` : 'none' }}>
            <div className="skeleton rounded-full shrink-0" style={{ width: 32, height: 32 }} />
            <div style={{ flex: 1, display: 'flex', gap: 12 }}>
              <div className="skeleton h-4" style={{ width: `${130 + i * 20}px` }} />
              <div className="skeleton h-4 hidden sm:block" style={{ width: 110 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Mobile layout ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: c.bg, minHeight: '100vh' }}>
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: c.text, letterSpacing: '-0.032em', margin: 0 }}>Kunden</h1>
            <p style={{ fontSize: 13, color: c.textSecondary, margin: '4px 0 0', letterSpacing: '-0.006em' }}>
              {clients.length} {clients.length === 1 ? 'Kunde' : 'Kunden'}
            </p>
          </div>
          <button
            onClick={() => navigate('/clients/new')}
            className="btn-primary"
          >
            <Plus size={15} strokeWidth={2} />
            Neu
          </button>
        </div>

        <div style={{ padding: '0 16px 14px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', color: c.textTertiary, pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ padding: '0 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ ...cardStyle, padding: '40px 20px', textAlign: 'center' }}>
              <Building2 size={28} color={c.border} strokeWidth={1.25} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: '0 0 4px' }}>
                {search ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
              </p>
              <p style={{ fontSize: 13, color: c.textSecondary, margin: 0 }}>
                {search ? `Keine Treffer für "${search}"` : 'Lege jetzt deinen ersten Kunden an.'}
              </p>
              {!search && (
                <button onClick={() => navigate('/clients/new')} className="btn-primary" style={{ marginTop: 16 }}>
                  Kunde anlegen
                </button>
              )}
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {filtered.map((cl, idx) => (
                <div
                  key={cl.id}
                  onClick={() => navigate(`/clients/${cl.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                    borderBottom: idx < filtered.length - 1 ? `0.5px solid ${c.borderSubtle}` : 'none',
                  }}
                >
                  <ClientAvatar name={cl.company_name} />
                  <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: c.text, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.009em' }}>
                      {cl.company_name}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
                      {cl.contact_person && (
                        <span style={{ fontSize: 12, color: c.textSecondary }}>{cl.contact_person}</span>
                      )}
                      {cl.city && (
                        <span style={{ fontSize: 12, color: c.textTertiary }}>{cl.city}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                    {cl.phone && (
                      <a
                        href={`tel:${cl.phone}`}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: c.cardSecondary,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Phone size={14} color={c.textTertiary} />
                      </a>
                    )}
                    <ChevronRight size={14} color={c.border} strokeWidth={2} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {ConfirmDialogNode}

        <Modal
          open={!!modal}
          onClose={closeModal}
          title={modal === 'add' ? 'Kunden anlegen' : 'Kunden bearbeiten'}
          maxWidth="max-w-xl"
        >
          <ClientForm values={form} onChange={handleFieldChange} />
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={closeModal} className="btn-secondary">Abbrechen</button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn-primary"
            >
              {modal === 'add' ? 'Kunden anlegen' : 'Speichern'}
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ padding: '28px 32px' }}>

      <div className="page-header">
        <div>
          <h1 className="page-title">Kunden</h1>
          <p className="page-subtitle">{clients.length} {clients.length === 1 ? 'Kunde' : 'Kunden'}</p>
        </div>
        <button onClick={() => navigate('/clients/new')} className="btn-primary">
          <Plus size={15} strokeWidth={2} /> Kunden anlegen
        </button>
      </div>

      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textTertiary }} />
        <input
          className="input"
          style={{ paddingLeft: 36 }}
          placeholder="Suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: c.cardSecondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Building2 size={20} color={c.textTertiary} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 4 }}>
            {search ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
          </p>
          <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 16 }}>
            {search ? `Keine Treffer für "${search}"` : 'Legen Sie jetzt Ihren ersten Kunden an.'}
          </p>
          {!search && (
            <button onClick={() => navigate('/clients/new')} className="btn-primary mx-auto">
              <Plus size={15} /> Kunden anlegen
            </button>
          )}
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
                <th className="table-header-cell pl-5 w-full">Unternehmen</th>
                <th className="table-header-cell hidden sm:table-cell">Ansprechpartner</th>
                <th className="table-header-cell hidden md:table-cell">E-Mail</th>
                <th className="table-header-cell hidden lg:table-cell">Adresse</th>
                <th className="table-header-cell hidden xl:table-cell">USt-IdNr.</th>
                <th className="table-header-cell w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(cl => (
                <tr
                  key={cl.id}
                  onClick={() => navigate(`/clients/${cl.id}`)}
                  className="group"
                  style={{
                    borderBottom: `0.5px solid ${c.borderSubtle}`,
                    cursor: 'pointer',
                    transition: 'background 0.12s cubic-bezier(0.22,1,0.36,1)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = c.blueLight}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="table-cell pl-5">
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={cl.company_name} />
                      <div className="min-w-0">
                        <p style={{ fontSize: 14, fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cl.company_name}
                        </p>
                        {cl.contact_person && (
                          <p className="sm:hidden" style={{ fontSize: 12, color: c.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl.contact_person}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell" style={{ color: c.textSecondary, fontSize: 13 }}>
                    {cl.contact_person || <span style={{ color: c.border }}>—</span>}
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    {cl.email
                      ? <a href={`mailto:${cl.email}`} onClick={e => e.stopPropagation()} style={{ color: c.textSecondary, fontSize: 13, textDecoration: 'none' }}>{cl.email}</a>
                      : <span style={{ color: c.border }}>—</span>
                    }
                  </td>
                  <td className="table-cell hidden lg:table-cell" style={{ color: c.textSecondary, fontSize: 13 }}>
                    {[cl.address, cl.postal_code, cl.city].filter(Boolean).join(', ') || <span style={{ color: c.border }}>—</span>}
                  </td>
                  <td className="table-cell hidden xl:table-cell" style={{ color: c.textTertiary, fontFamily: 'monospace', fontSize: 12 }}>
                    {cl.vat_id || <span style={{ color: c.border }}>—</span>}
                  </td>
                  <td className="table-cell pr-4">
                    <div
                      className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(cl); }}
                        title="Bearbeiten"
                        style={{
                          padding: 6, borderRadius: 6, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          color: c.textTertiary,
                          transition: 'background 0.12s, color 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = c.cardSecondary; e.currentTarget.style.color = c.text; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={e => handleDelete(e, cl)}
                        title="Löschen"
                        style={{
                          padding: 6, borderRadius: 6, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          color: c.textTertiary,
                          transition: 'background 0.12s, color 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = c.redLight; e.currentTarget.style.color = c.red; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => navigate(`/clients/${cl.id}`)}
                        title="Details"
                        style={{
                          padding: 6, borderRadius: 6, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          color: c.textTertiary,
                          transition: 'background 0.12s, color 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = c.cardSecondary; e.currentTarget.style.color = c.text; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ConfirmDialogNode}

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'add' ? 'Kunden anlegen' : 'Kunden bearbeiten'}
        maxWidth="max-w-xl"
      >
        <ClientForm values={form} onChange={handleFieldChange} />
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={closeModal} className="btn-secondary">Abbrechen</button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn-primary"
          >
            {modal === 'add' ? 'Kunden anlegen' : 'Speichern'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
