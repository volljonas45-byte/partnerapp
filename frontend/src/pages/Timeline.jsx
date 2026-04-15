import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { areasApi } from '../api/areas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sod(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function dayDiff(a, b) {
  return Math.round((sod(b) - sod(a)) / 86400000);
}
function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const DAYS_S = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// ─── Config ───────────────────────────────────────────────────────────────────

const VIEWS = {
  day:   { total: 14,  colW: 80,  step: 7  },
  week:  { total: 56,  colW: 28,  step: 28 },
  month: { total: 180, colW: 10,  step: 60 },
};

const STATUS_CFG = {
  planned:            { label: 'Geplant',          color: 'var(--color-text-secondary)', bg: 'rgba(118,118,128,0.1)' },
  active:             { label: 'Aktiv',            color: 'var(--color-blue)', bg: 'rgba(0,122,255,0.1)'   },
  completed:          { label: 'Abgeschlossen',    color: '#34C759', bg: 'rgba(52,199,89,0.1)'   },
  waiting_for_client: { label: 'Wartet auf Kunde', color: '#FF9500', bg: 'rgba(255,149,0,0.1)'   },
  deferred:           { label: 'Verschoben',       color: 'var(--color-text-tertiary)', bg: 'rgba(148,163,184,0.1)' },
  on_hold:            { label: 'Pausiert',         color: '#FF9500', bg: 'rgba(255,149,0,0.1)'   },
};

const FALLBACK_COLORS = [
  'var(--color-blue)', '#34C759', '#FF9500', '#FF3B30', '#BF5AF2',
  '#5AC8FA', '#32ADE6', '#AC8E68', '#FF6961', '#30B0C7',
];

const ROW_H   = 48;
const HDR_H   = 56;  // month row (24px) + day row (32px)
const LEFT_W  = 252;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Timeline() {
  const navigate = useNavigate();
  const leftRowsRef = useRef(null);
  const rightRef    = useRef(null);

  const [view,     setView]     = useState('week');
  const [anchor,   setAnchor]   = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return sod(d);
  });
  const [showDone, setShowDone] = useState(false);
  const [sortBy,   setSortBy]   = useState('deadline');
  const [hovered,  setHovered]  = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: rawProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.list,
  });

  const areaMap = useMemo(() => {
    const m = {};
    areas.forEach(a => { m[a.id] = a; });
    return m;
  }, [areas]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const cfg = VIEWS[view];
  const today = sod(new Date());

  const visibleDays = useMemo(
    () => Array.from({ length: cfg.total }, (_, i) => addDays(anchor, i)),
    [anchor, cfg.total]
  );
  const viewEnd  = visibleDays[visibleDays.length - 1];
  const totalW   = cfg.total * cfg.colW;
  const todayIdx = dayDiff(anchor, today);
  const todayX   = todayIdx * cfg.colW + cfg.colW / 2;

  const projects = useMemo(() => {
    let list = rawProjects.map((p, idx) => {
      const area  = areaMap[p.area_id];
      const color = area?.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
      const pStart = parseDate(p.start_date) || parseDate(p.created_at) || today;
      const pEnd   = parseDate(p.deadline);
      const hasDeadline = !!pEnd;
      const end = pEnd || addDays(sod(pStart), 30);
      return {
        ...p,
        _color: color,
        _area: area,
        _start: sod(pStart),
        _end: sod(end),
        _hasDeadline: hasDeadline,
      };
    });

    if (!showDone) list = list.filter(p => p.status !== 'completed');

    if (sortBy === 'name')     list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'deadline') list.sort((a, b) => a._end - b._end);
    if (sortBy === 'created')  list.sort((a, b) => b._start - a._start);

    return list;
  }, [rawProjects, areaMap, showDone, sortBy, today]);

  const monthGroups = useMemo(() => {
    const groups = [];
    let curKey = '';
    visibleDays.forEach((d, i) => {
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (k !== curKey) {
        groups.push({ label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, idx: i, count: 1 });
        curKey = k;
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [visibleDays]);

  // Precompute weekend day indices for background rendering (once, not per row)
  const weekendIdxs = useMemo(
    () => visibleDays.reduce((acc, d, i) => {
      if (d.getDay() === 0 || d.getDay() === 6) acc.push(i);
      return acc;
    }, []),
    [visibleDays]
  );

  // ── Scroll sync ───────────────────────────────────────────────────────────

  function handleRightScroll(e) {
    if (leftRowsRef.current) {
      leftRowsRef.current.scrollTop = e.target.scrollTop;
    }
  }

  // ── Nav ───────────────────────────────────────────────────────────────────

  function goToday() {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    setAnchor(sod(d));
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#F5F5F7' }}>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
          Timeline
        </h1>
        <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)', letterSpacing: '-0.01em' }}>
          Projektfortschritt und Deadlines auf einen Blick
        </p>
      </div>

      {/* ── Controls bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '14px 28px 16px', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* View toggle */}
        <div style={{
          display: 'flex', background: 'var(--color-card)',
          borderRadius: '10px', padding: '3px',
          border: '1px solid var(--color-border-subtle)', gap: '1px',
        }}>
          {[['day', 'Tag'], ['week', 'Woche'], ['month', 'Monat']].map(([v, lbl]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: view === v ? '600' : '400',
              color: view === v ? 'var(--color-text)' : 'var(--color-text-secondary)',
              background: view === v ? 'var(--color-card-secondary)' : 'transparent',
              transition: 'all 0.12s', letterSpacing: '-0.01em',
            }}>{lbl}</button>
          ))}
        </div>

        {/* Nav arrows + date label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[[-1, ChevronLeft], [1, ChevronRight]].map(([dir, Icon]) => (
            <button key={dir}
              onClick={() => setAnchor(d => addDays(d, dir * cfg.step))}
              style={{
                width: '30px', height: '30px', borderRadius: '8px',
                border: '1px solid var(--color-border-subtle)', background: 'var(--color-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-card-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <Icon size={14} color="#424245" />
            </button>
          ))}
        </div>

        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', letterSpacing: '-0.01em' }}>
          {anchor.getDate()}. {MONTHS[anchor.getMonth()]} – {viewEnd.getDate()}. {MONTHS[viewEnd.getMonth()]} {viewEnd.getFullYear()}
        </span>

        <button onClick={goToday} style={{
          padding: '5px 12px', borderRadius: '8px',
          border: '1px solid var(--color-border-subtle)', background: 'var(--color-card)',
          fontSize: '12.5px', fontWeight: '500', color: 'var(--color-text-secondary)',
          cursor: 'pointer', letterSpacing: '-0.01em', transition: 'background 0.12s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-card-secondary)'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          Heute
        </button>

        <div style={{ flex: 1 }} />

        {/* Show done toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}
          onClick={() => setShowDone(v => !v)}>
          <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', letterSpacing: '-0.01em' }}>Abgeschlossen</span>
          <div style={{
            width: '36px', height: '20px', borderRadius: '99px',
            background: showDone ? 'var(--color-blue)' : 'var(--color-border)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', width: '16px', height: '16px',
              borderRadius: '50%', background: 'var(--color-card)',
              top: '2px', left: showDone ? '18px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          padding: '6px 10px', borderRadius: '8px',
          border: '1px solid var(--color-border-subtle)', background: 'var(--color-card)',
          fontSize: '12.5px', color: 'var(--color-text-secondary)', cursor: 'pointer',
          letterSpacing: '-0.01em', outline: 'none',
        }}>
          <option value="deadline">Nach Deadline</option>
          <option value="name">Nach Name</option>
          <option value="created">Nach Erstellung</option>
        </select>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0,
        margin: '0 28px 28px',
        background: 'var(--color-card)',
        borderRadius: '16px',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: '0 2px 16px var(--color-border-subtle)',
        overflow: 'hidden',
        display: 'flex',
      }}>

        {/* ── LEFT PANEL (fixed) ────────────────────────────────────────── */}
        <div style={{
          width: `${LEFT_W}px`, flexShrink: 0,
          borderRight: '1px solid var(--color-border-subtle)',
          display: 'flex', flexDirection: 'column',
          zIndex: 4,
          boxShadow: '2px 0 8px var(--color-border-subtle)',
        }}>
          {/* Left header */}
          <div style={{
            height: `${HDR_H}px`, flexShrink: 0,
            display: 'flex', alignItems: 'flex-end',
            padding: '0 16px 10px',
            borderBottom: '1px solid var(--color-border-subtle)',
            background: 'var(--color-card)',
          }}>
            <span style={{
              fontSize: '10.5px', fontWeight: '600',
              color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              {projects.length} Projekt{projects.length !== 1 ? 'e' : ''}
            </span>
          </div>

          {/* Left rows — overflow hidden, scrollTop synced via JS */}
          <div ref={leftRowsRef} style={{ flex: 1, overflowY: 'hidden' }}>
            {projects.map(p => {
              const sc = STATUS_CFG[p.status] || STATUS_CFG.planned;
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/websites/${p.id}`)}
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    height: `${ROW_H}px`,
                    display: 'flex', alignItems: 'center',
                    gap: '10px', padding: '0 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    background: hovered === p.id ? 'var(--color-border-subtle)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{
                    width: '3px', height: '28px',
                    borderRadius: '99px', flexShrink: 0,
                    background: p._color,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: '13px', fontWeight: '500',
                      color: 'var(--color-text)', letterSpacing: '-0.01em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      {p._area?.name && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p._area.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: '600',
                    color: sc.color, background: sc.bg,
                    padding: '2px 7px', borderRadius: '99px',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    letterSpacing: '-0.01em',
                  }}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
            {/* Spacer so left panel scrolls past last row if needed */}
            <div style={{ height: '1px' }} />
          </div>
        </div>

        {/* ── RIGHT PANEL (scrollable) ──────────────────────────────────── */}
        <div
          ref={rightRef}
          onScroll={handleRightScroll}
          style={{ flex: 1, overflow: 'auto', position: 'relative' }}
        >
          <div style={{ width: `${totalW}px`, minWidth: '100%' }}>

            {/* Sticky date headers */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 6,
              height: `${HDR_H}px`,
              background: 'var(--color-card)',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}>
              {/* Month row */}
              <div style={{ display: 'flex', height: '24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                {monthGroups.map((g, i) => (
                  <div key={i} style={{
                    width: `${g.count * cfg.colW}px`, flexShrink: 0,
                    padding: '0 8px',
                    display: 'flex', alignItems: 'center',
                    fontSize: '11px', fontWeight: '600',
                    color: 'var(--color-text-tertiary)', letterSpacing: '0.01em',
                  }}>
                    {g.label}
                  </div>
                ))}
              </div>

              {/* Day row */}
              <div style={{ display: 'flex', height: '32px' }}>
                {visibleDays.map((d, i) => {
                  const isTod = dayDiff(today, d) === 0;
                  const isWe  = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={i} style={{
                      width: `${cfg.colW}px`, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isTod
                        ? 'rgba(0,122,255,0.07)'
                        : isWe ? 'var(--color-border-subtle)' : 'transparent',
                      position: 'relative',
                    }}>
                      {cfg.colW >= 18 && (
                        <span style={{
                          fontSize: cfg.colW >= 40 ? '11.5px' : '10px',
                          fontWeight: isTod ? '700' : '400',
                          color: isTod ? 'var(--color-blue)' : isWe ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                        }}>
                          {cfg.colW >= 40
                            ? `${DAYS_S[d.getDay()]} ${d.getDate()}`
                            : d.getDate()
                          }
                        </span>
                      )}
                      {isTod && (
                        <div style={{
                          position: 'absolute', bottom: 2,
                          left: '50%', transform: 'translateX(-50%)',
                          width: '5px', height: '5px',
                          borderRadius: '50%', background: 'var(--color-blue)',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Gantt rows area ─────────────────────────────────────── */}
            <div style={{
              position: 'relative',
              width: `${totalW}px`,
              height: `${Math.max(projects.length * ROW_H, 200)}px`,
            }}>

              {/* Weekend column backgrounds (rendered ONCE) */}
              {weekendIdxs.map(i => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${i * cfg.colW}px`, top: 0,
                  width: `${cfg.colW}px`, height: '100%',
                  background: 'rgba(0,0,0,0.018)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* Today column background (rendered ONCE) */}
              {todayIdx >= 0 && todayIdx < cfg.total && (
                <div style={{
                  position: 'absolute',
                  left: `${todayIdx * cfg.colW}px`, top: 0,
                  width: `${cfg.colW}px`, height: '100%',
                  background: 'rgba(0,122,255,0.04)',
                  pointerEvents: 'none',
                }} />
              )}

              {/* Today vertical line (rendered ONCE) */}
              {todayIdx >= 0 && todayIdx < cfg.total && (
                <div style={{
                  position: 'absolute',
                  left: `${todayX}px`, top: 0,
                  width: '1.5px', height: '100%',
                  background: 'rgba(0,122,255,0.4)',
                  pointerEvents: 'none', zIndex: 2,
                }} />
              )}

              {/* Row separators */}
              {projects.map((p, ri) => (
                <div key={`sep-${p.id}`} style={{
                  position: 'absolute',
                  left: 0, right: 0,
                  top: `${(ri + 1) * ROW_H - 1}px`,
                  height: '1px',
                  background: 'var(--color-border-subtle)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* Row hover backgrounds */}
              {projects.map((p, ri) => (
                hovered === p.id && (
                  <div key={`hov-${p.id}`} style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: `${ri * ROW_H}px`,
                    height: `${ROW_H}px`,
                    background: 'var(--color-border-subtle)',
                    pointerEvents: 'none',
                  }} />
                )
              ))}

              {/* Project bars */}
              {projects.map((p, ri) => {
                const rawL = dayDiff(anchor, p._start);
                const rawR = dayDiff(anchor, p._end);
                const cL = Math.max(rawL, 0);
                const cR = Math.min(rawR + 1, cfg.total);
                const barW = (cR - cL) * cfg.colW;
                if (barW <= 0) return null;

                const barLeft = cL * cfg.colW;
                const barTop  = ri * ROW_H + 10;
                const barH    = ROW_H - 20;
                const isClipL = rawL < 0;
                const isClipR = rawR + 1 >= cfg.total;
                const isDone  = p.status === 'completed';

                const br = (tl, tr, br, bl) =>
                  `${tl}px ${tr}px ${br}px ${bl}px`;

                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/websites/${p.id}`)}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered(null)}
                    title={`${p.name}${p._hasDeadline ? '' : ' (kein Deadline)'}`}
                    style={{
                      position: 'absolute',
                      left: `${barLeft}px`,
                      top: `${barTop}px`,
                      width: `${barW}px`,
                      height: `${barH}px`,
                      background: isDone
                        ? `repeating-linear-gradient(45deg, ${p._color}55, ${p._color}55 4px, ${p._color}33 4px, ${p._color}33 8px)`
                        : `linear-gradient(90deg, ${p._color}EE, ${p._color}BB)`,
                      borderRadius: br(
                        isClipL ? 2 : 7,
                        isClipR || !p._hasDeadline ? 2 : 7,
                        isClipR || !p._hasDeadline ? 2 : 7,
                        isClipL ? 2 : 7
                      ),
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      padding: '0 9px',
                      overflow: 'hidden',
                      transition: 'filter 0.12s, transform 0.1s',
                      zIndex: hovered === p.id ? 4 : 3,
                      ...(!p._hasDeadline && !isClipR ? {
                        borderRight: `2.5px dashed ${p._color}88`,
                      } : {}),
                      ...(hovered === p.id ? { filter: 'brightness(1.08) saturate(1.05)' } : {}),
                    }}
                  >
                    {barW > 48 && (
                      <span style={{
                        fontSize: '11px', fontWeight: '600',
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        letterSpacing: '-0.01em',
                        flex: 1,
                      }}>
                        {p.name}
                      </span>
                    )}
                    {barW > 110 && hovered === p.id && (
                      <ExternalLink size={10} color="rgba(255,255,255,0.8)" style={{ flexShrink: 0, marginLeft: '4px' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {projects.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: '200px', gap: '8px',
              }}>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Keine Projekte gefunden
                </p>
                {!showDone && (
                  <button onClick={() => setShowDone(true)} style={{
                    fontSize: '12.5px', color: 'var(--color-blue)',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}>
                    Abgeschlossene anzeigen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
