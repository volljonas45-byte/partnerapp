import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, Settings, LogOut,
  Layers, ClipboardCheck, PackageCheck,
  UserCog, Clock, BarChart2, CalendarDays, Plus, CalendarRange, FolderKanban, Flame, BarChart3, Target, TrendingUp, Handshake, Globe,
  Play, Square, RotateCcw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { intakeApi } from '../api/intake';
import toast from 'react-hot-toast';

const POMO_CFG = {
  work:       { label: 'Fokus',  color: '#FF453A', glow: 'rgba(255,69,58,0.2)',  icon: '🍅', default: 25 },
  shortBreak: { label: 'Pause',  color: '#34D399', glow: 'rgba(52,211,153,0.2)', icon: '☕', default: 5  },
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

function MiniPomodoro({ isDark, c }) {
  const KEY = `vecturo-pomo-${todayISO()}`;
  const [durations] = useState(() => {
    const s = localStorage.getItem('vecturo-pomo-settings');
    return s ? JSON.parse(s) : { work: 25, shortBreak: 5 };
  });
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(() => {
    const s = localStorage.getItem('vecturo-pomo-settings');
    const d = s ? JSON.parse(s) : { work: 25 };
    return (d.work || 25) * 60;
  });
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(() => parseInt(localStorage.getItem(KEY) || '0', 10));
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!running || timeLeft <= 0) return;
    const id = setTimeout(() => {
      const next = timeLeft - 1;
      setTimeLeft(next);
      if (next <= 0) {
        setRunning(false);
        if (mode === 'work') {
          setSessions(s => { const n = s + 1; localStorage.setItem(KEY, String(n)); return n; });
          toast.success('🍅 Pomodoro fertig! Verdiene dir eine Pause.', { duration: 4000 });
        } else {
          toast.success('🎯 Pause vorbei! Weiter geht\'s.', { duration: 3000 });
        }
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [running, timeLeft, mode, KEY]);

  const switchMode = m => { setMode(m); setRunning(false); setTimeLeft((durations[m] || POMO_CFG[m].default) * 60); };
  const reset = () => { setRunning(false); setTimeLeft((durations[mode] || POMO_CFG[mode].default) * 60); };

  const cfg = POMO_CFG[mode] || POMO_CFG.work;
  const total = (durations[mode] || cfg.default) * 60;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = total > 0 ? (total - timeLeft) / total : 0;
  const cyclePos = sessions % 4;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Pomodoro Timer"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer',
          background: running
            ? (isDark ? 'rgba(255,69,58,0.15)' : 'rgba(255,69,58,0.1)')
            : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
          color: running ? '#FF453A' : c.textTertiary,
          fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.01em', fontFamily: 'inherit',
          transition: 'all 0.2s',
          animation: running ? 'timerPulse 2.5s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={e => !running && (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)')}
        onMouseLeave={e => !running && (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)')}
      >
        🍅{running && ` ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`}
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 210, zIndex: 200,
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          background: isDark ? 'rgba(22,22,26,0.95)' : 'rgba(255,255,255,0.95)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 16,
          boxShadow: isDark ? '0 12px 48px rgba(0,0,0,0.55)' : '0 8px 36px rgba(0,0,0,0.14)',
          padding: '14px 16px',
          animation: 'slideUp 0.2s ease',
        }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: 9, padding: 3 }}>
            {Object.entries(POMO_CFG).map(([key, m]) => (
              <button key={key} onClick={() => switchMode(key)}
                style={{
                  flex: 1, padding: '5px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                  background: mode === key ? m.color : 'transparent',
                  color: mode === key ? '#fff' : c.textTertiary,
                  boxShadow: mode === key ? `0 1px 8px ${m.glow}` : 'none',
                  transition: 'all 0.18s',
                }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Time + progress */}
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{
              fontSize: 38, fontWeight: 700, letterSpacing: '-0.05em',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              color: running ? cfg.color : c.text, transition: 'color 0.3s',
            }}>
              {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
            </div>
            <div style={{ height: 3, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', margin: '10px 0 0', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: cfg.color,
                width: `${progress * 100}%`, transition: running ? 'width 1s linear' : 'width 0.3s ease',
                boxShadow: running ? `0 0 6px ${cfg.glow}` : 'none',
              }} />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <button onClick={reset}
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', color: c.textTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}
              title="Zurücksetzen">
              <RotateCcw size={13} />
            </button>
            <button
              onClick={() => setRunning(r => !r)}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}bb)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 3px 16px ${cfg.glow}`,
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {running
                ? <Square size={16} color="#fff" fill="#fff" />
                : <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />}
            </button>
            <div style={{ width: 32 }} />
          </div>

          {/* Session dots */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: i < cyclePos ? '#FF453A' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                boxShadow: i < cyclePos ? '0 0 5px rgba(255,69,58,0.5)' : 'none',
                transition: 'all 0.25s',
              }} />
            ))}
            <span style={{ fontSize: 10, color: c.textTertiary, marginLeft: 4 }}>{sessions} heute</span>
          </div>
        </div>
      )}
    </div>
  );
}

function avatarColor(str = '') {
  const colors = ['#BF5AF2','var(--color-blue)','#34C759','#FF9500','#FF3B30','#5AC8FA','#AF52DE'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Sidebar() {
  const { logout, user, isAdmin, isPM } = useAuth();
  const { c, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const matchActive = (item) => {
    const prefixes = item.match || [item.to];
    if (item.to === '/') return location.pathname === '/';
    return prefixes.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  };

  const NAV_GROUPS = [
    {
      label: null,
      items: [
        { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/work',     icon: FolderKanban,    label: 'Projekte', match: ['/work', '/websites', '/timeline', '/planning'] },
        { to: '/calendar', icon: CalendarDays,    label: 'Zeit & Team', match: ['/calendar', '/time-tracking', '/team-dashboard'] },
      ],
    },
    {
      label: 'Vertrieb',
      items: [
        { to: '/sales', icon: Flame, label: 'Sales', match: ['/sales'] },
      ],
    },
    {
      label: 'Workflow',
      items: [
        { to: '/intake', icon: ClipboardCheck, label: 'Workflow', match: ['/intake', '/delivery', '/onboarding'] },
        { to: '/clients', icon: Users, label: 'Kunden' },
      ],
    },
    ...(isAdmin || isPM ? [{
      label: 'Finanzen',
      items: [
        { to: '/finance', icon: TrendingUp, label: 'Finanzen', match: ['/finance', '/invoices', '/quotes'] },
      ],
    }] : []),
    {
      label: 'Verwaltung',
      items: [
        { to: '/team',     icon: UserCog,   label: 'Team'          },
        ...(isAdmin ? [{ to: '/admin/partners', icon: Handshake, label: 'Partner' }] : []),
        { to: '/settings', icon: Settings,  label: 'Einstellungen' },
      ],
    },
  ];

  const { data: unread } = useQuery({
    queryKey: ['intake-unread-count'],
    queryFn: intakeApi.getUnreadCount,
    refetchInterval: 30000,
  });

  const displayName = user?.name || user?.email || '?';
  const initials = displayName.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bgColor  = user?.color || avatarColor(user?.email || '');

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: c.sidebarBg,
      backdropFilter: 'saturate(180%) blur(24px)',
      WebkitBackdropFilter: 'saturate(180%) blur(24px)',
      borderRight: `0.5px solid ${c.borderSubtle}`,
      zIndex: 10,
      transition: 'background 0.3s cubic-bezier(0.22,1,0.36,1)',
    }}>

      {/* Logo */}
      <div style={{ padding: '18px 16px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.4)',
            }}>
              <img src="/Logo-SM-JR.png" alt="Vecturo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{
              fontSize: 15, fontWeight: 700, letterSpacing: '-0.025em',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Vecturo</span>
          </div>
          <MiniPomodoro isDark={isDark} c={c} />
        </div>
      </div>

      {/* New project CTA */}
      <div style={{ padding: '8px 12px 8px' }}>
        <button
          onClick={() => navigate('/wizard')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: '8px 14px', fontSize: 13, fontWeight: 700,
            letterSpacing: '-0.01em', color: '#fff',
            background: 'linear-gradient(135deg, #5B8CF5 0%, #7C5CF5 100%)',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(91,140,245,0.3)',
            transition: 'filter 0.15s, transform 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={14} strokeWidth={2.5} />
          Neues Projekt
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 8px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p style={{
                padding: '14px 10px 4px', fontSize: 10, fontWeight: 700,
                color: c.textTertiary, textTransform: 'uppercase',
                letterSpacing: '0.08em', userSelect: 'none', margin: 0,
              }}>
                {group.label}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                  {() => {
                    const { icon: Icon, label, to } = item;
                    const isActive = matchActive(item);
                    return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '7px 10px', borderRadius: 10,
                      fontSize: 13, letterSpacing: '-0.01em', cursor: 'pointer',
                      transition: 'background 0.18s cubic-bezier(0.22,1,0.36,1), color 0.18s cubic-bezier(0.22,1,0.36,1)',
                      background: isActive ? 'rgba(91,140,245,0.14)' : 'transparent',
                      color: isActive ? '#5B8CF5' : c.textSecondary,
                      fontWeight: isActive ? 600 : 400,
                      boxShadow: isActive ? '0 0 0 0.5px rgba(91,140,245,0.2)' : 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Icon
                        size={16}
                        color={isActive ? '#5B8CF5' : c.textTertiary}
                        strokeWidth={isActive ? 2.2 : 1.5}
                      />
                      <span style={{ flex: 1 }}>{label}</span>
                      {to === '/intake' && unread?.count > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, padding: '0 5px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 99, background: '#F87171',
                          color: '#fff', fontSize: 10, fontWeight: 700,
                          lineHeight: 1,
                        }}>
                          {unread.count > 99 ? '99+' : unread.count}
                        </span>
                      )}
                    </div>
                    );
                  }}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: '8px 10px 12px', borderTop: `0.5px solid ${c.borderSubtle}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          borderRadius: 8, cursor: 'default',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: bgColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 600,
              color: '#fff', overflow: 'hidden',
            }}>
              {user?.avatar_base64
                ? <img src={user.avatar_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <span style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 9, height: 9, background: '#34D399',
              borderRadius: '50%', border: '2px solid #16161E',
              boxShadow: '0 0 6px rgba(52,211,153,0.6)',
            }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {user?.name && (
              <p style={{ fontSize: 13, fontWeight: 500, color: c.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.008em' }}>{user.name}</p>
            )}
            <p style={{ fontSize: 11, color: c.textTertiary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', fontSize: 13, color: c.textTertiary,
            letterSpacing: '-0.008em',
            borderRadius: 8, border: 'none', background: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1), color 0.15s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = c.redLight; e.currentTarget.style.color = c.red; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = c.textTertiary; }}
        >
          <LogOut size={14} strokeWidth={1.5} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
