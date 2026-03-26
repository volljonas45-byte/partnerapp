import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Plus, ChevronRight, CheckCircle2, Check,
  AlertTriangle, Euro, Bell, ExternalLink,
  ChevronDown, AlertCircle, Send, TrendingUp,
  Clock, Timer,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { invoicesApi } from '../api/invoices';
import { workflowApi } from '../api/workflow';
import { timeApi } from '../api/time';
import { calendarApi } from '../api/calendar';
import { formatCurrency, formatDate, isPast } from '../utils/formatters';
import toast from 'react-hot-toast';
import ReminderCard from '../components/workflow/ReminderCard';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           '#F5F5F7',
  card:         '#FFFFFF',
  border:       '#E8E8ED',
  borderLight:  '#F0F0F4',
  text:         '#111111',
  textSub:      '#6B6B7B',
  muted:        '#A0A0AC',
  brand:        '#0071E3',
  brandBg:      'rgba(0,113,227,0.08)',
  green:        '#16A34A',
  greenBg:      'rgba(22,163,74,0.08)',
  red:          '#DC2626',
  redBg:        'rgba(220,38,38,0.07)',
  amber:        '#D97706',
  amberBg:      'rgba(217,119,6,0.08)',
  purple:       '#7C3AED',
  purpleBg:     'rgba(124,58,237,0.08)',
};

// Consistent card style — one radius, one shadow, one border
const cardStyle = {
  background: C.card,
  borderRadius: '14px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)',
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  planned:            { label: 'Geplant',          color: '#6E6E73', bg: 'rgba(110,110,115,0.08)', dot: '#9CA3AF' },
  active:             { label: 'Aktiv',            color: C.brand,   bg: C.brandBg,               dot: '#3B82F6' },
  waiting_for_client: { label: 'Warten auf Kunde', color: C.amber,   bg: C.amberBg,               dot: '#F59E0B' },
  feedback:           { label: 'Überarbeitung',    color: C.purple,  bg: C.purpleBg,              dot: '#8B5CF6' },
  review:             { label: 'Review',           color: C.purple,  bg: C.purpleBg,              dot: '#8B5CF6' },
  waiting:            { label: 'Fertigstellung',   color: C.purple,  bg: C.purpleBg,              dot: '#8B5CF6' },
  completed:          { label: 'Abgeschlossen',    color: C.green,   bg: C.greenBg,               dot: '#22C55E' },
  deferred:           { label: 'Verschoben',       color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', dot: '#94A3B8' },
};
const STATUS_OPTIONS = ['planned','active','waiting_for_client','feedback','review','waiting','completed','deferred'];

const HEALTH_CFG = {
  good:     { color: C.green },
  warning:  { color: C.amber },
  critical: { color: C.red   },
  done:     { color: C.muted },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const then = new Date(dateStr); then.setHours(0, 0, 0, 0);
  return Math.round((then - now) / 86400000);
}

function computeHealth(p) {
  if (p.status === 'completed') return 'done';
  if (p.deadline && isPast(p.deadline)) return 'critical';
  if (p.status === 'waiting_for_client') return 'warning';
  const d = daysUntil(p.deadline);
  if (d !== null && d <= 5) return 'warning';
  return 'good';
}

function parseLocal(str) { if (!str) return null; return new Date(str.replace('T', ' ').replace('Z', '')); }
const DAY_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7–21

// ── StatusDropdown ────────────────────────────────────────────────────────────
function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = STATUS_CFG[status] || STATUS_CFG.planned;

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '8px',
          background: cfg.bg, border: 'none', cursor: 'pointer',
          fontSize: '11px', fontWeight: '500', color: cfg.color,
          transition: 'opacity 0.15s',
          letterSpacing: '0.01em',
        }}
      >
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        {cfg.label}
        <ChevronDown size={9} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 50,
            width: '190px', background: C.card, borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
            border: `1px solid ${C.border}`, padding: '4px',
          }}>
            {STATUS_OPTIONS.map(key => {
              const c = STATUS_CFG[key];
              const isActive = status === key;
              return (
                <button key={key}
                  onClick={e => { e.stopPropagation(); onChange(key); setOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 10px', borderRadius: '8px',
                    background: isActive ? '#F5F5F7' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: isActive ? '500' : '400',
                    color: C.text, textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8F8FA'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                  {c.label}
                  {isActive && <Check size={11} style={{ marginLeft: 'auto', color: C.muted }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── WebsiteCard ───────────────────────────────────────────────────────────────
function WebsiteCard({ project, onStatusChange, onClick }) {
  const h = computeHealth(project);
  const hc = HEALTH_CFG[h];
  const tasks = project.tasks || [];
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const taskPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : null;
  const days = daysUntil(project.deadline);
  const isOverdue = project.deadline && isPast(project.deadline) && project.status !== 'completed';

  return (
    <div
      onClick={onClick}
      style={{
        ...cardStyle,
        padding: '16px 18px 14px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = cardStyle.boxShadow;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header: health dot + name + live link */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: hc.color, flexShrink: 0,
              boxShadow: `0 0 0 2px ${hc.color}22`,
            }} />
            <p style={{
              fontSize: '13px', fontWeight: '500', color: C.text,
              letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', margin: 0, lineHeight: 1.3,
            }}>
              {project.name}
            </p>
          </div>
          <p style={{
            fontSize: '11px', color: C.muted, paddingLeft: '14px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            margin: 0, letterSpacing: '0.01em',
          }}>
            {project.client_name || '—'}
          </p>
        </div>
        {project.live_url && (
          <button
            onClick={e => { e.stopPropagation(); window.open(project.live_url, '_blank'); }}
            title={project.live_url}
            style={{
              padding: '5px', borderRadius: '8px',
              background: C.brandBg, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = C.brandBg}
          >
            <ExternalLink size={11} color={C.brand} />
          </button>
        )}
      </div>

      {/* Status + Deadline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
        <StatusDropdown status={project.status} onChange={onStatusChange} />
        {project.deadline && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            fontSize: '11px', fontWeight: '500',
            color: isOverdue ? C.red : days !== null && days <= 5 ? C.amber : C.muted,
            letterSpacing: '0.01em',
          }}>
            {isOverdue ? <AlertTriangle size={9} /> : <Clock size={9} />}
            {isOverdue ? `+${Math.abs(days)}d überfällig` : days === 0 ? 'heute' : `${days}d`}
          </span>
        )}
      </div>

      {/* Task progress */}
      {taskPct !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '10px', color: C.muted, fontWeight: '500', letterSpacing: '0.02em' }}>Aufgaben</span>
            <span style={{ fontSize: '10px', color: C.muted, fontWeight: '500' }}>{doneTasks}/{tasks.length}</span>
          </div>
          <div style={{ height: '2px', background: C.borderLight, borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: taskPct === 100 ? C.green : C.brand,
              width: `${taskPct}%`,
              transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ title, count, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '500', color: C.text, letterSpacing: '-0.01em', margin: 0 }}>
          {title}
        </h2>
        {count !== undefined && (
          <span style={{
            fontSize: '11px', fontWeight: '500', color: C.muted,
            background: C.borderLight, padding: '1px 7px', borderRadius: '99px',
          }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{children}</div>
    </div>
  );
}

// ── Ghost link button ─────────────────────────────────────────────────────────
function LinkBtn({ onClick, children }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '2px',
        fontSize: '12px', color: C.brand, background: 'none', border: 'none',
        cursor: 'pointer', fontWeight: '500', padding: '3px 0',
        transition: 'opacity 0.15s',
        letterSpacing: '0.01em',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {children}
    </button>
  );
}

// ── CardHeader ────────────────────────────────────────────────────────────────
function CardHeader({ icon: Icon, iconColor, iconBg, title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} color={iconColor} />
        </div>
        <span style={{ fontSize: '13px', fontWeight: '500', color: C.text, letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      {action}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });
  const { data: stats } = useQuery({
    queryKey: ['invoices', 'stats'],
    queryFn: () => invoicesApi.stats().then(r => r.data),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list().then(r => r.data),
  });
  const { data: workflowReminders = [] } = useQuery({
    queryKey: ['workflow-reminders'],
    queryFn: () => workflowApi.getDashboardReminders().then(r => r.data),
  });
  const { data: timeSummary } = useQuery({
    queryKey: ['time-summary'],
    queryFn: () => timeApi.summary(),
  });
  const { data: activeTimer } = useQuery({
    queryKey: ['time-timer-active'],
    queryFn: () => timeApi.timerActive(),
    refetchInterval: 30000,
  });

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: todayCalEvents = [] } = useQuery({
    queryKey: ['calendar-events-today', todayStr],
    queryFn: () => calendarApi.list({ from: todayStr, to: todayStr }),
  });
  const { data: todayTimeEntries = [] } = useQuery({
    queryKey: ['time-entries-today', todayStr],
    queryFn: () => timeApi.list({ from: todayStr, to: todayStr }),
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => projectsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const doneReminderMutation = useMutation({
    mutationFn: ({ projectId, id }) => workflowApi.updateReminder(projectId, id, { done: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-reminders'] }),
    onError: () => toast.error('Fehler'),
  });

  // ── Derived ───────────────────────────────────────────────────────────────────
  const INACTIVE_STATUSES = ['completed', 'waiting_for_client', 'waiting', 'deferred'];
  const activeWebsites  = projects.filter(p => !INACTIVE_STATUSES.includes(p.status));
  const waitingCount    = projects.filter(p => p.status === 'waiting_for_client').length;
  const overdueCount    = projects.filter(p => p.status !== 'completed' && p.deadline && isPast(p.deadline)).length;
  const openAmount      = (stats?.unpaid_revenue || 0) + (stats?.overdue_revenue || 0);
  const overdueInvCount = stats?.overdue_count || 0;

  const today0 = new Date(); today0.setHours(0, 0, 0, 0);

  const dueTodayReminders = workflowReminders.filter(r => {
    if (r.done) return false;
    const d = new Date(r.due_date); d.setHours(0, 0, 0, 0);
    return d <= today0;
  });
  const upcomingReminders = workflowReminders.filter(r => {
    if (r.done) return false;
    const d = new Date(r.due_date); d.setHours(0, 0, 0, 0);
    return d > today0;
  });

  const openInvoices = invoices
    .filter(i => ['sent', 'unpaid', 'overdue'].includes(i.status))
    .slice(0, 6);

  // Alert chips
  const alertItems = [
    overdueCount > 0 && {
      key: 'overdue', icon: AlertTriangle, color: C.red,
      bg: C.redBg, border: 'rgba(220,38,38,0.18)',
      label: `${overdueCount} Deadline${overdueCount > 1 ? 's' : ''} überschritten`,
      onClick: () => navigate('/websites'),
    },
    overdueInvCount > 0 && {
      key: 'invoices', icon: Euro, color: C.red,
      bg: C.redBg, border: 'rgba(220,38,38,0.18)',
      label: `${overdueInvCount} Rechnung${overdueInvCount > 1 ? 'en' : ''} überfällig`,
      onClick: () => navigate('/invoices'),
    },
    dueTodayReminders.length > 0 && {
      key: 'reminders', icon: Bell, color: C.purple,
      bg: C.purpleBg, border: 'rgba(124,58,237,0.18)',
      label: `${dueTodayReminders.length} Follow-up${dueTodayReminders.length > 1 ? 's' : ''} heute`,
      onClick: null,
    },
  ].filter(Boolean);

  const greeting   = getGreeting();
  const todayLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const fmtH = sec => sec != null ? `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m` : '—';

  // ── Calendar helpers ──────────────────────────────────────────────────────────
  const calTodayEvents = useMemo(() => {
    const evts = [];
    for (const e of todayCalEvents) {
      const start = parseLocal(e.start_time);
      const end   = e.end_time ? parseLocal(e.end_time) : null;
      if (start) evts.push({ id: e.id, title: e.title, _start: start, _end: end, _color: e.color || C.brand, all_day: !!e.all_day });
    }
    for (const p of projects) {
      if (p.deadline && p.deadline.slice(0, 10) === todayStr) {
        evts.push({ id: `dl-${p.id}`, title: `${p.name}`, _start: new Date(todayStr + 'T00:00:00'), _end: null, _color: C.red, all_day: true });
      }
    }
    for (const e of todayTimeEntries) {
      if (!e.start_time) continue;
      const start = parseLocal(e.start_time);
      const end   = e.end_time ? parseLocal(e.end_time) : null;
      const dur   = e.duration ? ` ${Math.floor(e.duration / 3600)}h ${Math.floor((e.duration % 3600) / 60)}m` : '';
      evts.push({ id: `t-${e.id}`, title: `${e.project_name || 'Zeit'}${dur}`, _start: start, _end: end, _color: '#5AC8FA', all_day: false });
    }
    return evts;
  }, [todayCalEvents, projects, todayTimeEntries, todayStr]);

  const allDayEvts = calTodayEvents.filter(e => e.all_day);
  const timedEvts  = calTodayEvents.filter(e => !e.all_day && e._start);

  // Current time offset in the day grid
  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const HOUR_H  = 44;
  const CAL_START = DAY_HOURS[0];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{
          width: '18px', height: '18px',
          border: `2px solid ${C.border}`,
          borderTopColor: C.brand,
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 28px 56px', width: '100%', boxSizing: 'border-box' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{
            fontSize: '22px', fontWeight: '600', color: C.text,
            letterSpacing: '-0.03em', margin: 0, lineHeight: 1.2,
          }}>
            {greeting}
          </h1>
          <p style={{ fontSize: '13px', color: C.muted, marginTop: '3px', fontWeight: '400', letterSpacing: '0.01em' }}>
            {todayLabel}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/onboarding/wizard')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: C.card, color: C.text,
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'background 0.15s, box-shadow 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F5'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
          >
            <Plus size={14} strokeWidth={2} /> Website
          </button>
          <button
            onClick={() => navigate('/invoices/new')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              background: C.brand,
              color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,113,227,0.3)',
              transition: 'filter 0.15s, box-shadow 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,113,227,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,113,227,0.3)'; }}
          >
            <Plus size={14} strokeWidth={2} /> Rechnung
          </button>
        </div>
      </div>

      {/* ── Alert Strip ── */}
      {alertItems.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {alertItems.map(item => (
            <button key={item.key}
              onClick={item.onClick || undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '99px',
                background: item.bg, border: `1px solid ${item.border}`,
                cursor: item.onClick ? 'pointer' : 'default',
                fontSize: '12px', fontWeight: '500', color: item.color,
                transition: 'opacity 0.15s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (item.onClick) e.currentTarget.style.opacity = '0.75'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <item.icon size={11} />
              {item.label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '99px',
            background: C.greenBg, border: '1px solid rgba(22,163,74,0.18)',
          }}>
            <CheckCircle2 size={12} color={C.green} />
            <span style={{ fontSize: '12px', fontWeight: '500', color: C.green, letterSpacing: '0.01em' }}>Alles im Griff</span>
          </div>
        </div>
      )}

      {/* ── KPI Strip — full width ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              {
                label: 'Aktive Websites',
                value: activeWebsites.length,
                sub: `${projects.length} gesamt`,
                accent: C.brand,
                dark: true,
                onClick: () => navigate('/websites'),
              },
              {
                label: 'Offener Umsatz',
                value: formatCurrency(openAmount),
                sub: `${(stats?.unpaid_count || 0) + (stats?.overdue_count || 0)} Rechnungen offen`,
                accent: overdueInvCount > 0 ? C.red : C.text,
                dark: false,
                onClick: () => navigate('/invoices'),
              },
              {
                label: 'Follow-ups heute',
                value: dueTodayReminders.length,
                sub: dueTodayReminders.length > 0 ? 'Kunden nachfassen' : 'Keine fälligen',
                accent: dueTodayReminders.length > 0 ? C.purple : C.text,
                dark: false,
                onClick: null,
              },
            ].map((kpi, i) => {
              const base = kpi.dark
                ? { background: '#0F1724', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }
                : { ...cardStyle };
              return (
                <button key={i}
                  onClick={kpi.onClick || undefined}
                  style={{
                    ...base,
                    padding: '18px 20px', borderRadius: '14px',
                    cursor: kpi.onClick ? 'pointer' : 'default',
                    textAlign: 'left',
                    transition: 'box-shadow 0.2s cubic-bezier(0.16,1,0.3,1), transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => {
                    if (kpi.onClick) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = kpi.dark
                        ? '0 6px 20px rgba(0,0,0,0.35)'
                        : '0 4px 16px rgba(0,0,0,0.09)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = base.boxShadow;
                  }}
                >
                  <p style={{
                    fontSize: '10px', fontWeight: '500', letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: kpi.dark ? 'rgba(255,255,255,0.4)' : C.muted,
                    marginBottom: '10px', margin: '0 0 10px',
                  }}>{kpi.label}</p>
                  <p style={{
                    fontSize: '26px', fontWeight: '600',
                    color: kpi.dark ? '#fff' : kpi.accent,
                    letterSpacing: '-0.04em', lineHeight: 1, margin: '0 0 6px',
                  }}>{kpi.value}</p>
                  <p style={{
                    fontSize: '11px', fontWeight: '400', letterSpacing: '0.01em',
                    color: kpi.dark ? 'rgba(255,255,255,0.3)' : C.muted,
                    margin: 0,
                  }}>{kpi.sub}</p>
                </button>
              );
            })}
          </div>

      {/* ── Aktive Websites — full width ── */}
      <div style={{ marginBottom: '24px' }}>
            <SectionHeader title="Aktive Websites" count={activeWebsites.length}>
              <button
                onClick={() => navigate('/onboarding/wizard')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  fontSize: '12px', color: C.brand, background: C.brandBg,
                  border: 'none', cursor: 'pointer', fontWeight: '500',
                  padding: '4px 10px', borderRadius: '7px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.13)'}
                onMouseLeave={e => e.currentTarget.style.background = C.brandBg}
              >
                <Plus size={11} /> Neu
              </button>
              <LinkBtn onClick={() => navigate('/websites')}>
                Alle <ChevronRight size={12} />
              </LinkBtn>
            </SectionHeader>

            {activeWebsites.length === 0 ? (
              <div style={{
                ...cardStyle, textAlign: 'center', padding: '48px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: C.borderLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Globe size={22} color={C.muted} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: C.text, margin: 0 }}>Noch keine aktiven Websites</p>
                <p style={{ fontSize: '12px', color: C.muted, margin: 0 }}>Erstelle dein erstes Projekt und behalte alles im Blick.</p>
                <button onClick={() => navigate('/onboarding/wizard')}
                  style={{
                    marginTop: '4px', fontSize: '13px', color: C.brand,
                    background: C.brandBg, border: 'none', cursor: 'pointer',
                    fontWeight: '500', padding: '8px 16px', borderRadius: '9px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.13)'}
                  onMouseLeave={e => e.currentTarget.style.background = C.brandBg}
                >
                  Website erstellen
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {activeWebsites.map(p => (
                  <WebsiteCard
                    key={p.id}
                    project={p}
                    onStatusChange={val => updateProject.mutate({ id: p.id, data: { status: val } })}
                    onClick={() => navigate(`/projects/${p.id}`)}
                  />
                ))}
                {/* Add card — always last, fills the row naturally */}
                <button
                  onClick={() => navigate('/onboarding/wizard')}
                  style={{
                    ...cardStyle,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '24px', cursor: 'pointer', minHeight: '100px',
                    border: `1.5px dashed ${C.border}`,
                    boxShadow: 'none',
                    background: 'transparent',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.background = C.brandBg; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Plus size={16} color={C.muted} strokeWidth={1.5} />
                  <span style={{ fontSize: '12px', color: C.muted, fontWeight: '500' }}>Website erstellen</span>
                </button>
              </div>
            )}
          </div>

      {/* ── Bottom: 3 cards + Calendar sidebar ── */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

            {/* Finanzen */}
            <div style={{ ...cardStyle, padding: '20px' }}>
              <CardHeader
                icon={TrendingUp} iconColor={C.green} iconBg={C.greenBg}
                title="Finanzen"
                action={<LinkBtn onClick={() => navigate('/invoices')}>Alle <ChevronRight size={12} /></LinkBtn>}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {[
                  { label: 'Offen',      value: stats?.unpaid_count  ?? 0, color: C.text,  bg: C.borderLight },
                  { label: 'Überfällig', value: stats?.overdue_count ?? 0, color: C.red,   bg: C.redBg },
                  { label: 'Bezahlt',    value: stats?.paid_count    ?? 0, color: C.green, bg: C.greenBg },
                ].map(s => (
                  <div key={s.label} style={{
                    textAlign: 'center', padding: '10px 6px', borderRadius: '10px',
                    background: s.bg, border: `1px solid ${C.borderLight}`,
                  }}>
                    <p style={{ fontSize: '20px', fontWeight: '600', color: s.color, letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: '10px', color: C.muted, marginTop: '4px', fontWeight: '500', letterSpacing: '0.02em' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {openInvoices.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '12px 0', fontSize: '12px', color: C.muted }}>Keine offenen Rechnungen</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {openInvoices.map(inv => (
                    <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '7px 8px', borderRadius: '8px', cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.borderLight}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {inv.status === 'overdue'
                        ? <AlertCircle size={12} color={C.red} style={{ flexShrink: 0 }} />
                        : <Send size={12} color={C.muted} style={{ flexShrink: 0 }} />
                      }
                      <span style={{ flex: 1, fontSize: '12px', color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '400' }}>
                        {inv.client_name || inv.invoice_number || 'Rechnung'}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: inv.status === 'overdue' ? C.red : C.text, flexShrink: 0 }}>
                        {formatCurrency(inv.total || inv.amount || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Follow-ups */}
            <div style={{ ...cardStyle, padding: '20px' }}>
              <CardHeader
                icon={Bell} iconColor={C.purple} iconBg={C.purpleBg}
                title="Follow-ups"
              />
              {dueTodayReminders.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '8px' }}>
                  <CheckCircle2 size={24} color={C.border} />
                  <p style={{ fontSize: '12px', color: C.muted, margin: 0, fontWeight: '400' }}>Keine Follow-ups heute</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {dueTodayReminders.slice(0, 5).map(r => (
                    <ReminderCard key={r.id} reminder={r}
                      onDone={() => doneReminderMutation.mutate({ projectId: r.project_id, id: r.id })}
                      onClick={() => navigate(`/projects/${r.project_id}?tab=workflow`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Time Tracking */}
            <div style={{ ...cardStyle, padding: '20px' }}>
              <CardHeader
                icon={Clock} iconColor={C.brand} iconBg={C.brandBg}
                title="Time Tracking"
                action={<LinkBtn onClick={() => navigate('/time')}>Alle <ChevronRight size={12} /></LinkBtn>}
              />

              {activeTimer?.id && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', borderRadius: '9px',
                  background: C.greenBg, border: `1px solid rgba(22,163,74,0.15)`,
                  marginBottom: '12px',
                }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: C.green, flexShrink: 0,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: '12px', fontWeight: '500', color: C.green, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeTimer.project_name || activeTimer.description || 'Läuft'}
                  </span>
                  <Timer size={11} color={C.green} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: 'Diese Woche', val: fmtH(timeSummary?.week_sec) },
                  { label: 'Heute',       val: fmtH(timeSummary?.today_sec) },
                ].map(s => (
                  <div key={s.label} style={{
                    padding: '12px', borderRadius: '10px',
                    background: C.borderLight, textAlign: 'center',
                    border: `1px solid ${C.borderLight}`,
                  }}>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: C.text, letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>{s.val}</p>
                    <p style={{ fontSize: '10px', color: C.muted, marginTop: '4px', fontWeight: '500', letterSpacing: '0.02em' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {timeSummary?.month_sec != null && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 0 0', borderTop: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: '12px', color: C.muted, fontWeight: '400' }}>Diesen Monat</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: C.text }}>{fmtH(timeSummary.month_sec)}</span>
                </div>
              )}
            </div>

        </div>

        {/* ── Heute Kalender Sidebar ── */}
        <div style={{ width: '260px', flexShrink: 0, position: 'sticky', top: '20px' }}>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 13px',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Clock size={13} color={C.brand} strokeWidth={2} />
                <span style={{ fontSize: '13px', fontWeight: '500', color: C.text, letterSpacing: '-0.01em' }}>
                  {new Date().toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <LinkBtn onClick={() => navigate('/calendar')}>
                Kalender <ChevronRight size={11} />
              </LinkBtn>
            </div>

            {/* All-day events */}
            {allDayEvts.length > 0 && (
              <div style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${C.borderLight}`,
                display: 'flex', flexDirection: 'column', gap: '3px',
                background: '#FAFAFA',
              }}>
                {allDayEvts.map((ev, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 8px', borderRadius: '6px',
                    background: ev._color + '14',
                    borderLeft: `2px solid ${ev._color}`,
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '500', color: ev._color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Time grid */}
            <div style={{ overflow: 'auto', maxHeight: 380 }}>
              <div style={{ position: 'relative', display: 'flex' }}>

                {/* Hour labels column */}
                <div style={{ width: '40px', flexShrink: 0 }}>
                  {DAY_HOURS.map(h => (
                    <div key={h} style={{
                      height: `${HOUR_H}px`,
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                      paddingRight: '10px', paddingTop: '5px',
                    }}>
                      <span style={{
                        fontSize: '11px', color: C.muted,
                        fontWeight: '400', fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '0.01em',
                      }}>
                        {String(h).padStart(2, '0')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grid + events column */}
                <div style={{ flex: 1, borderLeft: `1px solid ${C.border}`, position: 'relative' }}>

                  {/* Hour dividers */}
                  {DAY_HOURS.map((h, idx) => (
                    <div key={h} style={{
                      height: `${HOUR_H}px`,
                      borderBottom: `1px solid ${idx % 2 === 0 ? C.borderLight : 'transparent'}`,
                      background: h >= 9 && h < 18 ? 'transparent' : 'rgba(0,0,0,0.012)',
                    }} />
                  ))}

                  {/* Current time line */}
                  {nowHour >= CAL_START && nowHour < DAY_HOURS[DAY_HOURS.length - 1] && (
                    <div style={{
                      position: 'absolute',
                      top: `${(nowHour - CAL_START) * HOUR_H}px`,
                      left: 0, right: 0,
                      height: '2px',
                      background: C.red,
                      zIndex: 5,
                      display: 'flex', alignItems: 'center',
                    }}>
                      <div style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: C.red, marginLeft: '-3.5px', flexShrink: 0,
                      }} />
                    </div>
                  )}

                  {/* No events placeholder */}
                  {timedEvts.length === 0 && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '12px', color: C.muted }}>Keine Termine</span>
                    </div>
                  )}

                  {/* Timed events */}
                  {timedEvts.map((ev, i) => {
                    const startH = ev._start.getHours() + ev._start.getMinutes() / 60;
                    const endH   = ev._end ? ev._end.getHours() + ev._end.getMinutes() / 60 : startH + 1;
                    const top    = (startH - CAL_START) * HOUR_H;
                    const height = Math.max((endH - startH) * HOUR_H - 3, 22);
                    if (startH < CAL_START || startH >= DAY_HOURS[DAY_HOURS.length - 1]) return null;
                    return (
                      <div key={i}
                        style={{
                          position: 'absolute',
                          left: '4px', right: '6px',
                          top, height,
                          background: ev._color + '18',
                          borderLeft: `3px solid ${ev._color}`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          zIndex: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <p style={{
                          fontSize: '11px', fontWeight: '500', color: ev._color,
                          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: 1.3,
                        }}>
                          {ev.title}
                        </p>
                        {height > 30 && (
                          <p style={{ fontSize: '10px', color: C.muted, margin: '2px 0 0', lineHeight: 1 }}>
                            {ev._start.getHours()}:{String(ev._start.getMinutes()).padStart(2, '0')}
                            {ev._end ? `–${ev._end.getHours()}:${String(ev._end.getMinutes()).padStart(2, '0')}` : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
