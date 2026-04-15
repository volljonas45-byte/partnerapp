import { Check } from 'lucide-react';
import { PHASE_ORDER, PHASES } from './workflowConfig';

export default function WorkflowStepper({ currentPhase }) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        minWidth: 'max-content',
        padding: '2px 0',
      }}>
        {PHASE_ORDER.map((phaseKey, idx) => {
          const phase    = PHASES[phaseKey];
          const isDone   = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div key={phaseKey} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Step */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                {/* Circle */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  ...(isDone ? {
                    background: '#34C759',
                    color: '#fff',
                  } : isActive ? {
                    background: 'var(--color-blue)',
                    color: '#fff',
                    boxShadow: '0 0 0 4px rgba(0,122,255,0.15)',
                  } : {
                    background: 'var(--color-card-secondary)',
                    color: 'var(--color-text-secondary)',
                  }),
                }}>
                  {isDone ? (
                    <Check size={15} strokeWidth={2.5} />
                  ) : (
                    <span>{phase.emoji}</span>
                  )}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  color: isDone ? '#34C759' : isActive ? 'var(--color-blue)' : 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                  maxWidth: '72px',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}>
                  {phase.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < PHASE_ORDER.length - 1 && (
                <div style={{
                  width: '40px',
                  height: '2px',
                  margin: '-14px 4px 0',
                  borderRadius: '2px',
                  background: idx < currentIdx ? '#34C759' : 'var(--color-border)',
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
