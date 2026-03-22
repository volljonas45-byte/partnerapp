import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Shield, Briefcase, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamApi } from '../api/team';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../hooks/useConfirm';

// ── Konstanten ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'admin',     label: 'Admin',     icon: Shield,   color: '#7C3AED', bg: '#EDE9FE', desc: 'Voller Zugriff auf alle Bereiche' },
  { value: 'pm',        label: 'PM',        icon: Briefcase,color: '#1D4ED8', bg: '#DBEAFE', desc: 'Alles außer Einstellungen' },
  { value: 'developer', label: 'Developer', icon: Code2,    color: '#065F46', bg: '#D1FAE5', desc: 'Nur Projekte & Aufgaben' },
];

const COLORS = [
  '#6366f1', '#0071E3', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4',
];

const EMPTY_INVITE = { email: '', password: '', name: '', role: 'developer', color: '#6366f1' };

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function getRoleMeta(role) {
  return ROLES.find(r => r.value === role) || ROLES[2];
}

function MemberAvatar({ member, size = 36 }) {
  const name = member.name || member.email || '?';
  const letters = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: member.color || '#6366f1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: '700', color: '#fff',
      flexShrink: 0,
    }}>
      {letters}
    </div>
  );
}

function RoleBadge({ role }) {
  const meta = getRoleMeta(role);
  const Icon = meta.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px',
      borderRadius: '6px',
      background: meta.bg,
      color: meta.color,
      fontSize: '11px', fontWeight: '600',
    }}>
      <Icon size={10} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

// ── Formulare ─────────────────────────────────────────────────────────────────

function InviteForm({ values, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Name</label>
          <input className="input" placeholder="Max Mustermann" value={values.name}
            onChange={e => onChange('name', e.target.value)} />
        </div>
        <div>
          <label className="label">E-Mail *</label>
          <input className="input" type="email" placeholder="max@example.com" value={values.email}
            onChange={e => onChange('email', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Passwort * (min. 6 Zeichen)</label>
        <input className="input" type="password" placeholder="••••••" value={values.password}
          onChange={e => onChange('password', e.target.value)} />
      </div>
      <div>
        <label className="label">Rolle</label>
        <div className="space-y-2 mt-1">
          {ROLES.map(r => {
            const Icon = r.icon;
            return (
              <label key={r.value} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${values.role === r.value ? r.color : '#E5E7EB'}`,
                background: values.role === r.value ? r.bg : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <input type="radio" name="role" value={r.value} checked={values.role === r.value}
                  onChange={() => onChange('role', r.value)} style={{ display: 'none' }} />
                <div style={{
                  width: 32, height: 32, borderRadius: '8px',
                  background: r.bg, color: r.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} strokeWidth={2} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1D1D1F' }}>{r.label}</p>
                  <p style={{ fontSize: '11px', color: '#6E6E73' }}>{r.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <label className="label">Farbe (Avatar)</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => onChange('color', c)}
              style={{
                width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                cursor: 'pointer',
                outline: values.color === c ? `2px solid ${c}` : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EditForm({ values, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Name</label>
        <input className="input" placeholder="Max Mustermann" value={values.name || ''}
          onChange={e => onChange('name', e.target.value)} />
      </div>
      <div>
        <label className="label">Rolle</label>
        <div className="space-y-2 mt-1">
          {ROLES.map(r => {
            const Icon = r.icon;
            return (
              <label key={r.value} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${values.role === r.value ? r.color : '#E5E7EB'}`,
                background: values.role === r.value ? r.bg : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <input type="radio" name="edit-role" value={r.value} checked={values.role === r.value}
                  onChange={() => onChange('role', r.value)} style={{ display: 'none' }} />
                <div style={{
                  width: 32, height: 32, borderRadius: '8px',
                  background: r.bg, color: r.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} strokeWidth={2} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1D1D1F' }}>{r.label}</p>
                  <p style={{ fontSize: '11px', color: '#6E6E73' }}>{r.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <label className="label">Farbe (Avatar)</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => onChange('color', c)}
              style={{
                width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                cursor: 'pointer',
                outline: values.color === c ? `2px solid ${c}` : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function Team() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [modal, setModal]     = useState(null); // 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY_INVITE);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teamApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Mitglied aktualisiert');
      setModal(null);
      setEditing(null);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Aktualisieren'),
  });

  const removeMutation = useMutation({
    mutationFn: teamApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Mitglied entfernt');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Entfernen'),
  });

  const handleFieldChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleUpdate = () => {
    updateMutation.mutate({ id: editing.id, data: { name: form.name, role: form.role, color: form.color } });
  };

  const handleRemove = async (m) => {
    const ok = await confirm(`„${m.name || m.email}" wird aus dem Team entfernt.`, { title: 'Mitglied entfernen' });
    if (!ok) return;
    removeMutation.mutate(m.id);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({ name: m.name || '', role: m.role || 'developer', color: m.color || '#6366f1' });
    setModal('edit');
  };

  if (isLoading) return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <div className="skeleton h-7 w-24 mb-2" />
          <div className="skeleton h-4 w-28" />
        </div>
        <div className="skeleton h-9 w-40 rounded-full" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="skeleton rounded-full shrink-0" style={{ width: 44, height: 44 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton h-4" style={{ width: '120px' }} />
              <div className="skeleton h-3" style={{ width: '160px' }} />
              <div className="skeleton h-5 rounded-full" style={{ width: '60px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">{members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => navigate('/team/invite')} className="btn-primary">
            <Plus size={15} /> Mitglied einladen
          </button>
        )}
      </div>

      {/* Rollen-Legende */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {ROLES.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.value} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              background: r.bg, color: r.color,
              fontSize: '12px', fontWeight: '500',
            }}>
              <Icon size={12} strokeWidth={2.5} />
              <span style={{ fontWeight: '600' }}>{r.label}</span>
              <span style={{ opacity: 0.7 }}>— {r.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Mitglieder-Liste */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="table-header-cell pl-5">Mitglied</th>
              <th className="table-header-cell hidden sm:table-cell">E-Mail</th>
              <th className="table-header-cell">Rolle</th>
              <th className="table-header-cell w-10" />
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const isMe = m.id === user?.id;
              return (
                <tr key={m.id} className="group border-b border-gray-50 last:border-0">
                  <td className="table-cell pl-5">
                    <div className="flex items-center gap-3">
                      <MemberAvatar member={m} />
                      <div>
                        <p className="font-medium text-gray-900">
                          {m.name || <span className="text-gray-400">—</span>}
                          {isMe && (
                            <span style={{
                              marginLeft: '6px', fontSize: '10px', fontWeight: '600',
                              color: '#6366f1', background: '#EDE9FE',
                              padding: '1px 6px', borderRadius: '4px',
                            }}>Du</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 sm:hidden">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500 hidden sm:table-cell">{m.email}</td>
                  <td className="table-cell"><RoleBadge role={m.role} /></td>
                  <td className="table-cell pr-4">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(m)}
                          title="Bearbeiten"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => handleRemove(m)}
                            title="Entfernen"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ConfirmDialogNode}

      {/* Bearbeiten-Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Mitglied bearbeiten" maxWidth="max-w-md">
        <EditForm values={form} onChange={handleFieldChange} />
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Abbrechen</button>
          <button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            className="btn-primary"
          >
            {updateMutation.isPending ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
