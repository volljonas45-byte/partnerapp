import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, Calendar as CalIcon,
  Briefcase, AlignLeft, Check, Trash2, Video, Mail, Users, User,
  MapPin, Tag,
} from 'lucide-react';
import { calendarApi } from '../api/calendar';
import { projectsApi } from '../api/projects';
import { timeApi } from '../api/time';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS      = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_LONG = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const MONTHS        = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const HOURS    = Array.from({ length: 24 }, (_, i) => i); // 0–23

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

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

function fmtDateLabel(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${WEEKDAYS_LONG[dow]}, ${d}. ${MONTHS[m - 1]}`;
}

// ── Mini Calendar Popup ───────────────────────────────────────────────────────

function MiniCalPicker({ value, onChange, onClose, accentColor }) {
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const todayStr = toISO(new Date());
  const cells    = getMonthGrid(view.y, view.m);

  return (
    <div
      style={{ position: 'absolute', zIndex: 300, top: 'calc(100% + 6px)', left: 0, background: c.card, borderRadius: '14px', boxShadow: '0 10px 36px rgba(0,0,0,0.18)', padding: '14px', width: '236px' }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button type="button"
          onClick={() => setView(v => { const d = new Date(v.y, v.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textTertiary, padding: '4px', borderRadius: '6px', display: 'flex' }}>
          <ChevronLeft size={15} />
        </button>
        <span style={{ fontSize: '13px', fontWeight: '600', color: c.text }}>{MONTHS[view.m]} {view.y}</span>
        <button type="button"
          onClick={() => setView(v => { const d = new Date(v.y, v.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textTertiary, padding: '4px', borderRadius: '6px', display: 'flex' }}>
          <ChevronRight size={15} />
        </button>
      </div>
      {/* Weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '2px' }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '600', color: c.textSecondary, padding: '2px 0' }}>{w}</div>
        ))}
      </div>
      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const str = toISO(day);
          const isSel   = str === value;
          const isToday = str === todayStr;
          return (
            <button type="button" key={i}
              onClick={() => { onChange(str); onClose(); }}
              style={{
                width: '30px', height: '30px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '12px',
                fontWeight: isSel || isToday ? '600' : '400',
                background: isSel ? accentColor : 'transparent',
                color: isSel ? '#fff' : isToday ? accentColor : '#1D1D1F',
                outline: isToday && !isSel ? `2px solid ${accentColor}` : 'none',
                outlineOffset: '-2px',
              }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Time Dropdown ─────────────────────────────────────────────────────────────

function TimeDropdown({ value, onChange, onClose, accentColor }) {
  const listRef = useRef(null);
  const slots = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15)
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

  useEffect(() => {
    if (listRef.current) {
      const sel = listRef.current.querySelector('[data-sel="true"]');
      if (sel) sel.scrollIntoView({ block: 'center' });
    }
  }, []);

  return (
    <div
      ref={listRef}
      style={{ position: 'absolute', zIndex: 300, top: 'calc(100% + 6px)', left: 0, background: c.card, borderRadius: '10px', boxShadow: '0 10px 36px rgba(0,0,0,0.18)', maxHeight: '200px', overflowY: 'auto', minWidth: '88px' }}
      onMouseDown={e => e.stopPropagation()}
    >
      {slots.map(t => {
        const isSel = t === value;
        return (
          <button type="button" key={t} data-sel={isSel}
            onClick={() => { onChange(t); onClose(); }}
            style={{ display: 'block', width: '100%', padding: '7px 14px', textAlign: 'left', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: isSel ? '600' : '400', background: isSel ? accentColor + '18' : 'transparent', color: isSel ? accentColor : '#1D1D1F', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isSel ? accentColor + '18' : 'transparent'; }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
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

  const [title,       setTitle]       = useState(event?.title?.replace(/^[📅⏱]\s/, '') || '');
  const [desc,        setDesc]        = useState(event?.description || '');
  const [startVal,    setStartVal]    = useState(initStart);
  const [endVal,      setEndVal]      = useState(initEnd);
  const [allDay,      setAllDay]      = useState(event?.all_day || false);
  const [color,       setColor]       = useState(event?._color || '#0071E3');
  const [type,        setType]        = useState(event?.type || 'event');
  const [projectId,   setProjectId]   = useState(event?.project_id || '');
  const [meetingLink, setMeetingLink] = useState(event?.meeting_link || '');
  const [attendees,   setAttendees]   = useState(event?.attendees || '');
  const [scope,       setScope]       = useState(event?.scope || 'personal');
  const [attendeeInput, setAttendeeInput] = useState('');
  const [openPicker,    setOpenPicker]    = useState(null); // 'date' | 'startTime' | 'endTime'
  const dateRowRef = useRef(null);

  // Close any open picker on outside click
  useEffect(() => {
    function handleDown(e) {
      if (dateRowRef.current && !dateRowRef.current.contains(e.target)) {
        setOpenPicker(null);
      }
    }
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, []);

  function addAttendee() {
    const val = attendeeInput.trim();
    if (!val) return;
    const current = attendees ? attendees.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!current.includes(val)) {
      setAttendees([...current, val].join(', '));
    }
    setAttendeeInput('');
  }

  function removeAttendee(email) {
    const current = attendees.split(',').map(s => s.trim()).filter(Boolean);
    setAttendees(current.filter(e => e !== email).join(', '));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return toast.error('Titel erforderlich');
    const payload = {
      title: title.trim(),
      description: desc,
      start_time: allDay ? startVal.slice(0, 10) + 'T00:00:00' : startVal + ':00',
      end_time:   allDay ? startVal.slice(0, 10) + 'T23:59:00' : (endVal ? endVal + ':00' : null),
      all_day: allDay,
      color,
      type,
      project_id: projectId || null,
      meeting_link: meetingLink || null,
      attendees: attendees || '',
      scope,
    };
    onSave(isEdit ? { id: event.id, ...payload } : payload);
  }

  const attendeeList = attendees ? attendees.split(',').map(s => s.trim()).filter(Boolean) : [];

  const ROW = { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' };
  const ICON_COL = { width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '2px', flexShrink: 0 };
  const INPUT = { width: '100%', border: 'none', outline: 'none', fontSize: '13px', color: c.text, background: 'transparent', fontFamily: 'inherit' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}
    >
      <div
        style={{ background: c.card, borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Color bar + header */}
        <div style={{ height: '6px', background: color }} />
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {/* Scope: personal / team */}
            {[
              { val: 'personal', icon: <User size={13} />, label: 'Ich' },
              { val: 'team',     icon: <Users size={13} />, label: 'Team' },
            ].map(({ val, icon, label }) => (
              <button key={val} type="button" onClick={() => setScope(val)} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                background: scope === val ? color + '18' : 'rgba(0,0,0,0.05)',
                color: scope === val ? color : '#6E6E73',
                transition: 'all 0.15s',
              }}>
                {icon} {label}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0A0AA', padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '12px 24px 20px' }}>

          {/* Title */}
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titel hinzufügen"
            autoFocus
            style={{ width: '100%', border: 'none', borderBottom: '2px solid ' + color, outline: 'none', fontSize: '20px', fontWeight: '600', color: c.text, padding: '8px 0 10px', marginBottom: '8px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'transparent' }}
          />

          {/* Type pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
            {Object.entries(TYPE_CFG).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => { setType(key); setColor(cfg.color); }}
                style={{
                  padding: '4px 12px', borderRadius: '20px', border: `1.5px solid ${type === key ? cfg.color : 'transparent'}`,
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  background: type === key ? cfg.color + '15' : 'rgba(0,0,0,0.04)',
                  color: type === key ? cfg.color : '#6B7280',
                  transition: 'all 0.15s',
                }}>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Date/Time row */}
          <div style={ROW}>
            <div style={ICON_COL}><Clock size={16} color="#86868B" strokeWidth={1.75} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: c.text, cursor: 'pointer' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${allDay ? color : '#D1D1D6'}`, background: allDay ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                    onClick={() => setAllDay(a => !a)}>
                    {allDay && <Check size={10} color="#fff" strokeWidth={3} />}
                  </div>
                  Ganztägig
                </label>
              </div>
              {!allDay ? (
                <div ref={dateRowRef} style={{ display: 'flex', gap: '5px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

                  {/* ── Date chip ── */}
                  <div style={{ position: 'relative' }}>
                    <button type="button"
                      onClick={() => setOpenPicker(p => p === 'date' ? null : 'date')}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${openPicker === 'date' ? color : 'transparent'}`, background: openPicker === 'date' ? color + '12' : 'rgba(0,0,0,0.05)', fontSize: '13px', fontWeight: '500', color: c.text, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      <CalIcon size={13} color={color} />
                      {fmtDateLabel(startVal.slice(0, 10))}
                    </button>
                    {openPicker === 'date' && (
                      <MiniCalPicker
                        value={startVal.slice(0, 10)}
                        accentColor={color}
                        onChange={d => {
                          setStartVal(d + 'T' + startVal.slice(11, 16));
                          setEndVal(d + 'T' + endVal.slice(11, 16));
                        }}
                        onClose={() => setOpenPicker(null)}
                      />
                    )}
                  </div>

                  {/* ── Start time chip ── */}
                  <div style={{ position: 'relative' }}>
                    <button type="button"
                      onClick={() => setOpenPicker(p => p === 'startTime' ? null : 'startTime')}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${openPicker === 'startTime' ? color : 'transparent'}`, background: openPicker === 'startTime' ? color + '12' : 'rgba(0,0,0,0.05)', fontSize: '13px', fontWeight: '500', color: c.text, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {startVal.slice(11, 16)}
                    </button>
                    {openPicker === 'startTime' && (
                      <TimeDropdown
                        value={startVal.slice(11, 16)}
                        accentColor={color}
                        onChange={t => {
                          const d = startVal.slice(0, 10);
                          setStartVal(d + 'T' + t);
                          const [sh, sm] = t.split(':').map(Number);
                          const [eh, em] = endVal.slice(11, 16).split(':').map(Number);
                          if (eh * 60 + em <= sh * 60 + sm) {
                            const tot = (sh * 60 + sm + 60) % 1440;
                            const rnd = Math.ceil(tot / 15) * 15 % 1440;
                            setEndVal(d + 'T' + String(Math.floor(rnd / 60)).padStart(2, '0') + ':' + String(rnd % 60).padStart(2, '0'));
                          }
                        }}
                        onClose={() => setOpenPicker(null)}
                      />
                    )}
                  </div>

                  <span style={{ color: c.textSecondary, fontSize: '13px' }}>–</span>

                  {/* ── End time chip ── */}
                  <div style={{ position: 'relative' }}>
                    <button type="button"
                      onClick={() => setOpenPicker(p => p === 'endTime' ? null : 'endTime')}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${openPicker === 'endTime' ? color : 'transparent'}`, background: openPicker === 'endTime' ? color + '12' : 'rgba(0,0,0,0.05)', fontSize: '13px', fontWeight: '500', color: c.text, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {endVal.slice(11, 16)}
                    </button>
                    {openPicker === 'endTime' && (
                      <TimeDropdown
                        value={endVal.slice(11, 16)}
                        accentColor={color}
                        onChange={t => setEndVal(startVal.slice(0, 10) + 'T' + t)}
                        onClose={() => setOpenPicker(null)}
                      />
                    )}
                  </div>

                </div>
              ) : (
                <input type="date" value={startVal.slice(0, 10)} onChange={e => setStartVal(e.target.value + 'T00:00')}
                  style={{ ...INPUT, marginTop: '8px', padding: '5px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)' }} />
              )}
            </div>
          </div>

          {/* Participants */}
          <div style={ROW}>
            <div style={ICON_COL}><Users size={16} color="#86868B" strokeWidth={1.75} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  value={attendeeInput}
                  onChange={e => setAttendeeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttendee(); } if (e.key === ',' || e.key === ' ') { e.preventDefault(); addAttendee(); } }}
                  placeholder="Teilnehmer per E-Mail hinzufügen"
                  style={{ ...INPUT, padding: '5px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)' }}
                />
                {attendeeInput.trim() && (
                  <button type="button" onClick={addAttendee}
                    style={{ padding: '4px 10px', borderRadius: '8px', background: color, border: 'none', cursor: 'pointer', color: '#fff', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                    +
                  </button>
                )}
              </div>
              {attendeeList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                  {attendeeList.map(email => (
                    <div key={email} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(0,0,0,0.06)', fontSize: '12px', color: '#374151' }}>
                      <Mail size={10} color="#86868B" />
                      {email}
                      <button type="button" onClick={() => removeAttendee(email)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0A0AA', padding: '0 0 0 2px', display: 'flex', lineHeight: 1 }}>
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Meeting link — only for Meeting type */}
          {type === 'meeting' && (
            <div style={ROW}>
              <div style={ICON_COL}><Video size={16} color="#86868B" strokeWidth={1.75} /></div>
              <input
                value={meetingLink} onChange={e => setMeetingLink(e.target.value)}
                placeholder="Meeting-Link hinzufügen (Zoom, Meet, Teams…)"
                style={{ ...INPUT, flex: 1, padding: '5px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)' }}
              />
            </div>
          )}

          {/* Project */}
          <div style={ROW}>
            <div style={ICON_COL}><Briefcase size={16} color="#86868B" strokeWidth={1.75} /></div>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              style={{ ...INPUT, flex: 1, padding: '5px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', color: projectId ? '#1D1D1F' : '#A0A0AA' }}>
              <option value="">— Kein Projekt</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Description */}
          <div style={ROW}>
            <div style={ICON_COL}><AlignLeft size={16} color="#86868B" strokeWidth={1.75} /></div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Beschreibung hinzufügen"
              rows={2}
              style={{ ...INPUT, flex: 1, resize: 'none', padding: '5px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', lineHeight: 1.5 }}
            />
          </div>

          {/* Color picker */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px', marginBottom: '16px' }}>
            {EVENT_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: color === c ? '2.5px solid #1D1D1F' : '2.5px solid transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {color === c && <Check size={9} color="#fff" strokeWidth={3} />}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEdit && (
              <button type="button" onClick={() => onDelete(event.id)}
                style={{ padding: '9px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', color: '#EF4444', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Trash2 size={13} /> Löschen
              </button>
            )}
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '9px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
              Abbrechen
            </button>
            <button type="submit"
              style={{ flex: 2, padding: '9px', borderRadius: '10px', background: color, border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff', boxShadow: `0 2px 8px ${color}55` }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: `1px solid ${c.borderSubtle}` }}>
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
                        {ev.scope === 'team' ? ' 👥' : ''}
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
                  <p style={{ fontSize: '12px', fontWeight: '600', color: ev._color, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                    {ev._start.getHours()}:{String(ev._start.getMinutes()).padStart(2,'0')}
                    {ev._end ? ` – ${ev._end.getHours()}:${String(ev._end.getMinutes()).padStart(2,'0')}` : ''}
                    {ev.scope === 'team' ? ' · Team' : ''}
                  </p>
                  {ev.meeting_link && (
                    <a href={ev.meeting_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: '10px', color: ev._color, textDecoration: 'none', fontWeight: '600', display: 'block', marginTop: '2px' }}>
                      ▶ Link beitreten
                    </a>
                  )}
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
  const { c, isDark } = useTheme();
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
        padding: '16px 24px', background: c.card, borderBottom: '1px solid rgba(0,0,0,0.07)',
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
      <div style={{ display: 'flex', gap: '16px', padding: '8px 24px', background: c.card, borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
        {[
          { color: '#0071E3', label: 'Termin' },
          { color: '#AF52DE', label: 'Meeting' },
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
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: c.card }}>
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
