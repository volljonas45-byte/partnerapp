import { useQuery } from '@tanstack/react-query';
import { Calendar, DollarSign, TrendingUp, ArrowRight, Users, Building2, Phone, ChevronRight, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { partnerApi } from '../api/partner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const fmt = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const fmtApptDate = d => new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const STATUS_LABELS = { anrufen: 'Anrufen', kontaktiert: 'Kontaktiert', termin_gesetzt: 'Termin', gewonnen: 'Gewonnen', verloren: 'Verloren' };
const STATUS_COLORS = { anrufen: '#3B82F6', kontaktiert: '#64748B', termin_gesetzt: '#38BDF8', gewonnen: '#34D399', verloren: '#F87171' };

const glass = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
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

function timeUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff < 0) return 'Läuft';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: leads = [] }     = useQuery({ queryKey: ['my-leads'],     queryFn: partnerApi.listLeads });
  const { data: appts = [] }     = useQuery({ queryKey: ['my-appts'],     queryFn: partnerApi.listAppointments });
  const { data: commData }       = useQuery({ queryKey: ['my-comms'],     queryFn: partnerApi.listCommissions });
  const { data: pool = [] }      = useQuery({ queryKey: ['lead-pool'],    queryFn: partnerApi.listPool });
  const { data: customers = [] } = useQuery({ queryKey: ['my-customers'], queryFn: partnerApi.listCustomers });

  const leadsToCall  = leads.filter(l => l.status === 'anrufen').length;
  const wonLeads     = leads.filter(l => l.status === 'gewonnen').length;
  const withAppt     = leads.filter(l => ['termin_gesetzt', 'gewonnen'].includes(l.status)).length;
  const callConvRate = leads.length ? Math.round((withAppt / leads.length) * 100) : 0;
  const upcoming     = appts.filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date()).length;
  const earned       = commData?.totals?.paid || 0;
  const pending      = commData?.totals?.pending || 0;
  const totalComm    = (commData?.totals?.open || 0) + (commData?.totals?.pending || 0) + (commData?.totals?.paid || 0);

  const nextAppt = appts
    .filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

  const callLeads = leads.filter(l => l.status === 'anrufen').slice(0, 4);

  const R = 20;
  const circum = 2 * Math.PI * R;

  const KPIs = [
    { icon: Phone,      label: 'Zu anrufen',   value: leadsToCall,      format: n => String(Math.round(n)), color: '#3B82F6', glow: 'rgba(59,130,246,0.22)',   sub: 'Offene Anrufe',    to: '/leads/mine'  },
    { icon: Users,      label: 'Lead-Pool',    value: pool.length,       format: n => String(Math.round(n)), color: '#38BDF8', glow: 'rgba(56,189,248,0.2)',    sub: 'Verfügbare Leads', to: '/leads/pool'  },
    { icon: Building2,  label: 'Meine Kunden', value: customers.length,  format: n => String(Math.round(n)), color: '#818cf8', glow: 'rgba(129,140,248,0.18)', sub: 'Aktive Kunden',    to: '/customers'   },
    { icon: Calendar,   label: 'Termine',      value: upcoming,          format: n => String(Math.round(n)), color: '#60a5fa', glow: 'rgba(96,165,250,0.18)',   sub: 'Bevorstehend',     to: '/appointments'},
    { icon: DollarSign, label: 'Ausgezahlt',   value: earned,            format: n => fmt(Math.round(n)),    color: '#34D399', glow: 'rgba(52,211,153,0.2)',    sub: 'Gesamtverdienst',  to: '/earnings'    },
    { icon: TrendingUp, label: 'Ausstehend',   value: pending,           format: n => fmt(Math.round(n)),    color: '#64748B', glow: 'rgba(100,116,139,0.15)', sub: 'Noch offen',       to: '/earnings'    },
  ];

  return (
    <div style={{ minHeight: '100%', padding: '24px 18px 64px', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '15%', width: 600, height: 600, background: 'rgba(56,189,248,0.05)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 500, height: 500, background: 'rgba(59,130,246,0.05)', borderRadius: '50%', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '3%', width: 300, height: 300, background: 'rgba(52,211,153,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Greeting */}
        <motion.div style={{ marginBottom: 20 }}
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>Partner-Portal</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Willkommen, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Pool <span style={{ color: '#3B82F6', fontWeight: 600 }}>{user?.commissionRatePool}%</span>
              {' · '}Eigene Leads <span style={{ color: '#60a5fa', fontWeight: 600 }}>{user?.commissionRateOwn}%</span>
            </p>
          </div>
        </motion.div>

        {/* KPI Row — 6 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 10 }}>
          {KPIs.map(({ icon: Icon, label, value, format: formatFn, color, glow, sub, to }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(to)}
              style={{ ...glass, padding: '14px 14px 12px', cursor: 'pointer', boxShadow: `0 0 28px ${glow}` }}
              whileHover={{ y: -4, boxShadow: `0 10px 36px ${glow}, 0 0 0 1px rgba(255,255,255,0.08)`, transition: { duration: 0.16 } }}
              whileTap={{ scale: 0.97 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}25` }}>
                  <Icon size={13} color={color} />
                </div>
                <motion.div style={{ width: 5, height: 5, borderRadius: '50%', background: color, marginTop: 2 }}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.45, ease: 'easeInOut' }} />
              </div>
              <div style={{
                fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4,
                background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                <AnimatedNumber to={value} delay={0.15 + i * 0.07} format={formatFn} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>{sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Middle Row: Next Appointment (wide) + Call Rate + Provision */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>

          {/* Nächster Termin */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.45 }}
            onClick={() => navigate('/appointments')}
            style={{ ...glass, padding: '18px 20px', cursor: 'pointer', boxShadow: nextAppt ? '0 0 36px rgba(56,189,248,0.1)' : undefined }}
            whileHover={{ y: -3, boxShadow: '0 10px 36px rgba(56,189,248,0.16), 0 0 0 1px rgba(255,255,255,0.07)', transition: { duration: 0.16 } }}
            whileTap={{ scale: 0.99 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nächster Termin</p>
                {nextAppt && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#38BDF8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(56,189,248,0.2)' }}>
                    {timeUntil(nextAppt.scheduled_at)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
                Alle Termine <ChevronRight size={12} />
              </div>
            </div>

            {nextAppt ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextAppt.company || '—'}
                  </p>
                  {nextAppt.contact_person && <p style={{ margin: '0 0 1px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{nextAppt.contact_person}</p>}
                  {nextAppt.industry && <p style={{ margin: '0 0 10px', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{nextAppt.industry}</p>}
                  <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#38BDF8' }}>{fmtApptDate(nextAppt.scheduled_at)}</p>
                  {nextAppt.google_meet_link && (
                    <a href={nextAppt.google_meet_link} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: '#3B82F6', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                      <ExternalLink size={12} /> Meet beitreten
                    </a>
                  )}
                </div>
                {nextAppt.demo_goal && (
                  <div style={{ maxWidth: 180, flexShrink: 0 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ziel</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {nextAppt.demo_goal}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ paddingTop: 4 }}>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Keine bevorstehenden Termine</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Setze deinen nächsten Termin aus dem Lead-Pool</p>
              </div>
            )}
          </motion.div>

          {/* Call-to-Termin Rate */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.45 }}
            onClick={() => navigate('/leads/mine')}
            style={{ ...glass, padding: '18px 20px', cursor: 'pointer' }}
            whileHover={{ y: -3, boxShadow: '0 10px 36px rgba(52,211,153,0.1)', transition: { duration: 0.16 } }}
            whileTap={{ scale: 0.99 }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Call-to-Termin</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="56" height="56" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                  <motion.circle cx="28" cy="28" r={R} fill="none" stroke="#34D399" strokeWidth="3.5"
                    strokeLinecap="round" strokeDasharray={circum}
                    initial={{ strokeDashoffset: circum }}
                    animate={{ strokeDashoffset: circum - (circum * callConvRate / 100) }}
                    transition={{ delay: 0.8, duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
                <span style={{ position: 'relative', zIndex: 1, fontSize: 12, fontWeight: 700, color: '#34D399' }}>
                  <AnimatedNumber to={callConvRate} delay={0.8} format={n => `${Math.round(n)}%`} />
                </span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 5 }}>Konversionsrate</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{withAppt} Leads → Termin</div>
                <div style={{ fontSize: 11, color: '#34D399', marginTop: 3, fontWeight: 600 }}>{wonLeads} gewonnen</div>
              </div>
            </div>
          </motion.div>

          {/* Provision Overview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.56, duration: 0.45 }}
            onClick={() => navigate('/earnings')}
            style={{ ...glass, padding: '18px 20px', cursor: 'pointer' }}
            whileHover={{ y: -3, boxShadow: '0 10px 36px rgba(59,130,246,0.1)', transition: { duration: 0.16 } }}
            whileTap={{ scale: 0.99 }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Provision</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Ausgezahlt', value: earned,    color: '#34D399' },
                { label: 'Ausstehend', value: pending,   color: '#64748B' },
                { label: 'Gesamt',     value: totalComm, color: '#3B82F6' },
              ].map(({ label, value, color }, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>
                    <AnimatedNumber to={value} delay={0.8 + i * 0.1} format={n => fmt(Math.round(n))} />
                  </span>
                </div>
              ))}
            </div>
            <div style={{ margin: '12px 0 8px', height: 1, background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>Pool {user?.commissionRatePool}%</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>Eigen {user?.commissionRateOwn}%</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Row: Pipeline + Call List */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* Lead Pipeline */}
          <motion.div style={{ ...glass, cursor: 'pointer' }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62, duration: 0.4 }}
            onClick={() => navigate('/leads/mine')}
            whileHover={{ y: -3, transition: { duration: 0.16 } }}
            whileTap={{ scale: 0.99 }}>
            <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Lead-Pipeline</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{leads.length} Leads gesamt</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#3B82F6' }}>
                Alle <ArrowRight size={11} />
              </div>
            </div>
            <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(STATUS_LABELS).map(([status, label], i) => {
                const cnt = leads.filter(l => l.status === status).length;
                const pct = leads.length ? (cnt / leads.length) * 100 : 0;
                const color = STATUS_COLORS[status];
                return (
                  <motion.div key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.72 + i * 0.06 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{pct.toFixed(0)}%</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 16, textAlign: 'right' }}>{cnt}</span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}70)`, boxShadow: `0 0 6px ${color}50` }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.78 + i * 0.07, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right column: Call list + quick links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Nächste Anrufe */}
            <motion.div style={glass}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.68, duration: 0.4 }}
              style={{ ...glass, flex: 1 }}>
              <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Nächste Anrufe</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{leadsToCall} Leads warten</div>
                </div>
                <motion.button onClick={() => navigate('/leads/mine')}
                  whileHover={{ x: 2 }}
                  style={{ display: 'flex', gap: 3, alignItems: 'center', fontSize: 11, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Alle <ArrowRight size={11} />
                </motion.button>
              </div>
              <div style={{ padding: '0 18px 14px' }}>
                {callLeads.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.2)', padding: '12px 0' }}>Keine Leads zu anrufen</p>
                ) : callLeads.map((lead, i) => (
                  <motion.div key={lead.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.78 + i * 0.06, duration: 0.3 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < callLeads.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(59,130,246,0.2)' }}>
                      <Phone size={12} color="#3B82F6" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company}</div>
                      {lead.phone && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{lead.phone}</div>}
                    </div>
                    {lead.deal_value && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', flexShrink: 0 }}>{fmt(lead.deal_value)}</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Lead-Pool',  sub: `${pool.length} verfügbar`,  color: '#38BDF8', to: '/leads/pool',   icon: Users      },
                { label: 'Verdienste', sub: fmt(earned),                  color: '#34D399', to: '/earnings',     icon: DollarSign },
              ].map(({ label, sub, color, to, icon: Icon }, i) => (
                <motion.div key={label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.72 + i * 0.07, duration: 0.35 }}
                  onClick={() => navigate(to)}
                  style={{ ...glass, padding: '12px 14px', cursor: 'pointer', boxShadow: `0 0 20px ${color}08` }}
                  whileHover={{ y: -3, boxShadow: `0 8px 28px ${color}18`, transition: { duration: 0.14 } }}
                  whileTap={{ scale: 0.97 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 7, border: `1px solid ${color}25` }}>
                    <Icon size={12} color={color} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{label}</div>
                  <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 1 }}>{sub}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
