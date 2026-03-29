import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ChevronDown, Trash2, Edit2, X, Check,
  Circle, CheckCircle2, Layers3, ArrowRight,
  MoreHorizontal, Calendar, Flag,
  Briefcase, Rocket, Star, Code, Users, ShoppingBag,
  Megaphone, BarChart2, Lightbulb, Globe, Package,
  Zap, Heart, Camera, Music, PenTool, Coffee,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { areasApi } from '../api/areas';
import { projectsApi } from '../api/projects';
import { useConfirm } from '../hooks/useConfirm';
import ProjectTimerButton from '../components/ProjectTimerButton';

// ── Icon registry ─────────────────────────────────────────────────────────────

const ICON_MAP = {
  briefcase: Briefcase, rocket: Rocket, star: Star, code: Code,
  users: Users, shopping: ShoppingBag, megaphone: Megaphone,
  chart: BarChart2, lightbulb: Lightbulb, globe: Globe,
  package: Package, zap: Zap, heart: Heart, camera: Camera,
  music: Music, pen: PenTool, coffee: Coffee,
};

function AreaIcon({ icon, size = 16, color = '#fff' }) {
  const Icon = ICON_MAP[icon] || Briefcase;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

// ── Palettes ──────────────────────────────────────────────────────────────────

const AREA_COLORS = [
  '#0071E3', '#34C759', '#FF9500', '#FF3B30', '#BF5AF2',
  '#5AC8FA', '#FF6961', '#30B0C7', '#32ADE6', '#AC8E68',
];

const STATUS_CONFIG = {
  planned:            { label: 'Geplant',          color: '#6E6E73', bg: 'rgba(118,118,128,0.12)' },
  active:             { label: 'Aktiv',            color: '#0071E3', bg: 'rgba(0,113,227,0.10)'   },
  completed:          { label: 'Abgeschlossen',    color: '#248A3D', bg: 'rgba(52,199,89,0.12)'   },
  on_hold:            { label: 'Pausiert',         color: '#C93400', bg: 'rgba(255,149,0,0.12)'   },
  waiting_for_client: { label: 'Wartet auf Kunde', color: '#B35A00', bg: 'rgba(255,149,0,0.12)'   },
  deferred:           { label: 'Verschoben',       color: '#64748B', bg: 'rgba(148,163,184,0.12)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  return (
    <span style={{ padding: '3px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
      background: c.bg, color: c.color, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

// ── ColorPicker ───────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {AREA_COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
            outline: value === c ? `3px solid ${c}` : 'none', outlineOffset: '2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {value === c && <Check size={13} color="white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

// ── IconPicker ────────────────────────────────────────────────────────────────

function IconPicker({ value, onChange, color }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {Object.entries(ICON_MAP).map(([key, Icon]) => (
        <button key={key} type="button" onClick={() => onChange(key)}
          style={{
            width: '36px', height: '36px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: value === key ? color : 'rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => { if (value !== key) e.currentTarget.style.background = 'rgba(0,0,0,0.10)'; }}
          onMouseLeave={e => { if (value !== key) e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
        >
          <Icon size={16} color={value === key ? '#fff' : '#86868B'} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: '400px', padding: '24px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ fontSize: '17px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em' }}>{title}</span>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.07)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="#86868B" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── CreateAreaModal ───────────────────────────────────────────────────────────

function CreateAreaModal({ onClose, onCreate, isPending }) {
  const [name, setName]   = useState('');
  const [color, setColor] = useState('#0071E3');
  const [icon, setIcon]   = useState('briefcase');

  return (
    <Modal title="Neuer Bereich" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) onCreate({ name: name.trim(), color, icon }); }}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Name</label>
          <input autoFocus className="input w-full" placeholder="z.B. Marketing, Entwicklung…" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Farbe</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Symbol</label>
          <IconPicker value={icon} onChange={setIcon} color={color} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={!name.trim() || isPending} className="btn-primary">{isPending ? 'Erstelle…' : 'Erstellen'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── EditAreaModal ─────────────────────────────────────────────────────────────

function EditAreaModal({ area, onClose, onSave, isPending }) {
  const [name, setName]   = useState(area.name);
  const [color, setColor] = useState(area.color || '#0071E3');
  const [icon, setIcon]   = useState(area.icon || 'briefcase');

  return (
    <Modal title="Bereich bearbeiten" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) onSave({ name: name.trim(), color, icon }); }}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Name</label>
          <input autoFocus className="input w-full" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Farbe</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Symbol</label>
          <IconPicker value={icon} onChange={setIcon} color={color} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={!name.trim() || isPending} className="btn-primary">{isPending ? 'Speichern…' : 'Speichern'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── CreateProjectModal ────────────────────────────────────────────────────────

function CreateProjectModal({ onClose, onCreate, isPending }) {
  const [name, setName]         = useState('');
  const [description, setDesc]  = useState('');
  const [status, setStatus]     = useState('planned');
  const [deadline, setDeadline] = useState('');

  return (
    <Modal title="Neues Projekt" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) onCreate({ name: name.trim(), description, status, deadline: deadline || null }); }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Projektname *</label>
          <input autoFocus className="input w-full" placeholder="z.B. Produktlaunch Q3" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Beschreibung</label>
          <textarea rows={2} className="input w-full resize-none" placeholder="Was ist das Ziel dieses Projekts?" value={description} onChange={e => setDesc(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Status</label>
            <select className="input w-full" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#86868B', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Deadline</label>
            <input type="date" className="input w-full" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={!name.trim() || isPending} className="btn-primary">{isPending ? 'Erstelle…' : 'Erstellen'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── InlineTaskInput ───────────────────────────────────────────────────────────

function InlineTaskInput({ onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const submittedRef = useRef(false);

  function submit() {
    if (!title.trim()) return;
    submittedRef.current = true;
    onAdd(title.trim());
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(0,113,227,0.05)', borderRadius: '8px', margin: '4px 0' }}>
      <Circle size={14} color="#C7C7CC" style={{ flexShrink: 0 }} />
      <input
        autoFocus
        style={{ flex: 1, fontSize: '13px', color: '#1D1D1F', background: 'none', border: 'none', outline: 'none', letterSpacing: '-0.01em' }}
        placeholder="Aufgabe eingeben…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') onCancel(); }}
        onBlur={() => { if (!submittedRef.current) onCancel(); }}
      />
      <button onMouseDown={e => e.preventDefault()} onClick={submit}
        style={{ fontSize: '12px', fontWeight: '600', color: title.trim() ? '#0071E3' : '#C7C7CC', background: 'none', border: 'none', cursor: 'pointer' }}>↵</button>
    </div>
  );
}

// ── ProjectCard ───────────────────────────────────────────────────────────────

function ProjectCard({ project, area, onDelete }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [expanded, setExpanded]     = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', project.id],
    queryFn: () => projectsApi.getTasks(project.id).then(r => r.data),
    enabled: expanded,
  });

  const createTaskMutation = useMutation({
    mutationFn: t => projectsApi.createTask(project.id, { title: t }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', project.id] }),
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ taskId, status }) => projectsApi.updateTask(project.id, taskId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', project.id] }),
  });

  const taskTotal = project.task_count || 0;
  const taskDone  = project.task_done_count || 0;
  const pct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';

  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: expanded ? '0' : '0' }}>
      {/* Main project row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px' }}>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#C7C7CC', flexShrink: 0,
            transition: 'transform 0.15s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <ChevronDown size={15} />
        </button>

        {/* Project name + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1D1D1F', letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </p>
          {project.description && (
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#86868B', letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.description}
            </p>
          )}
        </div>

        {/* Status */}
        <StatusPill status={project.status} />

        {/* Task count + mini progress */}
        {taskTotal > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <div style={{ width: '48px', height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34C759' : area.color, borderRadius: '99px' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#86868B', fontWeight: '500' }}>{taskDone}/{taskTotal}</span>
          </div>
        )}

        {/* Deadline */}
        {project.deadline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: isOverdue ? '#FF3B30' : '#86868B', flexShrink: 0 }}>
            <Calendar size={11} />
            {fmtDate(project.deadline)}
            {isOverdue && <Flag size={10} />}
          </span>
        )}

        {/* Assignee avatar */}
        {project.assignee_name || project.assignee_email ? (() => {
          const label = project.assignee_name || project.assignee_email || '';
          const initials = label.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div title={label} style={{
              width: 26, height: 26, borderRadius: '50%',
              background: project.assignee_color || '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: '700', color: '#fff',
              flexShrink: 0,
            }}>{initials}</div>
          );
        })() : null}

        {/* Timer */}
        <ProjectTimerButton projectId={project.id} projectName={project.name} />

        {/* OPEN BUTTON - big and obvious */}
        <button
          onClick={() => navigate(`/projects/${project.id}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px',
            fontSize: '12px', fontWeight: '600',
            color: '#fff',
            background: area.color,
            border: 'none', borderRadius: '99px',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            flexShrink: 0,
            transition: 'opacity 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Öffnen <ArrowRight size={12} />
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(project.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', padding: '4px', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF3B30'}
          onMouseLeave={e => e.currentTarget.style.color = '#C7C7CC'}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded tasks */}
      {expanded && (
        <div style={{ padding: '0 20px 12px 52px', background: 'rgba(0,0,0,0.01)' }}>
          {tasks.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <button
                onClick={() => toggleTaskMutation.mutate({ taskId: t.id, status: t.status === 'done' ? 'todo' : 'done' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: t.status === 'done' ? '#34C759' : '#C7C7CC', flexShrink: 0 }}
              >
                {t.status === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </button>
              <span style={{ fontSize: '13px', color: t.status === 'done' ? '#C7C7CC' : '#1D1D1F', textDecoration: t.status === 'done' ? 'line-through' : 'none', flex: 1, letterSpacing: '-0.01em' }}>
                {t.title}
              </span>
            </div>
          ))}
          {tasks.length === 0 && !addingTask && (
            <p style={{ fontSize: '12px', color: '#C7C7CC', margin: '8px 0 4px', fontStyle: 'italic' }}>Noch keine Aufgaben.</p>
          )}
          {addingTask
            ? <InlineTaskInput onAdd={t => { createTaskMutation.mutate(t); setAddingTask(false); }} onCancel={() => setAddingTask(false)} />
            : <button onClick={() => setAddingTask(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '500', color: area.color, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', marginTop: '4px', letterSpacing: '-0.01em' }}>
                <Plus size={12} /> Aufgabe hinzufügen
              </button>
          }
        </div>
      )}
    </div>
  );
}

// ── AreaWidget ────────────────────────────────────────────────────────────────

function AreaWidget({ area, onDeleteArea, onEditArea }) {
  const qc = useQueryClient();
  const [collapsed, setCollapsed]       = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showMenu, setShowMenu]         = useState(false);
  const menuRef = useRef(null);
  const { confirm, ConfirmDialogNode }  = useConfirm();

  useEffect(() => {
    if (!showMenu) return;
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMenu]);

  const createProjectMutation = useMutation({
    mutationFn: data => areasApi.createProject(area.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setShowAddProject(false); toast.success('Projekt erstellt'); },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: id => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  async function handleDeleteProject(id) {
    const ok = await confirm('Projekt und alle Aufgaben löschen?', { title: 'Projekt löschen', danger: true });
    if (ok) deleteProjectMutation.mutate(id);
  }

  const totalTasks = area.projects?.reduce((s, p) => s + (p.task_count || 0), 0) ?? 0;
  const doneTasks  = area.projects?.reduce((s, p) => s + (p.task_done_count || 0), 0) ?? 0;
  const count      = area.projects?.length ?? 0;

  return (
    <div style={{ marginBottom: '20px', borderRadius: '18px', overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)' }}>
      {ConfirmDialogNode}

      {/* ── Area header banner ── */}
      <div style={{ background: area.color, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Icon box */}
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AreaIcon icon={area.icon} size={20} color="white" />
          </div>

          {/* Name + stats */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>{area.name}</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)', letterSpacing: '-0.01em' }}>
              {count} {count === 1 ? 'Projekt' : 'Projekte'}
              {totalTasks > 0 && ` · ${doneTasks}/${totalTasks} Aufgaben`}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => setShowAddProject(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '600',
                color: area.color, background: '#fff', border: 'none', borderRadius: '99px', cursor: 'pointer', letterSpacing: '-0.01em' }}
            >
              <Plus size={13} /> Projekt
            </button>

            <div style={{ position: 'relative' }} ref={menuRef}>
              <button onClick={() => setShowMenu(m => !m)}
                style={{ width: '32px', height: '32px', borderRadius: '99px', background: 'rgba(255,255,255,0.2)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MoreHorizontal size={16} color="white" />
              </button>
              {showMenu && (
                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.07)',
                  padding: '4px', zIndex: 100, minWidth: '170px' }}>
                  <button onClick={() => { onEditArea(area); setShowMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 12px',
                      fontSize: '13px', color: '#1D1D1F', background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', letterSpacing: '-0.01em' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <Edit2 size={13} color="#86868B" /> Bearbeiten
                  </button>
                  <button onClick={() => { setCollapsed(c => !c); setShowMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 12px',
                      fontSize: '13px', color: '#1D1D1F', background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', letterSpacing: '-0.01em' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <ChevronDown size={13} color="#86868B" /> {collapsed ? 'Aufklappen' : 'Einklappen'}
                  </button>
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)', margin: '4px 8px' }} />
                  <button onClick={() => { onDeleteArea(area.id); setShowMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 12px',
                      fontSize: '13px', color: '#FF3B30', background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', letterSpacing: '-0.01em' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <Trash2 size={13} /> Bereich löschen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Projects list ── */}
      {!collapsed && (
        <div style={{ background: '#fff' }}>
          {count === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#C7C7CC', margin: '0 0 12px' }}>Noch keine Projekte in diesem Bereich.</p>
              <button onClick={() => setShowAddProject(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600',
                  color: area.color, background: `${area.color}15`, border: 'none', borderRadius: '99px', cursor: 'pointer' }}>
                <Plus size={13} /> Erstes Projekt erstellen
              </button>
            </div>
          ) : (
            [...(area.projects || [])].sort((a, b) => {
              const BOTTOM = ['waiting_for_client', 'deferred', 'completed'];
              return (BOTTOM.includes(a.status) ? 1 : 0) - (BOTTOM.includes(b.status) ? 1 : 0);
            }).map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                area={area}
                onDelete={handleDeleteProject}
              />
            ))
          )}
        </div>
      )}

      {showAddProject && (
        <CreateProjectModal
          onClose={() => setShowAddProject(false)}
          onCreate={data => createProjectMutation.mutate(data)}
          isPending={createProjectMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Projects() {
  const qc = useQueryClient();
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [editingArea, setEditingArea]       = useState(null);
  const { confirm, ConfirmDialogNode } = useConfirm();

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.list,
  });

  const createAreaMutation = useMutation({
    mutationFn: areasApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setShowCreateArea(false); toast.success('Bereich erstellt'); },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }) => areasApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setEditingArea(null); toast.success('Bereich gespeichert'); },
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const deleteAreaMutation = useMutation({
    mutationFn: areasApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
    onError: err => toast.error(err.response?.data?.error || 'Fehler'),
  });

  async function handleDeleteArea(id) {
    const ok = await confirm('Bereich löschen? Projekte darin bleiben erhalten.', { title: 'Bereich löschen', danger: true });
    if (ok) deleteAreaMutation.mutate(id);
  }

  const totalProjects = areas.reduce((s, a) => s + (a.projects?.length ?? 0), 0);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2.5px solid #0071E3', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {ConfirmDialogNode}

      {/* Header */}
      <div style={{ padding: '32px 32px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.03em', margin: 0 }}>Projekte</h1>
            <p style={{ fontSize: '13px', color: '#86868B', margin: '3px 0 0', letterSpacing: '-0.01em' }}>
              {areas.length} {areas.length === 1 ? 'Bereich' : 'Bereiche'} · {totalProjects} Projekte
            </p>
          </div>
          <button onClick={() => setShowCreateArea(true)} className="btn-primary" style={{ flexShrink: 0 }}>
            <Plus size={15} /> Neuer Bereich
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
        {areas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', textAlign: 'center', gap: '12px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(0,113,227,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers3 size={28} color="#0071E3" />
            </div>
            <p style={{ fontSize: '17px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em', margin: 0 }}>Noch keine Bereiche</p>
            <p style={{ fontSize: '14px', color: '#86868B', margin: 0, maxWidth: '260px', lineHeight: 1.5 }}>
              Erstelle Bereiche um Projekte zu organisieren.
            </p>
            <button onClick={() => setShowCreateArea(true)} className="btn-primary" style={{ marginTop: '8px' }}>
              <Plus size={15} /> Ersten Bereich erstellen
            </button>
          </div>
        ) : (
          areas.map(area => (
            <AreaWidget
              key={area.id}
              area={area}
              onDeleteArea={handleDeleteArea}
              onEditArea={setEditingArea}
            />
          ))
        )}
      </div>

      {showCreateArea && (
        <CreateAreaModal
          onClose={() => setShowCreateArea(false)}
          onCreate={data => createAreaMutation.mutate(data)}
          isPending={createAreaMutation.isPending}
        />
      )}

      {editingArea && (
        <EditAreaModal
          area={editingArea}
          onClose={() => setEditingArea(null)}
          onSave={data => updateAreaMutation.mutate({ id: editingArea.id, data })}
          isPending={updateAreaMutation.isPending}
        />
      )}
    </div>
  );
}
