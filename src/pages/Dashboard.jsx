import { useQuery } from '@tanstack/react-query';
import { Briefcase, Calendar, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { partnerApi } from '../api/partner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const fmt = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const STATUS_LABELS = { anrufen: 'Anrufen', kontaktiert: 'Kontaktiert', termin_gesetzt: 'Termin', gewonnen: 'Gewonnen', verloren: 'Verloren' };
const STATUS_COLORS = { anrufen: '#5B8CF5', kontaktiert: '#FF9F0A', termin_gesetzt: '#BF5AF2', gewonnen: '#34D399', verloren: '#FF453A' };

const glass = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 20,
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } }),
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: leads = [] }  = useQuery({ queryKey: ['my-leads'],  queryFn: partnerApi.listLeads });
  const { data: appts = [] }  = useQuery({ queryKey: ['my-appts'],  queryFn: partnerApi.listAppointments });
  const { data: commData }    = useQuery({ queryKey: ['my-comms'],  queryFn: partnerApi.listCommissions });

  const openLeads = leads.filter(l => !['gewonnen', 'verloren'].includes(l.status)).length;
  const upcoming  = appts.filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date()).length;
  const earned    = commData?.totals?.paid || 0;
  const pending   = commData?.totals?.pending || 0;

  const METRICS = [
    { icon: Briefcase,   label: 'Offene Leads',  value: openLeads,   color: '#5B8CF5', glow: 'rgba(91,140,245,0.15)' },
    { icon: Calendar,    label: 'Termine',        value: upcoming,    color: '#BF5AF2', glow: 'rgba(191,90,242,0.15)' },
    { icon: DollarSign,  label: 'Ausgezahlt',     value: fmt(earned), color: '#34D399', glow: 'rgba(52,211,153,0.15)' },
    { icon: TrendingUp,  label: 'Ausstehend',     value: fmt(pending),color: '#FF9F0A', glow: 'rgba(255,159,10,0.15)' },
  ];

  const upcomingAppts = appts.filter(a => a.status === 'scheduled').slice(0, 5);

  return (
    <div style={{ minHeight: '100%', padding: '36px 32px 64px', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 500, height: 500, background: 'rgba(139,92,246,0.07)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 400, height: 400, background: 'rgba(91,140,245,0.06)', borderRadius: '50%', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '60%', width: 300, height: 300, background: 'rgba(52,211,153,0.05)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto' }}>

        {/* greeting */}
        <motion.div style={{ marginBottom: 36 }}
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>
            Partner-Portal
          </p>
          <h1 style={{
            margin: '0 0 6px', fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Willkommen, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            Pool-Provision: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{user?.commissionRatePool}%</span>
            {' · '}Eigene Leads: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{user?.commissionRateOwn}%</span>
          </p>
        </motion.div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {METRICS.map(({ icon: Icon, label, value, color, glow }, i) => (
            <motion.div key={label} custom={i} variants={cardVariants} initial="hidden" animate="show"
              style={{ ...glass, padding: '22px 22px 20px', cursor: 'default', boxShadow: `0 0 40px ${glow}` }}
              whileHover={{ y: -3, boxShadow: `0 8px 40px ${glow}, 0 0 0 1px rgba(255,255,255,0.08)`, transition: { duration: 0.2 } }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: `1px solid ${color}30` }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{
                fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, lineHeight: 1,
                background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {value}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{label}</div>
            </motion.div>
          ))}
        </div>

        {/* bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Termine */}
          <motion.div style={glass}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.4 }}
          >
            <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Nächste Termine</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{upcoming} bevorstehend</span>
            </div>
            <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {upcomingAppts.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                  Keine bevorstehenden Termine
                </div>
              ) : upcomingAppts.map((a, i) => (
                <motion.div key={a.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.05 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}
                  whileHover={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#BF5AF2', flexShrink: 0, boxShadow: '0 0 8px rgba(191,90,242,0.6)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.company || '—'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{fmtDate(a.scheduled_at)}</div>
                  </div>
                  {a.google_meet_link && (
                    <a href={a.google_meet_link} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, fontWeight: 600, color: '#5B8CF5', textDecoration: 'none', padding: '3px 8px', borderRadius: 6, background: 'rgba(91,140,245,0.1)', border: '1px solid rgba(91,140,245,0.2)' }}>
                      Meet
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Lead Status */}
          <motion.div style={glass}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44, duration: 0.4 }}
          >
            <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Lead-Pipeline</span>
              <motion.button
                onClick={() => navigate('/leads/mine')}
                whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#5B8CF5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Alle anzeigen <ArrowRight size={11} />
              </motion.button>
            </div>
            <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(STATUS_LABELS).map(([status, label], i) => {
                const cnt = leads.filter(l => l.status === status).length;
                const pct = leads.length ? (cnt / leads.length) * 100 : 0;
                const color = STATUS_COLORS[status];
                return (
                  <motion.div key={status}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.05 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{cnt}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}80)` }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.55 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
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
