import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#0D0D12', card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#4F6EF7', accentL: 'rgba(79,110,247,0.12)', input: '#1C1C26',
};

export default function CompleteProfile() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [phone, setPhone]   = useState('');
  const [msg, setMsg]       = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await partnerApi.updateProfile({ phone, application_message: msg });
      nav('/pending');
    } catch {
      nav('/pending');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: D.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: D.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 auto 16px' }}>P</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: D.text, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Willkommen, {user?.name?.split(' ')[0]}!
          </h1>
          <p style={{ fontSize: 14, color: D.text3, margin: 0 }}>
            Noch zwei kurze Angaben für deine Bewerbung
          </p>
        </div>

        <form onSubmit={submit} style={{ background: D.card, borderRadius: 22,
          border: `0.5px solid ${D.border}`, padding: '28px 26px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>Telefonnummer (optional)</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+49 123 456789"
              style={{ background: D.input, border: `0.5px solid ${D.border}`, borderRadius: 11,
                padding: '11px 14px', fontSize: 14, color: D.text, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>Kurze Vorstellung (optional)</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
              placeholder="Warum möchtest du Partner werden? Hast du Vertriebserfahrung?"
              style={{ background: D.input, border: `0.5px solid ${D.border}`, borderRadius: 11,
                padding: '11px 14px', fontSize: 14, color: D.text, outline: 'none',
                resize: 'none', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ padding: '12px', borderRadius: 11, border: 'none',
              background: loading ? D.accentL : D.accent, color: loading ? D.accent : '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Wird gespeichert…' : 'Bewerbung abschicken'}
          </button>
          <button type="button" onClick={() => nav('/pending')}
            style={{ padding: '8px', borderRadius: 11, border: 'none',
              background: 'none', color: D.text3, cursor: 'pointer', fontSize: 13 }}>
            Überspringen
          </button>
        </form>
      </div>
    </div>
  );
}
