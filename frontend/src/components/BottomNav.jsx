import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Flame, FolderKanban, FileText, MoreHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../api/sales';

const TABS = [
  { to: '/',        icon: LayoutDashboard, label: 'Home',     end: true },
  { to: '/sales',   icon: Flame,           label: 'Sales',    end: false },
  { to: '/work',    icon: FolderKanban,    label: 'Arbeit',   end: false },
  { to: '/invoices',icon: FileText,        label: 'Finanzen', end: false },
];

export default function BottomNav({ onMoreClick }) {
  const { data: stats } = useQuery({
    queryKey: ['sales-stats'],
    queryFn: salesApi.stats,
    refetchInterval: 60000,
  });

  const followupsDue = stats?.followups_due || 0;

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0,0,0,0.08)',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to} to={to} end={end}
          style={{ flex: 1, textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, height: '100%',
              color: isActive ? '#0071E3' : '#86868B',
            }}>
              <div style={{ position: 'relative' }}>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.75} />
                {to === '/sales' && followupsDue > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    minWidth: 16, height: 16, borderRadius: 99,
                    background: '#FF3B30', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                  }}>
                    {followupsDue > 99 ? '99+' : followupsDue}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{label}</span>
            </div>
          )}
        </NavLink>
      ))}

      {/* Mehr */}
      <button
        onClick={onMoreClick}
        style={{
          flex: 1, border: 'none', background: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 3, color: '#86868B',
        }}
      >
        <MoreHorizontal size={22} strokeWidth={1.75} />
        <span style={{ fontSize: 10, fontWeight: 400 }}>Mehr</span>
      </button>
    </nav>
  );
}
