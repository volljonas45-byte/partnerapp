import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobile } from '../hooks/useMobile';
import BottomNav from '../components/BottomNav';
import MobileDrawer from '../components/MobileDrawer';
import SharedSidebar from '../components/Sidebar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { projectsApi } from '../api/projects';
import { invoicesApi } from '../api/invoices';
import { timeApi } from '../api/time';
import { calendarApi } from '../api/calendar';
import { workflowApi } from '../api/workflow';
import {
  Globe, Briefcase, CalendarDays, Clock, BarChart2, FolderKanban,
  ClipboardCheck, PackageCheck, Layers, FileText, ClipboardList,
  Users, UserCog, Settings, Zap, Plus, ChevronRight,
  Globe2, Receipt, UserPlus, CalendarPlus, CheckCircle2, AlertCircle,
  CalendarRange, Flame,
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────
const INACTIVE = new Set(['completed', 'waiting_for_client', 'waiting', 'deferred']);

const STAT = {
  active:             { label: 'Aktiv',            tw: 'bg-[#E8F0FE] text-[#0057B8]' },
  planned:            { label: 'Geplant',          tw: 'bg-[#F2F2F7] text-[#636366]' },
  waiting_for_client: { label: 'Wartet auf Kunde', tw: 'bg-[#FFF3E0] text-[#B35A00]' },
  waiting:            { label: 'Wartend',          tw: 'bg-[#FFF3E0] text-[#B35A00]' },
  feedback:           { label: 'Feedback',         tw: 'bg-orange-50 text-orange-700' },
  review:             { label: 'Review',           tw: 'bg-violet-50 text-violet-700' },
  completed:          { label: 'Fertig',           tw: 'bg-[#E8F8EE] text-[#1A8F40]' },
  deferred:           { label: 'Verschoben',       tw: 'bg-[#F1F5F9] text-[#64748B]' },
};

// ─── HELPERS ──────────────────────────────────────────────────────
const fmt = sec => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
};

function relDate(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff < 7) return `${diff} Tage`;
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function fmtTime(iso) {
  if (!iso) return '';
  const t = iso.includes('T') ? iso.split('T')[1] : iso;
  const [h, m] = t.split(':');
  return `${h}:${m}`;
}

function fmtCurrency(n) {
  return Number(n || 0).toLocaleString('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
  });
}

// ─── DONUT CHART ──────────────────────────────────────────────────
function Donut({ value, max, color = '#0071E3', size = 80, sw = 8, trackColor }) {
  const r    = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor || '#F2F2F7'} strokeWidth={sw} />
      {pct > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────
export default function VecturoDashboard() {
  const { user } = useAuth();
  const { c, isDark } = useTheme();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend';
  const first    = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const todayStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Queries ───────────────────────────────────────────────────
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

  const { data: calEvents = [] } = useQuery({
    queryKey: ['calendar-today', todayISO],
    queryFn: () => calendarApi.list({ from: todayISO, to: todayISO }),
  });

  const { data: remindersRaw } = useQuery({
    queryKey: ['dashboard-reminders'],
    queryFn: () => workflowApi.getDashboardReminders().then(r => r.data),
  });
  const reminders = remindersRaw || [];

  // ── Derived values ────────────────────────────────────────────
  // Only truly "Aktiv" for the scroll row
  const activeProjects = useMemo(
    () => projects.filter(p => p.status === 'active'),
    [projects]
  );

  // Last 6 recently created/modified projects for the overview table
  const recentProjects = useMemo(
    () => [...projects]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 6),
    [projects]
  );

  const openInvoices    = invoices.filter(i => ['sent', 'draft', 'unpaid'].includes(i.status));
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const paidAmount      = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const openAmount      = [...openInvoices, ...overdueInvoices]
    .reduce((s, i) => s + Number(i.total || 0), 0);

  const weekSec  = timeSummary?.week_sec  || 0;
  const todaySec = timeSummary?.today_sec || 0;

  const dueReminders = useMemo(
    () => reminders.filter(r => !r.due_date || r.due_date <= todayISO),
    [reminders, todayISO]
  );

  const todayEvents = useMemo(
    () => calEvents
      .filter(e => !e.all_day)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 3),
    [calEvents]
  );

  // Health status pill
  const healthState = useMemo(() => {
    if (overdueInvoices.length > 0) return {
      label: `${overdueInvoices.length} überfällige Rechnung${overdueInvoices.length > 1 ? 'en' : ''}`,
      color: '#FF3B30',
      bg: isDark ? 'rgba(255,69,58,0.15)' : '#FFE5E5',
    };
    if (dueReminders.length > 0) return {
      label: `${dueReminders.length} Follow-up${dueReminders.length > 1 ? 's' : ''} fällig`,
      color: '#FF9F0A',
      bg: isDark ? 'rgba(255,159,10,0.15)' : '#FFF8E8',
    };
    return { label: 'Alles im Griff', color: '#34C759', bg: null };
  }, [overdueInvoices, dueReminders, isDark]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className={isMobile ? "flex flex-col min-h-screen" : "flex h-screen overflow-hidden"}
      style={{ background: c.bg, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}
    >
      {!isMobile && <SharedSidebar />}

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: isMobile ? 'calc(62px + env(safe-area-inset-bottom) + 20px)' : 0 }}>
        <div className="max-w-[1280px] mx-auto px-5 pb-12" style={{ paddingTop: isMobile ? 'calc(20px + env(safe-area-inset-top))' : '20px' }}>

          {/* ── HEADER ─────────────────────────────────────────── */}
          <header className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1
                className="text-[22px] font-semibold tracking-[-0.3px] leading-none"
                style={{ color: c.text }}
              >
                {greeting}{first ? `, ${first}` : ''}
              </h1>
              <p className="text-[14px] mt-1.5" style={{ color: c.textTertiary }}>{todayStr}</p>
              <div
                className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full"
                style={healthState.bg ? { background: healthState.bg } : {}}
              >
                <span className="w-[7px] h-[7px] rounded-full block" style={{ background: healthState.color }} />
                <span className="text-[12px] font-medium tracking-[0.1px]" style={{ color: healthState.color }}>
                  {healthState.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate('/wizard')}
                className="flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-medium rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-150 active:scale-[0.98]"
                style={{ color: c.blue, background: c.card, border: `1px solid ${c.blue}40` }}
                onMouseEnter={e => e.currentTarget.style.background = c.blueLight}
                onMouseLeave={e => e.currentTarget.style.background = c.card}
              >
                <Globe size={14} strokeWidth={1.75} />
                Website erstellen
              </button>
              <button
                onClick={() => navigate('/invoices/new')}
                className="flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-medium text-white rounded-[10px] shadow-[0_1px_3px_rgba(0,113,227,0.25)] hover:opacity-90 transition-all duration-150 active:scale-[0.98]"
                style={{ background: c.blue }}
              >
                <Receipt size={14} strokeWidth={1.75} />
                Rechnung erstellen
              </button>
            </div>
          </header>

          {/* ── KPI ROW ────────────────────────────────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div
              className="rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              style={{ background: isDark ? '#2C2C2E' : '#1D1D1F' }}
            >
              <div className="flex items-center justify-between mb-4">
                <Globe size={15} color="#636366" strokeWidth={1.75} />
                <span className="text-[10.5px] font-semibold text-[#636366] uppercase tracking-[0.2px]">
                  Aktive Websites
                </span>
              </div>
              <p className="text-[32px] font-bold text-white tracking-[-0.5px] leading-none">
                {activeProjects.length}
              </p>
              <p className="text-[13px] text-[#636366] mt-2">
                {projects.length - activeProjects.length > 0
                  ? `+${projects.length - activeProjects.length} in Planung`
                  : `von ${projects.length} gesamt`}
              </p>
            </div>

            <div
              onClick={() => navigate('/invoices')}
              className="rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-px transition-all duration-150 cursor-pointer"
              style={{ background: c.card, border: `1px solid ${c.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <FileText size={15} color={c.textSecondary} strokeWidth={1.75} />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.2px]" style={{ color: c.textSecondary }}>
                  Offener Umsatz
                </span>
              </div>
              <p className="text-[32px] font-bold tracking-[-0.5px] leading-none" style={{ color: c.text }}>
                {fmtCurrency(openAmount)}
              </p>
              <p className="text-[13px] mt-2" style={{ color: c.textTertiary }}>
                {openInvoices.length + overdueInvoices.length === 0
                  ? 'Keine offenen Rechnungen'
                  : `${openInvoices.length + overdueInvoices.length} Rechnung${openInvoices.length + overdueInvoices.length !== 1 ? 'en' : ''} offen`}
              </p>
            </div>

            <div
              className="rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-px transition-all duration-150"
              style={{ background: c.card, border: `1px solid ${c.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <CheckCircle2 size={15} color={c.textSecondary} strokeWidth={1.75} />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.2px]" style={{ color: c.textSecondary }}>
                  Follow-ups heute
                </span>
              </div>
              <p className="text-[32px] font-bold tracking-[-0.5px] leading-none" style={{ color: c.text }}>
                {dueReminders.length}
              </p>
              <p className="text-[13px] mt-2" style={{ color: c.textTertiary }}>
                {dueReminders.length === 0 ? 'Keine fälligen' : `${dueReminders.length} fällig`}
              </p>
            </div>
          </section>

          {/* ── WEBSITES SCROLL ROW ────────────────────────────── */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-[-0.1px]" style={{ color: c.text }}>Aktive Websites</h2>
                <span
                  className="px-2 py-0.5 text-[11px] font-semibold rounded-full"
                  style={{ color: c.textTertiary, background: c.cardSecondary }}
                >
                  {activeProjects.length}
                </span>
              </div>
              <button
                onClick={() => navigate('/websites')}
                className="flex items-center gap-0.5 text-[13px] font-medium hover:opacity-70 transition-opacity"
                style={{ color: c.blue }}
              >
                Alle <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>

            {activeProjects.length === 0 ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/wizard')}
                  className="w-[208px] border-2 border-dashed rounded-[14px] p-4 flex flex-col items-center justify-center gap-2 transition-all duration-150 cursor-pointer group h-[140px]"
                  style={{ borderColor: c.border }}
                >
                  <div
                    className="w-10 h-10 rounded-[11px] flex items-center justify-center transition-colors"
                    style={{ background: c.cardSecondary }}
                  >
                    <Plus size={20} color={c.textSecondary} strokeWidth={1.75} />
                  </div>
                  <span className="text-[12.5px] font-medium" style={{ color: c.textTertiary }}>Website erstellen</span>
                </button>
              </div>
            ) : (
              <div
                className="flex gap-3 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {activeProjects.slice(0, 8).map(p => {
                  const st = STAT[p.status] || STAT.planned;
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/websites/${p.id}`)}
                      className="shrink-0 w-[208px] rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-px transition-all duration-150 cursor-pointer"
                      style={{ background: c.card, border: `1px solid ${c.border}` }}
                    >
                      <div
                        className="w-10 h-10 rounded-[11px] flex items-center justify-center mb-3"
                        style={{ background: c.cardSecondary }}
                      >
                        <Globe2 size={20} color={c.textSecondary} strokeWidth={1.5} />
                      </div>
                      <p className="text-[13.5px] font-semibold truncate leading-snug" style={{ color: c.text }}>
                        {p.client_name || 'Kein Kunde'}
                      </p>
                      <p className="text-[12px] truncate mt-0.5 mb-3" style={{ color: c.textTertiary }}>{p.name}</p>
                      <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-[6px] ${st.tw}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}

                <button
                  onClick={() => navigate('/wizard')}
                  className="shrink-0 w-[208px] border-2 border-dashed rounded-[14px] p-4 flex flex-col items-center justify-center gap-2 transition-all duration-150 cursor-pointer group"
                  style={{ borderColor: c.border }}
                >
                  <div
                    className="w-10 h-10 rounded-[11px] flex items-center justify-center transition-colors"
                    style={{ background: c.cardSecondary }}
                  >
                    <Plus size={20} color={c.textSecondary} strokeWidth={1.75} />
                  </div>
                  <span className="text-[12.5px] font-medium" style={{ color: c.textTertiary }}>Website erstellen</span>
                </button>
              </div>
            )}
          </section>

          {/* ── MIDDLE: 60 / 40 ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 mb-3">

            {/* Table */}
            <div
              className="rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"
              style={{ background: c.card, border: `1px solid ${c.border}` }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${c.borderSubtle}` }}
              >
                <h2 className="text-[15px] font-semibold tracking-[-0.1px]" style={{ color: c.text }}>Zuletzt aktiv</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ borderBottom: `1px solid ${c.borderSubtle}` }}>
                    <tr>
                      {['Name', 'Kunde', 'Status', 'Zuletzt'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2px] whitespace-nowrap" style={{ color: c.textTertiary }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentProjects.map((p, i) => {
                      const st = STAT[p.status] || STAT.planned;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => navigate(`/websites/${p.id}`)}
                          className="cursor-pointer transition-colors duration-100 last:border-0"
                          style={{
                            borderBottom: `1px solid ${c.borderSubtle}`,
                            background: i % 2 === 1 ? c.cardSecondary : c.card,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = isDark ? '#2C2C2E' : '#F5F5F7'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? c.cardSecondary : c.card}
                        >
                          <td className="px-5 py-3 text-[13px] font-medium max-w-[200px] truncate" style={{ color: c.text }}>{p.name}</td>
                          <td className="px-5 py-3 text-[13px] max-w-[160px] truncate" style={{ color: c.textTertiary }}>{p.client_name || '—'}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-[6px] ${st.tw}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[13px] whitespace-nowrap" style={{ color: c.textTertiary }}>
                            {relDate(p.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-[13px]" style={{ color: c.textTertiary }}>
                          Noch keine Websites angelegt.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: stacked cards */}
            <div className="flex flex-col gap-3">

              {/* Finanzen */}
              <div
                className="rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                style={{ background: c.card, border: `1px solid ${c.border}` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-semibold tracking-[-0.1px]" style={{ color: c.text }}>Finanzen</h2>
                  <button
                    onClick={() => navigate('/invoices')}
                    className="flex items-center gap-0.5 text-[12px] font-medium hover:opacity-70 transition-opacity"
                    style={{ color: c.blue }}
                  >
                    Alle <ChevronRight size={13} strokeWidth={2} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Offen',      val: openInvoices.length,    color: '#FF9F0A', bg: isDark ? 'rgba(255,159,10,0.15)' : '#FFF8E8' },
                    { label: 'Überfällig', val: overdueInvoices.length, color: '#FF3B30', bg: isDark ? 'rgba(255,69,58,0.15)'  : '#FFE5E5' },
                    { label: 'Bezahlt',    val: paidAmount >= 1000
                        ? `${(paidAmount / 1000).toFixed(1)}k`
                        : `${Math.round(paidAmount)}`,
                      color: '#34C759', bg: isDark ? 'rgba(52,199,89,0.15)' : '#E8F8EE' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} className="flex flex-col items-center py-3 px-2 rounded-[10px]" style={{ background: bg }}>
                      <p className="text-[18px] font-bold leading-none" style={{ color }}>{val}</p>
                      <p className="text-[11px] font-medium mt-1 text-center leading-tight" style={{ color: c.textSecondary }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-ups */}
              <div
                className="rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex-1 flex flex-col"
                style={{ background: c.card, border: `1px solid ${c.border}` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-semibold tracking-[-0.1px]" style={{ color: c.text }}>Follow-ups</h2>
                  {dueReminders.length > 0 && (
                    <span
                      className="px-2 py-0.5 text-[11px] font-semibold rounded-full"
                      style={{ background: isDark ? 'rgba(255,159,10,0.15)' : '#FFF8E8', color: '#B35A00' }}
                    >
                      {dueReminders.length} fällig
                    </span>
                  )}
                </div>

                {dueReminders.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                    <CheckCircle2 size={28} color={c.border} strokeWidth={1.25} />
                    <p className="text-[13px] font-medium mt-3" style={{ color: c.text }}>Alles erledigt</p>
                    <p className="text-[12px] mt-0.5" style={{ color: c.textTertiary }}>Keine fälligen Follow-ups.</p>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1">
                    {dueReminders.slice(0, 3).map(r => (
                      <div
                        key={r.id}
                        onClick={() => navigate(`/websites/${r.project_id}`)}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] transition-colors cursor-pointer"
                        style={{ background: isDark ? 'rgba(255,159,10,0.12)' : '#FFF8E8' }}
                      >
                        <AlertCircle size={14} color="#FF9F0A" strokeWidth={2} className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium truncate" style={{ color: c.text }}>{r.text || r.note || 'Erinnerung'}</p>
                          <p className="text-[11px] truncate" style={{ color: c.textTertiary }}>{r.project_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTTOM ROW: 3 columns ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Time Tracking */}
            <div
              className="rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              style={{ background: c.card, border: `1px solid ${c.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold tracking-[-0.1px]" style={{ color: c.text }}>Zeiterfassung</h2>
                <button
                  onClick={() => navigate('/time-tracking')}
                  className="text-[12px] font-medium hover:opacity-70 transition-opacity"
                  style={{ color: c.blue }}
                >
                  Details
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Donut value={weekSec} max={144000} color={c.blue} size={80} sw={8} trackColor={c.cardSecondary} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clock size={16} color={c.textSecondary} strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <p className="text-[22px] font-bold tracking-[-0.4px] leading-none" style={{ color: c.text }}>
                    {weekSec > 0 ? fmt(weekSec) : '—'}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: c.textTertiary }}>Diese Woche</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-[#34C759] block shrink-0" />
                    <span className="text-[12px]" style={{ color: c.textTertiary }}>
                      {todaySec > 0 ? fmt(todaySec) : '0m'} heute
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kalender heute */}
            <div
              className="rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              style={{ background: c.card, border: `1px solid ${c.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold tracking-[-0.1px]" style={{ color: c.text }}>Heute</h2>
                <button
                  onClick={() => navigate('/calendar')}
                  className="flex items-center gap-0.5 text-[12px] font-medium hover:opacity-70 transition-opacity"
                  style={{ color: c.blue }}
                >
                  Kalender <ChevronRight size={13} strokeWidth={2} />
                </button>
              </div>

              {todayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <CalendarDays size={24} color={c.border} strokeWidth={1.25} />
                  <p className="text-[12.5px] mt-2" style={{ color: c.textTertiary }}>Keine Termine heute</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {todayEvents.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      className="flex items-center gap-3 px-3 py-2 rounded-[10px] transition-colors cursor-default"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = c.cardSecondary}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span
                        className="w-[3px] h-9 rounded-full shrink-0"
                        style={{ background: ev.color || c.blue }}
                      />
                      <div>
                        <p className="text-[13px] font-medium leading-snug" style={{ color: c.text }}>{ev.title}</p>
                        <p className="text-[11px]" style={{ color: c.textTertiary }}>{fmtTime(ev.start_time)} Uhr</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schnellaktionen */}
            <div
              className="rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              style={{ background: c.card, border: `1px solid ${c.border}` }}
            >
              <h2 className="text-[15px] font-semibold tracking-[-0.1px] mb-4" style={{ color: c.text }}>Schnellaktionen</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Globe,        label: 'Website',  cb: () => navigate('/wizard')       },
                  { icon: Receipt,      label: 'Rechnung', cb: () => navigate('/invoices/new') },
                  { icon: UserPlus,     label: 'Kunde',    cb: () => navigate('/clients/new')  },
                  { icon: CalendarPlus, label: 'Termin',   cb: () => navigate('/calendar')     },
                  { icon: Flame,        label: 'Sales',    cb: () => navigate('/sales')        },
                ].map(({ icon: Icon, label, cb }) => (
                  <button
                    key={label}
                    onClick={cb}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-[12px] transition-all duration-150 active:scale-[0.97] cursor-pointer"
                    style={{ background: c.cardSecondary, color: c.textSecondary }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = c.blueLight;
                      e.currentTarget.style.color = c.blue;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = c.cardSecondary;
                      e.currentTarget.style.color = c.textSecondary;
                    }}
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

      {isMobile && (
        <>
          <BottomNav onMoreClick={() => setDrawerOpen(true)} />
          {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
        </>
      )}
    </div>
  );
}
