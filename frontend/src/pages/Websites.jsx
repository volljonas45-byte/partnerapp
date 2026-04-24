import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, List, LayoutGrid, Columns3, Search, Eye, X, CalendarDays, ChevronDown, Globe,
  Flag, CheckCircle2, AlertCircle, Clock, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../api/projects';
import { clientsApi } from '../api/clients';
import { formatDate, isPast } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import ProjectTimerButton from '../components/ProjectTimerButton';

// ── Design tokens ─────────────────────────────────────────────────────────────
function useD() {
  const { isDark } = useTheme();
  return isDark ? {
    bg:      '#06060F',
    card:    '#0D0D1E',
    card2:   '#121228',
    card3:   '#181838',
    border:  'rgba(255,255,255,0.09)',
    borderB: 'rgba(255,255,255,0.16)',
    text:    '#EEEEFF',
    text2:   '#C7C7E0',
    text3:   '#8A8AB0',
    blue:    '#5B8CF5',
    purple:  '#9B72F2',
    green:   '#34D399',
    orange:  '#FB923C',
    red:     '#F87171',
    cyan:    '#22D3EE',
    yellow:  '#FBBF24',
    dark: true,
  } : {
    bg:      '#F5F5F7',
    card:    '#FFFFFF',
    card2:   '#F2F2F7',
    card3:   '#EAEAEF',
    border:  'rgba(0,0,0,0.08)',
    borderB: 'rgba(0,0,0,0.14)',
    text:    '#1C1C1E',
    text2:   '#4B4B55',
    text3:   '#8A8A92',
    blue:    '#007AFF',
    purple:  '#AF52DE',
    green:   '#34C759',
    orange:  '#FF9500',
    red:     '#FF3B30',
    cyan:    '#32ADE6',
    yellow:  '#FFCC00',
    dark: false,
  };
}

// ── Project helpers ───────────────────────────────────────────────────────────
const STATUS_ORDER = ['planned', 'active', 'feedback', 'review', 'waiting_for_client', 'completed'];
const STATUS_SORT_WEIGHT = { waiting_for_client: 10, waiting: 11 };

function normalizeStatus(s) {
  return s === 'waiting' ? 'waiting_for_client' : s;
}

function useStatusCfg() {
  const D = useD();
  return useMemo(() => ({
    planned:            { label: 'Geplant',          color: D.text3,  dot: D.text3 },
    active:             { label: 'Aktiv',            color: D.blue,   dot: D.blue },
    feedback:           { label: 'Feedback',         color: D.orange, dot: D.orange },
    review:             { label: 'Review',           color: D.purple, dot: D.purple },
    waiting_for_client: { label: 'Warten auf Kunde', color: D.yellow, dot: D.yellow },
    waiting:            { label: 'Warten auf Kunde', color: D.yellow, dot: D.yellow },
    completed:          { label: 'Abgeschlossen',    color: D.green,  dot: D.green },
  }), [D]);
}

const TYPES = {
  website_code: { label: 'Code',    color: '#5B8CF5' },
  website_wix:  { label: 'Wix',     color: '#9B72F2' },
  funnel:       { label: 'Funnel',  color: '#22D3EE' },
  video:        { label: 'Video',   color: '#F472B6' },
  content:      { label: 'Content', color: '#FB923C' },
  seo:          { label: 'SEO',     color: '#34D399' },
};

const HOSTING_LABELS = {
  vercel:    'Vercel',
  hostinger: 'Hostinger',
  netlify:   'Netlify',
  other:     'Sonstiges',
};

const PRIORITY_CFG = {
  high:   { color: '#F87171', label: 'Hoch' },
  medium: { color: '#FB923C', label: 'Mittel' },
  low:    { color: '#34D399', label: 'Niedrig' },
};

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

function relDeadline(iso, D) {
  if (!iso) return null;
  const diff = Math.round((new Date(iso) - Date.now()) / 86400000);
  if (diff < 0)   return { text: `${Math.abs(diff)}d überfällig`, color: D.red };
  if (diff === 0) return { text: 'Heute fällig',                   color: D.orange };
  if (diff <= 3)  return { text: `in ${diff} Tagen`,               color: D.orange };
  return {
    text: new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
    color: D.text2,
  };
}

// ── Sliding SegCtrl (Planning-Stil) ───────────────────────────────────────────
function SegCtrl({ tabs, active, onChange }) {
  const D = useD();
  const refs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const el = refs.current[active];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  }, [active]);

  return (
    <div style={{
      position: 'relative', display: 'inline-flex',
      background: D.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      border: `0.5px solid ${D.borderB}`,
      borderRadius: 14, padding: 4,
    }}>
      <div style={{
        position: 'absolute', top: 4, height: 'calc(100% - 8px)',
        left: pill.left, width: pill.width,
        background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)',
        borderRadius: 10,
        boxShadow: '0 2px 16px rgba(124,58,237,0.45), 0 0 0 0.5px rgba(255,255,255,0.1) inset',
        opacity: pill.ready ? 1 : 0,
        transition: 'left 0.38s cubic-bezier(0.22,1,0.36,1), width 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.2s',
        pointerEvents: 'none',
      }} />
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            ref={el => { refs.current[t.id] = el; }}
            onClick={() => onChange(t.id)}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = D.text; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = D.text2; }}
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: isActive ? 700 : 500, fontFamily: 'inherit',
              background: 'transparent', color: isActive ? '#fff' : D.text2,
              transition: 'color 0.28s cubic-bezier(0.22,1,0.36,1)',
              whiteSpace: 'nowrap',
            }}
          >
            {t.icon && <t.icon size={13} strokeWidth={2} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color }) {
  const D = useD();
  return (
    <div style={{
      background: `linear-gradient(145deg,${color}14 0%,${D.card} 60%)`,
      border: `0.5px solid ${color}30`,
      borderRadius: 18, padding: '18px 20px',
      boxShadow: `0 0 30px ${color}0A, 0 2px 8px rgba(0,0,0,0.25)`,
      transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s cubic-bezier(0.22,1,0.36,1)',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 40px ${color}14, 0 10px 30px rgba(0,0,0,0.35)`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 30px ${color}0A, 0 2px 8px rgba(0,0,0,0.25)`; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, marginBottom: 12,
        background: `${color}20`, border: `0.5px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color={color} />
      </div>
      <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: D.text, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{value}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, color: D.text2, fontWeight: 500 }}>{label}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: D.text3 }}>{sub}</p>}
    </div>
  );
}

// ── Status pill + dropdown ────────────────────────────────────────────────────
function StatusPill({ status, onClick }) {
  const D = useD();
  const STATUSES = useStatusCfg();
  const s = normalizeStatus(status);
  const cfg = STATUSES[s] || STATUSES.planned;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
        background: `${cfg.color}1A`, color: cfg.color, border: 'none',
        cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit',
        transition: 'filter 0.15s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.filter = 'brightness(1.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
      {onClick && <ChevronDown size={10} style={{ opacity: 0.6 }} />}
    </button>
  );
}

function StatusDropdown({ current, anchorRef, onSelect, onClose }) {
  const D = useD();
  const STATUSES = useStatusCfg();
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
    <div ref={dropRef} style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
      background: D.card2, borderRadius: 12, border: `0.5px solid ${D.borderB}`,
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)', width: 190, padding: 4, fontSize: 13,
    }}>
      {STATUS_ORDER.map(key => {
        const cfg = STATUSES[key];
        const isActive = normalizeStatus(current) === key;
        return (
          <button
            key={key}
            onClick={() => { onSelect(key); onClose(); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? `${cfg.color}18` : 'transparent',
              color: isActive ? cfg.color : D.text2, fontSize: 13, fontFamily: 'inherit',
              fontWeight: isActive ? 600 : 400, textAlign: 'left',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = D.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

function TypeBadge({ type }) {
  const D = useD();
  if (!type) return null;
  const cfg = TYPES[type];
  if (!cfg) return <span style={{ fontSize: 11, color: D.text3 }}>{type}</span>;
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, background: `${cfg.color}1A`, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Project card (grid) ───────────────────────────────────────────────────────
function ProjectCard({ project, onClick }) {
  const D = useD();
  const deadline = relDeadline(project.deadline, D);
  const accent = D.blue;
  const tasks = project.task_count || 0;
  const done = project.task_done_count || project.done_task_count || 0;
  const progress = tasks > 0 ? Math.round((done / tasks) * 100) : 0;
  const health = computeHealth(project);
  const healthColor = health === 'critical' ? D.red : health === 'warning' ? D.orange : D.green;

  return (
    <div
      onClick={onClick}
      style={{
        background: D.card, borderRadius: 16, overflow: 'hidden',
        border: `0.5px solid ${D.border}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1), box-shadow 0.32s cubic-bezier(0.22,1,0.36,1), border-color 0.32s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 14px 40px rgba(0,0,0,0.45), 0 0 0 0.5px ${accent}30`;
        e.currentTarget.style.borderColor = `${accent}40`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        e.currentTarget.style.borderColor = D.border;
      }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg,${accent},${D.purple})` }} />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span title={health} style={{ width: 7, height: 7, borderRadius: '50%', background: healthColor, flexShrink: 0, boxShadow: `0 0 8px ${healthColor}80` }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: D.text, letterSpacing: '-0.015em', lineHeight: 1.25 }}>{project.name}</p>
            </div>
            {project.client_name && (
              <p style={{ margin: '0 0 0 13px', fontSize: 12, color: D.text3 }}>{project.client_name}</p>
            )}
          </div>
          {project.type && <TypeBadge type={project.type} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill status={project.status} />
          {project.priority && PRIORITY_CFG[project.priority] && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: PRIORITY_CFG[project.priority].color }}>
              <Flag size={9} strokeWidth={2.5} />
              {PRIORITY_CFG[project.priority].label}
            </span>
          )}
        </div>

        {tasks > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: D.text3 }}>{done}/{tasks} Tasks</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{progress}%</span>
            </div>
            <div style={{ height: 3, background: D.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: `linear-gradient(90deg,${accent},${D.purple})`,
                borderRadius: 99,
                boxShadow: `0 0 6px ${accent}60`,
                transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4, gap: 8 }}>
          {deadline ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: deadline.color, fontWeight: 500 }}>
              <CalendarDays size={11} />
              {deadline.text}
            </span>
          ) : <span style={{ fontSize: 11, color: D.text3 }}>Keine Deadline</span>}
          <div onClick={e => e.stopPropagation()}>
            <ProjectTimerButton projectId={project.id} projectName={project.name} size="small" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Project row (list) ────────────────────────────────────────────────────────
function ProjectRow({ project, onClick, onUpdate, clients }) {
  const D = useD();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusAnchor = useRef(null);
  const deadline = relDeadline(project.deadline, D);
  const health = computeHealth(project);
  const healthColor = health === 'critical' ? D.red : health === 'warning' ? D.orange : D.green;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 130px 140px 110px 110px 70px',
        alignItems: 'center', gap: 12, padding: '12px 16px',
        cursor: 'pointer', borderBottom: `0.5px solid ${D.border}`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = D.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span title={health} style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, flexShrink: 0, boxShadow: `0 0 6px ${healthColor}80` }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.name}
          </div>
          {project.client_name && (
            <div style={{ fontSize: 11, color: D.text3, marginTop: 1 }}>{project.client_name}</div>
          )}
        </div>
      </div>

      <div>{project.type ? <TypeBadge type={project.type} /> : <span style={{ fontSize: 11, color: D.text3 }}>—</span>}</div>

      <div onClick={e => e.stopPropagation()} ref={statusAnchor} style={{ position: 'relative' }}>
        <StatusPill status={project.status} onClick={e => { e.stopPropagation(); setStatusOpen(o => !o); }} />
        {statusOpen && (
          <StatusDropdown
            current={project.status}
            anchorRef={statusAnchor}
            onSelect={val => onUpdate(project.id, { status: val })}
            onClose={() => setStatusOpen(false)}
          />
        )}
      </div>

      <div style={{ fontSize: 12, color: deadline?.color || D.text3 }}>
        {deadline?.text || '—'}
      </div>

      <div style={{ fontSize: 12, color: D.text2 }}>
        {project.hosting_provider ? (HOSTING_LABELS[project.hosting_provider] || project.hosting_provider) : <span style={{ color: D.text3 }}>—</span>}
      </div>

      <div onClick={e => e.stopPropagation()}>
        <ProjectTimerButton projectId={project.id} projectName={project.name} size="small" />
      </div>
    </div>
  );
}

// ── Kanban card ───────────────────────────────────────────────────────────────
function KanbanCard({ project, onDragStart, onClick }) {
  const D = useD();
  const deadline = relDeadline(project.deadline, D);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, project.id)}
      onClick={onClick}
      style={{
        background: D.card, borderRadius: 12, padding: '10px 12px',
        border: `0.5px solid ${D.border}`, cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.35)';
        e.currentTarget.style.borderColor = D.borderB;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
        e.currentTarget.style.borderColor = D.border;
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D.text, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{project.name}</p>
      {project.client_name && (
        <p style={{ margin: '3px 0 0', fontSize: 11, color: D.text3 }}>{project.client_name}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {project.type && <TypeBadge type={project.type} />}
        {deadline && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: deadline.color }}>
            <CalendarDays size={10} />
            {deadline.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateModal({ clients, onClose, onCreate, isPending }) {
  const D = useD();
  const [name, setName]         = useState('');
  const [clientId, setClientId] = useState('');
  const [type, setType]         = useState('');
  const [status, setStatus]     = useState('planned');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      client_id: clientId || null,
      type: type || null,
      status,
      deadline: deadline || null,
      project_type: 'website',
    });
  }

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
    border: `0.5px solid ${D.border}`, outline: 'none', boxSizing: 'border-box',
    background: D.dark ? 'rgba(255,255,255,0.05)' : '#FFF', color: D.text,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }} />
      <div style={{
        position: 'relative', background: D.card2, borderRadius: 20, padding: '22px 24px 20px',
        width: '100%', maxWidth: 460, border: `0.5px solid ${D.borderB}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${D.blue}20`, border: `0.5px solid ${D.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={16} color={D.blue} />
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: D.text, letterSpacing: '-0.02em' }}>Neue Website</h3>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: D.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text2, marginBottom: 5, display: 'block' }}>Name *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Müller GmbH Website" style={inp} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text2, marginBottom: 5, display: 'block' }}>Kunde</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">Kein Kunde</option>
              {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.company_name || cl.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: D.text2, marginBottom: 5, display: 'block' }}>Typ</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Kein Typ</option>
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: D.text2, marginBottom: 5, display: 'block' }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {STATUS_ORDER.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text2, marginBottom: 5, display: 'block' }}>Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inp} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px 14px', borderRadius: 10, border: `0.5px solid ${D.border}`,
              background: 'transparent', color: D.text2, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
            }}>Abbrechen</button>
            <button type="submit" disabled={!name.trim() || isPending} style={{
              flex: 2, padding: '10px 14px', borderRadius: 10, border: 'none',
              background: name.trim() ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : D.card3,
              color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              boxShadow: name.trim() ? '0 4px 16px rgba(124,58,237,0.35)' : 'none',
              opacity: isPending ? 0.7 : 1,
            }}>
              {isPending ? 'Erstellen...' : 'Website erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const VIEW_TABS = [
  { id: 'grid',   label: 'Grid',   icon: LayoutGrid },
  { id: 'list',   label: 'Liste',  icon: List },
  { id: 'kanban', label: 'Kanban', icon: Columns3 },
];

export default function Websites() {
  const D = useD();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const STATUSES = useStatusCfg();

  const [view, setView]               = useState('grid');
  const [search, setSearch]           = useState('');
  const [filterStatus, setFStatus]    = useState('');
  const [filterType, setFType]        = useState('');
  const [filterHosting, setFHosting]  = useState('');
  const [showDone, setShowDone]       = useState(false);
  const [showCreate, setShowCreate]   = useState(false);

  const dragId = useRef(null);

  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

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

  // KPIs
  const kpi = useMemo(() => {
    const active  = projects.filter(p => p.status === 'active').length;
    const waiting = projects.filter(p => normalizeStatus(p.status) === 'waiting_for_client').length;
    const overdue = projects.filter(p =>
      p.deadline && new Date(p.deadline) < new Date() && p.status !== 'completed'
    ).length;
    const done    = projects.filter(p => p.status === 'completed').length;
    return { active, waiting, overdue, done, total: projects.length };
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p => {
      if (!showDone && p.status === 'completed') return false;
      if (q && !p.name?.toLowerCase().includes(q) && !p.client_name?.toLowerCase().includes(q)) return false;
      if (filterStatus && normalizeStatus(p.status) !== filterStatus) return false;
      if (filterType && p.type !== filterType) return false;
      if (filterHosting && p.hosting_provider !== filterHosting) return false;
      return true;
    }).sort((a, b) =>
      (STATUS_SORT_WEIGHT[a.status] || 0) - (STATUS_SORT_WEIGHT[b.status] || 0)
    );
  }, [projects, search, filterStatus, filterType, filterHosting, showDone]);

  const byStatus = useMemo(() => {
    const map = {};
    STATUS_ORDER.forEach(s => { map[s] = []; });
    filtered.forEach(p => {
      const s = normalizeStatus(p.status);
      if (map[s]) map[s].push(p);
    });
    return map;
  }, [filtered]);

  const hostingOptions = useMemo(() => {
    const seen = new Set();
    projects.forEach(p => { if (p.hosting_provider) seen.add(p.hosting_provider); });
    return [...seen].sort();
  }, [projects]);

  function onDragStart(e, id) { dragId.current = id; e.dataTransfer.effectAllowed = 'move'; }
  function onDragOver(e)  { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function onDrop(e, targetStatus) {
    e.preventDefault();
    if (!dragId.current) return;
    const p = projects.find(x => x.id === dragId.current);
    if (p && normalizeStatus(p.status) !== targetStatus) {
      handleUpdate(dragId.current, { status: targetStatus });
    }
    dragId.current = null;
  }

  const inputBase = {
    height: 34, padding: '0 12px', borderRadius: 10, fontSize: 13,
    border: `0.5px solid ${D.border}`, outline: 'none',
    background: D.dark ? 'rgba(255,255,255,0.05)' : '#FFF',
    color: D.text, fontFamily: 'inherit', cursor: 'pointer',
  };

  const hasFilter = search || filterStatus || filterType || filterHosting;

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <div style={{ padding: '32px 32px 64px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <p style={{ fontSize: 11, fontWeight: 800, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>
          Business Command Center
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em',
              background: `linear-gradient(135deg, ${D.text} 30%, ${D.blue} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Websites
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: D.text2 }}>
              {kpi.total} Projekte · {kpi.active} aktiv · {kpi.overdue} überfällig
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
            transition: 'filter 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
          >
            <Plus size={15} /> Neue Website
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
          <KpiCard icon={Globe}         label="Aktiv"              value={kpi.active}  color={D.blue}   sub={`von ${kpi.total} gesamt`} />
          <KpiCard icon={Clock}         label="Warten auf Kunde"  value={kpi.waiting} color={D.yellow} sub={kpi.waiting ? 'Bitte nachfassen' : 'Alles synchron'} />
          <KpiCard icon={AlertCircle}   label="Überfällig"         value={kpi.overdue} color={D.red}    sub={kpi.overdue ? 'Deadline überschritten' : 'Alles im Plan'} />
          <KpiCard icon={CheckCircle2}  label="Abgeschlossen"      value={kpi.done}    color={D.green}  />
        </div>

        {/* View tabs + filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <SegCtrl tabs={VIEW_TABS} active={view} onChange={setView} />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowDone(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: `0.5px solid ${showDone ? D.green + '40' : D.border}`,
              background: showDone ? `${D.green}18` : 'transparent',
              color: showDone ? D.green : D.text2, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <CheckCircle2 size={13} strokeWidth={2} />
            Abgeschlossen
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
          padding: '10px 12px', borderRadius: 14,
          background: D.card, border: `0.5px solid ${D.border}`,
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} color={D.text3} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              style={{ ...inputBase, width: '100%', paddingLeft: 32, cursor: 'text' }}
            />
          </div>

          <select value={filterStatus} onChange={e => setFStatus(e.target.value)} style={inputBase}>
            <option value="">Alle Status</option>
            {STATUS_ORDER.map(k => <option key={k} value={k}>{STATUSES[k]?.label}</option>)}
          </select>

          <select value={filterType} onChange={e => setFType(e.target.value)} style={inputBase}>
            <option value="">Alle Typen</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {hostingOptions.length > 0 && (
            <select value={filterHosting} onChange={e => setFHosting(e.target.value)} style={inputBase}>
              <option value="">Alle Hoster</option>
              {hostingOptions.map(h => <option key={h} value={h}>{HOSTING_LABELS[h] || h}</option>)}
            </select>
          )}

          {hasFilter && (
            <button onClick={() => { setSearch(''); setFStatus(''); setFType(''); setFHosting(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 10px', borderRadius: 8, border: 'none',
                background: 'transparent', color: D.text3, cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.color = D.text}
              onMouseLeave={e => e.currentTarget.style.color = D.text3}
            >
              <X size={12} /> Zurücksetzen
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: D.text3 }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${D.border}`, borderTopColor: D.blue, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: D.card, borderRadius: 18,
            border: `1px dashed ${D.borderB}`,
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `${D.blue}20`, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={22} color={D.blue} />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.text, letterSpacing: '-0.01em' }}>
              {hasFilter ? 'Keine Websites gefunden' : 'Noch keine Websites'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: D.text3 }}>
              {hasFilter ? 'Filter anpassen oder zurücksetzen.' : 'Erstelle deine erste Website.'}
            </p>
            {!hasFilter && (
              <button onClick={() => setShowCreate(true)} style={{
                marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
              }}>
                <Plus size={14} /> Website erstellen
              </button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, animation: 'tabIn 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => navigate(`/websites/${p.id}`)} />
            ))}
          </div>
        ) : view === 'list' ? (
          <div style={{
            background: D.card, borderRadius: 16, overflow: 'hidden',
            border: `0.5px solid ${D.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            animation: 'tabIn 0.4s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 130px 140px 110px 110px 70px',
              gap: 12, padding: '10px 16px',
              background: D.card2, borderBottom: `0.5px solid ${D.border}`,
              fontSize: 11, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              <span>Name</span>
              <span>Typ</span>
              <span>Status</span>
              <span>Deadline</span>
              <span>Hoster</span>
              <span>Timer</span>
            </div>
            {filtered.map(p => (
              <ProjectRow key={p.id} project={p} clients={clients} onUpdate={handleUpdate} onClick={() => navigate(`/websites/${p.id}`)} />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: 8, animation: 'tabIn 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
            <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
              {STATUS_ORDER.map(status => {
                const cfg = STATUSES[status];
                const cards = byStatus[status] || [];
                return (
                  <div
                    key={status}
                    onDragOver={onDragOver}
                    onDrop={e => onDrop(e, status)}
                    style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 4px' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 8px ${cfg.color}80` }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: D.text2, letterSpacing: '-0.005em' }}>{cfg.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: `${cfg.color}1A`, color: cfg.color }}>
                        {cards.length}
                      </span>
                    </div>
                    <div style={{
                      flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
                      background: D.card, borderRadius: 14, border: `0.5px solid ${D.border}`,
                      minHeight: 160,
                    }}>
                      {cards.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
                          <span style={{ fontSize: 11, color: D.text3 }}>Keine Websites</span>
                        </div>
                      ) : cards.map(p => (
                        <KanbanCard key={p.id} project={p} onDragStart={onDragStart} onClick={() => navigate(`/websites/${p.id}`)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          clients={clients}
          onClose={() => setShowCreate(false)}
          onCreate={data => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}

      <style>{`
        @keyframes tabIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
