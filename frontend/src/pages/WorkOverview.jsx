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
  planned:            { label: 'Geplant',          color: c.textSecondary, bg: 'rgba(118,118,128,0.1)'  },
  active:             { label: 'Aktiv',             color: '#0071E3', bg: 'rgba(0,113,227,0.1)'    },
  feedback:           { label: 'Feedback',          color: '#C05621', bg: 'rgba(192,86,33,0.1)'    },
  review:             { label: 'Review',            color: '#6D28D9', bg: 'rgba(109,40,217,0.1)'   },
  waiting_for_client: { label: 'Wartet auf Kunde',  color: '#B35A00', bg: 'rgba(179,90,0,0.1)'     },
  waiting:            { label: 'Wartend',           color: '#B35A00', bg: 'rgba(179,90,0,0.1)'     },
  completed:          { label: 'Abgeschlossen',     color: '#1A8F40', bg: 'rgba(26,143,64,0.1)'    },
  deferred:           { label: 'Verschoben',        color: '#64748B', bg: 'rgba(100,116,139,0.1)'  },
  on_hold:            { label: 'Pausiert',          color: '#FF9500', bg: 'rgba(255,149,0,0.1)'    },
};

const PRIORITY_CFG = {
  high:   { color: '#FF3B30', label: 'Hoch' },
  medium: { color: '#FF9500', label: 'Mittel' },
  low:    { color: '#34C759', label: 'Niedrig' },
  none:   { color: '#C7C7CC', label: '—' },
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
  return { text: new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }), color: c.textSecondary };
}

function avatarInitials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function avatarBg(s = '') {
  const cs = ['#BF5AF2', '#0071E3', '#34C759', '#FF9500', '#FF3B30'];
  let h = 0;
  for (const c of s) h = c.charCodeAt(0) + ((h << 5) - h);
  return cs[Math.abs(h) % cs.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status, size = 'md' }) {
  const c = STATUS_CFG[status] || STATUS_CFG.planned;
  const pad = size === 'sm' ? '2px 7px' : '3px 10px';
  const fs  = size === 'sm' ? '10.5px' : '11.5px';
  return (
    <span style={{
      padding: pad, borderRadius: 99, fontSize: fs, fontWeight: 600,
      background: c.bg, color: c.color, whiteSpace: 'nowrap', letterSpacing: '-0.01em',
    }}>
      {c.label}
    </span>
  );
}

function TypeBadge({ isWeb }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: '10.5px', fontWeight: 600,
      background: isWeb ? 'rgba(0,113,227,0.08)' : 'rgba(109,40,217,0.08)',
      color: isWeb ? '#0057B8' : '#5B21B6',
    }}>
      {isWeb ? <Globe size={10} /> : <Briefcase size={10} />}
      {isWeb ? 'Website' : 'Projekt'}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      background: c.card, borderRadius: 14, padding: '18px 20px',
      border: `1px solid ${c.borderSubtle}`, display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: c.text, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }) {
  const web = isWebsite(project);
  const deadline = relDeadline(project.deadline);
  const accent = web ? '#0071E3' : '#7C3AED';
  const tasks = project.task_count || 0;
  const doneTasks = project.done_task_count || 0;
  const progress = tasks > 0 ? Math.round((doneTasks / tasks) * 100) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: c.card, borderRadius: 14, padding: '0',
        border: `1px solid ${c.borderSubtle}`, cursor: 'pointer', overflow: 'hidden',
        transition: 'box-shadow 0.15s, transform 0.15s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {/* Colored top bar */}
      <div style={{ height: 3, background: accent }} />

      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: c.text,
              letterSpacing: '-0.2px', lineHeight: '1.3', wordBreak: 'break-word',
            }}>
              {project.name}
            </div>
            {project.client_name && (
              <div style={{ fontSize: 11.5, color: c.textSecondary, marginTop: 2 }}>{project.client_name}</div>
            )}
          </div>
          <TypeBadge isWeb={web} />
        </div>

        {/* Status + Priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <StatusPill status={project.status} size="sm" />
          {project.priority && project.priority !== 'none' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: '10.5px', fontWeight: 600,
              color: PRIORITY_CFG[project.priority]?.color || '#C7C7CC',
            }}>
              <Flag size={9} />
              {PRIORITY_CFG[project.priority]?.label}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {tasks > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10.5, color: c.textSecondary }}>{doneTasks}/{tasks} Tasks</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: accent }}>{progress}%</span>
            </div>
            <div style={{ height: 4, background: c.cardSecondary, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: accent, borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {deadline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: deadline.color }}>
                <Calendar size={10} />
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

function ProjectRow({ project, onClick }) {
  const web = isWebsite(project);
  const deadline = relDeadline(project.deadline);
  const accent = web ? '#0071E3' : '#7C3AED';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 130px 110px 100px 80px',
        alignItems: 'center', gap: 12, padding: '11px 16px',
        cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9F9FB'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      {/* Name + client */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ width: 3, height: 28, borderRadius: 99, background: accent, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: c.text, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.name}
          </div>
          {project.client_name && (
            <div style={{ fontSize: 11, color: '#AEAEB2' }}>{project.client_name}</div>
          )}
        </div>
      </div>

      {/* Type */}
      <TypeBadge isWeb={web} />

      {/* Status */}
      <StatusPill status={project.status} size="sm" />

      {/* Deadline */}
      <div style={{ fontSize: 12, color: deadline?.color || '#AEAEB2' }}>
        {deadline?.text || '—'}
      </div>

      {/* Area */}
      <div style={{ fontSize: 11.5, color: c.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {project.area_name || '—'}
      </div>

      {/* Timer */}
      <div onClick={e => e.stopPropagation()}>
        <ProjectTimerButton projectId={project.id} projectName={project.name} size="small" />
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ type, onClose, onCreate, isPending, clients }) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('planned');
  const [deadline, setDeadline] = useState('');

  const isWeb = type === 'website';
  const accent = isWeb ? '#0071E3' : '#7C3AED';

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

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: c.card, borderRadius: 18, padding: '28px 28px 24px',
          width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isWeb ? <Globe size={16} color={accent} /> : <Briefcase size={16} color={accent} />}
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: c.text, letterSpacing: '-0.3px' }}>
              Neue {isWeb ? 'Website' : 'Projekt'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textSecondary, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 5, display: 'block' }}>Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isWeb ? 'z.B. Müller GmbH Website' : 'z.B. SEO-Kampagne Q1'}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
                border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e => e.target.style.borderColor = '#E5E5EA'}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 5, display: 'block' }}>Kunde</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
                border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box',
                background: c.card, cursor: 'pointer',
              }}
            >
              <option value="">Kein Kunde</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 5, display: 'block' }}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5,
                  border: '1.5px solid #E5E5EA', outline: 'none', background: c.card, cursor: 'pointer',
                }}
              >
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', marginBottom: 5, display: 'block' }}>Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5,
                  border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                border: '1.5px solid #E5E5EA', background: c.card, cursor: 'pointer', color: '#636366',
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              style={{
                flex: 2, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                border: 'none', background: name.trim() ? accent : '#E5E5EA',
                color: name.trim() ? '#fff' : '#AEAEB2', cursor: name.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
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
  const [viewMode,     setViewMode]     = useState('grid'); // 'grid' | 'list'
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDone,     setShowDone]     = useState(false);
  const [createType,   setCreateType]   = useState(null); // 'website' | 'project' | null

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

  // Attach area names
  const enriched = useMemo(() => filtered.map(p => ({
    ...p,
    area_name: areaMap[p.area_id] || null,
  })), [filtered, areaMap]);

  function handleClick(project) {
    const path = isWebsite(project) ? `/websites/${project.id}` : `/projects/${project.id}`;
    navigate(path);
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg }}>

      {/* ── Header ── */}
      <div style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${c.borderSubtle}`, padding: '20px 28px 0', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, letterSpacing: '-0.5px', margin: 0 }}>
              Arbeit
            </h1>
            <p style={{ fontSize: 13, color: c.textSecondary, margin: '3px 0 0' }}>
              {allProjects.length} Einträge · {activeWeb} Websites aktiv · {activePrj} Projekte aktiv
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCreateType('website')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'rgba(0,113,227,0.1)', color: '#0071E3', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,113,227,0.1)'}
            >
              <Globe size={14} />
              Website
            </button>
            <button
              onClick={() => setCreateType('project')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'rgba(109,40,217,0.1)', color: '#7C3AED', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(109,40,217,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(109,40,217,0.1)'}
            >
              <Briefcase size={14} />
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
                padding: '10px 16px', fontSize: 13.5, fontWeight: tab === t.key ? 600 : 500,
                color: tab === t.key ? '#1D1D1F' : '#86868B',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.key ? '2px solid #0071E3' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              <t.icon size={13} />
              {t.label}
              <span style={{
                padding: '1px 6px', borderRadius: 99, fontSize: 10.5, fontWeight: 700,
                background: tab === t.key ? '#0071E3' : '#F2F2F7',
                color: tab === t.key ? '#fff' : '#86868B',
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
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22,
        }}>
          <div style={isMobile ? { minWidth: 150, flexShrink: 0 } : {}}>
            <KpiCard icon={Globe}         label="Websites aktiv"  value={activeWeb}          color="#0071E3" />
          </div>
          <div style={isMobile ? { minWidth: 150, flexShrink: 0 } : {}}>
            <KpiCard icon={Briefcase}     label="Projekte aktiv"  value={activePrj}          color="#7C3AED" />
          </div>
          <div style={isMobile ? { minWidth: 150, flexShrink: 0 } : {}}>
            <KpiCard icon={CheckCircle2}  label="Gesamt aktiv"    value={activeWeb + activePrj} color="#34C759" sub={`von ${allProjects.length} gesamt`} />
          </div>
          <div style={isMobile ? { minWidth: 150, flexShrink: 0 } : {}}>
            <KpiCard icon={AlertCircle}   label="Überfällig"      value={overdueAll}         color="#FF3B30" sub={overdueAll > 0 ? 'Deadline überschritten' : 'Alles im Plan'} />
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          background: c.card, borderRadius: 12, padding: '10px 14px',
          border: `1px solid ${c.borderSubtle}`,
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={14} color="#AEAEB2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              style={{
                width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8, fontSize: 13.5,
                border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '7px 10px', borderRadius: 8, fontSize: 13, border: '1.5px solid #E5E5EA',
              background: c.card, cursor: 'pointer', outline: 'none', color: c.text,
            }}
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
              borderRadius: 8, fontSize: 13, fontWeight: 500, border: '1.5px solid #E5E5EA',
              background: showDone ? '#E8F0FE' : '#fff',
              color: showDone ? '#0071E3' : '#636366', cursor: 'pointer',
            }}
          >
            <CheckCircle2 size={13} />
            Abgeschlossen
          </button>

          <div style={{ flex: 1 }} />

          {/* View toggle */}
          <div style={{ display: 'flex', background: c.cardSecondary, borderRadius: 8, padding: 3 }}>
            {[['grid', LayoutGrid], ['list', List]].map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: viewMode === mode ? '#fff' : 'transparent',
                  color: viewMode === mode ? '#1D1D1F' : '#86868B',
                  boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: c.textSecondary, fontSize: 14 }}>Laden...</div>
        ) : enriched.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            background: c.card, borderRadius: 14, border: `1px solid ${c.borderSubtle}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.text }}>Keine Einträge gefunden</div>
            <div style={{ fontSize: 13, color: c.textSecondary, marginTop: 4 }}>
              {search || filterStatus ? 'Filter anpassen oder zurücksetzen' : 'Erstelle deine erste Website oder Projekt'}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {enriched.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => handleClick(p)} />
            ))}
          </div>
        ) : (
          <div style={{ background: c.card, borderRadius: 14, border: `1px solid ${c.borderSubtle}`, overflow: 'hidden' }}>
            {/* List header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 130px 110px 100px 80px',
              gap: 12, padding: '9px 16px',
              background: '#F9F9FB', borderBottom: `1px solid ${c.borderSubtle}`,
              fontSize: 11, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <span>Name</span>
              <span>Typ</span>
              <span>Status</span>
              <span>Deadline</span>
              <span>Bereich</span>
              <span>Timer</span>
            </div>
            {enriched.map(p => (
              <ProjectRow key={p.id} project={p} onClick={() => handleClick(p)} />
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
        />
      )}
    </div>
  );
}
