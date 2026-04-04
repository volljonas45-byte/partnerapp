import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, Settings, LogOut,
  Zap, Layers, ClipboardCheck, PackageCheck,
  UserCog, Clock, BarChart2, CalendarDays, Plus, CalendarRange, FolderKanban, Flame,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { intakeApi } from '../api/intake';

function avatarColor(str = '') {
  const colors = ['#BF5AF2','#0071E3','#34C759','#FF9500','#FF3B30','#5AC8FA','#FF6961'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Sidebar() {
  const { logout, user, isAdmin, isPM } = useAuth();
  const { c, isDark } = useTheme();
  const navigate = useNavigate();

  const NAV_GROUPS = [
    {
      label: null,
      items: [
        { to: '/',              icon: LayoutDashboard, label: 'Dashboard'     },
        { to: '/work',          icon: FolderKanban,    label: 'Arbeit'        },
        { to: '/calendar',      icon: CalendarDays,    label: 'Kalender'      },
        { to: '/time-tracking', icon: Clock,           label: 'Zeiterfassung' },
        { to: '/timeline',      icon: CalendarRange,   label: 'Timeline'      },
        { to: '/team-dashboard',icon: BarChart2,       label: 'Team'          },
      ],
    },
    {
      label: 'Vertrieb',
      items: [
        { to: '/sales', icon: Flame, label: 'Sales Engine' },
      ],
    },
    {
      label: 'Workflow',
      items: [
        { to: '/intake',     icon: ClipboardCheck, label: 'Intake'     },
        { to: '/delivery',   icon: PackageCheck,   label: 'Übergabe'   },
        { to: '/onboarding', icon: Layers,         label: 'Onboarding' },
      ],
    },
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
        { to: '/clients', icon: Users,   label: 'Kunden'        },
        { to: '/team',    icon: UserCog, label: 'Team'          },
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
      width: 240,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: c.sidebarBg,
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRight: `1px solid ${c.borderSubtle}`,
      zIndex: 10,
      transition: 'background 0.2s ease, border-color 0.2s ease',
    }}>

      {/* Logo */}
      <div style={{ padding: '20px 20px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: c.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 8px ${c.blueLight}`,
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.3px' }}>Vecturo</span>
        </div>
      </div>

      {/* New project CTA */}
      <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/wizard')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '9px 16px', fontSize: 13, fontWeight: 500,
            color: '#fff', background: c.blue, border: 'none', borderRadius: 10,
            cursor: 'pointer', transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={14} strokeWidth={2} />
          Neues Projekt
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p style={{
                padding: '16px 12px 6px', fontSize: 10.5, fontWeight: 600,
                color: c.textSecondary, textTransform: 'uppercase',
                letterSpacing: '0.08em', userSelect: 'none', margin: 0,
              }}>
                {group.label}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/'} style={{ textDecoration: 'none' }}>
                  {({ isActive }) => (
                    <div style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 12px', borderRadius: 10,
                      fontSize: 13.5, letterSpacing: '-0.01em', cursor: 'pointer',
                      transition: 'background 0.12s ease, color 0.12s ease',
                      background: isActive ? c.blueLight : 'transparent',
                      color: isActive ? c.blue : (isDark ? '#AEAEB2' : '#424245'),
                      fontWeight: isActive ? 500 : 400,
                    }}>
                      {isActive && (
                        <span style={{
                          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                          width: 3, height: 18, background: c.blue, borderRadius: '0 2px 2px 0',
                        }} />
                      )}
                      <Icon size={15} color={isActive ? c.blue : c.textSecondary} strokeWidth={isActive ? 2 : 1.75} />
                      <span style={{ flex: 1 }}>{label}</span>
                      {to === '/intake' && unread?.count > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, padding: '0 4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 99, background: '#FF3B30',
                          color: '#fff', fontSize: 10, fontWeight: 700,
                        }}>
                          {unread.count > 99 ? '99+' : unread.count}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: '12px', borderTop: `1px solid ${c.borderSubtle}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 10, marginBottom: 4 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: bgColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, fontWeight: 700,
              color: '#fff', overflow: 'hidden',
            }}>
              {user?.avatar_base64
                ? <img src={user.avatar_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 10, height: 10, background: '#34C759',
              borderRadius: '50%', border: `2px solid ${c.sidebarBg}`, display: 'block',
            }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {user?.name && (
              <p style={{ fontSize: 12, fontWeight: 500, color: c.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
            )}
            <p style={{ fontSize: 11, color: c.textTertiary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', fontSize: 12.5, color: c.textSecondary,
            borderRadius: 8, border: 'none', background: 'none',
            cursor: 'pointer', transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.1)'; e.currentTarget.style.color = '#FF3B30'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = c.textSecondary; }}
        >
          <LogOut size={13} strokeWidth={1.75} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
