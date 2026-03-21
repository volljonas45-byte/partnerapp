import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { PHASE_ORDER, PHASES, DECISIONS } from './workflowConfig';
import DecisionModal from './DecisionModal';
import IntakeFormSection from './IntakeFormSection';

function TaskRow({ task, checked, onToggle, decisions, onDecision }) {
  const isVisible = !task.condition || task.condition(decisions);
  if (!isVisible) return null;

  const decisionConfig = task.decision ? DECISIONS[task.decision] : null;
  const decisionValue  = task.decision ? decisions[task.decision] : null;
  const decisionLabel  = decisionValue
    ? decisionConfig?.options.find(o => o.value === decisionValue)?.label
    : null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '9px 0',
      borderBottom: '1px solid #F2F2F7',
    }}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(!checked)}
        style={{
          width: '20px', height: '20px',
          borderRadius: '6px',
          border: `2px solid ${checked ? '#34C759' : '#D1D1D6'}`,
          background: checked ? '#34C759' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
      >
        {checked && <Check size={12} strokeWidth={3} color="#fff" />}
      </button>

      {/* Label */}
      <span style={{
        flex: 1,
        fontSize: '14px',
        color: checked ? '#8E8E93' : '#1D1D1F',
        textDecoration: checked ? 'line-through' : 'none',
        lineHeight: 1.4,
      }}>
        {task.label}
      </span>

      {/* Decision badge / button */}
      {task.decision && (
        <button
          onClick={() => onDecision(task.decision)}
          style={{
            padding: '3px 10px',
            borderRadius: '20px',
            border: `1.5px solid ${decisionValue ? '#0071E3' : '#D1D1D6'}`,
            background: decisionValue ? 'rgba(0,113,227,0.08)' : '#F9F9F9',
            color: decisionValue ? '#0071E3' : '#8E8E93',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {decisionValue ? (
            <>
              <Check size={11} strokeWidth={2.5} />
              {decisionLabel}
            </>
          ) : (
            <>
              <Zap size={11} />
              Entscheiden
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function PhaseCard({
  phaseKey,
  currentPhase,
  phaseData,
  decisions,
  onTaskToggle,
  onDecisionSave,
  onAdvance,
  isAdvancing,
  projectId,
  projectName,
}) {
  const phase      = PHASES[phaseKey];
  const phaseIdx   = PHASE_ORDER.indexOf(phaseKey);
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);

  const isDone   = phaseIdx < currentIdx;
  const isActive = phaseKey === currentPhase;
  const isFuture = phaseIdx > currentIdx;

  const [expanded,      setExpanded]      = useState(isActive);
  const [decisionModal, setDecisionModal] = useState(null); // decisionKey or null

  const tasks    = phase.tasks || [];
  const phaseTasks = phaseData[phaseKey]?.tasks || {};

  // Filter visible tasks
  const visibleTasks = tasks.filter(t => !t.condition || t.condition(decisions));
  const doneTasks    = visibleTasks.filter(t => phaseTasks[t.key]).length;
  const totalTasks   = visibleTasks.length;
  const allDone      = totalTasks > 0 && doneTasks === totalTasks;
  const progress     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 100;

  // Can advance: all visible tasks done (or phase has no tasks)
  const canAdvance = isActive && allDone && currentPhase !== 'abgeschlossen';

  const borderLeft = isDone
    ? '3px solid #34C759'
    : isActive
    ? '3px solid #0071E3'
    : '3px solid transparent';

  return (
    <>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #F2F2F7',
        borderLeft,
        overflow: 'hidden',
        opacity: isFuture ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}>
        {/* Header */}
        <button
          onClick={() => !isFuture && setExpanded(e => !e)}
          disabled={isFuture}
          style={{
            width: '100%',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'none',
            border: 'none',
            cursor: isFuture ? 'default' : 'pointer',
            textAlign: 'left',
          }}
        >
          {/* Status icon */}
          <div style={{
            width: '36px', height: '36px',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            background: isDone ? '#F0FFF4' : isActive ? 'rgba(0,113,227,0.08)' : '#F9F9F9',
            flexShrink: 0,
          }}>
            {isDone ? '✅' : phase.emoji}
          </div>

          {/* Title + desc */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: isDone ? '#34C759' : isActive ? '#1D1D1F' : '#8E8E93',
              lineHeight: 1.3,
            }}>
              {phase.label}
              {isDone && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#34C759',
                  background: '#F0FFF4',
                  padding: '1px 8px',
                  borderRadius: '20px',
                }}>
                  Erledigt
                </span>
              )}
            </div>
            {isActive && !expanded && (
              <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>
                {phase.description}
              </div>
            )}
          </div>

          {/* Progress + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {!isDone && totalTasks > 0 && (
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: isActive ? '#0071E3' : '#8E8E93',
              }}>
                {doneTasks}/{totalTasks}
              </span>
            )}
            {!isFuture && (
              expanded
                ? <ChevronDown size={16} color="#8E8E93" />
                : <ChevronRight size={16} color="#8E8E93" />
            )}
          </div>
        </button>

        {/* Progress bar (active phase) */}
        {isActive && totalTasks > 0 && (
          <div style={{ height: '3px', background: '#F2F2F7', margin: '0 18px' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: '#0071E3',
              borderRadius: '2px',
              transition: 'width 0.3s',
            }} />
          </div>
        )}

        {/* Expanded content */}
        {expanded && !isFuture && (
          <div style={{ padding: '4px 18px 18px' }}>
            {/* Description */}
            <p style={{ fontSize: '13px', color: '#6E6E73', marginBottom: '12px', marginTop: '8px', lineHeight: 1.5 }}>
              {phase.description}
            </p>

            {/* Tasks */}
            {tasks.length > 0 && (
              <div>
                {tasks.map(task => (
                  <TaskRow
                    key={task.key}
                    task={task}
                    checked={!!phaseTasks[task.key]}
                    decisions={decisions}
                    onToggle={(val) => onTaskToggle(phaseKey, task.key, val)}
                    onDecision={(dk) => setDecisionModal(dk)}
                  />
                ))}
              </div>
            )}

            {/* Intake-Briefing (nur Demo-Phase) */}
            {phaseKey === 'demo' && projectId && (
              <IntakeFormSection
                projectId={projectId}
                projectName={projectName}
                briefingDone={!!phaseTasks['briefing_done']}
                onSkip={() => onTaskToggle('demo', 'briefing_done', true)}
              />
            )}

            {/* "Abgeschlossen" celebration */}
            {phaseKey === 'abgeschlossen' && (
              <div style={{
                textAlign: 'center',
                padding: '24px',
                fontSize: '40px',
              }}>
                🎉
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1D1D1F', marginTop: '8px' }}>
                  Projekt erfolgreich abgeschlossen!
                </div>
                <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '4px' }}>
                  Klasse Arbeit!
                </div>
              </div>
            )}

            {/* Advance button */}
            {canAdvance && phaseKey !== 'abgeschlossen' && (
              <button
                onClick={onAdvance}
                disabled={isAdvancing}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0071E3',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isAdvancing ? 'not-allowed' : 'pointer',
                  opacity: isAdvancing ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {isAdvancing ? 'Wird gespeichert…' : `✓ Phase abschließen → ${PHASES[PHASE_ORDER[phaseIdx + 1]]?.label}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {decisionModal && (
        <DecisionModal
          decisionKey={decisionModal}
          currentValue={decisions[decisionModal]}
          onSave={(value, dueDate) => {
            onDecisionSave(decisionModal, value, dueDate);
            setDecisionModal(null);
          }}
          onClose={() => setDecisionModal(null)}
        />
      )}
    </>
  );
}
