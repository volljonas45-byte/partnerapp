import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const D = {
  bg: '#0D0D12', card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', input: '#1C1C26', red: '#FF453A',
};

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const status = await loginWithGoogle(tokenResponse.access_token);
        if (status === 'approved') nav('/');
        else nav('/pending');
      } catch (err) {
        setError(err.message || 'Google-Anmeldung fehlgeschlagen.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google-Anmeldung wurde abgebrochen.'),
  });

  return (
    <div style={{ minHeight: '100vh', background: D.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: D.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 auto 18px' }}>P</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: D.text, margin: '0 0 8px',
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
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 20,
              background: '#FF453A14', border: '0.5px solid #FF453A30',
              color: D.red, fontSize: 13 }}>{error}</div>
          )}

          {/* Google Button */}
          <button
            onClick={() => !loading && googleLogin()}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 12, padding: '13px 20px',
              borderRadius: 12, border: `0.5px solid ${D.border}`,
              background: loading ? D.input : '#fff', cursor: loading ? 'default' : 'pointer',
              fontSize: 15, fontWeight: 600, color: '#1C1C1E',
              transition: 'background 0.15s, transform 0.1s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#F5F5F5'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#fff'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? (
              <span style={{ color: D.text3, fontSize: 14 }}>Anmelden…</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                  <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.2H272v95h146.9c-6.3 33.9-25 62.5-53.2 81.8v68.1h85.8c50.2-46.3 82-114.6 82-194.7z" fill="#4285F4"/>
                  <path d="M272 544.3c71.6 0 131.7-23.7 175.7-64.2l-85.8-68.1c-23.8 16-54.1 25.4-89.9 25.4-69.1 0-127.6-46.6-148.4-109.3h-89.6v68.9C77.7 480.5 168.5 544.3 272 544.3z" fill="#34A853"/>
                  <path d="M123.6 328.1c-10.8-32.1-10.8-66.9 0-99l-89.6-68.9c-39.1 77.6-39.1 168.3 0 245.9l89.6-68z" fill="#FBBC05"/>
                  <path d="M272 107.7c37.4-.6 73.5 13.2 101.1 38.7l75.4-75.4C403.4 24.5 341.4 0 272 0 168.5 0 77.7 63.8 34 159.2l89.6 68.9C144.4 154.3 202.9 107.7 272 107.7z" fill="#EA4335"/>
                </svg>
                Mit Google anmelden
              </>
            )}
          </button>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12,
            color: D.text3, lineHeight: 1.6 }}>
            Noch kein Partner?{' '}
            <span style={{ color: D.blue }}>
              Melde dich einfach mit Google an — wir erstellen automatisch eine Bewerbung.
            </span>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: D.text3,
          lineHeight: 1.6 }}>
          Deine Daten werden nur zur Kontoerstellung verwendet und nicht weitergegeben.
        </p>
      </div>
    </div>
  );
}
