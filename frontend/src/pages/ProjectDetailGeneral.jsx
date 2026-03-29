import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight,
  Check, X, Calendar, UserCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { teamApi } from '../api/team';
import { useConfirm } from '../hooks/useConfirm';

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  urgent: { label: 'Dringend', color: '#EF4444' },
  high:   { label: 'Hoch',     color: '#F97316' },
  medium: { label: 'Mittel',   color: '#EAB308' },
  low:    { label: 'Niedrig',  color: '#6B7280' },
  none:   { label: 'Keine',    color: '#D1D5DB' },
};

const STATUS_CONFIG = {
  planned:            { label: 'Geplant',          color: '#86868B', bg: 'rgba(118,118,128,0.1)' },
  active:             { label: 'Aktiv',            color: '#0071E3', bg: 'rgba(0,113,227,0.1)'   },
  completed:          { label: 'Abgeschlossen',    color: '#34C759', bg: 'rgba(52,199,89,0.1)'   },
  waiting_for_client: { label: 'Wartet auf Kunde', color: '#FF9500', bg: 'rgba(255,149,0,0.1)'   },
  deferred:           { label: 'Verschoben',       color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  on_hold:            { label: 'Pausiert',         color: '#FF9500', bg: 'rgba(255,149,0,0.1)'   },
};

const STATUS_CYCLE = ['todo', 'doing', 'done'];

function nextTaskStatus(current) {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtShortDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function isOverdueDate(d) {
  if (!d) return false;
  return new Date(d) < new Date();
}

// ── MemberAvatar ──────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = 20, style: extraStyle }) {
  if (!member) return null;
  const name = member.name || member.email || '?';
  const letters = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      title={member.name || member.email}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: member.color || '#6366f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: '700', color: '#fff',
        flexShrink: 0, userSelect: 'none',
        ...extraStyle,
      }}
    >
      {letters}
    </div>
  );
}

// ── TaskStatusIcon ────────────────────────────────────────────────────────────

function TaskStatusIcon({ status, size = 18 }) {
  if (status === 'done') {
    return (
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8.5" fill="#34C759" stroke="#34C759" />
        <path d="M5.5 9L7.8 11.3L12.5 6.7" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'doing') {
    return (
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8.5" stroke="#0071E3" strokeWidth="1.5" />
        <path d="M9 0.5 A8.5 8.5 0 0 1 17.5 9" stroke="#0071E3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="9" cy="9" r="3" fill="#0071E3" />
      </svg>
    );
  }
  // todo
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" stroke="#C7C7CC" strokeWidth="1.5" />
    </svg>
  );
}

// ── AssigneePicker dropdown ───────────────────────────────────────────────────

function AssigneePicker({ value, members, onChange, size = 20 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const assignee = members.find(m => m.id === value);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
        title="Zuweisen"
      >
        {assignee
          ? <MemberAvatar member={assignee} size={size} />
          : <UserCircle size={size} color="#C7C7CC" />}
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, bottom: '110%', zIndex: 200,
          background: '#fff', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.07)',
          padding: '4px', minWidth: '164px',
        }}>
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', fontSize: '13px', color: '#6E6E73' }}
          >
            <UserCircle size={16} /> Niemand
          </button>
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: value === m.id ? '#F0F0F5' : 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F' }}
            >
              <MemberAvatar member={m} size={18} /> {m.name || m.email}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── InlineTaskInput ───────────────────────────────────────────────────────────

function InlineTaskInput({ onAdd, onCancel, members = [], section }) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(null);
  const submitted = useRef(false);

  function submit() {
    if (!title.trim()) { onCancel(); return; }
    submitted.current = true;
    onAdd({ title: title.trim(), assignee_id: assigneeId, section });
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', margin: '4px 0',
      background: 'rgba(0,113,227,0.04)', borderRadius: '8px',
      border: '1px solid rgba(0,113,227,0.15)',
    }}>
      <TaskStatusIcon status="todo" size={16} />
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') onCancel(); }}
        onBlur={() => { if (!submitted.current) onCancel(); }}
        placeholder="Aufgabe eingeben…"
        style={{ flex: 1, fontSize: '14px', color: '#1D1D1F', background: 'none', border: 'none', outline: 'none', letterSpacing: '-0.01em' }}
      />
      {members.length > 0 && (
        <AssigneePicker
          value={assigneeId}
          members={members}
          onChange={id => setAssigneeId(id)}
          size={18}
        />
      )}
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={submit}
        style={{ fontSize: '12px', fontWeight: '600', color: title.trim() ? '#0071E3' : '#C7C7CC', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
      >
        Speichern
      </button>
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={onCancel}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', display: 'flex', alignItems: 'center' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── TaskRow (List View) ───────────────────────────────────────────────────────

function TaskRow({ task, members, onCycle, onDelete, onUpdate }) {
  const [hov, setHov] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const done = task.status === 'done';
  const assignee = members.find(m => m.id === task.assignee_id)
    || (task.assignee_name ? { name: task.assignee_name, color: task.assignee_color, email: task.assignee_email } : null);
  const overdue = isOverdueDate(task.due_date) && !done;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.none;

  function saveTitle() {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() });
    }
    setEditingTitle(false);
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '7px 0',
        borderBottom: '1px solid rgba(0,0,0,0.045)',
        background: hov ? 'rgba(0,0,0,0.015)' : 'transparent',
        borderRadius: '6px',
        paddingLeft: '4px', paddingRight: '4px',
        transition: 'background 0.1s',
      }}
    >
      {/* Status toggle */}
      <button
        onClick={() => onCycle(task.id, task.status)}
        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
        title="Status wechseln"
      >
        <TaskStatusIcon status={task.status || 'todo'} size={17} />
      </button>

      {/* Title */}
      {editingTitle ? (
        <input
          autoFocus
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
          style={{ flex: 1, fontSize: '14px', color: '#1D1D1F', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,113,227,0.3)', borderRadius: '6px', padding: '2px 6px', outline: 'none', letterSpacing: '-0.01em', fontFamily: 'inherit' }}
        />
      ) : (
        <span
          onDoubleClick={() => { setEditTitle(task.title); setEditingTitle(true); }}
          style={{ flex: 1, fontSize: '14px', color: done ? '#B0B0B8' : '#1D1D1F', textDecoration: done ? 'line-through' : 'none', letterSpacing: '-0.01em', cursor: 'default', userSelect: 'none' }}
        >
          {task.title}
        </span>
      )}

      {/* Priority dot */}
      {task.priority && task.priority !== 'none' && (
        <div
          title={priority.label}
          style={{ width: '7px', height: '7px', borderRadius: '50%', background: priority.color, flexShrink: 0 }}
        />
      )}

      {/* Due date */}
      {task.due_date && (
        <span style={{ fontSize: '11px', color: overdue ? '#EF4444' : '#86868B', letterSpacing: '-0.01em', flexShrink: 0, fontWeight: overdue ? '600' : '400' }}>
          {fmtShortDate(task.due_date)}
        </span>
      )}

      {/* Doing badge */}
      {task.status === 'doing' && (
        <span style={{ fontSize: '10px', fontWeight: '600', color: '#0071E3', background: 'rgba(0,113,227,0.1)', padding: '2px 7px', borderRadius: '99px', flexShrink: 0, letterSpacing: '-0.01em' }}>
          In Bearbeitung
        </span>
      )}

      {/* Assignee */}
      {assignee && <MemberAvatar member={assignee} size={20} />}

      {/* Delete */}
      {hov && (
        <button
          onClick={() => onDelete(task.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', padding: '2px', flexShrink: 0, lineHeight: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#C7C7CC'}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ── SectionBlock (List View) ──────────────────────────────────────────────────

function SectionBlock({ name, tasks, members, onCycle, onDelete, onUpdate, onAddTask, isLast }) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [sectionName, setSectionName] = useState(name);

  return (
    <div style={{ marginBottom: isLast ? 0 : '2px' }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 4px 6px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        marginBottom: '2px',
      }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#86868B', flexShrink: 0 }}
        >
          {collapsed
            ? <ChevronRight size={14} />
            : <ChevronDown size={14} />}
        </button>

        {editingName ? (
          <input
            autoFocus
            value={sectionName}
            onChange={e => setSectionName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false); }}
            style={{ fontSize: '12px', fontWeight: '600', color: '#1D1D1F', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,113,227,0.3)', borderRadius: '5px', padding: '2px 6px', outline: 'none', letterSpacing: '-0.01em', fontFamily: 'inherit' }}
          />
        ) : (
          <span
            onClick={() => setEditingName(true)}
            style={{ fontSize: '12px', fontWeight: '600', color: '#6E6E73', letterSpacing: '-0.01em', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            {sectionName}
          </span>
        )}

        <span style={{
          fontSize: '11px', fontWeight: '500', color: '#86868B',
          background: 'rgba(0,0,0,0.06)', borderRadius: '99px',
          padding: '1px 7px', marginLeft: '2px',
        }}>
          {tasks.length}
        </span>

        <button
          onClick={() => setAdding(true)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600', color: '#0071E3', background: 'rgba(0,113,227,0.07)', border: 'none', cursor: 'pointer', padding: '3px 9px', borderRadius: '6px', letterSpacing: '-0.01em' }}
        >
          <Plus size={11} /> Aufgabe
        </button>
      </div>

      {/* Tasks */}
      {!collapsed && (
        <>
          {tasks.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              members={members}
              onCycle={onCycle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
          {adding && (
            <InlineTaskInput
              section={name}
              members={members}
              onAdd={data => { onAddTask(data); setAdding(false); }}
              onCancel={() => setAdding(false)}
            />
          )}
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#B0B0B8', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 4px', letterSpacing: '-0.01em' }}
            >
              <Plus size={13} /> Aufgabe hinzufügen
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Board Card ────────────────────────────────────────────────────────────────

function BoardCard({ task, members, onCycle, onDelete }) {
  const [hov, setHov] = useState(false);
  const assignee = members.find(m => m.id === task.assignee_id)
    || (task.assignee_name ? { name: task.assignee_name, color: task.assignee_color } : null);
  const overdue = isOverdueDate(task.due_date) && task.status !== 'done';
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.none;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', borderRadius: '10px',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: hov ? '0 4px 14px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.05)',
        padding: '11px 13px', marginBottom: '8px',
        transition: 'box-shadow 0.15s',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <button
          onClick={() => onCycle(task.id, task.status)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, marginTop: '1px', flexShrink: 0 }}
        >
          <TaskStatusIcon status={task.status || 'todo'} size={15} />
        </button>
        <span style={{ flex: 1, fontSize: '13px', color: task.status === 'done' ? '#B0B0B8' : '#1D1D1F', textDecoration: task.status === 'done' ? 'line-through' : 'none', lineHeight: 1.45, letterSpacing: '-0.01em' }}>
          {task.title}
        </span>
        {hov && (
          <button
            onClick={() => onDelete(task.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C7CC', padding: 0, lineHeight: 0, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#C7C7CC'}
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
        {task.priority && task.priority !== 'none' && (
          <div title={priority.label} style={{ width: '6px', height: '6px', borderRadius: '50%', background: priority.color }} />
        )}
        {task.due_date && (
          <span style={{ fontSize: '11px', color: overdue ? '#EF4444' : '#86868B', fontWeight: overdue ? '600' : '400' }}>
            {fmtShortDate(task.due_date)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {assignee && <MemberAvatar member={assignee} size={18} />}
      </div>
    </div>
  );
}

// ── BoardView ─────────────────────────────────────────────────────────────────

function BoardView({ tasks, members, onCycle, onDelete, onAddTask }) {
  const [addingCol, setAddingCol] = useState(null);

  const COLUMNS = [
    { key: 'todo',  label: 'Offen',          color: '#86868B', bg: 'rgba(118,118,128,0.08)' },
    { key: 'doing', label: 'In Bearbeitung',  color: '#0071E3', bg: 'rgba(0,113,227,0.06)'   },
    { key: 'done',  label: 'Erledigt',        color: '#34C759', bg: 'rgba(52,199,89,0.06)'   },
  ];

  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: '8px' }}>
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => (t.status || 'todo') === col.key);
        return (
          <div
            key={col.key}
            style={{
              flex: '1 1 0', minWidth: '220px',
              background: col.bg,
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            {/* Column header */}
            <div style={{ borderTop: `3px solid ${col.color}`, padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em' }}>{col.label}</span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: col.color, background: `${col.color}18`, padding: '1px 7px', borderRadius: '99px' }}>
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ padding: '4px 10px 6px' }}>
              {colTasks.map(t => (
                <BoardCard key={t.id} task={t} members={members} onCycle={onCycle} onDelete={onDelete} />
              ))}
              {addingCol === col.key ? (
                <InlineTaskInput
                  section="Allgemein"
                  members={members}
                  onAdd={data => { onAddTask({ ...data, status: col.key }); setAddingCol(null); }}
                  onCancel={() => setAddingCol(null)}
                />
              ) : (
                <button
                  onClick={() => setAddingCol(col.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#B0B0B8', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 2px', letterSpacing: '-0.01em', width: '100%' }}
                >
                  <Plus size={13} /> Aufgabe hinzufügen
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── StatusDropdown ────────────────────────────────────────────────────────────

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = STATUS_CONFIG[value] || STATUS_CONFIG.planned;

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '99px', fontSize: '13px', fontWeight: '600',
          color: cfg.color, background: cfg.bg,
          border: 'none', cursor: 'pointer', letterSpacing: '-0.01em',
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        {cfg.label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
          background: '#fff', borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.07)',
          padding: '4px', minWidth: '188px',
        }}>
          {Object.entries(STATUS_CONFIG).map(([key, s]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
                padding: '9px 12px', fontSize: '13px',
                color: value === key ? s.color : '#1D1D1F',
                background: 'none', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: value === key ? '600' : '400',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              {s.label}
              {value === key && <Check size={13} style={{ marginLeft: 'auto', color: s.color }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProjectDetailGeneral() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [view, setView] = useState('list');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id).then(r => r.data),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => projectsApi.getTasks(id).then(r => r.data),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const updateProject = useMutation({
    mutationFn: data => projectsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
    onError: err => toast.error(err?.response?.data?.error || 'Fehler beim Speichern'),
  });

  const createTask = useMutation({
    mutationFn: data => projectsApi.createTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', id] }),
    onError: err => toast.error(err?.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }) => projectsApi.updateTask(id, taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', id] }),
    onError: err => toast.error(err?.response?.data?.error || 'Fehler beim Aktualisieren'),
  });

  const deleteTask = useMutation({
    mutationFn: taskId => projectsApi.deleteTask(id, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', id] }),
    onError: err => toast.error(err?.response?.data?.error || 'Fehler beim Löschen'),
  });

  // ── Derived state ────────────────────────────────────────────────────────────

  const sections = useMemo(() => {
    const seen = new Set();
    const result = [];
    tasks.forEach(t => {
      const s = t.section || 'Allgemein';
      if (!seen.has(s)) { seen.add(s); result.push(s); }
    });
    if (!result.includes('Allgemein')) result.unshift('Allgemein');
    return result;
  }, [tasks]);

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const today = new Date();
  const deadline = project?.deadline ? new Date(project.deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline - today) / 86400000) : null;
  const deadlineOverdue = deadline && deadline < today && project?.status !== 'completed';

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCycleTask(taskId, currentStatus) {
    updateTask.mutate({ taskId, data: { status: nextTaskStatus(currentStatus || 'todo') } });
  }

  async function handleDeleteTask(taskId) {
    const ok = await confirm('Diese Aufgabe wirklich löschen?', { title: 'Aufgabe löschen', danger: true });
    if (ok) deleteTask.mutate(taskId);
  }

  function handleUpdateTask(taskId, data) {
    updateTask.mutate({ taskId, data });
  }

  function handleAddTask(data) {
    createTask.mutate(data);
  }

  function saveName() {
    if (editName.trim() && editName.trim() !== project.name) {
      updateProject.mutate({ name: editName.trim() });
    }
    setEditingName(false);
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading || !project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#F5F5F7' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2.5px solid #0071E3', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const projectCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planned;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F5F5F7' }}>
      {ConfirmDialogNode}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 28px 56px' }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/projects')}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '500', color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px', letterSpacing: '-0.01em' }}
        >
          <ArrowLeft size={14} /> Projekte
        </button>

        {/* ── Header card ── */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: '16px', overflow: 'hidden' }}>

          {/* Progress bar strip */}
          <div style={{ height: '3px', background: 'rgba(0,0,0,0.06)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34C759' : '#0071E3', transition: 'width 0.5s ease' }} />
          </div>

          <div style={{ padding: '22px 24px 20px' }}>

            {/* Project name */}
            <div style={{ marginBottom: '14px' }}>
              {editingName ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  style={{ fontSize: '26px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.035em', background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '10px', padding: '4px 10px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                />
              ) : (
                <h1
                  onClick={() => { setEditName(project.name); setEditingName(true); }}
                  style={{ fontSize: '26px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.035em', margin: 0, cursor: 'text', lineHeight: 1.2 }}
                  title="Klicken zum Bearbeiten"
                >
                  {project.name}
                </h1>
              )}
            </div>

            {/* Status + dates row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <StatusDropdown
                value={project.status}
                onChange={val => updateProject.mutate({ status: val })}
              />

              {/* Start → End date */}
              {(project.start_date || project.deadline) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6E6E73', letterSpacing: '-0.01em' }}>
                  <Calendar size={13} color="#86868B" />
                  {project.start_date && <span>{fmtDate(project.start_date)}</span>}
                  {project.start_date && project.deadline && <span style={{ color: '#C7C7CC' }}>→</span>}
                  {project.deadline && (
                    <span style={{ color: deadlineOverdue ? '#EF4444' : '#1D1D1F', fontWeight: deadlineOverdue ? '600' : '400' }}>
                      {fmtDate(project.deadline)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Progress bar + stats */}
            {totalTasks > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: pct === 100 ? '#34C759' : '#1D1D1F', letterSpacing: '-0.01em' }}>
                    {pct}% abgeschlossen
                  </span>
                  <span style={{ fontSize: '12px', color: '#86868B', letterSpacing: '-0.01em' }}>
                    {daysLeft !== null
                      ? daysLeft < 0
                        ? `${Math.abs(daysLeft)} Tage überfällig`
                        : daysLeft === 0
                          ? 'Heute fällig'
                          : `${daysLeft} Tage verbleibend`
                      : `${doneTasks} / ${totalTasks} Aufgaben`}
                  </span>
                </div>
                <div style={{ height: '7px', background: 'rgba(0,0,0,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34C759' : '#0071E3', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}

            {/* Team avatars */}
            {members.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
                {members.slice(0, 6).map((m, i) => (
                  <div key={m.id} style={{ marginLeft: i === 0 ? 0 : '-6px', zIndex: 10 - i, border: '2px solid #fff', borderRadius: '50%', lineHeight: 0 }}>
                    <MemberAvatar member={m} size={28} />
                  </div>
                ))}
                {members.length > 6 && (
                  <div style={{ marginLeft: '-6px', zIndex: 1, width: '28px', height: '28px', borderRadius: '50%', background: '#E5E5EA', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#6E6E73' }}>
                    +{members.length - 6}
                  </div>
                )}
                <button style={{ marginLeft: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={13} color="#6E6E73" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Tasks card ── */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* Card header with view toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#1D1D1F', letterSpacing: '-0.02em' }}>Aufgaben</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* View toggle */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                {['list', 'board'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      fontSize: '12px', fontWeight: '600',
                      padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: view === v ? '#fff' : 'transparent',
                      color: view === v ? '#1D1D1F' : '#86868B',
                      boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                      transition: 'background 0.15s, color 0.15s',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {v === 'list' ? 'Liste' : 'Board'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: view === 'board' ? '16px' : '0 16px 12px' }}>
            {view === 'list' ? (
              <>
                {sections.map((section, idx) => (
                  <SectionBlock
                    key={section}
                    name={section}
                    tasks={tasks.filter(t => (t.section || 'Allgemein') === section)}
                    members={members}
                    onCycle={handleCycleTask}
                    onDelete={handleDeleteTask}
                    onUpdate={handleUpdateTask}
                    onAddTask={handleAddTask}
                    isLast={idx === sections.length - 1 && !addingSection}
                  />
                ))}

                {/* New section */}
                {addingSection ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 4px', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '6px' }}>
                    <input
                      autoFocus
                      value={newSectionName}
                      onChange={e => setNewSectionName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSectionName.trim()) {
                          handleAddTask({ title: '(leer)', section: newSectionName.trim() });
                          setNewSectionName('');
                          setAddingSection(false);
                        }
                        if (e.key === 'Escape') { setAddingSection(false); setNewSectionName(''); }
                      }}
                      onBlur={() => { setAddingSection(false); setNewSectionName(''); }}
                      placeholder="Abschnittsname…"
                      style={{ fontSize: '13px', fontWeight: '600', color: '#1D1D1F', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,113,227,0.3)', borderRadius: '6px', padding: '4px 8px', outline: 'none', letterSpacing: '-0.01em', fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: '12px', color: '#86868B' }}>Enter zum Speichern</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSection(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: '#86868B', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px', marginTop: '4px', letterSpacing: '-0.01em', borderTop: '1px solid rgba(0,0,0,0.04)', width: '100%' }}
                  >
                    <Plus size={13} /> Neuer Abschnitt
                  </button>
                )}
              </>
            ) : (
              <BoardView
                tasks={tasks}
                members={members}
                onCycle={handleCycleTask}
                onDelete={handleDeleteTask}
                onAddTask={handleAddTask}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
