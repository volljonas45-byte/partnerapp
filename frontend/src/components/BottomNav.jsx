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
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 8,
      zIndex: 100,
      pointerEvents: 'none',
    }}>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(22,22,24,0.88)',
        backdropFilter: 'saturate(180%) blur(24px)',
        WebkitBackdropFilter: 'saturate(180%) blur(24px)',
        borderRadius: 24,
        height: 58,
        paddingLeft: 6,
        paddingRight: 6,
        pointerEvents: 'auto',
        border: '0.5px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
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
                gap: 3,
                height: 44,
                borderRadius: 16,
                background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.40)',
                transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                margin: '0 2px',
              }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  {to === '/sales' && followupsDue > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -6,
                      minWidth: 14, height: 14, borderRadius: 99,
                      background: '#FF3B30', color: '#fff',
                      fontSize: 8, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                      border: '1.5px solid rgba(22,22,24,0.88)',
                    }}>
                      {followupsDue > 99 ? '99+' : followupsDue}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '-0.01em',
                }}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}

        <button
          onClick={onMoreClick}
          style={{
            flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, height: 44,
            color: 'rgba(255,255,255,0.40)', borderRadius: 16,
            transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
            margin: '0 2px',
          }}
        >
          <MoreHorizontal size={20} strokeWidth={1.5} />
          <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: '-0.01em' }}>Mehr</span>
        </button>
      </nav>
    </div>
  );
}
