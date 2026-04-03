import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Flame, FolderKanban, FileText, MoreHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../api/sales';

const TABS = [
  { to: '/',         icon: LayoutDashboard, label: 'Home',     end: true  },
  { to: '/sales',    icon: Flame,           label: 'Sales',    end: false },
  { to: '/work',     icon: FolderKanban,    label: 'Arbeit',   end: false },
  { to: '/invoices', icon: FileText,        label: 'Finanzen', end: false },
];

export default function BottomNav({ onMoreClick }) {
  const { data: stats } = useQuery({
    queryKey: ['sales-stats'],
    queryFn: salesApi.stats,
    refetchInterval: 60000,
  });

  const followupsDue = stats?.followups_due || 0;

  return (
    // Wrapper: handles safe-area spacing so pill sits above home indicator
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 10,
      zIndex: 100,
      pointerEvents: 'none',
    }}>
      {/* Floating pill */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(28,28,30,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 28,
        height: 62,
        paddingLeft: 8,
        paddingRight: 8,
        pointerEvents: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)',
      }}>
        {TABS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to} to={to} end={end}
            style={{ flex: 1, textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                height: 46,
                borderRadius: 20,
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.18s ease',
                margin: '0 2px',
              }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={22} strokeWidth={isActive ? 2.2 : 1.75} />
                  {to === '/sales' && followupsDue > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -6,
                      minWidth: 15, height: 15, borderRadius: 99,
                      background: '#FF3B30', color: '#fff',
                      fontSize: 8, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                      border: '1.5px solid rgba(28,28,30,0.9)',
                    }}>
                      {followupsDue > 99 ? '99+' : followupsDue}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.1px',
                }}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}

        {/* Mehr */}
        <button
          onClick={onMoreClick}
          style={{
            flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 4, height: 46,
            color: 'rgba(255,255,255,0.45)', borderRadius: 20,
            transition: 'all 0.18s ease',
            margin: '0 2px',
          }}
        >
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.1px' }}>Mehr</span>
        </button>
      </nav>
    </div>
  );
}
