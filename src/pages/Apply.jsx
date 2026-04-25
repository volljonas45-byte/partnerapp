import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, AlertTriangle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#070C15', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#3B82F6', accentL: 'rgba(59,130,246,0.15)',
  red: '#F87171', redL: 'rgba(248,113,113,0.12)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
  orange: '#64748B', orangeL: 'rgba(59,130,246,0.12)',
};

const glass = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 22,
};

const WORKSPACE_OWNER_ID = import.meta.env.VITE_WORKSPACE_OWNER_ID || 1;
const CURRENT_YEAR = new Date().getFullYear();

const STEPS = [
  { title: 'Persönliche Daten', sub: 'Wie heißt du?' },
  { title: 'Kontakt',           sub: 'Wie erreichen wir dich?' },
  { title: 'Zugangsdaten',      sub: 'Erstelle deinen Account' },
  { title: 'Auszahlung',        sub: 'Wie soll deine Provision ausgezahlt werden?' },
  { title: 'Datenschutz',       sub: 'Fast geschafft — bitte bestätigen' },
];

function decodeGoogleJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

function getAge(birthYear) {
  return CURRENT_YEAR - parseInt(birthYear || 0);
}

function Label({ children, required }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}{required && ' *'}
    </label>
  );
}

function Inp({ value, onChange, type = 'text', placeholder, readOnly }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
      style={{ background: readOnly ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
        border: `0.5px solid ${D.border}`, borderRadius: 11,
        padding: '12px 14px', fontSize: 14, color: readOnly ? D.text2 : D.text,
        outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} />
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
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [dir,  setDir]  = useState(1);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '',
    phone: '', birth_year: '',
    email: '', password: '', password2: '',
    payout_method: 'paypal', payout_details: '',
    dsgvo: false, parentalConsent: false,
    googleCredential: null,
  });

  // Pre-fill from Google redirect (came from login page with no account)
  useEffect(() => {
    const googleEmail      = searchParams.get('google_email');
    const googleName       = searchParams.get('google_name');
    const googleCredential = searchParams.get('google_credential');
    if (googleEmail) {
      const parts = (googleName || '').trim().split(' ');
      setForm(p => ({
        ...p,
        email:            googleEmail,
        first_name:       parts[0] || '',
        last_name:        parts.slice(1).join(' ') || '',
        googleCredential: googleCredential || null,
      }));
      // Jump straight to step 2 (credentials already filled via Google)
      if (googleCredential) { setStep(2); }
    }
  }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function handleGoogleSuccess(cr) {
    const payload = decodeGoogleJwt(cr.credential);
    if (!payload) { setError('Google-Anmeldung fehlgeschlagen.'); return; }
    setForm(p => ({
      ...p,
      email: payload.email || p.email,
      first_name: p.first_name || payload.given_name || '',
      last_name:  p.last_name  || payload.family_name || '',
      googleCredential: cr.credential,
      password: '', password2: '',
    }));
    setError('');
  }

  const age = getAge(form.birth_year);
  const isMinor = form.birth_year.length === 4 && age >= 16 && age < 18;
  const isTooYoung = form.birth_year.length === 4 && age < 16;
  const googleLinked = !!form.googleCredential;

  function validate(s) {
    if (s === 0) {
      if (!form.first_name.trim()) return 'Bitte Vornamen eingeben.';
      if (!form.last_name.trim())  return 'Bitte Nachnamen eingeben.';
    }
    if (s === 1) {
      if (!form.phone.trim()) return 'Bitte Telefonnummer eingeben.';
      const yr = parseInt(form.birth_year);
      if (!yr || yr < 1920 || yr > CURRENT_YEAR - 1) return 'Bitte ein gültiges Geburtsjahr eingeben.';
      if (isTooYoung) return 'Du musst mindestens 16 Jahre alt sein um dich zu bewerben.';
    }
    if (s === 2) {
      if (!form.email.trim()) return 'Bitte E-Mail eingeben.';
      if (!googleLinked) {
        if ((form.password || '').length < 6) return 'Passwort muss mindestens 6 Zeichen haben.';
        if (form.password !== form.password2) return 'Passwörter stimmen nicht überein.';
      }
    }
    if (s === 3) {
      if (!form.payout_details.trim())
        return form.payout_method === 'paypal' ? 'Bitte PayPal E-Mail eingeben.' : 'Bitte IBAN eingeben.';
    }
    if (s === 4) {
      if (!form.dsgvo) return 'Bitte stimme der Datenschutzerklärung zu.';
      if (isMinor && !form.parentalConsent) return 'Bitte bestätige die Zustimmung deiner Erziehungsberechtigten.';
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
        name:              form.first_name.trim(),
        last_name:         form.last_name.trim(),
        email:             form.email.trim(),
        password:          googleLinked ? '__google__' : form.password,
        google_credential: form.googleCredential || undefined,
        phone:             form.phone.trim(),
        birth_year:        parseInt(form.birth_year),
        payout_method:     form.payout_method,
        payout_details:    form.payout_details.trim(),
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

      {/* Under-16 block */}
      {isTooYoung && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: D.redL,
          border: `1px solid rgba(248,113,113,0.25)`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} color={D.red} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: D.red }}>
              Mindestalter nicht erreicht
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: D.text2, lineHeight: 1.5 }}>
              Für eine Bewerbung musst du mindestens 16 Jahre alt sein.
              Bitte wende dich direkt per E-Mail an uns.
            </p>
          </div>
        </div>
      )}

      {/* 16–17 warning */}
      {isMinor && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: D.orangeL,
          border: `1px solid rgba(59,130,246,0.25)`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} color={D.orange} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: D.orange }}>
              Unter 18 — Zustimmung erforderlich
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: D.text2, lineHeight: 1.5 }}>
              Da du noch minderjährig bist, benötigen wir die Zustimmung deiner Erziehungsberechtigten.
              Du wirst im letzten Schritt gebeten, dies zu bestätigen.
            </p>
          </div>
        </div>
      )}
    </div>,

    // 2 — Zugangsdaten
    <div key="2" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Google option */}
      {!googleLinked ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google-Anmeldung fehlgeschlagen.')}
              theme="filled_black" size="large" text="continue_with"
              shape="rectangular" width="404"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 0.5, background: D.border }} />
            <span style={{ fontSize: 12, color: D.text3 }}>oder mit E-Mail</span>
            <div style={{ flex: 1, height: 0.5, background: D.border }} />
          </div>
        </>
      ) : (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: D.greenL,
          border: `1px solid rgba(52,211,153,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: D.green, fontWeight: 600 }}>Mit Google verknüpft</span>
          <button type="button"
            onClick={() => setForm(p => ({ ...p, googleCredential: null }))}
            style={{ fontSize: 12, color: D.text3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Trennen
          </button>
        </div>
      )}

      <Field label="E-Mail" required>
        <Inp value={form.email} onChange={f('email')} type="email"
          placeholder="max@beispiel.de" readOnly={googleLinked} />
      </Field>

      {!googleLinked && (
        <>
          <Field label="Passwort" required>
            <Inp value={form.password} onChange={f('password')} type="password" placeholder="Min. 6 Zeichen" />
          </Field>
          <Field label="Passwort wiederholen" required>
            <Inp value={form.password2} onChange={f('password2')} type="password" placeholder="••••••••" />
          </Field>
        </>
      )}
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
                borderColor: form.payout_method === k ? D.accent : D.border,
                background: form.payout_method === k ? D.accentL : 'transparent',
                color: form.payout_method === k ? D.accent : D.text3, transition: 'all 0.2s' }}>
              {l}
            </button>
          ))}
        </div>
      </Field>
      <Field label={form.payout_method === 'paypal' ? 'PayPal E-Mail' : 'IBAN'} required>
        <Inp
          value={form.payout_details} onChange={f('payout_details')}
          type={form.payout_method === 'paypal' ? 'email' : 'text'}
          placeholder={form.payout_method === 'paypal' ? 'paypal@beispiel.de' : 'DE12 3456 7890 1234 5678 90'}
        />
      </Field>
    </div>,

    // 4 — DSGVO
    <div key="4" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 9, border: `0.5px solid ${D.border}` }}>
        {[
          ['Name',        `${form.first_name} ${form.last_name}`],
          ['Telefon',     form.phone],
          ['Geburtsjahr', form.birth_year],
          ['E-Mail',      form.email],
          ['Konto',       googleLinked ? 'Google-Konto' : 'E-Mail & Passwort'],
          ['Auszahlung',  form.payout_method === 'paypal' ? `PayPal · ${form.payout_details}` : `Bank · ${form.payout_details}`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: D.text3, flexShrink: 0 }}>{k}</span>
            <span style={{ fontSize: 13, color: D.text, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Parental consent for minors */}
      {isMinor && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
          padding: '12px 14px', borderRadius: 10, background: D.orangeL,
          border: `1px solid rgba(59,130,246,0.25)` }}>
          <input type="checkbox" checked={form.parentalConsent} onChange={f('parentalConsent')}
            style={{ width: 16, height: 16, marginTop: 3, cursor: 'pointer', accentColor: D.orange, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: D.text2, lineHeight: 1.65 }}>
            <strong style={{ color: D.orange }}>Elterliche Zustimmung:</strong>{' '}
            Ich bestätige, dass meine Erziehungsberechtigten der Teilnahme am Partner-Programm zugestimmt haben
            und bei Bedarf eine schriftliche Bestätigung vorlegen können.
          </span>
        </label>
      )}

      {/* DSGVO */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.dsgvo} onChange={f('dsgvo')}
          style={{ width: 16, height: 16, marginTop: 3, cursor: 'pointer', accentColor: D.accent, flexShrink: 0 }} />
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
    <div style={{ minHeight: '100vh', background: D.bg, position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-5%', width: 600, height: 600,
          background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 500, height: 500,
          background: 'rgba(56,189,248,0.06)', borderRadius: '50%', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '40%', width: 350, height: 350,
          background: 'rgba(59,130,246,0.05)', borderRadius: '50%', filter: 'blur(90px)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: D.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 14px',
            boxShadow: '0 0 28px rgba(59,130,246,0.35)' }}>P</div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Als Partner bewerben</h1>
          <p style={{ fontSize: 13.5, color: D.text3, margin: 0 }}>
            Verdiene 20–25% Provision auf jeden gewonnenen Kunden
          </p>
        </div>

        <div style={{ ...glass, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', overflow: 'hidden' }}>

          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ height: '100%', background: D.accent,
              width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ padding: '28px 28px 24px' }}>
            <div style={{ marginBottom: 22 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: D.text3,
                textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Schritt {step + 1} von {STEPS.length}
              </span>
              <h2 style={{ margin: '6px 0 3px', fontSize: 18, fontWeight: 700, color: D.text }}>{s.title}</h2>
              <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>{s.sub}</p>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                background: D.redL, border: `0.5px solid rgba(248,113,113,0.3)`, color: D.red, fontSize: 13 }}>
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
                    background: loading ? D.accentL : D.accent,
                    color: loading ? D.accent : '#fff',
                    fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}>
                  {loading ? 'Wird gesendet…' : <><Check size={15} /> Bewerbung absenden</>}
                </button>
              ) : (
                <button type="button" onClick={() => go(step + 1)}
                  disabled={isTooYoung && step === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px',
                    borderRadius: 11, border: 'none',
                    background: isTooYoung && step === 1 ? 'rgba(255,255,255,0.08)' : D.accent,
                    color: isTooYoung && step === 1 ? D.text3 : '#fff',
                    fontSize: 14, fontWeight: 700,
                    cursor: isTooYoung && step === 1 ? 'default' : 'pointer' }}>
                  Weiter <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: D.text3 }}>
          Bereits Partner?{' '}
          <Link to="/login" style={{ color: D.accent, textDecoration: 'none', fontWeight: 600 }}>Anmelden</Link>
        </p>
      </div>
    </div>
  );
}

