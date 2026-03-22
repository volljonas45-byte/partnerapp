import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Shield, Briefcase, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamApi } from '../api/team';

const ROLES = [
  { value: 'admin',     label: 'Admin',     icon: Shield,    color: '#7C3AED', bg: '#EDE9FE', desc: 'Voller Zugriff auf alle Bereiche' },
  { value: 'pm',        label: 'PM',        icon: Briefcase, color: '#1D4ED8', bg: '#DBEAFE', desc: 'Alles außer Einstellungen' },
  { value: 'developer', label: 'Developer', icon: Code2,     color: '#065F46', bg: '#D1FAE5', desc: 'Nur Projekte & Aufgaben' },
];

const COLORS = [
  '#6366f1', '#0071E3', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4',
];

const EMPTY = { email: '', password: '', name: '', role: 'developer', color: '#6366f1' };

export default function NewTeamMember() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const inviteMutation = useMutation({
    mutationFn: teamApi.invite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Mitglied eingeladen');
      navigate('/team');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Einladen'),
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error('E-Mail ist erforderlich'); return; }
    if (!form.password || form.password.length < 6) { toast.error('Passwort muss mindestens 6 Zeichen haben'); return; }
    inviteMutation.mutate(form);
  };

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
          <h1 className="text-xl font-semibold text-gray-900">Mitglied einladen</h1>
          <p className="text-sm text-gray-500 mt-0.5">Neues Teammitglied anlegen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Kontaktdaten */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Zugangsdaten</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="Max Mustermann"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">E-Mail *</label>
              <input className="input" type="email" placeholder="max@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Passwort * (min. 6 Zeichen)</label>
            <input className="input" type="password" placeholder="••••••"
              value={form.password} onChange={e => set('password', e.target.value)} />
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
                border: `1.5px solid ${active ? r.color : '#E5E7EB'}`,
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
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1D1D1F', margin: 0 }}>{r.label}</p>
                  <p style={{ fontSize: '12px', color: '#6E6E73', margin: 0 }}>{r.desc}</p>
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
          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '700', color: '#fff',
            }}>
              {(form.name || form.email || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', color: '#6E6E73' }}>Vorschau Avatar</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/team')} className="btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={inviteMutation.isPending} className="btn-primary">
            <Save size={15} />
            {inviteMutation.isPending ? 'Wird eingeladen…' : 'Mitglied einladen'}
          </button>
        </div>
      </form>
    </div>
  );
}
