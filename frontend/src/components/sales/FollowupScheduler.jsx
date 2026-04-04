import { useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

function toISO(d) { return d.toISOString().slice(0, 10); }

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function defaultDate() { return offsetDate(2); }

const QUICK = [
  { label: 'Heute',       days: 0 },
  { label: 'Morgen',      days: 1 },
  { label: 'In 3 Tagen',  days: 3 },
  { label: 'Nächste Woche', days: 7 },
];

export default function FollowupScheduler({ leadId, currentDate, onSave, onClose }) {
  const [date, setDate] = useState(currentDate || defaultDate());
  const [note, setNote] = useState('');

  function handleSave() {
    if (!date) return;
    onSave(leadId, date, note);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 150, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 16px', boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 20, padding: '24px', width: '100%', maxWidth: 360,
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          animation: 'modalIn 0.25s cubic-bezier(0.34,1.38,0.64,1) both',
          boxSizing: 'border-box', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modalIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,113,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={16} color="#0071E3" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F' }}>Follow-up planen</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', color: '#636366', padding: 0, width: 28, height: 28, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {QUICK.map(({ label, days }) => {
            const val = offsetDate(days);
            const isActive = date === val;
            return (
              <button
                key={label}
                onClick={() => setDate(val)}
                style={{
                  padding: '6px 13px', borderRadius: 99, fontSize: 12.5, fontWeight: 600,
                  background: isActive ? '#0071E3' : 'rgba(0,113,227,0.08)',
                  color: isActive ? '#fff' : '#0071E3',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 2px 8px rgba(0,113,227,0.3)' : 'none',
                }}
              >{label}</button>
            );
          })}
        </div>

        {/* Date input */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', display: 'block', marginBottom: 5 }}>Datum</label>
          <div style={{ overflow: 'hidden', borderRadius: 10, border: '1.5px solid #E5E5EA' }}>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14, boxSizing: 'border-box', display: 'block', background: '#fff' }}
            />
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', display: 'block', marginBottom: 5 }}>Notiz</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Notiz zum Follow-up..."
            rows={2}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5, border: '1.5px solid #E5E5EA', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1.5px solid #E5E5EA', background: '#fff', color: '#636366', cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!date}
            style={{ flex: 2, padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: date ? '#0071E3' : '#E5E5EA', color: date ? '#fff' : '#AEAEB2', cursor: date ? 'pointer' : 'not-allowed' }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
