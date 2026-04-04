import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, ChevronDown, ChevronRight, Briefcase, Folder,
  MoreHorizontal, Trash2, Calendar, Flag, Check, X, Zap, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { areasApi } from '../api/areas';
import { useConfirm } from '../hooks/useConfirm';
import { useTheme } from '../context/ThemeContext';
import ProjectTimerButton from '../components/ProjectTimerButton';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  planned:            { label: 'Geplant',           color: c.textSecondary, bg: 'rgba(118,118,128,0.1)'  },
  active:             { label: 'Aktiv',             color: '#0071E3', bg: 'rgba(0,113,227,0.1)'    },
  completed:          { label: 'Abgeschlossen',     color: '#34C759', bg: 'rgba(52,199,89,0.1)'    },
  waiting_for_client: { label: 'Wartet auf Kunde',  color: '#FF9500', bg: 'rgba(255,149,0,0.1)'    },
  deferred:           { label: 'Verschoben',        color: '#94A3B8', bg: 'rgba(148,163,184,0.1)'  },
  on_hold:            { label: 'Pausiert',          color: '#FF9500', bg: 'rgba(255,149,0,0.1)'    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function StatusPill({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  return (
    <span style={{
      padding: '3px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
      background: c.bg, color: c.color, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: c.card, borderRadius: '20px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
          width: '100%', maxWidth: '420px', padding: '26px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <span style={{ fontSize: '17px', fontWeight: '700', color: c.text, letterSpacing: '-0.02em' }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.07)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} color="#86868B" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Create project modal ──────────────────────────────────────────────────────

function CreateProjectModal({ onClose, onCreate, isPending }) {
  const [name, setName]         = useState('');
  const [description, setDesc]  = useState('');
  const [status, setStatus]     = useState('planned');
  const [deadline, setDeadline] = useState('');

  const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: '14px', color: c.text,
    background: 'rgba(0,0,0,0.04)', border: '1.5px solid transparent',
    borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
    letterSpacing: '-0.01em', transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: '600', color: c.textSecondary,
    marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase',
  };

  return (
    <Modal title="Neues Projekt" onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (name.trim()) onCreate({ name: name.trim(), description, status, deadline: deadline || null });
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div>
          <label style={labelStyle}>Projektname *</label>
          <input
            autoFocus
            style={inputStyle}
            placeholder="z.B. Produktlaunch Q3"
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={e => e.target.style.borderColor = '#0071E3'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
        </div>
        <div>
          <label style={labelStyle}>Beschreibung</label>
          <textarea
            rows={2}
            style={{ ...inputStyle, resize: 'none' }}
            placeholder="Was ist das Ziel dieses Projekts?"
            value={description}
            onChange={e => setDesc(e.target.value)}
            onFocus={e => e.target.style.borderColor = '#0071E3'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              value={status}
              onChange={e => setStatus(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#0071E3'}
              onBlur={e => e.target.style.borderColor = 'transparent'}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Deadline</label>
            <input
              type="date"
              style={inputStyle}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#0071E3'}
              onBlur={e => e.target.style.borderColor = 'transparent'}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px', fontSize: '13px', fontWeight: '600',
              color: c.textSecondary, background: 'rgba(0,0,0,0.06)',
              border: 'none', borderRadius: '99px', cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isPending}
            style={{
              padding: '9px 18px', fontSize: '13px', fontWeight: '600',
              color: '#fff', background: !name.trim() || isPending ? '#C7C7CC' : '#0071E3',
              border: 'none', borderRadius: '99px', cursor: !name.trim() || isPending ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {isPending ? 'Erstelle…' : 'Erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, areaColor, onDelete }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const taskTotal = project.task_count || 0;
  const taskDone  = project.task_done_count || 0;
  const pct       = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';
  const accentColor = areaColor || '#0071E3';

  const assigneeLabel = project.assignee_name || project.assignee_email || '';
  const assigneeInitials = assigneeLabel.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: c.card,
        borderRadius: '14px',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Left accent border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: '3px', background: accentColor, borderRadius: '14px 0 0 14px',
      }} />

      <div style={{ padding: '18px 18px 16px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Top row: name + delete */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <p style={{
            margin: 0, fontSize: '15px', fontWeight: '700', color: c.text,
            letterSpacing: '-0.02em', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {project.name}
          </p>
          <button
            onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: hovered ? '#C7C7CC' : 'transparent',
              padding: '2px', flexShrink: 0,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = '#FF3B30'; }}
            onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = hovered ? '#C7C7CC' : 'transparent'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Description */}
        {project.description && (
          <p style={{
            margin: 0, fontSize: '12px', color: c.textSecondary, letterSpacing: '-0.01em', lineHeight: 1.45,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {project.description}
          </p>
        )}

        {/* Progress bar */}
        {taskTotal > 0 && (
          <div>
            <div style={{
              height: '4px', borderRadius: '99px',
              background: 'rgba(0,0,0,0.07)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: pct === 100 ? '#34C759' : accentColor,
                borderRadius: '99px',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )}

        {/* Bottom meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
          <StatusPill status={project.status} />

          {taskTotal > 0 && (
            <span style={{ fontSize: '11px', color: c.textSecondary, fontWeight: '500', whiteSpace: 'nowrap' }}>
              {taskDone}/{taskTotal} Aufgaben
            </span>
          )}

          {project.deadline && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              fontSize: '11px', fontWeight: '500',
              color: isOverdue ? '#FF3B30' : '#86868B',
              whiteSpace: 'nowrap',
            }}>
              <Calendar size={10} />
              {fmtDate(project.deadline)}
              {isOverdue && <Flag size={10} />}
            </span>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Assignee */}
          {assigneeLabel && (
            <div
              title={assigneeLabel}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: project.assignee_color || '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: '700', color: '#fff', flexShrink: 0,
              }}
            >
              {assigneeInitials}
            </div>
          )}

          {/* Timer */}
          <span onClick={e => e.stopPropagation()}>
            <ProjectTimerButton projectId={project.id} projectName={project.name} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Area section ──────────────────────────────────────────────────────────────

function AreaSection({ area, projects, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);

  const areaColor  = area?.color  || '#0071E3';
  const areaName   = area?.name   || 'Ohne Bereich';
  const areaIcon   = area?.icon   || null;
  const count      = projects.length;

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* Section header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 0', cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* Area icon badge */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: area ? areaColor : 'rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {area ? (
            <Folder size={14} color="#fff" strokeWidth={2.5} />
          ) : (
            <Folder size={14} color="#86868B" strokeWidth={2.5} />
          )}
        </div>

        {/* Name */}
        <span style={{
          fontSize: '14px', fontWeight: '700', color: c.text,
          letterSpacing: '-0.02em',
        }}>
          {areaName}
        </span>

        {/* Count badge */}
        <span style={{
          padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
          background: 'rgba(0,0,0,0.06)', color: c.textSecondary,
        }}>
          {count}
        </span>

        {/* Spacer + chevron */}
        <div style={{ flex: 1 }} />
        <span style={{ color: '#C7C7CC', transition: 'transform 0.15s', display: 'flex', alignItems: 'center' }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginBottom: '14px' }} />

      {/* Project grid */}
      {!collapsed && (
        count === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#C7C7CC', margin: 0, fontStyle: 'italic' }}>
              Keine Projekte in diesem Bereich.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px',
          }}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                areaColor={areaColor}
                onDelete={onDelete}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Projects() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { confirm, ConfirmDialogNode } = useConfirm();
  const { c } = useTheme();

  const [showCreate,  setShowCreate]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterArea,   setFilterArea]   = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.list,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      toast.success('Projekt erstellt');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projekt gelöscht');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Löschen'),
  });

  async function handleDelete(id) {
    const ok = await confirm('Projekt und alle Aufgaben unwiderruflich löschen?', {
      title: 'Projekt löschen',
      danger: true,
    });
    if (ok) deleteMutation.mutate(id);
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const areaMap = useMemo(() => {
    const m = {};
    areas.forEach(a => { m[a.id] = a; });
    return m;
  }, [areas]);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || p.status === filterStatus;
      const matchArea   = !filterArea   || String(p.area_id) === filterArea || (filterArea === 'none' && !p.area_id);
      return matchSearch && matchStatus && matchArea;
    });
  }, [projects, search, filterStatus, filterArea]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = p.area_id || 'none';
      if (!map[key]) map[key] = { area: areaMap[p.area_id] || null, projects: [] };
      map[key].projects.push(p);
    });
    return Object.values(map).sort((a, b) => {
      if (!a.area) return 1;
      if (!b.area) return -1;
      return a.area.name.localeCompare(b.area.name);
    });
  }, [filtered, areaMap]);

  // ── Loading ──────────────────────────────────────────────────────────────────

  const isLoading = projectsLoading || areasLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '2.5px solid #0071E3', borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const inputBase = {
    fontSize: '13px', color: c.text, background: c.card,
    border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '10px',
    outline: 'none', letterSpacing: '-0.01em', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: c.bg }}>
      {ConfirmDialogNode}

      {/* ── Header ── */}
      <div style={{
        padding: '28px 32px 0',
        flexShrink: 0,
        background: c.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: c.text, letterSpacing: '-0.03em', margin: 0 }}>
              Projekte
            </h1>
            <p style={{ fontSize: '13px', color: c.textSecondary, margin: '4px 0 0', letterSpacing: '-0.01em' }}>
              {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'} · {areas.length} {areas.length === 1 ? 'Bereich' : 'Bereiche'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', fontSize: '13px', fontWeight: '600',
              color: '#fff', background: '#0071E3',
              border: 'none', borderRadius: '99px', cursor: 'pointer',
              flexShrink: 0, letterSpacing: '-0.01em',
              boxShadow: '0 2px 8px rgba(0,113,227,0.35)',
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={15} />
            Neues Projekt
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'center',
          flexWrap: 'wrap', paddingBottom: '20px',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px', maxWidth: '360px' }}>
            <Search size={14} color="#86868B" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              style={{ ...inputBase, width: '100%', padding: '8px 12px 8px 33px', boxSizing: 'border-box' }}
              placeholder="Projekte suchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#0071E3'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
            />
          </div>

          {/* Status filter */}
          <div style={{ position: 'relative' }}>
            <Filter size={13} color="#86868B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              style={{ ...inputBase, padding: '8px 12px 8px 28px', appearance: 'none', cursor: 'pointer', paddingRight: '28px' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#0071E3'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
            >
              <option value="">Alle Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={12} color="#86868B" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Area filter */}
          <div style={{ position: 'relative' }}>
            <Folder size={13} color="#86868B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              style={{ ...inputBase, padding: '8px 12px 8px 28px', appearance: 'none', cursor: 'pointer', paddingRight: '28px' }}
              value={filterArea}
              onChange={e => setFilterArea(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#0071E3'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
            >
              <option value="">Alle Bereiche</option>
              <option value="none">Ohne Bereich</option>
              {areas.map(a => (
                <option key={a.id} value={String(a.id)}>{a.name}</option>
              ))}
            </select>
            <ChevronDown size={12} color="#86868B" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 32px 40px' }}>

        {/* Empty state */}
        {projects.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '14px', textAlign: 'center',
            paddingTop: '80px',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px',
              background: 'rgba(0,113,227,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={30} color="#0071E3" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: '18px', fontWeight: '700', color: c.text, letterSpacing: '-0.02em', margin: 0 }}>
              Noch keine Projekte
            </p>
            <p style={{ fontSize: '14px', color: c.textSecondary, margin: 0, maxWidth: '280px', lineHeight: 1.55 }}>
              Erstelle dein erstes Projekt und behalte den Überblick über alle Aufgaben.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', fontSize: '13px', fontWeight: '600',
                color: '#fff', background: '#0071E3',
                border: 'none', borderRadius: '99px', cursor: 'pointer',
                marginTop: '6px', letterSpacing: '-0.01em',
                boxShadow: '0 2px 8px rgba(0,113,227,0.35)',
              }}
            >
              <Plus size={15} /> Erstes Projekt erstellen
            </button>
          </div>

        ) : filtered.length === 0 ? (
          // No results after filtering
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '12px', textAlign: 'center',
            paddingTop: '80px',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Search size={24} color="#C7C7CC" />
            </div>
            <p style={{ fontSize: '16px', fontWeight: '600', color: c.text, letterSpacing: '-0.02em', margin: 0 }}>
              Keine Treffer
            </p>
            <p style={{ fontSize: '13px', color: c.textSecondary, margin: 0 }}>
              Versuche andere Filter oder einen anderen Suchbegriff.
            </p>
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterArea(''); }}
              style={{
                padding: '7px 16px', fontSize: '13px', fontWeight: '600',
                color: '#0071E3', background: 'rgba(0,113,227,0.08)',
                border: 'none', borderRadius: '99px', cursor: 'pointer',
              }}
            >
              Filter zurücksetzen
            </button>
          </div>

        ) : (
          // Grouped sections
          grouped.map((group, i) => (
            <AreaSection
              key={group.area ? group.area.id : 'none'}
              area={group.area}
              projects={group.projects}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={data => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  );
}
