import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, Calendar as CalIcon,
  Briefcase, AlignLeft, Palette, Check, Trash2,
} from 'lucide-react';
import { calendarApi } from '../api/calendar';
import { projectsApi } from '../api/projects';
import { timeApi } from '../api/time';
import toast from 'react-hot-toast';

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS   = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const HOURS    = Array.from({ length: 17 }, (_, i) => i + 6); // 6–22

const EVENT_COLORS = [
  '#0071E3','#34C759','#FF9500','#FF3B30','#AF52DE','#5AC8FA','#FF2D55','#5856D6',
];

const TYPE_CFG = {
  event:   { label: 'Termin',      color: '#0071E3' },
  meeting: { label: 'Meeting',     color: '#AF52DE' },
  task:    { label: 'Aufgabe',     color: '#FF9500' },
  reminder:{ label: 'Erinnerung',  color: '#FF3B30' },
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d) { return d.toISOString().slice(0, 10); }

function localDatetime(d) {
  const off = d.getTimezoneOffset();
  return new Date(d - off * 60000).toISOString().slice(0, 16);
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Monday = 0
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  // Pad to full rows
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getWeekDays(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7;
  const mon = new Date(d); mon.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon); day.setDate(mon.getDate() + i); return day;
  });
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isToday(d) { return sameDay(d, new Date()); }

function parseLocal(str) {
  // Parse "2026-03-24T14:00" as local time
  if (!str) return null;
  const s = str.replace('T', ' ').replace('Z', '');
  return new Date(s);
}

// ── Event source helpers ──────────────────────────────────────────────────────

function buildEvents(calEvents, projects, timeEntries) {
  const all = [];

  // Custom calendar events
  for (const e of calEvents) {
    const start = parseLocal(e.start_time);
    const end   = e.end_time ? parseLocal(e.end_time) : null;
    all.push({ ...e, _type: 'event', _start: start, _end: end, _color: e.color || '#0071E3' });
  }

  // Project deadlines
  for (const p of projects) {
    if (!p.deadline) continue;
    const d = new Date(p.deadline + 'T00:00:00');
    all.push({
      id: `deadline-${p.id}`, _type: 'deadline', _start: d, _end: null, _color: '#EF4444',
      title: `📅 ${p.name}`, all_day: true, project_id: p.id, _projectId: p.id,
    });
  }

  // Time entries
  for (const e of timeEntries) {
    if (!e.start_time) continue;
    const start = parseLocal(e.start_time);
    const end   = e.end_time ? parseLocal(e.end_time) : null;
    const dur   = e.duration ? `${Math.floor(e.duration / 3600)}h ${Math.floor((e.duration % 3600) / 60)}m` : '';
    all.push({
      id: `time-${e.id}`, _type: 'time', _start: start, _end: end, _color: e.user_color || '#5AC8FA',
      title: `⏱ ${e.project_name || e.description || 'Zeit'}${dur ? ' · ' + dur : ''}`,
      all_day: false,
    });
  }

  return all;
}

function eventsForDay(events, day) {
  return events.filter(e => e._start && sameDay(e._start, day));
}

// ── Event Modal ───────────────────────────────────────────────────────────────

function EventModal({ event, defaultDate, projects, onClose, onSave, onDelete }) {
  const isEdit = !!event?.id && !String(event.id).startsWith('deadline-') && !String(event.id).startsWith('time-');

  const initStart = defaultDate
    ? localDatetime(new Date(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate(), 9, 0))
    : event?._start ? localDatetime(event._start) : localDatetime(new Date());

  const initEnd = event?._end
    ? localDatetime(event._end)
    : localDatetime(new Date(new Date(initStart).getTime() + 60 * 60000));

  const [title,     setTitle]     = useState(event?.title?.replace(/^[📅⏱]\s/, '') || '');
  const [desc,      setDesc]      = useState(event?.description || '');
  const [startVal,  setStartVal]  = useState(initStart);
  const [endVal,    setEndVal]    = useState(initEnd);
  const [allDay,    setAllDay]    = useState(event?.all_day || false);
  const [color,     setColor]     = useState(event?._color || '#0071E3');
  const [type,      setType]      = useState(event?.type || 'event');
  const [projectId, setProjectId] = useState(event?.project_id || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return toast.error('Titel erforderlich');
    const payload = {
      title: title.trim(),
      description: desc,
      start_time: allDay ? startVal.slice(0, 10) + 'T00:00:00' : startVal + ':00',
      end_time:   allDay ? startVal.slice(0, 10) + 'T23:59:00' : (endVal ? endVal + ':00' : null),
      all_day:    allDay,
      color,
      type,
      project_id: projectId || null,
    };
    onSave(isEdit ? { id: event.id, ...payload } : payload);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '28px',
        width: '100%', maxWidth: '460px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
            {isEdit ? 'Termin bearbeiten' : 'Neuer Termin'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0A0AA', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Title */}
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titel"
            style={{ padding: '10px 13px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '14px', fontWeight: '500', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            autoFocus
          />

          {/* Type */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {Object.entries(TYPE_CFG).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => { setType(key); setColor(cfg.color); }}
                style={{
                  flex: 1, padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer',
                  background: type === key ? cfg.color : 'rgba(0,0,0,0.04)',
                  color: type === key ? '#fff' : '#6B7280',
                  transition: 'all 0.15s',
                }}>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* All day toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
            <div style={{
              width: '36px', height: '20px', borderRadius: '99px', transition: 'background 0.2s',
              background: allDay ? '#0071E3' : 'rgba(0,0,0,0.12)', position: 'relative', flexShrink: 0,
            }} onClick={() => setAllDay(a => !a)}>
              <div style={{
                position: 'absolute', top: '2px', left: allDay ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
              }} />
            </div>
            <span style={{ fontSize: '13px', color: '#374151' }}>Ganztägig</span>
          </label>

          {/* Times */}
          {!allDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Von</label>
                <input type="datetime-local" value={startVal} onChange={e => setStartVal(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '9px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Bis</label>
                <input type="datetime-local" value={endVal} onChange={e => setEndVal(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '9px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>
          )}

          {allDay && (
            <div>
              <label style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Datum</label>
              <input type="date" value={startVal.slice(0, 10)} onChange={e => setStartVal(e.target.value + 'T00:00')}
                style={{ padding: '8px 10px', borderRadius: '9px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
            </div>
          )}

          {/* Project */}
          <div>
            <label style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Projekt (optional)</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '9px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '12px', width: '100%', boxSizing: 'border-box', outline: 'none', background: '#fff', color: projectId ? '#111827' : '#A0A0AA' }}>
              <option value="">— Kein Projekt</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Description */}
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Beschreibung (optional)"
            rows={2}
            style={{ padding: '9px 12px', borderRadius: '9px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
          />

          {/* Color picker */}
          <div>
            <label style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Farbe</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: color === c ? '2px solid #111827' : '2px solid transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {color === c && <Check size={10} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            {isEdit && (
              <button type="button" onClick={() => onDelete(event.id)}
                style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', color: '#EF4444', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Trash2 size={13} /> Löschen
              </button>
            )}
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
              Abbrechen
            </button>
            <button type="submit"
              style={{ flex: 2, padding: '10px', borderRadius: '10px', background: color, border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff', boxShadow: `0 2px 8px ${color}55` }}>
              {isEdit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, onDayClick, onEventClick }) {
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const grid  = getMonthGrid(year, month);
  const today = new Date();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#A0A0AA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridTemplateRows: `repeat(${grid.length / 7}, 1fr)`, overflow: 'auto' }}>
        {grid.map((day, i) => {
          if (!day) return <div key={i} style={{ borderRight: '1px solid rgba(0,0,0,0.04)', borderBottom: '1px solid rgba(0,0,0,0.04)', background: '#FAFAFA' }} />;
          const dayEvents = eventsForDay(events, day);
          const isCurrentMonth = day.getMonth() === month;
          const isTodayDay = isToday(day);

          return (
            <div key={i}
              onClick={() => onDayClick(day)}
              style={{
                borderRight: '1px solid rgba(0,0,0,0.05)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                padding: '8px', minHeight: '90px',
                background: isTodayDay ? 'rgba(0,113,227,0.02)' : '#fff',
                cursor: 'pointer', overflow: 'hidden',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isTodayDay) e.currentTarget.style.background = '#FAFBFC'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isTodayDay ? 'rgba(0,113,227,0.02)' : '#fff'; }}
            >
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: isTodayDay ? '700' : '400',
                color: isTodayDay ? '#fff' : isCurrentMonth ? '#111827' : '#C0C0C8',
                background: isTodayDay ? '#0071E3' : 'transparent',
                marginBottom: '4px',
              }}>
                {day.getDate()}
              </div>
              {dayEvents.slice(0, 3).map((ev, j) => (
                <div key={j}
                  onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                  style={{
                    padding: '2px 6px', borderRadius: '4px', marginBottom: '2px',
                    background: ev._color + '22', borderLeft: `2px solid ${ev._color}`,
                    fontSize: '10px', fontWeight: '500', color: ev._color,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}>
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: '10px', color: '#A0A0AA', paddingLeft: '2px' }}>
                  +{dayEvents.length - 3} weitere
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekView({ currentDate, events, onSlotClick, onEventClick }) {
  const days = getWeekDays(currentDate);
  const today = new Date();
  const HOUR_H = 56; // px per hour

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
        <div />
        {days.map((d, i) => {
          const isTodayDay = isToday(d);
          return (
            <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{WEEKDAYS[i]}</div>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '3px auto 0',
                fontSize: '14px', fontWeight: '700',
                background: isTodayDay ? '#0071E3' : 'transparent',
                color: isTodayDay ? '#fff' : '#111827',
              }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      {/* Scrollable grid */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', position: 'relative' }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} style={{ height: `${HOUR_H}px`, padding: '0 8px', display: 'flex', alignItems: 'flex-start', paddingTop: '4px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '10px', color: '#A0A0AA', fontWeight: '500' }}>{String(h).padStart(2,'0')}:00</span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = eventsForDay(events, day).filter(e => !e.all_day && e._start);
            return (
              <div key={di} style={{ borderLeft: '1px solid rgba(0,0,0,0.05)', position: 'relative' }}>
                {HOURS.map(h => (
                  <div key={h}
                    onClick={() => {
                      const d = new Date(day); d.setHours(h, 0, 0, 0);
                      onSlotClick(d);
                    }}
                    style={{ height: `${HOUR_H}px`, borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  />
                ))}
                {/* Events overlay */}
                {dayEvents.map((ev, ei) => {
                  const startH = ev._start.getHours() + ev._start.getMinutes() / 60;
                  const endH   = ev._end ? (ev._end.getHours() + ev._end.getMinutes() / 60) : startH + 1;
                  const top    = (startH - HOURS[0]) * HOUR_H;
                  const height = Math.max((endH - startH) * HOUR_H - 2, 20);
                  if (startH < HOURS[0] || startH > HOURS[HOURS.length - 1]) return null;
                  return (
                    <div key={ei}
                      onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                      title={ev.title}
                      style={{
                        position: 'absolute', left: '2px', right: '2px',
                        top: `${top}px`, height: `${height}px`,
                        background: ev._color + '22', borderLeft: `3px solid ${ev._color}`,
                        borderRadius: '4px', padding: '3px 6px', cursor: 'pointer',
                        overflow: 'hidden', zIndex: 2,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <p style={{ fontSize: '10px', fontWeight: '600', color: ev._color, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev._start.getHours()}:{String(ev._start.getMinutes()).padStart(2,'0')} {ev.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Day View ──────────────────────────────────────────────────────────────────

function DayView({ currentDate, events, onSlotClick, onEventClick }) {
  const dayEvents = eventsForDay(events, currentDate);
  const allDay    = dayEvents.filter(e => e.all_day);
  const timed     = dayEvents.filter(e => !e.all_day && e._start);
  const HOUR_H    = 64;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* All-day strip */}
      {allDay.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: '6px', flexWrap: 'wrap', background: '#FAFBFC' }}>
          <span style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '600', alignSelf: 'center', marginRight: '4px' }}>Ganztägig</span>
          {allDay.map((ev, i) => (
            <div key={i} onClick={() => onEventClick(ev)}
              style={{ padding: '4px 10px', borderRadius: '6px', background: ev._color + '20', borderLeft: `2px solid ${ev._color}`, fontSize: '12px', fontWeight: '500', color: ev._color, cursor: 'pointer' }}>
              {ev.title}
            </div>
          ))}
        </div>
      )}
      {/* Hourly grid */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', position: 'relative' }}>
          <div>
            {HOURS.map(h => (
              <div key={h} style={{ height: `${HOUR_H}px`, padding: '0 8px', display: 'flex', alignItems: 'flex-start', paddingTop: '4px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '500' }}>{String(h).padStart(2,'0')}:00</span>
              </div>
            ))}
          </div>
          <div style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', position: 'relative' }}>
            {HOURS.map(h => (
              <div key={h}
                onClick={() => { const d = new Date(currentDate); d.setHours(h,0,0,0); onSlotClick(d); }}
                style={{ height: `${HOUR_H}px`, borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,113,227,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              />
            ))}
            {timed.map((ev, i) => {
              const startH = ev._start.getHours() + ev._start.getMinutes() / 60;
              const endH   = ev._end ? ev._end.getHours() + ev._end.getMinutes() / 60 : startH + 1;
              const top    = (startH - HOURS[0]) * HOUR_H;
              const height = Math.max((endH - startH) * HOUR_H - 4, 24);
              return (
                <div key={i}
                  onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                  style={{
                    position: 'absolute', left: '8px', right: '12px',
                    top: `${top}px`, height: `${height}px`,
                    background: ev._color + '18', borderLeft: `4px solid ${ev._color}`,
                    borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', zIndex: 2,
                  }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: ev._color, margin: 0 }}>{ev.title}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                    {ev._start.getHours()}:{String(ev._start.getMinutes()).padStart(2,'0')}
                    {ev._end ? ` – ${ev._end.getHours()}:${String(ev._end.getMinutes()).padStart(2,'0')}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Calendar() {
  const qc = useQueryClient();
  const [view, setView]           = useState('month');
  const [current, setCurrent]     = useState(new Date());
  const [modal, setModal]         = useState(null); // null | { event?, defaultDate? }

  // ── Data ────────────────────────────────────────────────────────────────────

  const rangeFrom = useMemo(() => {
    if (view === 'month') {
      const d = new Date(current.getFullYear(), current.getMonth(), 1);
      return toISO(d);
    }
    if (view === 'week') return toISO(getWeekDays(current)[0]);
    return toISO(current);
  }, [view, current]);

  const rangeTo = useMemo(() => {
    if (view === 'month') {
      const d = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      return toISO(d);
    }
    if (view === 'week') return toISO(getWeekDays(current)[6]);
    return toISO(current);
  }, [view, current]);

  const { data: calEvents = [] } = useQuery({
    queryKey: ['calendar-events', rangeFrom, rangeTo],
    queryFn: () => calendarApi.list({ from: rangeFrom + 'T00:00:00', to: rangeTo + 'T23:59:59' }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries-cal', rangeFrom, rangeTo],
    queryFn: () => timeApi.list({ from: rangeFrom, to: rangeTo }),
  });

  const events = useMemo(() => buildEvents(calEvents, projects, timeEntries), [calEvents, projects, timeEntries]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ['calendar-events'] });

  const createMutation = useMutation({
    mutationFn: calendarApi.create,
    onSuccess: () => { invalidate(); setModal(null); toast.success('Termin erstellt'); },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => calendarApi.update(id, data),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Termin gespeichert'); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const deleteMutation = useMutation({
    mutationFn: calendarApi.delete,
    onSuccess: () => { invalidate(); setModal(null); toast.success('Termin gelöscht'); },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  // ── Navigation ───────────────────────────────────────────────────────────────

  function navigate(dir) {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrent(d);
  }

  function navLabel() {
    if (view === 'month') return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === 'week') {
      const days = getWeekDays(current);
      return `${days[0].getDate()}. – ${days[6].getDate()}. ${MONTHS[days[6].getMonth()]} ${days[6].getFullYear()}`;
    }
    return current.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function handleEventClick(ev) {
    // Only editable custom events
    if (ev._type !== 'event') return;
    setModal({ event: ev });
  }

  function handleSave(payload) {
    if (payload.id) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  const btnStyle = (active) => ({
    padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontSize: '12px', fontWeight: '600',
    background: active ? '#0071E3' : 'rgba(0,0,0,0.05)',
    color: active ? '#fff' : '#6B7280',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#F8F9FC' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
        padding: '16px 24px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        {/* Title */}
        <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', letterSpacing: '-0.02em', margin: 0, marginRight: '4px' }}>
          Kalender
        </h1>

        {/* Nav arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => navigate(-1)}
            style={{ padding: '6px 8px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.09)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
          >
            <ChevronLeft size={14} color="#374151" />
          </button>
          <button onClick={() => setCurrent(new Date())}
            style={{ padding: '5px 12px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#374151', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.09)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
          >
            Heute
          </button>
          <button onClick={() => navigate(1)}
            style={{ padding: '6px 8px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.09)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
          >
            <ChevronRight size={14} color="#374151" />
          </button>
        </div>

        {/* Period label */}
        <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827', letterSpacing: '-0.02em' }}>
          {navLabel()}
        </span>

        <div style={{ flex: 1 }} />

        {/* View switcher */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.05)', padding: '3px', borderRadius: '10px' }}>
          {['month','week','day'].map(v => (
            <button key={v} onClick={() => setView(v)} style={btnStyle(view === v)}>
              {v === 'month' ? 'Monat' : v === 'week' ? 'Woche' : 'Tag'}
            </button>
          ))}
        </div>

        {/* New event */}
        <button onClick={() => setModal({ defaultDate: current })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 15px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #0071E3, #0062C4)',
            color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,113,227,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={14} /> Termin
        </button>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '16px', padding: '8px 24px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
        {[
          { color: '#0071E3', label: 'Termin' },
          { color: '#EF4444', label: 'Deadline' },
          { color: '#5AC8FA', label: 'Zeiterfassung' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '11px', color: '#A0A0AA', fontWeight: '500' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar body ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {view === 'month' && (
          <MonthView
            currentDate={current}
            events={events}
            onDayClick={day => { setCurrent(day); setView('day'); }}
            onEventClick={handleEventClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            currentDate={current}
            events={events}
            onSlotClick={d => setModal({ defaultDate: d })}
            onEventClick={handleEventClick}
          />
        )}
        {view === 'day' && (
          <DayView
            currentDate={current}
            events={events}
            onSlotClick={d => setModal({ defaultDate: d })}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <EventModal
          event={modal.event}
          defaultDate={modal.defaultDate}
          projects={projects}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={id => deleteMutation.mutate(id)}
        />
      )}
    </div>
  );
}
