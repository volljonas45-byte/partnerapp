import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const D = {
  bg: '#0D0D12', card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', input: '#1C1C26', red: '#FF453A',
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
        background: D.input, border: `0.5px solid ${D.border}`,
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
    <div style={{ minHeight: '100vh', background: D.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: D.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 auto 16px' }}>P</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: D.text, margin: '0 0 6px',
            letterSpacing: '-0.03em' }}>Partner-Portal</h1>
          <p style={{ fontSize: 14, color: D.text3, margin: 0 }}>
            Verdiene Provision für jeden gewonnenen Kunden
          </p>
        </div>

        {/* Card */}
        <div style={{ background: D.card, borderRadius: 22,
          border: `0.5px solid ${D.border}`, padding: '32px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

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
              border: 'none', background: D.blue, color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1, marginTop: 6,
            }}>
              {loading ? '…' : 'Anmelden'}
            </button>
          </form>

          {/* Link to apply */}
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: D.text3 }}>
            Noch kein Partner?{' '}
            <Link to="/apply" style={{ color: D.blue, textDecoration: 'none', fontWeight: 600 }}>
              Jetzt bewerben
            </Link>
          </p>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 0.5, background: D.border }} />
            <span style={{ fontSize: 12, color: D.text3 }}>oder</span>
            <div style={{ flex: 1, height: 0.5, background: D.border }} />
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
