import { useState, useEffect, useRef } from 'react';
import { Phone, X, PhoneOff } from 'lucide-react';

const OUTCOMES = [
  { key: 'reached',     label: 'Erreicht',        color: '#34C759' },
  { key: 'not_reached', label: 'Nicht erreicht',   color: '#86868B' },
  { key: 'voicemail',   label: 'Mailbox',          color: '#FF9500' },
  { key: 'callback',    label: 'Rückruf',          color: '#0071E3' },
];

function fmtTimer(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function CallInProgressSheet({ callId, clientName, phone, onEnd, onClose }) {
  const [elapsed, setElapsed] = useState(0);
  const [outcome, setOutcome] = useState('reached');
  const [notes, setNotes] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  function handleEnd() {
    clearInterval(intervalRef.current);
    onEnd(callId, outcome, notes, elapsed);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 24px 32px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        animation: 'slideUp 0.25s cubic-bezier(0.34,1.38,0.64,1) both',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: 'rgba(52,199,89,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Phone size={18} color="#34C759" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F' }}>{clientName}</div>
              <div style={{ fontSize: 13, color: '#86868B' }}>{phone}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#86868B' }}>
            <X size={20} />
          </button>
        </div>

        {/* Timer */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
            {fmtTimer(elapsed)}
          </div>
          <div style={{ fontSize: 12, color: '#86868B', marginTop: 2 }}>Laufzeit</div>
        </div>

        {/* Outcome buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {OUTCOMES.map(o => {
            const selected = outcome === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setOutcome(o.key)}
                style={{
                  padding: '10px 4px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${selected ? o.color : '#E5E5EA'}`,
                  background: selected ? `${o.color}14` : '#fff',
                  color: selected ? o.color : '#636366',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notizen zum Anruf..."
          rows={2}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5,
            border: '1.5px solid #E5E5EA', outline: 'none', resize: 'vertical',
            fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        {/* End call button */}
        <button
          onClick={handleEnd}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 600,
            background: '#FF3B30', color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.15s',
          }}
        >
          <PhoneOff size={16} />
          Anruf beenden
        </button>
      </div>
    </div>
  );
}
