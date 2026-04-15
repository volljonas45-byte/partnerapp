import { useState, useMemo } from 'react';
import { useMobile } from '../hooks/useMobile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Briefcase, Search, Plus, ChevronRight, Timer,
  Flag, Calendar, ExternalLink, LayoutGrid, List, Filter,
  CheckCircle2, Clock, AlertCircle, X, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { areasApi } from '../api/areas';
import { clientsApi } from '../api/clients';
import ProjectTimerButton from '../components/ProjectTimerButton';
import { useTheme } from '../context/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  planned:            { label: 'Geplant',          color: 'var(--color-text-secondary)', darkColor: '#98989D', bg: 'rgba(142,142,147,0.10)', darkBg: 'rgba(152,152,157,0.12)' },
  active:             { label: 'Aktiv',             color: 'var(--color-blue)', darkColor: '#0A84FF', bg: 'rgba(0,122,255,0.08)',   darkBg: 'rgba(10,132,255,0.12)' },
  feedback:           { label: 'Feedback',          color: '#FF9500', darkColor: '#FF9F0A', bg: 'rgba(255,149,0,0.08)',   darkBg: 'rgba(255,159,10,0.12)' },
  review:             { label: 'Review',            color: '#AF52DE', darkColor: '#BF5AF2', bg: 'rgba(175,82,222,0.08)', darkBg: 'rgba(191,90,242,0.12)' },
  waiting_for_client: { label: 'Wartet auf Kunde',  color: '#FF9500', darkColor: '#FF9F0A', bg: 'rgba(255,149,0,0.08)',   darkBg: 'rgba(255,159,10,0.12)' },
  waiting:            { label: 'Wartend',           color: '#FF9500', darkColor: '#FF9F0A', bg: 'rgba(255,149,0,0.08)',   darkBg: 'rgba(255,159,10,0.12)' },
  completed:          { label: 'Abgeschlossen',     color: '#34C759', darkColor: '#30D158', bg: 'rgba(52,199,89,0.08)',   darkBg: 'rgba(48,209,88,0.12)' },
  deferred:           { label: 'Verschoben',        color: 'var(--color-text-secondary)', darkColor: '#98989D', bg: 'rgba(142,142,147,0.10)', darkBg: 'rgba(152,152,157,0.12)' },
  on_hold:            { label: 'Pausiert',          color: '#FF9500', darkColor: '#FF9F0A', bg: 'rgba(255,149,0,0.08)',   darkBg: 'rgba(255,159,10,0.12)' },
};

const PRIORITY_CFG = {
  high:   { color: '#FF3B30', label: 'Hoch' },
  medium: { color: '#FF9500', label: 'Mittel' },
  low:    { color: '#34C759', label: 'Niedrig' },
  none:   { color: 'var(--color-text-tertiary)', label: '—' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWebsite(p) {
  return !p.project_type || p.project_type === 'website';
}

function relDeadline(iso) {
  if (!iso) return null;
  const diff = Math.round((new Date(iso) - Date.now()) / 86400000);
  if (diff < 0)  return { text: `${Math.abs(diff)}d überfällig`, color: '#FF3B30' };
  if (diff === 0) return { text: 'Heute fällig',                  color: '#FF9500' };
  if (diff <= 3)  return { text: `in ${diff} Tagen`,              color: '#FF9500' };
  return { text: new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }), color: 'var(--color-text-secondary)' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status, size = 'md', isDark }) {
  const s = STATUS_CFG[status] || STATUS_CFG.planned;
  const pad = size === 'sm' ? '2px 8px' : '3px 10px';
  const fs  = size === 'sm' ? 11 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: pad, borderRadius: 6, fontSize: fs, fontWeight: 500,
      background: isDark ? s.darkBg : s.bg,
      color: isDark ? s.darkColor : s.color,
      whiteSpace: 'nowrap', letterSpacing: '-0.006em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isDark ? s.darkColor : s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function TypeBadge({ isWeb, isDark }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
      background: isWeb
        ? (isDark ? 'rgba(10,132,255,0.12)' : 'rgba(0,122,255,0.08)')
        : (isDark ? 'rgba(191,90,242,0.12)' : 'rgba(175,82,222,0.08)'),
      color: isWeb
        ? (isDark ? '#0A84FF' : 'var(--color-blue)')
        : (isDark ? '#BF5AF2' : '#AF52DE'),
    }}>
      {isWeb ? <Globe size={10} strokeWidth={2} /> : <Briefcase size={10} strokeWidth={2} />}
      {isWeb ? 'Website' : 'Projekt'}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, c, isDark }) {
  return (
    <div style={{
      background: c.card, borderRadius: 12, padding: '18px 20px',
      border: `0.5px solid ${c.borderSubtle}`,
      boxShadow: isDark
        ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2)'
        : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle)',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isDark ? `${color}1F` : `${color}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: c.text, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: c.textTertiary, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick, c, isDark }) {
  const web = isWebsite(project);
  const deadline = relDeadline(project.deadline);
  const accent = web ? (isDark ? '#0A84FF' : 'var(--color-blue)') : (isDark ? '#BF5AF2' : '#AF52DE');
  const tasks = project.task_count || 0;
  const doneTasks = project.done_task_count || 0;
  const progress = tasks > 0 ? Math.round((doneTasks / tasks) * 100) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: c.card, borderRadius: 12, padding: 0,
        border: `0.5px solid ${c.borderSubtle}`,
        boxShadow: isDark
          ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.25)'
          : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle), 0 6px 20px var(--color-border-subtle)',
        cursor: 'pointer', overflow: 'hidden',
        transition: 'box-shadow 0.25s cubic-bezier(0.22,1,0.36,1), transform 0.25s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = isDark
          ? '0 0 0 0.5px rgba(255,255,255,0.06), 0 8px 28px rgba(0,0,0,0.4)'
          : '0 0 0 0.5px var(--color-border-subtle), 0 8px 28px var(--color-border-subtle)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = isDark
          ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.25)'
          : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle), 0 6px 20px var(--color-border-subtle)';
        e.currentTarget.style.transform = '';
      }}
    >
      {/* Colored top bar */}
      <div style={{ height: 3, background: accent }} />

      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: c.text,
              letterSpacing: '-0.2px', lineHeight: 1.3, wordBreak: 'break-word',
            }}>
              {project.name}
            </div>
            {project.client_name && (
              <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>{project.client_name}</div>
            )}
          </div>
          <TypeBadge isWeb={web} isDark={isDark} />
        </div>

        {/* Status + Priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <StatusPill status={project.status} size="sm" isDark={isDark} />
          {project.priority && project.priority !== 'none' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 11, fontWeight: 600,
              color: PRIORITY_CFG[project.priority]?.color || 'var(--color-text-tertiary)',
            }}>
              <Flag size={9} strokeWidth={2.5} />
              {PRIORITY_CFG[project.priority]?.label}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {tasks > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: c.textSecondary }}>{doneTasks}/{tasks} Tasks</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: accent }}>{progress}%</span>
            </div>
            <div style={{ height: 4, background: c.inputBg, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`, background: accent, borderRadius: 99,
                transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
              }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {deadline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: deadline.color }}>
                <Calendar size={10} strokeWidth={2} />
                {deadline.text}
              </span>
            )}
          </div>
          <div onClick={e => e.stopPropagation()}>
            <ProjectTimerButton projectId={project.id} projectName={project.name} size="small" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Row view ─────────────────────────────────────────────────────────────────

function ProjectRow({ project, onClick, c, isDark }) {
  const web = isWebsite(project);
  const deadline = relDeadline(project.deadline);
  const accent = web ? (isDark ? '#0A84FF' : 'var(--color-blue)') : (isDark ? '#BF5AF2' : '#AF52DE');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 130px 110px 100px 80px',
        alignItems: 'center', gap: 12, padding: '11px 16px',
        cursor: 'pointer', borderBottom: `0.5px solid ${c.borderSubtle}`,
        transition: 'background 0.12s cubic-bezier(0.22,1,0.36,1)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = c.cardHover}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      {/* Name + client */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ width: 3, height: 28, borderRadius: 99, background: accent, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.text, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.name}
          </div>
          {project.client_name && (
            <div style={{ fontSize: 11, color: c.textTertiary }}>{project.client_name}</div>
          )}
        </div>
      </div>

      <TypeBadge isWeb={web} isDark={isDark} />
      <StatusPill status={project.status} size="sm" isDark={isDark} />

      <div style={{ fontSize: 12, color: deadline?.color || c.textTertiary }}>
        {deadline?.text || '—'}
      </div>

      <div style={{ fontSize: 12, color: c.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {project.area_name || '—'}
      </div>

      <div onClick={e => e.stopPropagation()}>
        <ProjectTimerButton projectId={project.id} projectName={project.name} size="small" />
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ type, onClose, onCreate, isPending, clients, c, isDark }) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('planned');
  const [deadline, setDeadline] = useState('');

  const isWeb = type === 'website';
  const accent = isWeb ? (isDark ? '#0A84FF' : 'var(--color-blue)') : (isDark ? '#BF5AF2' : '#AF52DE');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      client_id: clientId || null,
      status,
      deadline: deadline || null,
      project_type: isWeb ? 'website' : 'project',
    });
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: `1px solid ${c.border}`, outline: 'none', boxSizing: 'border-box',
    background: c.inputBg, color: c.text,
    transition: 'border-color 0.2s cubic-bezier(0.22,1,0.36,1)',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: c.overlayBg,
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          animation: 'backdropIn 0.15s cubic-bezier(0.22,1,0.36,1) both',
        }}
      />
      <div
        className="animate-scale-in"
        style={{
          position: 'relative',
          background: c.card, borderRadius: 14, padding: '24px 24px 20px',
          width: '100%', maxWidth: 420,
          border: `0.5px solid ${c.borderSubtle}`,
          boxShadow: isDark
            ? '0 24px 72px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)'
            : '0 24px 72px rgba(0,0,0,0.14), 0 8px 24px var(--color-border-subtle)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: isDark ? `${accent}1F` : `${accent}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isWeb ? <Globe size={16} color={accent} strokeWidth={1.8} /> : <Briefcase size={16} color={accent} strokeWidth={1.8} />}
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: c.text, letterSpacing: '-0.016em' }}>
              Neue {isWeb ? 'Website' : 'Projekt'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: c.inputBg, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = c.inputBgHover}
            onMouseLeave={e => e.currentTarget.style.background = c.inputBg}
          >
            <X size={12} color={c.textSecondary} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary, marginBottom: 5, display: 'block' }}>Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isWeb ? 'z.B. Müller GmbH Website' : 'z.B. SEO-Kampagne Q1'}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e => e.target.style.borderColor = c.border}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary, marginBottom: 5, display: 'block' }}>Kunde</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Kein Kunde</option>
              {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary, marginBottom: 5, display: 'block' }}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary, marginBottom: 5, display: 'block' }}>Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="btn-primary"
              style={{
                flex: 2,
                background: name.trim() ? accent : c.inputBg,
                color: name.trim() ? '#fff' : c.textTertiary,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                opacity: name.trim() ? 1 : 0.6,
              }}
            >
              {isPending ? 'Erstellen...' : `${isWeb ? 'Website' : 'Projekt'} erstellen`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',     label: 'Alle',     icon: Filter   },
  { key: 'website', label: 'Websites', icon: Globe    },
  { key: 'project', label: 'Projekte', icon: Briefcase },
];

export default function WorkOverview() {
  const { c, isDark } = useTheme();
  const isMobile  = useMobile();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [tab,          setTab]          = useState('all');
  const [viewMode,     setViewMode]     = useState('grid');
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDone,     setShowDone]     = useState(false);
  const [createType,   setCreateType]   = useState(null);

  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.list,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (newProject) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`${isWebsite(newProject) ? 'Website' : 'Projekt'} erstellt`);
      setCreateType(null);
      const path = isWebsite(newProject) ? `/websites/${newProject.id}` : `/projects/${newProject.id}`;
      navigate(path);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  // KPIs
  const websites  = useMemo(() => allProjects.filter(isWebsite), [allProjects]);
  const projects  = useMemo(() => allProjects.filter(p => !isWebsite(p)), [allProjects]);
  const activeWeb = useMemo(() => websites.filter(p => p.status === 'active').length, [websites]);
  const activePrj = useMemo(() => projects.filter(p => p.status === 'active').length, [projects]);
  const overdueAll = useMemo(() => allProjects.filter(p =>
    p.deadline && new Date(p.deadline) < new Date() && p.status !== 'completed'
  ).length, [allProjects]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = allProjects;
    if (tab === 'website') list = list.filter(isWebsite);
    if (tab === 'project') list = list.filter(p => !isWebsite(p));
    if (!showDone) list = list.filter(p => p.status !== 'completed');
    if (filterStatus) list = list.filter(p => p.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allProjects, tab, showDone, filterStatus, search]);

  const areaMap = useMemo(() => Object.fromEntries(areas.map(a => [a.id, a.name])), [areas]);

  const enriched = useMemo(() => filtered.map(p => ({
    ...p,
    area_name: areaMap[p.area_id] || null,
  })), [filtered, areaMap]);

  function handleClick(project) {
    const path = isWebsite(project) ? `/websites/${project.id}` : `/projects/${project.id}`;
    navigate(path);
  }

  const cardStyle = {
    background: c.card,
    borderRadius: 12,
    border: `0.5px solid ${c.borderSubtle}`,
    boxShadow: isDark
      ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.25)'
      : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle), 0 6px 20px var(--color-border-subtle)',
  };

  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', background: c.bg }}>

      {/* ── Header ── */}
      <div style={{
        background: isDark ? 'rgba(10,10,10,0.85)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: `0.5px solid ${c.borderSubtle}`, padding: '20px 28px 0', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: c.text, letterSpacing: '-0.025em', margin: 0, lineHeight: 1.15 }}>
              Arbeit
            </h1>
            <p style={{ fontSize: 13, color: c.textSecondary, margin: '4px 0 0', letterSpacing: '-0.006em' }}>
              {allProjects.length} Einträge · {activeWeb} Websites aktiv · {activePrj} Projekte aktiv
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCreateType('website')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: isDark ? 'rgba(10,132,255,0.12)' : 'rgba(0,122,255,0.08)',
                color: c.blue, border: 'none', cursor: 'pointer',
                transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(10,132,255,0.2)' : 'rgba(0,122,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(10,132,255,0.12)' : 'rgba(0,122,255,0.08)'}
            >
              <Globe size={14} strokeWidth={2} />
              Website
            </button>
            <button
              onClick={() => setCreateType('project')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: isDark ? 'rgba(191,90,242,0.12)' : 'rgba(175,82,222,0.08)',
                color: isDark ? '#BF5AF2' : '#AF52DE', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(191,90,242,0.2)' : 'rgba(175,82,222,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(191,90,242,0.12)' : 'rgba(175,82,222,0.08)'}
            >
              <Briefcase size={14} strokeWidth={2} />
              Projekt
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', fontSize: 13, fontWeight: tab === t.key ? 600 : 500,
                color: tab === t.key ? c.text : c.textTertiary,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.key ? `2px solid ${c.blue}` : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <t.icon size={13} strokeWidth={2} />
              {t.label}
              <span style={{
                padding: '1px 6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: tab === t.key ? c.blue : c.inputBg,
                color: tab === t.key ? '#fff' : c.textTertiary,
              }}>
                {t.key === 'all' ? allProjects.length
                  : t.key === 'website' ? websites.length
                  : projects.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: isMobile ? '16px 14px' : '20px 28px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── KPI row ── */}
        <div style={isMobile ? {
          display: 'flex', overflowX: 'auto', gap: 10, marginBottom: 18,
          paddingBottom: 4, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        } : {
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20,
        }}>
          <div style={isMobile ? { minWidth: 150, flexShrink: 0 } : {}}>
            <KpiCard icon={Globe}         label="Websites aktiv"  value={activeWeb}          color={isDark ? '#0A84FF' : 'var(--color-blue)'} c={c} isDark={isDark} />
          </div>
          <div style={isMobile ? { minWidth: 150, flexShrink: 0 } : {}}>
            <KpiCard icon={Briefcase}     label="Projekte aktiv"  value={activePrj}          color={isDark ? '#BF5AF2' : '#AF52DE'} c={c} isDark={isDark} />
          </div>
          <div style={isMobile ? { minWidth: 150, flexShrink: 0 } : {}}>
            <KpiCard icon={CheckCircle2}  label="Gesamt aktiv"    value={activeWeb + activePrj} color={isDark ? '#30D158' : '#34C759'} c={c} isDark={isDark} sub={`von ${allProjects.length} gesamt`} />
          </div>
          <div style={isMobile ? { minWidth: 150, flexShrink: 0 } : {}}>
            <KpiCard icon={AlertCircle}   label="Überfällig"      value={overdueAll}         color={isDark ? '#FF453A' : '#FF3B30'} c={c} isDark={isDark} sub={overdueAll > 0 ? 'Deadline überschritten' : 'Alles im Plan'} />
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          ...cardStyle, padding: '10px 14px',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={14} color={c.textTertiary} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="input"
              style={{ width: '100%', paddingLeft: 32, height: 34, fontSize: 13 }}
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input"
            style={{ height: 34, fontSize: 13, cursor: 'pointer', paddingRight: 28 }}
          >
            <option value="">Alle Status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Show done */}
          <button
            onClick={() => setShowDone(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: `0.5px solid ${c.borderSubtle}`,
              background: showDone ? c.blueLight : c.inputBg,
              color: showDone ? c.blue : c.textSecondary, cursor: 'pointer',
              transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <CheckCircle2 size={13} strokeWidth={2} />
            Abgeschlossen
          </button>

          <div style={{ flex: 1 }} />

          {/* View toggle */}
          <div style={{ display: 'flex', background: c.inputBg, borderRadius: 8, padding: 3 }}>
            {[['grid', LayoutGrid], ['list', List]].map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: viewMode === mode ? c.card : 'transparent',
                  color: viewMode === mode ? c.text : c.textTertiary,
                  boxShadow: viewMode === mode
                    ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px var(--color-border-subtle)')
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                <Icon size={15} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: c.textSecondary, fontSize: 14 }}>
            <div className="skeleton" style={{ width: 120, height: 16, margin: '0 auto 8px', borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 80, height: 12, margin: '0 auto', borderRadius: 6 }} />
          </div>
        ) : enriched.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0', ...cardStyle,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: c.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Filter size={20} color={c.blue} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: '-0.01em' }}>Keine Einträge gefunden</div>
            <div style={{ fontSize: 13, color: c.textSecondary, marginTop: 4 }}>
              {search || filterStatus ? 'Filter anpassen oder zurücksetzen' : 'Erstelle deine erste Website oder Projekt'}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {enriched.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => handleClick(p)} c={c} isDark={isDark} />
            ))}
          </div>
        ) : (
          <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
            {/* List header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 130px 110px 100px 80px',
              gap: 12, padding: '9px 16px',
              background: c.cardSecondary, borderBottom: `0.5px solid ${c.borderSubtle}`,
              fontSize: 12, fontWeight: 500, color: c.textSecondary, letterSpacing: '-0.006em',
            }}>
              <span>Name</span>
              <span>Typ</span>
              <span>Status</span>
              <span>Deadline</span>
              <span>Bereich</span>
              <span>Timer</span>
            </div>
            {enriched.map(p => (
              <ProjectRow key={p.id} project={p} onClick={() => handleClick(p)} c={c} isDark={isDark} />
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {createType && (
        <CreateModal
          type={createType}
          onClose={() => setCreateType(null)}
          onCreate={data => createMutation.mutate(data)}
          isPending={createMutation.isPending}
          clients={clients}
          c={c}
          isDark={isDark}
        />
      )}
    </div>
  );
}
