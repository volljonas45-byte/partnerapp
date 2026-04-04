import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const { c } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (isAuthenticated) { navigate('/'); return; }
    authApi.status()
      .then(res => setIsRegister(!res.data.hasAccount))
      .catch(() => {});
  }, [isAuthenticated, navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const fn = isRegister ? authApi.register : authApi.login;
      const res = await fn(email, password);
      login(res.data.token, { email: res.data.email });
      toast.success(isRegister ? 'Konto erstellt!' : 'Willkommen zurück!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: c.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* App icon + name */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', marginBottom: '32px',
        }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(145deg, #0A84FF, #0071E3)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,113,227,0.30)',
            marginBottom: '14px',
          }}>
            <Zap size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontSize: '26px', fontWeight: '700',
            color: '#1D1D1F', letterSpacing: '-0.025em',
            margin: 0,
          }}>
            Vecturo
          </h1>
          <p style={{
            fontSize: '14px', color: '#86868B',
            marginTop: '4px', letterSpacing: '-0.01em',
          }}>
            {isRegister ? 'Konto erstellen' : 'Mit deinem Konto anmelden'}
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px', fontWeight: '500',
                color: '#6E6E73',
                marginBottom: '6px',
                letterSpacing: '-0.01em',
              }}>
                E-Mail
              </label>
              <input
                type="email"
                className="input"
                placeholder="name@beispiel.de"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px', fontWeight: '500',
                color: '#6E6E73',
                marginBottom: '6px',
                letterSpacing: '-0.01em',
              }}>
                Passwort
              </label>
              <input
                type="password"
                className="input"
                placeholder={isRegister ? 'Mindestens 6 Zeichen' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px', fontWeight: '500',
                background: loading ? 'rgba(0,113,227,0.5)' : '#0071E3',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease, transform 0.1s ease',
                letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0077ED'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0071E3'; }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {loading
                ? 'Bitte warten…'
                : isRegister ? 'Konto erstellen' : 'Anmelden'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
