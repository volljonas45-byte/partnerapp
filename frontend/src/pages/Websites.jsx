import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, List, LayoutGrid, Search, Eye, X, CalendarDays, ChevronDown, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { clientsApi } from '../api/clients';
import { PHASE_ORDER, PHASES } from '../components/workflow/workflowConfig';
import { formatDate, isPast } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

function computeHealth(project) {
  if (project.status === 'completed') return 'good';
  if (project.deadline && isPast(project.deadline)) return 'critical';
  if (project.deadline) {
    const daysLeft = Math.floor((new Date(project.deadline) - new Date()) / 86400000);
    if (daysLeft <= 5) return 'warning';
  }
  if (project.status === 'waiting_for_client') return 'warning';
  return 'good';
}

const HEALTH = {
  good:     { dot: 'bg-emerald-400', title: 'Gut' },
  warning:  { dot: 'bg-amber-400',   title: 'Achtung' },
  critical: { dot: 'bg-red-500',     title: 'Kritisch' },
};

function HealthDot({ project }) {
  const h = computeHealth(project);
  const { dot, title } = HEALTH[h];
  return <span title={title} className={`inline-block w-2 h-2 rounded-full ${dot}`} />;
}

const STATUS_ORDER = ['planned', 'active', 'feedback', 'review', 'completed', 'waiting_for_client', 'waiting'];
const STATUS_SORT_WEIGHT = { waiting_for_client: 10, waiting: 11 };

const TYPES = {
  website_code: { label: 'Code',    cls: 'bg-blue-100 text-blue-700'     },
  website_wix:  { label: 'Wix',     cls: 'bg-violet-100 text-violet-700' },
  funnel:       { label: 'Funnel',  cls: 'bg-cyan-100 text-cyan-700'     },
  video:        { label: 'Video',   cls: 'bg-rose-100 text-rose-700'     },
  content:      { label: 'Content', cls: 'bg-orange-100 text-orange-700' },
  seo:          { label: 'SEO',     cls: 'bg-green-100 text-green-700'   },
};

const HOSTING_LABELS = {
  vercel:    'Vercel',
  hostinger: 'Hostinger',
  netlify:   'Netlify',
  other:     'Sonstiges',
};

function normalizeStatus(s) {
  return s === 'waiting' ? 'waiting_for_client' : s;
}

function useStatuses() {
  const { c } = useTheme();
  return useMemo(() => ({
    planned:            { label: 'Geplant',          dot: 'bg-slate-400',   chipStyle: { background: c.cardSecondary, color: c.textTertiary } },
    active:             { label: 'Aktiv',             dot: 'bg-blue-500',    chipStyle: { background: c.blueLight, color: c.blue }            },
    waiting_for_client: { label: 'Warten auf Kunde',  dot: 'bg-amber-400',   chipStyle: { background: c.orangeLight, color: c.orange }        },
    feedback:           { label: 'Feedback',          dot: 'bg-orange-400',  chipStyle: { background: c.orangeLight, color: c.orange }        },
    review:             { label: 'Review',            dot: 'bg-violet-400',  chipStyle: { background: c.purpleLight, color: c.purple }        },
    completed:          { label: 'Abgeschlossen',     dot: 'bg-emerald-500', chipStyle: { background: c.greenLight, color: c.green }          },
    waiting:            { label: 'Warten auf Kunde',  dot: 'bg-amber-400',   chipStyle: { background: c.orangeLight, color: c.orange }        },
  }), [c]);
}

function StatusChip({ status, onClick }) {
  const STATUSES = useStatuses();
  const s = normalizeStatus(status);
  const cfg = STATUSES[s] || STATUSES.planned;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
      style={cfg.chipStyle}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {onClick && <ChevronDown size={10} className="opacity-60" />}
    </button>
  );
}

function TypeBadge({ type }) {
  const { c } = useTheme();
  if (!type) return null;
  const cfg = TYPES[type];
  if (!cfg) return <span className="text-xs" style={{ color: c.textTertiary }}>{type}</span>;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function StatusDropdown({ current, onSelect, onClose, anchorRef }) {
  const { c } = useTheme();
  const STATUSES = useStatuses();
  const dropRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={dropRef}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
        background: c.card, borderRadius: 12, border: `0.5px solid ${c.borderSubtle}`,
        boxShadow: c.shadow,
      }}
      className="w-48 py-1 text-sm"
    >
      {STATUS_ORDER.map(key => {
        const cfg = STATUSES[key];
        const isActive = normalizeStatus(current) === key;
        return (
          <button
            key={key}
            onClick={() => { onSelect(key); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors"
            style={{ background: 'transparent', color: isActive ? c.text : c.textSecondary }}
            onMouseEnter={e => e.currentTarget.style.background = c.cardHover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className={isActive ? 'font-medium' : ''}>{cfg.label}</span>
            {isActive && <span className="ml-auto" style={{ color: c.textTertiary }}>&#10003;</span>}
          </button>
        );
      })}
    </div>
  );
}

function DeadlineCell({ project, onUpdate }) {
  const { c } = useTheme();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={project.deadline ? project.deadline.slice(0, 10) : ''}
        className="text-xs rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        style={{ border: `0.5px solid ${c.border}`, background: c.inputBg, color: c.text }}
        onBlur={e => { onUpdate(project.id, { deadline: e.target.value || null }); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 transition-colors group"
      style={{ color: c.textTertiary }}
      onMouseEnter={e => e.currentTarget.style.color = c.text}
      onMouseLeave={e => e.currentTarget.style.color = c.textTertiary}
    >
      {project.deadline ? (
        <>
          <CalendarDays size={12} style={{ color: c.textTertiary }} />
          <span className="text-xs">{formatDate(project.deadline)}</span>
        </>
      ) : (
        <span className="text-xs" style={{ color: c.borderSubtle }}>—</span>
      )}
    </button>
  );
}

function StatusCell({ project, onUpdate }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  return (
    <div className="relative" ref={anchorRef}>
      <StatusChip
        status={project.status}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
      />
      {open && (
        <StatusDropdown
          current={project.status}
          anchorRef={anchorRef}
          onSelect={val => onUpdate(project.id, { status: val })}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function KanbanCard({ project, onDragStart, onUpdate, navigate }) {
  const { c } = useTheme();
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, project.id)}
      onClick={() => navigate(`/websites/${project.id}`)}
      className="cursor-pointer transition-shadow group"
      style={{
        background: c.card, borderRadius: 12, border: `0.5px solid ${c.borderSubtle}`,
        padding: '10px 12px', boxShadow: c.shadowSm,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = c.shadow}
      onMouseLeave={e => e.currentTarget.style.boxShadow = c.shadowSm}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-1.5 min-w-0">
          <HealthDot project={project} />
          <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: c.text }}>{project.name}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/websites/${project.id}`); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 flex-shrink-0 transition-opacity"
          style={{ color: c.textTertiary }}
        >
          <Eye size={13} />
        </button>
      </div>

      <p className="text-xs mb-1.5" style={{ color: c.textTertiary }}>
        {project.client_name || <span style={{ color: c.borderSubtle }}>Kein Kunde</span>}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {project.type && <TypeBadge type={project.type} />}
        {project.deadline && (
          <span onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs" style={{ color: c.textTertiary }}>
            <CalendarDays size={11} />
            {formatDate(project.deadline)}
          </span>
        )}
        {project.task_count > 0 && (
          <span className="ml-auto text-xs" style={{ color: c.textTertiary }}>
            {project.task_done_count}/{project.task_count}
          </span>
        )}
      </div>
    </div>
  );
}

function CreateModal({ clients, onClose, onCreate, isPending }) {
  const { c } = useTheme();
  const [name, setName]       = useState('');
  const [clientId, setClient] = useState('');
  const [type, setType]       = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), client_id: clientId || null, type: type || null, project_type: 'website' });
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: c.overlayBg }} onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 p-6"
        style={{ background: c.card, borderRadius: 12, boxShadow: c.shadowLg }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: c.text }}>Neue Website</h2>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: c.textTertiary }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: c.textSecondary }}>Name *</label>
            <input
              autoFocus
              className="input w-full"
              placeholder="z.B. Website Redesign"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: c.textSecondary }}>Kunde</label>
            <select className="input w-full" value={clientId} onChange={e => setClient(e.target.value)}>
              <option value="">Kein Kunde</option>
              {clients.map(cl => (
                <option key={cl.id} value={cl.id}>{cl.company_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: c.textSecondary }}>Typ</label>
            <select className="input w-full" value={type} onChange={e => setType(e.target.value)}>
              <option value="">Kein Typ</option>
              {Object.entries(TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!name.trim() || isPending} className="btn-primary">
              {isPending ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Websites() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { c } = useTheme();
  const STATUSES = useStatuses();

  const [view, setView]               = useState('list');
  const [search, setSearch]           = useState('');
  const [filterStatus, setFStatus]    = useState('');
  const [filterType, setFType]        = useState('');
  const [filterHosting, setFHosting]  = useState('');
  const [showCreate, setShowCreate]   = useState(false);

  const dragId = useRef(null);

  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  // Show only website projects (project_type = 'website' or legacy projects without type)
  const projects = useMemo(() =>
    allProjects.filter(p => !p.project_type || p.project_type === 'website'),
    [allProjects]
  );

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => projectsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Speichern'),
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (newProject) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Website erstellt');
      setShowCreate(false);
      navigate(`/websites/${newProject.id}`);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  function handleUpdate(id, data) {
    updateMutation.mutate({ id, data });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p => {
      if (q && !p.name?.toLowerCase().includes(q) && !p.client_name?.toLowerCase().includes(q)) return false;
      if (filterStatus && normalizeStatus(p.status) !== filterStatus) return false;
      if (filterType && p.type !== filterType) return false;
      if (filterHosting && p.hosting_provider !== filterHosting) return false;
      return true;
    }).sort((a, b) =>
      (STATUS_SORT_WEIGHT[a.status] || 0) - (STATUS_SORT_WEIGHT[b.status] || 0)
    );
  }, [projects, search, filterStatus, filterType, filterHosting]);

  const byStatus = useMemo(() => {
    const map = {};
    STATUS_ORDER.forEach(s => { map[s] = []; });
    filtered.forEach(p => {
      const s = normalizeStatus(p.status);
      if (map[s]) map[s].push(p);
    });
    return map;
  }, [filtered]);

  function onDragStart(e, id) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e, targetStatus) {
    e.preventDefault();
    if (!dragId.current) return;
    const p = projects.find(x => x.id === dragId.current);
    if (p && normalizeStatus(p.status) !== targetStatus) {
      handleUpdate(dragId.current, { status: targetStatus });
    }
    dragId.current = null;
  }

  const hostingOptions = useMemo(() => {
    const seen = new Set();
    projects.forEach(p => { if (p.hosting_provider) seen.add(p.hosting_provider); });
    return [...seen].sort();
  }, [projects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in">

      {/* Header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: c.text }}>Websites</h1>
            <p className="text-sm mt-0.5" style={{ color: c.textTertiary }}>{projects.length} gesamt</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg p-0.5" style={{ background: c.cardSecondary }}>
              <button
                onClick={() => setView('list')}
                className="p-1.5 rounded-md transition-colors"
                style={view === 'list'
                  ? { background: c.card, boxShadow: c.shadowSm, color: c.text }
                  : { color: c.textTertiary }}
                onMouseEnter={e => { if (view !== 'list') e.currentTarget.style.color = c.textSecondary; }}
                onMouseLeave={e => { if (view !== 'list') e.currentTarget.style.color = c.textTertiary; }}
                title="Listenansicht"
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setView('kanban')}
                className="p-1.5 rounded-md transition-colors"
                style={view === 'kanban'
                  ? { background: c.card, boxShadow: c.shadowSm, color: c.text }
                  : { color: c.textTertiary }}
                onMouseEnter={e => { if (view !== 'kanban') e.currentTarget.style.color = c.textSecondary; }}
                onMouseLeave={e => { if (view !== 'kanban') e.currentTarget.style.color = c.textTertiary; }}
                title="Kanban"
              >
                <LayoutGrid size={15} />
              </button>
            </div>

            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={15} />
              Website
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textTertiary }} />
            <input
              className="input pl-8 h-8 text-sm w-56"
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="config-select text-sm py-1.5" value={filterStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">Alle Status</option>
            <option value="planned">Geplant</option>
            <option value="active">Aktiv</option>
            <option value="waiting_for_client">Warten auf Kunde</option>
            <option value="completed">Abgeschlossen</option>
          </select>

          <select className="config-select text-sm py-1.5" value={filterType} onChange={e => setFType(e.target.value)}>
            <option value="">Alle Typen</option>
            {Object.entries(TYPES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {hostingOptions.length > 0 && (
            <select className="config-select text-sm py-1.5" value={filterHosting} onChange={e => setFHosting(e.target.value)}>
              <option value="">Alle Hoster</option>
              {hostingOptions.map(h => (
                <option key={h} value={h}>{HOSTING_LABELS[h] || h}</option>
              ))}
            </select>
          )}

          {(search || filterStatus || filterType || filterHosting) && (
            <button
              onClick={() => { setSearch(''); setFStatus(''); setFType(''); setFHosting(''); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              style={{ color: c.textTertiary }}
              onMouseEnter={e => { e.currentTarget.style.color = c.textSecondary; e.currentTarget.style.background = c.cardSecondary; }}
              onMouseLeave={e => { e.currentTarget.style.color = c.textTertiary; e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={12} /> Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Globe size={32} className="mx-auto mb-3" style={{ color: c.borderSubtle }} />
            <p className="text-sm" style={{ color: c.textTertiary }}>
              {search || filterStatus || filterType || filterHosting
                ? 'Keine Websites gefunden.'
                : 'Noch keine Websites.'}
            </p>
            {!search && !filterStatus && !filterType && !filterHosting && (
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
                <Plus size={15} /> Website erstellen
              </button>
            )}
          </div>
        </div>
      ) : view === 'list' ? (
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `0.5px solid ${c.borderSubtle}`, background: c.cardSecondary }}>
                  <th className="px-4 py-2.5 w-8" />
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide" style={{ color: c.textTertiary }}>Name</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide" style={{ color: c.textTertiary }}>Kunde</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide" style={{ color: c.textTertiary }}>Status</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide" style={{ color: c.textTertiary }}>Typ</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide" style={{ color: c.textTertiary }}>Deadline</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide" style={{ color: c.textTertiary }}>Hoster</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide" style={{ color: c.textTertiary }}>Aufgaben</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/websites/${p.id}`)}
                    className="last:border-0 cursor-pointer transition-colors"
                    style={{ borderBottom: `0.5px solid ${c.borderSubtle}` }}
                    onMouseEnter={e => e.currentTarget.style.background = c.cardHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-4 py-2.5 text-center"><HealthDot project={p} /></td>
                    <td className="px-5 py-2.5 font-medium" style={{ color: c.text }}>{p.name}</td>
                    <td className="px-5 py-2.5 text-xs" onClick={e => e.stopPropagation()}>
                      <select
                        value={p.client_id || ''}
                        onChange={e => handleUpdate(p.id, { client_id: e.target.value || null })}
                        style={{
                          border: 'none', background: 'transparent', fontSize: '12px',
                          color: p.client_name ? c.textSecondary : c.borderSubtle,
                          cursor: 'pointer', outline: 'none', padding: '0',
                          maxWidth: '140px',
                        }}
                      >
                        <option value="">— Zuweisen</option>
                        {clients.map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.company_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-2.5">
                      {(() => {
                        const phase = p.current_phase;
                        const cfg = phase ? PHASES[phase] : null;
                        const isLast = phase === 'abgeschlossen';
                        return (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '2px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                            background: isLast ? c.greenLight : c.blueLight,
                            color: isLast ? c.green : c.blue,
                          }}>
                            {cfg?.label || 'Demo'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-2.5">
                      <TypeBadge type={p.type} />
                      {!p.type && <span className="text-xs" style={{ color: c.borderSubtle }}>—</span>}
                    </td>
                    <td className="px-5 py-2.5" onClick={e => e.stopPropagation()}>
                      <DeadlineCell project={p} onUpdate={handleUpdate} />
                    </td>
                    <td className="px-5 py-2.5 text-xs" style={{ color: c.textTertiary }}>
                      {p.hosting_provider ? (HOSTING_LABELS[p.hosting_provider] || p.hosting_provider) : <span style={{ color: c.borderSubtle }}>—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-xs" style={{ color: c.textTertiary }}>
                      {(() => {
                        const phase = p.current_phase;
                        if (!phase) return <span style={{ color: c.borderSubtle }}>—</span>;
                        const idx = PHASE_ORDER.indexOf(phase);
                        const total = PHASE_ORDER.length;
                        const pct = Math.round(((idx + 1) / total) * 100);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '48px', height: '3px', background: c.cardSecondary, borderRadius: '2px' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: phase === 'abgeschlossen' ? c.green : c.blue, borderRadius: '2px' }} />
                            </div>
                            <span style={{ color: c.textTertiary, fontSize: '11px' }}>{idx + 1}/{total}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-2.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/websites/${p.id}`)}
                        className="p-1 rounded transition-colors"
                        style={{ color: c.borderSubtle }}
                        onMouseEnter={e => e.currentTarget.style.color = c.textSecondary}
                        onMouseLeave={e => e.currentTarget.style.color = c.borderSubtle}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto px-8 pb-8">
          <div className="flex gap-3 h-full min-w-max pt-1">
            {STATUS_ORDER.map(status => {
              const cfg = STATUSES[status];
              const cards = byStatus[status] || [];
              return (
                <div
                  key={status}
                  onDragOver={onDragOver}
                  onDrop={e => onDrop(e, status)}
                  className="flex flex-col w-64 flex-shrink-0"
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs font-medium" style={{ color: c.textSecondary }}>{cfg.label}</span>
                    <span className="ml-auto text-xs rounded px-1.5 py-0.5" style={{ color: c.textTertiary, background: c.cardSecondary }}>{cards.length}</span>
                  </div>
                  <div
                    className="flex-1 p-2 flex flex-col gap-2 min-h-[120px]"
                    style={{ borderRadius: 12, background: c.cardSecondary, border: `0.5px solid ${c.borderSubtle}` }}
                  >
                    {cards.map(p => (
                      <KanbanCard
                        key={p.id}
                        project={p}
                        onDragStart={onDragStart}
                        onUpdate={handleUpdate}
                        navigate={navigate}
                      />
                    ))}
                    {cards.length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xs" style={{ color: c.borderSubtle }}>Keine Websites</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateModal
          clients={clients}
          onClose={() => setShowCreate(false)}
          onCreate={data => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  );
}
