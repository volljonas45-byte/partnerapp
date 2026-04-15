import { useState } from 'react';
import { X } from 'lucide-react';
import { DECISIONS } from './workflowConfig';

export default function DecisionModal({ decisionKey, currentValue, onSave, onClose }) {
  const config = DECISIONS[decisionKey];
  const [selected, setSelected]   = useState(currentValue || '');
  const [dueDate,  setDueDate]    = useState('');

  if (!config) return null;

  const selectedOption = config.options.find(o => o.value === selected);
  const needsDate = selectedOption?.requiresDate;

  function handleSave() {
    if (!selected) return;
    if (needsDate && !dueDate) return;
    onSave(selected, needsDate ? dueDate : null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        background: 'var(--color-card)',
        borderRadius: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%',
        maxWidth: '420px',
        padding: '28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            {config.label}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '30px', height: '30px',
              borderRadius: '50%',
              background: 'var(--color-card-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {config.options.map(opt => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: `2px solid ${isSelected ? (opt.color || 'var(--color-blue)') : 'var(--color-card-secondary)'}`,
                  background: isSelected ? (opt.color ? `${opt.color}10` : 'rgba(0,122,255,0.06)') : 'var(--color-card-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                {/* Color dot */}
                {opt.color && (
                  <span style={{
                    width: '10px', height: '10px',
                    borderRadius: '50%',
                    background: opt.color,
                    flexShrink: 0,
                  }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isSelected ? (opt.color || 'var(--color-blue)') : 'var(--color-text)',
                  }}>
                    {opt.label}
                  </div>
                  {opt.desc && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                      {opt.desc}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div style={{
                    width: '20px', height: '20px',
                    borderRadius: '50%',
                    background: opt.color || 'var(--color-blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Date picker for "postponed" */}
        {needsDate && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Follow-up Datum
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #E5E5EA',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1.5px solid #E5E5EA',
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || (needsDate && !dueDate)}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: !selected || (needsDate && !dueDate) ? 'var(--color-border)' : 'var(--color-blue)',
              color: !selected || (needsDate && !dueDate) ? 'var(--color-text-secondary)' : '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: !selected || (needsDate && !dueDate) ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            Entscheidung speichern
          </button>
        </div>
      </div>
    </>
  );
}
