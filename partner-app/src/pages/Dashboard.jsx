import { useQuery } from '@tanstack/react-query';
import { Briefcase, Calendar, DollarSign, TrendingUp, ArrowRight, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { partnerApi } from '../api/partner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const fmt = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const STATUS_LABELS = { anrufen: 'Anrufen', kontaktiert: 'Kontaktiert', termin_gesetzt: 'Termin', gewonnen: 'Gewonnen', verloren: 'Verloren' };
const STATUS_COLORS = { anrufen: '#3B82F6', kontaktiert: '#64748B', termin_gesetzt: '#38BDF8', gewonnen: '#34D399', verloren: '#F87171' };

const glass = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 20,
};

function AnimatedNumber({ to, delay = 0, format: formatFn = n => String(Math.round(n)) }) {
  const [display, setDisplay] = useState(formatFn(0));
  useEffect(() => {
    let frame;
    const startMs = Date.now() + delay * 1000;
    const dur = 1400;
    const tick = () => {
      const now = Date.now();
      if (now < startMs) { frame = requestAnimationFrame(tick); return; }
      const t = Math.min((now - startMs) / dur, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(formatFn(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, delay]);
  return <>{display}</>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: leads = [] }  = useQuery({ queryKey: ['my-leads'],  queryFn: partnerApi.listLeads });
  const { data: appts = [] }  = useQuery({ queryKey: ['my-appts'],  queryFn: partnerApi.listAppointments });
  const { data: commData }    = useQuery({ queryKey: ['my-comms'],  queryFn: partnerApi.listCommissions });

  const openLeads  = leads.filter(l => !['gewonnen', 'verloren'].includes(l.status)).length;
  const wonLeads   = leads.filter(l => l.status === 'gewonnen').length;
  const convRate   = leads.length ? Math.round((wonLeads / leads.length) * 100) : 0;
  const upcoming   = appts.filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date()).length;
  const earned     = commData?.totals?.paid || 0;
  const pending    = commData?.totals?.pending || 0;
  const totalComm  = (commData?.totals?.open || 0) + (commData?.totals?.pending || 0) + (commData?.totals?.paid || 0);

  const upcomingAppts = appts
    .filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 4);

  const METRICS = [
    { icon: Briefcase,  label: 'Offene Leads',   value: openLeads, format: n => String(Math.round(n)), color: '#3B82F6', glow: 'rgba(59,130,246,0.2)',   sub: `${leads.length} Leads gesamt` },
    { icon: Calendar,   label: 'Nächste Termine', value: upcoming,  format: n => String(Math.round(n)), color: '#38BDF8', glow: 'rgba(56,189,248,0.2)',   sub: `${appts.length} Termine gesamt` },
    { icon: DollarSign, label: 'Ausgezahlt',      value: earned,    format: n => fmt(Math.round(n)),    color: '#34D399', glow: 'rgba(52,211,153,0.2)',   sub: `${fmt(totalComm)} Gesamt-Volumen` },
    { icon: TrendingUp, label: 'Ausstehend',      value: pending,   format: n => fmt(Math.round(n)),    color: '#64748B', glow: 'rgba(100,116,139,0.15)', sub: 'Noch nicht ausgezahlt' },
  ];

  const R = 18;
  const circum = 2 * Math.PI * R;

  return (
    <div style={{ minHeight: '100%', padding: '36px 32px 64px', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 600, background: 'rgba(56,189,248,0.05)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 500, height: 500, background: 'rgba(59,130,246,0.05)', borderRadius: '50%', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '5%', width: 300, height: 300, background: 'rgba(52,211,153,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1040, margin: '0 auto' }}>

        {/* Greeting */}
        <motion.div style={{ marginBottom: 32 }}
          initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>
            Partner-Portal
          </p>
          <h1 style={{
            margin: '0 0 4px', fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Willkommen, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Pool-Provision: <span style={{ color: '#3B82F6', fontWeight: 600 }}>{user?.commissionRatePool}%</span>
            {' · '}Eigene Leads: <span style={{ color: '#38BDF8', fontWeight: 600 }}>{user?.commissionRateOwn}%</span>
          </p>
        </motion.div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
          {METRICS.map(({ icon: Icon, label, value, format: formatFn, color, glow, sub }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ ...glass, padding: '20px 20px 18px', boxShadow: `0 0 40px ${glow}` }}
              whileHover={{ y: -4, boxShadow: `0 12px 48px ${glow}, 0 0 0 1px rgba(255,255,255,0.08)`, transition: { duration: 0.2 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}28` }}>
                  <Icon size={16} color={color} />
                </div>
                <motion.div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 2 }}
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
                />
              </div>
              <div style={{
                fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5,
                background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                <AnimatedNumber to={value} delay={0.2 + i * 0.08} format={formatFn} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>

          {/* Konversionsrate */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...glass, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="52" height="52" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                <circle cx="26" cy="26" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <motion.circle cx="26" cy="26" r={R} fill="none" stroke="#34D399" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circum}
                  initial={{ strokeDashoffset: circum }}
                  animate={{ strokeDashoffset: circum - (circum * convRate / 100) }}
                  transition={{ delay: 0.7, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <span style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 700, color: '#34D399' }}>
                <AnimatedNumber to={convRate} delay={0.7} format={n => `${Math.round(n)}%`} />
              </span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 3 }}>Konversionsrate</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>{wonLeads} von {leads.length} Leads gewonnen</div>
            </div>
          </motion.div>

          {/* Provision */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...glass, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(59,130,246,0.22)' }}>
              <Target size={20} color="#3B82F6" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>Deine Provision</div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 1 }}>Pool-Leads</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#3B82F6', letterSpacing: '-0.02em' }}>{user?.commissionRatePool}%</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch' }} />
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 1 }}>Eigene Leads</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#38BDF8', letterSpacing: '-0.02em' }}>{user?.commissionRateOwn}%</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Gesamt-Provisionsvolumen */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...glass, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(52,211,153,0.2)' }}>
              <Zap size={20} color="#34D399" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 3 }}>Gesamt-Provisionsvolumen</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#34D399', letterSpacing: '-0.02em' }}>
                <AnimatedNumber to={totalComm} delay={0.75} format={n => fmt(Math.round(n))} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main content row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Nächste Termine */}
          <motion.div style={glass}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.56, duration: 0.4 }}>
            <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Nächste Termine</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{upcoming} bevorstehend</div>
              </div>
            </div>
            <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {upcomingAppts.length === 0 ? (
                <div style={{ padding: '28px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                  Keine bevorstehenden Termine
                </div>
              ) : upcomingAppts.map((a, i) => (
                <motion.div key={a.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.07, duration: 0.4 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}
                  whileHover={{ background: 'rgba(255,255,255,0.045)', transition: { duration: 0.15 } }}>
                  <div style={{ position: 'relative', width: 14, height: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px rgba(56,189,248,0.7)' }} />
                    <motion.div
                      style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid #38BDF8' }}
                      animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.company || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{fmtDate(a.scheduled_at)}</div>
                  </div>
                  {a.google_meet_link && (
                    <a href={a.google_meet_link} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, fontWeight: 600, color: '#3B82F6', textDecoration: 'none', padding: '3px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', flexShrink: 0 }}>
                      Meet
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Lead Pipeline */}
          <motion.div style={glass}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62, duration: 0.4 }}>
            <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Lead-Pipeline</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{leads.length} Leads gesamt</div>
              </div>
              <motion.button onClick={() => navigate('/leads/mine')}
                whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                Alle <ArrowRight size={11} />
              </motion.button>
            </div>
            <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(STATUS_LABELS).map(([status, label], i) => {
                const cnt = leads.filter(l => l.status === status).length;
                const pct = leads.length ? (cnt / leads.length) * 100 : 0;
                const color = STATUS_COLORS[status];
                return (
                  <motion.div key={status}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.06, duration: 0.3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>{pct.toFixed(0)}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 18, textAlign: 'right' }}>{cnt}</span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}70)`, boxShadow: `0 0 6px ${color}50` }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.75 + i * 0.07, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
