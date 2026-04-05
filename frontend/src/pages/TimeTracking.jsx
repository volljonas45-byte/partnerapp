import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, Play, Square, Plus, Trash2, Pencil, X, Check,
  Car, ChevronDown, ChevronRight, MapPin, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { timeApi, fahrtenbuchApi } from '../api/time';
import { projectsApi } from '../api/projects';
import { useConfirm } from '../hooks/useConfirm';
import { useTheme } from '../context/ThemeContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const offset = now.getTimezoneOffset();
  return new Date(now - offset * 60000).toISOString().slice(0, 16);
}

// ── Project Picker ────────────────────────────────────────────────────────────

function ProjectPicker({ value, onChange, projects, placeholder = 'Kein Projekt' }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = projects.find(p => p.id === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 10, border: 'none',
          background: 'rgba(118,118,128,0.10)', cursor: 'pointer',
          fontSize: 13, color: selected ? '#1D1D1F' : '#86868B',
          whiteSpace: 'nowrap',
        }}
      >
        {selected ? selected.name : placeholder}
        <ChevronDown size={13} style={{ color: c.textSecondary }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
          background: c.card, borderRadius: 12, minWidth: 200, maxHeight: 260, overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: `1px solid ${c.borderSubtle}`,
        }}>
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '9px 14px', border: 'none', background: 'none',
              fontSize: 13, cursor: 'pointer', color: c.textSecondary,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Kein Projekt
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', border: 'none', background: 'none',
                fontSize: 13, cursor: 'pointer', color: c.text,
                fontWeight: value === p.id ? '500' : '400',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
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

// ── Timer Bar ─────────────────────────────────────────────────────────────────

function TimerBar({ activeTimer, projects, onStart, onStop }) {
  const { c } = useTheme();
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

  const handleStart = () => {
    onStart({ project_id: projectId, description: desc });
    setDesc('');
  };

  const isRunning = !!activeTimer;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 20px', background: c.card,
      borderRadius: 16, marginBottom: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
    }}>
      {/* Live clock */}
      {isRunning && (
        <div style={{
          fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600,
          color: '#0071E3', letterSpacing: '-0.02em', minWidth: 90,
        }}>
          {fmtSec(elapsed)}
        </div>
      )}

      {/* Description */}
      <input
        className="input"
        placeholder={isRunning ? activeTimer.description || 'Woran arbeitest du?' : 'Woran arbeitest du?'}
        value={isRunning ? (activeTimer.description || '') : desc}
        onChange={e => !isRunning && setDesc(e.target.value)}
        readOnly={isRunning}
        onKeyDown={e => { if (e.key === 'Enter' && !isRunning) handleStart(); }}
        style={{ flex: 1, background: isRunning ? 'transparent' : undefined, fontSize: 14 }}
      />

      {/* Project picker */}
      <ProjectPicker
        value={isRunning ? activeTimer.project_id : projectId}
        onChange={isRunning ? undefined : setProjectId}
        projects={projects}
      />

      {/* Start / Stop */}
      {isRunning ? (
        <button
          onClick={() => onStop(activeTimer.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            borderRadius: 980, border: 'none', cursor: 'pointer',
            background: 'rgba(255,59,48,0.10)', color: '#FF3B30',
            fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
            transition: 'background 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,59,48,0.10)'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Square size={14} /> Stopp
        </button>
      ) : (
        <button
          onClick={handleStart}
          className="btn-primary"
        >
          <Play size={14} /> Start
        </button>
      )}
    </div>
  );
}

// ── Entry Row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, projects, onDelete, onEdit }) {
  const { c } = useTheme();
  const isRunning = !entry.end_time;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      className="group"
    >
      {/* Description + project */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: c.text, fontWeight: 400 }}>
          {entry.description || <span style={{ color: c.textSecondary }}>Keine Beschreibung</span>}
        </div>
        {entry.project_name && (
          <div style={{ fontSize: 12, color: '#0071E3', marginTop: 2 }}>{entry.project_name}</div>
        )}
      </div>

      {/* Time range */}
      <div style={{ fontSize: 13, color: c.textTertiary, whiteSpace: 'nowrap' }}>
        {fmtTime(entry.start_time)}
        {entry.end_time ? ` – ${fmtTime(entry.end_time)}` : (
          <span style={{ color: '#0071E3', fontWeight: 500 }}> – läuft ⏱</span>
        )}
      </div>

      {/* Duration */}
      <div style={{
        fontSize: 14, fontWeight: 500, color: isRunning ? '#0071E3' : '#1D1D1F',
        minWidth: 70, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
      }}>
        {isRunning ? '–' : fmtSec(entry.duration)}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}
        className="group-hover:opacity-100"
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
      >
        <button
          onClick={() => onEdit(entry)}
          style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: c.textSecondary }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F7'; e.currentTarget.style.color = '#1D1D1F'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#86868B'; }}
          title="Bearbeiten"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: c.textSecondary }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FFF0EF'; e.currentTarget.style.color = '#FF3B30'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#86868B'; }}
          title="Löschen"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Manual Entry Form ─────────────────────────────────────────────────────────

function ManualEntryForm({ projects, onSave, onCancel, initial = null }) {
  const { c } = useTheme();
  const today = nowLocalDatetime().slice(0, 10);
  const [form, setForm] = useState(initial ? {
    project_id: initial.project_id || null,
    description: initial.description || '',
    date: new Date(initial.start_time).toISOString().slice(0, 10),
    start: fmtTime(initial.start_time),
    end: initial.end_time ? fmtTime(initial.end_time) : '',
  } : {
    project_id: null,
    description: '',
    date: today,
    start: '',
    end: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.date || !form.start) { toast.error('Datum und Startzeit sind erforderlich'); return; }
    const startTime = new Date(`${form.date}T${form.start}:00`).toISOString();
    const endTime = form.end ? new Date(`${form.date}T${form.end}:00`).toISOString() : null;
    if (endTime && new Date(endTime) <= new Date(startTime)) {
      toast.error('Endzeit muss nach Startzeit liegen');
      return;
    }
    onSave({ project_id: form.project_id, description: form.description, start_time: startTime, end_time: endTime });
  };

  return (
    <div style={{
      background: c.card, borderRadius: 16, padding: 20, marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
    }} className="animate-slide-up">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label className="label">Datum</label>
          <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">Start</label>
          <input type="time" className="input" value={form.start} onChange={e => set('start', e.target.value)} />
        </div>
        <div>
          <label className="label">Ende</label>
          <input type="time" className="input" value={form.end} onChange={e => set('end', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 14 }}>
        <div>
          <label className="label">Beschreibung</label>
          <input className="input" placeholder="Woran gearbeitet?" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className="label">Projekt</label>
          <ProjectPicker value={form.project_id} onChange={v => set('project_id', v)} projects={projects} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn-secondary">Abbrechen</button>
        <button onClick={handleSave} className="btn-primary"><Check size={14} /> Speichern</button>
      </div>
    </div>
  );
}

// ── Fahrtenbuch Form ──────────────────────────────────────────────────────────

function FahrtForm({ projects, onSave, onCancel, initial = null }) {
  const { c } = useTheme();
  const [form, setForm] = useState(initial || {
    project_id: null, date: todayISO(), from_loc: '', to_loc: '',
    distance_km: '', purpose: '', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.date) { toast.error('Datum ist erforderlich'); return; }
    if (!form.from_loc && !form.to_loc) { toast.error('Von oder Nach ist erforderlich'); return; }
    onSave({ ...form, distance_km: parseFloat(form.distance_km) || 0 });
  };

  return (
    <div style={{
      background: c.card, borderRadius: 16, padding: 20, marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
    }} className="animate-slide-up">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label className="label">Datum</label>
          <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">Von</label>
          <input className="input" placeholder="Hamburg" value={form.from_loc} onChange={e => set('from_loc', e.target.value)} />
        </div>
        <div>
          <label className="label">Nach</label>
          <input className="input" placeholder="Berlin" value={form.to_loc} onChange={e => set('to_loc', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 14 }}>
        <div>
          <label className="label">Kilometer</label>
          <input type="number" className="input" placeholder="0" value={form.distance_km} onChange={e => set('distance_km', e.target.value)} />
        </div>
        <div>
          <label className="label">Zweck</label>
          <input className="input" placeholder="Kundentermin" value={form.purpose} onChange={e => set('purpose', e.target.value)} />
        </div>
        <div>
          <label className="label">Notiz</label>
          <input className="input" placeholder="Optional" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div>
          <label className="label">Projekt</label>
          <ProjectPicker value={form.project_id} onChange={v => set('project_id', v)} projects={projects} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn-secondary">Abbrechen</button>
        <button onClick={handleSave} className="btn-primary"><Check size={14} /> Speichern</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TimeTracking() {
  const { c, isDark } = useTheme();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [tab, setTab] = useState('time'); // 'time' | 'fahrtenbuch'
  const [showManual, setShowManual] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [showFahrForm, setShowFahrForm] = useState(false);
  const [editFahr, setEditFahr] = useState(null);
  const [fahrtMonth, setFahrtMonth] = useState(new Date().toISOString().slice(0, 7));
  const [collapsedDays, setCollapsedDays] = useState({});

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { data: activeTimer } = useQuery({
    queryKey: ['timer-active'],
    queryFn: timeApi.timerActive,
    refetchInterval: 30000, // refresh every 30s (in case of reload)
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['time-entries'],
    queryFn: () => timeApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['time-summary'],
    queryFn: timeApi.summary,
  });

  const { data: fahrten = [], isLoading: loadingFahrten } = useQuery({
    queryKey: ['fahrtenbuch', fahrtMonth],
    queryFn: () => fahrtenbuchApi.list({ month: fahrtMonth }),
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const startTimer = useMutation({
    mutationFn: timeApi.timerStart,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timer-active'] });
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['time-summary'] });
    },
    onError: () => toast.error('Timer konnte nicht gestartet werden'),
  });

  const stopTimer = useMutation({
    mutationFn: timeApi.timerStop,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timer-active'] });
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['time-summary'] });
      toast.success('Eintrag gespeichert');
    },
    onError: () => toast.error('Fehler beim Stoppen'),
  });

  const createEntry = useMutation({
    mutationFn: timeApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['time-summary'] });
      setShowManual(false);
      toast.success('Eintrag hinzugefügt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, data }) => timeApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['time-summary'] });
      setEditEntry(null);
      toast.success('Eintrag aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const deleteEntry = useMutation({
    mutationFn: timeApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['time-summary'] });
      toast.success('Eintrag gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  const createFahr = useMutation({
    mutationFn: fahrtenbuchApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fahrtenbuch'] });
      setShowFahrForm(false);
      toast.success('Fahrt gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const updateFahr = useMutation({
    mutationFn: ({ id, data }) => fahrtenbuchApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fahrtenbuch'] });
      setEditFahr(null);
      toast.success('Fahrt aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const deleteFahr = useMutation({
    mutationFn: fahrtenbuchApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fahrtenbuch'] });
      toast.success('Fahrt gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDeleteEntry = async (id) => {
    const ok = await confirm('Eintrag wirklich löschen?', { title: 'Eintrag löschen' });
    if (ok) deleteEntry.mutate(id);
  };

  const handleDeleteFahr = async (id) => {
    const ok = await confirm('Fahrt wirklich löschen?', { title: 'Fahrt löschen' });
    if (ok) deleteFahr.mutate(id);
  };

  // ── Grouped entries ─────────────────────────────────────────────────────────
  const grouped = useMemo(() => groupByDate(entries), [entries]);

  const totalKm = useMemo(() => fahrten.reduce((s, f) => s + (f.distance_km || 0), 0), [fahrten]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="page-title">Zeiterfassung</h1>
          <p className="page-subtitle" style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <span>Heute: <strong>{fmtSecLong(summary?.today_sec)}</strong></span>
            <span style={{ color: '#D2D2D7' }}>·</span>
            <span>Woche: <strong>{fmtSecLong(summary?.week_sec)}</strong></span>
            <span style={{ color: '#D2D2D7' }}>·</span>
            <span>Monat: <strong>{fmtSecLong(summary?.month_sec)}</strong></span>
          </p>
        </div>
      </div>

      {/* ── Timer bar ── */}
      <TimerBar
        activeTimer={activeTimer}
        projects={projects}
        onStart={data => startTimer.mutate(data)}
        onStop={id => stopTimer.mutate(id)}
      />

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(118,118,128,0.10)', borderRadius: 10, padding: 3, marginBottom: 20, alignSelf: 'flex-start', width: 'fit-content' }}>
        {[['time', Clock, 'Zeiteinträge'], ['fahrtenbuch', Car, 'Fahrtenbuch']].map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              background: tab === key ? '#fff' : 'transparent',
              color: tab === key ? '#1D1D1F' : '#6E6E73',
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Time Entries Tab ── */}
      {tab === 'time' && (
        <div>
          {/* Add manual entry */}
          {!showManual && !editEntry && (
            <button
              onClick={() => setShowManual(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
                padding: '8px 14px', borderRadius: 980, border: '1px dashed rgba(0,0,0,0.15)',
                background: 'transparent', cursor: 'pointer', fontSize: 13, color: c.textTertiary,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0071E3'; e.currentTarget.style.color = '#0071E3'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'; e.currentTarget.style.color = '#6E6E73'; }}
            >
              <Plus size={14} /> Manuell eintragen
            </button>
          )}

          {showManual && (
            <ManualEntryForm
              projects={projects}
              onSave={data => createEntry.mutate(data)}
              onCancel={() => setShowManual(false)}
            />
          )}

          {editEntry && (
            <ManualEntryForm
              projects={projects}
              initial={editEntry}
              onSave={data => updateEntry.mutate({ id: editEntry.id, data })}
              onCancel={() => setEditEntry(null)}
            />
          )}

          {/* Entries list */}
          {loadingEntries ? (
            <div className="card p-0 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <div className="skeleton h-4" style={{ flex: 1 }} />
                  <div className="skeleton h-4" style={{ width: 80 }} />
                  <div className="skeleton h-4" style={{ width: 60 }} />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 48, height: 48, background: 'rgba(0,113,227,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Clock size={22} color="#0071E3" />
              </div>
              <p style={{ fontWeight: 500, color: c.text, marginBottom: 4 }}>Noch keine Einträge</p>
              <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 20 }}>Starte den Timer oder trag Zeit manuell ein.</p>
              <button onClick={() => setShowManual(true)} className="btn-primary" style={{ margin: '0 auto' }}>
                <Plus size={14} /> Eintrag hinzufügen
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {grouped.map(([date, dayEntries]) => {
                const dayTotal = dayEntries.reduce((s, e) => s + (e.duration || 0), 0);
                const isToday = date === todayISO();
                const collapsed = collapsedDays[date];

                return (
                  <div key={date} className="card p-0 overflow-hidden">
                    {/* Day header */}
                    <button
                      onClick={() => setCollapsedDays(c => ({ ...c, [date]: !c[date] }))}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '10px 16px',
                        background: 'rgba(118,118,128,0.04)', border: 'none', cursor: 'pointer',
                        borderBottom: collapsed ? 'none' : '1px solid rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {collapsed ? <ChevronRight size={14} color="#86868B" /> : <ChevronDown size={14} color="#86868B" />}
                        <span style={{ fontSize: 13, fontWeight: 500, color: c.text }}>
                          {isToday ? 'Heute' : fmtDate(date)}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: c.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtSec(dayTotal)}
                      </span>
                    </button>

                    {/* Day entries */}
                    {!collapsed && dayEntries.map(entry => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        projects={projects}
                        onDelete={handleDeleteEntry}
                        onEdit={e => { setEditEntry(e); setShowManual(false); }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Fahrtenbuch Tab ── */}
      {tab === 'fahrtenbuch' && (
        <div>
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="month"
                className="input"
                value={fahrtMonth}
                onChange={e => setFahrtMonth(e.target.value)}
                style={{ width: 160 }}
              />
              {fahrten.length > 0 && (
                <span style={{ fontSize: 13, color: c.textTertiary }}>
                  {totalKm.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km gesamt
                </span>
              )}
            </div>
            {!showFahrForm && !editFahr && (
              <button onClick={() => setShowFahrForm(true)} className="btn-primary">
                <Plus size={14} /> Fahrt hinzufügen
              </button>
            )}
          </div>

          {showFahrForm && (
            <FahrtForm
              projects={projects}
              onSave={data => createFahr.mutate(data)}
              onCancel={() => setShowFahrForm(false)}
            />
          )}

          {editFahr && (
            <FahrtForm
              projects={projects}
              initial={editFahr}
              onSave={data => updateFahr.mutate({ id: editFahr.id, data })}
              onCancel={() => setEditFahr(null)}
            />
          )}

          {loadingFahrten ? (
            <div className="card p-0 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <div className="skeleton h-4" style={{ width: 80 }} />
                  <div className="skeleton h-4" style={{ flex: 1 }} />
                  <div className="skeleton h-4" style={{ width: 60 }} />
                </div>
              ))}
            </div>
          ) : fahrten.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 48, height: 48, background: 'rgba(0,113,227,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Car size={22} color="#0071E3" />
              </div>
              <p style={{ fontWeight: 500, color: c.text, marginBottom: 4 }}>Keine Fahrten in diesem Monat</p>
              <p style={{ fontSize: 13, color: c.textSecondary, marginBottom: 20 }}>Trage deine erste Fahrt ein.</p>
              <button onClick={() => setShowFahrForm(true)} className="btn-primary" style={{ margin: '0 auto' }}>
                <Plus size={14} /> Fahrt hinzufügen
              </button>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(118,118,128,0.06)', borderBottom: `1px solid ${c.borderSubtle}` }}>
                    {['Datum', 'Route', 'km', 'Zweck', 'Projekt', ''].map((h, i) => (
                      <th key={i} className="table-header-cell" style={{ paddingLeft: i === 0 ? 16 : undefined }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fahrten.map((f, i) => (
                    <tr
                      key={f.id}
                      style={{ borderBottom: i < fahrten.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                      className="group"
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="table-cell" style={{ paddingLeft: 16, fontSize: 13, color: c.textTertiary, whiteSpace: 'nowrap' }}>
                        {new Date(f.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                          <MapPin size={12} color="#86868B" />
                          {f.from_loc && f.to_loc ? `${f.from_loc} → ${f.to_loc}` : (f.from_loc || f.to_loc || '–')}
                        </div>
                        {f.notes && <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>{f.notes}</div>}
                      </td>
                      <td className="table-cell" style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {f.distance_km > 0 ? `${Number(f.distance_km).toLocaleString('de-DE')} km` : '–'}
                      </td>
                      <td className="table-cell" style={{ fontSize: 13, color: c.textTertiary }}>{f.purpose || '–'}</td>
                      <td className="table-cell" style={{ fontSize: 13, color: '#0071E3' }}>{f.project_name || <span style={{ color: '#D2D2D7' }}>–</span>}</td>
                      <td className="table-cell" style={{ paddingRight: 12 }}>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', opacity: 0, transition: 'opacity 0.15s' }}
                          className="group-hover:opacity-100"
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        >
                          <button
                            onClick={() => { setEditFahr(f); setShowFahrForm(false); }}
                            style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: c.textSecondary }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F7'; e.currentTarget.style.color = '#1D1D1F'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#86868B'; }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteFahr(f.id)}
                            style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: c.textSecondary }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#FFF0EF'; e.currentTarget.style.color = '#FF3B30'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#86868B'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {ConfirmDialogNode}
    </div>
  );
}
