import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Phone, Mail, Globe, Building2, CalendarDays,
  Flag, Euro, ChevronDown, MapPin, UserCheck, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../api/sales';
import LeadStatusBadge, { LEAD_STATUSES } from '../components/sales/LeadStatusBadge';
import CallInProgressSheet from '../components/sales/CallInProgressSheet';
import FollowupScheduler from '../components/sales/FollowupScheduler';

// ── Helpers ──────────────────────────────────────────────────────────────────

const OUTCOME_CFG = {
  reached:     { label: 'Erreicht',       color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
  not_reached: { label: 'Nicht erreicht', color: 'var(--color-text-secondary)', bg: 'rgba(118,118,128,0.1)' },
  voicemail:   { label: 'Mailbox',        color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  callback:    { label: 'Rückruf',        color: 'var(--color-blue)', bg: 'rgba(0,122,255,0.1)' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) + ', ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

function fmtDuration(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function followupColor(dateStr) {
  if (!dateStr) return 'var(--color-text-secondary)';
  const diff = Math.round((new Date(dateStr) - Date.now()) / 86400000);
  if (diff < 0) return '#FF3B30';
  if (diff === 0) return '#FF9500';
  return 'var(--color-text-secondary)';
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function SalesLeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeCall, setActiveCall]       = useState(null);
  const [showFollowup, setShowFollowup]   = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [notes, setNotes]                 = useState('');
  const [notesLoaded, setNotesLoaded]     = useState(false);

  // Fetch lead by ID
  const { data: lead, isLoading } = useQuery({
    queryKey: ['sales-lead', id],
    queryFn: () => salesApi.getLead(id),
  });

  // Fetch calls for this lead (by lead_id, or client_id if available)
  const { data: calls = [] } = useQuery({
    queryKey: ['sales-calls-lead', id, lead?.client_id],
    queryFn: () => {
      if (lead?.client_id) return salesApi.listCalls({ client_id: lead.client_id });
      return salesApi.listCalls({ lead_id: id });
    },
    enabled: !!lead,
  });

  useEffect(() => {
    if (lead && !notesLoaded) {
      setNotes(lead.notes || '');
      setNotesLoaded(true);
    }
  }, [lead, notesLoaded]);

  useEffect(() => {
    if (!isLoading && !lead) {
      toast.error('Lead nicht gefunden');
      navigate('/sales');
    }
  }, [isLoading, lead, navigate]);

  // Mutations
  const updateLeadMut = useMutation({
    mutationFn: (data) => salesApi.updateLead(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-lead', id] });
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });

  const convertMut = useMutation({
    mutationFn: () => salesApi.convertToClient(Number(id)),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sales-lead', id] });
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Lead zu Kunde konvertiert!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Fehler bei Konvertierung'),
  });

  const logCallMut    = useMutation({ mutationFn: salesApi.logCall });
  const updateCallMut = useMutation({
    mutationFn: ({ id: cid, data }) => salesApi.updateCall(cid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-calls-lead'] });
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
    },
  });

  async function handleCall() {
    if (!lead?.phone) return toast.error('Keine Telefonnummer');
    try {
      const payload = lead.client_id
        ? { client_id: lead.client_id, lead_id: Number(id) }
        : { lead_id: Number(id) };
      const call = await logCallMut.mutateAsync(payload);
      window.open('tel:' + lead.phone, '_self');
      setActiveCall({ callId: call.id, clientName: lead.company_name, phone: lead.phone });
    } catch { toast.error('Fehler beim Starten'); }
  }

  function handleCallEnd(callId, outcome, callNotes, duration) {
    updateCallMut.mutate({ id: callId, data: { outcome, notes: callNotes, duration_sec: duration } });
    setActiveCall(null);
    if (outcome === 'reached' || outcome === 'callback') setShowFollowup(true);
  }

  function handleFollowupSave(leadId, date, note) {
    updateLeadMut.mutate({ next_followup_date: date, next_followup_note: note });
    setShowFollowup(false);
    toast.success('Follow-up geplant');
  }

  function handleStatusChange(status) {
    updateLeadMut.mutate({ status });
    setShowStatusMenu(false);
    toast.success('Status aktualisiert');
  }

  function handleNotesBlur() {
    if (notes !== (lead?.notes || '')) {
      updateLeadMut.mutate({ notes });
    }
  }

  if (isLoading || !lead) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>Laden...</div>;
  }

  const fColor = followupColor(lead.next_followup_date);
  const isConverted = !!lead.client_id;
  const canConvert = !isConverted;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">

      {/* Back */}
      <button
        onClick={() => navigate('/sales')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500,
          color: 'var(--color-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
        }}
      >
        <ArrowLeft size={15} />
        Sales Engine
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.5px', margin: 0 }}>
            {lead.company_name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 13, color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
            {lead.contact_person && <span>{lead.contact_person}</span>}
            {lead.city   && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={12} />{lead.city}</span>}
            {lead.phone  && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} />{lead.phone}</span>}
            {lead.email  && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} />{lead.email}</span>}
            {lead.domain && (
              <a href={`https://${lead.domain}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-blue)', textDecoration: 'none' }}>
                <Globe size={12} />{lead.domain} <ExternalLink size={10} />
              </a>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <LeadStatusBadge status={lead.status} />
            {lead.industry && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                <Building2 size={11} /> {lead.industry}
              </span>
            )}
            {lead.website_status && (
              <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,149,0,0.1)', color: '#B35A00', fontWeight: 500 }}>
                {lead.website_status}
              </span>
            )}
            {isConverted && (
              <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 99, background: 'rgba(52,199,89,0.1)', color: '#1A8F40', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <UserCheck size={11} /> Kunde
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Convert to Client */}
          {canConvert && (
            <button
              onClick={() => {
                if (window.confirm(`"${lead.company_name}" als Kunden anlegen und in die Kundenpipeline aufnehmen?`)) {
                  convertMut.mutate();
                }
              }}
              disabled={convertMut.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, background: 'rgba(52,199,89,0.1)', color: '#1A8F40',
                border: '1px solid rgba(52,199,89,0.25)', cursor: 'pointer', opacity: convertMut.isPending ? 0.7 : 1,
              }}
            >
              <UserCheck size={14} />
              {convertMut.isPending ? 'Konvertieren...' : 'Zu Kunde machen'}
            </button>
          )}

          {/* Status dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStatusMenu(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, background: 'var(--color-border-subtle)', color: 'var(--color-text-tertiary)',
                border: 'none', cursor: 'pointer',
              }}
            >
              Status <ChevronDown size={13} />
            </button>
            {showStatusMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--color-card)',
                borderRadius: 12, padding: 6, minWidth: 170, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                border: '1px solid var(--color-border-subtle)', zIndex: 20,
              }}>
                {Object.entries(LEAD_STATUSES)
                  .filter(([k]) => k !== 'abgeschlossen') // deduplicate
                  .map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => handleStatusChange(k)}
                      style={{
                        display: 'block', width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500,
                        color: lead.status === k ? v.color : 'var(--color-text)',
                        background: lead.status === k ? v.bg : 'none',
                        border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Call button */}
          <button
            onClick={handleCall}
            disabled={!lead.phone}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              background: lead.phone ? '#34C759' : 'var(--color-border)',
              color: lead.phone ? '#fff' : 'var(--color-text-tertiary)',
              border: 'none', cursor: lead.phone ? 'pointer' : 'not-allowed',
            }}
          >
            <Phone size={15} />
            Anrufen
          </button>
        </div>
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, alignItems: 'start' }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Follow-up Card */}
          <div style={{ background: 'var(--color-card)', borderRadius: 14, padding: 20, border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.2px' }}>Follow-up</span>
              <button
                onClick={() => setShowFollowup(true)}
                style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)', border: 'none', cursor: 'pointer' }}
              >
                {lead.next_followup_date ? 'Ändern' : 'Planen'}
              </button>
            </div>
            {lead.next_followup_date ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarDays size={16} color={fColor} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: fColor }}>{fmtDate(lead.next_followup_date)}</div>
                  {lead.next_followup_note && <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>{lead.next_followup_note}</div>}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Kein Follow-up geplant</div>
            )}
          </div>

          {/* Details Card */}
          <div style={{ background: 'var(--color-card)', borderRadius: 14, padding: 20, border: '1px solid var(--color-border-subtle)' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.2px', display: 'block', marginBottom: 14 }}>Details</span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Priorität</label>
                <select
                  value={lead.priority ?? 0}
                  onChange={e => updateLeadMut.mutate({ priority: Number(e.target.value) })}
                  style={selectStyle}
                >
                  <option value={0}>Normal</option>
                  <option value={1}>Hoch</option>
                  <option value={2}>Dringend</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Deal-Wert</label>
                <div style={{ position: 'relative' }}>
                  <Euro size={13} color="#86868B" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="number" min={0} step={100}
                    defaultValue={lead.deal_value || ''}
                    onBlur={e => { const v = parseFloat(e.target.value) || null; if (v !== lead.deal_value) updateLeadMut.mutate({ deal_value: v }); }}
                    placeholder="0"
                    style={{ ...selectStyle, paddingLeft: 30 }}
                  />
                </div>
              </div>

              {/* Editable fields for standalone leads */}
              {!isConverted && (
                <>
                  <div>
                    <label style={labelStyle}>Telefon</label>
                    <input
                      defaultValue={lead.phone || ''}
                      onBlur={e => { if (e.target.value !== (lead.phone || '')) updateLeadMut.mutate({ phone: e.target.value }); }}
                      placeholder="0711 123456"
                      style={selectStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>E-Mail</label>
                    <input
                      defaultValue={lead.email || ''}
                      onBlur={e => { if (e.target.value !== (lead.email || '')) updateLeadMut.mutate({ email: e.target.value }); }}
                      placeholder="info@firma.de"
                      style={selectStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Stadt</label>
                    <input
                      defaultValue={lead.city || ''}
                      onBlur={e => { if (e.target.value !== (lead.city || '')) updateLeadMut.mutate({ city: e.target.value }); }}
                      placeholder="Stuttgart"
                      style={selectStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Domain</label>
                    <input
                      defaultValue={lead.domain || ''}
                      onBlur={e => { if (e.target.value !== (lead.domain || '')) updateLeadMut.mutate({ domain: e.target.value }); }}
                      placeholder="firma.de"
                      style={selectStyle}
                    />
                  </div>
                </>
              )}
              <div>
                <label style={labelStyle}>Adresse</label>
                <input
                  defaultValue={lead.address || ''}
                  onBlur={e => { if (e.target.value !== (lead.address || '')) updateLeadMut.mutate({ address: e.target.value }); }}
                  placeholder="Straße, PLZ Ort"
                  style={selectStyle}
                />
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div style={{ background: 'var(--color-card)', borderRadius: 14, padding: 20, border: '1px solid var(--color-border-subtle)' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.2px', display: 'block', marginBottom: 10 }}>Notizen</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Notizen zum Lead..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5, border: '1.5px solid #E5E5EA', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* RIGHT — Call History */}
        <div style={{ background: 'var(--color-card)', borderRadius: 14, padding: 18, border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.2px' }}>Anrufe</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', background: 'var(--color-card-secondary)', padding: '2px 8px', borderRadius: 99 }}>{calls.length}</span>
          </div>

          {calls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Phone size={24} color="#E5E5EA" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Noch keine Anrufe</div>
            </div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {calls.map(c => {
                const o = OUTCOME_CFG[c.outcome] || OUTCOME_CFG.reached;
                return (
                  <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{fmtDateTime(c.started_at)}</span>
                      <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: o.bg, color: o.color }}>{o.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Dauer: {fmtDuration(c.duration_sec)}</div>
                    {c.notes && <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>{c.notes}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overlays */}
      {activeCall && <CallInProgressSheet callId={activeCall.callId} clientName={activeCall.clientName} phone={activeCall.phone} onEnd={handleCallEnd} onClose={() => setActiveCall(null)} />}
      {showFollowup && <FollowupScheduler leadId={Number(id)} currentDate={lead.next_followup_date} onSave={handleFollowupSave} onClose={() => setShowFollowup(false)} />}
    </div>
  );
}

const labelStyle  = { fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 };
const selectStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1.5px solid #E5E5EA', outline: 'none', background: 'var(--color-card)', cursor: 'pointer', boxSizing: 'border-box' };
