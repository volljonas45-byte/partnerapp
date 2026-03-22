import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, Settings, LogOut,
  Zap, Briefcase, Layers, Sparkles, ClipboardCheck, PackageCheck, Globe,
  UserCog,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { intakeApi } from '../api/intake';

function avatarColor(str = '') {
  const colors = ['#BF5AF2','#0071E3','#34C759','#FF9500','#FF3B30','#5AC8FA','#FF6961'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Sidebar() {
  const { logout, user, isAdmin, isPM } = useAuth();
  const navigate = useNavigate();

  // Build nav groups based on role
  const NAV_GROUPS = [
    {
      label: null,
      items: [
        { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/websites', icon: Globe,            label: 'Websites'  },
        { to: '/projects', icon: Briefcase,        label: 'Projekte'  },
      ],
    },
    {
      label: 'Workflow',
      items: [
        { to: '/intake',    icon: ClipboardCheck, label: 'Intake'    },
        { to: '/delivery',  icon: PackageCheck,   label: 'Übergabe'  },
        { to: '/onboarding',icon: Layers,         label: 'Onboarding'},
      ],
    },
    // Finanzen: nur für Admin und PM sichtbar
    ...(isAdmin || isPM ? [{
      label: 'Finanzen',
      items: [
        { to: '/invoices', icon: FileText,      label: 'Rechnungen' },
        { to: '/quotes',   icon: ClipboardList, label: 'Angebote'   },
      ],
    }] : []),
    {
      label: 'Verwaltung',
      items: [
        { to: '/clients', icon: Users,    label: 'Kunden' },
        { to: '/team',    icon: UserCog,  label: 'Team'   },
        // Einstellungen nur für Admin
        ...(isAdmin ? [{ to: '/settings', icon: Settings, label: 'Einstellungen' }] : []),
      ],
    },
  ];

  const { data: unread } = useQuery({
    queryKey: ['intake-unread-count'],
    queryFn: intakeApi.getUnreadCount,
    refetchInterval: 30000,
  });

  const displayName = user?.name || user?.email || '?';
  const initials = displayName.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bgColor  = user?.color || avatarColor(user?.email || '');

  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(0,0,0,0.07)',
    }}>

      {/* Logo */}
      <div style={{ padding: '18px 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(145deg, #0A84FF, #0071E3)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,113,227,0.35)',
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            fontSize: '15px', fontWeight: '700',
            color: '#1D1D1F', letterSpacing: '-0.02em',
          }}>Vecturo</span>
        </div>
      </div>

      {/* New project CTA */}
      <div style={{ padding: '4px 12px 12px', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/wizard')}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 14px',
            fontSize: '13px', fontWeight: '500',
            background: '#0071E3',
            color: '#fff',
            border: 'none',
            borderRadius: '980px',
            cursor: 'pointer',
            transition: 'background 0.15s ease, transform 0.1s ease',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0077ED'}
          onMouseLeave={e => e.currentTarget.style.background = '#0071E3'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Sparkles size={13} />
          Neues Projekt
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: '4px' }}>
            {group.label && (
              <p style={{
                padding: '8px 10px 3px',
                fontSize: '11px', fontWeight: '600',
                color: '#86868B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                userSelect: 'none',
              }}>
                {group.label}
              </p>
            )}
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                {({ isActive }) => (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '7px 10px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: isActive ? '500' : '400',
                    color: isActive ? '#0071E3' : '#424245',
                    background: isActive ? 'rgba(0,113,227,0.08)' : 'transparent',
                    transition: 'background 0.12s ease, color 0.12s ease',
                    cursor: 'pointer',
                    letterSpacing: '-0.01em',
                    position: 'relative',
                  }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                        e.currentTarget.style.color = '#1D1D1F';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#424245';
                      }
                    }}
                  >
                    <Icon
                      size={15}
                      color={isActive ? '#0071E3' : '#86868B'}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    <span style={{ flex: 1 }}>{label}</span>
                    {to === '/intake' && unread?.count > 0 && (
                      <span style={{
                        minWidth: '18px', height: '18px',
                        padding: '0 5px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '99px',
                        background: '#FF3B30',
                        color: '#fff',
                        fontSize: '10px', fontWeight: '700',
                        lineHeight: 1,
                      }}>
                        {unread.count > 99 ? '99+' : unread.count}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        {/* Avatar + email */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '6px 8px',
          borderRadius: '10px',
          marginBottom: '2px',
        }}>
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '50%',
            background: bgColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '700',
            color: '#fff',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {user?.name && (
              <p style={{ fontSize: '12px', fontWeight: '500', color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                {user.name}
              </p>
            )}
            <p style={{ fontSize: '11px', color: '#6E6E73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%',
            padding: '7px 10px',
            fontSize: '13px', fontWeight: '400',
            color: '#86868B',
            background: 'transparent',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'background 0.12s ease, color 0.12s ease',
            textAlign: 'left',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,59,48,0.08)';
            e.currentTarget.style.color = '#FF3B30';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#86868B';
          }}
        >
          <LogOut size={13} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
