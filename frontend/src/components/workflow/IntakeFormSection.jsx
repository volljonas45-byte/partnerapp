import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Copy, ExternalLink, Check, Clock, CheckCircle2, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { intakeApi } from '../../api/intake';

// Standard-Template-Felder für Website-Briefing
const BRIEFING_FIELDS = [
  { key: 'company_name',   label: 'Unternehmensname',            type: 'text',     required: true  },
  { key: 'contact',        label: 'Ansprechpartner',              type: 'text',     required: false },
  { key: 'industry',       label: 'Branche & Zielgruppe',         type: 'textarea', required: false },
  { key: 'email',          label: 'E-Mail',                       type: 'text',     required: true  },
  { key: 'phone',          label: 'Telefon',                      type: 'text',     required: false },
  { key: 'existing_url',   label: 'Bestehende Website (URL)',     type: 'url',      required: false },
  { key: 'goal',           label: 'Ziel der neuen Website',       type: 'textarea', required: true  },
  { key: 'pages',          label: 'Gewünschte Seiten',            type: 'textarea', required: false },
  { key: 'features',       label: 'Gewünschte Features / Wünsche', type: 'textarea', required: false },
  { key: 'budget',         label: 'Budget-Vorstellung',           type: 'text',     required: false },
  { key: 'deadline',       label: 'Gewünschte Deadline',          type: 'text',     required: false },
  { key: 'notes',          label: 'Sonstiges / Anmerkungen',      type: 'textarea', required: false },
];

const TEMPLATE_MARKER = '__website_briefing__';

export default function IntakeFormSection({ projectId, projectName }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load all intake templates to find/create the standard one
  const { data: templates = [] } = useQuery({
    queryKey: ['intake-templates'],
    queryFn: () => intakeApi.getTemplates(),
  });

  // Load all intake forms for this project
  const { data: allForms = [] } = useQuery({
    queryKey: ['intake-forms'],
    queryFn: () => intakeApi.getForms(),
  });

  const projectForms = allForms.filter(f => f.project_id === Number(projectId));
  const existingForm = projectForms[0] || null;

  const baseUrl = window.location.origin;
  const formUrl = existingForm ? `${baseUrl}/intake/fill/${existingForm.token}` : null;

  async function handleCreate() {
    setCreating(true);
    try {
      // 1. Find or create the standard briefing template
      let template = templates.find(t => t.name === TEMPLATE_MARKER);
      if (!template) {
        template = await intakeApi.createTemplate({
          name:   TEMPLATE_MARKER,
          fields: JSON.stringify(BRIEFING_FIELDS.map((f, i) => ({
            ...f,
            position: i,
          }))),
        });
        qc.invalidateQueries({ queryKey: ['intake-templates'] });
      }

      // 2. Create a form for this project
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

  const isSubmitted = existingForm?.status === 'submitted';

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
        }}>
          {isSubmitted ? 'Briefing eingereicht ✅' : 'Kunden-Briefing'}
        </span>
        {existingForm && !isSubmitted && (
          <span style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#FF9500',
            background: 'rgba(255,149,0,0.12)',
            padding: '1px 8px',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            <Clock size={10} /> Ausstehend
          </span>
        )}
      </div>

      {/* No form yet */}
      {!existingForm && (
        <div>
          <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '10px', lineHeight: 1.5 }}>
            Sende dem Kunden ein Standard-Briefing-Formular um Infos zu Ziel, Seiten, Features und Budget zu sammeln.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              background: '#0071E3',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? (
              <><Loader size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> Wird erstellt…</>
            ) : (
              <><Send size={13} /> Briefing-Formular erstellen</>
            )}
          </button>
        </div>
      )}

      {/* Form exists */}
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
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 10px',
            background: '#F9F9F9',
            borderRadius: '8px',
            border: '1px solid #E5E5EA',
            marginBottom: '8px',
          }}>
            <span style={{
              flex: 1,
              fontSize: '11px',
              color: '#6E6E73',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {formUrl}
            </span>
            <button
              onClick={handleCopy}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: 'none',
                background: copied ? '#34C759' : '#E5E5EA',
                color: copied ? '#fff' : '#3C3C43',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '3px',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              {copied ? <><Check size={10} /> Kopiert</> : <><Copy size={10} /> Kopieren</>}
            </button>
            <a
              href={formUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: '#F2F2F7',
                color: '#3C3C43',
                fontSize: '11px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '3px',
                flexShrink: 0,
              }}
            >
              <ExternalLink size={10} /> Öffnen
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
