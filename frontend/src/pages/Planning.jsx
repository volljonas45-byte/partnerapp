import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { planningApi } from '../api/planning';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  Plus, X, Target, MessageSquare, CheckSquare, Lightbulb,
  Trash2, Edit3, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ── Dark Design Tokens ────────────────────────────────────────────────────────

const D = {
  bg:      '#06060F',
  card:    '#0D0D1E',
  card2:   '#121228',
  card3:   '#181838',
  border:  'rgba(255,255,255,0.07)',
  borderB: 'rgba(255,255,255,0.14)',
  text:    '#EEEEFF',
  text2:   '#9090B8',
  text3:   '#55557A',
  blue:    '#5B8CF5',
  purple:  '#9B72F2',
  green:   '#34D399',
  orange:  '#FB923C',
  red:     '#F87171',
  pink:    '#F472B6',
  cyan:    '#22D3EE',
  yellow:  '#FBBF24',
};

const AREA_THEME = {
  Vertrieb:   { accent: '#5B8CF5', glow: 'rgba(91,140,245,0.14)',   bg: 'linear-gradient(145deg,#0B1028 0%,#0D1840 100%)' },
  Finanzen:   { accent: '#34D399', glow: 'rgba(52,211,153,0.14)',   bg: 'linear-gradient(145deg,#060F0B 0%,#0A2018 100%)' },
  Projekte:   { accent: '#9B72F2', glow: 'rgba(155,114,242,0.14)',  bg: 'linear-gradient(145deg,#0A0720 0%,#14103C 100%)' },
  Team:       { accent: '#FB923C', glow: 'rgba(251,146,60,0.14)',   bg: 'linear-gradient(145deg,#150900 0%,#2C1400 100%)' },
  Marketing:  { accent: '#F472B6', glow: 'rgba(244,114,182,0.14)',  bg: 'linear-gradient(145deg,#160009 0%,#2C0118 100%)' },
  Operations: { accent: '#22D3EE', glow: 'rgba(34,211,238,0.14)',   bg: 'linear-gradient(145deg,#050D14 0%,#0A1E2E 100%)' },
  Allgemein:  { accent: '#9090B8', glow: 'rgba(144,144,184,0.10)',  bg: 'linear-gradient(145deg,#0A0A16 0%,#12122A 100%)' },
};

const TABS = [
  { id: 'overview',   label: 'Übersicht'      },
  { id: 'feedback',   label: 'Feedback'       },
  { id: 'kpis',       label: 'KPIs'           },
  { id: 'tasks',      label: 'Aufgaben'       },
  { id: 'decisions',  label: 'Entscheidungen' },
];

const AREAS = ['Vertrieb', 'Finanzen', 'Projekte', 'Team', 'Marketing', 'Operations', 'Allgemein'];

const RATINGS = [
  { value: 1, emoji: '😞', label: 'Schwierig',     color: '#F87171' },
  { value: 2, emoji: '😐', label: 'Okay',           color: '#FB923C' },
  { value: 3, emoji: '😊', label: 'Gut',            color: '#FBBF24' },
  { value: 4, emoji: '🙂', label: 'Super',          color: '#34D399' },
  { value: 5, emoji: '🚀', label: 'Ausgezeichnet',  color: '#5B8CF5' },
];

const PRIORITY = {
  low:      { color: '#55557A', label: 'Niedrig'  },
  medium:   { color: '#5B8CF5', label: 'Mittel'   },
  high:     { color: '#FB923C', label: 'Hoch'     },
  critical: { color: '#F87171', label: 'Kritisch' },
};

const TASK_COLS = [
  { id: 'open',        label: 'Offen',     color: '#9090B8' },
  { id: 'in_progress', label: 'In Arbeit', color: '#5B8CF5' },
  { id: 'blocked',     label: 'Blockiert', color: '#F87171' },
  { id: 'done',        label: 'Erledigt',  color: '#34D399' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(ws) {
  if (!ws) return '';
  const d = new Date(ws);
  const e = new Date(d); e.setDate(d.getDate() + 6);
  const f = dt => dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  return `${f(d)} – ${f(e)}`;
}

function initials(name = '', email = '') {
  const s = name || email || '?';
  return s.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarHue(email = '') {
  const cols = ['#9B72F2','#5B8CF5','#34D399','#FB923C','#F87171','#22D3EE','#F472B6'];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
}

// ── Base UI Primitives ────────────────────────────────────────────────────────

function Av({ name, email, color, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color || avatarHue(email || ''),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0,
      letterSpacing: '-0.01em',
    }}>
      {initials(name, email)}
    </div>
  );
}

function Ring({ pct = 0, color = '#5B8CF5', size = 60 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.min(pct / 100, 1) * c;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${f} ${c}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
    </svg>
  );
}

function Sparkline({ seed = 0, pct = 50, color = '#5B8CF5', height = 40 }) {
  const H = 50, W = 200;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const r = ((seed * 9301 + i * 49297 + i * i * 233) % 23280) / 23280;
    const base = 18 + r * 46;
    const trend = (pct / 100) * 28 * (i / 7);
    return Math.max(6, Math.min(92, base + trend));
  });
  const coords = pts.map((v, i) => `${(i / 7) * W},${H - (v / 100) * H}`).join(' ');
  const gid = `spk-${seed}-${pct}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${coords} ${W},${H}`} fill={`url(#${gid})`} />
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
    </svg>
  );
}

function DBtn({ children, onClick, variant = 'primary', type = 'button', disabled, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 18px', borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit', letterSpacing: '-0.01em',
    transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)', whiteSpace: 'nowrap', opacity: disabled ? 0.4 : 1,
  };
  const variants = {
    primary:  { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' },
    ghost:    { background: 'rgba(255,255,255,0.06)', color: D.text2, boxShadow: 'none', border: `0.5px solid ${D.border}` },
    danger:   { background: 'rgba(248,113,113,0.1)', color: '#F87171', boxShadow: 'none', border: '0.5px solid rgba(248,113,113,0.2)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled && variant === 'primary') e.currentTarget.style.filter = 'brightness(1.1)'; if (!disabled && variant === 'ghost') e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ''; if (variant === 'ghost') e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = ''; }}
    >{children}</button>
  );
}

function DInput({ as: As = 'input', style, ...props }) {
  return (
    <As
      {...props}
      style={{
        width: '100%', padding: '9px 12px', fontSize: 13, fontFamily: 'inherit',
        background: 'rgba(255,255,255,0.05)', color: D.text,
        border: `0.5px solid ${D.border}`, borderRadius: 9, outline: 'none',
        letterSpacing: '-0.01em', transition: 'border-color 0.15s ease, background 0.15s ease',
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(91,140,245,0.5)'; e.target.style.background = 'rgba(91,140,245,0.06)'; }}
      onBlur={e => { e.target.style.borderColor = D.border; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
    />
  );
}

function DLabel({ children }) {
  return <p style={{ margin: '0 0 7px', fontSize: 11, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</p>;
}

function DField({ label, children, style }) {
  return <div style={{ marginBottom: 14, ...style }}>{label && <DLabel>{label}</DLabel>}{children}</div>;
}

// ── Dark Modal ────────────────────────────────────────────────────────────────

function DModal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'fadeIn 0.18s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: width,
        background: D.card,
        borderRadius: 20,
        border: `0.5px solid ${D.borderB}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04)',
        overflow: 'hidden',
        animation: 'slideUp 0.24s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: `0.5px solid ${D.border}` }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text, letterSpacing: '-0.022em' }}>{title}</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.07)', color: D.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '16px 20px 20px', maxHeight: '80vh', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK TAB
// ─────────────────────────────────────────────────────────────────────────────

function FeedbackTab({ teamMembers, currentUser }) {
  const qc = useQueryClient();
  const [week, setWeek] = useState(getWeekStart());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  const { data: weeks = [] } = useQuery({ queryKey: ['planning-feedback-weeks'], queryFn: planningApi.listWeeks });
  const { data: entries = [], isLoading } = useQuery({ queryKey: ['planning-feedback', week], queryFn: () => planningApi.listFeedback({ week }) });

  const save = useMutation({
    mutationFn: planningApi.upsertFeedback,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-feedback'] }); qc.invalidateQueries({ queryKey: ['planning-feedback-weeks'] }); setSheetOpen(false); setEditEntry(null); toast.success('Feedback gespeichert'); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const isCurrent = week === getWeekStart();
  const myEntry = entries.find(e => String(e.author_id) === String(currentUser?.id));
  const noEntry = (teamMembers || []).filter(m => !entries.find(e => String(e.author_id) === String(m.id)));
  const prevW = () => { const d = new Date(week); d.setDate(d.getDate()-7); setWeek(d.toISOString().slice(0,10)); };
  const nextW = () => { const d = new Date(week); d.setDate(d.getDate()+7); const n=d.toISOString().slice(0,10); if(n<=getWeekStart()) setWeek(n); };

  return (
    <div>
      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: D.card, border: `0.5px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <button onClick={prevW} style={{ width: 34, height: 34, border: 'none', background: 'none', cursor: 'pointer', color: D.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: D.text, padding: '0 10px', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {isCurrent ? 'Diese Woche' : formatWeekLabel(week)}
          </span>
          <button onClick={nextW} disabled={isCurrent} style={{ width: 34, height: 34, border: 'none', background: 'none', cursor: isCurrent ? 'not-allowed' : 'pointer', color: isCurrent ? D.text3 : D.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrent ? 0.4 : 1 }}>
            <ChevronRight size={14} />
          </button>
        </div>
        {[getWeekStart(), ...(weeks||[]).filter(w=>w!==getWeekStart())].slice(0,4).map(w2 => w2 !== getWeekStart() && (
          <button key={w2} onClick={() => setWeek(w2)} style={{
            padding: '4px 11px', fontSize: 12, borderRadius: 8, border: `0.5px solid ${week===w2?D.blue:D.border}`,
            background: week===w2 ? 'rgba(91,140,245,0.12)' : 'transparent',
            color: week===w2 ? D.blue : D.text3, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          }}>
            {formatWeekLabel(w2)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {isCurrent && (
          <DBtn onClick={() => { setEditEntry(myEntry||null); setSheetOpen(true); }}>
            <Plus size={13} /> {myEntry ? 'Bearbeiten' : 'Mein Feedback'}
          </DBtn>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14 }}>
          {[1,2,3].map(i => <Skel key={i} h={220} r={18} />)}
        </div>
      ) : (
        <div className="anim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14 }}>
          {entries.map(e => (
            <FbCard key={e.id} entry={e} isMine={String(e.author_id)===String(currentUser?.id)} canEdit={isCurrent} onEdit={() => { setEditEntry(e); setSheetOpen(true); }} />
          ))}
          {isCurrent && noEntry.map(m => (
            <FbEmpty key={m.id} member={m} isMine={String(m.id)===String(currentUser?.id)} onFill={() => { setEditEntry(null); setSheetOpen(true); }} />
          ))}
        </div>
      )}

      {entries.length === 0 && !isLoading && !isCurrent && (
        <EmptyState icon={<MessageSquare size={28} />} title="Kein Feedback für diese Woche" />
      )}

      <FeedbackSheet open={sheetOpen} onClose={() => { setSheetOpen(false); setEditEntry(null); }}
        onSave={d => save.mutate({ ...d, week_start: week })}
        initial={editEntry} loading={save.isPending}
        weekLabel={isCurrent ? 'Diese Woche' : formatWeekLabel(week)}
      />
    </div>
  );
}

function FbCard({ entry, isMine, canEdit, onEdit }) {
  const rating = RATINGS.find(r => r.value === entry.rating);
  const glow = rating ? `${rating.color}14` : 'transparent';
  return (
    <div style={{
      background: rating
        ? `linear-gradient(145deg, ${rating.color}1A 0%, ${D.card} 55%)`
        : D.card,
      borderRadius: 20,
      border: `0.5px solid ${rating ? rating.color+'28' : D.border}`,
      boxShadow: rating ? `0 0 40px ${glow}, 0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px rgba(0,0,0,0.45)` : `0 2px 8px rgba(0,0,0,0.35)`,
      overflow: 'hidden',
      transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = rating ? `0 12px 48px ${rating.color}20, 0 1px 0 rgba(255,255,255,0.07) inset` : '0 8px 28px rgba(0,0,0,0.5)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = rating ? `0 0 40px ${glow}, 0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px rgba(0,0,0,0.45)` : `0 2px 8px rgba(0,0,0,0.35)`; }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Av name={entry.author_name} email={entry.author_email} color={entry.author_color} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D.text, letterSpacing: '-0.015em' }}>
            {entry.author_name || entry.author_email}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: D.text3 }}>{entry.area}</p>
        </div>
        {rating && (
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: `${rating.color}18`, border: `0.5px solid ${rating.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 22 }}>{rating.emoji}</span>
          </div>
        )}
      </div>

      {/* Rating bar */}
      {rating && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: `linear-gradient(90deg, ${rating.color}60, ${rating.color})`,
              width: `${(rating.value / 5) * 100}%`,
              boxShadow: `0 0 6px ${rating.color}60`,
              transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 10, color: D.text3 }}>1</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: rating.color }}>{rating.label}</span>
            <span style={{ fontSize: 10, color: D.text3 }}>5</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: `0.5px solid ${D.border}` }}>
        {entry.wins && <FbRow icon="✅" label="Wins" text={entry.wins} color={D.green} />}
        {entry.blockers && <FbRow icon="🚧" label="Blocker" text={entry.blockers} color={D.orange} />}
        {entry.next_steps && <FbRow icon="→" label="Nächste Schritte" text={entry.next_steps} color={D.blue} />}
        {entry.improvement_goal && <FbRow icon="⭐" label="Verbesserungsziel" text={entry.improvement_goal} color={D.purple} />}
        {!entry.wins && !entry.blockers && !entry.next_steps && !entry.improvement_goal && (
          <p style={{ margin: 0, fontSize: 12, color: D.text3, fontStyle: 'italic' }}>Keine Details</p>
        )}
      </div>

      {isMine && canEdit && (
        <div style={{ padding: '0 16px 14px' }}>
          <button onClick={onEdit} style={{
            width: '100%', padding: '7px', fontSize: 12, borderRadius: 9,
            border: `0.5px solid ${D.border}`, background: 'rgba(255,255,255,0.03)',
            color: D.text2, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            <Edit3 size={11} /> Bearbeiten
          </button>
        </div>
      )}
    </div>
  );
}

function FbRow({ icon, label, text, color }) {
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{icon} {label}</p>
      <p style={{ margin: 0, fontSize: 13, color: D.text2, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function FbEmpty({ member, isMine, onFill }) {
  return (
    <div style={{
      background: D.card, borderRadius: 18, border: `1px dashed ${D.border}`,
      padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      <Av name={member.name} email={member.email} color={member.color} size={36} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D.text2 }}>{member.name || member.email}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: D.text3 }}>Noch kein Feedback</p>
      </div>
      {isMine && <DBtn onClick={onFill} style={{ fontSize: 12, padding: '6px 14px' }}>Eintragen</DBtn>}
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
    if (open) { setArea(initial?.area||'Allgemein'); setRating(initial?.rating||null); setWins(initial?.wins||''); setBlockers(initial?.blockers||''); setNextSteps(initial?.next_steps||''); setGoal(initial?.improvement_goal||''); }
  }, [open, initial]);

  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  if (!open) return null;

  const submit = e => { e.preventDefault(); if (!rating) { toast.error('Bitte wähle eine Bewertung'); return; } onSave({ area, rating, wins, blockers, next_steps: nextSteps, improvement_goal: goal }); };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 990, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: D.card, borderRadius: '24px 24px 0 0',
        border: `0.5px solid ${D.borderB}`, borderBottom: 'none',
        boxShadow: '0 -12px 60px rgba(0,0,0,0.7)',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'sheetUp 0.3s cubic-bezier(0.22,1,0.36,1) backwards',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: D.border }} />
        </div>
        <form onSubmit={submit}>
          <div style={{ padding: '12px 22px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.028em', color: D.text }}>Wöchentliches Feedback</h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: D.text3 }}>{weekLabel}</p>
            </div>
            <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.text2 }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ padding: '14px 22px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Bereich */}
            <div>
              <DLabel>Mein Fokus-Bereich</DLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AREAS.map(a => {
                  const t = AREA_THEME[a];
                  const active = area === a;
                  return (
                    <button key={a} type="button" onClick={() => setArea(a)} style={{
                      padding: '5px 14px', fontSize: 13, borderRadius: 99, border: `0.5px solid ${active ? t.accent+'60' : D.border}`,
                      background: active ? `${t.accent}18` : 'transparent',
                      color: active ? t.accent : D.text3, cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: active ? 700 : 400, letterSpacing: '-0.01em', transition: 'all 0.15s ease',
                    }}>{a}</button>
                  );
                })}
              </div>
            </div>

            {/* Rating */}
            <div>
              <DLabel>Wie lief die Woche?</DLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {RATINGS.map(r => (
                  <button key={r.value} type="button" onClick={() => setRating(r.value)} style={{
                    flex: 1, padding: '12px 4px', borderRadius: 14, border: `0.5px solid ${rating===r.value ? r.color+'50' : D.border}`,
                    background: rating===r.value ? `${r.color}14` : D.card2,
                    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    boxShadow: rating===r.value ? `0 0 16px ${r.color}30` : 'none',
                    transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)',
                  }}>
                    <span style={{ fontSize: 24 }}>{r.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: rating===r.value ? r.color : D.text3, letterSpacing: '0.01em' }}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <DField label="✅ Was lief gut?"><DInput as="textarea" rows={3} placeholder="Erfolge, Fortschritte..." value={wins} onChange={e=>setWins(e.target.value)} style={{ resize: 'vertical', minHeight: 72 }} /></DField>
            <DField label="🚧 Was hat gebremst?"><DInput as="textarea" rows={3} placeholder="Hindernisse, Probleme..." value={blockers} onChange={e=>setBlockers(e.target.value)} style={{ resize: 'vertical', minHeight: 72 }} /></DField>
            <DField label="→ Nächste Schritte"><DInput as="textarea" rows={3} placeholder="Plane für nächste Woche..." value={nextSteps} onChange={e=>setNextSteps(e.target.value)} style={{ resize: 'vertical', minHeight: 72 }} /></DField>
            <DField label="⭐ Verbesserungsziel"><DInput as="textarea" rows={2} placeholder="Woran möchtest du wachsen?" value={goal} onChange={e=>setGoal(e.target.value)} style={{ resize: 'vertical', minHeight: 60 }} /></DField>

            <DBtn type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15, borderRadius: 13 }}>
              {loading ? 'Speichern...' : 'Feedback speichern'}
            </DBtn>
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

  const { data: kpis = [], isLoading } = useQuery({ queryKey: ['planning-kpis'], queryFn: planningApi.listKpis });

  const save = useMutation({
    mutationFn: d => d.id ? planningApi.updateKpi(d.id, d) : planningApi.createKpi(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-kpis'] }); setModalOpen(false); setEditKpi(null); toast.success('KPI gespeichert'); },
    onError: () => toast.error('Fehler'),
  });
  const del = useMutation({ mutationFn: planningApi.deleteKpi, onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-kpis'] }) });

  const grouped = AREAS.reduce((a, k) => { a[k] = kpis.filter(x => x.area === k); return a; }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <DBtn onClick={() => { setEditKpi(null); setModalOpen(true); }}><Plus size={13} /> KPI hinzufügen</DBtn>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          {[1,2,3,4].map(i => <Skel key={i} h={160} r={18} />)}
        </div>
      ) : kpis.length === 0 ? (
        <EmptyState icon={<Target size={28} />} title="Noch keine KPIs" sub="Erstelle dein erstes KPI um Fortschritte zu messen." />
      ) : (
        Object.entries(grouped).map(([area, items]) => items.length > 0 && (
          <div key={area} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: AREA_THEME[area]?.accent || D.text3, boxShadow: `0 0 8px ${AREA_THEME[area]?.accent}80` }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: AREA_THEME[area]?.accent || D.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{area}</span>
            </div>
            <div className="anim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
              {items.map(kpi => (
                <KpiCard key={kpi.id} kpi={kpi}
                  onEdit={() => { setEditKpi(kpi); setModalOpen(true); }}
                  onDelete={() => { if (confirm('KPI löschen?')) del.mutate(kpi.id); }}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <KpiModal open={modalOpen} onClose={() => { setModalOpen(false); setEditKpi(null); }}
        onSave={save.mutate} initial={editKpi} loading={save.isPending} teamMembers={teamMembers||[]} />
    </div>
  );
}

function KpiCard({ kpi, onEdit, onDelete }) {
  const pct = kpi.target_value > 0 ? Math.round((kpi.current_value / kpi.target_value) * 100) : 0;
  const t = AREA_THEME[kpi.area] || AREA_THEME.Allgemein;
  const isGood = pct >= 80;
  const accentColor = isGood ? D.green : t.accent;
  const seed = typeof kpi.id === 'number' ? kpi.id : String(kpi.id || '').split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 7) % 999;

  return (
    <div style={{
      background: t.bg, borderRadius: 20,
      border: `0.5px solid ${t.accent}35`,
      boxShadow: `0 0 48px ${t.glow}, 0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 8px rgba(0,0,0,0.5)`,
      overflow: 'hidden',
      transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 56px ${t.glow}, 0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.6)`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 48px ${t.glow}, 0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 8px rgba(0,0,0,0.5)`; }}
    >
      {/* Top bar: title + actions */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${t.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Target size={13} color={t.accent} />
        </div>
        <p style={{ flex: 1, margin: 0, fontSize: 12, fontWeight: 600, color: D.text2, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {kpi.title}
        </p>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.text2 }}><Edit3 size={11} /></button>
          <button onClick={onDelete} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.text3 }}><Trash2 size={11} /></button>
        </div>
      </div>

      {/* Hero value */}
      <div style={{ padding: '14px 16px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 5 }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: D.text, letterSpacing: '-0.05em', lineHeight: 1 }}>
            {Number(kpi.current_value).toLocaleString('de-DE')}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: D.text2, letterSpacing: '-0.02em' }}>{kpi.unit}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: D.text3 }}>Ziel: {Number(kpi.target_value).toLocaleString('de-DE')} {kpi.unit}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
            background: isGood ? 'rgba(52,211,153,0.15)' : `${t.accent}18`,
            color: accentColor,
            border: `0.5px solid ${isGood ? 'rgba(52,211,153,0.3)' : t.accent + '30'}`,
          }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: `linear-gradient(90deg, ${t.accent}70, ${accentColor})`,
            width: `${Math.min(pct, 100)}%`,
            boxShadow: `0 0 6px ${accentColor}60`,
            transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px 14px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 38 }}>
        {kpi.owner_name && <>
          <Av name={kpi.owner_name} email="" color={kpi.owner_color} size={16} />
          <span style={{ fontSize: 11, color: D.text3, flex: 1 }}>{kpi.owner_name}</span>
        </>}
        {!kpi.owner_name && <div style={{ flex: 1 }} />}
        {kpi.frequency && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: D.text3, border: `0.5px solid ${D.border}` }}>
            {kpi.frequency === 'weekly' ? 'Wöchentlich' : kpi.frequency === 'monthly' ? 'Monatlich' : kpi.frequency === 'quarterly' ? 'Quartalsweise' : 'Jährlich'}
          </span>
        )}
      </div>
    </div>
  );
}

function KpiModal({ open, onClose, onSave, initial, loading, teamMembers }) {
  const [f, setF] = useState({});
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));
  useEffect(() => { if (open) setF(initial ? {...initial} : { area: 'Vertrieb', unit: '%', frequency: 'monthly', target_value: 100, current_value: 0 }); }, [open, initial]);
  const submit = e => { e.preventDefault(); if (!f.title?.trim()) { toast.error('Titel erforderlich'); return; } onSave(f); };

  return (
    <DModal open={open} onClose={onClose} title={initial ? 'KPI bearbeiten' : 'Neues KPI'}>
      <form onSubmit={submit}>
        <DField label="Titel"><DInput value={f.title||''} onChange={e=>s('title',e.target.value)} placeholder="z.B. Conversion Rate" required /></DField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DField label="Bereich">
            <DInput as="select" value={f.area||'Allgemein'} onChange={e=>s('area',e.target.value)} style={{ appearance: 'none' }}>
              {AREAS.map(a=><option key={a} style={{ background: D.card }}>{a}</option>)}
            </DInput>
          </DField>
          <DField label="Einheit">
            <DInput as="select" value={f.unit||'%'} onChange={e=>s('unit',e.target.value)} style={{ appearance: 'none' }}>
              {['%','€','Stk.','h','Tage','Punkte','Leads'].map(u=><option key={u} style={{ background: D.card }}>{u}</option>)}
            </DInput>
          </DField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DField label="Zielwert"><DInput type="number" value={f.target_value??100} onChange={e=>s('target_value',parseFloat(e.target.value))} /></DField>
          <DField label="Ist-Wert"><DInput type="number" value={f.current_value??0} onChange={e=>s('current_value',parseFloat(e.target.value))} /></DField>
        </div>
        <DField label="Turnus">
          <DInput as="select" value={f.frequency||'monthly'} onChange={e=>s('frequency',e.target.value)} style={{ appearance: 'none' }}>
            <option value="weekly" style={{ background: D.card }}>Wöchentlich</option>
            <option value="monthly" style={{ background: D.card }}>Monatlich</option>
            <option value="quarterly" style={{ background: D.card }}>Quartalsweise</option>
            <option value="yearly" style={{ background: D.card }}>Jährlich</option>
          </DInput>
        </DField>
        {teamMembers.length > 0 && (
          <DField label="Verantwortlich">
            <DInput as="select" value={f.owner_id||''} onChange={e=>s('owner_id',e.target.value||null)} style={{ appearance: 'none' }}>
              <option value="" style={{ background: D.card }}>Niemand</option>
              {teamMembers.map(m=><option key={m.id} value={m.id} style={{ background: D.card }}>{m.name||m.email}</option>)}
            </DInput>
          </DField>
        )}
        <DField label="Beschreibung">
          <DInput as="textarea" rows={2} value={f.description||''} onChange={e=>s('description',e.target.value)} placeholder="Optional..." style={{ resize: 'vertical' }} />
        </DField>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <DBtn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Abbrechen</DBtn>
          <DBtn type="submit" disabled={loading} style={{ flex: 2 }}>{loading ? 'Speichern...' : initial ? 'Aktualisieren' : 'KPI erstellen'}</DBtn>
        </div>
      </form>
    </DModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS TAB
// ─────────────────────────────────────────────────────────────────────────────

function TasksTab({ teamMembers }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [defStatus, setDefStatus] = useState('open');

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['planning-tasks'], queryFn: () => planningApi.listTasks() });

  const save = useMutation({
    mutationFn: d => d.id ? planningApi.updateTask(d.id, d) : planningApi.createTask(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-tasks'] }); setModalOpen(false); setEditTask(null); toast.success('Aufgabe gespeichert'); },
    onError: () => toast.error('Fehler'),
  });
  const move = useMutation({ mutationFn: ({ id, status, ...rest }) => planningApi.updateTask(id, { ...rest, status }), onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-tasks'] }) });
  const del  = useMutation({ mutationFn: planningApi.deleteTask, onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-tasks'] }); toast.success('Gelöscht'); } });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <DBtn onClick={() => { setEditTask(null); setDefStatus('open'); setModalOpen(true); }}><Plus size={13} /> Aufgabe hinzufügen</DBtn>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[1,2,3,4].map(i => <Skel key={i} h={180} r={14} />)}
        </div>
      ) : (
        <div className="anim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, alignItems: 'start' }}>
          {TASK_COLS.map(col => {
            const items = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id}>
                {/* Column header */}
                <div style={{
                  padding: '9px 12px 8px', borderRadius: 12, marginBottom: 10,
                  background: `linear-gradient(90deg, ${col.color}18 0%, transparent 100%)`,
                  border: `0.5px solid ${col.color}20`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, boxShadow: `0 0 8px ${col.color}` }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: col.color, textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>{col.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: D.text3 }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(task => (
                    <TaskCard key={task.id} task={task} colColor={col.color}
                      onEdit={() => { setEditTask(task); setModalOpen(true); }}
                      onMove={status => move.mutate({ ...task, status })}
                      onDelete={() => { if (confirm('Löschen?')) del.mutate(task.id); }}
                    />
                  ))}
                  <button
                    onClick={() => { setEditTask(null); setDefStatus(col.id); setModalOpen(true); }}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 10,
                      border: `1px dashed ${D.border}`, background: 'none',
                      color: D.text3, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = col.color+'50'; e.currentTarget.style.color = col.color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text3; }}
                  >
                    <Plus size={11} /> Hinzufügen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskModal open={modalOpen} onClose={() => { setModalOpen(false); setEditTask(null); }}
        onSave={save.mutate} initial={editTask} defaultStatus={defStatus}
        loading={save.isPending} teamMembers={teamMembers||[]} />
    </div>
  );
}

function TaskCard({ task, onEdit, onMove, onDelete }) {
  const p = PRIORITY[task.priority] || PRIORITY.medium;
  const due = task.due_date ? new Date(task.due_date) : null;
  const overdue = due && due < new Date() && task.status !== 'done';
  const others = TASK_COLS.filter(c => c.id !== task.status);

  return (
    <div style={{
      background: `linear-gradient(145deg, ${p.color}14 0%, ${D.card} 55%)`,
      borderRadius: 16,
      border: `0.5px solid ${p.color}28`,
      boxShadow: `0 0 28px ${p.color}10, 0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 6px rgba(0,0,0,0.4)`,
      padding: '12px 13px 11px',
      transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${p.color}18, 0 1px 0 rgba(255,255,255,0.06) inset`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 28px ${p.color}10, 0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 6px rgba(0,0,0,0.4)`; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 600, color: D.text, lineHeight: 1.4, letterSpacing: '-0.01em' }}>{task.title}</p>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.text2 }}><Edit3 size={10} /></button>
          <button onClick={onDelete} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.text3 }}><Trash2 size={10} /></button>
        </div>
      </div>
      {task.description && <p style={{ margin: '4px 0 0', fontSize: 11, color: D.text3, lineHeight: 1.4 }}>{task.description}</p>}
      <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${p.color}18`, color: p.color, border: `0.5px solid ${p.color}30` }}>{p.label}</span>
        {due && <span style={{ fontSize: 10, color: overdue ? D.red : D.text3, display: 'flex', alignItems: 'center', gap: 2 }}><Calendar size={9} />{due.toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}</span>}
        {task.owner_name && <Av name={task.owner_name} email="" color={task.owner_color} size={16} />}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
        {others.slice(0, 2).map(c => (
          <button key={c.id} onClick={() => onMove(c.id)} style={{
            fontSize: 10, padding: '3px 7px', borderRadius: 6, border: `0.5px solid ${c.color}25`, cursor: 'pointer',
            background: `${c.color}12`, color: c.color, fontFamily: 'inherit', fontWeight: 600,
          }}>→ {c.label}</button>
        ))}
      </div>
    </div>
  );
}

function TaskModal({ open, onClose, onSave, initial, defaultStatus, loading, teamMembers }) {
  const [f, setF] = useState({});
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));
  useEffect(() => { if (open) setF(initial ? {...initial} : { status: defaultStatus||'open', priority: 'medium', area: 'Allgemein', type: 'task' }); }, [open, initial, defaultStatus]);
  const submit = e => { e.preventDefault(); if (!f.title?.trim()) { toast.error('Titel erforderlich'); return; } onSave(f); };
  const sel = (v, ...opts) => <DInput as="select" value={v} style={{ appearance: 'none' }}>{opts}</DInput>;

  return (
    <DModal open={open} onClose={onClose} title={initial ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}>
      <form onSubmit={submit}>
        <DField label="Titel"><DInput value={f.title||''} onChange={e=>s('title',e.target.value)} placeholder="Was muss getan werden?" required /></DField>
        <DField label="Beschreibung"><DInput as="textarea" rows={2} value={f.description||''} onChange={e=>s('description',e.target.value)} placeholder="Details..." style={{ resize: 'vertical' }} /></DField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DField label="Status">
            <DInput as="select" value={f.status||'open'} onChange={e=>s('status',e.target.value)} style={{ appearance: 'none' }}>
              {TASK_COLS.map(c=><option key={c.id} value={c.id} style={{ background: D.card }}>{c.label}</option>)}
            </DInput>
          </DField>
          <DField label="Priorität">
            <DInput as="select" value={f.priority||'medium'} onChange={e=>s('priority',e.target.value)} style={{ appearance: 'none' }}>
              {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k} style={{ background: D.card }}>{v.label}</option>)}
            </DInput>
          </DField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DField label="Bereich">
            <DInput as="select" value={f.area||'Allgemein'} onChange={e=>s('area',e.target.value)} style={{ appearance: 'none' }}>
              {AREAS.map(a=><option key={a} style={{ background: D.card }}>{a}</option>)}
            </DInput>
          </DField>
          <DField label="Fälligkeitsdatum">
            <DInput type="date" value={f.due_date||''} onChange={e=>s('due_date',e.target.value||null)} />
          </DField>
        </div>
        {teamMembers.length > 0 && (
          <DField label="Verantwortlich">
            <DInput as="select" value={f.owner_id||''} onChange={e=>s('owner_id',e.target.value||null)} style={{ appearance: 'none' }}>
              <option value="" style={{ background: D.card }}>Niemand</option>
              {teamMembers.map(m=><option key={m.id} value={m.id} style={{ background: D.card }}>{m.name||m.email}</option>)}
            </DInput>
          </DField>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <DBtn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Abbrechen</DBtn>
          <DBtn type="submit" disabled={loading} style={{ flex: 2 }}>{loading ? 'Speichern...' : initial ? 'Aktualisieren' : 'Erstellen'}</DBtn>
        </div>
      </form>
    </DModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

function DecisionsTab({ teamMembers }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editDec, setEditDec] = useState(null);

  const { data: decisions = [], isLoading } = useQuery({ queryKey: ['planning-decisions'], queryFn: planningApi.listDecisions });

  const save = useMutation({
    mutationFn: d => d.id ? planningApi.updateDecision(d.id, d) : planningApi.createDecision(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planning-decisions'] }); setModalOpen(false); setEditDec(null); toast.success('Gespeichert'); },
    onError: () => toast.error('Fehler'),
  });
  const del = useMutation({ mutationFn: planningApi.deleteDecision, onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-decisions'] }) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <DBtn onClick={() => { setEditDec(null); setModalOpen(true); }}><Plus size={13} /> Festhalten</DBtn>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <Skel key={i} h={88} r={14} />)}
        </div>
      ) : decisions.length === 0 ? (
        <EmptyState icon={<Lightbulb size={28} />} title="Noch keine Entscheidungen" sub="Halte wichtige Business-Entscheidungen fest." />
      ) : (
        <div className="anim-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {decisions.map(dec => (
            <DecCard key={dec.id} dec={dec}
              onEdit={() => { setEditDec(dec); setModalOpen(true); }}
              onDelete={() => { if (confirm('Löschen?')) del.mutate(dec.id); }}
            />
          ))}
        </div>
      )}

      <DecModal open={modalOpen} onClose={() => { setModalOpen(false); setEditDec(null); }}
        onSave={save.mutate} initial={editDec} loading={save.isPending} teamMembers={teamMembers||[]} />
    </div>
  );
}

function DecCard({ dec, onEdit, onDelete }) {
  const t = AREA_THEME[dec.area] || AREA_THEME.Allgemein;
  const date = dec.decided_at ? new Date(dec.decided_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div style={{
      background: `linear-gradient(145deg, ${t.accent}12 0%, ${D.card} 55%)`,
      borderRadius: 18, padding: '14px 16px',
      border: `0.5px solid ${t.accent}28`,
      boxShadow: `0 0 36px ${t.glow}, 0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px rgba(0,0,0,0.4)`,
      display: 'flex', alignItems: 'flex-start', gap: 12,
      opacity: dec.status === 'active' ? 1 : 0.5,
      transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 40px ${t.glow}, 0 1px 0 rgba(255,255,255,0.07) inset`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 36px ${t.glow}, 0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px rgba(0,0,0,0.4)`; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: D.text, letterSpacing: '-0.018em' }}>{dec.title}</p>
          {dec.status !== 'active' && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: D.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {dec.status === 'completed' ? 'Umgesetzt' : 'Verworfen'}
            </span>
          )}
        </div>
        {dec.description && <p style={{ margin: '0 0 6px', fontSize: 13, color: D.text2, lineHeight: 1.5 }}>{dec.description}</p>}
        {dec.impact && <p style={{ margin: '4px 0 0', fontSize: 12, color: D.text3 }}><span style={{ color: D.text2, fontWeight: 600 }}>Auswirkung:</span> {dec.impact}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>{dec.area}</span>
          {date && <span style={{ fontSize: 11, color: D.text3 }}>{date}</span>}
          {dec.owner_name && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Av name={dec.owner_name} email="" color={dec.owner_color} size={16} /><span style={{ fontSize: 11, color: D.text3 }}>{dec.owner_name}</span></span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.text2 }}><Edit3 size={12} /></button>
        <button onClick={onDelete} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.text3 }}><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

function DecModal({ open, onClose, onSave, initial, loading, teamMembers }) {
  const [f, setF] = useState({});
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));
  useEffect(() => { if (open) setF(initial ? {...initial} : { area: 'Allgemein', status: 'active', decided_at: new Date().toISOString().slice(0,10) }); }, [open, initial]);
  const submit = e => { e.preventDefault(); if (!f.title?.trim()) { toast.error('Titel erforderlich'); return; } onSave(f); };

  return (
    <DModal open={open} onClose={onClose} title={initial ? 'Entscheidung bearbeiten' : 'Entscheidung festhalten'}>
      <form onSubmit={submit}>
        <DField label="Entscheidung"><DInput value={f.title||''} onChange={e=>s('title',e.target.value)} placeholder="Was wurde entschieden?" required /></DField>
        <DField label="Begründung"><DInput as="textarea" rows={3} value={f.description||''} onChange={e=>s('description',e.target.value)} placeholder="Warum wurde so entschieden?" style={{ resize: 'vertical' }} /></DField>
        <DField label="Auswirkung"><DInput as="textarea" rows={2} value={f.impact||''} onChange={e=>s('impact',e.target.value)} placeholder="Was verändert sich dadurch?" style={{ resize: 'vertical' }} /></DField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DField label="Bereich">
            <DInput as="select" value={f.area||'Allgemein'} onChange={e=>s('area',e.target.value)} style={{ appearance: 'none' }}>
              {AREAS.map(a=><option key={a} style={{ background: D.card }}>{a}</option>)}
            </DInput>
          </DField>
          <DField label="Status">
            <DInput as="select" value={f.status||'active'} onChange={e=>s('status',e.target.value)} style={{ appearance: 'none' }}>
              <option value="active" style={{ background: D.card }}>Aktiv</option>
              <option value="completed" style={{ background: D.card }}>Umgesetzt</option>
              <option value="cancelled" style={{ background: D.card }}>Verworfen</option>
            </DInput>
          </DField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {teamMembers.length > 0 && (
            <DField label="Entschieden von">
              <DInput as="select" value={f.owner_id||''} onChange={e=>s('owner_id',e.target.value||null)} style={{ appearance: 'none' }}>
                <option value="" style={{ background: D.card }}>Niemand</option>
                {teamMembers.map(m=><option key={m.id} value={m.id} style={{ background: D.card }}>{m.name||m.email}</option>)}
              </DInput>
            </DField>
          )}
          <DField label="Datum"><DInput type="date" value={f.decided_at?.slice(0,10)||''} onChange={e=>s('decided_at',e.target.value)} /></DField>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <DBtn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Abbrechen</DBtn>
          <DBtn type="submit" disabled={loading} style={{ flex: 2 }}>{loading ? 'Speichern...' : initial ? 'Aktualisieren' : 'Festhalten'}</DBtn>
        </div>
      </form>
    </DModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ onTabChange }) {
  const { data: kpis = [] }      = useQuery({ queryKey: ['planning-kpis'],       queryFn: planningApi.listKpis });
  const { data: tasks = [] }     = useQuery({ queryKey: ['planning-tasks'],      queryFn: () => planningApi.listTasks() });
  const { data: feedback = [] }  = useQuery({ queryKey: ['planning-feedback', getWeekStart()], queryFn: () => planningApi.listFeedback({ week: getWeekStart() }) });
  const { data: decisions = [] } = useQuery({ queryKey: ['planning-decisions'],  queryFn: planningApi.listDecisions });

  const open = tasks.filter(t => t.status === 'open').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const avgR = feedback.length ? (feedback.reduce((s,e) => s+(e.rating||0),0)/feedback.length) : 0;
  const avgKpi = kpis.length ? Math.round(kpis.reduce((s,k) => s+(k.current_value/(k.target_value||1)*100),0)/kpis.length) : 0;
  const ratingColor = avgR >= 4 ? D.green : avgR >= 3 ? D.yellow : D.red;

  const metrics = [
    { label: 'Offene Aufgaben', value: open, sub: blocked>0 ? `${blocked} blockiert` : 'Keine Blockaden', color: D.blue, icon: <CheckSquare size={17} />, tab: 'tasks' },
    { label: 'Aktive KPIs', value: kpis.length, sub: `Ø ${avgKpi}% Erreichung`, color: D.green, icon: <Target size={17} />, tab: 'kpis' },
    { label: 'Team-Rating KW', value: avgR ? `${avgR.toFixed(1)}/5` : '–', sub: `${feedback.length} Einträge`, color: ratingColor, icon: <MessageSquare size={17} />, tab: 'feedback' },
    { label: 'Entscheidungen', value: decisions.filter(d=>d.status==='active').length, sub: `${decisions.length} gesamt`, color: D.purple, icon: <Lightbulb size={17} />, tab: 'decisions' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Metric cards */}
      <div className="anim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        {metrics.map((m, mi) => (
          <div key={m.label} onClick={() => onTabChange(m.tab)} style={{
            background: `linear-gradient(145deg, ${m.color}18 0%, ${D.card} 55%)`,
            borderRadius: 20,
            border: `0.5px solid ${m.color}30`,
            boxShadow: `0 0 40px ${m.color}14, 0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px rgba(0,0,0,0.45)`,
            overflow: 'hidden', cursor: 'pointer',
            transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 48px ${m.color}22, 0 1px 0 rgba(255,255,255,0.07) inset`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 40px ${m.color}14, 0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px rgba(0,0,0,0.45)`; }}
          >
            <div style={{ padding: '18px 18px 4px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${m.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                {m.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${m.color}15`, color: m.color, border: `0.5px solid ${m.color}25` }}>↑</span>
            </div>
            <div style={{ padding: '10px 18px 18px' }}>
              <p style={{ margin: '0 0 3px', fontSize: 36, fontWeight: 900, color: D.text, letterSpacing: '-0.05em', lineHeight: 1 }}>{m.value}</p>
              <p style={{ margin: '5px 0 2px', fontSize: 13, fontWeight: 600, color: D.text, letterSpacing: '-0.012em' }}>{m.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: D.text3 }}>{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* KPI bars */}
      {kpis.length > 0 && (
        <div>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 800, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>KPI-Übersicht</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {kpis.slice(0,6).map(kpi => {
              const pct = kpi.target_value > 0 ? Math.round((kpi.current_value/kpi.target_value)*100) : 0;
              const t = AREA_THEME[kpi.area]||AREA_THEME.Allgemein;
              return (
                <div key={kpi.id} style={{ background: D.card, borderRadius: 12, border: `0.5px solid ${D.border}`, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: D.text, letterSpacing: '-0.01em' }}>{kpi.title}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: pct>=80 ? D.green : t.accent }}>{pct}%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                    <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${t.accent}70,${t.accent})`, width: `${Math.min(pct,100)}%`, boxShadow: `0 0 6px ${t.accent}50`, transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent decisions */}
      {decisions.slice(0,3).length > 0 && (
        <div>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 800, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Letzte Entscheidungen</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {decisions.slice(0,3).map(dec => {
              const t = AREA_THEME[dec.area]||AREA_THEME.Allgemein;
              return (
                <div key={dec.id} style={{ background: D.card, borderRadius: 10, padding: '10px 14px', border: `0.5px solid ${D.border}`, borderLeft: `2.5px solid ${t.accent}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D.text }}>{dec.title}</p>
                    {dec.description && <p style={{ margin: '2px 0 0', fontSize: 11, color: D.text3 }}>{dec.description.slice(0,80)}{dec.description.length>80?'...':''}</p>}
                  </div>
                  {dec.decided_at && <span style={{ fontSize: 11, color: D.text3, whiteSpace: 'nowrap' }}>{new Date(dec.decided_at).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {kpis.length===0 && tasks.length===0 && decisions.length===0 && (
        <EmptyState icon={<Target size={28} />} title="Noch nichts eingetragen" sub="Fange mit Feedback, KPIs oder Aufgaben an." />
      )}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Skel({ h, r = 10 }) {
  return <div style={{ height: h, borderRadius: r, background: 'linear-gradient(90deg, #111122 25%, #16163A 50%, #111122 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />;
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, color: D.text3, opacity: 0.4 }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: D.text2, margin: '0 0 6px' }}>{title}</p>
      {sub && <p style={{ fontSize: 13, margin: 0, color: D.text3 }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

// ── Sliding Segmented Control ─────────────────────────────────────────────────

function SegCtrl({ tabs, active, onChange }) {
  const containerRef = useRef(null);
  const btnRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const el = btnRefs.current[active];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  }, [active]);

  return (
    <div ref={containerRef} style={{
      position: 'relative', display: 'inline-flex',
      background: 'rgba(255,255,255,0.04)',
      border: `0.5px solid ${D.border}`,
      borderRadius: 14, padding: 4, gap: 0,
    }}>
      {/* Sliding pill */}
      <div style={{
        position: 'absolute',
        top: 4, height: 'calc(100% - 8px)',
        left: pill.left,
        width: pill.width,
        background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)',
        borderRadius: 10,
        boxShadow: '0 2px 20px rgba(124,58,237,0.5), 0 0 0 0.5px rgba(255,255,255,0.1) inset',
        opacity: pill.ready ? 1 : 0,
        transition: 'left 0.38s cubic-bezier(0.22,1,0.36,1), width 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
        pointerEvents: 'none',
      }} />
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            ref={el => { btnRefs.current[t.id] = el; }}
            onClick={() => onChange(t.id)}
            style={{
              position: 'relative',
              padding: '7px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: isActive ? 700 : 400,
              fontFamily: 'inherit', letterSpacing: '-0.01em',
              background: 'transparent',
              color: isActive ? '#fff' : D.text3,
              transition: 'color 0.28s cubic-bezier(0.22,1,0.36,1)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = D.text2; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = D.text3; }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Planning() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feedback');

  const { data: teamData } = useQuery({
    queryKey: ['team-list'],
    queryFn: () => api.get('/api/team').then(r => r.data),
  });
  const teamMembers = teamData || [];

  return (
    <div style={{
      minHeight: '100vh',
      background: D.bg,
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',
      backgroundSize: '48px 48px',
      padding: '0 0 60px',
    }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 28px' }}>

        {/* Header */}
        <div style={{ padding: '36px 0 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Business Command Center
            </p>
            <h1 style={{
              margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
              background: 'linear-gradient(135deg, #EEEEFF 30%, rgba(155,114,242,0.8) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Planung
            </h1>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: 99, background: 'rgba(155,114,242,0.1)', border: '0.5px solid rgba(155,114,242,0.25)', fontSize: 12, fontWeight: 600, color: D.purple }}>
            KW {(() => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7); })()}
            &nbsp;·&nbsp;
            {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Segmented Control */}
        <div style={{ marginBottom: 28 }}>
          <SegCtrl tabs={TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab Content — key forces remount → triggers entry animation */}
        <div key={activeTab} style={{ animation: 'tabIn 0.42s cubic-bezier(0.22,1,0.36,1) both' }}>
          {activeTab === 'feedback'  && <FeedbackTab  teamMembers={teamMembers} currentUser={user} />}
          {activeTab === 'kpis'      && <KpisTab       teamMembers={teamMembers} />}
          {activeTab === 'tasks'     && <TasksTab      teamMembers={teamMembers} />}
          {activeTab === 'decisions' && <DecisionsTab  teamMembers={teamMembers} />}
          {activeTab === 'overview'  && <OverviewTab   onTabChange={setActiveTab} />}
        </div>
      </div>
    </div>
  );
}
