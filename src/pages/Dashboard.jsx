import { useQuery } from '@tanstack/react-query';
import { Briefcase, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { partnerApi } from '../api/partner';
import { useAuth } from '../context/AuthContext';

const D = {
  bg: '#0D0D12', card: '#16161E', card2: '#1C1C26', border: 'rgba(255,255,255,0.07)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', blueL: '#5B8CF514', green: '#34D399', greenL: '#34D39914',
  orange: '#FF9F0A', orangeL: '#FF9F0A14', purple: '#BF5AF2', purpleL: '#BF5AF214',
};

const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);

const STATUS_LABELS = {
  anrufen: 'Anrufen', kontaktiert: 'Kontaktiert',
  termin_gesetzt: 'Termin', gewonnen: 'Gewonnen', verloren: 'Verloren',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: leads = [] }   = useQuery({ queryKey: ['my-leads'], queryFn: partnerApi.listLeads });
  const { data: appts = [] }   = useQuery({ queryKey: ['my-appts'], queryFn: partnerApi.listAppointments });
  const { data: commData }     = useQuery({ queryKey: ['my-comms'], queryFn: partnerApi.listCommissions });

  const openLeads = leads.filter(l => !['gewonnen','verloren'].includes(l.status)).length;
  const upcoming  = appts.filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date()).length;
  const earned    = commData?.totals?.paid || 0;
  const pending   = commData?.totals?.pending || 0;

  const fmtDate = (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '32px 28px 64px', maxWidth: 960, margin: '0 auto' }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: D.text3, textTransform: 'uppercase',
        letterSpacing: '0.1em', margin: '0 0 4px' }}>Partner-Portal</p>
      <h1 style={{ fontSize: 30, fontWeight: 900, color: D.text, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
        Willkommen, {user?.name?.split(' ')[0]}
      </h1>
      <p style={{ fontSize: 14, color: D.text3, margin: '0 0 28px' }}>
        Provision Pool: {user?.commissionRatePool}% · Eigene Leads: {user?.commissionRateOwn}%
      </p>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 14, marginBottom: 32 }}>
        {[
          { icon: Briefcase, label: 'Offene Leads',   value: openLeads,    color: D.blue   },
          { icon: Calendar,  label: 'Termine',         value: upcoming,     color: D.purple },
          { icon: DollarSign,label: 'Ausgezahlt',      value: fmt(earned),  color: D.green  },
          { icon: TrendingUp,label: 'Ausstehend',      value: fmt(pending), color: D.orange },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: `linear-gradient(145deg,${color}14 0%,${D.card} 60%)`,
            border: `0.5px solid ${color}30`, borderRadius: 18, padding: '18px 20px',
            boxShadow: `0 0 24px ${color}0A` }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon size={17} color={color} />
            </div>
            <p style={{ margin: '0 0 2px', fontSize: 26, fontWeight: 900, color: D.text, letterSpacing: '-0.03em' }}>{value}</p>
            <p style={{ margin: 0, fontSize: 12, color: D.text2 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Nächste Termine */}
        <div style={{ background: D.card, borderRadius: 18, border: `0.5px solid ${D.border}`, padding: '20px 22px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: D.text }}>Nächste Termine</p>
          {appts.filter(a => a.status === 'scheduled').slice(0, 4).length === 0 && (
            <p style={{ fontSize: 13, color: D.text3 }}>Keine bevorstehenden Termine.</p>
          )}
          {appts.filter(a => a.status === 'scheduled').slice(0, 4).map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0',
              borderBottom: `0.5px solid ${D.border}`, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: D.purple, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.company || '—'}</p>
                <p style={{ margin: 0, fontSize: 11, color: D.text3 }}>{fmtDate(a.scheduled_at)}</p>
              </div>
              {a.google_meet_link && (
                <a href={a.google_meet_link} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: D.blue, textDecoration: 'none', whiteSpace: 'nowrap' }}>Meet</a>
              )}
            </div>
          ))}
        </div>

        {/* Aktive Leads Übersicht */}
        <div style={{ background: D.card, borderRadius: 18, border: `0.5px solid ${D.border}`, padding: '20px 22px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: D.text }}>Lead-Status</p>
          {Object.entries(STATUS_LABELS).slice(0, 4).map(([status, label]) => {
            const cnt = leads.filter(l => l.status === status).length;
            return (
              <div key={status} style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '7px 0', borderBottom: `0.5px solid ${D.border}` }}>
                <span style={{ fontSize: 13, color: D.text2 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
