import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  bg:'#0D0D12', card:'#16161E', card2:'#1C1C26', border:'rgba(255,255,255,0.07)',
  text:'#F2F2F7', text2:'#AEAEB2', text3:'#636366',
  accent:'#FF9F0A', accentL:'rgba(255,159,10,0.12)',
  green:'#34D399', greenL:'#34D39914',
  red:'#FF453A', redL:'#FF453A14',
  purple:'#BF5AF2', purpleL:'#BF5AF214',
};

const STATUS_MAP = {
  scheduled:  { label:'Geplant',       color: D.accent,   bg: D.accentL   },
  completed:  { label:'Abgeschlossen', color: D.green,  bg: D.greenL  },
  cancelled:  { label:'Abgesagt',      color: D.red,    bg: D.redL    },
  no_show:    { label:'Nicht erschienen', color: D.text3, bg: D.card2  },
};

export default function Appointments() {
  const qc = useQueryClient();
  const { data: appts = [], isLoading } = useQuery({ queryKey:['my-appts'], queryFn: partnerApi.listAppointments });
  const update = useMutation({
    mutationFn: ({ id, data }) => partnerApi.updateAppointment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey:['my-appts'] }),
  });

  const fmtDate = (d) => new Date(d).toLocaleDateString('de-DE', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
  });

  const upcoming  = appts.filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date());
  const past      = appts.filter(a => a.status !== 'scheduled' || new Date(a.scheduled_at) < new Date());

  const Section = ({ title, items }) => (
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontSize:12, fontWeight:700, color:D.text3, textTransform:'uppercase',
        letterSpacing:'0.06em', margin:'0 0 12px' }}>{title}</p>
      {items.length === 0 && <p style={{ fontSize:13, color:D.text3 }}>Keine Einträge.</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {items.map(a => {
          const s = STATUS_MAP[a.status] || STATUS_MAP.scheduled;
          const isUpcoming = a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date();
          return (
            <div key={a.id} style={{ background:`linear-gradient(145deg,${D.purple}0D 0%,${D.card} 60%)`,
              border:`0.5px solid ${D.purple}25`, borderRadius:16, padding:'18px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                <div>
                  <p style={{ margin:'0 0 4px', fontSize:15, fontWeight:700, color:D.text }}>{a.company || '—'}</p>
                  <p style={{ margin:0, fontSize:13, color:D.text3 }}>{a.contact_person || ''}</p>
                </div>
                <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700,
                  background:s.bg, color:s.color }}>{s.label}</span>
              </div>

              <p style={{ margin:'12px 0 4px', fontSize:14, fontWeight:600, color:D.text }}>
                {fmtDate(a.scheduled_at)}
              </p>

              {a.industry && <p style={{ margin:'0 0 4px', fontSize:12, color:D.text2 }}>Branche: {a.industry}</p>}
              {a.demo_goal && <p style={{ margin:'0 0 12px', fontSize:12, color:D.text2, lineHeight:1.5 }}>
                Ziel: {a.demo_goal}
              </p>}

              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {a.google_meet_link && (
                  <a href={a.google_meet_link} target="_blank" rel="noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
                      borderRadius:9, background:D.accentL, color:D.accent, textDecoration:'none',
                      fontSize:13, fontWeight:600 }}>
                    <ExternalLink size={13} /> Meet öffnen
                  </a>
                )}
                {isUpcoming && (
                  <>
                    <button onClick={()=>update.mutate({ id:a.id, data:{ status:'completed' }})}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
                        borderRadius:9, border:'none', background:D.greenL, color:D.green,
                        cursor:'pointer', fontSize:13, fontWeight:600 }}>
                      <CheckCircle size={13} /> Abgeschlossen
                    </button>
                    <button onClick={()=>update.mutate({ id:a.id, data:{ status:'cancelled' }})}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
                        borderRadius:9, border:'none', background:D.redL, color:D.red,
                        cursor:'pointer', fontSize:13, fontWeight:600 }}>
                      <XCircle size={13} /> Abgesagt
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding:'32px 28px 64px', maxWidth:800, margin:'0 auto' }}>
      <p style={{ fontSize:11, fontWeight:800, color:D.text3, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 2px' }}>Vertrieb</p>
      <h1 style={{ fontSize:26, fontWeight:900, color:D.text, margin:'0 0 24px', letterSpacing:'-0.03em' }}>Meine Termine</h1>

      {isLoading ? <p style={{ color:D.text3 }}>Lädt…</p> : (
        <>
          <Section title={`Bevorstehend (${upcoming.length})`} items={upcoming} />
          <Section title={`Vergangen (${past.length})`} items={past} />
        </>
      )}
    </div>
  );
}
