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
  const { c, isDark } = useTheme();
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
      padding: 24,
      transition: 'background 0.3s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        animation: 'fadeIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
      }}>

        {/* App icon + name */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', marginBottom: 36,
        }}>
          <div style={{
            width: 56, height: 56,
            background: `linear-gradient(135deg, ${c.blue}, ${isDark ? '#0064D1' : '#0055B8'})`,
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Zap size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 700,
            color: c.text, letterSpacing: '-0.032em',
            margin: 0, lineHeight: 1.15,
          }}>
            Vecturo
          </h1>
          <p style={{
            fontSize: 15, color: c.textSecondary,
            marginTop: 6, letterSpacing: '-0.009em',
          }}>
            {isRegister ? 'Konto erstellen' : 'Mit deinem Konto anmelden'}
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: c.card,
          borderRadius: 16,
          padding: '28px 24px',
          border: `0.5px solid ${c.borderSubtle}`,
          boxShadow: isDark
            ? '0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.2), 0 12px 40px rgba(0,0,0,0.35)'
            : '0 0 0 0.5px var(--color-border-subtle), 0 1px 3px var(--color-border-subtle), 0 12px 40px var(--color-border-subtle)',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 13, fontWeight: 500,
                color: c.textSecondary,
                marginBottom: 6,
                letterSpacing: '-0.006em',
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

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 13, fontWeight: 500,
                color: c.textSecondary,
                marginBottom: 6,
                letterSpacing: '-0.006em',
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
                padding: '10px 20px',
                fontSize: 15, fontWeight: 500,
                letterSpacing: '-0.009em',
                background: c.blue,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'filter 0.15s cubic-bezier(0.22,1,0.36,1), transform 0.1s cubic-bezier(0.22,1,0.36,1), opacity 0.15s',
                fontFamily: 'inherit',
                minHeight: 44,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {loading
                ? 'Wird geladen...'
                : isRegister ? 'Konto erstellen' : 'Anmelden'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
