import { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/projects';
import { invoicesApi } from '../api/invoices';
import { timeApi } from '../api/time';
import { calendarApi } from '../api/calendar';
import { workflowApi } from '../api/workflow';
import ProjectTimerButton from '../components/ProjectTimerButton';
import {
  LayoutDashboard, Globe, Briefcase, CalendarDays, Clock, BarChart2,
  ClipboardCheck, PackageCheck, Layers, FileText, ClipboardList,
  Users, UserCog, Settings, LogOut, Zap, Plus, ChevronRight,
  Receipt, CalendarPlus, CheckCircle2, AlertCircle, CalendarRange,
  Square, Euro, Timer, ExternalLink, ArrowRight,
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const INACTIVE = new Set(['completed', 'waiting_for_client', 'waiting', 'deferred']);

const STAT = {
  active:             { label: 'Aktiv',            color: '#0071E3', bg: '#E8F0FE' },
  planned:            { label: 'Geplant',          color: '#636366', bg: '#F2F2F7' },
  waiting_for_client: { label: 'Wartet auf Kunde', color: '#B35A00', bg: '#FFF3E0' },
  waiting:            { label: 'Wartend',          color: '#B35A00', bg: '#FFF3E0' },
  feedback:           { label: 'Feedback',         color: '#C05621', bg: '#FFF5F0' },
  review:             { label: 'Review',           color: '#6D28D9', bg: '#F5F3FF' },
  completed:          { label: 'Fertig',           color: '#1A8F40', bg: '#E8F8EE' },
  deferred:           { label: 'Verschoben',       color: '#64748B', bg: '#F1F5F9' },
};

const AREA_COLORS = {
  1: '#0071E3',
  2: '#7C3AED',
  3: '#059669',
  4: '#F59E0B',
  5: '#EC4899',
  6: '#14B8A6',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmtSec(s) {
  if (!s) return '0h 00m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtCurrency(n) {
  return Number(n || 0).toLocaleString('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  });
}

function fmtHMS(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtTime(iso) {
  if (!iso) return '';
  const t = iso.includes('T') ? iso.split('T')[1] : iso;
  const [h, m] = t.split(':');
  return `${h}:${m}`;
}

function relDate(iso) {
  if (!iso) return '—';
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < -1) return `vor ${Math.abs(diff)} Tagen`;
  if (diff === -1) return 'Gestern';
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Morgen';
  if (diff <= 6) return `in ${diff} Tagen`;
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function relDateShort(iso) {
  if (!iso) return '—';
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < -1) return <span style={{ color: '#FF3B30' }}>Überfällig</span>;
  if (diff === -1) return <span style={{ color: '#FF3B30' }}>Gestern</span>;
  if (diff === 0) return <span style={{ color: '#FF9F0A' }}>Heute</span>;
  if (diff === 1) return <span style={{ color: '#FF9F0A' }}>Morgen</span>;
  if (diff <= 6) return `in ${diff} Tagen`;
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function createdAgo(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff < 7) return `${diff} Tage`;
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function areaColor(areaId) {
  return AREA_COLORS[areaId] || '#0071E3';
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  { label: null, items: [
    { to: '/',               icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/websites',       icon: Globe,           label: 'Websites'      },
    { to: '/projects',       icon: Briefcase,       label: 'Projekte'      },
    { to: '/calendar',       icon: CalendarDays,    label: 'Kalender'      },
    { to: '/time-tracking',  icon: Clock,           label: 'Zeiterfassung' },
    { to: '/timeline',       icon: CalendarRange,   label: 'Timeline'      },
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

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name     = user?.name || user?.email || '?';
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bg       = user?.color || avatarBg(user?.email || '');

  return (
    <aside className="w-[240px] shrink-0 flex flex-col h-screen bg-white/85 backdrop-blur-2xl border-r border-black/[0.06] z-10">
      <div className="px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-[#0071E3] flex items-center justify-center shadow-[0_2px_8px_rgba(0,113,227,0.35)]">
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.3px]">Vecturo</span>
        </div>
      </div>

      <div className="px-4 py-3 shrink-0">
        <button
          onClick={() => navigate('/wizard')}
          className="w-full flex items-center justify-center gap-1.5 py-[9px] px-4 text-[13px] font-medium text-white bg-[#0071E3] rounded-[10px] shadow-[0_1px_3px_rgba(0,113,227,0.3)] transition-all duration-150 hover:bg-[#0077ED] active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={2} />
          Neues Projekt
        </button>
      </div>

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
                      'text-[13.5px] tracking-[-0.01em] cursor-pointer transition-all duration-[120ms]',
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

// ─── STATUS PILL ──────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const s = STAT[status] || STAT.planned;
  return (
    <span
      style={{ background: s.bg, color: s.color }}
      className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-[6px] whitespace-nowrap"
    >
      {s.label}
    </span>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export default function VecturoDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();

  const todayISO  = new Date().toISOString().slice(0, 10);
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend';
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const todayStr  = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const weekdayStr = new Date().toLocaleDateString('de-DE', { weekday: 'long' });

  // ── Live timer elapsed ───────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list().then(r => r.data),
  });

  const { data: timeSummary } = useQuery({
    queryKey: ['time-summary'],
    queryFn: timeApi.summary,
    refetchInterval: 60000,
  });

  const { data: activeTimer } = useQuery({
    queryKey: ['active-timer'],
    queryFn: timeApi.timerActive,
    refetchInterval: 8000,
  });

  const { data: calEvents = [] } = useQuery({
    queryKey: ['calendar-today', todayISO],
    queryFn: () => calendarApi.list({ from: todayISO, to: todayISO }),
  });

  const { data: remindersRaw } = useQuery({
    queryKey: ['dashboard-reminders'],
    queryFn: () => workflowApi.getDashboardReminders().then(r => r.data),
  });

  // ── Live timer tick ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeTimer?.start_time) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(activeTimer.start_time)) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [activeTimer?.start_time]);

  // ── Computed values ──────────────────────────────────────────────────────
  const activeProjects = useMemo(
    () => projects.filter(p => !INACTIVE.has(p.status)),
    [projects]
  );

  const plannedProjects = useMemo(
    () => projects.filter(p => p.status === 'planned'),
    [projects]
  );

  const openInvoices    = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const openAmount      = openInvoices.reduce((s, i) => s + Number(i.total || 0), 0);

  const todaySec  = timeSummary?.today_sec  || 0;
  const weekSec   = timeSummary?.week_sec   || 0;
  const monthSec  = timeSummary?.month_sec  || 0;

  // Open tasks across active projects
  const totalOpenTasks = useMemo(
    () => activeProjects.reduce((s, p) => s + (p.open_tasks_count || 0), 0),
    [activeProjects]
  );

  // Today's calendar events sorted by time
  const todayEvents = useMemo(
    () => [...calEvents]
      .filter(e => !e.all_day)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 4),
    [calEvents]
  );

  const reminders = remindersRaw || [];

  // Upcoming deadlines within 7 days
  const upcomingDeadlines = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);
    return projects
      .filter(p => p.deadline && new Date(p.deadline) <= cutoff && !INACTIVE.has(p.status))
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);
  }, [projects]);

  // Combined follow-ups list (reminders + upcoming deadlines)
  const followUps = useMemo(() => {
    const items = [];
    reminders.slice(0, 3).forEach(r => items.push({
      id: `r-${r.id}`,
      name: r.text || r.note || 'Erinnerung',
      sub: r.project_name || '',
      date: r.due_date,
      type: 'reminder',
      href: r.project_id ? `/websites/${r.project_id}` : null,
    }));
    upcomingDeadlines.slice(0, 3).forEach(p => items.push({
      id: `d-${p.id}`,
      name: p.name,
      sub: p.client_name || '',
      date: p.deadline,
      type: 'deadline',
      href: `/projects/${p.id}`,
    }));
    return items.slice(0, 5);
  }, [reminders, upcomingDeadlines]);

  // Health badge
  const healthState = useMemo(() => {
    if (overdueInvoices.length > 0)
      return { label: `${overdueInvoices.length} überfällig`, ok: false };
    return { label: 'Alles im Griff', ok: true };
  }, [overdueInvoices]);

  // Last 6 projects by created_at
  const recentProjects = useMemo(
    () => [...projects]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 6),
    [projects]
  );

  // Sparkline data for last 7 days (placeholder — use timeSummary if available)
  const sparkData = useMemo(() => {
    const days = timeSummary?.last_7_days;
    if (Array.isArray(days)) return days.map((v, i) => ({ i, h: v / 3600 }));
    // Fallback: zeros
    return Array.from({ length: 7 }, (_, i) => ({ i, h: 0 }));
  }, [timeSummary]);

  // ── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('websites');

  // ── Stop timer ───────────────────────────────────────────────────────────
  async function handleStopTimer() {
    if (!activeTimer?.id) return;
    await timeApi.timerStop(activeTimer.id);
    queryClient.invalidateQueries({ queryKey: ['active-timer'] });
    queryClient.invalidateQueries({ queryKey: ['time-summary'] });
  }

  // ── Card style shorthand ─────────────────────────────────────────────────
  const card = {
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid rgba(0,0,0,0.07)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}>
      <Sidebar />

      {/* ── MAIN SCROLL AREA ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#F5F5F7' }}>

        {/* ── STICKY HEADER ──────────────────────────────────────────────── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          padding: '12px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          {/* Left: greeting + date + health */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                {greeting}{firstName ? `, ${firstName}` : ''}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#86868B' }}>{todayStr}</p>
            </div>
            {/* Health badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 99,
              background: healthState.ok ? '#E8F8EE' : '#FFE5E5',
              color: healthState.ok ? '#1A8F40' : '#FF3B30',
              fontSize: 12, fontWeight: 600,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: healthState.ok ? '#34C759' : '#FF3B30',
                boxShadow: healthState.ok
                  ? '0 0 0 3px rgba(52,199,89,0.2)'
                  : '0 0 0 3px rgba(255,59,48,0.2)',
              }} />
              {healthState.label}
            </span>
          </div>

          {/* Right: quick-action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigate('/wizard')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: '#0071E3', color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', letterSpacing: '-0.01em',
                boxShadow: '0 1px 4px rgba(0,113,227,0.3)',
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Website erstellen
            </button>
            <button
              onClick={() => navigate('/invoices/new')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: '#fff', color: '#1D1D1F',
                border: '1px solid rgba(0,0,0,0.14)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', letterSpacing: '-0.01em',
              }}
            >
              <Receipt size={14} strokeWidth={1.75} />
              Rechnung erstellen
            </button>
          </div>
        </header>

        {/* ── PAGE CONTENT ───────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 28px 48px' }}>

          {/* ── KPI CARDS ROW ──────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>

            {/* Card 1: Websites */}
            <div
              onClick={() => navigate('/websites')}
              style={{ ...card, padding: 20, cursor: 'pointer', transition: 'transform 120ms, box-shadow 120ms' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,113,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={18} color="#0071E3" strokeWidth={1.75} />
                </div>
                <ChevronRight size={15} color="#C7C7CC" strokeWidth={2} />
              </div>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {activeProjects.length}
              </p>
              <p style={{ margin: '4px 0 6px', fontSize: 13, fontWeight: 500, color: '#6E6E73' }}>Aktive Websites</p>
              <p style={{ margin: 0, fontSize: 12, color: '#86868B' }}>
                +{plannedProjects.length} in Planung
              </p>
            </div>

            {/* Card 2: Projekte */}
            <div
              onClick={() => navigate('/projects')}
              style={{ ...card, padding: 20, cursor: 'pointer', transition: 'transform 120ms, box-shadow 120ms' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={18} color="#7C3AED" strokeWidth={1.75} />
                </div>
                <ChevronRight size={15} color="#C7C7CC" strokeWidth={2} />
              </div>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {activeProjects.length}
              </p>
              <p style={{ margin: '4px 0 6px', fontSize: 13, fontWeight: 500, color: '#6E6E73' }}>Aktive Projekte</p>
              <p style={{ margin: 0, fontSize: 12, color: '#86868B' }}>
                {totalOpenTasks} Tasks offen
              </p>
            </div>

            {/* Card 3: Offener Umsatz */}
            <div
              onClick={() => navigate('/invoices')}
              style={{ ...card, padding: 20, cursor: 'pointer', transition: 'transform 120ms, box-shadow 120ms' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Euro size={18} color="#059669" strokeWidth={1.75} />
                </div>
                <ChevronRight size={15} color="#C7C7CC" strokeWidth={2} />
              </div>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {fmtCurrency(openAmount)}
              </p>
              <p style={{ margin: '4px 0 6px', fontSize: 13, fontWeight: 500, color: '#6E6E73' }}>Offener Umsatz</p>
              <p style={{ margin: 0, fontSize: 12, color: overdueInvoices.length > 0 ? '#FF3B30' : '#86868B' }}>
                {openInvoices.length} offene Rechnungen
              </p>
            </div>

            {/* Card 4: Zeit heute */}
            <div
              onClick={() => navigate('/time-tracking')}
              style={{ ...card, padding: 20, cursor: 'pointer', transition: 'transform 120ms, box-shadow 120ms' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} color="#F59E0B" strokeWidth={1.75} />
                </div>
                <ChevronRight size={15} color="#C7C7CC" strokeWidth={2} />
              </div>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {fmtSec(todaySec)}
              </p>
              <p style={{ margin: '4px 0 6px', fontSize: 13, fontWeight: 500, color: '#6E6E73' }}>Heute</p>
              <p style={{ margin: 0, fontSize: 12, color: '#86868B' }}>
                Diese Woche: {fmtSec(weekSec)}
              </p>
            </div>
          </div>

          {/* ── MAIN 2-COLUMN GRID ─────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14 }}>

            {/* ── LEFT: Work Overview Card ─────────────────────────────────── */}
            <div style={{ ...card, overflow: 'hidden' }}>

              {/* Tab bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 0,
                borderBottom: '1px solid rgba(0,0,0,0.07)',
                padding: '0 20px',
              }}>
                {[
                  { key: 'websites', label: 'Websites', icon: '🌐', count: activeProjects.length },
                  { key: 'projects', label: 'Projekte',  icon: '📋', count: activeProjects.length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '14px 4px', marginRight: 24,
                      background: 'none', border: 'none',
                      borderBottom: activeTab === tab.key ? '2px solid #0071E3' : '2px solid transparent',
                      fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                      color: activeTab === tab.key ? '#0071E3' : '#6E6E73',
                      cursor: 'pointer', letterSpacing: '-0.01em',
                      transition: 'color 100ms',
                    }}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '1px 6px', borderRadius: 99,
                      background: activeTab === tab.key ? 'rgba(0,113,227,0.12)' : '#F2F2F7',
                      color: activeTab === tab.key ? '#0071E3' : '#86868B',
                    }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ padding: 20 }}>

                {/* ── WEBSITES TAB ─────────────────────────────────────────── */}
                {activeTab === 'websites' && (
                  <div>
                    {/* Section heading */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>Aktive Websites</p>
                      <button
                        onClick={() => navigate('/websites')}
                        style={{ background: 'none', border: 'none', fontSize: 12, color: '#0071E3', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        Alle ansehen <ArrowRight size={13} strokeWidth={2} />
                      </button>
                    </div>

                    {/* Website cards grid */}
                    {activeProjects.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: '#86868B', fontSize: 13 }}>
                        Noch keine Projekte vorhanden.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 24 }}>
                        {activeProjects.slice(0, 6).map(p => {
                          const color = areaColor(p.area_id);
                          const st = STAT[p.status] || STAT.planned;
                          return (
                            <div
                              key={p.id}
                              onClick={() => navigate(`/websites/${p.id}`)}
                              style={{
                                borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
                                overflow: 'hidden', cursor: 'pointer',
                                transition: 'box-shadow 120ms, transform 120ms',
                                background: '#fff',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                            >
                              {/* Colored top border */}
                              <div style={{ height: 3, background: color }} />
                              <div style={{ padding: '12px 14px 10px' }}>
                                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.name}
                                </p>
                                <p style={{ margin: '0 0 8px', fontSize: 11, color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.client_name || '—'}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: p.live_url ? 8 : 0 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, color: st.color, fontWeight: 500 }}>{st.label}</span>
                                </div>
                                {p.live_url && (
                                  <a
                                    href={p.live_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#0071E3', textDecoration: 'none', overflow: 'hidden' }}
                                  >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                                      {p.live_url.replace(/^https?:\/\//, '')}
                                    </span>
                                    <ExternalLink size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
                                  </a>
                                )}
                                <div style={{ marginTop: 10, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 8 }}>
                                  <button
                                    onClick={e => { e.stopPropagation(); navigate(`/websites/${p.id}`); }}
                                    style={{ background: 'none', border: 'none', fontSize: 11, color: '#0071E3', fontWeight: 500, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}
                                  >
                                    Öffnen <ArrowRight size={11} strokeWidth={2} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Zuletzt hinzugefügt */}
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>Zuletzt hinzugefügt</p>
                      {recentProjects.length === 0 ? (
                        <p style={{ fontSize: 12, color: '#86868B', margin: 0 }}>Keine Projekte vorhanden.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['Name', 'Kunde', 'Status', 'Datum'].map(h => (
                                <th key={h} style={{ padding: '4px 10px 6px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {recentProjects.map(p => (
                              <tr
                                key={p.id}
                                onClick={() => navigate(`/websites/${p.id}`)}
                                style={{ cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
                                onMouseLeave={e => e.currentTarget.style.background = ''}
                              >
                                <td style={{ padding: '7px 10px', fontSize: 12.5, fontWeight: 500, color: '#1D1D1F', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                                <td style={{ padding: '7px 10px', fontSize: 12.5, color: '#6E6E73', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.client_name || '—'}</td>
                                <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}><StatusPill status={p.status} /></td>
                                <td style={{ padding: '7px 10px', fontSize: 12.5, color: '#86868B', whiteSpace: 'nowrap' }}>{createdAgo(p.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ── PROJECTS TAB ─────────────────────────────────────────── */}
                {activeTab === 'projects' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>Aktive Projekte</p>
                      <button
                        onClick={() => navigate('/projects')}
                        style={{ background: 'none', border: 'none', fontSize: 12, color: '#0071E3', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        Alle ansehen <ArrowRight size={13} strokeWidth={2} />
                      </button>
                    </div>

                    {activeProjects.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: '#86868B', fontSize: 13 }}>
                        Keine aktiven Projekte.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {activeProjects.slice(0, 8).map(p => {
                          const color = areaColor(p.area_id);
                          const done  = p.completed_tasks_count || 0;
                          const total = (p.open_tasks_count || 0) + done;
                          const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                          const isOverdue = p.deadline && new Date(p.deadline) < new Date();

                          return (
                            <div
                              key={p.id}
                              onClick={() => navigate(`/projects/${p.id}`)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                border: '1px solid rgba(0,0,0,0.06)', background: '#fff',
                                transition: 'background 100ms',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                            >
                              {/* Dot */}
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />

                              {/* Name */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.name}
                                </p>
                                {/* Progress bar */}
                                <div style={{ marginTop: 5, height: 4, background: '#F2F2F7', borderRadius: 99, overflow: 'hidden', width: '100%' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 300ms' }} />
                                </div>
                              </div>

                              {/* Task count */}
                              <span style={{ fontSize: 11, color: '#86868B', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {done}/{total}
                              </span>

                              {/* Status */}
                              <StatusPill status={p.status} />

                              {/* Deadline */}
                              {p.deadline && (
                                <span style={{ fontSize: 11, color: isOverdue ? '#FF3B30' : '#86868B', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {new Date(p.deadline).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                                </span>
                              )}

                              {/* Timer button */}
                              <div onClick={e => e.stopPropagation()}>
                                <ProjectTimerButton projectId={p.id} projectName={p.name} size="sm" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Card A: Timer & Zeit */}
              <div style={{ ...card, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
                    Timer & Zeit
                  </p>
                  <button
                    onClick={() => navigate('/time-tracking')}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#0071E3', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Details
                  </button>
                </div>

                {/* Active timer or idle */}
                {activeTimer?.start_time ? (
                  <div style={{
                    background: 'rgba(255,59,48,0.06)', borderRadius: 12, padding: '14px 16px',
                    border: '1px solid rgba(255,59,48,0.15)', marginBottom: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#FF3B30', flexShrink: 0,
                        animation: 'pulse 1.5s infinite',
                        boxShadow: '0 0 0 0 rgba(255,59,48,0.4)',
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#FF3B30', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Läuft
                      </span>
                    </div>
                    <p style={{ margin: '0 0 2px', fontSize: 28, fontWeight: 700, color: '#FF3B30', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtHMS(elapsed)}
                    </p>
                    {activeTimer.project_name && (
                      <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6E6E73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeTimer.project_name}
                      </p>
                    )}
                    <button
                      onClick={handleStopTimer}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8,
                        background: '#FF3B30', color: '#fff',
                        border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Square size={11} strokeWidth={2.5} />
                      Stoppen
                    </button>
                  </div>
                ) : (
                  <div style={{
                    background: '#F5F5F7', borderRadius: 12, padding: '14px 16px',
                    marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: '#6E6E73' }}>Kein aktiver Timer</p>
                    </div>
                    <button
                      onClick={() => navigate('/time-tracking')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 8,
                        background: '#fff', color: '#1D1D1F',
                        border: '1px solid rgba(0,0,0,0.12)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      <Timer size={13} strokeWidth={1.75} />
                      Starten
                    </button>
                  </div>
                )}

                {/* Time stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Heute',  val: fmtSec(todaySec),  color: '#F59E0B' },
                    { label: 'Woche',  val: fmtSec(weekSec),   color: '#0071E3' },
                    { label: 'Monat',  val: fmtSec(monthSec),  color: '#059669' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '8px 4px', background: '#F5F5F7', borderRadius: 8 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{val}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#86868B', fontWeight: 500 }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Sparkline: last 7 days */}
                <div style={{ height: 60 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0071E3" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#0071E3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        formatter={v => [`${v.toFixed(1)}h`, 'Zeit']}
                        contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                      />
                      <Area type="monotone" dataKey="h" stroke="#0071E3" strokeWidth={1.5} fill="url(#timeGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card B: Heute im Kalender */}
              <div style={{ ...card, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
                    Heute, {weekdayStr}
                  </p>
                  <button
                    onClick={() => navigate('/calendar')}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#0071E3', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <CalendarPlus size={13} strokeWidth={1.75} />
                    Termin
                  </button>
                </div>

                {todayEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#86868B' }}>
                    <CalendarDays size={24} color="#D1D1D6" strokeWidth={1.25} style={{ marginBottom: 6 }} />
                    <p style={{ margin: 0, fontSize: 12.5 }}>Keine Termine heute</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {todayEvents.map((ev, i) => (
                      <div
                        key={ev.id || i}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 9,
                          background: '#F5F5F7',
                        }}
                      >
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6E6E73', flexShrink: 0, minWidth: 36, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtTime(ev.start_time)}
                        </span>
                        <span style={{ width: 3, height: 28, borderRadius: 99, background: ev.color || '#0071E3', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.title}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card C: Follow-ups & Deadlines */}
              <div style={{ ...card, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
                    Follow-ups & Fristen
                  </p>
                  {followUps.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#FF9F0A', background: '#FFF8E8', padding: '2px 8px', borderRadius: 99 }}>
                      {followUps.length}
                    </span>
                  )}
                </div>

                {followUps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: '#86868B' }}>
                    <CheckCircle2 size={24} color="#34C759" strokeWidth={1.5} style={{ marginBottom: 6 }} />
                    <p style={{ margin: 0, fontSize: 12.5, color: '#1D1D1F', fontWeight: 500 }}>Alles erledigt</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {followUps.map(item => (
                      <div
                        key={item.id}
                        onClick={() => item.href && navigate(item.href)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 9,
                          background: item.type === 'reminder' ? '#FFF8E8' : '#F5F5F7',
                          cursor: item.href ? 'pointer' : 'default',
                          transition: 'opacity 100ms',
                        }}
                        onMouseEnter={e => { if (item.href) e.currentTarget.style.opacity = '0.8'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = ''; }}
                      >
                        {item.type === 'reminder'
                          ? <AlertCircle size={13} color="#FF9F0A" strokeWidth={2} style={{ flexShrink: 0 }} />
                          : <CalendarRange size={13} color="#6E6E73" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </p>
                          {item.sub && (
                            <p style={{ margin: 0, fontSize: 11, color: '#6E6E73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.sub}
                            </p>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: '#86868B', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {relDateShort(item.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTTOM: Zuletzt aktiv table ─────────────────────────────────── */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
                Zuletzt aktiv
              </p>
              <button
                onClick={() => navigate('/projects')}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#0071E3', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                Alle Projekte <ChevronRight size={13} strokeWidth={2} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {['Name', 'Kunde', 'Status', 'Zuletzt'].map(h => (
                      <th key={h} style={{ padding: '8px 20px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: '#86868B' }}>
                        Noch keine Projekte angelegt.
                      </td>
                    </tr>
                  )}
                  {recentProjects.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/websites/${p.id}`)}
                      style={{
                        borderBottom: i < recentProjects.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                        cursor: 'pointer', transition: 'background 80ms',
                        background: i % 2 === 1 ? '#FAFAFA' : '#fff',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#FAFAFA' : '#fff'}
                    >
                      <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 500, color: '#1D1D1F', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '11px 20px', fontSize: 13, color: '#6E6E73', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.client_name || '—'}
                      </td>
                      <td style={{ padding: '11px 20px', whiteSpace: 'nowrap' }}>
                        <StatusPill status={p.status} />
                      </td>
                      <td style={{ padding: '11px 20px', fontSize: 13, color: '#86868B', whiteSpace: 'nowrap' }}>
                        {createdAgo(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* ── Pulsing animation keyframes ───────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,59,48,0.4); }
          70%  { box-shadow: 0 0 0 6px rgba(255,59,48,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,59,48,0); }
        }
      `}</style>
    </div>
  );
}
