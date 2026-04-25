import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const D = {
  bg: '#0D0D12', border: 'rgba(255,255,255,0.08)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  orange: '#4F6EF7', orangeL: 'rgba(79,110,247,0.12)',
};

export default function Pending() {
  const { logout, refreshStatus } = useAuth();
  const nav = useNavigate();
  const interval = useRef(null);

  useEffect(() => {
    interval.current = setInterval(async () => {
      const status = await refreshStatus();
      if (status === 'approved') {
        clearInterval(interval.current);
        nav('/');
      }
    }, 10000);

    return () => clearInterval(interval.current);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: D.bg, position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '10%', width: 550, height: 550,
          background: 'rgba(79,110,247,0.07)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 450, height: 450,
          background: 'rgba(139,92,246,0.06)', borderRadius: '50%', filter: 'blur(100px)' }} />
      </div>

      <div style={{ maxWidth: 420, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: D.orangeL,
          border: '1px solid rgba(79,110,247,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          boxShadow: '0 0 40px rgba(79,110,247,0.15)' }}>
          <Clock size={34} color={D.orange} />
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Bewerbung eingereicht
        </h1>
        <p style={{ fontSize: 15, color: D.text2, lineHeight: 1.6, margin: '0 0 12px' }}>
          Deine Bewerbung wird geprüft. Du wirst automatisch weitergeleitet, sobald dein Konto freigeschaltet wurde.
        </p>
        <p style={{ fontSize: 13, color: D.text3, margin: '0 0 28px' }}>
          Diese Seite prüft automatisch alle 10 Sekunden.
        </p>
        <button onClick={logout}
          style={{ padding: '10px 22px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', color: D.text2, cursor: 'pointer', fontSize: 14,
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}
