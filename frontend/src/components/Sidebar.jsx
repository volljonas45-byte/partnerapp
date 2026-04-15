import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, Settings, LogOut,
  Zap, Layers, ClipboardCheck, PackageCheck,
  UserCog, Clock, BarChart2, CalendarDays, Plus, CalendarRange, FolderKanban, Flame, BarChart3,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { intakeApi } from '../api/intake';

function avatarColor(str = '') {
  const colors = ['#BF5AF2','var(--color-blue)','#34C759','#FF9500','#FF3B30','#5AC8FA','#AF52DE'];
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
        { to: '/sales',           icon: Flame,     label: 'Sales Engine' },
        { to: '/sales/analytics', icon: BarChart3,  label: 'Auswertung'  },
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
      backdropFilter: 'saturate(180%) blur(24px)',
      WebkitBackdropFilter: 'saturate(180%) blur(24px)',
      borderRight: `0.5px solid ${c.borderSubtle}`,
      zIndex: 10,
      transition: 'background 0.3s cubic-bezier(0.22,1,0.36,1)',
    }}>

      {/* Logo */}
      <div style={{ padding: '18px 20px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg, ${c.blue}, ${isDark ? '#0064D1' : '#0055B8'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            fontSize: 15, fontWeight: 600, color: c.text,
            letterSpacing: '-0.02em',
          }}>Vecturo</span>
        </div>
      </div>

      {/* New project CTA */}
      <div style={{ padding: '8px 14px 8px' }}>
        <button
          onClick={() => navigate('/wizard')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: '7px 14px', fontSize: 13, fontWeight: 500,
            letterSpacing: '-0.008em',
            color: c.blue, background: c.blueLight,
            border: 'none', borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1), transform 0.1s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = c.blueMuted}
          onMouseLeave={e => e.currentTarget.style.background = c.blueLight}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={14} strokeWidth={2} />
          Neues Projekt
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 8px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p style={{
                padding: '16px 10px 5px', fontSize: 11, fontWeight: 600,
                color: c.textTertiary, textTransform: 'uppercase',
                letterSpacing: '0.04em', userSelect: 'none', margin: 0,
              }}>
                {group.label}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/' || to === '/sales'} style={{ textDecoration: 'none' }}>
                  {({ isActive }) => (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 8,
                      fontSize: 13, letterSpacing: '-0.008em', cursor: 'pointer',
                      transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1), color 0.15s cubic-bezier(0.22,1,0.36,1)',
                      background: isActive ? c.blueLight : 'transparent',
                      color: isActive ? c.blue : c.textSecondary,
                      fontWeight: isActive ? 600 : 400,
                    }}>
                      <Icon
                        size={16}
                        color={isActive ? c.blue : c.textTertiary}
                        strokeWidth={isActive ? 2 : 1.5}
                      />
                      <span style={{ flex: 1 }}>{label}</span>
                      {to === '/intake' && unread?.count > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, padding: '0 5px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 99, background: '#FF3B30',
                          color: '#fff', fontSize: 11, fontWeight: 600,
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
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: '8px 10px 12px', borderTop: `0.5px solid ${c.borderSubtle}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          borderRadius: 8, cursor: 'default',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: bgColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 600,
              color: '#fff', overflow: 'hidden',
            }}>
              {user?.avatar_base64
                ? <img src={user.avatar_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <span style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 9, height: 9, background: '#34C759',
              borderRadius: '50%', border: `2px solid ${isDark ? '#161618' : 'var(--color-card-secondary)'}`,
            }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {user?.name && (
              <p style={{ fontSize: 13, fontWeight: 500, color: c.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.008em' }}>{user.name}</p>
            )}
            <p style={{ fontSize: 11, color: c.textTertiary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', fontSize: 13, color: c.textTertiary,
            letterSpacing: '-0.008em',
            borderRadius: 8, border: 'none', background: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1), color 0.15s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = c.redLight; e.currentTarget.style.color = c.red; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = c.textTertiary; }}
        >
          <LogOut size={14} strokeWidth={1.5} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
