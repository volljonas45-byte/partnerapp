import { useState, useRef, useEffect } from 'react';
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
import { formatCurrency, formatDate, isPast } from '../utils/formatters';
import toast from 'react-hot-toast';
import ReminderCard from '../components/workflow/ReminderCard';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  planned:            { label: 'Geplant',          color: '#6E6E73', bg: '#F2F2F7',               dot: '#9CA3AF' },
  active:             { label: 'Aktiv',            color: '#0071E3', bg: 'rgba(0,113,227,0.09)',  dot: '#3B82F6' },
  waiting_for_client: { label: 'Warten auf Kunde', color: '#D97706', bg: 'rgba(245,158,11,0.1)',  dot: '#F59E0B' },
  feedback:           { label: 'Überarbeitung',    color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', dot: '#8B5CF6' },
  review:             { label: 'Review',           color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', dot: '#8B5CF6' },
  waiting:            { label: 'Fertigstellung',   color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', dot: '#8B5CF6' },
  completed:          { label: 'Abgeschlossen',    color: '#34C759', bg: 'rgba(52,199,89,0.08)',  dot: '#22C55E' },
};
const STATUS_OPTIONS = ['planned','active','waiting_for_client','feedback','review','waiting','completed'];

const HEALTH_CFG = {
  good:     { color: '#34C759', border: 'rgba(52,199,89,0.5)',   bg: '#fff' },
  warning:  { color: '#F59E0B', border: 'rgba(245,158,11,0.5)', bg: '#fff' },
  critical: { color: '#EF4444', border: 'rgba(239,68,68,0.5)',  bg: '#fff' },
  done:     { color: '#C7C7CC', border: 'rgba(0,0,0,0.07)',     bg: '#FAFAFA' },
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
        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', background: cfg.bg, border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: cfg.color }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        {cfg.label}
        <ChevronDown size={9} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '4px', zIndex: 50, width: '190px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 28px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)', padding: '4px' }}>
            {STATUS_OPTIONS.map(key => {
              const c = STATUS_CFG[key];
              const isActive = status === key;
              return (
                <button key={key}
                  onClick={e => { e.stopPropagation(); onChange(key); setOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: isActive ? '#F5F5F7' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: isActive ? '600' : '400', color: '#1D1D1F', textAlign: 'left' }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                  {c.label}
                  {isActive && <Check size={11} style={{ marginLeft: 'auto', color: '#8E8E93' }} />}
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
        background: hc.bg,
        borderRadius: '14px',
        border: `1px solid ${hc.border}`,
        borderLeft: `3px solid ${hc.color}`,
        padding: '16px 16px 14px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.1s',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Name + Live URL */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: hc.color, flexShrink: 0 }} />
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
              {project.name}
            </p>
          </div>
          <p style={{ fontSize: '12px', color: '#8E8E93', paddingLeft: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
            {project.client_name || '—'}
          </p>
        </div>
        {project.live_url && (
          <button
            onClick={e => { e.stopPropagation(); window.open(project.live_url, '_blank'); }}
            title={project.live_url}
            style={{ padding: '5px 7px', borderRadius: '8px', background: 'rgba(0,113,227,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, color: '#0071E3', fontSize: '10px', fontWeight: '600' }}
          >
            <ExternalLink size={11} color="#0071E3" />
          </button>
        )}
      </div>

      {/* Status + Deadline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
        <StatusDropdown status={project.status} onChange={onStatusChange} />
        {project.deadline && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '500', color: isOverdue ? '#EF4444' : days !== null && days <= 5 ? '#F59E0B' : '#6E6E73' }}>
            {isOverdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
            {isOverdue ? `+${Math.abs(days)}d überfällig` : days === 0 ? 'heute' : `${days}d`}
          </span>
        )}
      </div>

      {/* Task progress */}
      {taskPct !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#8E8E93' }}>Aufgaben</span>
            <span style={{ fontSize: '10px', color: '#8E8E93' }}>{doneTasks}/{tasks.length}</span>
          </div>
          <div style={{ height: '3px', background: '#F2F2F7', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: taskPct === 100 ? '#34C759' : '#0071E3', width: `${taskPct}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}
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

  const activeWebsites  = projects.filter(p => p.status !== 'completed');
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
      key: 'overdue', icon: AlertTriangle, color: '#EF4444',
      bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
      label: `${overdueCount} Deadline${overdueCount > 1 ? 's' : ''} überschritten`,
      onClick: () => navigate('/websites'),
    },
    overdueInvCount > 0 && {
      key: 'invoices', icon: Euro, color: '#EF4444',
      bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
      label: `${overdueInvCount} Rechnung${overdueInvCount > 1 ? 'en' : ''} überfällig`,
      onClick: () => navigate('/invoices'),
    },
    dueTodayReminders.length > 0 && {
      key: 'reminders', icon: Bell, color: '#7C3AED',
      bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)',
      label: `${dueTodayReminders.length} Follow-up${dueTodayReminders.length > 1 ? 's' : ''} heute fällig`,
      onClick: null,
    },
  ].filter(Boolean);

  const card = {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  };

  const greeting  = getGreeting();
  const todayLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #0071E3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1380px', margin: '0 auto', paddingBottom: '56px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.2 }}>
            {greeting}
          </h1>
          <p style={{ fontSize: '13px', color: '#8E8E93', marginTop: '3px' }}>{todayLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/onboarding/wizard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 15px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#1D1D1F', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <Plus size={14} /> Website
          </button>
          <button
            onClick={() => navigate('/invoices/new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 15px', borderRadius: '10px', border: 'none', background: '#0071E3', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0062C4'}
            onMouseLeave={e => e.currentTarget.style.background = '#0071E3'}
          >
            <Plus size={14} /> Rechnung
          </button>
        </div>
      </div>

      {/* ── Alert Strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {alertItems.length === 0 ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 13px', borderRadius: '99px', background: 'rgba(52,199,89,0.09)', border: '1px solid rgba(52,199,89,0.22)' }}>
            <CheckCircle2 size={13} color="#34C759" />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#34C759' }}>Alles im Griff</span>
          </div>
        ) : (
          alertItems.map(item => (
            <button key={item.key}
              onClick={item.onClick || undefined}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '99px', background: item.bg, border: `1px solid ${item.border}`, cursor: item.onClick ? 'pointer' : 'default', fontSize: '12px', fontWeight: '600', color: item.color, transition: 'opacity 0.1s' }}
              onMouseEnter={e => { if (item.onClick) e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <item.icon size={12} />
              {item.label}
            </button>
          ))
        )}
      </div>

      {/* ── Mini KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(0,0,0,0.06)', borderRadius: '14px', overflow: 'hidden', marginBottom: '26px', border: '1px solid rgba(0,0,0,0.06)' }}>
        {[
          {
            label: 'Aktive Websites',
            value: activeWebsites.length,
            sub: `${projects.length} gesamt`,
            urgent: false,
            onClick: () => navigate('/websites'),
          },
          {
            label: 'Offener Umsatz',
            value: formatCurrency(openAmount),
            sub: `${(stats?.unpaid_count || 0) + (stats?.overdue_count || 0)} Rechnungen offen`,
            urgent: overdueInvCount > 0,
            onClick: () => navigate('/invoices'),
          },
          {
            label: 'Follow-ups heute',
            value: dueTodayReminders.length,
            sub: dueTodayReminders.length > 0 ? 'Kunden nachfassen' : 'Keine fälligen',
            urgent: dueTodayReminders.length > 0,
            onClick: null,
          },
        ].map((kpi, i) => {
          const isDark = i === 0;
          const baseBg = isDark ? '#0F172A' : '#fff';
          return (
            <button key={i}
              onClick={kpi.onClick || undefined}
              style={{ padding: '15px 20px', background: baseBg, border: 'none', cursor: kpi.onClick ? 'pointer' : 'default', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (kpi.onClick) e.currentTarget.style.background = isDark ? '#1E293B' : '#FAFAFA'; }}
              onMouseLeave={e => e.currentTarget.style.background = baseBg}
            >
              <p style={{ fontSize: '10px', fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.5)' : '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>{kpi.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: isDark ? '#fff' : (kpi.urgent ? '#EF4444' : '#1D1D1F'), letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '4px' }}>{kpi.value}</p>
              <p style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.4)' : '#8E8E93' }}>{kpi.sub}</p>
            </button>
          );
        })}
      </div>

      {/* ── Aktive Websites Grid ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em', margin: 0 }}>
              Aktive Websites
            </h2>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#8E8E93', background: '#F2F2F7', padding: '2px 8px', borderRadius: '99px' }}>
              {activeWebsites.length}
            </span>
          </div>
          <button onClick={() => navigate('/websites')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
            Alle <ChevronRight size={13} />
          </button>
        </div>

        {activeWebsites.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Globe size={32} color="#D1D1D6" />
            <p style={{ fontSize: '14px', fontWeight: '500', color: '#8E8E93', margin: 0 }}>Noch keine aktiven Websites</p>
            <button onClick={() => navigate('/onboarding/wizard')}
              style={{ fontSize: '13px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
              Erste Website erstellen →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {activeWebsites.map(p => (
              <WebsiteCard
                key={p.id}
                project={p}
                onStatusChange={val => updateProject.mutate({ id: p.id, data: { status: val } })}
                onClick={() => navigate(`/projects/${p.id}`)}
              />
            ))}
            {/* New website card */}
            <button
              onClick={() => navigate('/onboarding/wizard')}
              style={{ borderRadius: '14px', border: '1.5px dashed #D1D1D6', background: 'transparent', cursor: 'pointer', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '120px', color: '#8E8E93', transition: 'border-color 0.12s, color 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0071E3'; e.currentTarget.style.color = '#0071E3'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D1D6'; e.currentTarget.style.color = '#8E8E93'; }}
            >
              <Plus size={20} />
              <span style={{ fontSize: '12px', fontWeight: '500' }}>Website erstellen</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom 3-col: Finanzen + Follow-ups + Time Tracking ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>

        {/* Finanzen */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '7px', margin: 0 }}>
              <TrendingUp size={15} color="#34C759" />
              Finanzen
            </h3>
            <button onClick={() => navigate('/invoices')}
              style={{ fontSize: '12px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              Alle <ChevronRight size={12} />
            </button>
          </div>

          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Offen',     value: stats?.unpaid_count  ?? 0, color: '#1D1D1F', bg: '#F5F5F7' },
              { label: 'Überfällig',value: stats?.overdue_count ?? 0, color: '#EF4444', bg: 'rgba(239,68,68,0.07)' },
              { label: 'Bezahlt',   value: stats?.paid_count    ?? 0, color: '#34C759', bg: 'rgba(52,199,89,0.07)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: '10px', background: s.bg }}>
                <p style={{ fontSize: '20px', fontWeight: '700', color: s.color, letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: '10px', color: '#8E8E93', marginTop: '3px' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Invoice list */}
          {openInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '14px 0', fontSize: '12px', color: '#8E8E93' }}>Keine offenen Rechnungen</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {openInvoices.map(inv => (
                <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {inv.status === 'overdue'
                    ? <AlertCircle size={13} color="#EF4444" style={{ flexShrink: 0 }} />
                    : <Send size={13} color="#8E8E93" style={{ flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1, fontSize: '12px', color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.client_name || inv.invoice_number || 'Rechnung'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: inv.status === 'overdue' ? '#EF4444' : '#1D1D1F', flexShrink: 0 }}>
                    {formatCurrency(inv.total || inv.amount || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-ups & Erinnerungen */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '7px', margin: 0 }}>
              <Bell size={15} color="#7C3AED" />
              Follow-ups
            </h3>
            {workflowReminders.filter(r => !r.done).length > 0 && (
              <span style={{ fontSize: '11px', color: '#8E8E93', background: '#F2F2F7', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>
                {workflowReminders.filter(r => !r.done).length}
              </span>
            )}
          </div>

          {dueTodayReminders.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '8px' }}>
              <CheckCircle2 size={24} color="#D1D1D6" />
              <p style={{ fontSize: '12px', color: '#8E8E93', margin: 0 }}>Keine Follow-ups heute</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '7px', margin: 0 }}>
              <Clock size={15} color="#0071E3" />
              Time Tracking
            </h3>
            <button onClick={() => navigate('/time')}
              style={{ fontSize: '12px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              Alle <ChevronRight size={12} />
            </button>
          </div>

          {/* Active timer indicator */}
          {activeTimer?.id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)', marginBottom: '14px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34C759', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#22A84A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeTimer.project_name || activeTimer.description || 'Läuft gerade'}
              </span>
              <Timer size={12} color="#22A84A" />
            </div>
          )}

          {/* Weekly stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', background: '#F5F5F7', textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
                {timeSummary?.week_hours != null ? `${Math.floor(timeSummary.week_hours)}h` : '—'}
              </p>
              <p style={{ fontSize: '10px', color: '#8E8E93', marginTop: '3px' }}>Diese Woche</p>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', background: '#F5F5F7', textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
                {timeSummary?.today_hours != null ? `${Math.floor(timeSummary.today_hours)}h` : '—'}
              </p>
              <p style={{ fontSize: '10px', color: '#8E8E93', marginTop: '3px' }}>Heute</p>
            </div>
          </div>

          {timeSummary?.month_hours != null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#8E8E93' }}>Diesen Monat</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1D1D1F' }}>{Math.floor(timeSummary.month_hours)}h</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
