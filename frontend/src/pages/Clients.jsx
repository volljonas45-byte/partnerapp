import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Building2, Search, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useConfirm } from '../hooks/useConfirm';

const EMPTY_FORM = {
  company_name: '', contact_person: '', address: '',
  city: '', postal_code: '', country: '',
  email: '', phone: '', vat_id: '',
};

// Deterministic avatar color from company name
const AVATAR_COLORS = [
  ['bg-violet-100 text-violet-700', 'bg-violet-200'],
  ['bg-blue-100 text-blue-700',     'bg-blue-200'  ],
  ['bg-emerald-100 text-emerald-700','bg-emerald-200'],
  ['bg-amber-100 text-amber-700',   'bg-amber-200' ],
  ['bg-rose-100 text-rose-700',     'bg-rose-200'  ],
  ['bg-cyan-100 text-cyan-700',     'bg-cyan-200'  ],
  ['bg-orange-100 text-orange-700', 'bg-orange-200'],
  ['bg-pink-100 text-pink-700',     'bg-pink-200'  ],
];

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length][0];
}

function ClientAvatar({ name }) {
  const letters = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const cls = getAvatarColor(name);
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${cls}`}>
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

  if (isLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="p-8 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kunden</h1>
          <p className="page-subtitle">{clients.length} {clients.length === 1 ? 'Kunde' : 'Kunden'}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={15} /> Kunden anlegen
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="input pl-9"
          placeholder="Suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {search ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            {search ? `Keine Treffer für „${search}"` : 'Legen Sie jetzt Ihren ersten Kunden an.'}
          </p>
          {!search && (
            <button onClick={openAdd} className="btn-primary mx-auto">
              <Plus size={15} /> Kunden anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="table-header-cell pl-5 w-full">Unternehmen</th>
                <th className="table-header-cell hidden sm:table-cell">Ansprechpartner</th>
                <th className="table-header-cell hidden md:table-cell">E-Mail</th>
                <th className="table-header-cell hidden lg:table-cell">Stadt</th>
                <th className="table-header-cell hidden xl:table-cell">USt-IdNr.</th>
                <th className="table-header-cell w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="group table-row border-b border-gray-50 last:border-0"
                >
                  {/* Company with avatar */}
                  <td className="table-cell pl-5">
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={c.company_name} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate group-hover:text-gray-700 transition-colors">
                          {c.company_name}
                        </p>
                        {c.contact_person && (
                          <p className="text-xs text-gray-400 truncate sm:hidden">{c.contact_person}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500 hidden sm:table-cell">
                    {c.contact_person || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    {c.email
                      ? <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-gray-500 hover:text-gray-900 hover:underline transition-colors">{c.email}</a>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="table-cell text-gray-500 hidden lg:table-cell">
                    {c.city || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-cell text-gray-400 font-mono text-xs hidden xl:table-cell">
                    {c.vat_id || <span className="text-gray-300">—</span>}
                  </td>
                  {/* Actions — only visible on hover */}
                  <td className="table-cell pr-4">
                    <div
                      className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(c); }}
                        title="Bearbeiten"
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={e => handleDelete(e, c)}
                        title="Löschen"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => navigate(`/clients/${c.id}`)}
                        title="Details"
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
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

      {/* Modal */}
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
            {modal === 'add' ? 'Kunden anlegen' : 'Änderungen speichern'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
