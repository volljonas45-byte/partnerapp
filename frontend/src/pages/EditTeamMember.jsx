import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Shield, Briefcase, Code2, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamApi } from '../api/team';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLES = [
  { value: 'ceo',       label: 'CEO',       icon: Crown,     color: '#B45309', bg: '#FEF3C7', desc: 'Eigentümer — voller Zugriff auf alles' },
  { value: 'admin',     label: 'Admin',     icon: Shield,    color: '#7C3AED', bg: '#EDE9FE', desc: 'Voller Zugriff auf alle Bereiche' },
  { value: 'pm',        label: 'PM',        icon: Briefcase, color: '#1D4ED8', bg: '#DBEAFE', desc: 'Alles außer Einstellungen' },
  { value: 'developer', label: 'Developer', icon: Code2,     color: '#065F46', bg: '#D1FAE5', desc: 'Nur Projekte & Aufgaben' },
];

const COLORS = [
  '#6366f1', 'var(--color-blue)', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4',
];

export default function EditTeamMember() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const [form, setForm] = useState({ name: '', role: 'developer', color: '#6366f1' });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
  });

  useEffect(() => {
    if (!isAdmin) { navigate('/team', { replace: true }); return; }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (members.length > 0) {
      const member = members.find(m => String(m.id) === String(id));
      if (!member) { navigate('/team', { replace: true }); return; }
      setForm({ name: member.name || '', role: member.role || 'developer', color: member.color || '#6366f1' });
    }
  }, [members, id, navigate]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateMutation = useMutation({
    mutationFn: (data) => teamApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Mitglied aktualisiert');
      navigate('/team');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Speichern'),
  });

  const handleSubmit = e => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  if (isLoading) return <LoadingSpinner className="h-64" />;

  const member = members.find(m => String(m.id) === String(id));
  const initials = (form.name || member?.email || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/team')}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mitglied bearbeiten</h1>
          <p className="text-sm text-gray-500 mt-0.5">{member?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Name */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Angaben</h2>
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="Max Mustermann"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
        </div>

        {/* Rolle */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Rolle & Zugriffsrechte</h2>
          {ROLES.map(r => {
            const Icon = r.icon;
            const active = form.role === r.value;
            return (
              <label key={r.value} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                border: `1.5px solid ${active ? r.color : 'var(--color-border)'}`,
                background: active ? r.bg : '#fff',
                transition: 'all 0.15s',
              }}>
                <input type="radio" name="role" value={r.value} checked={active}
                  onChange={() => set('role', r.value)} style={{ display: 'none' }} />
                <div style={{
                  width: 36, height: 36, borderRadius: '9px',
                  background: r.bg, color: r.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', margin: 0 }}>{r.label}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: 0 }}>{r.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Farbe */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Avatar-Farbe</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: 'none', cursor: 'pointer',
                  outline: form.color === c ? `3px solid ${c}` : '2px solid transparent',
                  outlineOffset: '2px',
                  transition: 'outline 0.15s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '700', color: '#fff',
            }}>
              {initials}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>Vorschau Avatar</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/team')} className="btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
            <Save size={15} />
            {updateMutation.isPending ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
