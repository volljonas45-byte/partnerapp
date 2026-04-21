import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, Play, Square, Plus, Trash2, Pencil, X, Check,
  Car, ChevronDown, ChevronRight, MapPin, Timer, BarChart2,
  Target, SkipForward, RotateCcw, Settings2,
  CheckCircle2, Circle, ListTodo,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { timeApi, fahrtenbuchApi } from '../api/time';
import { projectsApi } from '../api/projects';
import { useConfirm } from '../hooks/useConfirm';
import { useTheme } from '../context/ThemeContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtSec(sec) {
  if (!sec && sec !== 0) return '–';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function fmtSecLong(sec) {
  if (!sec) return '0h 00m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
}

function groupByDate(entries) {
  const groups = {};
  for (const e of entries) {
    const date = new Date(e.start_time).toISOString().slice(0, 10);
    if (!groups[date]) groups[date] = [];
    groups[date].push(e);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowLocalDatetime() {
  const now = new Date();
  return new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function glass(isDark) {
  return {
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.82)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
    borderRadius: 20,
  };
}

const ACCENT = ['#5B8CF5', '#BF5AF2', '#34D399', '#FF9F0A', '#FF453A', '#FF6B35'];

// ── Project Picker ─────────────────────────────────────────────────────────────

function ProjectPicker({ value, onChange, projects, placeholder = 'Kein Projekt', isDark, c }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = projects.find(p => p.id === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => onChange && setOpen(o => !o)}
        disabled={!onChange}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 10,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          background: selected
            ? (isDark ? 'rgba(91,140,245,0.12)' : 'rgba(0,122,255,0.06)')
            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
          cursor: onChange ? 'pointer' : 'default',
          fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          color: selected ? '#5B8CF5' : c.textSecondary,
          whiteSpace: 'nowrap', transition: 'all 0.2s',
        }}
      >
        {selected ? selected.name : placeholder}
        {onChange && <ChevronDown size={12} style={{ color: c.textTertiary }} />}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
          ...glass(isDark), borderRadius: 14,
          minWidth: 200, maxHeight: 260, overflowY: 'auto',
          boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: c.textTertiary, fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Kein Projekt
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: value === p.id ? '#5B8CF5' : c.text, fontWeight: value === p.id ? '600' : '400' }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timer Bar ──────────────────────────────────────────────────────────────────

function TimerBar({ activeTimer, projects, onStart, onStop, isDark, c }) {
  const [desc, setDesc] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer) { setElapsed(0); return; }
    const calc = () => Math.round((Date.now() - new Date(activeTimer.start_time)) / 1000);
    setElapsed(calc());
    const iv = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(iv);
  }, [activeTimer]);

  const isRunning = !!activeTimer;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const handleStart = () => {
    onStart({ project_id: projectId, description: desc });
    setDesc('');
  };

  return (
    <div style={{
      ...glass(isDark),
      padding: '16px 20px',
      marginBottom: 24,
      boxShadow: isRunning
        ? `0 0 0 1px rgba(91,140,245,0.25), 0 0 48px rgba(91,140,245,${isDark ? '0.14' : '0.09'}), 0 4px 24px rgba(0,0,0,${isDark ? '0.35' : '0.08'})`
        : (isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.06)'),
      transition: 'box-shadow 0.5s ease',
      position: 'relative',
    }}>
      {isRunning && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 40% 0%, rgba(91,140,245,0.1) 0%, transparent 65%)',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        {isRunning && (
          <div style={{
            fontVariantNumeric: 'tabular-nums', fontSize: 30, fontWeight: 700,
            letterSpacing: '-0.04em', minWidth: 108, lineHeight: 1,
            background: 'linear-gradient(135deg, #5B8CF5, #BF5AF2)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'timerPulse 2.5s ease-in-out infinite',
          }}>
            {timeStr}
          </div>
        )}
        <input
          className="input"
          placeholder="Woran arbeitest du?"
          value={isRunning ? (activeTimer.description || '') : desc}
          onChange={e => !isRunning && setDesc(e.target.value)}
          readOnly={isRunning}
          onKeyDown={e => { if (e.key === 'Enter' && !isRunning) handleStart(); }}
          style={{ flex: 1, fontSize: 14, background: isRunning ? 'transparent' : undefined, border: isRunning ? 'none' : undefined }}
        />
        <ProjectPicker
          value={isRunning ? activeTimer.project_id : projectId}
          onChange={isRunning ? undefined : setProjectId}
          projects={projects}
          isDark={isDark} c={c}
        />
        {isRunning ? (
          <button
            onClick={() => onStop(activeTimer.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              borderRadius: 980, border: 'none', cursor: 'pointer',
              background: 'rgba(255,69,58,0.12)', color: '#FF453A',
              fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.2)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Square size={14} fill="#FF453A" /> Stopp
          </button>
        ) : (
          <button
            onClick={handleStart}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px',
              borderRadius: 980, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #5B8CF5, #7B5AF5)',
              color: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(91,140,245,0.4)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(91,140,245,0.55)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,140,245,0.4)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Play size={14} fill="#fff" /> Start
          </button>
        )}
      </div>
      {isRunning && activeTimer.project_name && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#5B8CF5', fontWeight: 600, paddingLeft: 120 }}>
          {activeTimer.project_name}
        </div>
      )}
    </div>
  );
}

// ── Pomodoro Timer ─────────────────────────────────────────────────────────────

const POMO = {
  work:       { label: 'Fokus',       defaultMin: 25, color: '#FF453A', glow: 'rgba(255,69,58,0.28)',   icon: '🍅' },
  shortBreak: { label: 'Kurze Pause', defaultMin: 5,  color: '#34D399', glow: 'rgba(52,211,153,0.28)',  icon: '☕' },
  longBreak:  { label: 'Lange Pause', defaultMin: 15, color: '#5B8CF5', glow: 'rgba(91,140,245,0.28)', icon: '🌿' },
};

function PomodoroTimer({ isDark, c }) {
  const todayKey = `vecturo-pomo-${todayISO()}`;

  const [mode, setMode] = useState('work');
  const [durations, setDurations] = useState(() => {
    const s = localStorage.getItem('vecturo-pomo-settings');
    return s ? JSON.parse(s) : { work: 25, shortBreak: 5, longBreak: 15 };
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const s = localStorage.getItem('vecturo-pomo-settings');
    const d = s ? JSON.parse(s) : { work: 25 };
    return (d.work || 25) * 60;
  });
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(() => parseInt(localStorage.getItem(todayKey) || '0', 10));
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(durations);

  const cfg = POMO[mode];
  const totalTime = durations[mode] * 60;
  const R = 88;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - (totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0));
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const cyclePos = sessions % 4;

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const id = setTimeout(() => {
      const next = timeLeft - 1;
      setTimeLeft(next);
      if (next <= 0) {
        setRunning(false);
        if (mode === 'work') {
          setSessions(s => {
            const n = s + 1;
            localStorage.setItem(todayKey, String(n));
            return n;
          });
          toast.success('🍅 Pomodoro fertig! Verdiene dir eine Pause.', { duration: 4000 });
        } else {
          toast.success('🎯 Pause vorbei! Weiter geht\'s.', { duration: 3000 });
        }
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [running, timeLeft, mode, todayKey]);

  const switchMode = m => {
    setMode(m);
    setRunning(false);
    setTimeLeft(durations[m] * 60);
  };

  const reset = () => { setRunning(false); setTimeLeft(durations[mode] * 60); };

  const saveSettings = () => {
    setDurations(settingsDraft);
    localStorage.setItem('vecturo-pomo-settings', JSON.stringify(settingsDraft));
    setTimeLeft(settingsDraft[mode] * 60);
    setShowSettings(false);
  };

  const iconBtn = (title, onClick, children) => (
    <button onClick={onClick} title={title}
      style={{
        width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
        color: c.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s', flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}
      onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}
    >{children}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: '32px 24px' }}>
      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
        {Object.entries(POMO).map(([key, m]) => (
          <button key={key} onClick={() => switchMode(key)}
            style={{
              padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: mode === key ? m.color : 'transparent',
              color: mode === key ? '#fff' : c.textSecondary,
              fontSize: 13, fontWeight: 500,
              boxShadow: mode === key ? `0 2px 14px ${m.glow}` : 'none',
              transition: 'all 0.2s',
            }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div style={{ position: 'relative', width: 240, height: 240 }}>
        {running && (
          <div style={{
            position: 'absolute', inset: -24, borderRadius: '50%',
            background: cfg.glow, filter: 'blur(44px)',
            animation: 'glowPulse 2.2s ease-in-out infinite',
          }} />
        )}
        <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="120" cy="120" r={R} fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'} strokeWidth="10" />
          <circle cx="120" cy="120" r={R} fill="none"
            stroke={cfg.color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.35s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <div style={{
            fontSize: 56, fontWeight: 700, letterSpacing: '-0.05em',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            color: running ? cfg.color : c.text,
            transition: 'color 0.35s',
          }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 12, color: c.textTertiary, fontWeight: 500 }}>{cfg.label}</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {iconBtn('Zurücksetzen', reset, <RotateCcw size={18} />)}
        <button
          onClick={() => setRunning(r => !r)}
          style={{
            width: 68, height: 68, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}bb)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 28px ${cfg.glow}`,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = `0 6px 36px ${cfg.glow}`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 28px ${cfg.glow}`; }}
        >
          {running
            ? <Square size={22} color="#fff" fill="#fff" />
            : <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />}
        </button>
        {iconBtn('Überspringen', () => switchMode(mode === 'work' ? 'shortBreak' : 'work'), <SkipForward size={18} />)}
        {iconBtn('Einstellungen', () => setShowSettings(s => !s), <Settings2 size={18} />)}
      </div>

      {/* Session dots */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            background: i < cyclePos ? '#FF453A' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
            boxShadow: i < cyclePos ? '0 0 7px rgba(255,69,58,0.55)' : 'none',
            transition: 'all 0.3s',
          }} />
        ))}
        <span style={{ fontSize: 13, color: c.textTertiary, marginLeft: 4 }}>
          {sessions} 🍅 heute
        </span>
      </div>

      {/* Settings */}
      {showSettings && (
        <div style={{ ...glass(isDark), padding: '20px 24px', width: '100%', maxWidth: 360, animation: 'slideUp 0.25s ease' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: '0 0 16px' }}>Timer-Einstellungen</h3>
          {Object.entries(POMO).map(([key, m]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: c.text }}>{m.icon} {m.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setSettingsDraft(d => ({ ...d, [key]: Math.max(1, d[key] - 1) }))}
                  style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: 'none', cursor: 'pointer', color: c.text, fontSize: 16, fontFamily: 'inherit' }}>
                  −
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 28, textAlign: 'center', color: c.text, fontVariantNumeric: 'tabular-nums' }}>
                  {settingsDraft[key]}
                </span>
                <button
                  onClick={() => setSettingsDraft(d => ({ ...d, [key]: d[key] + 1 }))}
                  style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: 'none', cursor: 'pointer', color: c.text, fontSize: 16, fontFamily: 'inherit' }}>
                  +
                </button>
                <span style={{ fontSize: 12, color: c.textTertiary }}>min</span>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowSettings(false)} className="btn-secondary" style={{ flex: 1 }}>Abbrechen</button>
            <button onClick={saveSettings} className="btn-primary" style={{ flex: 1 }}>Speichern</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stats Section ──────────────────────────────────────────────────────────────

function StatsSection({ entries, summary, isDark, c }) {
  const weekData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const sec = entries.filter(e => new Date(e.start_time).toISOString().slice(0, 10) === ds)
        .reduce((s, e) => s + (e.duration || 0), 0);
      days.push({ day: d.toLocaleDateString('de-DE', { weekday: 'short' }), hours: Math.round(sec / 360) / 10, isToday: i === 0 });
    }
    return days;
  }, [entries]);

  const projectBreakdown = useMemo(() => {
    const t = {};
    for (const e of entries) {
      const k = e.project_name || 'Kein Projekt';
      t[k] = (t[k] || 0) + (e.duration || 0);
    }
    return Object.entries(t).map(([name, sec]) => ({ name, hours: Math.round(sec / 360) / 10 }))
      .sort((a, b) => b.hours - a.hours).slice(0, 6);
  }, [entries]);

  const maxPH = projectBreakdown[0]?.hours || 1;

  const [dailyGoal, setDailyGoal] = useState(() => parseInt(localStorage.getItem('vecturo-daily-goal') || '8', 10));
  const [editGoal, setEditGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(dailyGoal);
  const todayH = (summary?.today_sec || 0) / 3600;
  const goalPct = Math.min(1, todayH / dailyGoal);

  const STATS_CARDS = [
    { label: 'Heute',       value: fmtSecLong(summary?.today_sec), color: '#5B8CF5', glow: 'rgba(91,140,245,0.15)' },
    { label: 'Diese Woche', value: fmtSecLong(summary?.week_sec),  color: '#BF5AF2', glow: 'rgba(191,90,242,0.15)' },
    { label: 'Dieser Monat',value: fmtSecLong(summary?.month_sec), color: '#34D399', glow: 'rgba(52,211,153,0.15)' },
    { label: 'Einträge',    value: entries.length,                 color: '#FF9F0A', glow: 'rgba(255,159,10,0.15)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="anim-grid">
        {STATS_CARDS.map(({ label, value, color, glow }) => (
          <div key={label} style={{
            ...glass(isDark), padding: '18px 20px',
            boxShadow: `0 0 30px ${glow}, ${isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.06)'}`,
          }}>
            <div style={{
              fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, lineHeight: 1.1,
              background: `linear-gradient(135deg, ${color} 0%, ${color}70 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.38)', fontWeight: 500 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Weekly chart */}
        <div style={{ ...glass(isDark), padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 20 }}>Aktivität – letzte 7 Tage</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekData} barSize={28}>
              <XAxis dataKey="day" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: c.textTertiary, fontFamily: 'inherit' }} />
              <YAxis hide />
              <Tooltip
                formatter={v => [`${v}h`, 'Stunden']}
                contentStyle={{
                  background: isDark ? '#1C1C1E' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 10, fontSize: 12, fontFamily: 'inherit',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', radius: 6 }}
              />
              <Bar dataKey="hours" radius={[6, 6, 2, 2]}>
                {weekData.map((d, i) => (
                  <Cell key={i} fill={d.isToday ? '#5B8CF5' : (isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.1)')} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Daily goal */}
          <div style={{ ...glass(isDark), padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={14} color="#FF9F0A" /> Tagesziel
              </div>
              {editGoal ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" min="1" max="24" value={goalDraft} onChange={e => setGoalDraft(parseInt(e.target.value) || 8)}
                    style={{ width: 48, padding: '4px 8px', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: c.text, fontSize: 13, textAlign: 'center', fontFamily: 'inherit' }} />
                  <button onClick={() => { setDailyGoal(goalDraft); localStorage.setItem('vecturo-daily-goal', String(goalDraft)); setEditGoal(false); }}
                    style={{ padding: '4px 8px', borderRadius: 8, border: 'none', background: '#5B8CF5', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setGoalDraft(dailyGoal); setEditGoal(true); }}
                  style={{ fontSize: 12, color: c.textTertiary, border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit' }}>
                  {dailyGoal}h ändern
                </button>
              )}
            </div>
            <div style={{ height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: goalPct >= 1 ? 'linear-gradient(90deg, #34D399, #3DD68C)' : 'linear-gradient(90deg, #5B8CF5, #BF5AF2)',
                width: `${goalPct * 100}%`, transition: 'width 0.7s ease',
                boxShadow: goalPct >= 1 ? '0 0 8px rgba(52,211,153,0.5)' : '0 0 8px rgba(91,140,245,0.35)',
              }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: c.textTertiary }}>
              {Math.round(todayH * 10) / 10}h von {dailyGoal}h
              {goalPct >= 1 && <span style={{ color: '#34D399', marginLeft: 6, fontWeight: 600 }}>🎉 Ziel erreicht!</span>}
            </div>
          </div>

          {/* Project breakdown */}
          <div style={{ ...glass(isDark), padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 14 }}>Projekte</div>
            {projectBreakdown.length === 0 ? (
              <div style={{ fontSize: 13, color: c.textTertiary }}>Noch keine Einträge</div>
            ) : projectBreakdown.map(({ name, hours }, i) => (
              <div key={name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: c.text, fontWeight: 500 }}>{name}</span>
                  <span style={{ fontSize: 12, color: c.textTertiary, fontVariantNumeric: 'tabular-nums' }}>{hours}h</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: ACCENT[i % ACCENT.length], width: `${(hours / maxPH) * 100}%`, transition: 'width 0.7s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Daily Tasks ────────────────────────────────────────────────────────────────

function DailyTasks({ isDark, c }) {
  const today = todayISO();
  const KEY = 'vecturo-daily-tasks-v2';

  const [tasks, setTasks] = useState(() => {
    const s = localStorage.getItem(KEY);
    if (!s) return { date: today, items: [] };
    const p = JSON.parse(s);
    if (p.date !== today) return { date: today, items: p.items.map(t => ({ ...t, done: false })) };
    return p;
  });
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('');

  const save = updated => { setTasks(updated); localStorage.setItem(KEY, JSON.stringify(updated)); };
  const add = () => {
    if (!newTask.trim()) return;
    save({ ...tasks, items: [...tasks.items, { id: Date.now(), text: newTask.trim(), time: newTime, done: false }] });
    setNewTask(''); setNewTime('');
  };
  const toggle = id => save({ ...tasks, items: tasks.items.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  const remove = id => save({ ...tasks, items: tasks.items.filter(t => t.id !== id) });

  const done = tasks.items.filter(t => t.done).length;
  const total = tasks.items.length;
  const sorted = [...tasks.items].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return a.time ? -1 : b.time ? 1 : 0;
  });

  return (
    <div>
      {total > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
              {done === total && total > 0 ? '🎉 Alles erledigt!' : `${done} / ${total} erledigt`}
            </span>
            <span style={{ fontSize: 12, color: c.textTertiary }}>{Math.round((done / total) * 100)}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: done === total ? 'linear-gradient(90deg, #34D399, #3DD68C)' : 'linear-gradient(90deg, #5B8CF5, #BF5AF2)',
              width: `${total > 0 ? (done / total) * 100 : 0}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {sorted.map(task => (
          <div key={task.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
            background: task.done
              ? (isDark ? 'rgba(52,211,153,0.07)' : 'rgba(52,199,89,0.07)')
              : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
            border: `1px solid ${task.done ? 'rgba(52,211,153,0.18)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')}`,
            transition: 'all 0.2s',
          }}>
            <button onClick={() => toggle(task.id)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: task.done ? '#34D399' : c.textTertiary, flexShrink: 0 }}>
              {task.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            {task.time && (
              <span style={{ fontSize: 11, color: '#5B8CF5', fontWeight: 700, minWidth: 36, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {task.time}
              </span>
            )}
            <span style={{ flex: 1, fontSize: 14, color: task.done ? c.textTertiary : c.text, textDecoration: task.done ? 'line-through' : 'none', transition: 'all 0.2s' }}>
              {task.text}
            </span>
            <button onClick={() => remove(task.id)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: c.textTertiary, opacity: 0.45, flexShrink: 0, transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.45}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
          style={{
            width: 92, padding: '9px 10px', borderRadius: 10, fontSize: 13,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            color: c.text, fontFamily: 'inherit', outline: 'none',
          }}
        />
        <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Neue Aufgabe hinzufügen…"
          style={{
            flex: 1, padding: '9px 14px', borderRadius: 10, fontSize: 13,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            color: c.text, fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button onClick={add} style={{
          padding: '9px 16px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #5B8CF5, #7B5AF5)',
          color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 10px rgba(91,140,245,0.35)',
        }}>
          <Plus size={14} />
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: c.textTertiary }}>
        Aufgaben behalten sich täglich. Uhrzeiten helfen beim Sortieren.
      </div>
    </div>
  );
}

// ── Entry Row ──────────────────────────────────────────────────────────────────

function EntryRow({ entry, onDelete, onEdit, isDark, c }) {
  const [hovered, setHovered] = useState(false);
  const isRunning = !entry.end_time;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        background: hovered ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {isRunning && (
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: '#5B8CF5', flexShrink: 0,
          boxShadow: '0 0 7px rgba(91,140,245,0.7)', animation: 'glowPulse 2s ease-in-out infinite',
        }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: c.text }}>
          {entry.description || <span style={{ color: c.textTertiary, fontStyle: 'italic' }}>Keine Beschreibung</span>}
        </div>
        {entry.project_name && (
          <div style={{ fontSize: 12, color: '#5B8CF5', marginTop: 2, fontWeight: 600 }}>{entry.project_name}</div>
        )}
      </div>
      <div style={{ fontSize: 12, color: c.textTertiary, whiteSpace: 'nowrap' }}>
        {fmtTime(entry.start_time)}{entry.end_time ? ` – ${fmtTime(entry.end_time)}` : (
          <span style={{ color: '#5B8CF5' }}> – läuft</span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isRunning ? '#5B8CF5' : c.text, minWidth: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {isRunning ? '–' : fmtSec(entry.duration)}
      </div>
      <div style={{ display: 'flex', gap: 2, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
        <button onClick={() => onEdit(entry)}
          style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: c.textSecondary, transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          title="Bearbeiten"
        >
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(entry.id)}
          style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: c.textSecondary, transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,69,58,0.15)' : 'rgba(255,59,48,0.08)'; e.currentTarget.style.color = '#FF453A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = c.textSecondary; }}
          title="Löschen"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Fahrt Row ──────────────────────────────────────────────────────────────────

function FahrtRow({ f, isLast, onEdit, onDelete, isDark, c }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderBottom: isLast ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`, background: hovered ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent', transition: 'background 0.15s' }}
    >
      <td className="table-cell" style={{ paddingLeft: 16, fontSize: 12, color: c.textTertiary, whiteSpace: 'nowrap' }}>
        {new Date(f.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
      </td>
      <td className="table-cell">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <MapPin size={12} color={c.textTertiary} />
          {f.from_loc && f.to_loc ? `${f.from_loc} → ${f.to_loc}` : (f.from_loc || f.to_loc || '–')}
        </div>
        {f.notes && <div style={{ fontSize: 11, color: c.textTertiary, marginTop: 2 }}>{f.notes}</div>}
      </td>
      <td className="table-cell" style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: c.text }}>
        {f.distance_km > 0 ? `${Number(f.distance_km).toLocaleString('de-DE')} km` : '–'}
      </td>
      <td className="table-cell" style={{ fontSize: 12, color: c.textTertiary }}>{f.purpose || '–'}</td>
      <td className="table-cell" style={{ fontSize: 12, color: '#5B8CF5', fontWeight: 500 }}>
        {f.project_name || <span style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>–</span>}
      </td>
      <td className="table-cell" style={{ paddingRight: 12 }}>
        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button onClick={() => onEdit(f)}
            style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: c.textSecondary, transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(f.id)}
            style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: c.textSecondary, transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,69,58,0.15)' : 'rgba(255,59,48,0.08)'; e.currentTarget.style.color = '#FF453A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = c.textSecondary; }}>
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Manual Entry Form ──────────────────────────────────────────────────────────

function ManualEntryForm({ projects, onSave, onCancel, initial = null, isDark, c }) {
  const today = nowLocalDatetime().slice(0, 10);
  const [form, setForm] = useState(initial ? {
    project_id: initial.project_id || null,
    description: initial.description || '',
    date: new Date(initial.start_time).toISOString().slice(0, 10),
    start: fmtTime(initial.start_time),
    end: initial.end_time ? fmtTime(initial.end_time) : '',
  } : { project_id: null, description: '', date: today, start: '', end: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.date || !form.start) { toast.error('Datum und Startzeit sind erforderlich'); return; }
    const startTime = new Date(`${form.date}T${form.start}:00`).toISOString();
    const endTime = form.end ? new Date(`${form.date}T${form.end}:00`).toISOString() : null;
    if (endTime && new Date(endTime) <= new Date(startTime)) { toast.error('Endzeit muss nach Startzeit liegen'); return; }
    onSave({ project_id: form.project_id, description: form.description, start_time: startTime, end_time: endTime });
  };

  const labelStyle = { fontSize: 11, fontWeight: 700, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };

  return (
    <div style={{ ...glass(isDark), padding: '18px 20px', marginBottom: 16, animation: 'slideUp 0.25s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        {[['Datum', 'date', 'date'], ['Start', 'start', 'time'], ['Ende', 'end', 'time']].map(([lbl, key, type]) => (
          <div key={key}>
            <label style={labelStyle}>{lbl}</label>
            <input type={type} className="input" value={form[key]} onChange={e => set(key, e.target.value)} style={{ fontSize: 13 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 14, alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Beschreibung</label>
          <input className="input" placeholder="Woran gearbeitet?" value={form.description} onChange={e => set('description', e.target.value)} style={{ fontSize: 13 }} />
        </div>
        <div>
          <label style={labelStyle}>Projekt</label>
          <ProjectPicker value={form.project_id} onChange={v => set('project_id', v)} projects={projects} isDark={isDark} c={c} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn-secondary">Abbrechen</button>
        <button onClick={handleSave} className="btn-primary"><Check size={14} /> Speichern</button>
      </div>
    </div>
  );
}

// ── Fahrt Form ─────────────────────────────────────────────────────────────────

function FahrtForm({ projects, onSave, onCancel, initial = null, isDark, c }) {
  const [form, setForm] = useState(initial || { project_id: null, date: todayISO(), from_loc: '', to_loc: '', distance_km: '', purpose: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const labelStyle = { fontSize: 11, fontWeight: 700, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };

  const handleSave = () => {
    if (!form.date) { toast.error('Datum ist erforderlich'); return; }
    if (!form.from_loc && !form.to_loc) { toast.error('Von oder Nach ist erforderlich'); return; }
    onSave({ ...form, distance_km: parseFloat(form.distance_km) || 0 });
  };

  return (
    <div style={{ ...glass(isDark), padding: '18px 20px', marginBottom: 16, animation: 'slideUp 0.25s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        {[['Datum', 'date', 'date', ''], ['Von', 'from_loc', 'text', 'Hamburg'], ['Nach', 'to_loc', 'text', 'Berlin']].map(([lbl, key, type, ph]) => (
          <div key={key}>
            <label style={labelStyle}>{lbl}</label>
            <input type={type} className="input" placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} style={{ fontSize: 13 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 14, alignItems: 'end' }}>
        {[['Kilometer', 'distance_km', 'number', '0'], ['Zweck', 'purpose', 'text', 'Kundentermin'], ['Notiz', 'notes', 'text', 'Optional']].map(([lbl, key, type, ph]) => (
          <div key={key}>
            <label style={labelStyle}>{lbl}</label>
            <input type={type} className="input" placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} style={{ fontSize: 13 }} />
          </div>
        ))}
        <div>
          <label style={labelStyle}>Projekt</label>
          <ProjectPicker value={form.project_id} onChange={v => set('project_id', v)} projects={projects} isDark={isDark} c={c} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn-secondary">Abbrechen</button>
        <button onClick={handleSave} className="btn-primary"><Check size={14} /> Speichern</button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TimeTracking() {
  const { c, isDark } = useTheme();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [tab, setTab] = useState('time');
  const [showManual, setShowManual] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [showFahrForm, setShowFahrForm] = useState(false);
  const [editFahr, setEditFahr] = useState(null);
  const [fahrtMonth, setFahrtMonth] = useState(new Date().toISOString().slice(0, 7));
  const [collapsedDays, setCollapsedDays] = useState({});

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list().then(r => r.data) });
  const { data: activeTimer } = useQuery({ queryKey: ['timer-active'], queryFn: timeApi.timerActive, refetchInterval: 30000 });
  const { data: entries = [], isLoading: loadingEntries } = useQuery({ queryKey: ['time-entries'], queryFn: () => timeApi.list() });
  const { data: summary } = useQuery({ queryKey: ['time-summary'], queryFn: timeApi.summary });
  const { data: fahrten = [], isLoading: loadingFahrten } = useQuery({ queryKey: ['fahrtenbuch', fahrtMonth], queryFn: () => fahrtenbuchApi.list({ month: fahrtMonth }) });

  const inv = keys => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const startTimer = useMutation({ mutationFn: timeApi.timerStart, onSuccess: () => inv(['timer-active', 'time-entries', 'time-summary']), onError: () => toast.error('Timer konnte nicht gestartet werden') });
  const stopTimer  = useMutation({ mutationFn: timeApi.timerStop,  onSuccess: () => { inv(['timer-active', 'time-entries', 'time-summary']); toast.success('Eintrag gespeichert'); }, onError: () => toast.error('Fehler beim Stoppen') });

  const createEntry = useMutation({ mutationFn: timeApi.create,                     onSuccess: () => { inv(['time-entries', 'time-summary']); setShowManual(false); toast.success('Eintrag hinzugefügt'); }, onError: () => toast.error('Fehler') });
  const updateEntry = useMutation({ mutationFn: ({ id, data }) => timeApi.update(id, data), onSuccess: () => { inv(['time-entries', 'time-summary']); setEditEntry(null); toast.success('Eintrag aktualisiert'); }, onError: () => toast.error('Fehler') });
  const deleteEntry = useMutation({ mutationFn: timeApi.delete,                     onSuccess: () => { inv(['time-entries', 'time-summary']); toast.success('Eintrag gelöscht'); }, onError: () => toast.error('Fehler') });

  const createFahr = useMutation({ mutationFn: fahrtenbuchApi.create,                      onSuccess: () => { inv(['fahrtenbuch']); setShowFahrForm(false); toast.success('Fahrt gespeichert'); },   onError: () => toast.error('Fehler') });
  const updateFahr = useMutation({ mutationFn: ({ id, data }) => fahrtenbuchApi.update(id, data), onSuccess: () => { inv(['fahrtenbuch']); setEditFahr(null); toast.success('Fahrt aktualisiert'); },  onError: () => toast.error('Fehler') });
  const deleteFahr = useMutation({ mutationFn: fahrtenbuchApi.delete,                      onSuccess: () => { inv(['fahrtenbuch']); toast.success('Fahrt gelöscht'); },                               onError: () => toast.error('Fehler') });

  const handleDeleteEntry = async id => { if (await confirm('Eintrag wirklich löschen?', { title: 'Eintrag löschen' })) deleteEntry.mutate(id); };
  const handleDeleteFahr  = async id => { if (await confirm('Fahrt wirklich löschen?',   { title: 'Fahrt löschen'   })) deleteFahr.mutate(id);  };

  const grouped  = useMemo(() => groupByDate(entries), [entries]);
  const totalKm  = useMemo(() => fahrten.reduce((s, f) => s + (f.distance_km || 0), 0), [fahrten]);

  const TABS = [
    { key: 'time',        Icon: Clock,      label: 'Zeiteinträge' },
    { key: 'stats',       Icon: BarChart2,   label: 'Statistik' },
    { key: 'pomodoro',    Icon: Timer,       label: 'Pomodoro' },
    { key: 'tasks',       Icon: ListTodo,    label: 'Tagesplan' },
    { key: 'fahrtenbuch', Icon: Car,         label: 'Fahrtenbuch' },
  ];

  const PILLS = [
    { label: 'Heute', value: fmtSecLong(summary?.today_sec), color: '#5B8CF5' },
    { label: 'Woche', value: fmtSecLong(summary?.week_sec),  color: '#BF5AF2' },
    { label: 'Monat', value: fmtSecLong(summary?.month_sec), color: '#34D399' },
  ];

  return (
    <div style={{ padding: '32px 32px 72px', maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-8%', left: '25%', width: 550, height: 550, background: 'rgba(91,140,245,0.05)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 420, height: 420, background: 'rgba(191,90,242,0.04)', borderRadius: '50%', filter: 'blur(110px)' }} />
        {activeTimer && <div style={{ position: 'absolute', top: '12%', left: '8%', width: 320, height: 320, background: 'rgba(91,140,245,0.07)', borderRadius: '50%', filter: 'blur(90px)', animation: 'glowPulse 3s ease-in-out infinite' }} />}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.32)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>
            Vecturo
          </p>
          <h1 style={{
            margin: '0 0 14px', fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.45) 100%)'
              : 'linear-gradient(135deg, #1D1D1F 0%, #6E6E73 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Zeiterfassung
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PILLS.map(({ label, value, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '5px 14px',
                borderRadius: 980,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
              }}>
                <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timer Bar */}
        <TimerBar
          activeTimer={activeTimer} projects={projects}
          onStart={data => startTimer.mutate(data)}
          onStop={id => stopTimer.mutate(id)}
          isDark={isDark} c={c}
        />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
          {TABS.map(({ key, Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                border: 'none', cursor: 'pointer', background: 'none', fontFamily: 'inherit',
                fontSize: 13, fontWeight: tab === key ? 600 : 500,
                color: tab === key ? (isDark ? '#fff' : '#1D1D1F') : c.textTertiary,
                borderBottom: `2px solid ${tab === key ? '#5B8CF5' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (tab !== key) e.currentTarget.style.color = c.textSecondary; }}
              onMouseLeave={e => { if (tab !== key) e.currentTarget.style.color = c.textTertiary; }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div key={tab} style={{ animation: 'tabIn 0.28s ease' }}>

          {/* ── Zeiteinträge ── */}
          {tab === 'time' && (
            <div>
              {!showManual && !editEntry && (
                <button onClick={() => setShowManual(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
                    padding: '8px 18px', borderRadius: 980,
                    border: `1px dashed ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`,
                    background: 'transparent', cursor: 'pointer', fontSize: 13, color: c.textTertiary,
                    transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B8CF5'; e.currentTarget.style.color = '#5B8CF5'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'; e.currentTarget.style.color = c.textTertiary; }}
                >
                  <Plus size={14} /> Manuell eintragen
                </button>
              )}
              {showManual && <ManualEntryForm projects={projects} onSave={d => createEntry.mutate(d)} onCancel={() => setShowManual(false)} isDark={isDark} c={c} />}
              {editEntry && <ManualEntryForm projects={projects} initial={editEntry} onSave={d => updateEntry.mutate({ id: editEntry.id, data: d })} onCancel={() => setEditEntry(null)} isDark={isDark} c={c} />}

              {loadingEntries ? (
                <div style={{ ...glass(isDark), overflow: 'hidden' }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: i < 3 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none' }}>
                      <div className="skeleton h-4" style={{ flex: 1 }} /><div className="skeleton h-4" style={{ width: 80 }} /><div className="skeleton h-4" style={{ width: 60 }} />
                    </div>
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div style={{ ...glass(isDark), textAlign: 'center', padding: '60px 24px' }}>
                  <div style={{ width: 52, height: 52, background: 'rgba(91,140,245,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(91,140,245,0.2)' }}>
                    <Clock size={22} color="#5B8CF5" />
                  </div>
                  <p style={{ fontWeight: 600, color: c.text, marginBottom: 6, fontSize: 15 }}>Noch keine Einträge</p>
                  <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 24 }}>Starte den Timer oder trag Zeit manuell ein.</p>
                  <button onClick={() => setShowManual(true)} className="btn-primary" style={{ margin: '0 auto' }}><Plus size={14} /> Eintrag hinzufügen</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {grouped.map(([date, dayEntries]) => {
                    const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
                    const isToday = date === todayISO();
                    const collapsed = collapsedDays[date];
                    return (
                      <div key={date} style={{ ...glass(isDark), overflow: 'hidden' }}>
                        <button
                          onClick={() => setCollapsedDays(prev => ({ ...prev, [date]: !prev[date] }))}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '11px 16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                            borderBottom: collapsed ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {collapsed ? <ChevronRight size={14} color={c.textTertiary} /> : <ChevronDown size={14} color={c.textTertiary} />}
                            <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                              {isToday ? 'Heute' : fmtDate(date)}
                            </span>
                            {isToday && (
                              <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 980, background: 'rgba(91,140,245,0.12)', color: '#5B8CF5', fontWeight: 700 }}>
                                Heute
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: c.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtSec(dayTotal)}
                          </span>
                        </button>
                        {!collapsed && dayEntries.map(entry => (
                          <EntryRow key={entry.id} entry={entry}
                            onDelete={handleDeleteEntry}
                            onEdit={e => { setEditEntry(e); setShowManual(false); }}
                            isDark={isDark} c={c}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Statistik ── */}
          {tab === 'stats' && <StatsSection entries={entries} summary={summary} isDark={isDark} c={c} />}

          {/* ── Pomodoro ── */}
          {tab === 'pomodoro' && (
            <div style={{ ...glass(isDark), overflow: 'hidden' }}>
              <PomodoroTimer isDark={isDark} c={c} />
            </div>
          )}

          {/* ── Tagesplan ── */}
          {tab === 'tasks' && (
            <div style={{ ...glass(isDark), padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(91,140,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(91,140,245,0.2)', flexShrink: 0 }}>
                  <ListTodo size={16} color="#5B8CF5" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: c.text }}>Tagesplan</div>
                  <div style={{ fontSize: 12, color: c.textTertiary, marginTop: 1 }}>Aufgaben für heute · setzt sich täglich zurück</div>
                </div>
              </div>
              <DailyTasks isDark={isDark} c={c} />
            </div>
          )}

          {/* ── Fahrtenbuch ── */}
          {tab === 'fahrtenbuch' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="month" className="input" value={fahrtMonth} onChange={e => setFahrtMonth(e.target.value)} style={{ width: 160, fontSize: 13 }} />
                  {fahrten.length > 0 && (
                    <span style={{ fontSize: 13, color: c.textTertiary }}>
                      {totalKm.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km gesamt
                    </span>
                  )}
                </div>
                {!showFahrForm && !editFahr && (
                  <button onClick={() => setShowFahrForm(true)} className="btn-primary"><Plus size={14} /> Fahrt hinzufügen</button>
                )}
              </div>

              {showFahrForm && <FahrtForm projects={projects} onSave={d => createFahr.mutate(d)} onCancel={() => setShowFahrForm(false)} isDark={isDark} c={c} />}
              {editFahr && <FahrtForm projects={projects} initial={editFahr} onSave={d => updateFahr.mutate({ id: editFahr.id, data: d })} onCancel={() => setEditFahr(null)} isDark={isDark} c={c} />}

              {loadingFahrten ? (
                <div style={{ ...glass(isDark), overflow: 'hidden' }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: i < 2 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none' }}>
                      <div className="skeleton h-4" style={{ width: 80 }} /><div className="skeleton h-4" style={{ flex: 1 }} /><div className="skeleton h-4" style={{ width: 60 }} />
                    </div>
                  ))}
                </div>
              ) : fahrten.length === 0 ? (
                <div style={{ ...glass(isDark), textAlign: 'center', padding: '60px 24px' }}>
                  <div style={{ width: 52, height: 52, background: 'rgba(91,140,245,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(91,140,245,0.2)' }}>
                    <Car size={22} color="#5B8CF5" />
                  </div>
                  <p style={{ fontWeight: 600, color: c.text, marginBottom: 6 }}>Keine Fahrten in diesem Monat</p>
                  <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 24 }}>Trage deine erste Fahrt ein.</p>
                  <button onClick={() => setShowFahrForm(true)} className="btn-primary" style={{ margin: '0 auto' }}><Plus size={14} /> Fahrt hinzufügen</button>
                </div>
              ) : (
                <div style={{ ...glass(isDark), overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                        {['Datum', 'Route', 'km', 'Zweck', 'Projekt', ''].map((h, i) => (
                          <th key={i} className="table-header-cell" style={{ paddingLeft: i === 0 ? 16 : undefined, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.textTertiary, fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fahrten.map((f, i) => (
                        <FahrtRow key={f.id} f={f} isLast={i === fahrten.length - 1}
                          onEdit={row => { setEditFahr(row); setShowFahrForm(false); }}
                          onDelete={handleDeleteFahr}
                          isDark={isDark} c={c}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {ConfirmDialogNode}
    </div>
  );
}
