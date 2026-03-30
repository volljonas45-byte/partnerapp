import { useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

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
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18, padding: '24px', width: '100%', maxWidth: 360,
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          animation: 'modalIn 0.25s cubic-bezier(0.34,1.38,0.64,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modalIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: 'rgba(0,113,227,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarDays size={16} color="#0071E3" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F' }}>Follow-up planen</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', display: 'block', marginBottom: 5 }}>Datum</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
              border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', display: 'block', marginBottom: 5 }}>Notiz</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Notiz zum Follow-up..."
            rows={2}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5,
              border: '1.5px solid #E5E5EA', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: '1.5px solid #E5E5EA', background: '#fff', color: '#636366', cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!date}
            style={{
              flex: 2, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: 'none', background: date ? '#0071E3' : '#E5E5EA',
              color: date ? '#fff' : '#AEAEB2', cursor: date ? 'pointer' : 'not-allowed',
            }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
