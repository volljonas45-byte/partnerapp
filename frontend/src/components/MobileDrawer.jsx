import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarDays, Clock, CalendarRange, BarChart2,
  ClipboardCheck, PackageCheck, Layers,
  FileText, ClipboardList, Users, UserCog, Settings,
  LogOut, X, Plus, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { intakeApi } from '../api/intake';

function avatarColor(str = '') {
  const colors = ['#BF5AF2', '#0071E3', '#34C759', '#FF9500', '#FF3B30', '#5AC8FA'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const SECTIONS = [
  {
    label: 'Übersicht',
    items: [
      { to: '/calendar',       icon: CalendarDays,  label: 'Kalender' },
      { to: '/time-tracking',  icon: Clock,         label: 'Zeiterfassung' },
      { to: '/timeline',       icon: CalendarRange, label: 'Timeline' },
      { to: '/team-dashboard', icon: BarChart2,     label: 'Team-Dashboard' },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { to: '/intake',     icon: ClipboardCheck, label: 'Intake',    badge: true },
      { to: '/delivery',   icon: PackageCheck,   label: 'Übergabe' },
      { to: '/onboarding', icon: Layers,         label: 'Onboarding' },
    ],
  },
  {
    label: 'Finanzen',
    items: [
      { to: '/invoices', icon: FileText,      label: 'Rechnungen' },
      { to: '/quotes',   icon: ClipboardList, label: 'Angebote' },
    ],
    adminOnly: true,
  },
  {
    label: 'Verwaltung',
    items: [
      { to: '/clients',  icon: Users,    label: 'Kunden' },
      { to: '/team',     icon: UserCog,  label: 'Team' },
      { to: '/settings', icon: Settings, label: 'Einstellungen', adminOnly: true },
    ],
  },
];

export default function MobileDrawer({ onClose }) {
  const { logout, user, isAdmin, isPM } = useAuth();
  const { c } = useTheme();
  const navigate = useNavigate();

  const { data: unread } = useQuery({
    queryKey: ['intake-unread-count'],
    queryFn: intakeApi.getUnreadCount,
    refetchInterval: 30000,
  });

  const displayName = user?.name || user?.email || '?';
  const initials = displayName.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bgColor = user?.color || avatarColor(user?.email || '');

  function handleNav(to) {
    navigate(to);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 150, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: c.bg, borderRadius: '20px 20px 0 0',
        zIndex: 160, maxHeight: '88vh', overflowY: 'auto',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        transition: 'background 0.2s ease',
      }}>
        {/* Handle + Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: c.bg,
          padding: '12px 20px 8px', borderBottom: `1px solid ${c.borderSubtle}`,
          zIndex: 1,
          transition: 'background 0.2s ease',
        }}>
          {/* Drag handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 99,
            background: c.border,
            margin: '0 auto 12px',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: c.blue,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={13} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: c.text, letterSpacing: '-0.3px' }}>Vecturo</span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 99, border: 'none',
                background: c.inputBg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <X size={16} color={c.textSecondary} />
            </button>
          </div>
        </div>

        {/* New Project CTA */}
        <div style={{ padding: '12px 16px 4px' }}>
          <button
            onClick={() => handleNav('/wizard')}
            style={{
              width: '100%', padding: '13px', borderRadius: 14,
              background: c.blue, color: '#fff', border: 'none',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Neues Projekt erstellen
          </button>
        </div>

        {/* Nav sections */}
        {SECTIONS.map((section, si) => {
          if (section.adminOnly && !isAdmin && !isPM) return null;
          const items = section.items.filter(item => !item.adminOnly || isAdmin);
          if (items.length === 0) return null;

          return (
            <div key={si} style={{ padding: '10px 16px 0' }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: c.textSecondary,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                paddingLeft: 4, marginBottom: 6,
              }}>
                {section.label}
              </p>
              <div style={{
                background: c.card, borderRadius: 14, overflow: 'hidden',
                border: `1px solid ${c.borderSubtle}`,
              }}>
                {items.map(({ to, icon: Icon, label, badge }, idx) => (
                  <button
                    key={to}
                    onClick={() => handleNav(to)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      borderBottom: idx < items.length - 1 ? `1px solid ${c.borderSubtle}` : 'none',
                      background: 'none', border: 'none',
                      borderBottom: idx < items.length - 1 ? `1px solid ${c.borderSubtle}` : 'none',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: c.inputBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={16} color={c.textSecondary} strokeWidth={1.75} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: c.text, flex: 1 }}>{label}</span>
                    {badge && unread?.count > 0 && (
                      <span style={{
                        minWidth: 20, height: 20, borderRadius: 99, padding: '0 5px',
                        background: '#FF3B30', color: '#fff',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{unread.count > 99 ? '99+' : unread.count}</span>
                    )}
                    <span style={{ fontSize: 14, color: c.border }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* User + Logout */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{
            background: c.card, borderRadius: 14, overflow: 'hidden',
            border: `1px solid ${c.borderSubtle}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderBottom: `1px solid ${c.borderSubtle}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: bgColor, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700,
                color: '#fff', overflow: 'hidden',
              }}>
                {user?.avatar_base64
                  ? <img src={user.avatar_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {user?.name && (
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 1 }}>{user.name}</div>
                )}
                <div style={{ fontSize: 12, color: c.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
              </div>
            </div>
            <button
              onClick={() => { logout(); onClose(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(255,59,48,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogOut size={16} color="#FF453A" strokeWidth={1.75} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: '#FF453A' }}>Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
