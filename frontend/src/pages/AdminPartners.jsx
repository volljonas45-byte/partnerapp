import { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, TrendingUp, Calendar, Briefcase, Plus, Check, X, ChevronDown,
         Pencil, Trash2, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { partnerApi } from '../api/partner';
import { useD } from '../lib/designTokens';

// ── Sliding SegCtrl ──────────────────────────────────────────────────────────
function SegCtrl({ tabs, active, onChange }) {
  const D = useD();
  const refs = useRef([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const i = tabs.indexOf(active);
    const el = refs.current[i];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, tabs]);
  const { isDark } = useTheme();
  const containerBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const containerBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const pillBg = isDark
    ? 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)'
    : '#FFFFFF';
  const pillShadow = isDark
    ? '0 2px 16px rgba(124,58,237,0.45), 0 0 0 0.5px rgba(255,255,255,0.1) inset'
    : '0 1px 4px rgba(0,0,0,0.15)';
  const activeColor = isDark ? '#FFFFFF' : D.text;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', background: containerBg,
      border: `0.5px solid ${containerBorder}`,
      borderRadius: 12, padding: 3, gap: 2 }}>
      <div style={{ position: 'absolute', top: 3, height: 'calc(100% - 6px)',
        left: pill.left, width: pill.width,
        background: pillBg, borderRadius: 9,
        boxShadow: pillShadow,
        transition: 'left 0.28s cubic-bezier(0.22,1,0.36,1), width 0.28s cubic-bezier(0.22,1,0.36,1)',
        pointerEvents: 'none' }} />
      {tabs.map((t, i) => (
        <button key={t} ref={el => refs.current[i] = el}
          onClick={() => onChange(t)}
          onMouseEnter={e => { if (active !== t) e.currentTarget.style.color = D.text; }}
          onMouseLeave={e => { if (active !== t) e.currentTarget.style.color = D.text2; }}
          style={{ position: 'relative', zIndex: 1, padding: '7px 16px', border: 'none',
            background: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13,
            fontWeight: active === t ? 700 : 500,
            color: active === t ? activeColor : D.text2,
            transition: 'color 0.2s', whiteSpace: 'nowrap' }}>
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Status badges ────────────────────────────────────────────────────────────
function PartnerStatusBadge({ status }) {
  const D = useD();
  const MAP = {
    pending:   { label: 'Ausstehend', color: D.orange, bg: D.orangeL },
    approved:  { label: 'Aktiv',      color: D.green,  bg: D.greenL  },
    suspended: { label: 'Gesperrt',   color: D.red,    bg: D.redL    },
  };
  const s = MAP[status] || MAP.pending;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function CommStatusBadge({ status }) {
  const D = useD();
  const MAP = {
    open:    { label: 'Offen',       color: D.text3,  bg: D.card2   },
    pending: { label: 'Ausstehend',  color: D.orange, bg: D.orangeL },
    paid:    { label: 'Ausgezahlt',  color: D.green,  bg: D.greenL  },
  };
  const s = MAP[status] || MAP.open;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Pool Lead Modal ───────────────────────────────────────────────────────────
function LeadModal({ lead, onClose, onSave }) {
  const D = useD();
  const [form, setForm] = useState(lead || {
    company: '', contact_person: '', phone: '', email: '',
    website: '', city: '', industry: '', deal_value: '', notes: '', priority: 'medium',
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = (k, label, type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>{label}</label>
      <input value={form[k] || ''} onChange={e => f(k, e.target.value)} type={type}
        style={{ background: D.input, border: `0.5px solid ${D.border}`, borderRadius: 10,
          padding: '9px 12px', fontSize: 14, color: D.text, outline: 'none' }} />
    </div>
  );
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', background: D.card, borderRadius: 20, padding: '28px 28px 24px',
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        border: `0.5px solid ${D.border}`, boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: D.text, margin: '0 0 20px' }}>
          {lead ? 'Lead bearbeiten' : 'Pool-Lead hinzufügen'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {inp('company', 'Firma *')}
          {inp('contact_person', 'Ansprechpartner')}
          {inp('phone', 'Telefon')}
          {inp('email', 'E-Mail', 'email')}
          {inp('website', 'Website')}
          {inp('city', 'Stadt')}
          {inp('industry', 'Branche')}
          {inp('deal_value', 'Deal-Wert (€)', 'number')}
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: D.text2 }}>Notizen</label>
          <textarea value={form.notes || ''} onChange={e => f('notes', e.target.value)}
            rows={3} style={{ width: '100%', marginTop: 5, background: D.input,
              border: `0.5px solid ${D.border}`, borderRadius: 10,
              padding: '9px 12px', fontSize: 14, color: D.text, outline: 'none',
              resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: `0.5px solid ${D.border}`,
            background: 'none', color: D.text2, cursor: 'pointer', fontSize: 14 }}>Abbrechen</button>
          <button onClick={() => onSave(form)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none',
            background: D.blue, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Speichern</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = ['Übersicht', 'Partner', 'Lead-Pool', 'Termine', 'Provisionen', 'Lead-Anfragen'];

export default function AdminPartners() {
  const D = useD();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('Übersicht');
  const [leadModal, setLeadModal] = useState(null); // null | 'new' | lead-object

  const { data: stats } = useQuery({ queryKey: ['partner-admin-stats'], queryFn: partnerApi.adminStats });
  const { data: partners = [] } = useQuery({ queryKey: ['partner-admin-partners'], queryFn: () => partnerApi.adminListPartners() });
  const { data: leadsData = [] } = useQuery({ queryKey: ['partner-admin-leads'], queryFn: () => partnerApi.adminListLeads() });
  const { data: appts = [] } = useQuery({ queryKey: ['partner-admin-appts'], queryFn: partnerApi.adminListAppointments });
  const { data: commData } = useQuery({ queryKey: ['partner-admin-comms'], queryFn: () => partnerApi.adminListCommissions() });
  const { data: leadRequests = [] } = useQuery({ queryKey: ['partner-admin-lead-requests'], queryFn: partnerApi.adminListLeadRequests });

  const updatePartner = useMutation({
    mutationFn: ({ id, data }) => partnerApi.adminUpdatePartner(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-admin-partners'] }),
  });
  const createLead = useMutation({
    mutationFn: (data) => partnerApi.adminCreateLead(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partner-admin-leads'] }); setLeadModal(null); },
  });
  const updateLead = useMutation({
    mutationFn: ({ id, data }) => partnerApi.adminUpdateLead(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partner-admin-leads'] }); setLeadModal(null); },
  });
  const deleteLead = useMutation({
    mutationFn: (id) => partnerApi.adminDeleteLead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-admin-leads'] }),
  });
  const updateComm = useMutation({
    mutationFn: ({ id, data }) => partnerApi.adminUpdateCommission(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-admin-comms'] }),
  });
  const updateLeadRequest = useMutation({
    mutationFn: ({ id, data }) => partnerApi.adminUpdateLeadRequest(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-admin-lead-requests'] }),
  });

  const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const MetricCard = ({ icon: Icon, label, value, color, sub }) => (
    <div style={{ background: `linear-gradient(145deg,${color}14 0%,${D.card} 60%)`,
      border: `0.5px solid ${color}30`, borderRadius: 20, padding: '20px 22px',
      boxShadow: `0 0 30px ${color}0A` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <p style={{ fontSize: 32, fontWeight: 900, color: D.text, margin: '0 0 2px', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ fontSize: 13, color: D.text2, margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: D.text3, margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <div style={{ padding: '32px 32px 64px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <p style={{ fontSize: 11, fontWeight: 800, color: D.text3, textTransform: 'uppercase',
          letterSpacing: '0.1em', margin: '0 0 4px' }}>Verwaltung</p>
        <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 24px',
          background: `linear-gradient(135deg, ${D.text} 30%, ${D.purple} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Partner-Programm</h1>

        <SegCtrl tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <div key={activeTab} style={{ marginTop: 28, animation: 'tabIn 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>

          {/* ── ÜBERSICHT ── */}
          {activeTab === 'Übersicht' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <MetricCard icon={AlertCircle} label="Offene Bewerbungen" value={stats?.pendingApplications ?? '–'} color={D.orange} />
                <MetricCard icon={Users}       label="Aktive Partner"     value={stats?.activePartners ?? '–'}       color={D.green}  />
                <MetricCard icon={Briefcase}   label="Leads gesamt"       value={stats?.totalLeads ?? '–'}           color={D.blue}   />
                <MetricCard icon={Calendar}    label="Bevorstehende Termine" value={stats?.upcomingAppointments ?? '–'} color={D.purple} />
                <MetricCard icon={DollarSign}  label="Offene Provisionen" value={fmt(stats?.openCommissions)}        color={D.red}    />
              </div>
            </div>
          )}

          {/* ── PARTNER ── */}
          {activeTab === 'Partner' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {partners.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: D.text3 }}>
                  Noch keine Partner-Bewerbungen.
                </div>
              )}
              {partners.map(p => (
                <div key={p.id} style={{ background: D.card, borderRadius: 16,
                  border: `0.5px solid ${D.border}`, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: D.purple + '30',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: D.purple, flexShrink: 0 }}>
                    {(p.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: D.text }}>{p.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: D.text3 }}>{p.email} · {p.phone || '–'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: D.text2 }}>{p.lead_count} Leads</span>
                    <span style={{ fontSize: 12, color: D.text2 }}>{p.appt_count} Termine</span>
                    <span style={{ fontSize: 12, color: D.green }}>{fmt(p.total_paid)} ausgezahlt</span>
                    <PartnerStatusBadge status={p.status} />
                    {p.status === 'pending' && (
                      <>
                        <button onClick={() => updatePartner.mutate({ id: p.id, data: { status: 'approved' } })}
                          title="Freischalten"
                          style={{ width: 32, height: 32, borderRadius: 8, border: 'none',
                            background: D.greenL, color: D.green, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={15} />
                        </button>
                        <button onClick={() => updatePartner.mutate({ id: p.id, data: { status: 'suspended' } })}
                          title="Ablehnen"
                          style={{ width: 32, height: 32, borderRadius: 8, border: 'none',
                            background: D.redL, color: D.red, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={15} />
                        </button>
                      </>
                    )}
                    {p.status === 'approved' && (
                      <button onClick={() => updatePartner.mutate({ id: p.id, data: { status: 'suspended' } })}
                        style={{ padding: '5px 12px', borderRadius: 8, border: 'none',
                          background: D.redL, color: D.red, cursor: 'pointer', fontSize: 12 }}>
                        Sperren
                      </button>
                    )}
                    {p.status === 'suspended' && (
                      <button onClick={() => updatePartner.mutate({ id: p.id, data: { status: 'approved' } })}
                        style={{ padding: '5px 12px', borderRadius: 8, border: 'none',
                          background: D.greenL, color: D.green, cursor: 'pointer', fontSize: 12 }}>
                        Reaktivieren
                      </button>
                    )}
                  </div>
                  {p.application_message && (
                    <div style={{ width: '100%', marginTop: 4, padding: '10px 14px',
                      background: D.card2, borderRadius: 10, fontSize: 13, color: D.text2,
                      borderLeft: `3px solid ${D.orange}` }}>
                      "{p.application_message}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── LEAD-POOL ── */}
          {activeTab === 'Lead-Pool' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setLeadModal('new')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                    borderRadius: 10, border: 'none', background: D.blue, color: '#fff',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <Plus size={15} /> Pool-Lead hinzufügen
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leadsData.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: D.text3 }}>
                    Noch keine Leads im Pool.
                  </div>
                )}
                {leadsData.map(l => (
                  <div key={l.id} style={{ background: D.card, borderRadius: 14,
                    border: `0.5px solid ${D.border}`, padding: '14px 18px',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: D.text }}>{l.company}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: D.text3 }}>
                        {l.contact_person || '–'} · {l.city || '–'} · {l.industry || '–'}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99,
                      background: l.partner_id ? D.greenL : D.blueL,
                      color: l.partner_id ? D.green : D.blue }}>
                      {l.partner_name || (l.partner_id ? 'Vergeben' : 'Im Pool')}
                    </span>
                    <span style={{ fontSize: 12, color: D.text2 }}>
                      {l.status}
                    </span>
                    {l.deal_value && <span style={{ fontSize: 12, color: D.green }}>{fmt(l.deal_value)}</span>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setLeadModal(l)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none',
                          background: D.blueL, color: D.blue, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => { if (confirm('Lead löschen?')) deleteLead.mutate(l.id); }}
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none',
                          background: D.redL, color: D.red, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TERMINE ── */}
          {activeTab === 'Termine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {appts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: D.text3 }}>
                  Noch keine Termine gesetzt.
                </div>
              )}
              {appts.map(a => (
                <div key={a.id} style={{ background: `linear-gradient(145deg,${D.purple}0D 0%,${D.card} 60%)`,
                  border: `0.5px solid ${D.purple}25`, borderRadius: 14, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Calendar size={20} color={D.purple} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: D.text }}>
                      {a.company || 'Kein Lead verknüpft'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: D.text3 }}>
                      Partner: {a.partner_name || '–'} · {a.industry || '–'}
                    </p>
                    {a.demo_goal && <p style={{ margin: '4px 0 0', fontSize: 12, color: D.text2 }}>
                      Ziel: {a.demo_goal}
                    </p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D.text }}>{fmtDate(a.scheduled_at)}</p>
                    {a.google_meet_link && (
                      <a href={a.google_meet_link} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: D.blue }}>Meet-Link öffnen</a>
                    )}
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: a.status === 'scheduled' ? D.blueL : a.status === 'completed' ? D.greenL : D.redL,
                    color: a.status === 'scheduled' ? D.blue : a.status === 'completed' ? D.green : D.red }}>
                    {a.status === 'scheduled' ? 'Geplant' : a.status === 'completed' ? 'Abgeschlossen' : 'Abgesagt'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── PROVISIONEN ── */}
          {activeTab === 'Provisionen' && (
            <div>
              {commData?.totals && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Offen',      value: fmt(commData.totals.open),    color: D.text3 },
                    { label: 'Ausstehend', value: fmt(commData.totals.pending), color: D.orange },
                    { label: 'Ausgezahlt', value: fmt(commData.totals.paid),    color: D.green  },
                  ].map(m => (
                    <div key={m.label} style={{ background: D.card, border: `0.5px solid ${D.border}`,
                      borderRadius: 14, padding: '16px 18px' }}>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: D.text3 }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(commData?.commissions || []).map(c => (
                  <div key={c.id} style={{ background: D.card, borderRadius: 13,
                    border: `0.5px solid ${D.border}`, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D.text }}>
                        {c.company || '(kein Lead)'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: D.text3 }}>
                        Partner: {c.partner_name} · {c.type === 'appointment' ? 'Termin' : 'Abschluss'}
                      </p>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: D.green }}>{fmt(c.amount)}</span>
                    <CommStatusBadge status={c.status} />
                    {c.status !== 'paid' && (
                      <button onClick={() => updateComm.mutate({ id: c.id, data: { status: c.status === 'open' ? 'pending' : 'paid' } })}
                        style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: c.status === 'open' ? D.orangeL : D.greenL,
                          color: c.status === 'open' ? D.orange : D.green, fontSize: 12, fontWeight: 600 }}>
                        {c.status === 'open' ? 'Ausstehend markieren' : 'Als ausgezahlt markieren'}
                      </button>
                    )}
                    {c.status === 'paid' && c.paid_at && (
                      <span style={{ fontSize: 11, color: D.text3 }}>
                        {new Date(c.paid_at).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LEAD-ANFRAGEN ── */}
          {activeTab === 'Lead-Anfragen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leadRequests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: D.text3 }}>
                  Noch keine Lead-Anfragen.
                </div>
              )}
              {leadRequests.map(r => (
                <div key={r.id} style={{ background: D.card, borderRadius: 16,
                  border: `0.5px solid ${D.border}`, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: D.text }}>
                      {r.partner_name} <span style={{ fontWeight: 400, color: D.text3, fontSize: 12 }}>({r.partner_email})</span>
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: D.text2 }}>
                      Branche: <strong>{r.industry}</strong> · Anzahl: <strong>{r.quantity}</strong>
                    </p>
                    {r.message && <p style={{ margin: '6px 0 0', fontSize: 12, color: D.text2,
                      padding: '8px 12px', background: D.card2, borderRadius: 8,
                      borderLeft: `3px solid ${D.purple}` }}>
                      "{r.message}"
                    </p>}
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: D.text3 }}>
                      {new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: r.status === 'pending' ? D.orangeL : r.status === 'fulfilled' ? D.greenL : D.card2,
                    color: r.status === 'pending' ? D.orange : r.status === 'fulfilled' ? D.green : D.text3 }}>
                    {r.status === 'pending' ? 'Offen' : r.status === 'fulfilled' ? 'Erledigt' : r.status}
                  </span>
                  {r.status === 'pending' && (
                    <button onClick={() => updateLeadRequest.mutate({ id: r.id, data: { status: 'fulfilled' } })}
                      style={{ padding: '5px 12px', borderRadius: 8, border: 'none',
                        background: D.greenL, color: D.green, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Als erledigt markieren
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {leadModal && (
        <LeadModal
          lead={leadModal === 'new' ? null : leadModal}
          onClose={() => setLeadModal(null)}
          onSave={(data) => leadModal === 'new'
            ? createLead.mutate(data)
            : updateLead.mutate({ id: leadModal.id, data })
          }
        />
      )}
    </div>
  );
}
