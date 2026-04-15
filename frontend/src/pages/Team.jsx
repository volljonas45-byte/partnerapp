import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Shield, Briefcase, Code2, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamApi } from '../api/team';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../hooks/useConfirm';
import { useTheme } from '../context/ThemeContext';

const ROLES = [
  { value: 'ceo',       label: 'CEO',       icon: Crown,    color: '#FF9500', bg: 'rgba(255,149,0,0.08)',  darkBg: 'rgba(255,159,10,0.12)' },
  { value: 'admin',     label: 'Admin',     icon: Shield,   color: '#AF52DE', bg: 'rgba(175,82,222,0.08)', darkBg: 'rgba(191,90,242,0.12)' },
  { value: 'pm',        label: 'PM',        icon: Briefcase,color: 'var(--color-blue)', bg: 'rgba(0,122,255,0.08)',  darkBg: 'rgba(10,132,255,0.12)' },
  { value: 'developer', label: 'Developer', icon: Code2,    color: '#34C759', bg: 'rgba(52,199,89,0.08)',  darkBg: 'rgba(48,209,88,0.12)' },
];

function getRoleMeta(role) {
  return ROLES.find(r => r.value === role) || ROLES[2];
}

function MemberAvatar({ member, size = 34 }) {
  const name = member.name || member.email || '?';
  const letters = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: member.color || 'var(--color-blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 600, color: '#fff',
      flexShrink: 0, letterSpacing: '-0.01em',
    }}>
      {letters}
    </div>
  );
}

function RoleBadge({ role, isDark }) {
  const meta = getRoleMeta(role);
  const Icon = meta.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6,
      background: isDark ? meta.darkBg : meta.bg,
      color: meta.color,
      fontSize: 11, fontWeight: 600,
    }}>
      <Icon size={10} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

export default function Team() {
  const { c, isDark } = useTheme();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: teamApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('Mitglied entfernt');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Entfernen'),
  });

  const handleRemove = async (m) => {
    const ok = await confirm(`"${m.name || m.email}" wird aus dem Team entfernt.`, { title: 'Mitglied entfernen' });
    if (!ok) return;
    removeMutation.mutate(m.id);
  };

  const cardStyle = {
    background: c.card,
    borderRadius: 12,
    border: `0.5px solid ${c.borderSubtle}`,
    boxShadow: isDark
      ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.25)'
      : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle), 0 6px 20px var(--color-border-subtle)',
  };

  if (isLoading) return (
    <div style={{ padding: '28px 32px' }}>
      <div className="page-header">
        <div>
          <div className="skeleton h-7 w-24 mb-2" />
          <div className="skeleton h-4 w-28" />
        </div>
        <div className="skeleton h-9 w-40 rounded-lg" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="skeleton rounded-full shrink-0" style={{ width: 44, height: 44 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton h-4" style={{ width: 120 }} />
              <div className="skeleton h-3" style={{ width: 160 }} />
              <div className="skeleton h-5 rounded-md" style={{ width: 60 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ padding: '28px 32px' }}>

      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">{members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => navigate('/team/invite')} className="btn-primary">
            <Plus size={15} strokeWidth={2} /> Mitglied einladen
          </button>
        )}
      </div>

      {/* Role legend */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {ROLES.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.value} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              background: isDark ? r.darkBg : r.bg, color: r.color,
              fontSize: 12, fontWeight: 500,
            }}>
              <Icon size={12} strokeWidth={2.5} />
              <span style={{ fontWeight: 600 }}>{r.label}</span>
              <span style={{ opacity: 0.65 }}>— {
                r.value === 'ceo' ? 'Voller Zugriff' :
                r.value === 'admin' ? 'Alle Bereiche' :
                r.value === 'pm' ? 'Ohne Einstellungen' :
                'Projekte & Aufgaben'
              }</span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
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
                <tr
                  key={m.id}
                  className="group"
                  style={{
                    borderBottom: `0.5px solid ${c.borderSubtle}`,
                    transition: 'background 0.12s cubic-bezier(0.22,1,0.36,1)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = c.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="table-cell pl-5">
                    <div className="flex items-center gap-3">
                      <MemberAvatar member={m} />
                      <div>
                        <p style={{ fontWeight: 500, color: c.text, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.name || <span style={{ color: c.textTertiary }}>—</span>}
                          {isMe && (
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              color: c.blue, background: c.blueLight,
                              padding: '1px 6px', borderRadius: 4,
                            }}>Du</span>
                          )}
                        </p>
                        <p className="sm:hidden" style={{ fontSize: 12, color: c.textTertiary }}>{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell" style={{ color: c.textSecondary, fontSize: 13 }}>{m.email}</td>
                  <td className="table-cell"><RoleBadge role={m.role} isDark={isDark} /></td>
                  <td className="table-cell pr-4">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/team/${m.id}/edit`)}
                          title="Bearbeiten"
                          style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: c.textTertiary, transition: 'background 0.12s, color 0.12s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = c.cardSecondary; e.currentTarget.style.color = c.text; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
                        >
                          <Pencil size={13} />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => handleRemove(m)}
                            title="Entfernen"
                            style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: c.textTertiary, transition: 'background 0.12s, color 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = c.redLight; e.currentTarget.style.color = c.red; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textTertiary; }}
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
    </div>
  );
}
