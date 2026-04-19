import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#0D0D12', card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', blueL: '#5B8CF520', input: '#1C1C26', red: '#FF453A', green: '#34D399',
};

// Default workspace_owner_id — set via env variable for this deployment
const WORKSPACE_OWNER_ID = import.meta.env.VITE_WORKSPACE_OWNER_ID || 1;

export default function Apply() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', application_message: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await partnerApi.apply({ ...form, workspace_owner_id: WORKSPACE_OWNER_ID });
      nav('/pending');
    } catch (err) {
      setError(err.response?.data?.error || 'Bewerbung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const inp = (k, label, type = 'text', required = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>{label}{required && ' *'}</label>
      <input type={type} value={form[k]} onChange={e => f(k, e.target.value)} required={required}
        style={{ background: D.input, border: `0.5px solid ${D.border}`, borderRadius: 11,
          padding: '11px 14px', fontSize: 14, color: D.text, outline: 'none' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: D.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 16px' }}>P</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: D.text, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Als Partner bewerben
          </h1>
          <p style={{ fontSize: 14, color: D.text3, margin: 0 }}>
            Verdiene 20–25% Provision auf jeden gewonnenen Kunden
          </p>
        </div>

        <form onSubmit={submit} style={{ background: D.card, borderRadius: 20,
          border: `0.5px solid ${D.border}`, padding: '28px 26px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FF453A14',
              border: '0.5px solid #FF453A30', color: D.red, fontSize: 13 }}>{error}</div>
          )}
          {inp('name',  'Vollständiger Name',  'text',     true)}
          {inp('email', 'E-Mail',              'email',    true)}
          {inp('password', 'Passwort',         'password', true)}
          {inp('phone', 'Telefonnummer',       'tel')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>Kurze Vorstellung (optional)</label>
            <textarea value={form.application_message} onChange={e => f('application_message', e.target.value)}
              rows={3} placeholder="Warum möchtest du Partner werden? Hast du Erfahrung im Vertrieb?"
              style={{ background: D.input, border: `0.5px solid ${D.border}`, borderRadius: 11,
                padding: '11px 14px', fontSize: 14, color: D.text, outline: 'none',
                resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ padding: '12px', borderRadius: 11, border: 'none', marginTop: 4,
              background: loading ? D.blueL : D.blue, color: loading ? D.blue : '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Bewerbung wird gesendet…' : 'Jetzt bewerben'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: D.text3 }}>
          Bereits Partner?{' '}
          <Link to="/login" style={{ color: D.blue, textDecoration: 'none', fontWeight: 600 }}>Anmelden</Link>
        </p>
      </div>
    </div>
  );
}
