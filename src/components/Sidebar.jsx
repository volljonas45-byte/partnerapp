import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, DollarSign, LogOut, Sparkles, Building2, Smartphone, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import InstallGuide from './InstallGuide';
import GlobalSearch from './GlobalSearch';

const D = {
  bg: '#070C15', border: 'rgba(255,255,255,0.07)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#3B82F6', accentL: 'rgba(59,130,246,0.12)',
  violet: '#38BDF8', violetL: 'rgba(56,189,248,0.1)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.1)',
  card: '#0D1525',
};

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/leads/mine',   icon: Briefcase,       label: 'Meine Leads'  },
  { to: '/customers',    icon: Building2,       label: 'Meine Kunden' },
  { to: '/leads/pool',   icon: Users,           label: 'Lead-Pool'    },
  { to: '/earnings',     icon: DollarSign,      label: 'Verdienste'   },
  { to: '/training',     icon: GraduationCap,   label: 'Training'     },
  { to: '/ai-chat',      icon: Sparkles,        label: 'KI-Assistent', accent: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [showInstall, setShowInstall] = useState(false);
  const initials = (user?.name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        height: '100vh', background: D.bg, borderRight: `0.5px solid ${D.border}`, zIndex: 10 }}>

        <div style={{ padding: '20px 18px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: D.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff' }}>P</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>
            Partner-Portal
          </span>
        </div>

        <GlobalSearch />

        <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV.map(({ to, icon: Icon, label, accent }) => (
            <NavLink key={to} to={to} end={to === '/'} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  borderRadius: 9, fontSize: 13, cursor: 'pointer',
                  background: isActive ? (accent ? D.violetL : D.accentL) : 'transparent',
                  color: isActive ? (accent ? D.violet : D.accent) : D.text2,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'background 0.15s, color 0.15s' }}>
                  <Icon size={16} color={isActive ? (accent ? D.violet : D.accent) : D.text3} strokeWidth={isActive ? 2 : 1.5} />
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '8px 10px 14px', borderTop: `0.5px solid ${D.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: D.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: D.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={() => setShowInstall(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', fontSize: 13, color: D.text3, borderRadius: 9,
              border: 'none', background: 'none', cursor: 'pointer', marginBottom: 2 }}>
            <Smartphone size={14} strokeWidth={1.5} /> App installieren
          </button>
          <button onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', fontSize: 13, color: D.text3, borderRadius: 9,
              border: 'none', background: 'none', cursor: 'pointer' }}>
            <LogOut size={14} strokeWidth={1.5} /> Abmelden
          </button>
        </div>
      </aside>

      {showInstall && <InstallGuide onClose={() => setShowInstall(false)} />}
    </>
  );
}
