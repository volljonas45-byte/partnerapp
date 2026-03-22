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

function Calendar({ projects, timeEntries }) {
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [popup, setPopup] = useState(null); // { date, events[] }

  const year  = current.getFullYear();
  const month = current.getMonth();

  // Build day grid
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  // Monday = 0
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells  = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);

  // Build event maps  { 'YYYY-MM-DD': [{ type, label, color }] }
  const eventMap = useMemo(() => {
    const map = {};
    const add = (dateStr, event) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };

    // Deadlines
    for (const p of projects) {
      if (p.deadline) {
        const d = p.deadline.slice(0, 10);
        add(d, { type: 'deadline', label: p.name, color: '#FF3B30' });
      }
    }

    // Time entries
    for (const e of timeEntries) {
      if (e.start_time) {
        const d = e.start_time.slice(0, 10);
        const h = e.duration ? Math.round(e.duration / 360) / 10 : null;
        add(d, {
          type: 'time',
          label: `${e.user_name || 'Zeit'}: ${h ? h + 'h' : '–'} ${e.project_name ? `(${e.project_name})` : ''}`.trim(),
          color: e.user_color || '#0071E3',
        });
      }
    }

    return map;
  }, [projects, timeEntries]);

  const today = isoDate(new Date());

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  const monthLabel = current.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: 0 }}>Kalender</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: '#6E6E73', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', minWidth: 110, textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={nextMonth} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: '#6E6E73', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F5F7'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ padding: '7px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#86868B', letterSpacing: '0.04em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: rows * 7 }).map((_, i) => {
          const dayNum = i - startOffset + 1;
          const isValid = dayNum >= 1 && dayNum <= lastDay.getDate();
          if (!isValid) return <div key={i} style={{ minHeight: 64, borderRight: (i + 1) % 7 !== 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', borderBottom: i < (rows - 1) * 7 ? '1px solid rgba(0,0,0,0.04)' : 'none' }} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const events = eventMap[dateStr] || [];
          const isToday = dateStr === today;
          const deadlines = events.filter(e => e.type === 'deadline');
          const timeEvts = events.filter(e => e.type === 'time');

          return (
            <div
              key={i}
              onClick={() => events.length > 0 && setPopup(popup?.date === dateStr ? null : { date: dateStr, events })}
              style={{
                minHeight: 64, padding: '6px 8px',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                borderBottom: i < (rows - 1) * 7 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                cursor: events.length > 0 ? 'pointer' : 'default',
                position: 'relative',
                transition: 'background 0.1s',
                background: popup?.date === dateStr ? 'rgba(0,113,227,0.05)' : 'transparent',
              }}
              onMouseEnter={e => { if (events.length > 0) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
              onMouseLeave={e => { if (popup?.date !== dateStr) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Day number */}
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: isToday ? 600 : 400,
                color: isToday ? '#fff' : '#1D1D1F',
                background: isToday ? '#0071E3' : 'transparent',
                marginBottom: 4,
              }}>
                {dayNum}
              </div>

              {/* Event dots */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {deadlines.slice(0, 3).map((ev, j) => (
                  <div key={j} title={ev.label} style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B30', flexShrink: 0 }} />
                ))}
                {timeEvts.slice(0, 3).map((ev, j) => (
                  <div key={j} title={ev.label} style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color || '#0071E3', flexShrink: 0 }} />
                ))}
                {events.length > 6 && (
                  <span style={{ fontSize: 9, color: '#86868B', lineHeight: '6px' }}>+{events.length - 6}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '10px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6E6E73' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30' }} /> Deadline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6E6E73' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0071E3' }} /> Zeiteintrag
        </div>
      </div>

      {/* Day popup */}
      {popup && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,113,227,0.15)', background: 'rgba(0,113,227,0.03)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6E73', marginBottom: 8 }}>
            {new Date(popup.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
          {popup.events.map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 13 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
              <span style={{ color: '#1D1D1F' }}>{ev.label}</span>
              <span style={{ fontSize: 11, color: '#86868B' }}>{ev.type === 'deadline' ? '— Deadline' : '— Zeiteintrag'}</span>
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
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
          <div style={{ fontSize: 11, color: '#86868B' }}>{member.role}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1D1D1F' }}>{member.project_count}</div>
          <div style={{ fontSize: 11, color: '#86868B' }}>Projekte</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1D1D1F' }}>{total}</div>
          <div style={{ fontSize: 11, color: '#86868B' }}>Aufgaben</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1D1D1F' }}>{fmtHours(member.week_seconds)}</div>
          <div style={{ fontSize: 11, color: '#86868B' }}>diese Woche</div>
        </div>
      </div>

      {/* Task progress bar */}
      {total > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#86868B' }}>Fortschritt</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#248A3D' }}>{donePercent}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${donePercent}%`, background: '#34C759', borderRadius: 99, transition: 'width 0.6s' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {[['Todo', member.task_todo, '#86868B'], ['Doing', member.task_doing, '#FF9500'], ['Done', member.task_done, '#34C759']].map(([label, count, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6E6E73' }}>
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
  todo:      '#E5E5EA',
  doing:     '#FF9500',
  done:      '#34C759',
  planned:   '#86868B',
  active:    '#0071E3',
  completed: '#34C759',
  on_hold:   '#FF9500',
};

const STATUS_LABELS = {
  planned: 'Geplant', active: 'Aktiv', completed: 'Abgeschl.', on_hold: 'Pausiert',
};

export default function TeamDashboard() {
  const navigate = useNavigate();

  // Calendar month for time entry fetching
  const [calMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const calFrom = isoDate(calMonth);
  const calTo   = isoDate(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0));

  const { data: teamStats = [], isLoading: loadingStats } = useQuery({
    queryKey: ['team-stats'],
    queryFn: () => teamApi.stats(),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { data: calEntries = [] } = useQuery({
    queryKey: ['time-entries-workspace', calFrom, calTo],
    queryFn: () => timeApi.list({ scope: 'workspace', from: calFrom, to: calTo }),
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
      fill: CHART_COLORS[status] || '#86868B',
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
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>Aufgaben Status</h3>
          {taskTotals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#86868B', fontSize: 13 }}>Keine Aufgaben</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={taskTotals} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {taskTotals.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {taskTotals.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                      <span style={{ color: '#6E6E73' }}>{d.name}</span>
                    </div>
                    <strong style={{ color: '#1D1D1F' }}>{d.value}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Team Workload */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>Team Auslastung</h3>
          {workloadData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#86868B', fontSize: 13 }}>Keine offenen Aufgaben</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workloadData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#1D1D1F' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={v => [v, 'Offene Tasks']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }} />
                <Bar dataKey="tasks" radius={[0, 6, 6, 0]}>
                  {workloadData.map((entry, i) => <Cell key={i} fill={entry.color || '#0071E3'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Project Status */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>Projektstatus</h3>
          {projectStatusData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#86868B', fontSize: 13 }}>Keine Projekte</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projectStatusData} margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={v => [v, 'Projekte']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }} />
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
        <Calendar projects={projects} timeEntries={calEntries} />

        {/* Upcoming deadlines */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: 0 }}>Nächste Deadlines</h3>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#86868B', fontSize: 13 }}>Keine bevorstehenden Deadlines</div>
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
                      borderBottom: i < upcomingDeadlines.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {isOverdue
                      ? <AlertTriangle size={14} color="#FF3B30" />
                      : isSoon
                        ? <AlertTriangle size={14} color="#FF9500" />
                        : <Circle size={14} color="#86868B" />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#86868B' }}>
                        {new Date(p.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                      background: isOverdue ? 'rgba(255,59,48,0.10)' : isSoon ? 'rgba(255,149,0,0.10)' : 'rgba(0,0,0,0.06)',
                      color: isOverdue ? '#FF3B30' : isSoon ? '#C93400' : '#6E6E73',
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
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: 0 }}>Offene Aufgaben pro Person</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {openTasksByMember.map((m, i) => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < openTasksByMember.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(m.name)}
                </div>
                <div style={{ minWidth: 80, fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>{m.name}</div>
                {/* Task chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {m.task_todo > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, background: 'rgba(0,0,0,0.06)', color: '#6E6E73', fontWeight: 500 }}>
                      {m.task_todo} Todo
                    </span>
                  )}
                  {m.task_doing > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, background: 'rgba(255,149,0,0.12)', color: '#C93400', fontWeight: 500 }}>
                      {m.task_doing} In Arbeit
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', minWidth: 40, textAlign: 'right' }}>
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
