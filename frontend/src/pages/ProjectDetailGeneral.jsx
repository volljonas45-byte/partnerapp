import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Trash2, Circle, CheckCircle2,
  Calendar, StickyNote, ChevronDown, Pencil, Check, X,
  Flag, Link as LinkIcon, ExternalLink, CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { useConfirm } from '../hooks/useConfirm';

const STATUS_OPTIONS = [
  { value: 'planned',   label: 'Geplant',       color: '#6E6E73', bg: 'rgba(118,118,128,0.12)' },
  { value: 'active',    label: 'Aktiv',          color: '#0071E3', bg: 'rgba(0,113,227,0.10)'   },
  { value: 'on_hold',   label: 'Pausiert',       color: '#C93400', bg: 'rgba(255,149,0,0.12)'   },
  { value: 'completed', label: 'Abgeschlossen',  color: '#248A3D', bg: 'rgba(52,199,89,0.12)'   },
];

function getStatus(val) { return STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0]; }

// ── InlineTaskInput ────────────────────────────────────────────────────────────

function InlineTaskInput({ onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const submitted = useRef(false);
  function submit() { if (!title.trim()) return; submitted.current = true; onAdd(title.trim()); }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(0,113,227,0.05)', borderRadius: '10px', margin: '6px 0' }}>
      <Circle size={16} color="#C7C7CC" style={{ flexShrink: 0 }} />
      <input autoFocus
        style={{ flex: 1, fontSize: '14px', color: '#1D1D1F', background: 'none', border: 'none', outline: 'none', letterSpacing: '-0.01em' }}
        placeholder="Aufgabe eingeben…" value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') onCancel(); }}
        onBlur={() => { if (!submitted.current) onCancel(); }}
      />
      <button onMouseDown={e => e.preventDefault()} onClick={submit}
        style={{ fontSize: '12px', fontWeight: '600', color: title.trim() ? '#0071E3' : '#C7C7CC', background: 'none', border: 'none', cursor: 'pointer' }}>
        Speichern
      </button>
      <button onMouseDown={e => e.preventDefault()} onClick={onCancel}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC' }}><X size={14} /></button>
    </div>
  );
}

// ── TaskRow ────────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete }) {
  const [hov, setHov] = useState(false);
  const done = task.status === 'done';
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <button onClick={onToggle} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: done ? '#34C759' : '#C7C7CC', transition: 'color 0.15s' }}>
        {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>
      <span style={{ flex: 1, fontSize: '14px', color: done ? '#C7C7CC' : '#1D1D1F', textDecoration: done ? 'line-through' : 'none', letterSpacing: '-0.01em' }}>{task.title}</span>
      {hov && (
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', padding: '2px', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF3B30'}
          onMouseLeave={e => e.currentTarget.style.color = '#C7C7CC'}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, color = '#0071E3', children, action }) {
  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={color} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1D1D1F', letterSpacing: '-0.01em' }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: '14px 18px' }}>{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProjectDetailGeneral() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [addingTask, setAddingTask]       = useState(false);
  const [editingName, setEditingName]     = useState(false);
  const [editName, setEditName]           = useState('');
  const [editingDesc, setEditingDesc]     = useState(false);
  const [editDesc, setEditDesc]           = useState('');
  const [newNote, setNewNote]             = useState('');
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [editDeadline, setEditDeadline]   = useState(false);
  const [newLinkLabel, setNewLinkLabel]   = useState('');
  const [newLinkUrl, setNewLinkUrl]       = useState('');
  const [showAddLink, setShowAddLink]     = useState(false);
  const statusRef = useRef(null);

  useEffect(() => {
    if (!showStatusDrop) return;
    const h = e => { if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStatusDrop]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id).then(r => r.data),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => projectsApi.getTasks(id).then(r => r.data),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['project-notes', id],
    queryFn: () => projectsApi.getNotes(id).then(r => r.data),
  });

  const { data: links = [] } = useQuery({
    queryKey: ['project-links', id],
    queryFn: () => projectsApi.getCredentials(id).then(r => r.data),
  });

  const update   = useMutation({ mutationFn: d => projectsApi.update(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }), onError: err => toast.error(err.response?.data?.error || 'Fehler') });
  const addTask  = useMutation({ mutationFn: t => projectsApi.createTask(id, { title: t }), onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', id] }), onError: err => toast.error(err.response?.data?.error || 'Fehler') });
  const togTask  = useMutation({ mutationFn: ({ taskId, status }) => projectsApi.updateTask(id, taskId, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', id] }) });
  const delTask  = useMutation({ mutationFn: tid => projectsApi.deleteTask(id, tid), onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', id] }), onError: err => toast.error(err.response?.data?.error || 'Fehler') });
  const addNote  = useMutation({ mutationFn: c => projectsApi.addNote(id, { content: c }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-notes', id] }); setNewNote(''); }, onError: err => toast.error(err.response?.data?.error || 'Fehler') });
  const delNote  = useMutation({ mutationFn: nId => projectsApi.deleteNote(id, nId), onSuccess: () => qc.invalidateQueries({ queryKey: ['project-notes', id] }) });
  const addLink  = useMutation({ mutationFn: d => projectsApi.createCredential(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-links', id] }); setNewLinkLabel(''); setNewLinkUrl(''); setShowAddLink(false); }, onError: err => toast.error(err.response?.data?.error || 'Fehler') });
  const delLink  = useMutation({ mutationFn: cId => projectsApi.deleteCredential(id, cId), onSuccess: () => qc.invalidateQueries({ queryKey: ['project-links', id] }) });

  async function handleDeleteTask(tid) {
    const ok = await confirm('Aufgabe löschen?', { title: 'Aufgabe löschen', danger: true });
    if (ok) delTask.mutate(tid);
  }

  if (isLoading || !project) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2.5px solid #0071E3', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const doneTasks  = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const statusCfg = getStatus(project.status);
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';

  function fmtDeadline(d) { return d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : null; }
  function fmtNote(d) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F5F5F7' }}>
      {ConfirmDialogNode}

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 28px 48px' }}>

        {/* Back */}
        <button onClick={() => navigate('/projects')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px', fontWeight: '500', letterSpacing: '-0.01em' }}>
          <ArrowLeft size={14} /> Projekte
        </button>

        {/* ── Hero card ── */}
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Progress bar top strip */}
          {totalTasks > 0 && (
            <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34C759' : '#0071E3', transition: 'width 0.5s ease' }} />
            </div>
          )}

          <div style={{ padding: '24px 24px 20px' }}>
            {/* Name row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px' }}>
              {editingName ? (
                <input autoFocus
                  style={{ flex: 1, fontSize: '24px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.03em', background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '10px', padding: '4px 10px', outline: 'none', fontFamily: 'inherit' }}
                  defaultValue={project.name}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => { if (editName.trim() && editName !== project.name) update.mutate({ name: editName }); setEditingName(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') { if (editName.trim()) update.mutate({ name: editName }); setEditingName(false); } if (e.key === 'Escape') setEditingName(false); }}
                />
              ) : (
                <h1 onClick={() => { setEditName(project.name); setEditingName(true); }}
                  style={{ flex: 1, fontSize: '24px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.03em', margin: 0, cursor: 'text', lineHeight: 1.25 }}>
                  {project.name}
                </h1>
              )}
              <button onClick={() => { setEditName(project.name); setEditingName(true); }}
                style={{ padding: '7px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <Pencil size={14} color="#86868B" />
              </button>
            </div>

            {/* Status + Deadline chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: totalTasks > 0 ? '20px' : 0 }}>

              {/* Status dropdown */}
              <div style={{ position: 'relative' }} ref={statusRef}>
                <button onClick={() => setShowStatusDrop(s => !s)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '99px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', background: statusCfg.bg, color: statusCfg.color, letterSpacing: '-0.01em' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusCfg.color }} />
                  {statusCfg.label} <ChevronDown size={12} />
                </button>
                {showStatusDrop && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.07)', padding: '4px', zIndex: 100, minWidth: '180px' }}>
                    {STATUS_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => { update.mutate({ status: s.value }); setShowStatusDrop(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '9px 12px', fontSize: '13px', color: project.status === s.value ? s.color : '#1D1D1F', background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: project.status === s.value ? '600' : '400', letterSpacing: '-0.01em' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        {s.label}
                        {project.status === s.value && <Check size={13} style={{ marginLeft: 'auto', color: s.color }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deadline */}
              {editDeadline ? (
                <input type="date" autoFocus
                  defaultValue={project.deadline?.slice(0, 10) || ''}
                  style={{ fontSize: '13px', color: '#1D1D1F', border: '1.5px solid #0071E3', borderRadius: '10px', padding: '5px 10px', outline: 'none', fontFamily: 'inherit' }}
                  onBlur={e => { update.mutate({ deadline: e.target.value || null }); setEditDeadline(false); }}
                  onKeyDown={e => { if (e.key === 'Escape') setEditDeadline(false); }}
                />
              ) : (
                <button onClick={() => setEditDeadline(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '500', color: isOverdue ? '#FF3B30' : project.deadline ? '#1D1D1F' : '#86868B', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', padding: '6px 13px', borderRadius: '99px', letterSpacing: '-0.01em' }}>
                  <Calendar size={13} />
                  {project.deadline ? fmtDeadline(project.deadline) : 'Deadline setzen'}
                  {isOverdue && <Flag size={12} color="#FF3B30" />}
                </button>
              )}
            </div>

            {/* Progress stats */}
            {totalTasks > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'rgba(0,0,0,0.025)', borderRadius: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#86868B', letterSpacing: '-0.01em' }}>{doneTasks} von {totalTasks} Aufgaben</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: pct === 100 ? '#248A3D' : '#1D1D1F', letterSpacing: '-0.01em' }}>{pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(0,0,0,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34C759' : '#0071E3', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                {pct === 100 && (
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>🎉</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Tasks ── */}
        <Section title="Aufgaben" icon={CheckSquare} color="#0071E3"
          action={
            <button onClick={() => setAddingTask(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', color: '#0071E3', background: 'rgba(0,113,227,0.08)', border: 'none', borderRadius: '8px', cursor: 'pointer', letterSpacing: '-0.01em' }}>
              <Plus size={13} /> Aufgabe
            </button>
          }>
          {tasks.length === 0 && !addingTask && (
            <p style={{ fontSize: '14px', color: '#C7C7CC', margin: '8px 0', textAlign: 'center' }}>Noch keine Aufgaben.</p>
          )}
          {tasks.map(t => (
            <TaskRow key={t.id} task={t}
              onToggle={() => togTask.mutate({ taskId: t.id, status: t.status === 'done' ? 'todo' : 'done' })}
              onDelete={() => handleDeleteTask(t.id)} />
          ))}
          {addingTask && <InlineTaskInput onAdd={t => { addTask.mutate(t); setAddingTask(false); }} onCancel={() => setAddingTask(false)} />}
        </Section>

        {/* ── Links ── */}
        <Section title="Links" icon={LinkIcon} color="#5AC8FA"
          action={
            <button onClick={() => setShowAddLink(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', color: '#5AC8FA', background: 'rgba(90,200,250,0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer', letterSpacing: '-0.01em' }}>
              <Plus size={13} /> Link
            </button>
          }>

          {/* Add link form */}
          {showAddLink && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(90,200,250,0.06)', borderRadius: '10px', marginBottom: '10px' }}>
              <input className="input w-full" placeholder="Bezeichnung (z.B. Figma, Docs…)" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} />
              <input className="input w-full" placeholder="https://" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setShowAddLink(false)} className="btn-secondary" style={{ fontSize: '12px', padding: '5px 12px' }}>Abbrechen</button>
                <button
                  onClick={() => { if (newLinkLabel.trim() && newLinkUrl.trim()) addLink.mutate({ label: newLinkLabel.trim(), link: newLinkUrl.trim(), type: 'link' }); }}
                  disabled={!newLinkLabel.trim() || !newLinkUrl.trim() || addLink.isPending}
                  className="btn-primary" style={{ fontSize: '12px', padding: '5px 14px' }}>
                  Speichern
                </button>
              </div>
            </div>
          )}

          {/* Links list */}
          {links.length === 0 && !showAddLink && (
            <p style={{ fontSize: '14px', color: '#C7C7CC', margin: '8px 0', textAlign: 'center' }}>Noch keine Links gespeichert.</p>
          )}
          {links.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(90,200,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LinkIcon size={14} color="#5AC8FA" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1D1D1F', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#86868B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.link}</p>
              </div>
              <a href={l.link} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: '600', color: '#5AC8FA', background: 'rgba(90,200,250,0.1)', borderRadius: '8px', textDecoration: 'none', flexShrink: 0 }}>
                Öffnen <ExternalLink size={11} />
              </a>
              <button onClick={() => delLink.mutate(l.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', padding: '4px', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#FF3B30'}
                onMouseLeave={e => e.currentTarget.style.color = '#C7C7CC'}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </Section>

        {/* ── Description ── */}
        <Section title="Beschreibung" icon={Pencil} color="#BF5AF2">
          {editingDesc ? (
            <div>
              <textarea autoFocus rows={4}
                style={{ width: '100%', fontSize: '14px', color: '#1D1D1F', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', padding: '10px 12px', outline: 'none', resize: 'vertical', letterSpacing: '-0.01em', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }}
                value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => setEditingDesc(false)} className="btn-secondary" style={{ fontSize: '12px', padding: '5px 12px' }}>Abbrechen</button>
                <button onClick={() => { update.mutate({ description: editDesc }); setEditingDesc(false); }} className="btn-primary" style={{ fontSize: '12px', padding: '5px 12px' }}>Speichern</button>
              </div>
            </div>
          ) : (
            <div onClick={() => { setEditDesc(project.description || ''); setEditingDesc(true); }} style={{ cursor: 'text', minHeight: '44px' }}>
              {project.description
                ? <p style={{ fontSize: '14px', color: '#1D1D1F', margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap', letterSpacing: '-0.01em' }}>{project.description}</p>
                : <p style={{ fontSize: '14px', color: '#C7C7CC', margin: 0, fontStyle: 'italic' }}>Klicke hier um eine Beschreibung hinzuzufügen…</p>}
            </div>
          )}
        </Section>

        {/* ── Notes ── */}
        <Section title="Notizen" icon={StickyNote} color="#FF9500">
          <div style={{ marginBottom: '12px' }}>
            <textarea rows={2} placeholder="Neue Notiz…"
              style={{ width: '100%', fontSize: '13px', color: '#1D1D1F', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '9px 12px', outline: 'none', resize: 'none', letterSpacing: '-0.01em', fontFamily: 'inherit', boxSizing: 'border-box' }}
              value={newNote} onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && newNote.trim()) { e.preventDefault(); addNote.mutate(newNote.trim()); } }}
            />
            {newNote.trim() && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button onClick={() => addNote.mutate(newNote.trim())} disabled={addNote.isPending} className="btn-primary" style={{ fontSize: '12px', padding: '5px 14px' }}>Hinzufügen</button>
              </div>
            )}
          </div>
          {notes.map(n => (
            <div key={n.id} style={{ padding: '12px 14px', background: 'rgba(255,149,0,0.07)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255,149,0,0.15)' }}>
              <p style={{ fontSize: '13px', color: '#1D1D1F', margin: '0 0 6px', whiteSpace: 'pre-wrap', lineHeight: 1.55, letterSpacing: '-0.01em' }}>{n.content}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#86868B' }}>{fmtNote(n.created_at)}</span>
                <button onClick={() => delNote.mutate(n.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', padding: '2px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#FF3B30'}
                  onMouseLeave={e => e.currentTarget.style.color = '#C7C7CC'}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {notes.length === 0 && !newNote && <p style={{ fontSize: '13px', color: '#C7C7CC', margin: '4px 0', textAlign: 'center' }}>Noch keine Notizen.</p>}
        </Section>
      </div>
    </div>
  );
}
