import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobile } from '../hooks/useMobile';
import BottomNav from '../components/BottomNav';
import MobileDrawer from '../components/MobileDrawer';
import SharedSidebar from '../components/Sidebar';
import AmbientGlow from '../components/AmbientGlow';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { projectsApi } from '../api/projects';
import { invoicesApi } from '../api/invoices';
import { timeApi } from '../api/time';
import { calendarApi } from '../api/calendar';
import { workflowApi } from '../api/workflow';
import {
  Globe, CalendarDays, Clock,
  FolderKanban, FileText,
  Globe2, Receipt, UserPlus, CalendarPlus, CheckCircle2, AlertCircle,
  ChevronRight, Flame, Plus,
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────
const INACTIVE = new Set(['completed', 'waiting_for_client', 'waiting', 'deferred']);

const STAT = {
  active:             { label: 'Aktiv',            tw: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  planned:            { label: 'Geplant',          color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
  waiting_for_client: { label: 'Wartet auf Kunde', color: '#FF9500', bg: 'rgba(255,149,0,0.10)' },
  waiting:            { label: 'Wartend',          color: '#FF9500', bg: 'rgba(255,149,0,0.10)' },
  feedback:           { label: 'Feedback',         color: '#FF9500', bg: 'rgba(255,149,0,0.10)' },
  review:             { label: 'Review',           color: '#AF52DE', bg: 'rgba(175,82,222,0.10)' },
  completed:          { label: 'Fertig',           color: '#34C759', bg: 'rgba(52,199,89,0.10)' },
  deferred:           { label: 'Verschoben',       color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
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
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  });
}

// ─── DONUT CHART ──────────────────────────────────────────────────
function Donut({ value, max, color = 'var(--color-blue)', size = 72, sw = 7, trackColor }) {
  const r    = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor || 'var(--color-card-secondary)'} strokeWidth={sw} />
      {pct > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1)' }}
        />
      )}
    </svg>
  );
}

// Status Badge Component
function StatusBadge({ status }) {
  const st = STAT[status] || STAT.planned;
  if (st.tw) {
    return <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-md ${st.tw}`}>{st.label}</span>;
  }
  return (
    <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-md" style={{ color: st.color, background: st.bg }}>
      {st.label}
    </span>
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
  const activeProjects = useMemo(
    () => projects.filter(p => p.status === 'active'),
    [projects]
  );

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

  const healthState = useMemo(() => {
    if (overdueInvoices.length > 0) return {
      label: `${overdueInvoices.length} überfällige Rechnung${overdueInvoices.length > 1 ? 'en' : ''}`,
      color: c.red, bg: c.redLight,
    };
    if (dueReminders.length > 0) return {
      label: `${dueReminders.length} Follow-up${dueReminders.length > 1 ? 's' : ''} fällig`,
      color: c.orange, bg: c.orangeLight,
    };
    return { label: 'Alles im Griff', color: c.green, bg: null };
  }, [overdueInvoices, dueReminders, c]);

  // Card style helper
  const cardStyle = {
    background: c.card,
    borderRadius: 12,
    border: `0.5px solid ${c.borderSubtle}`,
    boxShadow: isDark
      ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.25)'
      : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle), 0 6px 20px var(--color-border-subtle)',
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className={isMobile ? "flex flex-col min-h-screen" : "flex h-screen overflow-hidden"}
      style={{ background: c.bg }}
    >
      {!isMobile && <SharedSidebar />}

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: isMobile ? 'calc(62px + env(safe-area-inset-bottom) + 20px)' : 0, position: 'relative' }}>
        <AmbientGlow />
        <div
          className="max-w-[1200px] mx-auto animate-fade-in"
          style={{
            padding: isMobile ? '20px 16px 0' : '28px 32px 48px',
            paddingTop: isMobile ? 'calc(20px + env(safe-area-inset-top))' : '28px',
            position: 'relative', zIndex: 1,
          }}
        >

          {/* ── HEADER ─────────────────────────────────────────── */}
          <header style={{ marginBottom: 28 }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 style={{
                  fontSize: 28, fontWeight: 700,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.032em', lineHeight: 1.14, margin: 0,
                }}>
                  {greeting}{first ? `, ${first}` : ''}
                </h1>
                <p style={{
                  fontSize: 15, color: c.textSecondary, marginTop: 4,
                  letterSpacing: '-0.009em',
                }}>{todayStr}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/wizard')}
                  className="btn-secondary"
                  style={{ fontSize: 13 }}
                >
                  <Globe size={14} strokeWidth={1.75} />
                  Website
                </button>
                <button
                  onClick={() => navigate('/invoices/new')}
                  className="btn-primary"
                  style={{ fontSize: 13 }}
                >
                  <Receipt size={14} strokeWidth={1.75} />
                  Rechnung
                </button>
              </div>
            </div>

            {/* Health pill */}
            {healthState.bg && (
              <div
                className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-lg"
                style={{ background: healthState.bg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: healthState.color }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: healthState.color, letterSpacing: '-0.006em' }}>
                  {healthState.label}
                </span>
              </div>
            )}
          </header>

          {/* ── KPI ROW ────────────────────────────────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {/* Dark hero card */}
            <div
              style={{
                ...cardStyle,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
                border: '0.5px solid rgba(91,140,245,0.2)',
                boxShadow: '0 0 0 0.5px rgba(91,140,245,0.1), 0 4px 24px rgba(91,140,245,0.12), 0 8px 40px rgba(0,0,0,0.4)',
                padding: 20,
                transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s cubic-bezier(0.22,1,0.36,1)',
                cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(91,140,245,0.15), 0 8px 32px rgba(91,140,245,0.18), 0 16px 48px rgba(0,0,0,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(91,140,245,0.1), 0 4px 24px rgba(91,140,245,0.12), 0 8px 40px rgba(0,0,0,0.4)'; }}
            >
              <div className="flex items-center justify-between mb-4">
                <Globe size={15} color="rgba(91,140,245,0.6)" strokeWidth={1.75} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(91,140,245,0.7)', letterSpacing: '-0.006em' }}>
                  Aktive Websites
                </span>
              </div>
              <p style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {activeProjects.length}
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 8, letterSpacing: '-0.006em' }}>
                {projects.length - activeProjects.length > 0
                  ? `+${projects.length - activeProjects.length} in Planung`
                  : `von ${projects.length} gesamt`}
              </p>
            </div>

            {/* Revenue card */}
            <div
              onClick={() => navigate('/invoices')}
              style={{
                ...cardStyle,
                background: 'linear-gradient(135deg, #16161E 0%, #1a1f2e 100%)',
                border: '0.5px solid rgba(52,211,153,0.15)',
                boxShadow: '0 0 0 0.5px rgba(52,211,153,0.08), 0 4px 20px rgba(52,211,153,0.08), 0 8px 32px rgba(0,0,0,0.35)',
                padding: 20, cursor: 'pointer',
                transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(52,211,153,0.12), 0 8px 28px rgba(52,211,153,0.12), 0 16px 40px rgba(0,0,0,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(52,211,153,0.08), 0 4px 20px rgba(52,211,153,0.08), 0 8px 32px rgba(0,0,0,0.35)'; }}
            >
              <div className="flex items-center justify-between mb-4">
                <FileText size={15} color={c.textTertiary} strokeWidth={1.75} />
                <span style={{ fontSize: 11, fontWeight: 500, color: c.textTertiary, letterSpacing: '-0.006em' }}>
                  Offener Umsatz
                </span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: c.text, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {fmtCurrency(openAmount)}
              </p>
              <p style={{ fontSize: 13, color: c.textTertiary, marginTop: 8, letterSpacing: '-0.006em' }}>
                {openInvoices.length + overdueInvoices.length === 0
                  ? 'Keine offenen Rechnungen'
                  : `${openInvoices.length + overdueInvoices.length} offen`}
              </p>
            </div>

            {/* Follow-ups card */}
            <div
              style={{
                ...cardStyle,
                background: 'linear-gradient(135deg, #16161E 0%, #1e1a2e 100%)',
                border: `0.5px solid ${dueReminders.length > 0 ? 'rgba(251,146,60,0.18)' : 'rgba(155,114,242,0.15)'}`,
                boxShadow: dueReminders.length > 0
                  ? '0 0 0 0.5px rgba(251,146,60,0.08), 0 4px 20px rgba(251,146,60,0.1), 0 8px 32px rgba(0,0,0,0.35)'
                  : '0 0 0 0.5px rgba(155,114,242,0.08), 0 4px 20px rgba(155,114,242,0.08), 0 8px 32px rgba(0,0,0,0.35)',
                padding: 20,
                transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div className="flex items-center justify-between mb-4">
                <CheckCircle2 size={15} color={c.textTertiary} strokeWidth={1.75} />
                <span style={{ fontSize: 11, fontWeight: 500, color: c.textTertiary, letterSpacing: '-0.006em' }}>
                  Follow-ups heute
                </span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: c.text, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {dueReminders.length}
              </p>
              <p style={{ fontSize: 13, color: c.textTertiary, marginTop: 8, letterSpacing: '-0.006em' }}>
                {dueReminders.length === 0 ? 'Keine fälligen' : `${dueReminders.length} fällig`}
              </p>
            </div>
          </section>

          {/* ── WEBSITES SCROLL ROW ────────────────────────────── */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.009em' }}>
                Aktive Websites
              </h2>
              <button
                onClick={() => navigate('/websites')}
                className="flex items-center gap-0.5"
                style={{ fontSize: 13, fontWeight: 500, color: c.blue, letterSpacing: '-0.006em' }}
              >
                Alle <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>

            {activeProjects.length === 0 ? (
              <button
                onClick={() => navigate('/wizard')}
                style={{
                  width: 200, height: 120, borderRadius: 12,
                  border: `1.5px dashed ${c.border}`,
                  background: 'transparent',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                <Plus size={20} color={c.textTertiary} strokeWidth={1.5} />
                <span style={{ fontSize: 13, fontWeight: 500, color: c.textTertiary }}>Website erstellen</span>
              </button>
            ) : (
              <div
                className="flex gap-3 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {activeProjects.slice(0, 8).map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/websites/${p.id}`)}
                    className="shrink-0 cursor-pointer"
                    style={{
                      ...cardStyle, width: 200, padding: 16,
                      transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s cubic-bezier(0.22,1,0.36,1)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: c.cardSecondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 12,
                    }}>
                      <Globe2 size={18} color={c.textTertiary} strokeWidth={1.5} />
                    </div>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: c.text,
                      letterSpacing: '-0.008em', lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.client_name || 'Kein Kunde'}
                    </p>
                    <p style={{
                      fontSize: 12, color: c.textTertiary, marginTop: 2, marginBottom: 10,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.name}
                    </p>
                    <StatusBadge status={p.status} />
                  </div>
                ))}

                <button
                  onClick={() => navigate('/wizard')}
                  className="shrink-0 cursor-pointer"
                  style={{
                    width: 200, borderRadius: 12,
                    border: `1.5px dashed ${c.border}`,
                    background: 'transparent',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'border-color 0.15s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  <Plus size={18} color={c.textTertiary} strokeWidth={1.5} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: c.textTertiary }}>Neu</span>
                </button>
              </div>
            )}
          </section>

          {/* ── MIDDLE: Table + Side Cards ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 mb-3">

            {/* Table */}
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: `0.5px solid ${c.borderSubtle}`,
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.009em' }}>Zuletzt aktiv</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}>
                      {['Name', 'Kunde', 'Status', 'Zuletzt'].map(h => (
                        <th key={h} style={{
                          padding: '8px 20px', textAlign: 'left',
                          fontSize: 12, fontWeight: 500, color: c.textTertiary,
                          letterSpacing: '-0.006em', whiteSpace: 'nowrap',
                        }}>
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
                        className="cursor-pointer"
                        style={{
                          borderBottom: `0.5px solid ${c.borderSubtle}`,
                          transition: 'background 0.12s cubic-bezier(0.22,1,0.36,1)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = c.cardHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 20px', fontSize: 13, fontWeight: 500, color: c.text, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                        <td style={{ padding: '10px 20px', fontSize: 13, color: c.textTertiary, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.client_name || '—'}</td>
                        <td style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                          <StatusBadge status={p.status} />
                        </td>
                        <td style={{ padding: '10px 20px', fontSize: 13, color: c.textTertiary, whiteSpace: 'nowrap' }}>
                          {relDate(p.created_at)}
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: c.textTertiary }}>
                          Noch keine Websites angelegt.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right side cards */}
            <div className="flex flex-col gap-3">

              {/* Finanzen */}
              <div style={{ ...cardStyle, padding: 20 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.009em' }}>Finanzen</h2>
                  <button
                    onClick={() => navigate('/invoices')}
                    className="flex items-center gap-0.5"
                    style={{ fontSize: 12, fontWeight: 500, color: c.blue }}
                  >
                    Alle <ChevronRight size={12} strokeWidth={2} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Offen',     val: openInvoices.length,    color: c.orange, bg: c.orangeLight },
                    { label: 'Überfällig', val: overdueInvoices.length, color: c.red,    bg: c.redLight },
                    { label: 'Bezahlt',    val: paidAmount >= 1000 ? `${(paidAmount / 1000).toFixed(1)}k` : `${Math.round(paidAmount)}`, color: c.green, bg: c.greenLight },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '10px 8px', borderRadius: 10, background: bg,
                    }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{val}</p>
                      <p style={{ fontSize: 11, fontWeight: 500, color: c.textSecondary, marginTop: 4, textAlign: 'center' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-ups */}
              <div style={{ ...cardStyle, padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.009em' }}>Follow-ups</h2>
                  {dueReminders.length > 0 && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 6,
                      fontSize: 11, fontWeight: 600,
                      background: c.orangeLight, color: c.orange,
                    }}>
                      {dueReminders.length} fällig
                    </span>
                  )}
                </div>

                {dueReminders.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                    <CheckCircle2 size={24} color={c.border} strokeWidth={1.25} />
                    <p style={{ fontSize: 13, fontWeight: 500, color: c.text, marginTop: 10 }}>Alles erledigt</p>
                    <p style={{ fontSize: 12, color: c.textTertiary, marginTop: 2 }}>Keine fälligen Follow-ups.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    {dueReminders.slice(0, 3).map(r => (
                      <div
                        key={r.id}
                        onClick={() => navigate(`/websites/${r.project_id}`)}
                        style={{
                          display: 'flex', alignItems: 'start', gap: 10,
                          padding: '8px 10px', borderRadius: 8,
                          background: c.orangeLight, cursor: 'pointer',
                        }}
                      >
                        <AlertCircle size={14} color={c.orange} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.text || r.note || 'Erinnerung'}</p>
                          <p style={{ fontSize: 11, color: c.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.project_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTTOM ROW ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Time Tracking */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.009em' }}>Zeiterfassung</h2>
                <button
                  onClick={() => navigate('/time-tracking')}
                  style={{ fontSize: 12, fontWeight: 500, color: c.blue }}
                >
                  Details
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Donut value={weekSec} max={144000} color={c.blue} size={72} sw={7} trackColor={c.cardSecondary} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clock size={15} color={c.textTertiary} strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 700, color: c.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {weekSec > 0 ? fmt(weekSec) : '—'}
                  </p>
                  <p style={{ fontSize: 12, color: c.textTertiary, marginTop: 4 }}>Diese Woche</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.green }} />
                    <span style={{ fontSize: 12, color: c.textTertiary }}>
                      {todaySec > 0 ? fmt(todaySec) : '0m'} heute
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kalender heute */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.009em' }}>Heute</h2>
                <button
                  onClick={() => navigate('/calendar')}
                  className="flex items-center gap-0.5"
                  style={{ fontSize: 12, fontWeight: 500, color: c.blue }}
                >
                  Kalender <ChevronRight size={12} strokeWidth={2} />
                </button>
              </div>

              {todayEvents.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                  <CalendarDays size={22} color={c.border} strokeWidth={1.25} />
                  <p style={{ fontSize: 13, color: c.textTertiary, marginTop: 8 }}>Keine Termine heute</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {todayEvents.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 8,
                        transition: 'background 0.12s cubic-bezier(0.22,1,0.36,1)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = c.cardHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{
                        width: 3, height: 32, borderRadius: 2, flexShrink: 0,
                        background: ev.color || c.blue,
                      }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: c.text, lineHeight: 1.3 }}>{ev.title}</p>
                        <p style={{ fontSize: 11, color: c.textTertiary }}>{fmtTime(ev.start_time)} Uhr</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schnellaktionen */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.009em', marginBottom: 16 }}>Schnellaktionen</h2>
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
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 6, padding: '14px 8px', borderRadius: 10,
                      background: c.cardSecondary, border: 'none',
                      color: c.textTertiary, cursor: 'pointer',
                      transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1), color 0.15s cubic-bezier(0.22,1,0.36,1), transform 0.1s cubic-bezier(0.22,1,0.36,1)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = c.blueLight; e.currentTarget.style.color = c.blue; }}
                    onMouseLeave={e => { e.currentTarget.style.background = c.cardSecondary; e.currentTarget.style.color = c.textTertiary; }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
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
