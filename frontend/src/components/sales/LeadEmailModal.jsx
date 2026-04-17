import { useState } from 'react';
import { X, Mail, ExternalLink, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const TEMPLATES = [
  { label: 'Keine Vorlage', subject: '', body: '' },
  {
    label: 'Erstkontakt Website',
    subject: 'Ihre Online-Präsenz – kurze Anfrage',
    body: `Sehr geehrte Damen und Herren,

mein Name ist Jonas Ruf von Vecturo. Ich habe Ihre Website besucht und glaube, dass wir Ihnen helfen können, Ihren Online-Auftritt deutlich zu verbessern.

Wäre ein kurzes Gespräch möglich?

Mit freundlichen Grüßen
Jonas Ruf
Vecturo`,
  },
  {
    label: 'Follow-up nach Anruf',
    subject: 'Unser Gespräch – nächste Schritte',
    body: `Sehr geehrte Damen und Herren,

vielen Dank für unser heutiges Gespräch. Wie besprochen sende ich Ihnen hiermit weitere Informationen zu.

Bei Fragen stehe ich jederzeit zur Verfügung.

Mit freundlichen Grüßen
Jonas Ruf
Vecturo`,
  },
  {
    label: 'Angebot einholen',
    subject: 'Unverbindliches Angebot für Ihre Website',
    body: `Sehr geehrte Damen und Herren,

ich würde Ihnen gerne ein unverbindliches Angebot für eine moderne Website zusenden.

Könnten Sie mir kurz Ihre Anforderungen mitteilen?

Mit freundlichen Grüßen
Jonas Ruf
Vecturo`,
  },
];

export default function LeadEmailModal({ lead, onClose }) {
  const { c } = useTheme();
  const [to, setTo] = useState(lead.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  function applyTemplate(tpl) {
    setSubject(tpl.subject);
    setBody(tpl.body);
    setShowTemplates(false);
  }

  function handleOpen() {
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
    onClose();
  }

  const canSend = to.trim().length > 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
        padding: '0 0 env(safe-area-inset-bottom)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: c.card, borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 560,
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1) both',
          boxSizing: 'border-box',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(175,82,222,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} color="#AF52DE" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>E-Mail verfassen</div>
              <div style={{ fontSize: 11.5, color: c.textTertiary }}>{lead.company_name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Template picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowTemplates(v => !v)}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: c.inputBg, border: 'none', cursor: 'pointer',
                  color: c.textSecondary, display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Vorlage <ChevronDown size={12} />
              </button>
              {showTemplates && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: c.card, borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
                  border: `1px solid ${c.border}`, minWidth: 190, zIndex: 10, overflow: 'hidden',
                }}>
                  {TEMPLATES.map(tpl => (
                    <button
                      key={tpl.label}
                      onClick={() => applyTemplate(tpl)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', fontSize: 13, fontWeight: 500,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: c.text, borderBottom: `1px solid ${c.borderSubtle}`,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = c.cardSecondary}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 99, border: 'none', background: c.inputBg, cursor: 'pointer', color: c.textTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* To */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>An</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="E-Mail-Adresse"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
                border: `1.5px solid ${to ? c.blue + '60' : c.border}`,
                background: c.cardSecondary, color: c.text, outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
            />
          </div>

          {/* Subject */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>Betreff</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Betreff eingeben..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
                border: `1.5px solid ${c.border}`,
                background: c.cardSecondary, color: c.text, outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Body */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>Inhalt</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="E-Mail Inhalt schreiben..."
              rows={8}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5,
                border: `1.5px solid ${c.border}`,
                background: c.cardSecondary, color: c.text, outline: 'none',
                resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600, border: `1.5px solid ${c.border}`, background: c.card, color: c.textSecondary, cursor: 'pointer' }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleOpen}
            disabled={!canSend}
            style={{
              flex: 2, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
              border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
              background: canSend ? '#AF52DE' : c.border,
              color: canSend ? '#fff' : c.textTertiary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <ExternalLink size={15} /> In E-Mail-Programm öffnen
          </button>
        </div>
      </div>
    </div>
  );
}
