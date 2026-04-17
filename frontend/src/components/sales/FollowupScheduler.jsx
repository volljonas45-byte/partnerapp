import { useState } from 'react';
import { CalendarDays, X, Phone, Mail } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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

export default function FollowupScheduler({ leadId, currentDate, currentType, onSave, onClose }) {
  const { c } = useTheme();
  const [date, setDate] = useState(currentDate || defaultDate());
  const [note, setNote] = useState('');
  const [type, setType] = useState(currentType || 'anruf');

  function handleSave() {
    if (!date) return;
    onSave(leadId, date, note, type);
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
          background: c.card, borderRadius: 20, padding: '24px', width: '100%', maxWidth: 360,
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          animation: 'modalIn 0.25s cubic-bezier(0.34,1.38,0.64,1) both',
          boxSizing: 'border-box', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modalIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: type === 'email' ? 'rgba(175,82,222,0.1)' : 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
              {type === 'email' ? <Mail size={16} color="#AF52DE" /> : <CalendarDays size={16} color="#007AFF" />}
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Follow-up planen</span>
          </div>
          <button onClick={onClose} style={{ background: c.inputBg, border: 'none', cursor: 'pointer', color: c.textTertiary, padding: 0, width: 28, height: 28, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: c.inputBg, borderRadius: 10, padding: 4 }}>
          {[{ key: 'anruf', label: 'Anruf', Icon: Phone }, { key: 'email', label: 'E-Mail', Icon: Mail }].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setType(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px 0', borderRadius: 7, fontSize: 13, fontWeight: 600, border: 'none',
                background: type === key ? c.card : 'transparent',
                color: type === key ? (key === 'email' ? '#AF52DE' : c.blue) : c.textTertiary,
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: type === key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
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
                  background: isActive ? c.blue : c.blueLight,
                  color: isActive ? '#fff' : c.blue,
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? `0 2px 8px ${c.blue}40` : 'none',
                }}
              >{label}</button>
            );
          })}
        </div>

        {/* Date input */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: c.textTertiary, display: 'block', marginBottom: 5 }}>Datum</label>
          <div style={{ overflow: 'hidden', borderRadius: 10, border: `1.5px solid ${c.border}` }}>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14, boxSizing: 'border-box', display: 'block', background: c.cardSecondary, textAlign: 'center', color: c.text }}
            />
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: c.textTertiary, display: 'block', marginBottom: 5 }}>Notiz</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Notiz zum Follow-up..."
            rows={2}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5, border: `1.5px solid ${c.border}`, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: `1.5px solid ${c.border}`, background: c.card, color: c.textSecondary, cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!date}
            style={{ flex: 2, padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: date ? c.blue : c.border, color: date ? '#fff' : c.textTertiary, cursor: date ? 'pointer' : 'not-allowed' }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
