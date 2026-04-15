import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  ChevronLeft, ChevronRight, Users, Briefcase,
  CheckCircle2, Circle, Clock, AlertTriangle,
} from 'lucide-react';
import { projectsApi } from '../api/projects';
import { timeApi } from '../api/time';
import { teamApi } from '../api/team';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHours(sec) {
  if (!sec) return '0h';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

// ── Calendar ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const HOURS    = Array.from({ length: 17 }, (_, i) => i + 6); // 6–22

function getWeekDays(date) {
  const d = new Date(date), dow = (d.getDay() + 6) % 7;
  const mon = new Date(d); mon.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => { const day = new Date(mon); day.setDate(mon.getDate() + i); return day; });
}
function parseLocal(str) { if (!str) return null; return new Date(str.replace('T', ' ').replace('Z', '')); }

function Calendar({ projects }) {
  const [view, setView]       = useState('month');
  const [current, setCurrent] = useState(new Date());
  const [popup, setPopup]     = useState(null);

  // Date range for data fetching
  const { rangeFrom, rangeTo } = useMemo(() => {
    if (view === 'month') {
      const y = current.getFullYear(), m = current.getMonth();
      return { rangeFrom: isoDate(new Date(y, m, 1)), rangeTo: isoDate(new Date(y, m + 1, 0)) };
    }
    if (view === 'week') {
      const days = getWeekDays(current);
      return { rangeFrom: isoDate(days[0]), rangeTo: isoDate(days[6]) };
    }
    return { rangeFrom: isoDate(current), rangeTo: isoDate(current) };
  }, [view, current]);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries-workspace', rangeFrom, rangeTo],
    queryFn: () => timeApi.list({ scope: 'workspace', from: rangeFrom, to: rangeTo }),
  });

  const navDate = (dir) => {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrent(d);
  };

  const periodLabel = useMemo(() => {
    if (view === 'month') return current.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const days = getWeekDays(current);
      const s = days[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
      const e = days[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
      return `${s} – ${e}`;
    }
    return current.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
  }, [view, current]);

  const today = isoDate(new Date());

  // Month view helpers
  const year = current.getFullYear(), month = current.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const rows = Math.ceil((startOffset + lastDay.getDate()) / 7);

  const eventMap = useMemo(() => {
    const map = {};
    const add = (dateStr, ev) => { if (!map[dateStr]) map[dateStr] = []; map[dateStr].push(ev); };
    for (const p of projects) {
      if (p.deadline) add(p.deadline.slice(0, 10), { type: 'deadline', label: p.name, color: '#FF3B30' });
    }
    for (const e of timeEntries) {
      if (e.start_time) {
        const h = e.duration ? Math.round(e.duration / 360) / 10 : null;
        add(e.start_time.slice(0, 10), {
          type: 'time',
          label: `${e.user_name || 'Zeit'}: ${h ? h + 'h' : '–'} ${e.project_name ? `(${e.project_name})` : ''}`.trim(),
          color: e.user_color || 'var(--color-blue)',
        });
      }
    }
    return map;
  }, [projects, timeEntries]);

  // Week/Day events with Date objects
  const timedEvents = useMemo(() => {
    const all = [];
    for (const p of projects) {
      if (!p.deadline) continue;
      all.push({ id: `dl-${p.id}`, title: `📅 ${p.name}`, _start: new Date(p.deadline + 'T00:00:00'), _end: null, _color: '#EF4444', all_day: true });
    }
    for (const e of timeEntries) {
      if (!e.start_time) continue;
      const start = parseLocal(e.start_time);
      const end   = e.end_time ? parseLocal(e.end_time) : null;
      const dur   = e.duration ? ` · ${Math.floor(e.duration / 3600)}h ${Math.floor((e.duration % 3600) / 60)}m` : '';
      all.push({ id: `t-${e.id}`, title: `${e.user_name || 'Zeit'}${e.project_name ? ' · ' + e.project_name : ''}${dur}`, _start: start, _end: end, _color: e.user_color || 'var(--color-blue)', all_day: false });
    }
    return all;
  }, [projects, timeEntries]);

  const HOUR_H = 52;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px', borderBottom: '1px solid var(--color-border-subtle)', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Kalender</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', background: 'var(--color-border-subtle)', borderRadius: 8, padding: 3, gap: 2 }}>
            {[['month','Monat'],['week','Woche'],['day','Tag']].map(([v, lbl]) => (
              <button key={v} onClick={() => { setView(v); setPopup(null); }}
                style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s', background: view === v ? '#fff' : 'transparent', color: view === v ? 'var(--color-text)' : 'var(--color-text-secondary)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {lbl}
              </button>
            ))}
          </div>
          <button onClick={() => navDate(-1)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--color-text-tertiary)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', minWidth: 130, textAlign: 'center' }}>{periodLabel}</span>
          <button onClick={() => navDate(1)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--color-text-tertiary)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Month View ── */}
      {view === 'month' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          {WEEKDAYS.map(d => (
            <div key={d} style={{ padding: '7px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.04em' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: rows * 7 }).map((_, i) => {
            const dayNum = i - startOffset + 1;
            const isValid = dayNum >= 1 && dayNum <= lastDay.getDate();
            if (!isValid) return <div key={i} style={{ minHeight: 60, borderRight: (i+1)%7!==0?'1px solid var(--color-border-subtle)':'none', borderBottom: i<(rows-1)*7?'1px solid var(--color-border-subtle)':'none' }} />;
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            const events = eventMap[dateStr] || [];
            const isToday_ = dateStr === today;
            return (
              <div key={i}
                onClick={() => events.length > 0 && setPopup(popup?.date === dateStr ? null : { date: dateStr, events })}
                style={{ minHeight: 60, padding: '6px 8px', borderRight: (i+1)%7!==0?'1px solid var(--color-border-subtle)':'none', borderBottom: i<(rows-1)*7?'1px solid var(--color-border-subtle)':'none', cursor: events.length>0?'pointer':'default', background: popup?.date===dateStr?'rgba(0,122,255,0.05)':'transparent', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (events.length>0) e.currentTarget.style.background='var(--color-border-subtle)'; }}
                onMouseLeave={e => { if (popup?.date!==dateStr) e.currentTarget.style.background='transparent'; }}
              >
                <div style={{ width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:isToday_?600:400, color:isToday_?'#fff':'var(--color-text)', background:isToday_?'var(--color-blue)':'transparent', marginBottom:3 }}>{dayNum}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                  {events.filter(e=>e.type==='deadline').slice(0,3).map((ev,j)=>(
                    <div key={j} title={ev.label} style={{ width:6, height:6, borderRadius:'50%', background:'#FF3B30', flexShrink:0 }} />
                  ))}
                  {events.filter(e=>e.type==='time').slice(0,3).map((ev,j)=>(
                    <div key={j} title={ev.label} style={{ width:6, height:6, borderRadius:'50%', background:ev.color||'var(--color-blue)', flexShrink:0 }} />
                  ))}
                  {events.length > 6 && <span style={{ fontSize:9, color:'var(--color-text-secondary)', lineHeight:'6px' }}>+{events.length-6}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </>}

      {/* ── Week View ── */}
      {view === 'week' && (() => {
        const days = getWeekDays(current);
        return (
          <div style={{ overflow: 'auto', maxHeight: 460 }}>
            <div style={{ display:'grid', gridTemplateColumns:'44px repeat(7,1fr)', borderBottom:'1px solid var(--color-border-subtle)', position:'sticky', top:0, background: 'var(--color-card)', zIndex:1 }}>
              <div />
              {days.map((d, i) => {
                const isTodayDay = isoDate(d) === today;
                return (
                  <div key={i} style={{ padding:'8px 4px', textAlign:'center', borderLeft:'1px solid var(--color-border-subtle)' }}>
                    <div style={{ fontSize:10, color:'var(--color-text-secondary)', fontWeight:600, letterSpacing:'0.04em' }}>{WEEKDAYS[i]}</div>
                    <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0', fontSize:12, fontWeight:700, background:isTodayDay?'var(--color-blue)':'transparent', color:isTodayDay?'#fff':'var(--color-text)' }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'44px repeat(7,1fr)' }}>
              <div>
                {HOURS.map(h => (
                  <div key={h} style={{ height:`${HOUR_H}px`, padding:'0 6px', display:'flex', alignItems:'flex-start', paddingTop:4, justifyContent:'flex-end' }}>
                    <span style={{ fontSize:10, color:'var(--color-text-tertiary)', fontWeight:500 }}>{String(h).padStart(2,'0')}</span>
                  </div>
                ))}
              </div>
              {days.map((day, di) => {
                const dayStr = isoDate(day);
                const dayEvts = timedEvents.filter(e => !e.all_day && e._start && isoDate(e._start) === dayStr);
                return (
                  <div key={di} style={{ borderLeft:'1px solid var(--color-border-subtle)', position:'relative' }}>
                    {HOURS.map(h => <div key={h} style={{ height:`${HOUR_H}px`, borderBottom:'1px solid var(--color-border-subtle)' }} />)}
                    {dayEvts.map((ev, ei) => {
                      const startH = ev._start.getHours() + ev._start.getMinutes()/60;
                      const endH   = ev._end ? ev._end.getHours() + ev._end.getMinutes()/60 : startH + 1;
                      const top    = (startH - HOURS[0]) * HOUR_H;
                      const height = Math.max((endH - startH) * HOUR_H - 2, 16);
                      if (startH < HOURS[0] || startH >= HOURS[HOURS.length-1]) return null;
                      return (
                        <div key={ei} title={ev.title} style={{ position:'absolute', left:2, right:2, top, height, background:ev._color+'22', borderLeft:`3px solid ${ev._color}`, borderRadius:4, padding:'2px 4px', overflow:'hidden', zIndex:2 }}>
                          <p style={{ fontSize:9, fontWeight:600, color:ev._color, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Day View ── */}
      {view === 'day' && (() => {
        const dayStr = isoDate(current);
        const dayAllDay = timedEvents.filter(e => e.all_day && e._start && isoDate(e._start) === dayStr);
        const dayTimed  = timedEvents.filter(e => !e.all_day && e._start && isoDate(e._start) === dayStr);
        return (
          <div style={{ overflow:'auto', maxHeight:460 }}>
            {dayAllDay.length > 0 && (
              <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--color-border-subtle)', display:'flex', gap:6, flexWrap:'wrap', background:'var(--color-card-secondary)' }}>
                <span style={{ fontSize:11, color:'var(--color-text-tertiary)', fontWeight:600, alignSelf:'center', marginRight:4 }}>Ganztägig</span>
                {dayAllDay.map((ev,i) => (
                  <div key={i} style={{ padding:'3px 10px', borderRadius:6, background:ev._color+'20', borderLeft:`2px solid ${ev._color}`, fontSize:11, fontWeight:500, color:ev._color }}>{ev.title}</div>
                ))}
              </div>
            )}
            {dayTimed.length === 0 && dayAllDay.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--color-text-tertiary)', fontSize:13 }}>Keine Einträge für diesen Tag</div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'44px 1fr', position:'relative' }}>
              <div>
                {HOURS.map(h => (
                  <div key={h} style={{ height:`${HOUR_H}px`, padding:'0 6px', display:'flex', alignItems:'flex-start', paddingTop:4, justifyContent:'flex-end' }}>
                    <span style={{ fontSize:10, color:'var(--color-text-tertiary)', fontWeight:500 }}>{String(h).padStart(2,'0')}:00</span>
                  </div>
                ))}
              </div>
              <div style={{ borderLeft:'1px solid var(--color-border-subtle)', position:'relative' }}>
                {HOURS.map(h => <div key={h} style={{ height:`${HOUR_H}px`, borderBottom:'1px solid var(--color-border-subtle)' }} />)}
                {dayTimed.map((ev, i) => {
                  const startH = ev._start.getHours() + ev._start.getMinutes()/60;
                  const endH   = ev._end ? ev._end.getHours() + ev._end.getMinutes()/60 : startH + 1;
                  const top    = (startH - HOURS[0]) * HOUR_H;
                  const height = Math.max((endH - startH) * HOUR_H - 4, 20);
                  return (
                    <div key={i} title={ev.title} style={{ position:'absolute', left:8, right:12, top, height, background:ev._color+'18', borderLeft:`4px solid ${ev._color}`, borderRadius:6, padding:'4px 8px', zIndex:2 }}>
                      <p style={{ fontSize:11, fontWeight:600, color:ev._color, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
                      <p style={{ fontSize:10, color:'var(--color-text-tertiary)', margin:'1px 0 0' }}>
                        {ev._start.getHours()}:{String(ev._start.getMinutes()).padStart(2,'0')}
                        {ev._end ? ` – ${ev._end.getHours()}:${String(ev._end.getMinutes()).padStart(2,'0')}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Legend ── */}
      <div style={{ display:'flex', gap:16, padding:'10px 20px', borderTop:'1px solid var(--color-border-subtle)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--color-text-tertiary)' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#FF3B30' }} /> Deadline
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--color-text-tertiary)' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--color-blue)' }} /> Zeiteintrag
        </div>
      </div>

      {/* Month view popup */}
      {view === 'month' && popup && (
        <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(0,122,255,0.15)', background:'rgba(0,122,255,0.03)' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--color-text-tertiary)', marginBottom:8 }}>
            {new Date(popup.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'long' })}
          </div>
          {popup.events.map((ev, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, fontSize:13 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:ev.color, flexShrink:0 }} />
              <span style={{ color:'var(--color-text)' }}>{ev.label}</span>
              <span style={{ fontSize:11, color:'var(--color-text-secondary)' }}>{ev.type === 'deadline' ? '— Deadline' : '— Zeiteintrag'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Member Card ───────────────────────────────────────────────────────────────

function MemberCard({ member }) {
  const total = member.task_todo + member.task_doing + member.task_done;
  const donePercent = total > 0 ? Math.round((member.task_done / total) * 100) : 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: member.color || '#6366f1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initials(member.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{member.role}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>{member.project_count}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Projekte</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>{total}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Aufgaben</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{fmtHours(member.week_seconds)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>diese Woche</div>
        </div>
      </div>

      {/* Task progress bar */}
      {total > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Fortschritt</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#248A3D' }}>{donePercent}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--color-border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${donePercent}%`, background: '#34C759', borderRadius: 99, transition: 'width 0.6s' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {[['Todo', member.task_todo, 'var(--color-text-secondary)'], ['Doing', member.task_doing, '#FF9500'], ['Done', member.task_done, '#34C759']].map(([label, count, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                {label}: <strong style={{ color }}>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const CHART_COLORS = {
  todo:      'var(--color-border)',
  doing:     '#FF9500',
  done:      '#34C759',
  planned:   'var(--color-text-secondary)',
  active:    'var(--color-blue)',
  completed: '#34C759',
  on_hold:   '#FF9500',
};

const STATUS_LABELS = {
  planned: 'Geplant', active: 'Aktiv', completed: 'Abgeschl.', on_hold: 'Pausiert',
};

export default function TeamDashboard() {
  const navigate = useNavigate();

  const { data: teamStats = [], isLoading: loadingStats } = useQuery({
    queryKey: ['team-stats'],
    queryFn: () => teamApi.stats(),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  // ── Aggregated chart data ───────────────────────────────────────────────────

  // Task status totals (workspace-wide)
  const taskTotals = useMemo(() => {
    const todo  = teamStats.reduce((s, m) => s + m.task_todo, 0);
    const doing = teamStats.reduce((s, m) => s + m.task_doing, 0);
    const done  = teamStats.reduce((s, m) => s + m.task_done, 0);
    return [
      { name: 'Todo',    value: todo,  fill: CHART_COLORS.todo  },
      { name: 'In Arbeit', value: doing, fill: CHART_COLORS.doing },
      { name: 'Fertig',  value: done,  fill: CHART_COLORS.done  },
    ].filter(d => d.value > 0);
  }, [teamStats]);

  // Project status breakdown
  const projectStatusData = useMemo(() => {
    const counts = {};
    for (const p of projects) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      count,
      fill: CHART_COLORS[status] || 'var(--color-text-secondary)',
    }));
  }, [projects]);

  // Team workload (tasks per person)
  const workloadData = useMemo(() =>
    teamStats
      .map(m => ({ name: m.name, tasks: m.task_todo + m.task_doing, color: m.color }))
      .filter(m => m.tasks > 0)
      .sort((a, b) => b.tasks - a.tasks),
    [teamStats]
  );

  // Open tasks per person
  const openTasksByMember = useMemo(() =>
    teamStats
      .filter(m => m.task_todo + m.task_doing > 0)
      .map(m => ({ ...m, open: m.task_todo + m.task_doing }))
      .sort((a, b) => b.open - a.open),
    [teamStats]
  );

  // ── Deadlines this month ────────────────────────────────────────────────────
  const upcomingDeadlines = useMemo(() =>
    projects
      .filter(p => p.deadline && p.status !== 'completed')
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5),
    [projects]
  );

  const isLoading = loadingStats || loadingProjects;

  if (isLoading) return (
    <div className="p-8">
      <div className="page-header">
        <div><div className="skeleton h-7 w-44 mb-2" /><div className="skeleton h-4 w-28" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="skeleton rounded-full" style={{ width: 40, height: 40, flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div className="skeleton h-4 mb-2" style={{ width: '70%' }} /><div className="skeleton h-3" style={{ width: '50%' }} /></div>
            </div>
            <div className="skeleton h-4" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Dashboard</h1>
          <p className="page-subtitle">{teamStats.length} Mitglieder · {projects.filter(p => p.status === 'active').length} aktive Projekte</p>
        </div>
      </div>

      {/* ── Member Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        {teamStats.map(m => <MemberCard key={m.user_id} member={m} />)}
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>

        {/* Task Status Donut */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>Aufgaben Status</h3>
          {taskTotals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>Keine Aufgaben</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={taskTotals} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {taskTotals.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border-subtle)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {taskTotals.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                      <span style={{ color: 'var(--color-text-tertiary)' }}>{d.name}</span>
                    </div>
                    <strong style={{ color: 'var(--color-text)' }}>{d.value}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Team Workload */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>Team Auslastung</h3>
          {workloadData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>Keine offenen Aufgaben</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workloadData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border-subtle)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text)' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={v => [v, 'Offene Tasks']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border-subtle)' }} />
                <Bar dataKey="tasks" radius={[0, 6, 6, 0]}>
                  {workloadData.map((entry, i) => <Cell key={i} fill={entry.color || 'var(--color-blue)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Project Status */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>Projektstatus</h3>
          {projectStatusData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>Keine Projekte</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projectStatusData} margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border-subtle)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={v => [v, 'Projekte']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border-subtle)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {projectStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Calendar + Sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 28 }}>
        <Calendar projects={projects} />

        {/* Upcoming deadlines */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Nächste Deadlines</h3>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Keine bevorstehenden Deadlines</div>
          ) : (
            <div>
              {upcomingDeadlines.map((p, i) => {
                const daysLeft = Math.ceil((new Date(p.deadline) - new Date()) / 86400000);
                const isOverdue = daysLeft < 0;
                const isSoon = daysLeft <= 3 && daysLeft >= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 20px', cursor: 'pointer',
                      borderBottom: i < upcomingDeadlines.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,122,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {isOverdue
                      ? <AlertTriangle size={14} color="#FF3B30" />
                      : isSoon
                        ? <AlertTriangle size={14} color="#FF9500" />
                        : <Circle size={14} color="#86868B" />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {new Date(p.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                      background: isOverdue ? 'rgba(255,59,48,0.10)' : isSoon ? 'rgba(255,149,0,0.10)' : 'var(--color-border-subtle)',
                      color: isOverdue ? '#FF3B30' : isSoon ? '#C93400' : 'var(--color-text-tertiary)',
                      whiteSpace: 'nowrap',
                    }}>
                      {isOverdue ? `${Math.abs(daysLeft)}d überfällig` : daysLeft === 0 ? 'Heute' : `in ${daysLeft}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Open tasks per person ── */}
      {openTasksByMember.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Offene Aufgaben pro Person</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {openTasksByMember.map((m, i) => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < openTasksByMember.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(m.name)}
                </div>
                <div style={{ minWidth: 80, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{m.name}</div>
                {/* Task chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {m.task_todo > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, background: 'var(--color-border-subtle)', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                      {m.task_todo} Todo
                    </span>
                  )}
                  {m.task_doing > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, background: 'rgba(255,149,0,0.12)', color: '#C93400', fontWeight: 500 }}>
                      {m.task_doing} In Arbeit
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', minWidth: 40, textAlign: 'right' }}>
                  {m.open} offen
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
