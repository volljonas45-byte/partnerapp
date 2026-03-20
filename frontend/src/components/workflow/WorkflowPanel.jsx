import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowApi } from '../../api/workflow';
import { PHASE_ORDER } from './workflowConfig';
import WorkflowStepper from './WorkflowStepper';
import PhaseCard from './PhaseCard';
import QuickToolMenu from './QuickToolMenu';
import ReminderCard from './ReminderCard';

export default function WorkflowPanel({ projectId }) {
  const qc = useQueryClient();
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderForm,     setReminderForm]     = useState({ title: '', due_date: '', note: '' });

  // ── Data ────────────────────────────────────────────────────────────────────

  const { data: wf, isLoading } = useQuery({
    queryKey: ['workflow', projectId],
    queryFn: () => workflowApi.get(projectId).then(r => r.data),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['workflow', projectId, 'reminders'],
    queryFn: () => workflowApi.getReminders(projectId).then(r => r.data),
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (data) => workflowApi.update(projectId, data),
    onSuccess:  (res) => qc.setQueryData(['workflow', projectId], res.data),
    onError:    () => toast.error('Fehler beim Speichern'),
  });

  const advanceMutation = useMutation({
    mutationFn: () => workflowApi.advance(projectId),
    onSuccess: (res) => {
      qc.setQueryData(['workflow', projectId], res.data);
      qc.invalidateQueries({ queryKey: ['projects'] });
      const phase = res.data?.current_phase;
      if (phase === 'abgeschlossen') {
        toast.success('🎉 Projekt abgeschlossen!');
      } else {
        toast.success('Phase abgeschlossen!');
      }
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Fehler'),
  });

  const addReminderMutation = useMutation({
    mutationFn: (data) => workflowApi.addReminder(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow', projectId, 'reminders'] });
      qc.invalidateQueries({ queryKey: ['workflow-reminders'] });
      setShowReminderForm(false);
      setReminderForm({ title: '', due_date: '', note: '' });
      toast.success('Erinnerung erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const doneReminderMutation = useMutation({
    mutationFn: (id) => workflowApi.updateReminder(projectId, id, { done: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow', projectId, 'reminders'] });
      qc.invalidateQueries({ queryKey: ['workflow-reminders'] });
    },
    onError: () => toast.error('Fehler'),
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id) => workflowApi.deleteReminder(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow', projectId, 'reminders'] });
      qc.invalidateQueries({ queryKey: ['workflow-reminders'] });
    },
    onError: () => toast.error('Fehler'),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleTaskToggle(phaseKey, taskKey, value) {
    const existing = wf?.phase_data || {};
    updateMutation.mutate({
      phase_data: {
        [phaseKey]: {
          tasks: {
            ...(existing[phaseKey]?.tasks || {}),
            [taskKey]: value,
          },
        },
      },
    });
  }

  function handleDecisionSave(decisionKey, value, dueDate) {
    // Save decision
    updateMutation.mutate({ decisions: { [decisionKey]: value } });

    // Mark the task as done too
    const phaseMap = {
      build_type:     { phase: 'demo',        task: 'build_type_decided' },
      outcome:        { phase: 'entscheidung', task: 'outcome_decided' },
      legal_solution: { phase: 'rechtliches',  task: 'legal_solution_chosen' },
    };
    const info = phaseMap[decisionKey];
    if (info) {
      handleTaskToggle(info.phase, info.task, true);
    }

    // Handle "postponed" → create reminder
    if (decisionKey === 'outcome' && value === 'postponed' && dueDate) {
      addReminderMutation.mutate({
        title:    'Follow-up: Projekt verschoben',
        due_date: dueDate,
        type:     'followup',
        note:     'Kunde hat Entscheidung verschoben — nachfassen',
      });
      toast('Reminder für Follow-up erstellt', { icon: '📅' });
    }

    // Toast for outcome
    if (decisionKey === 'outcome') {
      const labels = { won: '🎉 Gewonnen!', lost: '😔 Verloren', postponed: '📅 Verschoben' };
      toast(labels[value] || 'Entscheidung gespeichert');
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <div style={{
          width: '28px', height: '28px',
          border: '2px solid #0071E3',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  if (!wf) return null;

  const currentPhase = wf.current_phase || 'demo';
  const phaseData    = wf.phase_data    || {};
  const decisions    = wf.decisions     || {};
  const openReminders = reminders.filter(r => !r.done);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header: Stepper + Tools ── */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #F2F2F7',
        padding: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F', margin: '0 0 16px' }}>
              Workflow
            </h2>
            <WorkflowStepper currentPhase={currentPhase} />
          </div>
          <QuickToolMenu />
        </div>
      </div>

      {/* ── Phase Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {PHASE_ORDER.map(phaseKey => (
          <PhaseCard
            key={phaseKey}
            phaseKey={phaseKey}
            currentPhase={currentPhase}
            phaseData={phaseData}
            decisions={decisions}
            onTaskToggle={handleTaskToggle}
            onDecisionSave={handleDecisionSave}
            onAdvance={() => advanceMutation.mutate()}
            isAdvancing={advanceMutation.isPending}
          />
        ))}
      </div>

      {/* ── Reminders ── */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #F2F2F7',
        padding: '18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={14} color="#BF5AF2" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
              Erinnerungen
            </span>
            {openReminders.length > 0 && (
              <span style={{
                background: '#BF5AF2', color: '#fff',
                fontSize: '11px', fontWeight: 600,
                padding: '1px 7px', borderRadius: '20px',
              }}>
                {openReminders.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowReminderForm(s => !s)}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              border: 'none',
              background: '#F2F2F7',
              color: '#BF5AF2',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <Plus size={12} /> Hinzufügen
          </button>
        </div>

        {/* Add form */}
        {showReminderForm && (
          <div style={{
            background: '#FAFAFA',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '12px',
            border: '1px solid #F2F2F7',
          }}>
            <form onSubmit={(e) => { e.preventDefault(); if (!reminderForm.title || !reminderForm.due_date) return; addReminderMutation.mutate(reminderForm); }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  placeholder="Titel der Erinnerung…"
                  value={reminderForm.title}
                  onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))}
                  required
                  style={{
                    padding: '9px 12px', borderRadius: '10px',
                    border: '1.5px solid #E5E5EA', fontSize: '13px', outline: 'none',
                  }}
                />
                <input
                  type="date"
                  value={reminderForm.due_date}
                  onChange={e => setReminderForm(f => ({ ...f, due_date: e.target.value }))}
                  required
                  style={{
                    padding: '9px 12px', borderRadius: '10px',
                    border: '1.5px solid #E5E5EA', fontSize: '13px', outline: 'none',
                  }}
                />
                <textarea
                  placeholder="Notiz (optional)"
                  value={reminderForm.note}
                  onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))}
                  rows={2}
                  style={{
                    padding: '9px 12px', borderRadius: '10px',
                    border: '1.5px solid #E5E5EA', fontSize: '13px', outline: 'none',
                    resize: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReminderForm(false)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '10px',
                      border: '1.5px solid #E5E5EA', background: '#fff',
                      fontSize: '13px', cursor: 'pointer', color: '#6E6E73',
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2, padding: '9px', borderRadius: '10px',
                      border: 'none', background: '#BF5AF2',
                      fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', color: '#fff',
                    }}
                  >
                    Erstellen
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Reminder list */}
        {openReminders.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#8E8E93', textAlign: 'center', padding: '12px 0' }}>
            Keine offenen Erinnerungen
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {openReminders.map(r => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onDone={() => doneReminderMutation.mutate(r.id)}
                onDelete={() => deleteReminderMutation.mutate(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
