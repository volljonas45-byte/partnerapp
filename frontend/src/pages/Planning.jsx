import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { planningApi } from '../api/planning';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Plus, X, ChevronDown, Check, Target, Zap, AlertTriangle, TrendingUp,
  MessageSquare, CheckSquare, Lightbulb, ArrowRight, Trash2, Edit3,
  Calendar, User, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: 'Übersicht'     },
  { id: 'feedback',    label: 'Feedback'      },
  { id: 'kpis',        label: 'KPIs'          },
  { id: 'tasks',       label: 'Aufgaben'      },
  { id: 'decisions',   label: 'Entscheidungen'},
];

const AREAS = ['Vertrieb', 'Finanzen', 'Projekte', 'Team', 'Marketing', 'Operations', 'Allgemein'];

const AREA_COLORS = {
  Vertrieb:   '#007AFF',
  Finanzen:   '#34C759',
  Projekte:   '#AF52DE',
  Team:       '#FF9500',
  Marketing:  '#FF2D55',
  Operations: '#5AC8FA',
  Allgemein:  '#8E8E93',
};

const RATINGS = [
  { value: 1, emoji: '😞', label: 'Schwierig',  color: '#FF3B30' },
  { value: 2, emoji: '😐', label: 'Okay',        color: '#FF9500' },
  { value: 3, emoji: '😊', label: 'Gut',         color: '#FFCC00' },
  { value: 4, emoji: '🙂', label: 'Super',       color: '#34C759' },
  { value: 5, emoji: '🚀', label: 'Ausgezeichnet',color: '#007AFF' },
];

const PRIORITY_COLORS = {
  low:      '#8E8E93',
  medium:   '#007AFF',
  high:     '#FF9500',
  critical: '#FF3B30',
};

const PRIORITY_LABELS = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' };

const TASK_COLS = [
  { id: 'open',        label: 'Offen',      color: '#8E8E93' },
  { id: 'in_progress', label: 'In Arbeit',  color: '#007AFF' },
  { id: 'blocked',     label: 'Blockiert',  color: '#FF3B30' },
  { id: 'done',        label: 'Erledigt',   color: '#34C759' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart) {
  if (!weekStart) return '';
  const d = new Date(weekStart);
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  return `${fmt(d)} – ${fmt(end)}`;
}

function avatarInitials(name = '', email = '') {
  const src = name || email || '?';
  return src.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarBg(email = '') {
  const colors = ['#BF5AF2', '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5AC8FA'];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ── ProgressRing ──────────────────────────────────────────────────────────────

function ProgressRing({ pct = 0, color = '#007AFF', size = 64 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-input-bg)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1)' }}
      />
    </svg>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, email, color, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color || avatarBg(email || ''),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: '#fff', flexShrink: 0,
    }}>
      {avatarInitials(name, email)}
    </div>
  );
}

// ── AreaDot ───────────────────────────────────────────────────────────────────

function AreaDot({ area, style }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: AREA_COLORS[area] || AREA_COLORS.Allgemein, flexShrink: 0,
      ...style,
    }} />
  );
}

// ── Modal (shared) ────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: width,
          background: 'var(--color-card)',
          borderRadius: 20,
          border: '0.5px solid var(--color-border-subtle)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          animation: 'slideUp 0.22s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '0.5px solid var(--color-border-subtle)',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '16px 20px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && <label className="label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK TAB
// ─────────────────────────────────────────────────────────────────────────────

function FeedbackTab({ teamMembers, currentUser }) {
  const qc = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  const { data: weeks = [] } = useQuery({
    queryKey: ['planning-feedback-weeks'],
    queryFn: planningApi.listWeeks,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['planning-feedback', selectedWeek],
    queryFn: () => planningApi.listFeedback({ week: selectedWeek }),
  });

  const save = useMutation({
    mutationFn: planningApi.upsertFeedback,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-feedback'] });
      qc.invalidateQueries({ queryKey: ['planning-feedback-weeks'] });
      setSheetOpen(false);
      setEditEntry(null);
      toast.success('Feedback gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const isCurrentWeek = selectedWeek === getWeekStart();
  const allWeeks = isCurrentWeek
    ? [selectedWeek, ...weeks.filter(w => w !== selectedWeek)]
    : [getWeekStart(), ...weeks.filter(w => w !== getWeekStart())];
  const uniqueWeeks = [...new Set(allWeeks)].slice(0, 12);

  const myEntry = entries.find(e => String(e.author_id) === String(currentUser?.id));

  function openSheet(entry = null) {
    setEditEntry(entry);
    setSheetOpen(true);
  }

  const prevWeek = () => {
    const d = new Date(selectedWeek);
    d.setDate(d.getDate() - 7);
    setSelectedWeek(d.toISOString().slice(0, 10));
  };
  const nextWeek = () => {
    const d = new Date(selectedWeek);
    d.setDate(d.getDate() + 7);
    const next = d.toISOString().slice(0, 10);
    if (next <= getWeekStart()) setSelectedWeek(next);
  };

  const allMembers = teamMembers || [];
  const membersWithoutEntry = allMembers.filter(
    m => !entries.find(e => String(e.author_id) === String(m.id))
  );

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'var(--color-input-bg)', borderRadius: 10, padding: 3,
        }}>
          <button
            onClick={prevWeek}
            style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.01em', padding: '0 8px', whiteSpace: 'nowrap' }}>
            {isCurrentWeek ? 'Diese Woche' : formatWeekLabel(selectedWeek)}
          </span>
          <button
            onClick={nextWeek}
            disabled={isCurrentWeek}
            style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 7, cursor: isCurrentWeek ? 'not-allowed' : 'pointer', color: isCurrentWeek ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrentWeek ? 0.4 : 1 }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {uniqueWeeks.slice(0, 5).map(w => (
            <button
              key={w}
              onClick={() => setSelectedWeek(w)}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', letterSpacing: '-0.008em',
                background: w === selectedWeek ? 'var(--color-blue)' : 'var(--color-input-bg)',
                color: w === selectedWeek ? '#fff' : 'var(--color-text-secondary)',
                fontWeight: w === selectedWeek ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {w === getWeekStart() ? 'Aktuell' : formatWeekLabel(w)}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {isCurrentWeek && (
          <button
            onClick={() => openSheet(myEntry || null)}
            className="btn-primary"
            style={{ gap: 6, fontSize: 13 }}
          >
            <Plus size={14} />
            {myEntry ? 'Mein Feedback bearbeiten' : 'Mein Feedback eintragen'}
          </button>
        )}
      </div>

      {/* Team feedback cards grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {entries.map(entry => (
            <FeedbackCard
              key={entry.id}
              entry={entry}
              isMine={String(entry.author_id) === String(currentUser?.id)}
              canEdit={isCurrentWeek}
              onEdit={() => openSheet(entry)}
            />
          ))}
          {/* Empty state cards for members without entry */}
          {isCurrentWeek && membersWithoutEntry.map(m => (
            <FeedbackEmptyCard key={m.id} member={m} onFill={() => openSheet(null)} isMine={String(m.id) === String(currentUser?.id)} />
          ))}
        </div>
      )}

      {entries.length === 0 && !isLoading && !isCurrentWeek && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-tertiary)' }}>
          <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Kein Feedback für diese Woche</p>
        </div>
      )}

      {/* Feedback Sheet */}
      <FeedbackSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditEntry(null); }}
        onSave={(data) => save.mutate({ ...data, week_start: selectedWeek })}
        initial={editEntry}
        loading={save.isPending}
        weekLabel={isCurrentWeek ? 'Diese Woche' : formatWeekLabel(selectedWeek)}
      />
    </div>
  );
}

function FeedbackCard({ entry, isMine, canEdit, onEdit }) {
  const rating = RATINGS.find(r => r.value === entry.rating);
  return (
    <div style={{
      background: 'var(--color-card)', borderRadius: 16,
      border: '0.5px solid var(--color-border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.02)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Card header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '0.5px solid var(--color-border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar name={entry.author_name} email={entry.author_email} color={entry.author_color} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            {entry.author_name || entry.author_email}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <AreaDot area={entry.area} />
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{entry.area}</span>
          </div>
        </div>
        {rating && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: `${rating.color}15`, borderRadius: 8, padding: '3px 8px',
          }}>
            <span style={{ fontSize: 16 }}>{rating.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: rating.color }}>{rating.label}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entry.wins && (
          <FeedbackSection icon="✅" label="Wins" text={entry.wins} color="#34C759" />
        )}
        {entry.blockers && (
          <FeedbackSection icon="🚧" label="Blocker" text={entry.blockers} color="#FF9500" />
        )}
        {entry.next_steps && (
          <FeedbackSection icon="→" label="Nächste Schritte" text={entry.next_steps} color="#007AFF" />
        )}
        {entry.improvement_goal && (
          <FeedbackSection icon="⭐" label="Verbesserungsziel" text={entry.improvement_goal} color="#AF52DE" />
        )}
        {!entry.wins && !entry.blockers && !entry.next_steps && !entry.improvement_goal && (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0, fontStyle: 'italic' }}>
            Keine Details eingetragen
          </p>
        )}
      </div>

      {isMine && canEdit && (
        <div style={{ padding: '0 16px 14px' }}>
          <button
            onClick={onEdit}
            style={{
              width: '100%', padding: '7px 12px', fontSize: 12, borderRadius: 8,
              border: '0.5px solid var(--color-border)', background: 'none',
              color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: '-0.008em', transition: 'background 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-input-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Edit3 size={11} /> Bearbeiten
          </button>
        </div>
      )}
    </div>
  );
}

function FeedbackSection({ icon, label, text, color }) {
  return (
    <div>
      <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon} {label}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function FeedbackEmptyCard({ member, onFill, isMine }) {
  return (
    <div style={{
      background: 'var(--color-card-secondary)', borderRadius: 16,
      border: '1px dashed var(--color-border)', padding: '20px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      opacity: 0.7,
    }}>
      <Avatar name={member.name} email={member.email} color={member.color} size={32} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{member.name || member.email}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>Noch kein Feedback</p>
      </div>
      {isMine && (
        <button
          onClick={onFill}
          style={{
            padding: '6px 16px', fontSize: 12, borderRadius: 8, border: 'none',
            background: 'var(--color-blue-light)', color: 'var(--color-blue)',
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.008em', fontWeight: 500,
          }}
        >
          Jetzt eintragen
        </button>
      )}
    </div>
  );
}

// ── FeedbackSheet ─────────────────────────────────────────────────────────────

function FeedbackSheet({ open, onClose, onSave, initial, loading, weekLabel }) {
  const [area, setArea] = useState('Allgemein');
  const [rating, setRating] = useState(null);
  const [wins, setWins] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [goal, setGoal] = useState('');

  useEffect(() => {
    if (open) {
      setArea(initial?.area || 'Allgemein');
      setRating(initial?.rating || null);
      setWins(initial?.wins || '');
      setBlockers(initial?.blockers || '');
      setNextSteps(initial?.next_steps || '');
      setGoal(initial?.improvement_goal || '');
    }
  }, [open, initial]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) { toast.error('Bitte wähle eine Bewertung'); return; }
    onSave({ area, rating, wins, blockers, next_steps: nextSteps, improvement_goal: goal });
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 990,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'var(--color-card)',
        borderRadius: '22px 22px 0 0',
        border: '0.5px solid var(--color-border-subtle)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.16)',
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'sheetUp 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--color-border)' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '12px 20px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
                Wöchentliches Feedback
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)' }}>{weekLabel}</p>
            </div>
            <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--color-input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
              <X size={15} />
            </button>
          </div>

          <div style={{ padding: '10px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Bereich */}
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 8 }}>Mein Fokus-Bereich</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AREAS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setArea(a)}
                    style={{
                      padding: '5px 12px', fontSize: 13, borderRadius: 99, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', letterSpacing: '-0.008em',
                      background: area === a ? (AREA_COLORS[a] || '#8E8E93') : 'var(--color-input-bg)',
                      color: area === a ? '#fff' : 'var(--color-text-secondary)',
                      fontWeight: area === a ? 600 : 400,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 8 }}>Wie lief die Woche?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRating(r.value)}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: rating === r.value ? `${r.color}18` : 'var(--color-input-bg)',
                      boxShadow: rating === r.value ? `0 0 0 1.5px ${r.color}` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{r.emoji}</span>
                    <span style={{ fontSize: 10, color: rating === r.value ? r.color : 'var(--color-text-tertiary)', fontWeight: rating === r.value ? 600 : 400 }}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Wins */}
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>
                ✅ Was lief gut diese Woche?
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Erfolge, Fortschritte, positive Momente..."
                value={wins}
                onChange={e => setWins(e.target.value)}
              />
            </div>

            {/* Blockers */}
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>
                🚧 Was hat mich gebremst?
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Hindernisse, Probleme, fehlende Ressourcen..."
                value={blockers}
                onChange={e => setBlockers(e.target.value)}
              />
            </div>

            {/* Next steps */}
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>
                → Nächste Schritte
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Was nehme ich mir für nächste Woche vor?"
                value={nextSteps}
                onChange={e => setNextSteps(e.target.value)}
              />
            </div>

            {/* Improvement goal */}
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>
                ⭐ Mein persönliches Verbesserungsziel
              </label>
              <textarea
                className="input"
                rows={2}
                placeholder="In welchem Bereich möchte ich mich verbessern?"
                value={goal}
                onChange={e => setGoal(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '12px 20px' }}
            >
              {loading ? 'Speichern...' : 'Feedback speichern'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPIs TAB
// ─────────────────────────────────────────────────────────────────────────────

function KpisTab({ teamMembers }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editKpi, setEditKpi] = useState(null);

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['planning-kpis'],
    queryFn: planningApi.listKpis,
  });

  const saveKpi = useMutation({
    mutationFn: (data) => data.id ? planningApi.updateKpi(data.id, data) : planningApi.createKpi(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-kpis'] }); setModalOpen(false); setEditKpi(null); toast.success('KPI gespeichert'); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const deleteKpi = useMutation({
    mutationFn: planningApi.deleteKpi,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-kpis'] }); toast.success('KPI gelöscht'); },
  });

  const grouped = AREAS.reduce((acc, a) => {
    acc[a] = kpis.filter(k => k.area === a);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => { setEditKpi(null); setModalOpen(true); }} className="btn-primary" style={{ fontSize: 13 }}>
          <Plus size={14} /> KPI hinzufügen
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : kpis.length === 0 ? (
        <EmptyState icon={<Target size={32} />} title="Noch keine KPIs" text="Erstelle dein erstes KPI um Fortschritte zu messen." />
      ) : (
        Object.entries(grouped).map(([area, items]) => items.length > 0 && (
          <div key={area} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AreaDot area={area} />
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {area}
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {items.map(kpi => (
                <KpiCard
                  key={kpi.id}
                  kpi={kpi}
                  onEdit={() => { setEditKpi(kpi); setModalOpen(true); }}
                  onDelete={() => { if (confirm('KPI löschen?')) deleteKpi.mutate(kpi.id); }}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <KpiModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditKpi(null); }}
        onSave={saveKpi.mutate}
        initial={editKpi}
        loading={saveKpi.isPending}
        teamMembers={teamMembers || []}
      />
    </div>
  );
}

function KpiCard({ kpi, onEdit, onDelete }) {
  const pct = kpi.target_value > 0 ? Math.round((kpi.current_value / kpi.target_value) * 100) : 0;
  const color = AREA_COLORS[kpi.area] || '#007AFF';
  const isGood = pct >= 80;

  return (
    <div style={{
      background: 'var(--color-card)', borderRadius: 16,
      border: '0.5px solid var(--color-border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding: '16px', position: 'relative', overflow: 'hidden',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            {kpi.title}
          </p>
          {kpi.description && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>{kpi.description}</p>
          )}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text)' }}>
                {Number(kpi.current_value).toLocaleString('de-DE')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{kpi.unit}</span>
            </div>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              Ziel: {Number(kpi.target_value).toLocaleString('de-DE')} {kpi.unit}
            </p>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 10, height: 4, background: 'var(--color-input-bg)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: isGood ? '#34C759' : color,
              width: `${Math.min(pct, 100)}%`,
              transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
            }} />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: isGood ? '#34C759' : 'var(--color-text-tertiary)', fontWeight: 600 }}>
            {pct}%
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <ProgressRing pct={pct} color={isGood ? '#34C759' : color} size={56} />
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onEdit} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--color-input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
              <Edit3 size={11} />
            </button>
            <button onClick={onDelete} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--color-input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
      {kpi.owner_name && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Avatar name={kpi.owner_name} email="" color={kpi.owner_color} size={16} />
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{kpi.owner_name}</span>
        </div>
      )}
    </div>
  );
}

function KpiModal({ open, onClose, onSave, initial, loading, teamMembers }) {
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : { area: 'Vertrieb', unit: '%', frequency: 'monthly', color: 'blue', target_value: 100, current_value: 0 });
  }, [open, initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.title?.trim()) { toast.error('Titel erforderlich'); return; }
    onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'KPI bearbeiten' : 'Neues KPI'}>
      <form onSubmit={submit}>
        <Field label="Titel"><input className="input" value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="z.B. Conversion Rate" required /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Bereich">
            <select className="input" value={form.area || 'Allgemein'} onChange={e => set('area', e.target.value)}>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Einheit">
            <select className="input" value={form.unit || '%'} onChange={e => set('unit', e.target.value)}>
              {['%', '€', 'Stk.', 'h', 'Tage', 'Punkte', 'Leads'].map(u => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Zielwert"><input className="input" type="number" value={form.target_value ?? 100} onChange={e => set('target_value', parseFloat(e.target.value))} /></Field>
          <Field label="Ist-Wert"><input className="input" type="number" value={form.current_value ?? 0} onChange={e => set('current_value', parseFloat(e.target.value))} /></Field>
        </div>
        <Field label="Turnus">
          <select className="input" value={form.frequency || 'monthly'} onChange={e => set('frequency', e.target.value)}>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
            <option value="quarterly">Quartalsweise</option>
            <option value="yearly">Jährlich</option>
          </select>
        </Field>
        {teamMembers.length > 0 && (
          <Field label="Verantwortlich">
            <select className="input" value={form.owner_id || ''} onChange={e => set('owner_id', e.target.value || null)}>
              <option value="">Kein Verantwortlicher</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
            </select>
          </Field>
        )}
        <Field label="Beschreibung (optional)">
          <textarea className="input" rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Kurze Beschreibung..." />
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
            {loading ? 'Speichern...' : (initial ? 'Aktualisieren' : 'KPI erstellen')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS TAB
// ─────────────────────────────────────────────────────────────────────────────

function TasksTab({ teamMembers }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState('open');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['planning-tasks'],
    queryFn: () => planningApi.listTasks(),
  });

  const saveTask = useMutation({
    mutationFn: (data) => data.id ? planningApi.updateTask(data.id, data) : planningApi.createTask(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-tasks'] }); setModalOpen(false); setEditTask(null); toast.success('Aufgabe gespeichert'); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const moveTask = useMutation({
    mutationFn: ({ id, status, ...rest }) => planningApi.updateTask(id, { ...rest, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-tasks'] }),
  });

  const deleteTask = useMutation({
    mutationFn: planningApi.deleteTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-tasks'] }); toast.success('Aufgabe gelöscht'); },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => { setEditTask(null); setDefaultStatus('open'); setModalOpen(true); }} className="btn-primary" style={{ fontSize: 13 }}>
          <Plus size={14} /> Aufgabe hinzufügen
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'start' }}>
          {TASK_COLS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {col.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>{colTasks.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      colColor={col.color}
                      onEdit={() => { setEditTask(task); setModalOpen(true); }}
                      onMove={(newStatus) => moveTask.mutate({ ...task, status: newStatus })}
                      onDelete={() => { if (confirm('Aufgabe löschen?')) deleteTask.mutate(task.id); }}
                    />
                  ))}
                  <button
                    onClick={() => { setEditTask(null); setDefaultStatus(col.id); setModalOpen(true); }}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 10, border: '1px dashed var(--color-border)',
                      background: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer',
                      fontSize: 12, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      transition: 'border-color 0.15s ease, color 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text-tertiary)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                  >
                    <Plus size={12} /> Hinzufügen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTask(null); }}
        onSave={saveTask.mutate}
        initial={editTask}
        defaultStatus={defaultStatus}
        loading={saveTask.isPending}
        teamMembers={teamMembers || []}
      />
    </div>
  );
}

function TaskCard({ task, colColor, onEdit, onMove, onDelete }) {
  const nextStatuses = TASK_COLS.filter(c => c.id !== task.status).map(c => c.id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';

  return (
    <div style={{
      background: 'var(--color-card)', borderRadius: 12,
      border: '0.5px solid var(--color-border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding: '12px 12px 10px', cursor: 'default',
      transition: 'box-shadow 0.2s ease',
      borderLeft: `2.5px solid ${PRIORITY_COLORS[task.priority]}`,
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
            {task.title}
          </p>
          {task.description && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>{task.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'var(--color-input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
            <Edit3 size={10} />
          </button>
          <button onClick={onDelete} style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'var(--color-input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5,
          background: `${PRIORITY_COLORS[task.priority]}15`, color: PRIORITY_COLORS[task.priority],
          letterSpacing: '0.02em',
        }}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.area && task.area !== 'Allgemein' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <AreaDot area={task.area} />
            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{task.area}</span>
          </span>
        )}
        {dueDate && (
          <span style={{
            fontSize: 10, color: isOverdue ? '#FF3B30' : 'var(--color-text-tertiary)',
            display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto',
          }}>
            <Calendar size={9} />
            {dueDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
          </span>
        )}
        {task.owner_name && (
          <Avatar name={task.owner_name} email="" color={task.owner_color} size={16} />
        )}
      </div>

      {/* Quick status actions */}
      <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
        {TASK_COLS.filter(c => c.id !== task.status).slice(0, 2).map(c => (
          <button
            key={c.id}
            onClick={() => onMove(c.id)}
            style={{
              fontSize: 10, padding: '3px 7px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: `${c.color}12`, color: c.color, fontFamily: 'inherit', fontWeight: 500,
              transition: 'background 0.15s ease',
            }}
          >
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskModal({ open, onClose, onSave, initial, defaultStatus, loading, teamMembers }) {
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : { status: defaultStatus || 'open', priority: 'medium', area: 'Allgemein', type: 'task' });
  }, [open, initial, defaultStatus]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.title?.trim()) { toast.error('Titel erforderlich'); return; }
    onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}>
      <form onSubmit={submit}>
        <Field label="Titel"><input className="input" value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="Was muss getan werden?" required /></Field>
        <Field label="Beschreibung">
          <textarea className="input" rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Details..." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Status">
            <select className="input" value={form.status || 'open'} onChange={e => set('status', e.target.value)}>
              {TASK_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Priorität">
            <select className="input" value={form.priority || 'medium'} onChange={e => set('priority', e.target.value)}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Typ">
            <select className="input" value={form.type || 'task'} onChange={e => set('type', e.target.value)}>
              <option value="task">Aufgabe</option>
              <option value="problem">Problem</option>
              <option value="goal">Ziel</option>
            </select>
          </Field>
          <Field label="Bereich">
            <select className="input" value={form.area || 'Allgemein'} onChange={e => set('area', e.target.value)}>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {teamMembers.length > 0 && (
            <Field label="Verantwortlich">
              <select className="input" value={form.owner_id || ''} onChange={e => set('owner_id', e.target.value || null)}>
                <option value="">Niemand</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
              </select>
            </Field>
          )}
          <Field label="Fälligkeitsdatum">
            <input className="input" type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value || null)} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
            {loading ? 'Speichern...' : (initial ? 'Aktualisieren' : 'Aufgabe erstellen')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

function DecisionsTab({ teamMembers }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editDec, setEditDec] = useState(null);

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['planning-decisions'],
    queryFn: planningApi.listDecisions,
  });

  const saveDec = useMutation({
    mutationFn: (data) => data.id ? planningApi.updateDecision(data.id, data) : planningApi.createDecision(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-decisions'] }); setModalOpen(false); setEditDec(null); toast.success('Entscheidung gespeichert'); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const deleteDec = useMutation({
    mutationFn: planningApi.deleteDecision,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-decisions'] }); toast.success('Entscheidung gelöscht'); },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => { setEditDec(null); setModalOpen(true); }} className="btn-primary" style={{ fontSize: 13 }}>
          <Plus size={14} /> Entscheidung festhalten
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
        </div>
      ) : decisions.length === 0 ? (
        <EmptyState icon={<Lightbulb size={32} />} title="Noch keine Entscheidungen" text="Halte wichtige Business-Entscheidungen fest." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {decisions.map(dec => (
            <DecisionCard
              key={dec.id}
              dec={dec}
              onEdit={() => { setEditDec(dec); setModalOpen(true); }}
              onDelete={() => { if (confirm('Entscheidung löschen?')) deleteDec.mutate(dec.id); }}
            />
          ))}
        </div>
      )}

      <DecisionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditDec(null); }}
        onSave={saveDec.mutate}
        initial={editDec}
        loading={saveDec.isPending}
        teamMembers={teamMembers || []}
      />
    </div>
  );
}

function DecisionCard({ dec, onEdit, onDelete }) {
  const areaColor = AREA_COLORS[dec.area] || AREA_COLORS.Allgemein;
  const isActive = dec.status === 'active';
  const date = dec.decided_at ? new Date(dec.decided_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div style={{
      background: 'var(--color-card)', borderRadius: 14,
      border: '0.5px solid var(--color-border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding: '14px 16px',
      borderLeft: `3px solid ${areaColor}`,
      opacity: isActive ? 1 : 0.6,
      transition: 'box-shadow 0.2s ease',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.07)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.015em' }}>
            {dec.title}
          </p>
          {!isActive && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: 'var(--color-input-bg)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {dec.status === 'completed' ? 'Umgesetzt' : 'Verworfen'}
            </span>
          )}
        </div>
        {dec.description && (
          <p style={{ margin: '2px 0 6px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{dec.description}</p>
        )}
        {dec.impact && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            <strong style={{ color: 'var(--color-text-secondary)' }}>Auswirkung:</strong> {dec.impact}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AreaDot area={dec.area} />
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{dec.area}</span>
          </span>
          {date && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{date}</span>}
          {dec.owner_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Avatar name={dec.owner_name} email="" color={dec.owner_color} size={16} />
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{dec.owner_name}</span>
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--color-input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
          <Edit3 size={12} />
        </button>
        <button onClick={onDelete} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--color-input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function DecisionModal({ open, onClose, onSave, initial, loading, teamMembers }) {
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : { area: 'Allgemein', status: 'active', decided_at: new Date().toISOString().slice(0, 10) });
  }, [open, initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.title?.trim()) { toast.error('Titel erforderlich'); return; }
    onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Entscheidung bearbeiten' : 'Entscheidung festhalten'}>
      <form onSubmit={submit}>
        <Field label="Entscheidung"><input className="input" value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="Was wurde entschieden?" required /></Field>
        <Field label="Beschreibung / Begründung">
          <textarea className="input" rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Warum wurde diese Entscheidung getroffen?" />
        </Field>
        <Field label="Auswirkung">
          <textarea className="input" rows={2} value={form.impact || ''} onChange={e => set('impact', e.target.value)} placeholder="Welche Auswirkung hat diese Entscheidung?" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Bereich">
            <select className="input" value={form.area || 'Allgemein'} onChange={e => set('area', e.target.value)}>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status || 'active'} onChange={e => set('status', e.target.value)}>
              <option value="active">Aktiv</option>
              <option value="completed">Umgesetzt</option>
              <option value="cancelled">Verworfen</option>
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {teamMembers.length > 0 && (
            <Field label="Entschieden von">
              <select className="input" value={form.owner_id || ''} onChange={e => set('owner_id', e.target.value || null)}>
                <option value="">Niemand</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
              </select>
            </Field>
          )}
          <Field label="Datum">
            <input className="input" type="date" value={form.decided_at?.slice(0, 10) || ''} onChange={e => set('decided_at', e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
            {loading ? 'Speichern...' : (initial ? 'Aktualisieren' : 'Festhalten')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ onTabChange }) {
  const { data: kpis = [] } = useQuery({ queryKey: ['planning-kpis'], queryFn: planningApi.listKpis });
  const { data: tasks = [] } = useQuery({ queryKey: ['planning-tasks'], queryFn: () => planningApi.listTasks() });
  const { data: feedback = [] } = useQuery({ queryKey: ['planning-feedback', getWeekStart()], queryFn: () => planningApi.listFeedback({ week: getWeekStart() }) });
  const { data: decisions = [] } = useQuery({ queryKey: ['planning-decisions'], queryFn: planningApi.listDecisions });

  const openTasks = tasks.filter(t => t.status === 'open').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
  const avgRating = feedback.length ? (feedback.reduce((s, e) => s + (e.rating || 0), 0) / feedback.length).toFixed(1) : null;
  const avgRatingNum = avgRating ? parseFloat(avgRating) : 0;
  const topKpis = [...kpis].sort((a, b) => (b.current_value / (b.target_value || 1)) - (a.current_value / (a.target_value || 1))).slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard
          label="Offene Aufgaben"
          value={openTasks}
          sub={blockedTasks > 0 ? `${blockedTasks} blockiert` : 'Keine Blockaden'}
          color="#007AFF"
          icon={<CheckSquare size={18} />}
          onClick={() => onTabChange('tasks')}
        />
        <StatCard
          label="Aktive KPIs"
          value={kpis.length}
          sub={`Ø ${kpis.length ? Math.round(kpis.reduce((s, k) => s + (k.current_value / (k.target_value || 1) * 100), 0) / kpis.length) : 0}% Erreichung`}
          color="#34C759"
          icon={<Target size={18} />}
          onClick={() => onTabChange('kpis')}
        />
        <StatCard
          label="Team-Rating KW"
          value={avgRating ? `${avgRating}/5` : '–'}
          sub={feedback.length ? `${feedback.length} Einträge diese Woche` : 'Noch kein Feedback'}
          color={avgRatingNum >= 4 ? '#34C759' : avgRatingNum >= 3 ? '#FF9500' : '#FF3B30'}
          icon={<MessageSquare size={18} />}
          onClick={() => onTabChange('feedback')}
        />
        <StatCard
          label="Entscheidungen"
          value={decisions.filter(d => d.status === 'active').length}
          sub={`${decisions.length} gesamt`}
          color="#AF52DE"
          icon={<Lightbulb size={18} />}
          onClick={() => onTabChange('decisions')}
        />
      </div>

      {/* KPI mini-overview */}
      {topKpis.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            KPI-Übersicht
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {topKpis.map(kpi => {
              const pct = kpi.target_value > 0 ? Math.round((kpi.current_value / kpi.target_value) * 100) : 0;
              const color = AREA_COLORS[kpi.area] || '#007AFF';
              return (
                <div key={kpi.id} style={{ background: 'var(--color-card)', borderRadius: 12, border: '0.5px solid var(--color-border-subtle)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>{kpi.title}</p>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 80 ? '#34C759' : color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--color-input-bg)', borderRadius: 99 }}>
                    <div style={{ height: '100%', borderRadius: 99, background: pct >= 80 ? '#34C759' : color, width: `${Math.min(pct, 100)}%`, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent decisions */}
      {decisions.slice(0, 3).length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Letzte Entscheidungen
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {decisions.slice(0, 3).map(dec => (
              <div key={dec.id} style={{
                background: 'var(--color-card)', borderRadius: 10, padding: '10px 14px',
                border: '0.5px solid var(--color-border-subtle)',
                borderLeft: `2.5px solid ${AREA_COLORS[dec.area] || '#8E8E93'}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{dec.title}</p>
                  {dec.description && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{dec.description.slice(0, 80)}{dec.description.length > 80 ? '...' : ''}</p>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                  {dec.decided_at ? new Date(dec.decided_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {kpis.length === 0 && tasks.length === 0 && decisions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-tertiary)' }}>
          <Target size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 8px' }}>Noch nichts eingetragen</p>
          <p style={{ fontSize: 14, margin: 0 }}>Fange mit Feedback, KPIs oder Aufgaben an.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-card)', borderRadius: 14, padding: '16px',
        border: '0.5px solid var(--color-border-subtle)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
      <p style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>{label}</p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ icon, title, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-tertiary)' }}>
      <div style={{ opacity: 0.25, marginBottom: 14, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: 13, margin: 0, color: 'var(--color-text-tertiary)' }}>{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Planning() {
  const { user } = useAuth();
  const { c } = useTheme();
  const [activeTab, setActiveTab] = useState('feedback');

  const { data: teamData } = useQuery({
    queryKey: ['team-list'],
    queryFn: () => api.get('/api/team').then(r => r.data),
  });
  const teamMembers = teamData || [];

  return (
    <div style={{ padding: '0 24px 48px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ padding: '32px 0 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: c.text }}>
            Planung
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 14, color: c.textSecondary, letterSpacing: '-0.008em' }}>
            Strategie · KPIs · Feedback · Entscheidungen
          </p>
        </div>
      </div>

      {/* Segmented control */}
      <div style={{ marginBottom: 24 }}>
        <div className="seg-ctrl">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`seg-btn${activeTab === t.id ? ' seg-btn--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'feedback'   && <FeedbackTab teamMembers={teamMembers} currentUser={user} />}
      {activeTab === 'kpis'       && <KpisTab teamMembers={teamMembers} />}
      {activeTab === 'tasks'      && <TasksTab teamMembers={teamMembers} />}
      {activeTab === 'decisions'  && <DecisionsTab teamMembers={teamMembers} />}
      {activeTab === 'overview'   && <OverviewTab onTabChange={setActiveTab} />}
    </div>
  );
}
