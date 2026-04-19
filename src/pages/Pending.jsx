import { Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const D = {
  bg: '#0D0D12', card: '#16161E', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  orange: '#FF9F0A', orangeL: '#FF9F0A14',
};

export default function Pending() {
  const { logout } = useAuth();
  return (
    <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: D.orangeL,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Clock size={34} color={D.orange} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: D.text, margin: '0 0 12px', letterSpacing: '-0.03em' }}>
          Bewerbung eingereicht
        </h1>
        <p style={{ fontSize: 15, color: D.text2, lineHeight: 1.6, margin: '0 0 28px' }}>
          Deine Bewerbung wird geprüft. Du erhältst eine Benachrichtigung, sobald dein Konto freigeschaltet wurde.
        </p>
        <button onClick={logout}
          style={{ padding: '10px 22px', borderRadius: 10, border: `0.5px solid ${D.border}`,
            background: 'none', color: D.text2, cursor: 'pointer', fontSize: 14 }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}
