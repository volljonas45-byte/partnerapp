import { useQuery } from '@tanstack/react-query';
import { DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { partnerApi } from '../api/partner';
import { useAuth } from '../context/AuthContext';

const D = {
  bg:'#0D0D12', card:'#16161E', card2:'#1C1C26', border:'rgba(255,255,255,0.07)',
  text:'#F2F2F7', text2:'#AEAEB2', text3:'#636366',
  blue:'#5B8CF5', blueL:'#5B8CF514',
  green:'#34D399', greenL:'#34D39914',
  orange:'#FF9F0A', orangeL:'#FF9F0A14',
  red:'#FF453A', redL:'#FF453A14',
};

const fmt = (n) => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n||0);

const STATUS_MAP = {
  open:    { label:'Offen',      color:D.text3,  bg:D.card2  },
  pending: { label:'Ausstehend', color:D.orange, bg:D.orangeL },
  paid:    { label:'Ausgezahlt', color:D.green,  bg:D.greenL  },
};

export default function Earnings() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey:['my-comms'], queryFn: partnerApi.listCommissions });

  const { commissions = [], totals } = data || {};

  return (
    <div style={{ padding:'32px 28px 64px', maxWidth:900, margin:'0 auto' }}>
      <p style={{ fontSize:11, fontWeight:800, color:D.text3, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 2px' }}>Finanzen</p>
      <h1 style={{ fontSize:26, fontWeight:900, color:D.text, margin:'0 0 6px', letterSpacing:'-0.03em' }}>Meine Verdienste</h1>
      <p style={{ fontSize:14, color:D.text3, margin:'0 0 24px' }}>
        Pool-Provision: {user?.commissionRatePool}% · Eigene Leads: {user?.commissionRateOwn}%
      </p>

      {/* Summary Cards */}
      {totals && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14, marginBottom:28 }}>
          {[
            { icon: TrendingUp,   label:'Gesamt',     value: fmt((totals.open||0)+(totals.pending||0)+(totals.paid||0)), color:D.blue   },
            { icon: DollarSign,   label:'Ausgezahlt', value: fmt(totals.paid),    color:D.green  },
            { icon: Clock,        label:'Ausstehend', value: fmt(totals.pending), color:D.orange },
            { icon: CheckCircle,  label:'Offen',      value: fmt(totals.open),    color:D.text3  },
          ].map(({ icon:Icon, label, value, color }) => (
            <div key={label} style={{ background:`linear-gradient(145deg,${color}14 0%,${D.card} 60%)`,
              border:`0.5px solid ${color}30`, borderRadius:18, padding:'18px 20px',
              boxShadow:`0 0 24px ${color}0A` }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`${color}20`,
                display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                <Icon size={16} color={color} />
              </div>
              <p style={{ margin:'0 0 2px', fontSize:22, fontWeight:900, color:D.text, letterSpacing:'-0.02em' }}>{value}</p>
              <p style={{ margin:0, fontSize:12, color:D.text2 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Commission List */}
      <div style={{ background:D.card, borderRadius:18, border:`0.5px solid ${D.border}`, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`0.5px solid ${D.border}` }}>
          <p style={{ margin:0, fontSize:13, fontWeight:700, color:D.text }}>Provisionsübersicht</p>
        </div>

        {isLoading && <p style={{ padding:20, color:D.text3, margin:0 }}>Lädt…</p>}

        {!isLoading && commissions.length === 0 && (
          <p style={{ padding:'40px 20px', textAlign:'center', color:D.text3, margin:0 }}>
            Noch keine Provisionen. Setze deinen ersten Termin!
          </p>
        )}

        {commissions.map((c, i) => {
          const s = STATUS_MAP[c.status] || STATUS_MAP.open;
          return (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
              padding:'14px 20px',
              borderBottom: i < commissions.length-1 ? `0.5px solid ${D.border}` : 'none' }}>
              <div style={{ flex:1, minWidth:140 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:600, color:D.text }}>{c.company || '—'}</p>
                <p style={{ margin:'2px 0 0', fontSize:11, color:D.text3 }}>
                  {c.type === 'appointment' ? 'Termin-Provision' : 'Abschluss-Provision'} · {c.rate}%
                </p>
              </div>
              <span style={{ fontSize:18, fontWeight:800, color:D.green }}>{fmt(c.amount)}</span>
              {c.deal_value && (
                <span style={{ fontSize:12, color:D.text3 }}>
                  Deal: {fmt(c.deal_value)}
                </span>
              )}
              <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700,
                background:s.bg, color:s.color }}>{s.label}</span>
              <span style={{ fontSize:11, color:D.text3 }}>
                {new Date(c.created_at).toLocaleDateString('de-DE')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
