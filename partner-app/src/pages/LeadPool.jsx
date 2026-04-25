import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Phone, MapPin, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { partnerApi } from '../api/partner';

const D = {
  bg:'#070C15', card:'#0D1525', card2:'#111D30', border:'rgba(255,255,255,0.07)',
  text:'#F2F2F7', text2:'#AEAEB2', text3:'#636366',
  accent:'#3B82F6', accentL:'rgba(59,130,246,0.12)',
  green:'#34D399', greenL:'#34D39914',
  orange:'#64748B',
};

const PRIORITY_COLOR = { high: '#38BDF8', medium: '#3B82F6', low: '#636366' };

export default function LeadPool() {
  const qc = useQueryClient();
  const { data: pool = [], isLoading } = useQuery({ queryKey:['lead-pool'], queryFn: partnerApi.listPool });
  const claim = useMutation({
    mutationFn: (id) => partnerApi.claimLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['lead-pool'] });
      qc.invalidateQueries({ queryKey:['my-leads'] });
    },
  });

  return (
    <div style={{ padding:'32px 28px 64px', maxWidth:1000, margin:'0 auto' }}>

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
        <p style={{ fontSize:11, fontWeight:800, color:D.text3, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 2px' }}>Vertrieb</p>
        <h1 style={{ fontSize:26, fontWeight:900, color:D.text, margin:'0 0 6px', letterSpacing:'-0.03em' }}>Lead-Pool</h1>
        <p style={{ fontSize:14, color:D.text3, margin:'0 0 24px' }}>
          {pool.length} verfügbare Leads · 20% Provision bei Abschluss
        </p>
      </motion.div>

      {isLoading && <p style={{ color:D.text3 }}>Lädt…</p>}

      {!isLoading && pool.length === 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
          style={{ textAlign:'center', padding:'60px 20px', color:D.text3 }}>
          Aktuell keine Leads im Pool verfügbar.
        </motion.div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {pool.map((lead, i) => {
          const pColor = PRIORITY_COLOR[lead.priority] || D.accent;
          return (
            <motion.div key={lead.id}
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: 0.1 + i * 0.06, duration:0.35 }}
              style={{ background:`linear-gradient(145deg,${pColor}0D 0%,${D.card} 65%)`,
                border:`0.5px solid ${pColor}25`, borderRadius:16, padding:'18px 18px 14px',
                boxShadow:`0 0 24px ${pColor}08` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:pColor, marginTop:5, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0, margin:'0 10px' }}>
                  <p style={{ margin:0, fontSize:15, fontWeight:700, color:D.text }}>{lead.company}</p>
                  {lead.contact_person && <p style={{ margin:'2px 0 0', fontSize:12, color:D.text3 }}>{lead.contact_person}</p>}
                </div>
                {lead.deal_value && (
                  <span style={{ fontSize:13, fontWeight:800, color:D.green, flexShrink:0 }}>
                    {new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(lead.deal_value)}
                  </span>
                )}
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
                {lead.phone && (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <Phone size={11} color={D.text3} />
                    <span style={{ fontSize:12, color:D.text2 }}>{lead.phone}</span>
                  </div>
                )}
                {lead.city && (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <MapPin size={11} color={D.text3} />
                    <span style={{ fontSize:12, color:D.text2 }}>{lead.city}</span>
                  </div>
                )}
                {lead.industry && (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <Tag size={11} color={D.text3} />
                    <span style={{ fontSize:12, color:D.text2 }}>{lead.industry}</span>
                  </div>
                )}
              </div>

              {lead.notes && (
                <p style={{ margin:'0 0 12px', fontSize:12, color:D.text3, lineHeight:1.5,
                  overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                  {lead.notes}
                </p>
              )}

              <button onClick={() => { if (confirm(`Lead "${lead.company}" übernehmen?`)) claim.mutate(lead.id); }}
                disabled={claim.isPending}
                style={{ width:'100%', padding:'9px', borderRadius:10, border:'none',
                  background: D.accent, color:'#fff', cursor:'pointer',
                  fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Download size={14} /> Lead übernehmen
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
