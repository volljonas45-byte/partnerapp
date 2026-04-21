import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Phone, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { salesApi } from '../../api/sales';
import { useTheme } from '../../context/ThemeContext';

const OUTCOME_CFG = {
  reached:     { label: 'Erreicht',       color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
  not_reached: { label: 'Nicht erreicht', color: '#8E8E93', bg: 'rgba(142,142,147,0.1)' },
  voicemail:   { label: 'Mailbox',        color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  callback:    { label: 'Rückruf',        color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
};

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

function fmtDuration(sec) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function ProfileGroup({ company, calls, c }) {
  const [expanded, setExpanded] = useState(true);
  const reachCount = calls.filter(c => c.outcome === 'reached').length;

  return (
    <div style={{ borderBottom: `1px solid ${c.borderSubtle}` }}>
      {/* Group header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Phone size={14} color="#007AFF" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700, color: c.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{company}</div>
          <div style={{ fontSize: 11, color: c.textTertiary, marginTop: 1 }}>
            {calls.length} {calls.length === 1 ? 'Anruf' : 'Anrufe'} · {reachCount}× erreicht
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: 'rgba(0,122,255,0.08)', color: '#007AFF',
          }}>{calls.length}</span>
          {expanded
            ? <ChevronDown size={14} color={c.textTertiary} />
            : <ChevronRight size={14} color={c.textTertiary} />}
        </div>
      </button>

      {/* Call entries */}
      {expanded && (
        <div style={{ paddingBottom: 8 }}>
          {calls.map(call => {
            const o = OUTCOME_CFG[call.outcome] || OUTCOME_CFG.not_reached;
            const dur = fmtDuration(call.duration_sec);
            return (
              <div key={call.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '7px 0 7px 42px',
                borderTop: `1px solid ${c.borderSubtle}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: c.textSecondary, marginBottom: call.notes ? 3 : 0 }}>
                    {fmtDateTime(call.started_at)}
                    {dur && <span style={{ marginLeft: 6, color: c.textTertiary }}>· {dur}</span>}
                  </div>
                  {call.notes && (
                    <div style={{
                      fontSize: 11.5, color: c.textTertiary, lineHeight: 1.45,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>{call.notes}</div>
                  )}
                </div>
                <span style={{
                  padding: '2px 7px', borderRadius: 99, fontSize: 10.5, fontWeight: 600,
                  background: o.bg, color: o.color, flexShrink: 0, marginTop: 2,
                }}>{o.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CallLogbookModal({ ownerParam, onClose }) {
  const { c } = useTheme();
  const [search, setSearch] = useState('');

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['sales-calls-all', ownerParam],
    queryFn: () => salesApi.listCalls({ ...(ownerParam ? { owner_id: ownerParam } : {}) }),
  });

  const grouped = useMemo(() => {
    const map = new Map();
    calls.forEach(call => {
      const key = call.company_name || '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(call);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length);
  }, [calls]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.filter(([company]) => company.toLowerCase().includes(q));
  }, [grouped, search]);

  const stats = useMemo(() => {
    const total = calls.length;
    const reached = calls.filter(c => c.outcome === 'reached').length;
    const notReached = calls.filter(c => c.outcome === 'not_reached').length;
    const voicemail = calls.filter(c => c.outcome === 'voicemail').length;
    const callback = calls.filter(c => c.outcome === 'callback').length;
    return { total, reached, notReached, voicemail, callback };
  }, [calls]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: c.card, borderRadius: 18,
        border: `0.5px solid ${c.border}`,
        boxShadow: '0 32px 64px rgba(0,0,0,0.3)',
        width: '100%', maxWidth: 620, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: `1px solid ${c.borderSubtle}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Phone size={16} color="#007AFF" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c.text, letterSpacing: '-0.3px' }}>Anruf-Logbuch</div>
              <div style={{ fontSize: 11.5, color: c.textTertiary }}>{stats.total} Anrufe gesamt</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 99, border: 'none',
              background: c.borderSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={14} color={c.textSecondary} />
          </button>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: 0,
          padding: '10px 20px', borderBottom: `1px solid ${c.borderSubtle}`,
          flexShrink: 0, flexWrap: 'wrap', rowGap: 6,
        }}>
          {[
            { label: 'Erreicht',        value: stats.reached,    color: '#34C759' },
            { label: 'Nicht erreicht',  value: stats.notReached, color: '#8E8E93' },
            { label: 'Mailbox',         value: stats.voicemail,  color: '#FF9500' },
            { label: 'Rückruf',         value: stats.callback,   color: '#007AFF' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 5, marginRight: 16,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: 99, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: c.textSecondary }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${c.borderSubtle}`, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: c.borderSubtle, borderRadius: 9, padding: '7px 10px',
          }}>
            <Search size={13} color={c.textTertiary} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Firma suchen…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: c.text, fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: c.textTertiary }}>
              Lade Anrufe…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: c.textTertiary }}>
              {search ? 'Keine Treffer' : 'Noch keine Anrufe'}
            </div>
          ) : filtered.map(([company, companyCalls]) => (
            <ProfileGroup key={company} company={company} calls={companyCalls} c={c} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
