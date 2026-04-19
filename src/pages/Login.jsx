import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const D = {
  bg: '#0D0D12', card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', blueL: '#5B8CF520', input: '#1C1C26', red: '#FF453A',
};

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      nav(user.partnerStatus === 'approved' ? '/' : '/pending');
    } catch (err) {
      setError(err.response?.data?.error || 'Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: D.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 16px' }}>P</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: D.text, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Partner-Portal
          </h1>
          <p style={{ fontSize: 14, color: D.text3, margin: 0 }}>Melde dich mit deinen Zugangsdaten an</p>
        </div>

        <form onSubmit={submit} style={{ background: D.card, borderRadius: 20,
          border: `0.5px solid ${D.border}`, padding: '28px 26px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FF453A14',
              border: '0.5px solid #FF453A30', color: D.red, fontSize: 13 }}>{error}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>E-Mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ background: D.input, border: `0.5px solid ${D.border}`, borderRadius: 11,
                padding: '11px 14px', fontSize: 15, color: D.text, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>Passwort</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ background: D.input, border: `0.5px solid ${D.border}`, borderRadius: 11,
                padding: '11px 14px', fontSize: 15, color: D.text, outline: 'none' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ padding: '12px', borderRadius: 11, border: 'none',
              background: loading ? D.blueL : D.blue, color: loading ? D.blue : '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              transition: 'background 0.2s' }}>
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: D.text3 }}>
          Noch kein Partner?{' '}
          <Link to="/apply" style={{ color: D.blue, textDecoration: 'none', fontWeight: 600 }}>
            Jetzt bewerben
          </Link>
        </p>
      </div>
    </div>
  );
}
