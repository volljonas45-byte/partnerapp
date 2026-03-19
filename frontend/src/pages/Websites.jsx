import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, List, LayoutGrid, Search, Eye, X, CalendarDays, ChevronDown, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { clientsApi } from '../api/clients';
import { formatDate, isPast } from '../utils/formatters';

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

const STATUSES = {
  planned:            { label: 'Geplant',          dot: 'bg-gray-400',    chip: 'bg-gray-100 text-gray-600'     },
  active:             { label: 'Aktiv',             dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700'      },
  waiting_for_client: { label: 'Warten auf Kunde',  dot: 'bg-amber-400',   chip: 'bg-amber-50 text-amber-700'    },
  feedback:           { label: 'Feedback',          dot: 'bg-orange-400',  chip: 'bg-orange-50 text-orange-700'  },
  review:             { label: 'Review',            dot: 'bg-violet-400',  chip: 'bg-violet-50 text-violet-700'  },
  completed:          { label: 'Abgeschlossen',     dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700'},
  waiting:            { label: 'Warten auf Kunde',  dot: 'bg-amber-400',   chip: 'bg-amber-50 text-amber-700'    },
};
const STATUS_ORDER = ['planned', 'active', 'waiting_for_client', 'completed'];

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

function StatusChip({ status, onClick }) {
  const s = normalizeStatus(status);
  const cfg = STATUSES[s] || STATUSES.planned;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.chip} hover:opacity-80 transition-opacity`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {onClick && <ChevronDown size={10} className="opacity-60" />}
    </button>
  );
}

function TypeBadge({ type }) {
  if (!type) return null;
  const cfg = TYPES[type];
  if (!cfg) return <span className="text-xs text-gray-400">{type}</span>;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function StatusDropdown({ current, onSelect, onClose, anchorRef }) {
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
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-sm"
    >
      {STATUS_ORDER.map(key => {
        const cfg = STATUSES[key];
        const isActive = normalizeStatus(current) === key;
        return (
          <button
            key={key}
            onClick={() => { onSelect(key); onClose(); }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors ${isActive ? 'font-medium' : ''}`}
          >
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className={isActive ? 'text-gray-900' : 'text-gray-600'}>{cfg.label}</span>
            {isActive && <span className="ml-auto text-gray-400">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function DeadlineCell({ project, onUpdate }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={project.deadline ? project.deadline.slice(0, 10) : ''}
        className="text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        onBlur={e => { onUpdate(project.id, { deadline: e.target.value || null }); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors group"
    >
      {project.deadline ? (
        <>
          <CalendarDays size={12} className="text-gray-400" />
          <span className="text-xs">{formatDate(project.deadline)}</span>
        </>
      ) : (
        <span className="text-gray-300 text-xs group-hover:text-gray-400">—</span>
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
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, project.id)}
      onClick={() => navigate(`/websites/${project.id}`)}
      className="bg-white rounded-lg border border-gray-100 px-3 py-2.5 shadow-sm hover:shadow-md cursor-pointer transition-shadow group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-1.5 min-w-0">
          <HealthDot project={project} />
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{project.name}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/websites/${project.id}`); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-700 flex-shrink-0 transition-opacity"
        >
          <Eye size={13} />
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-1.5">
        {project.client_name || <span className="text-gray-200">Kein Kunde</span>}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {project.type && <TypeBadge type={project.type} />}
        {project.deadline && (
          <span onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-gray-400">
            <CalendarDays size={11} />
            {formatDate(project.deadline)}
          </span>
        )}
        {project.task_count > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            {project.task_done_count}/{project.task_count}
          </span>
        )}
      </div>
    </div>
  );
}

function CreateModal({ clients, onClose, onCreate, isPending }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Neue Website</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              autoFocus
              className="input w-full"
              placeholder="z.B. Website Redesign"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kunde</label>
            <select className="input w-full" value={clientId} onChange={e => setClient(e.target.value)}>
              <option value="">Kein Kunde</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Typ</label>
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
              {isPending ? 'Erstelle…' : 'Erstellen'}
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
    });
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
            <h1 className="text-xl font-semibold text-gray-900">Websites</h1>
            <p className="text-sm text-gray-400 mt-0.5">{projects.length} gesamt</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                title="Listenansicht"
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setView('kanban')}
                className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
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
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="input pl-8 h-8 text-sm w-56"
              placeholder="Suchen…"
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
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
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
            <Globe size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">
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
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-2.5 w-8" />
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Kunde</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Typ</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Deadline</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Hoster</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Aufgaben</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/websites/${p.id}`)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 text-center"><HealthDot project={p} /></td>
                    <td className="px-5 py-2.5 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-2.5 text-gray-500 text-xs">{p.client_name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-2.5" onClick={e => e.stopPropagation()}>
                      <StatusCell project={p} onUpdate={handleUpdate} />
                    </td>
                    <td className="px-5 py-2.5">
                      <TypeBadge type={p.type} />
                      {!p.type && <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-2.5" onClick={e => e.stopPropagation()}>
                      <DeadlineCell project={p} onUpdate={handleUpdate} />
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-500">
                      {p.hosting_provider ? (HOSTING_LABELS[p.hosting_provider] || p.hosting_provider) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-500">
                      {p.task_count > 0
                        ? <span>{p.task_done_count}/{p.task_count}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-2.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/websites/${p.id}`)}
                        className="p-1 text-gray-300 hover:text-gray-600 rounded transition-colors"
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
                    <span className="text-xs font-medium text-gray-700">{cfg.label}</span>
                    <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{cards.length}</span>
                  </div>
                  <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 p-2 flex flex-col gap-2 min-h-[120px]">
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
                        <p className="text-xs text-gray-300">Keine Websites</p>
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
