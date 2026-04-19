import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, Calendar, ChevronRight, X, Check } from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  bg: '#0D0D12', card: '#16161E', card2: '#1C1C26', border: 'rgba(255,255,255,0.07)',
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366', input: '#1C1C26',
  blue: '#5B8CF5', blueL: '#5B8CF514', green: '#34D399', greenL: '#34D39914',
  orange: '#FF9F0A', orangeL: '#FF9F0A14', red: '#FF453A', redL: '#FF453A14',
  purple: '#BF5AF2', purpleL: '#BF5AF214',
};

const STATUSES = ['anrufen','kontaktiert','termin_gesetzt','gewonnen','verloren'];
const STATUS_LABEL = { anrufen:'Anrufen', kontaktiert:'Kontaktiert', termin_gesetzt:'Termin gesetzt', gewonnen:'Gewonnen', verloren:'Verloren' };
const STATUS_COLOR = { anrufen: D.blue, kontaktiert: D.orange, termin_gesetzt: D.purple, gewonnen: D.green, verloren: D.red };

function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState(lead || {
    company:'', contact_person:'', phone:'', email:'', website:'', city:'', industry:'', deal_value:'', notes:'', priority:'medium',
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = (k, label, type='text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>{label}</label>
      <input value={form[k]||''} onChange={e=>f(k,e.target.value)} type={type}
        style={{ background: D.input, border:`0.5px solid ${D.border}`, borderRadius:9,
          padding:'9px 12px', fontSize:14, color:D.text, outline:'none' }} />
    </div>
  );
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)' }} />
      <div style={{ position:'relative', background:D.card, borderRadius:20, padding:'26px',
        width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto',
        border:`0.5px solid ${D.border}`, boxShadow:'0 32px 64px rgba(0,0,0,0.5)' }}>
        <h2 style={{ fontSize:17, fontWeight:700, color:D.text, margin:'0 0 18px' }}>
          {lead ? 'Lead bearbeiten' : 'Eigenen Lead anlegen'}
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {inp('company','Firma *')} {inp('contact_person','Ansprechpartner')}
          {inp('phone','Telefon')}   {inp('email','E-Mail','email')}
          {inp('website','Website')} {inp('city','Stadt')}
          {inp('industry','Branche')} {inp('deal_value','Deal-Wert (€)','number')}
        </div>
        <div style={{ marginTop:10 }}>
          <label style={{ fontSize:12, fontWeight:600, color:D.text2 }}>Notizen</label>
          <textarea value={form.notes||''} onChange={e=>f('notes',e.target.value)} rows={3}
            style={{ width:'100%', marginTop:5, background:D.input, border:`0.5px solid ${D.border}`,
              borderRadius:9, padding:'9px 12px', fontSize:14, color:D.text, outline:'none',
              resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
        </div>
        <div style={{ display:'flex', gap:8, marginTop:18, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:9, border:`0.5px solid ${D.border}`,
            background:'none', color:D.text2, cursor:'pointer', fontSize:13 }}>Abbrechen</button>
          <button onClick={()=>onSave(form)} style={{ padding:'8px 16px', borderRadius:9, border:'none',
            background:D.blue, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>Speichern</button>
        </div>
      </div>
    </div>, document.body
  );
}

function CallLogModal({ lead, onClose }) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState('reached');
  const [notes, setNotes]   = useState('');
  const [newStatus, setNewStatus] = useState(lead.status);
  const log = useMutation({
    mutationFn: () => partnerApi.addCallLog(lead.id, { outcome, notes, new_status: newStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['my-leads'] }); onClose(); },
  });
  const OUTCOMES = [
    { v:'reached', l:'Erreicht' }, { v:'not_reached', l:'Nicht erreicht' },
    { v:'voicemail', l:'Mailbox' }, { v:'callback', l:'Rückruf' },
  ];
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)' }} />
      <div style={{ position:'relative', background:D.card, borderRadius:'24px 24px 0 0', padding:'24px',
        width:'100%', maxWidth:480, border:`0.5px solid ${D.border}`, boxShadow:'0 -16px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ width:36, height:4, background:D.border, borderRadius:2, margin:'0 auto 20px' }} />
        <h3 style={{ fontSize:16, fontWeight:700, color:D.text, margin:'0 0 6px' }}>Anruf eintragen</h3>
        <p style={{ fontSize:13, color:D.text3, margin:'0 0 18px' }}>{lead.company}</p>
        <p style={{ fontSize:12, fontWeight:600, color:D.text2, margin:'0 0 8px' }}>Ergebnis</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {OUTCOMES.map(o => (
            <button key={o.v} onClick={()=>setOutcome(o.v)}
              style={{ padding:'9px', borderRadius:10, border:`0.5px solid ${outcome===o.v?D.blue:D.border}`,
                background:outcome===o.v?D.blueL:'none', color:outcome===o.v?D.blue:D.text2,
                cursor:'pointer', fontSize:13, fontWeight:outcome===o.v?600:400 }}>
              {o.l}
            </button>
          ))}
        </div>
        <p style={{ fontSize:12, fontWeight:600, color:D.text2, margin:'0 0 8px' }}>Status setzen</p>
        <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
          style={{ width:'100%', padding:'9px 12px', background:D.input, border:`0.5px solid ${D.border}`,
            borderRadius:9, color:D.text, fontSize:14, marginBottom:14, outline:'none' }}>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notizen (optional)" rows={2}
          style={{ width:'100%', background:D.input, border:`0.5px solid ${D.border}`, borderRadius:9,
            padding:'9px 12px', fontSize:14, color:D.text, outline:'none', resize:'none',
            boxSizing:'border-box', fontFamily:'inherit', marginBottom:16 }} />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10, border:`0.5px solid ${D.border}`,
            background:'none', color:D.text2, cursor:'pointer', fontSize:14 }}>Abbrechen</button>
          <button onClick={()=>log.mutate()} style={{ flex:2, padding:'10px', borderRadius:10, border:'none',
            background:D.blue, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700 }}>Eintragen</button>
        </div>
      </div>
    </div>, document.body
  );
}

function AppointmentModal({ lead, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ lead_id: lead.id, scheduled_at:'', industry: lead.industry||'', demo_goal:'', google_meet_link:'' });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const create = useMutation({
    mutationFn: () => partnerApi.createAppointment(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['my-leads'] }); qc.invalidateQueries({ queryKey:['my-appts'] }); onClose(); },
  });
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)' }} />
      <div style={{ position:'relative', background:D.card, borderRadius:20, padding:'26px',
        width:'100%', maxWidth:440, border:`0.5px solid ${D.border}`, boxShadow:'0 32px 64px rgba(0,0,0,0.5)' }}>
        <h2 style={{ fontSize:17, fontWeight:700, color:D.text, margin:'0 0 18px' }}>Termin setzen</h2>
        <p style={{ fontSize:13, color:D.text3, margin:'0 0 16px' }}>{lead.company}</p>
        {[
          { k:'scheduled_at', l:'Datum & Uhrzeit', t:'datetime-local' },
          { k:'industry',     l:'Branche',          t:'text' },
          { k:'google_meet_link', l:'Google Meet Link (optional)', t:'url' },
        ].map(({ k, l, t }) => (
          <div key={k} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:D.text2, display:'block', marginBottom:5 }}>{l}</label>
            <input type={t} value={form[k]||''} onChange={e=>f(k,e.target.value)}
              style={{ width:'100%', background:D.input, border:`0.5px solid ${D.border}`, borderRadius:9,
                padding:'9px 12px', fontSize:14, color:D.text, outline:'none', boxSizing:'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:D.text2, display:'block', marginBottom:5 }}>Demo-Ziel</label>
          <textarea value={form.demo_goal} onChange={e=>f('demo_goal',e.target.value)} rows={2}
            placeholder="Was soll der Interessent nach dem Demo sagen/entscheiden?"
            style={{ width:'100%', background:D.input, border:`0.5px solid ${D.border}`, borderRadius:9,
              padding:'9px 12px', fontSize:14, color:D.text, outline:'none', resize:'none',
              boxSizing:'border-box', fontFamily:'inherit' }} />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10, border:`0.5px solid ${D.border}`,
            background:'none', color:D.text2, cursor:'pointer', fontSize:14 }}>Abbrechen</button>
          <button onClick={()=>create.mutate()} style={{ flex:2, padding:'10px', borderRadius:10, border:'none',
            background:D.purple, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700 }}>Termin eintragen</button>
        </div>
      </div>
    </div>, document.body
  );
}

export default function MyLeads() {
  const qc = useQueryClient();
  const { data: leads = [] } = useQuery({ queryKey:['my-leads'], queryFn: partnerApi.listLeads });
  const [modal, setModal]     = useState(null); // null | 'new' | lead
  const [callLead, setCallLead] = useState(null);
  const [apptLead, setApptLead] = useState(null);

  const createLead = useMutation({
    mutationFn: (d) => partnerApi.createLead(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['my-leads'] }); setModal(null); },
  });
  const updateLead = useMutation({
    mutationFn: ({ id, data }) => partnerApi.updateLead(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['my-leads'] }); setModal(null); },
  });

  const COLS = STATUSES.slice(0, 4); // exclude verloren in kanban

  return (
    <div style={{ padding:'32px 28px 64px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <p style={{ fontSize:11, fontWeight:800, color:D.text3, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 2px' }}>Vertrieb</p>
          <h1 style={{ fontSize:26, fontWeight:900, color:D.text, margin:0, letterSpacing:'-0.03em' }}>Meine Leads</h1>
        </div>
        <button onClick={()=>setModal('new')}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10,
            border:'none', background:D.blue, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          <Plus size={15} /> Eigener Lead
        </button>
      </div>

      {/* Kanban */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${COLS.length},1fr)`, gap:14, overflowX:'auto' }}>
        {COLS.map(status => {
          const colLeads = leads.filter(l => l.status === status);
          const color = STATUS_COLOR[status];
          return (
            <div key={status}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />
                <span style={{ fontSize:12, fontWeight:700, color:D.text2, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                  {STATUS_LABEL[status]}
                </span>
                <span style={{ fontSize:11, color:D.text3, marginLeft:'auto' }}>{colLeads.length}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {colLeads.map(lead => (
                  <div key={lead.id} style={{ background:`linear-gradient(145deg,${color}0D 0%,${D.card} 60%)`,
                    border:`0.5px solid ${color}25`, borderRadius:14, padding:'14px 16px',
                    boxShadow:`0 0 20px ${color}08` }}>
                    <p style={{ margin:'0 0 3px', fontSize:14, fontWeight:700, color:D.text }}>{lead.company}</p>
                    {lead.contact_person && <p style={{ margin:'0 0 6px', fontSize:12, color:D.text3 }}>{lead.contact_person}</p>}
                    {lead.phone && <p style={{ margin:'0 0 8px', fontSize:12, color:D.text2 }}>{lead.phone}</p>}
                    {lead.industry && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                      background:`${color}15`, color:color }}>{lead.industry}</span>}
                    {lead.deal_value && (
                      <p style={{ margin:'8px 0 0', fontSize:13, fontWeight:700, color:D.green }}>
                        {new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(lead.deal_value)}
                      </p>
                    )}
                    <div style={{ display:'flex', gap:6, marginTop:12 }}>
                      <button onClick={()=>setCallLead(lead)} title="Anruf eintragen"
                        style={{ flex:1, padding:'6px', borderRadius:8, border:'none',
                          background:D.blueL, color:D.blue, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:12 }}>
                        <Phone size={13} /> Anruf
                      </button>
                      <button onClick={()=>setApptLead(lead)} title="Termin setzen"
                        style={{ flex:1, padding:'6px', borderRadius:8, border:'none',
                          background:D.purpleL, color:D.purple, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:12 }}>
                        <Calendar size={13} /> Termin
                      </button>
                      <button onClick={()=>setModal(lead)}
                        style={{ width:28, height:28, borderRadius:8, border:'none',
                          background:D.card2, color:D.text3, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <LeadModal
          lead={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={data => modal === 'new' ? createLead.mutate(data) : updateLead.mutate({ id: modal.id, data })}
        />
      )}
      {callLead && <CallLogModal lead={callLead} onClose={() => setCallLead(null)} />}
      {apptLead && <AppointmentModal lead={apptLead} onClose={() => setApptLead(null)} />}
    </div>
  );
}
