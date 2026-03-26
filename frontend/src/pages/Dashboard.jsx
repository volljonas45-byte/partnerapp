import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Globe, Briefcase, CalendarDays, Clock, BarChart2,
  ClipboardCheck, PackageCheck, Layers, FileText, ClipboardList,
  Users, UserCog, Settings, LogOut, Zap, Plus, ChevronRight,
  Globe2, Receipt, UserPlus, CalendarPlus, CheckCircle2,
} from 'lucide-react';

// ─── STATIC MOCK DATA ─────────────────────────────────────────────
const D = {
  activeWebsites: 5,
  totalWebsites: 6,
  openAmount: 0,
  openCount: 0,
  followUps: 0,
  weekSec: 55800,      // 15h 30m
  todaySec: 14400,     // 4h
  weekGoalSec: 144000, // 40h
  finance: { open: 0, overdue: 0, paid: 2850 },
  websites: [
    { id: 1, name: 'muster-baecker.de',      client: 'Muster Bäckerei',  status: 'active',  last: 'Heute'   },
    { id: 2, name: 'autohaus-schmidt.de',     client: 'Autohaus Schmidt', status: 'active',  last: 'Gestern' },
    { id: 3, name: 'praxis-mueller.de',       client: 'Dr. Müller',       status: 'planned', last: '3 Tage'  },
    { id: 4, name: 'steuerberatung-bauer.de', client: 'Kanzlei Bauer',    status: 'active',  last: 'Heute'   },
    { id: 5, name: 'yoga-studio-berlin.de',   client: 'Yoga Berlin',      status: 'active',  last: 'Heute'   },
  ],
  events: [
    { time: '09:00', title: 'Kick-off Autohaus Schmidt', color: '#0071E3' },
    { time: '14:00', title: 'Review Yoga Studio',        color: '#34C759' },
    { time: '16:30', title: 'Abnahme Dr. Müller',        color: '#FF9F0A' },
  ],
};

// ─── HELPERS ──────────────────────────────────────────────────────
const fmt = sec => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const STAT = {
  active:    { label: 'Aktiv',   tw: 'bg-[#E8F8EE] text-[#1A8F40]' },
  planned:   { label: 'Geplant', tw: 'bg-[#E8F0FE] text-[#0057B8]' },
  waiting:   { label: 'Wartend', tw: 'bg-[#FFF3E0] text-[#B35A00]' },
  completed: { label: 'Fertig',  tw: 'bg-[#F2F2F7] text-[#636366]' },
};

// ─── DONUT CHART ──────────────────────────────────────────────────
function Donut({ value, max, color = '#0071E3', size = 80, sw = 8 }) {
  const r    = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F2F2F7" strokeWidth={sw} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

// ─── SIDEBAR NAV ──────────────────────────────────────────────────
const NAV_GROUPS = [
  { label: null, items: [
    { to: '/',               icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/websites',       icon: Globe,           label: 'Websites'      },
    { to: '/projects',       icon: Briefcase,       label: 'Projekte'      },
    { to: '/calendar',       icon: CalendarDays,    label: 'Kalender'      },
    { to: '/time-tracking',  icon: Clock,           label: 'Zeiterfassung' },
    { to: '/team-dashboard', icon: BarChart2,       label: 'Team'          },
  ]},
  { label: 'Workflow', items: [
    { to: '/intake',     icon: ClipboardCheck, label: 'Intake'     },
    { to: '/delivery',   icon: PackageCheck,   label: 'Übergabe'   },
    { to: '/onboarding', icon: Layers,         label: 'Onboarding' },
  ]},
  { label: 'Finanzen', items: [
    { to: '/invoices', icon: FileText,      label: 'Rechnungen' },
    { to: '/quotes',   icon: ClipboardList, label: 'Angebote'   },
  ]},
  { label: 'Verwaltung', items: [
    { to: '/clients',  icon: Users,    label: 'Kunden'        },
    { to: '/team',     icon: UserCog,  label: 'Team'          },
    { to: '/settings', icon: Settings, label: 'Einstellungen' },
  ]},
];

function avatarBg(s = '') {
  const cs = ['#BF5AF2', '#0071E3', '#34C759', '#FF9500', '#FF3B30'];
  let h = 0;
  for (const c of s) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
}

// ─── SIDEBAR ──────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name     = user?.name || user?.email || '?';
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bg       = user?.color || avatarBg(user?.email || '');

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

      {/* CTA */}
      <div className="px-4 py-3 shrink-0">
        <button
          onClick={() => navigate('/wizard')}
          className="w-full flex items-center justify-center gap-1.5 py-[9px] px-4 text-[13px] font-medium text-white bg-[#0071E3] rounded-[10px] shadow-[0_1px_3px_rgba(0,113,227,0.3)] transition-all duration-150 hover:bg-[#0077ED] active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={2} />
          Neues Projekt
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {NAV_GROUPS.map((g, gi) => (
          <div key={gi}>
            {g.label && (
              <p className="px-3 pt-4 pb-1.5 text-[10.5px] font-semibold text-[#86868B] uppercase tracking-[0.08em] select-none">
                {g.label}
              </p>
            )}
            <div className="space-y-0.5">
              {g.items.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/'} className="block no-underline">
                  {({ isActive }) => (
                    <div className={[
                      'relative flex items-center gap-2.5 px-3 py-[7px] rounded-[10px]',
                      'text-[13.5px] tracking-[-0.01em] cursor-pointer',
                      'transition-all duration-[120ms]',
                      isActive
                        ? 'bg-[#E8F0FE] text-[#0071E3] font-medium'
                        : 'text-[#424245] font-normal hover:bg-black/[0.04] hover:text-[#1D1D1F]',
                    ].join(' ')}>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-[#0071E3] rounded-r-full" />
                      )}
                      <Icon size={15} color={isActive ? '#0071E3' : '#86868B'} strokeWidth={isActive ? 2 : 1.75} />
                      <span>{label}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-black/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-[10px] mb-1">
          <div className="relative shrink-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
              style={{ background: bg }}
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

// ─── DASHBOARD ────────────────────────────────────────────────────
export default function VecturoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend';
  const first    = user?.name?.split(' ')[0] || 'Jonas';
  const todayStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div
      className="flex h-screen bg-[#F5F5F7] overflow-hidden"
      style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}
    >
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-8 py-8 pb-16">

          {/* ── HEADER ─────────────────────────────────────────── */}
          <header className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-[22px] font-semibold text-[#1D1D1F] tracking-[-0.3px] leading-none">
                {greeting}, {first}
              </h1>
              <p className="text-[14px] text-[#6E6E73] mt-1.5">{todayStr}</p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="w-[7px] h-[7px] rounded-full bg-[#34C759] block" />
                <span className="text-[12px] font-medium text-[#34C759] tracking-[0.1px]">Alles im Griff</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate('/wizard')}
                className="flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-medium text-[#0071E3] bg-white border border-[#0071E3]/25 rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-[#E8F0FE] transition-all duration-150 active:scale-[0.98]"
              >
                <Globe size={14} strokeWidth={1.75} />
                Website erstellen
              </button>
              <button
                onClick={() => navigate('/invoices/new')}
                className="flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-medium text-white bg-[#0071E3] rounded-[10px] shadow-[0_1px_3px_rgba(0,113,227,0.25)] hover:bg-[#0077ED] transition-all duration-150 active:scale-[0.98]"
              >
                <Receipt size={14} strokeWidth={1.75} />
                Rechnung erstellen
              </button>
            </div>
          </header>

          {/* ── KPI ROW ────────────────────────────────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-[#1D1D1F] rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <Globe size={15} color="#636366" strokeWidth={1.75} />
                <span className="text-[10.5px] font-semibold text-[#636366] uppercase tracking-[0.2px]">
                  Aktive Websites
                </span>
              </div>
              <p className="text-[32px] font-bold text-white tracking-[-0.5px] leading-none">{D.activeWebsites}</p>
              <p className="text-[13px] text-[#636366] mt-2">von {D.totalWebsites} gesamt</p>
            </div>

            <div className="bg-white rounded-[14px] p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-px transition-all duration-150">
              <div className="flex items-center justify-between mb-4">
                <FileText size={15} color="#86868B" strokeWidth={1.75} />
                <span className="text-[10.5px] font-semibold text-[#86868B] uppercase tracking-[0.2px]">
                  Offener Umsatz
                </span>
              </div>
              <p className="text-[32px] font-bold text-[#1D1D1F] tracking-[-0.5px] leading-none">
                {D.openAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })}
              </p>
              <p className="text-[13px] text-[#6E6E73] mt-2">
                {D.openCount === 0
                  ? 'Keine offenen Rechnungen'
                  : `${D.openCount} Rechnung${D.openCount !== 1 ? 'en' : ''} offen`}
              </p>
            </div>

            <div className="bg-white rounded-[14px] p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-px transition-all duration-150">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle2 size={15} color="#86868B" strokeWidth={1.75} />
                <span className="text-[10.5px] font-semibold text-[#86868B] uppercase tracking-[0.2px]">
                  Follow-ups heute
                </span>
              </div>
              <p className="text-[32px] font-bold text-[#1D1D1F] tracking-[-0.5px] leading-none">{D.followUps}</p>
              <p className="text-[13px] text-[#6E6E73] mt-2">Keine fälligen</p>
            </div>
          </section>

          {/* ── WEBSITES ───────────────────────────────────────── */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.1px]">Aktive Websites</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold text-[#6E6E73] bg-[#F2F2F7] rounded-full">
                  {D.activeWebsites}
                </span>
              </div>
              <button
                onClick={() => navigate('/websites')}
                className="flex items-center gap-0.5 text-[13px] text-[#0071E3] font-medium hover:opacity-70 transition-opacity"
              >
                Alle <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>

            <div
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {D.websites.map(w => {
                const st = STAT[w.status] || STAT.active;
                return (
                  <div
                    key={w.id}
                    onClick={() => navigate(`/websites/${w.id}`)}
                    className="shrink-0 w-[208px] bg-white rounded-[14px] p-4 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-px transition-all duration-150 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-[11px] bg-[#F2F2F7] flex items-center justify-center mb-3">
                      <Globe2 size={20} color="#86868B" strokeWidth={1.5} />
                    </div>
                    <p className="text-[13.5px] font-semibold text-[#1D1D1F] truncate leading-snug">{w.client}</p>
                    <p className="text-[12px] text-[#6E6E73] truncate mt-0.5 mb-3">{w.name}</p>
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-[6px] ${st.tw}`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}

              <button
                onClick={() => navigate('/wizard')}
                className="shrink-0 w-[208px] border-2 border-dashed border-black/[0.12] rounded-[14px] p-4 flex flex-col items-center justify-center gap-2 hover:border-[#0071E3]/35 hover:bg-[#E8F0FE]/30 transition-all duration-150 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-[11px] bg-[#F2F2F7] group-hover:bg-[#E8F0FE] flex items-center justify-center transition-colors">
                  <Plus size={20} color="#86868B" strokeWidth={1.75} />
                </div>
                <span className="text-[12.5px] font-medium text-[#6E6E73]">Website erstellen</span>
              </button>
            </div>
          </section>

          {/* ── MIDDLE: 60 / 40 ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 mb-3">

            {/* Table */}
            <div className="bg-white rounded-[14px] border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                <h2 className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.1px]">Websites Übersicht</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-black/[0.05]">
                    <tr>
                      {['Name', 'Kunde', 'Status', 'Zuletzt'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.2px] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {D.websites.map((w, i) => {
                      const st = STAT[w.status] || STAT.active;
                      return (
                        <tr
                          key={w.id}
                          onClick={() => navigate(`/websites/${w.id}`)}
                          className={[
                            'border-b border-black/[0.04] last:border-0 cursor-pointer',
                            'hover:bg-[#F5F5F7] transition-colors duration-100',
                            i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white',
                          ].join(' ')}
                        >
                          <td className="px-5 py-3 text-[13px] font-medium text-[#1D1D1F] max-w-[200px] truncate">{w.name}</td>
                          <td className="px-5 py-3 text-[13px] text-[#6E6E73] max-w-[160px] truncate">{w.client}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-[6px] ${st.tw}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[13px] text-[#6E6E73] whitespace-nowrap">{w.last}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: stacked cards */}
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-[14px] p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.1px]">Finanzen</h2>
                  <button
                    onClick={() => navigate('/invoices')}
                    className="flex items-center gap-0.5 text-[12px] text-[#0071E3] font-medium hover:opacity-70 transition-opacity"
                  >
                    Alle <ChevronRight size={13} strokeWidth={2} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Offen',      val: D.finance.open,    color: '#FF9F0A', bg: '#FFF8E8' },
                    { label: 'Überfällig', val: D.finance.overdue, color: '#FF3B30', bg: '#FFE5E5' },
                    { label: 'Bezahlt',    val: D.finance.paid,    color: '#34C759', bg: '#E8F8EE' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} className="flex flex-col items-center py-3 px-2 rounded-[10px]" style={{ background: bg }}>
                      <p className="text-[18px] font-bold leading-none" style={{ color }}>
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </p>
                      <p className="text-[11px] font-medium text-[#6E6E73] mt-1 text-center leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[14px] p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex-1 flex flex-col items-center justify-center text-center py-8">
                <CheckCircle2 size={28} color="#D1D1D6" strokeWidth={1.25} />
                <p className="text-[13.5px] font-medium text-[#1D1D1F] mt-3">Keine Follow-ups</p>
                <p className="text-[12px] text-[#6E6E73] mt-1">Heute ist alles erledigt.</p>
              </div>
            </div>
          </div>

          {/* ── BOTTOM ROW ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Time Tracking */}
            <div className="bg-white rounded-[14px] p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.1px]">Zeiterfassung</h2>
                <button
                  onClick={() => navigate('/time-tracking')}
                  className="text-[12px] text-[#0071E3] font-medium hover:opacity-70 transition-opacity"
                >
                  Details
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Donut value={D.weekSec} max={D.weekGoalSec} color="#0071E3" size={80} sw={8} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clock size={16} color="#86868B" strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <p className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.4px] leading-none">{fmt(D.weekSec)}</p>
                  <p className="text-[12px] text-[#6E6E73] mt-1">Diese Woche</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-[#34C759] block shrink-0" />
                    <span className="text-[12px] text-[#6E6E73]">{fmt(D.todaySec)} heute</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kalender heute */}
            <div className="bg-white rounded-[14px] p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.1px]">Heute</h2>
                <button
                  onClick={() => navigate('/calendar')}
                  className="flex items-center gap-0.5 text-[12px] text-[#0071E3] font-medium hover:opacity-70 transition-opacity"
                >
                  Kalender <ChevronRight size={13} strokeWidth={2} />
                </button>
              </div>
              <div className="space-y-1">
                {D.events.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2 rounded-[10px] hover:bg-[#F5F5F7] transition-colors cursor-default"
                  >
                    <span className="w-[3px] h-9 rounded-full shrink-0" style={{ background: ev.color }} />
                    <div>
                      <p className="text-[13px] font-medium text-[#1D1D1F] leading-snug">{ev.title}</p>
                      <p className="text-[11px] text-[#6E6E73]">{ev.time} Uhr</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schnellaktionen */}
            <div className="bg-white rounded-[14px] p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <h2 className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.1px] mb-4">Schnellaktionen</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Globe,        label: 'Website',  cb: () => navigate('/wizard')       },
                  { icon: Receipt,      label: 'Rechnung', cb: () => navigate('/invoices/new') },
                  { icon: UserPlus,     label: 'Kunde',    cb: () => navigate('/clients/new')  },
                  { icon: CalendarPlus, label: 'Termin',   cb: () => navigate('/calendar')     },
                ].map(({ icon: Icon, label, cb }) => (
                  <button
                    key={label}
                    onClick={cb}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-[12px] bg-[#F5F5F7] text-[#424245] hover:bg-[#E8F0FE] hover:text-[#0071E3] transition-all duration-150 active:scale-[0.97] cursor-pointer"
                  >
                    <Icon size={22} strokeWidth={1.5} />
                    <span className="text-[12px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
