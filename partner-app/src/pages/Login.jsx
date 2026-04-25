import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const D = {
  bg: '#0D0D12', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#FF9F0A', red: '#FF453A',
};

const glass = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 22,
};

function Field({ label, ...props }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
        color: D.text3, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      <input {...props} style={{
        width: '100%', padding: '11px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
        color: D.text, fontSize: 15, outline: 'none', boxSizing: 'border-box',
        fontFamily: 'inherit',
      }} />
    </div>
  );
}

export default function Login() {
  const { loginWithGoogle, loginWithEmail } = useAuth();
  const nav = useNavigate();
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');

  const run = async (fn) => {
    setLoading(true); setError('');
    try {
      const status = await fn();
      if (status?.redirect) { nav(status.redirect); return; }
      if (status === 'approved') nav('/');
      else nav('/pending');
    }
    catch (err) { setError(err.response?.data?.error || err.message || 'Fehler aufgetreten.'); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    run(() => loginWithEmail(email, password));
  };

  return (
    <div style={{ minHeight: '100vh', background: D.bg, position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-5%', width: 600, height: 600,
          background: 'rgba(255,159,10,0.08)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500,
          background: 'rgba(139,92,246,0.07)', borderRadius: '50%', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '55%', width: 350, height: 350,
          background: 'rgba(52,211,153,0.05)', borderRadius: '50%', filter: 'blur(90px)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: D.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 auto 16px',
            boxShadow: '0 0 32px rgba(255,159,10,0.35)' }}>P</div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Partner-Portal</h1>
          <p style={{ fontSize: 14, color: D.text3, margin: 0 }}>
            Verdiene Provision für jeden gewonnenen Kunden
          </p>
        </div>

        {/* Card */}
        <div style={{ ...glass, padding: '32px 28px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 18,
              background: '#FF453A14', border: '0.5px solid #FF453A30',
              color: D.red, fontSize: 13 }}>{error}</div>
          )}

          {/* Email Form */}
          <form onSubmit={handleSubmit}>
            <Field label="E-Mail" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required placeholder="deine@email.de" />
            <Field label="Passwort" type="password" value={password}
              onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px 20px', borderRadius: 12,
              border: 'none', background: D.accent, color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1, marginTop: 6,
              boxShadow: '0 4px 24px rgba(255,159,10,0.3)',
            }}>
              {loading ? '…' : 'Anmelden'}
            </button>
          </form>

          {/* Link to apply */}
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: D.text3 }}>
            Noch kein Partner?{' '}
            <Link to="/apply" style={{ color: D.accent, textDecoration: 'none', fontWeight: 600 }}>
              Jetzt bewerben
            </Link>
          </p>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 12, color: D.text3 }}>oder</span>
            <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={(cr) => run(() => loginWithGoogle(cr.credential))}
              onError={() => setError('Google-Anmeldung fehlgeschlagen.')}
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="344"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
