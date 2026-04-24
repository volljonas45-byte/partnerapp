import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#0D0D12', card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', blueL: 'rgba(91,140,245,0.15)', input: '#1C1C26',
  red: '#FF453A', green: '#34D399',
};

const WORKSPACE_OWNER_ID = import.meta.env.VITE_WORKSPACE_OWNER_ID || 1;

const STEPS = [
  { title: 'Persönliche Daten', sub: 'Wie heißt du?' },
  { title: 'Kontakt',           sub: 'Wie erreichen wir dich?' },
  { title: 'Zugangsdaten',      sub: 'Erstelle deinen Account' },
  { title: 'Auszahlung',        sub: 'Wie soll deine Provision ausgezahlt werden?' },
  { title: 'Datenschutz',       sub: 'Fast geschafft — bitte bestätigen' },
];

function Label({ children, required }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}{required && ' *'}
    </label>
  );
}

function Inp({ value, onChange, type = 'text', placeholder }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ background: D.input, border: `0.5px solid ${D.border}`, borderRadius: 11,
        padding: '12px 14px', fontSize: 14, color: D.text, outline: 'none',
        width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} />
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}

export default function Apply() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [dir,  setDir]  = useState(1);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '',
    phone: '', birth_year: '',
    email: '', password: '', password2: '',
    payout_method: 'paypal', payout_details: '',
    dsgvo: false,
  });

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function validate(s) {
    if (s === 0) {
      if (!form.first_name.trim()) return 'Bitte Vornamen eingeben.';
      if (!form.last_name.trim())  return 'Bitte Nachnamen eingeben.';
    }
    if (s === 1) {
      if (!form.phone.trim()) return 'Bitte Telefonnummer eingeben.';
      const yr = parseInt(form.birth_year);
      if (!yr || yr < 1920 || yr > 2007) return 'Bitte ein gültiges Geburtsjahr eingeben (mind. 18 Jahre).';
    }
    if (s === 2) {
      if (!form.email.trim()) return 'Bitte E-Mail eingeben.';
      if ((form.password || '').length < 6) return 'Passwort muss mindestens 6 Zeichen haben.';
      if (form.password !== form.password2) return 'Passwörter stimmen nicht überein.';
    }
    if (s === 3) {
      if (!form.payout_details.trim())
        return form.payout_method === 'paypal' ? 'Bitte PayPal E-Mail eingeben.' : 'Bitte IBAN eingeben.';
    }
    if (s === 4) {
      if (!form.dsgvo) return 'Bitte stimme der Datenschutzerklärung zu.';
    }
    return null;
  }

  function go(next) {
    if (next > step) {
      const err = validate(step);
      if (err) { setError(err); return; }
    }
    setError('');
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  async function submit() {
    const err = validate(4);
    if (err) { setError(err); return; }
    setLoading(true); setError('');
    try {
      await partnerApi.apply({
        name:            form.first_name.trim(),
        last_name:       form.last_name.trim(),
        email:           form.email.trim(),
        password:        form.password,
        phone:           form.phone.trim(),
        birth_year:      parseInt(form.birth_year),
        payout_method:   form.payout_method,
        payout_details:  form.payout_details.trim(),
        workspace_owner_id: Number(WORKSPACE_OWNER_ID),
      });
      nav('/pending');
    } catch (e) {
      setError(e.response?.data?.error || 'Bewerbung fehlgeschlagen.');
    } finally { setLoading(false); }
  }

  const stepContent = [
    // 0 — Persönliche Daten
    <div key="0" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Vorname" required>
        <Inp value={form.first_name} onChange={f('first_name')} placeholder="Max" />
      </Field>
      <Field label="Nachname" required>
        <Inp value={form.last_name} onChange={f('last_name')} placeholder="Mustermann" />
      </Field>
    </div>,

    // 1 — Kontakt
    <div key="1" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Telefonnummer" required>
        <Inp value={form.phone} onChange={f('phone')} type="tel" placeholder="+49 151 12345678" />
      </Field>
      <Field label="Geburtsjahr" required>
        <Inp value={form.birth_year} onChange={f('birth_year')} type="number" placeholder="1998" />
      </Field>
    </div>,

    // 2 — Zugangsdaten
    <div key="2" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="E-Mail" required>
        <Inp value={form.email} onChange={f('email')} type="email" placeholder="max@beispiel.de" />
      </Field>
      <Field label="Passwort" required>
        <Inp value={form.password} onChange={f('password')} type="password" placeholder="Min. 6 Zeichen" />
      </Field>
      <Field label="Passwort wiederholen" required>
        <Inp value={form.password2} onChange={f('password2')} type="password" placeholder="••••••••" />
      </Field>
    </div>,

    // 3 — Auszahlung
    <div key="3" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Auszahlungsmethode" required>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ k: 'paypal', l: 'PayPal' }, { k: 'bank', l: 'Banküberweisung' }].map(({ k, l }) => (
            <button key={k} type="button"
              onClick={() => setForm(p => ({ ...p, payout_method: k, payout_details: '' }))}
              style={{ flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, border: '1px solid',
                borderColor: form.payout_method === k ? D.blue : D.border,
                background: form.payout_method === k ? D.blueL : 'transparent',
                color: form.payout_method === k ? D.blue : D.text3, transition: 'all 0.2s' }}>
              {l}
            </button>
          ))}
        </div>
      </Field>
      <Field label={form.payout_method === 'paypal' ? 'PayPal E-Mail' : 'IBAN'} required>
        <Inp
          value={form.payout_details}
          onChange={f('payout_details')}
          type={form.payout_method === 'paypal' ? 'email' : 'text'}
          placeholder={form.payout_method === 'paypal' ? 'paypal@beispiel.de' : 'DE12 3456 7890 1234 5678 90'}
        />
      </Field>
    </div>,

    // 4 — DSGVO
    <div key="4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 9,
        border: `0.5px solid ${D.border}` }}>
        {[
          ['Name',       `${form.first_name} ${form.last_name}`],
          ['Telefon',    form.phone],
          ['Geburtsjahr', form.birth_year],
          ['E-Mail',     form.email],
          ['Auszahlung', form.payout_method === 'paypal' ? `PayPal · ${form.payout_details}` : `Bank · ${form.payout_details}`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: D.text3, flexShrink: 0 }}>{k}</span>
            <span style={{ fontSize: 13, color: D.text, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.dsgvo} onChange={f('dsgvo')}
          style={{ width: 16, height: 16, marginTop: 3, cursor: 'pointer', accentColor: D.blue, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: D.text2, lineHeight: 1.65 }}>
          Ich stimme der Verarbeitung meiner personenbezogenen Daten zur Verwaltung des Partner-Programms
          gemäß der Datenschutzerklärung zu. Die Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.
        </span>
      </label>
    </div>,
  ];

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ minHeight: '100vh', background: D.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: D.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 14px' }}>P</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: D.text, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Als Partner bewerben
          </h1>
          <p style={{ fontSize: 13.5, color: D.text3, margin: 0 }}>
            Verdiene 20–25% Provision auf jeden gewonnenen Kunden
          </p>
        </div>

        <div style={{ background: D.card, borderRadius: 22, border: `0.5px solid ${D.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ height: '100%', background: D.blue,
              width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ padding: '28px 28px 24px' }}>

            {/* Step header */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: D.text3,
                  textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Schritt {step + 1} von {STEPS.length}
                </span>
              </div>
              <h2 style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 700, color: D.text }}>{s.title}</h2>
              <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>{s.sub}</p>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                background: '#FF453A14', border: '0.5px solid #FF453A30', color: D.red, fontSize: 13 }}>
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 24 * dir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 * dir }}
                transition={{ duration: 0.18 }}>
                {stepContent[step]}
              </motion.div>
            </AnimatePresence>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
              <button type="button" onClick={() => go(step - 1)} disabled={step === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 18px',
                  borderRadius: 11, border: `0.5px solid ${D.border}`, background: 'transparent',
                  color: D.text2, cursor: step === 0 ? 'default' : 'pointer',
                  fontSize: 13, opacity: step === 0 ? 0.35 : 1 }}>
                <ChevronLeft size={15} /> Zurück
              </button>

              {isLast ? (
                <button type="button" onClick={submit} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px',
                    borderRadius: 11, border: 'none',
                    background: loading ? D.blueL : D.blue,
                    color: loading ? D.blue : '#fff',
                    fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}>
                  {loading ? 'Wird gesendet…' : <><Check size={15} /> Bewerbung absenden</>}
                </button>
              ) : (
                <button type="button" onClick={() => go(step + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px',
                    borderRadius: 11, border: 'none', background: D.blue, color: '#fff',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Weiter <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: D.text3 }}>
          Bereits Partner?{' '}
          <Link to="/login" style={{ color: D.blue, textDecoration: 'none', fontWeight: 600 }}>Anmelden</Link>
        </p>
      </div>
    </div>
  );
}
