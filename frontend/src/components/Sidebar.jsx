import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, Settings, LogOut,
  Zap, Layers, ClipboardCheck, PackageCheck,
  UserCog, Clock, BarChart2, CalendarDays, Plus, CalendarRange, FolderKanban,
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
    <aside className="w-[240px] shrink-0 flex flex-col h-screen bg-white/85 backdrop-blur-2xl border-r border-black/[0.06] z-10">

      {/* Logo */}
      <div className="px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-[#0071E3] flex items-center justify-center shadow-[0_2px_8px_rgba(0,113,227,0.35)]">
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.3px]">Vecturo</span>
        </div>
      </div>

      {/* New project CTA */}
      <div className="px-4 py-3 shrink-0">
        <button
          onClick={() => navigate('/wizard')}
          className="w-full flex items-center justify-center gap-1.5 py-[9px] px-4 text-[13px] font-medium text-white bg-[#0071E3] rounded-[10px] shadow-[0_1px_3px_rgba(0,113,227,0.3)] transition-all duration-150 hover:bg-[#0077ED] active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={2} />
          Neues Projekt
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 pt-4 pb-1.5 text-[10.5px] font-semibold text-[#86868B] uppercase tracking-[0.08em] select-none">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/'} className="block no-underline">
                  {({ isActive }) => (
                    <div className={[
                      'relative flex items-center gap-2.5 px-3 py-[7px] rounded-[10px]',
                      'text-[13.5px] tracking-[-0.01em] cursor-pointer transition-all duration-[120ms]',
                      isActive
                        ? 'bg-[#E8F0FE] text-[#0071E3] font-medium'
                        : 'text-[#424245] font-normal hover:bg-black/[0.04] hover:text-[#1D1D1F]',
                    ].join(' ')}>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-[#0071E3] rounded-r-full" />
                      )}
                      <Icon size={15} color={isActive ? '#0071E3' : '#86868B'} strokeWidth={isActive ? 2 : 1.75} />
                      <span className="flex-1">{label}</span>
                      {to === '/intake' && unread?.count > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#FF3B30] text-white text-[10px] font-bold leading-none">
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
      <div className="px-3 py-3 border-t border-black/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-[10px] mb-1">
          <div className="relative shrink-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
              style={{ background: bgColor }}
            >
              {user?.avatar_base64
                ? <img src={user.avatar_base64} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#34C759] rounded-full border-2 border-white block" />
          </div>
          <div className="min-w-0 flex-1">
            {user?.name && (
              <p className="text-[12px] font-medium text-[#1D1D1F] truncate leading-snug">{user.name}</p>
            )}
            <p className="text-[11px] text-[#6E6E73] truncate leading-snug">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-[#86868B] rounded-[8px] hover:bg-red-500/10 hover:text-[#FF3B30] transition-all duration-150 cursor-pointer"
        >
          <LogOut size={13} strokeWidth={1.75} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
