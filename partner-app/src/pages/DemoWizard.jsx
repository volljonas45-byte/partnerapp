import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Building2, User, Mail, Globe, MapPin, Briefcase,
  Calendar, Send, CheckCircle2, ChevronRight, ChevronLeft, X,
} from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#0D0D12', card: '#16161E', card2: '#1C1C26',
  border: 'rgba(255,255,255,0.07)', borderFocus: 'rgba(91,140,245,0.5)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', blueL: 'rgba(91,140,245,0.12)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
  purple: '#BF5AF2', purpleL: 'rgba(191,90,242,0.12)',
  orange: '#FF9F0A', orangeL: 'rgba(255,159,10,0.12)',
  inputBg: 'rgba(255,255,255,0.04)',
};

const glass = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)',
  border: `1px solid ${D.border}`,
  borderRadius: 20,
};

function Field({ label, icon: Icon, value, onChange, placeholder, type = 'text', required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
        color: D.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {Icon && <Icon size={12} />} {label} {required && <span style={{ color: D.blue }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: D.inputBg,
          border: `1px solid ${focused ? D.borderFocus : D.border}`,
          borderRadius: 10, padding: '10px 14px',
          fontSize: 14, color: D.text,
          outline: 'none', transition: 'border 0.15s',
        }}
      />
    </div>
  );
}

function TextArea({ label, icon: Icon, value, onChange, placeholder, rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
        color: D.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {Icon && <Icon size={12} />} {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: D.inputBg,
          border: `1px solid ${focused ? D.borderFocus : D.border}`,
          borderRadius: 10, padding: '10px 14px',
          fontSize: 14, color: D.text,
          outline: 'none', resize: 'vertical', transition: 'border 0.15s',
        }}
      />
    </div>
  );
}

const INDUSTRIES = [
  'Handwerk', 'Gastronomie', 'Einzelhandel', 'Dienstleistung', 'IT / Software',
  'Gesundheit', 'Immobilien', 'Bau', 'Logistik', 'Produktion', 'Sonstiges',
];

const STEPS = ['Firmendaten', 'Nächster Schritt', 'Abschluss'];

export default function DemoWizard() {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(null);

  // Step 0 — company data
  const [company, setCompany]           = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone]               = useState('');
  const [email, setEmail]               = useState('');
  const [website, setWebsite]           = useState('');
  const [city, setCity]                 = useState('');
  const [industry, setIndustry]         = useState('');
  const [notes, setNotes]               = useState('');

  // Step 1 — action
  const [action, setAction]             = useState(null); // 'appointment' | 'email' | 'none'

  // Step 1a — appointment
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [demoGoal, setDemoGoal]           = useState('');

  // Step 1b — email
  const [demoNotes, setDemoNotes]         = useState('');

  const wizard = useMutation({
    mutationFn: (d) => partnerApi.demoWizard(d),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['my-leads'] });
      qc.invalidateQueries({ queryKey: ['my-appts'] });
      setDone(data);
      setStep(2);
    },
  });

  function canProceedStep0() {
    return company.trim().length > 0;
  }

  function canProceedStep1() {
    if (!action) return false;
    if (action === 'appointment') return scheduledDate && scheduledTime;
    if (action === 'email') return email.trim().length > 0;
    return true;
  }

  function submit() {
    let payload = {
      company, contact_person: contactPerson, phone, email,
      website, city, industry, notes, action,
    };
    if (action === 'appointment') {
      payload.scheduled_at = `${scheduledDate}T${scheduledTime}:00`;
      payload.demo_goal = demoGoal;
    }
    if (action === 'email') {
      payload.demo_notes = demoNotes;
    }
    wizard.mutate(payload);
  }

  function reset() {
    setStep(0); setDone(null);
    setCompany(''); setContactPerson(''); setPhone(''); setEmail('');
    setWebsite(''); setCity(''); setIndustry(''); setNotes('');
    setAction(null); setScheduledDate(''); setScheduledTime('');
    setDemoGoal(''); setDemoNotes('');
  }

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div style={{ padding: '32px 28px', maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: D.blueL,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={18} color={D.blue} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: D.text }}>Demo-Wizard</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: D.text3 }}>
          Für Anrufe beim potenziellen Kunden — Daten erfassen, Termin buchen oder Demo zusenden.
        </p>
      </div>

      {/* Step indicator */}
      {step < 2 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {STEPS.slice(0, 2).map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < 1 ? 'none' : 1 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i <= step ? D.blue : D.card2,
                color: i <= step ? '#fff' : D.text3,
                flexShrink: 0,
              }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: i === step ? D.text : D.text3, fontWeight: i === step ? 600 : 400 }}>{s}</span>
              {i < 1 && <div style={{ flex: 1, height: 1, background: i < step ? D.blue : D.border, marginLeft: 4 }} />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STEP 0: Company data ── */}
        {step === 0 && (
          <motion.div key="step0"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}>
            <div style={{ ...glass, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D.text2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Unternehmensdaten
              </p>

              <Field label="Firmenname" icon={Building2} value={company} onChange={setCompany}
                placeholder="Mustermann GmbH" required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Ansprechpartner" icon={User} value={contactPerson} onChange={setContactPerson}
                  placeholder="Max Mustermann" />
                <Field label="Branche" value={industry} onChange={setIndustry} placeholder="" />
              </div>

              {/* Industry quick-select */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {INDUSTRIES.map(ind => (
                  <button key={ind} onClick={() => setIndustry(ind)}
                    style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${industry === ind ? D.blue : D.border}`,
                      background: industry === ind ? D.blueL : 'transparent',
                      color: industry === ind ? D.blue : D.text3,
                      transition: 'all 0.15s',
                    }}>{ind}</button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Telefon" icon={Phone} value={phone} onChange={setPhone} placeholder="+49 123 456789" />
                <Field label="E-Mail" icon={Mail} value={email} onChange={setEmail}
                  placeholder="info@firma.de" type="email" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Website" icon={Globe} value={website} onChange={setWebsite} placeholder="www.firma.de" />
                <Field label="Stadt" icon={MapPin} value={city} onChange={setCity} placeholder="Stuttgart" />
              </div>

              <TextArea label="Notizen" value={notes} onChange={setNotes}
                placeholder="Besonderheiten, Bedarf, erste Eindrücke..." rows={3} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setStep(1)} disabled={!canProceedStep0()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: canProceedStep0() ? D.blue : D.card2,
                  color: canProceedStep0() ? '#fff' : D.text3,
                  border: 'none', cursor: canProceedStep0() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}>
                Weiter <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: Action ── */}
        {step === 1 && (
          <motion.div key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}>

            {/* Summary card */}
            <div style={{ ...glass, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Building2 size={16} color={D.text3} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: D.text }}>{company}</p>
                {contactPerson && <p style={{ margin: 0, fontSize: 12, color: D.text3 }}>{contactPerson}</p>}
              </div>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: D.text2,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Wie weiter?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { id: 'appointment', icon: Calendar, color: D.purple, colorL: D.purpleL,
                  label: 'Termin vereinbaren', desc: 'Datum & Uhrzeit für die Demo festlegen' },
                { id: 'email', icon: Mail, color: D.blue, colorL: D.blueL,
                  label: 'Demo per E-Mail zusenden', desc: 'Kein Termin möglich — Demo direkt per Mail schicken' },
                { id: 'none', icon: Briefcase, color: D.orange, colorL: D.orangeL,
                  label: 'Nur Lead anlegen', desc: 'Kunde braucht Bedenkzeit — kein weiterer Schritt' },
              ].map(({ id, icon: Icon, color, colorL, label, desc }) => (
                <button key={id} onClick={() => setAction(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                    borderRadius: 14, border: `1px solid ${action === id ? color : D.border}`,
                    background: action === id ? colorL : D.card,
                    cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                  }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: colorL,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: D.text }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: D.text3 }}>{desc}</p>
                  </div>
                  {action === id && <CheckCircle2 size={18} color={color} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>

            {/* Sub-form for appointment */}
            <AnimatePresence>
              {action === 'appointment' && (
                <motion.div key="appt" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ ...glass, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: D.text2, fontWeight: 600 }}>Termin-Details</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="Datum" type="date" value={scheduledDate} onChange={setScheduledDate}
                        placeholder={minDate} required />
                      <Field label="Uhrzeit" type="time" value={scheduledTime} onChange={setScheduledTime}
                        placeholder="10:00" required />
                    </div>
                    <TextArea label="Demo-Ziel / Thema" value={demoGoal} onChange={setDemoGoal}
                      placeholder="Was soll in der Demo gezeigt werden?" rows={2} />
                  </div>
                </motion.div>
              )}

              {action === 'email' && (
                <motion.div key="mail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ ...glass, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: D.text2, fontWeight: 600 }}>Demo-Mail</p>
                    {email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                        background: D.blueL, borderRadius: 10, border: `1px solid ${D.blue}30` }}>
                        <Mail size={14} color={D.blue} />
                        <span style={{ fontSize: 14, color: D.blue, fontWeight: 500 }}>{email}</span>
                      </div>
                    ) : (
                      <Field label="E-Mail-Adresse" icon={Mail} value={email} onChange={setEmail}
                        placeholder="info@firma.de" type="email" required />
                    )}
                    <TextArea label="Zusätzliche Infos für die Mail (optional)" value={demoNotes} onChange={setDemoNotes}
                      placeholder="z.B. 'Wie besprochen, hier die Demo-Informationen...'" rows={3} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {wizard.isError && (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#FF453A' }}>
                Fehler: {wizard.error?.response?.data?.error || wizard.error?.message}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => setStep(0)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px',
                  borderRadius: 12, fontSize: 14, background: 'transparent',
                  border: `1px solid ${D.border}`, color: D.text2, cursor: 'pointer' }}>
                <ChevronLeft size={16} /> Zurück
              </button>
              <button onClick={submit} disabled={!canProceedStep1() || wizard.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px',
                  borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: canProceedStep1() && !wizard.isPending ? D.blue : D.card2,
                  color: canProceedStep1() && !wizard.isPending ? '#fff' : D.text3,
                  border: 'none', cursor: canProceedStep1() && !wizard.isPending ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}>
                {wizard.isPending ? 'Wird gespeichert...' : action === 'email' ? <><Send size={15} /> Mail senden & speichern</> : <><CheckCircle2 size={15} /> Abschließen</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Success ── */}
        {step === 2 && done && (
          <motion.div key="step2"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}>
            <div style={{ ...glass, padding: 40, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: D.greenL,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={32} color={D.green} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: D.text }}>
                Erfolgreich gespeichert!
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: D.text3 }}>
                {done.action === 'appointment' && 'Lead und Demo-Termin wurden angelegt.'}
                {done.action === 'email' && (
                  done.emailSent
                    ? 'Lead angelegt und Demo-Mail erfolgreich gesendet.'
                    : `Lead angelegt. E-Mail konnte nicht gesendet werden: ${done.emailError}`
                )}
                {done.action === 'none' && 'Lead wurde angelegt.'}
              </p>

              <div style={{ background: D.card2, borderRadius: 14, padding: '16px 20px',
                textAlign: 'left', marginBottom: 28 }}>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: D.text }}>
                  {done.lead?.company}
                </p>
                {done.lead?.contact_person && (
                  <p style={{ margin: '0 0 4px', fontSize: 13, color: D.text3 }}>{done.lead.contact_person}</p>
                )}
                {done.appointment && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: D.purple }}>
                    <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {new Date(done.appointment.scheduled_at).toLocaleString('de-DE', {
                      weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
                {done.action === 'email' && done.emailSent && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: D.blue }}>
                    <Mail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Demo-Mail gesendet an {done.lead?.email}
                  </p>
                )}
              </div>

              <button onClick={reset}
                style={{ padding: '11px 28px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: D.blue, color: '#fff', border: 'none', cursor: 'pointer' }}>
                Neuen Call starten
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
