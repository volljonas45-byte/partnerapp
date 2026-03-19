import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Folder, Clock, AlertTriangle, Euro, Plus, ArrowRight,
  FileText, ChevronRight, CheckCircle2,
  AlertCircle, ChevronDown, UserCheck, TrendingUp,
  MessageSquare, PlayCircle, Zap,
  CalendarClock, BadgeCheck, Send,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { invoicesApi } from '../api/invoices';
import { onboardingApi } from '../api/onboarding';
import { formatCurrency, formatDate, isPast } from '../utils/formatters';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_STATUSES = [
  { value: 'planned',            label: 'Geplant',          dot: 'bg-gray-400',    pill: 'bg-gray-100 text-gray-600 ring-gray-200' },
  { value: 'active',             label: 'Aktiv',            dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { value: 'waiting_for_client', label: 'Warten auf Kunde', dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { value: 'feedback',           label: 'Überarbeitung',    dot: 'bg-orange-500',  pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
  { value: 'review',             label: 'Review',           dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { value: 'waiting',            label: 'Fertigstellung',   dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { value: 'completed',          label: 'Abgeschlossen',    dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
];

function statusCfg(s) {
  return PROJECT_STATUSES.find(x => x.value === s) || PROJECT_STATUSES[0];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now  = new Date(); now.setHours(0, 0, 0, 0);
  const then = new Date(dateStr); then.setHours(0, 0, 0, 0);
  return Math.round((then - now) / 86400000);
}

function nextStep(project) {
  const days   = daysUntil(project.deadline);
  const overdue = project.deadline && isPast(project.deadline) && project.status !== 'completed';

  if (project.status === 'completed')
    return { label: 'Abgeschlossen', color: 'text-emerald-600', urgent: false };
  if (overdue)
    return { label: 'Deadline überschritten', color: 'text-red-600', urgent: true };
  if (project.status === 'waiting_for_client')
    return { label: 'Kunde kontaktieren', color: 'text-amber-600', urgent: true };
  if (project.status === 'planned')
    return { label: 'Kick-off planen', color: 'text-blue-600', urgent: false };
  if (project.status === 'active' && days !== null && days <= 3)
    return { label: `${days}d bis Deadline`, color: 'text-orange-600', urgent: true };
  if (project.status === 'active')
    return { label: 'In Bearbeitung', color: 'text-blue-600', urgent: false };
  if (project.status === 'review' || project.status === 'feedback')
    return { label: 'Feedback einarbeiten', color: 'text-violet-600', urgent: false };
  if (project.status === 'waiting')
    return { label: 'Fertigstellung prüfen', color: 'text-violet-600', urgent: false };
  return { label: '—', color: 'text-gray-400', urgent: false };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, iconBg, iconColor, urgent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card text-left w-full hover:shadow-md transition-all duration-150 group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
          <p className={`text-2xl font-bold tracking-tight ${urgent ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1 leading-snug">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
    </button>
  );
}

function TodayCard({ borderColor, bg, icon: Icon, iconColor, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 ${borderColor} ${bg} hover:brightness-95 transition-all duration-100 text-left min-w-[220px] max-w-[280px] shrink-0 group`}
    >
      <Icon size={15} className={`shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{subtitle}</p>
      </div>
      <ArrowRight size={12} className="shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

function StatusSelector({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = statusCfg(status);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ring-1 hover:opacity-80 transition-opacity ${cfg.pill}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        {cfg.label}
        <ChevronDown size={9} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30">
          {PROJECT_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={e => { e.stopPropagation(); onChange(s.value); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              <span className={s.value === status ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                {s.label}
              </span>
              {s.value === status && <CheckCircle2 size={11} className="ml-auto text-gray-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeadlineCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const overdue = value && isPast(value);

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={value || ''}
        autoFocus
        onBlur={e => { onChange(e.target.value || null); setEditing(false); }}
        onKeyDown={e => e.key === 'Escape' && setEditing(false)}
        onClick={e => e.stopPropagation()}
        className="text-xs border border-indigo-300 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 w-32"
      />
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      className={`text-xs flex items-center gap-1 hover:underline transition-colors ${
        overdue
          ? 'text-red-600 font-medium'
          : value
            ? 'text-gray-500'
            : 'text-gray-300 hover:text-gray-400'
      }`}
    >
      {overdue && <AlertTriangle size={11} />}
      {value ? formatDate(value) : 'Setzen…'}
    </button>
  );
}

function OnboardingProgressBar({ flow, templates }) {
  const template  = templates.find(t => t.id === flow.template_id);
  const total     = template?.steps?.length ?? template?.step_count ?? flow.total_steps ?? 1;
  const completed = flow.completed_steps ?? flow.current_step ?? 0;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-700 font-medium truncate max-w-[160px]">
          {flow.client_name || flow.name || 'Onboarding'}
        </span>
        <span className="text-[11px] text-gray-400 ml-2 shrink-0">{completed}/{total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const { data: flows = [] } = useQuery({
    queryKey: ['onboarding', 'flows'],
    queryFn: () => onboardingApi.listFlows().then(r => r.data),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['onboarding', 'templates'],
    queryFn: () => onboardingApi.listTemplates().then(r => r.data),
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => projectsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    onError: () => toast.error('Fehler beim Speichern'),
  });

  // ── Derived data ─────────────────────────────────────────────────────────────

  const activeCount         = projects.filter(p => p.status === 'active').length;
  const waitingCount        = projects.filter(p => p.status === 'waiting_for_client').length;
  const overdueProjectCount = projects.filter(
    p => p.status !== 'completed' && p.deadline && isPast(p.deadline)
  ).length;
  const openAmount          = (stats?.unpaid_revenue || 0) + (stats?.overdue_revenue || 0);
  const overdueInvoiceCount = stats?.overdue_count || 0;

  const tableProjects = projects.filter(p => p.status !== 'completed').slice(0, 12);
  const activeFlows   = flows.filter(f => f.status !== 'completed').slice(0, 5);
  const openInvoices  = invoices
    .filter(i => ['sent', 'unpaid', 'overdue'].includes(i.status))
    .slice(0, 5);

  // ── "Heute" items ─────────────────────────────────────────────────────────────

  const deadlineSoonCount = projects.filter(p => {
    if (p.status === 'completed' || !p.deadline) return false;
    const d = daysUntil(p.deadline);
    return d !== null && d >= 0 && d <= 3;
  }).length;

  const todayItems = [];

  if (waitingCount > 0) {
    todayItems.push({
      key: 'waiting',
      borderColor: 'border-amber-400',
      bg: 'bg-amber-50',
      icon: MessageSquare,
      iconColor: 'text-amber-600',
      title: `${waitingCount} ${waitingCount === 1 ? 'Projekt wartet' : 'Projekte warten'} auf Kundeneingabe`,
      subtitle: 'Erinnerung senden oder Status prüfen',
      onClick: () => navigate('/projects?filter=waiting_for_client'),
    });
  }

  if (deadlineSoonCount > 0) {
    todayItems.push({
      key: 'deadline-soon',
      borderColor: 'border-orange-400',
      bg: 'bg-orange-50',
      icon: CalendarClock,
      iconColor: 'text-orange-600',
      title: `${deadlineSoonCount} ${deadlineSoonCount === 1 ? 'Deadline' : 'Deadlines'} in den nächsten 3 Tagen`,
      subtitle: 'Rechtzeitig fertigstellen',
      onClick: () => navigate('/projects'),
    });
  }

  if (overdueProjectCount > 0) {
    todayItems.push({
      key: 'overdue-projects',
      borderColor: 'border-red-400',
      bg: 'bg-red-50',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      title: `${overdueProjectCount} überfällige ${overdueProjectCount === 1 ? 'Deadline' : 'Deadlines'}`,
      subtitle: 'Sofort handeln',
      onClick: () => navigate('/projects'),
    });
  }

  if (overdueInvoiceCount > 0) {
    todayItems.push({
      key: 'overdue-invoices',
      borderColor: 'border-red-500',
      bg: 'bg-red-50',
      icon: Euro,
      iconColor: 'text-red-600',
      title: `${overdueInvoiceCount} überfällige ${overdueInvoiceCount === 1 ? 'Rechnung' : 'Rechnungen'}`,
      subtitle: 'Zahlungserinnerung versenden',
      onClick: () => navigate('/invoices?filter=overdue'),
    });
  }

  // ── Greeting ──────────────────────────────────────────────────────────────────

  const greeting = getGreeting();
  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10 px-8 pt-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{greeting}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/onboarding/wizard')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          >
            <Zap size={13} className="text-indigo-500" />
            Wizard
          </button>
          <button
            onClick={() => navigate('/invoices/new')}
            className="btn-primary inline-flex items-center gap-1.5 text-xs px-3 py-2"
          >
            <Plus size={13} />
            Neue Rechnung
          </button>
        </div>
      </div>

      {/* ── Heute ── */}
      {todayItems.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <BadgeCheck size={16} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-700">Alles erledigt</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              Keine dringenden Aufgaben heute. Gute Arbeit!
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Heute</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {todayItems.map(item => (
              <TodayCard key={item.key} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Aktive Projekte"
          value={activeCount}
          sub={`${projects.length} Projekte gesamt`}
          icon={Folder}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          onClick={() => navigate('/projects')}
        />
        <KPICard
          label="Warten auf Kunde"
          value={waitingCount}
          sub={waitingCount > 0 ? 'Reaktion ausstehend' : 'Keine offenen Eingaben'}
          icon={MessageSquare}
          iconBg={waitingCount > 0 ? 'bg-amber-50' : 'bg-gray-50'}
          iconColor={waitingCount > 0 ? 'text-amber-500' : 'text-gray-400'}
          urgent={false}
          onClick={() => navigate('/projects?filter=waiting_for_client')}
        />
        <KPICard
          label="Überfällig"
          value={overdueProjectCount}
          sub={overdueProjectCount > 0 ? 'Sofort prüfen' : 'Alles im Zeitplan'}
          icon={AlertTriangle}
          iconBg={overdueProjectCount > 0 ? 'bg-red-50' : 'bg-gray-50'}
          iconColor={overdueProjectCount > 0 ? 'text-red-500' : 'text-gray-400'}
          urgent={overdueProjectCount > 0}
          onClick={() => navigate('/projects')}
        />
        <KPICard
          label="Offene Rechnungen"
          value={formatCurrency(openAmount)}
          sub={`${(stats?.unpaid_count || 0) + (stats?.overdue_count || 0)} Rechnungen offen`}
          icon={Euro}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          onClick={() => navigate('/invoices')}
        />
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ── Left: Project Table ── */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-800">Projekte</h2>
              {tableProjects.length > 0 && (
                <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">
                  {tableProjects.length}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5"
            >
              Alle anzeigen <ChevronRight size={12} />
            </button>
          </div>

          {tableProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder size={28} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400 font-medium">Keine aktiven Projekte</p>
              <button
                onClick={() => navigate('/projects/new')}
                className="mt-3 text-xs text-indigo-600 hover:underline font-medium"
              >
                Projekt erstellen
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-[10px] text-gray-400 uppercase tracking-wider">
                      Projekt
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[10px] text-gray-400 uppercase tracking-wider">
                      Kunde
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[10px] text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[10px] text-gray-400 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="text-left px-3 py-2.5 font-semibold text-[10px] text-gray-400 uppercase tracking-wider">
                      Nächster Schritt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableProjects.map(project => {
                    const step = nextStep(project);
                    return (
                      <tr
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="hover:bg-gray-50/70 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {project.name}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-gray-500 line-clamp-1">
                            {project.client_name || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <StatusSelector
                            status={project.status}
                            onChange={val =>
                              updateProject.mutate({ id: project.id, data: { status: val } })
                            }
                          />
                        </td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <DeadlineCell
                            value={project.deadline}
                            onChange={val =>
                              updateProject.mutate({ id: project.id, data: { deadline: val || null } })
                            }
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`font-medium flex items-center gap-1.5 ${step.color}`}>
                            {step.urgent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0 opacity-70" />
                            )}
                            {step.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-4">

          {/* Onboarding */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <PlayCircle size={14} className="text-indigo-500" />
                Onboarding
              </h3>
              <button
                onClick={() => navigate('/onboarding')}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5"
              >
                Alle <ChevronRight size={12} />
              </button>
            </div>

            {activeFlows.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 size={22} className="text-gray-200 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400">Keine aktiven Flows</p>
                <button
                  onClick={() => navigate('/onboarding/new')}
                  className="mt-2 text-[11px] text-indigo-600 hover:underline font-medium"
                >
                  Flow starten
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeFlows.map(flow => (
                  <div
                    key={flow.id}
                    onClick={() => navigate(`/onboarding/${flow.id}`)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <OnboardingProgressBar flow={flow} templates={templates} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Finance mini */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-emerald-500" />
                Finanzen
              </h3>
              <button
                onClick={() => navigate('/invoices')}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5"
              >
                Alle <ChevronRight size={12} />
              </button>
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 rounded-lg bg-gray-50">
                <p className="text-base font-bold text-gray-800">{stats?.unpaid_count ?? 0}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Offen</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50">
                <p className="text-base font-bold text-red-600">{stats?.overdue_count ?? 0}</p>
                <p className="text-[10px] text-red-400 mt-0.5">Überfällig</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50">
                <p className="text-base font-bold text-emerald-600">{stats?.paid_count ?? 0}</p>
                <p className="text-[10px] text-emerald-500 mt-0.5">Bezahlt</p>
              </div>
            </div>

            {/* Open invoices list */}
            {openInvoices.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-xs text-gray-400">Keine offenen Rechnungen</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {openInvoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {inv.status === 'overdue' ? (
                        <AlertCircle size={12} className="text-red-500 shrink-0" />
                      ) : (
                        <Send size={12} className="text-gray-400 shrink-0" />
                      )}
                      <span className="text-xs text-gray-700 truncate">
                        {inv.client_name || inv.invoice_number || inv.number || 'Rechnung'}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${
                      inv.status === 'overdue' ? 'text-red-600' : 'text-gray-700'
                    }`}>
                      {formatCurrency(inv.total || inv.amount || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
