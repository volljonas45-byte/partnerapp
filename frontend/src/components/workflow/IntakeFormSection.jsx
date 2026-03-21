import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Copy, ExternalLink, Check, Clock, CheckCircle2, Loader, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { intakeApi } from '../../api/intake';

// Standard-Template-Felder für Website-Briefing
// Jedes Feld braucht eine `id` (wird von IntakePublic als Response-Key verwendet)
const BRIEFING_FIELDS = [
  { id: 'company_name', key: 'company_name', label: 'Unternehmensname',             type: 'text',     required: true  },
  { id: 'contact',      key: 'contact',      label: 'Ansprechpartner',               type: 'text',     required: false },
  { id: 'industry',     key: 'industry',     label: 'Branche & Zielgruppe',          type: 'textarea', required: false },
  { id: 'email',        key: 'email',        label: 'E-Mail',                        type: 'text',     required: true  },
  { id: 'phone',        key: 'phone',        label: 'Telefon',                       type: 'text',     required: false },
  { id: 'existing_url', key: 'existing_url', label: 'Bestehende Website (URL)',      type: 'url',      required: false },
  { id: 'goal',         key: 'goal',         label: 'Ziel der neuen Website',        type: 'textarea', required: true  },
  { id: 'pages',        key: 'pages',        label: 'Gewünschte Seiten',             type: 'textarea', required: false },
  { id: 'features',     key: 'features',     label: 'Gewünschte Features / Wünsche', type: 'textarea', required: false },
  { id: 'budget',       key: 'budget',       label: 'Budget-Vorstellung',            type: 'text',     required: false },
  { id: 'deadline',     key: 'deadline',     label: 'Gewünschte Deadline',           type: 'text',     required: false },
  { id: 'notes',        key: 'notes',        label: 'Sonstiges / Anmerkungen',       type: 'textarea', required: false },
];

// v2: neues Marker-Name → zwingt zur Neuanlage (altes Template war doppelt-encoded)
const TEMPLATE_MARKER = '__website_briefing_v2__';

export default function IntakeFormSection({ projectId, projectName, briefingDone, onSkip }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  // Templates laden
  const { data: templates = [] } = useQuery({
    queryKey: ['intake-templates'],
    queryFn: () => intakeApi.getTemplates(),
  });

  // Alle Formulare für dieses Projekt laden
  const { data: allForms = [] } = useQuery({
    queryKey: ['intake-forms'],
    queryFn: () => intakeApi.getForms(),
  });

  const projectForms  = allForms.filter(f => f.project_id === Number(projectId));
  const existingForm  = projectForms[0] || null;
  const formUrl       = existingForm ? `${window.location.origin}/intake/fill/${existingForm.token}` : null;
  const isSubmitted   = existingForm?.status === 'submitted';

  // Wenn das Briefing telefonisch erledigt wurde (Task-Checkbox manuell abgehakt)
  if (briefingDone && !existingForm) {
    return (
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(52,199,89,0.06)',
        border: '1.5px solid rgba(52,199,89,0.2)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <CheckCircle2 size={14} color="#34C759" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#34C759' }}>
          Briefing telefonisch erledigt ✓
        </span>
      </div>
    );
  }

  async function handleCreate() {
    setCreating(true);
    try {
      // 1. Standard-Template suchen oder neu anlegen
      let template = templates.find(t => t.name === TEMPLATE_MARKER);
      if (!template) {
        // WICHTIG: fields als Array übergeben (NICHT stringifizieren) — Backend macht JSON.stringify selbst
        template = await intakeApi.createTemplate({
          name:   TEMPLATE_MARKER,
          fields: BRIEFING_FIELDS.map((f, i) => ({ ...f, position: i })),
        });
        qc.invalidateQueries({ queryKey: ['intake-templates'] });
      }

      // 2. Formular für dieses Projekt anlegen
      await intakeApi.createForm({
        template_id: template.id,
        project_id:  Number(projectId),
        title:       `Briefing – ${projectName || 'Projekt'}`,
      });

      qc.invalidateQueries({ queryKey: ['intake-forms'] });
      toast.success('Briefing-Formular erstellt!');
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Erstellen des Formulars');
    } finally {
      setCreating(false);
    }
  }

  function handleCopy() {
    if (!formUrl) return;
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link kopiert!');
    });
  }

  function handleSkip() {
    onSkip?.();
    toast.success('Briefing als erledigt markiert');
  }

  return (
    <div style={{
      marginTop: '16px',
      padding: '14px 16px',
      borderRadius: '12px',
      background: isSubmitted
        ? 'rgba(52,199,89,0.06)'
        : existingForm
        ? 'rgba(0,113,227,0.05)'
        : 'rgba(0,113,227,0.04)',
      border: `1.5px solid ${isSubmitted ? 'rgba(52,199,89,0.25)' : 'rgba(0,113,227,0.15)'}`,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        {isSubmitted
          ? <CheckCircle2 size={15} color="#34C759" />
          : <Send size={15} color="#0071E3" />
        }
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: isSubmitted ? '#34C759' : '#0071E3',
          flex: 1,
        }}>
          {isSubmitted ? 'Briefing eingereicht ✅' : 'Kunden-Briefing'}
        </span>
        {existingForm && !isSubmitted && (
          <span style={{
            fontSize: '11px', fontWeight: 500, color: '#FF9500',
            background: 'rgba(255,149,0,0.12)', padding: '1px 8px',
            borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            <Clock size={10} /> Ausstehend
          </span>
        )}
      </div>

      {/* Noch kein Formular */}
      {!existingForm && (
        <div>
          <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '10px', lineHeight: 1.5 }}>
            Sende dem Kunden ein Briefing-Formular um Ziel, Seiten, Features und Budget abzufragen.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px',
                border: 'none', background: '#0071E3', color: '#fff',
                fontSize: '13px', fontWeight: 600,
                cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating
                ? <><Loader size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> Wird erstellt…</>
                : <><Send size={13} /> Briefing-Formular erstellen</>
              }
            </button>

            {/* Telefonisch erledigt */}
            {onSkip && (
              <button
                onClick={handleSkip}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px',
                  border: '1.5px solid #E5E5EA', background: '#F9F9F9',
                  color: '#6E6E73', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Phone size={13} /> Telefonisch erledigt
              </button>
            )}
          </div>
        </div>
      )}

      {/* Formular vorhanden */}
      {existingForm && (
        <div>
          {isSubmitted ? (
            <p style={{ fontSize: '12px', color: '#34C759', marginBottom: '8px' }}>
              Eingereicht am {new Date(existingForm.submitted_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '8px' }}>
              Link an den Kunden senden — das Formular ist öffentlich aufrufbar.
            </p>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 10px', background: '#F9F9F9',
            borderRadius: '8px', border: '1px solid #E5E5EA', marginBottom: '8px',
          }}>
            <span style={{
              flex: 1, fontSize: '11px', color: '#6E6E73',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {formUrl}
            </span>
            <button
              onClick={handleCopy}
              style={{
                padding: '3px 8px', borderRadius: '6px', border: 'none',
                background: copied ? '#34C759' : '#E5E5EA',
                color: copied ? '#fff' : '#3C3C43',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '3px',
                flexShrink: 0, transition: 'background 0.15s',
              }}
            >
              {copied ? <><Check size={10} /> Kopiert</> : <><Copy size={10} /> Kopieren</>}
            </button>
            <a
              href={formUrl} target="_blank" rel="noreferrer"
              style={{
                padding: '3px 8px', borderRadius: '6px',
                background: '#F2F2F7', color: '#3C3C43',
                fontSize: '11px', fontWeight: 600, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0,
              }}
            >
              <ExternalLink size={10} /> Öffnen
            </a>
          </div>

          {/* Auch hier: telefonisch erledigt Option (wenn noch nicht submitted) */}
          {!isSubmitted && onSkip && (
            <button
              onClick={handleSkip}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', borderRadius: '8px',
                border: '1px solid #E5E5EA', background: 'transparent',
                color: '#8E8E93', fontSize: '11px', fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Phone size={11} /> Briefing telefonisch erledigt
            </button>
          )}
        </div>
      )}
    </div>
  );
}
