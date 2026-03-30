import { useState } from 'react';
import { Settings, X } from 'lucide-react';

export default function SalesTargetModal({ targets, onSave, onClose, isPending }) {
  const [form, setForm] = useState({
    daily_calls:     targets?.daily_calls ?? 30,
    daily_connects:  targets?.daily_connects ?? 10,
    daily_closings:  targets?.daily_closings ?? 2,
    weekly_calls:    targets?.weekly_calls ?? 150,
    weekly_closings: targets?.weekly_closings ?? 8,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: parseInt(v, 10) || 0 }));

  const FIELDS = [
    { key: 'daily_calls',     label: 'Tägliche Anrufe' },
    { key: 'daily_connects',  label: 'Tägliche Gespräche' },
    { key: 'daily_closings',  label: 'Tägliche Abschlüsse' },
    { key: 'weekly_calls',    label: 'Wöchentliche Anrufe' },
    { key: 'weekly_closings', label: 'Wöchentliche Abschlüsse' },
  ];

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
          background: '#fff', borderRadius: 18, padding: '28px', width: '100%', maxWidth: 420,
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: 'rgba(0,113,227,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Settings size={16} color="#0071E3" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.3px' }}>
              Tagesziele bearbeiten
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868B', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {FIELDS.map(f => (
            <div key={f.key} style={f.key === 'weekly_closings' ? { gridColumn: 'span 2' } : undefined}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#636366', display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input
                type="number"
                min={0}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
                  border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
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
            onClick={() => onSave(form)}
            disabled={isPending}
            style={{
              flex: 2, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: 'none', background: '#0071E3', color: '#fff',
              cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
