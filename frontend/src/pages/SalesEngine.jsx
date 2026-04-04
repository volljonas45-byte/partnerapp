import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Phone, Search, Flame, Settings, AlertCircle, CheckCircle2, Plus, Clock,
  PhoneCall, FileSpreadsheet, Building2, Mail, Globe, MapPin, ExternalLink,
  ChevronDown, CalendarDays, Euro, UserCheck, ArrowRight, MousePointerClick,
  Sparkles, X, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../api/sales';
import { LEAD_STATUSES } from '../components/sales/LeadStatusBadge';
import CallInProgressSheet from '../components/sales/CallInProgressSheet';
import FollowupScheduler from '../components/sales/FollowupScheduler';
import SalesTargetModal from '../components/sales/SalesTargetModal';
import ExcelImportModal from '../components/sales/ExcelImportModal';
import CreateLeadModal from '../components/sales/CreateLeadModal';
import { useMobile } from '../hooks/useMobile';

// ── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'Jetzt';
  if (diff < 60) return `vor ${diff}m`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `vor ${h}h`;
  return `vor ${Math.floor(h / 24)}T`;
}

function fmtDate(iso, opts = { day: '2-digit', month: 'short' }) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('de-DE', opts);
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) +
    ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

function fmtDuration(sec) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function followupInfo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr) - Date.now()) / 86400000);
  if (diff < 0) return { color: '#FF3B30', label: `${Math.abs(diff)}T überfällig`, urgent: true };
  if (diff === 0) return { color: '#FF9500', label: 'Heute', urgent: true };
  if (diff <= 2) return { color: '#FF9500', label: `in ${diff}T`, urgent: false };
  return { color: '#34C759', label: `in ${diff}T`, urgent: false };
}

const OUTCOME_CFG = {
  reached:     { label: 'Erreicht',       color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
  not_reached: { label: 'Nicht erreicht', color: '#86868B', bg: 'rgba(118,118,128,0.1)' },
  voicemail:   { label: 'Mailbox',        color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  callback:    { label: 'Rückruf',        color: '#0071E3', bg: 'rgba(0,113,227,0.1)' },
};

const WEBSITE_STATUS_CFG = {
  'Keine Website':              { color: '#FF3B30', bg: 'rgba(255,59,48,0.08)',   short: 'Keine Website' },
  'Website Fehler':             { color: '#FF3B30', bg: 'rgba(255,59,48,0.08)',   short: 'Fehler' },
  'Alte Website + nicht Resp.': { color: '#FF9500', bg: 'rgba(255,149,0,0.08)',   short: 'Nicht Resp.' },
  'Veraltete Website':          { color: '#FF9500', bg: 'rgba(255,149,0,0.08)',   short: 'Veraltet' },
  'Website/ Branchenbuch':      { color: '#B8860B', bg: 'rgba(255,214,10,0.1)',   short: 'Branchenbuch' },
};

const PRIORITY_CFG = {
  0: { color: '#C7C7CC', label: 'Normal', dot: '#C7C7CC' },
  1: { color: '#FF9500', label: 'Hoch',   dot: '#FF9500' },
  2: { color: '#FF3B30', label: 'Dringend', dot: '#FF3B30' },
};

const TABS = [
  { key: 'due',          label: 'Fällig heute' },
  { key: 'all',          label: 'Alle' },
  { key: 'anrufen',      label: 'Anrufen' },
  { key: 'follow_up',    label: 'Follow Up' },
  { key: 'interessiert', label: 'Interessiert' },
  { key: 'demo',         label: 'Demo' },
  { key: 'spaeter',      label: 'Später' },
  { key: 'verloren',     label: 'Verloren' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color, target }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '12px 14px',
      border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#86868B', marginTop: 2 }}>{label}</div>
        </div>
        {sub && <div style={{ fontSize: 11, color: '#AEAEB2', marginLeft: 'auto', textAlign: 'right' }}>{sub}</div>}
      </div>
      {pct !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#86868B' }}>{value}/{target}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color }}>{pct}%</span>
          </div>
          <div style={{ height: 3, background: '#F2F2F7', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function LeadRow({ lead, isSelected, onClick, onCall }) {
  const fu = followupInfo(lead.next_followup_date);
  const ws = WEBSITE_STATUS_CFG[lead.website_status];
  const pc = PRIORITY_CFG[lead.priority ?? 0];
  const s  = LEAD_STATUSES[lead.status] || LEAD_STATUSES.neu;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer',
        background: isSelected ? 'rgba(0,113,227,0.06)' : 'transparent',
        borderLeft: isSelected ? '3px solid #0071E3' : '3px solid transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F9F9FB'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Priority dot */}
      <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: pc.dot, marginTop: 1 }} />

      {/* Text block — nimmt den ganzen verfügbaren Platz */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Zeile 1: Firmenname — volle Breite */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.1px', marginBottom: 3 }}>
          {lead.company_name}
        </div>
        {/* Zeile 2: Badges + Stadt */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
          <span style={{
            padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600,
            background: s.bg, color: s.color, whiteSpace: 'nowrap', flexShrink: 0,
          }}>{s.label}</span>

          {ws && (
            <span title={lead.website_status} style={{
              padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600,
              background: ws.bg, color: ws.color, whiteSpace: 'nowrap', flexShrink: 0,
            }}>{ws.short}</span>
          )}

          {(lead.city || lead.contact_person) && (
            <span style={{ fontSize: 10.5, color: '#AEAEB2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[lead.contact_person, lead.city].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>

      {/* Rechts: Follow-up + Anzahl + Anruf-Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        {fu ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: fu.color, whiteSpace: 'nowrap' }}>{fu.label}</span>
        ) : <span style={{ fontSize: 10, color: '#E5E5EA' }}>—</span>}
        <span style={{ fontSize: 10, color: '#AEAEB2' }}>
          {lead.total_calls ? `${lead.total_calls}x angerufen` : 'noch kein Anruf'}
        </span>
      </div>

      {/* Call button */}
      <button
        onClick={e => { e.stopPropagation(); onCall(lead); }}
        disabled={!lead.phone}
        title={lead.phone || 'Keine Nummer'}
        style={{
          width: 30, height: 30, borderRadius: 8, border: 'none', flexShrink: 0,
          background: lead.phone ? 'rgba(52,199,89,0.12)' : 'rgba(0,0,0,0.04)',
          color: lead.phone ? '#34C759' : '#C7C7CC',
          cursor: lead.phone ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (lead.phone) e.currentTarget.style.background = 'rgba(52,199,89,0.24)'; }}
        onMouseLeave={e => { if (lead.phone) e.currentTarget.style.background = 'rgba(52,199,89,0.12)'; }}
      >
        <Phone size={13} />
      </button>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 12, color: '#AEAEB2',
    }}>
      <MousePointerClick size={36} strokeWidth={1.5} />
      <div style={{ fontSize: 14, fontWeight: 600, color: '#86868B' }}>Lead auswählen</div>
      <div style={{ fontSize: 12.5, color: '#AEAEB2' }}>Klicke einen Lead in der Liste an</div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function SalesEngine() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // UI state
  const [tab, setTab]                       = useState('due');
  const [search, setSearch]                 = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showAddLead, setShowAddLead]       = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showTargets, setShowTargets]       = useState(false);
  const [activeCall, setActiveCall]         = useState(null);
  const [followupFor, setFollowupFor]       = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Detail-panel local state
  const [notes, setNotes]         = useState('');
  const prevLeadIdRef             = useRef(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['sales-stats'],
    queryFn: salesApi.stats,
    refetchInterval: 30000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['sales-chart'],
    queryFn: () => salesApi.chart(14),
  });

  const { data: recentCalls = [] } = useQuery({
    queryKey: ['sales-calls-recent'],
    queryFn: () => salesApi.listCalls({ limit: 8 }),
  });

  const leadsParams = useMemo(() => {
    const p = {};
    if (tab === 'due') p.due_today = '1';
    else if (tab !== 'all') p.status = tab;
    if (search) p.search = search;
    return p;
  }, [tab, search]);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['sales-leads', leadsParams],
    queryFn: () => salesApi.listLeads(leadsParams),
  });

  const { data: selectedLead } = useQuery({
    queryKey: ['sales-lead', selectedLeadId],
    queryFn: () => salesApi.getLead(selectedLeadId),
    enabled: !!selectedLeadId,
  });

  const { data: leadCalls = [] } = useQuery({
    queryKey: ['sales-calls-lead', selectedLeadId, selectedLead?.client_id],
    queryFn: () => selectedLead?.client_id
      ? salesApi.listCalls({ client_id: selectedLead.client_id })
      : salesApi.listCalls({ lead_id: selectedLeadId }),
    enabled: !!selectedLead,
  });

  // Sync notes when lead changes
  useEffect(() => {
    if (selectedLead && selectedLead.id !== prevLeadIdRef.current) {
      setNotes(selectedLead.notes || '');
      prevLeadIdRef.current = selectedLead.id;
      setShowStatusMenu(false);
    }
  }, [selectedLead]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createLeadMut = useMutation({
    mutationFn: (data) => salesApi.createLead(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
      toast.success('Lead erstellt');
      setShowAddLead(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const importLeadsMut = useMutation({
    mutationFn: (leads) => salesApi.importLeads(leads),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Import fehlgeschlagen'),
  });

  const updateLeadMut = useMutation({
    mutationFn: ({ id, data }) => salesApi.updateLead(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-lead', String(selectedLeadId)] });
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });

  const convertMut = useMutation({
    mutationFn: (id) => salesApi.convertToClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-lead', String(selectedLeadId)] });
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Zu Kunde konvertiert!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Fehler'),
  });

  const logCallMut = useMutation({ mutationFn: salesApi.logCall });

  const updateCallMut = useMutation({
    mutationFn: ({ id, data }) => salesApi.updateCall(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['sales-calls-recent'] });
      qc.invalidateQueries({ queryKey: ['sales-calls-lead'] });
    },
  });

  const updateTargetsMut = useMutation({
    mutationFn: salesApi.updateTargets,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
      toast.success('Ziele aktualisiert');
      setShowTargets(false);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleCall(lead) {
    try {
      const payload = lead.client_id
        ? { client_id: lead.client_id, lead_id: lead.id }
        : { lead_id: lead.id };
      const call = await logCallMut.mutateAsync(payload);
      window.open('tel:' + (lead.phone || ''), '_self');
      setActiveCall({ callId: call.id, clientName: lead.company_name, phone: lead.phone, leadId: lead.id });
    } catch { toast.error('Fehler beim Starten des Anrufs'); }
  }

  function handleCallEnd(callId, outcome, callNotes, duration) {
    updateCallMut.mutate({ id: callId, data: { outcome, notes: callNotes, duration_sec: duration } });
    const lead = activeCall;
    setActiveCall(null);
    if (outcome === 'reached' || outcome === 'callback') {
      setFollowupFor({ leadId: lead.leadId });
    }
  }

  function handleFollowupSave(leadId, date, note) {
    updateLeadMut.mutate({ id: leadId, data: { next_followup_date: date, next_followup_note: note } });
    setFollowupFor(null);
    toast.success('Follow-up geplant');
  }

  async function handleImport(importedLeads) {
    const res = await importLeadsMut.mutateAsync(importedLeads);
    toast.success(`${res.imported} Leads importiert`);
    return res;
  }

  function handleNotesBlur() {
    if (selectedLead && notes !== (selectedLead.notes || '')) {
      updateLeadMut.mutate({ id: selectedLeadId, data: { notes } });
    }
  }

  function handleStatusChange(status) {
    updateLeadMut.mutate({ id: selectedLeadId, data: { status } });
    setShowStatusMenu(false);
    const archiveStatuses = ['verloren', 'spaeter'];
    if (archiveStatuses.includes(status)) {
      setSelectedLeadId(null);
      setTab(status);
      toast.success(status === 'verloren' ? 'Lead als Verloren markiert' : 'Lead auf Später verschoben');
    } else {
      toast.success('Status aktualisiert');
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const chartDays = useMemo(() => {
    if (!chartData?.days) return [];
    return chartData.days.map(d => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    }));
  }, [chartData]);

  const t       = stats?.today   || {};
  const targets = stats?.targets || {};
  const mot     = stats?.motivation;
  const isConverted = !!selectedLead?.client_id;
  const fwInfo  = followupInfo(selectedLead?.next_followup_date);
  const selWS   = WEBSITE_STATUS_CFG[selectedLead?.website_status];
  const isMobile = useMobile();

  // ── Mobile Render ─────────────────────────────────────────────────────────

  if (isMobile) {
    const s = selectedLead ? (LEAD_STATUSES[selectedLead.status] || LEAD_STATUSES.neu) : null;

    return (
      <div style={{ minHeight: '100%', background: '#F5F5F7', display: 'flex', flexDirection: 'column' }}>

        {/* Mobile Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Flame size={18} color="#FF9500" /> Sales Engine
                </h1>
                <p style={{ fontSize: 11.5, color: '#86868B', margin: '2px 0 0' }}>
                  {t.calls_total || 0} Anrufe · {stats?.followups_due || 0} Follow-ups
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowExcelImport(true)} style={{ padding: '7px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: 'rgba(52,199,89,0.1)', color: '#1A8F40', border: 'none', cursor: 'pointer' }}>
                  <FileSpreadsheet size={14} />
                </button>
                <button onClick={() => setShowAddLead(true)} style={{ width: 34, height: 34, borderRadius: 9, fontSize: 12, fontWeight: 600, background: '#0071E3', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* KPI Strip – horizontaler Scroll */}
            <div style={{ overflowX: 'auto', margin: '0 -16px', scrollbarWidth: 'none' }}>
              <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', width: 'max-content' }}>
                {[
                  { icon: PhoneCall, label: 'Anrufe', value: t.calls_total || 0, color: '#0071E3', target: targets.daily_calls },
                  { icon: Phone,     label: 'Gespräche', value: t.calls_reached || 0, color: '#34C759', sub: `${t.connect_rate || 0}%` },
                  { icon: CheckCircle2, label: 'Abschlüsse', value: t.closings || 0, color: '#7C3AED', target: targets.daily_closings },
                  { icon: Clock,     label: 'Fällig', value: stats?.followups_due || 0, color: '#FF9500' },
                ].map(({ icon: Icon, label, value, color, target: tgt, sub }) => {
                  const pct = tgt ? Math.min(100, Math.round((value / tgt) * 100)) : null;
                  return (
                    <div key={label} style={{ background: '#F5F5F7', borderRadius: 12, padding: '10px 14px', minWidth: 110, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Icon size={13} color={color} />
                        <span style={{ fontSize: 11, color: '#86868B', fontWeight: 500 }}>{label}</span>
                        {sub && <span style={{ fontSize: 10, color: '#AEAEB2', marginLeft: 'auto' }}>{sub}</span>}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px' }}>{value}</div>
                      {pct !== null && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
                          </div>
                          <div style={{ fontSize: 9, color, fontWeight: 600, marginTop: 2 }}>{value}/{tgt} · {pct}%</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Motivation Banner */}
            {mot && (mot.type === 'urgent' || mot.type === 'warning') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, marginBottom: 10,
                background: mot.type === 'urgent' ? 'rgba(255,59,48,0.08)' : 'rgba(255,149,0,0.08)',
                border: `1px solid ${mot.type === 'urgent' ? 'rgba(255,59,48,0.2)' : 'rgba(255,149,0,0.2)'}`,
              }}>
                <Flame size={13} color={mot.type === 'urgent' ? '#FF3B30' : '#FF9500'} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: mot.type === 'urgent' ? '#FF3B30' : '#B35A00' }}>{mot.message}</span>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', overflowX: 'auto', gap: 0, scrollbarWidth: 'none', margin: '0 -16px', padding: '0 16px' }}>
              {TABS.map(tb => (
                <button key={tb.key} onClick={() => setTab(tb.key)} style={{
                  padding: '8px 12px', fontSize: 12.5, fontWeight: tab === tb.key ? 600 : 500,
                  color: tab === tb.key ? '#1D1D1F' : '#86868B', background: 'none', border: 'none',
                  borderBottom: tab === tb.key ? '2px solid #0071E3' : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  {tb.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#AEAEB2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 10, fontSize: 14, border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box', background: '#FAFAFA' }}
            />
          </div>
        </div>

        {/* Lead Count */}
        <div style={{ padding: '6px 16px', fontSize: 11, color: '#AEAEB2' }}>
          {leadsLoading ? 'Laden...' : `${leads.length} Lead${leads.length !== 1 ? 's' : ''}`}
        </div>

        {/* Lead List */}
        <div style={{ flex: 1 }}>
          {!leadsLoading && leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F' }}>Keine Leads</div>
              <div style={{ fontSize: 13, color: '#86868B', marginTop: 4 }}>
                {tab === 'due' ? 'Keine Follow-ups heute fällig' : 'Leads anlegen oder per Excel importieren'}
              </div>
            </div>
          ) : (
            leads.map(lead => {
              const ls = LEAD_STATUSES[lead.status] || LEAD_STATUSES.neu;
              const fu = followupInfo(lead.next_followup_date);
              const ws = WEBSITE_STATUS_CFG[lead.website_status];
              const pc = PRIORITY_CFG[lead.priority ?? 0];
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px', background: '#fff',
                    borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', marginBottom: 4 }}>{lead.company_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: ls.bg, color: ls.color }}>{ls.label}</span>
                      {ws && <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: ws.bg, color: ws.color }}>{ws.short}</span>}
                      {lead.city && <span style={{ fontSize: 11, color: '#AEAEB2' }}>{lead.city}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {fu && <span style={{ fontSize: 10.5, fontWeight: 700, color: fu.color }}>{fu.label}</span>}
                    <button
                      onClick={e => { e.stopPropagation(); handleCall(lead); }}
                      disabled={!lead.phone}
                      style={{
                        width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0,
                        background: lead.phone ? 'rgba(52,199,89,0.12)' : 'rgba(0,0,0,0.05)',
                        color: lead.phone ? '#34C759' : '#C7C7CC',
                        cursor: lead.phone ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Phone size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Mobile Bottom Sheet: Lead Detail ── */}
        {selectedLeadId && selectedLead && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setSelectedLeadId(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 110, backdropFilter: 'blur(2px)' }}
            />
            {/* Sheet */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              height: '88vh', background: '#fff',
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              zIndex: 120, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Sheet Handle + Header */}
              <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.12)', margin: '0 auto 12px' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.4px', marginBottom: 6 }}>
                      {selectedLead.company_name}
                    </div>
                    {/* Status + Priority */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {s && <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>}
                      {selWS && <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: selWS.bg, color: selWS.color }}>{selectedLead.website_status}</span>}
                      {selectedLead.city && <span style={{ fontSize: 12, color: '#86868B', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{selectedLead.city}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedLeadId(null)} style={{ width: 30, height: 30, borderRadius: 99, border: 'none', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={15} color="#636366" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

                {/* Contact chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  {selectedLead.contact_person && (
                    <div style={{ fontSize: 13.5, color: '#636366', fontWeight: 500 }}>{selectedLead.contact_person}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedLead.phone && (
                      <a href={`tel:${selectedLead.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(52,199,89,0.1)', color: '#1A8F40', textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>
                        <Phone size={14} /> {selectedLead.phone}
                      </a>
                    )}
                    {selectedLead.email && (
                      <a href={`mailto:${selectedLead.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,113,227,0.08)', color: '#0071E3', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                        <Mail size={14} /> E-Mail
                      </a>
                    )}
                    {selectedLead.domain && (
                      <a href={`https://${selectedLead.domain}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.05)', color: '#636366', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                        <Globe size={14} /> Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Status ändern */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Status</div>
                  <div style={{ overflowX: 'auto', margin: '0 -16px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    <div style={{ display: 'flex', gap: 7, padding: '0 16px 4px', width: 'max-content' }}>
                      {Object.entries(LEAD_STATUSES)
                        .filter(([k]) => k !== 'abgeschlossen')
                        .map(([k, v]) => {
                          const isActive = selectedLead.status === k;
                          return (
                            <button key={k} onClick={() => handleStatusChange(k)} style={{
                              padding: '7px 15px', borderRadius: 99, fontSize: 12.5, fontWeight: 600,
                              background: isActive ? v.color : v.bg,
                              color: isActive ? '#fff' : v.color,
                              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                              transition: 'all 0.15s',
                              boxShadow: isActive ? `0 2px 8px ${v.color}40` : 'none',
                            }}>{v.label}</button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Follow-up */}
                <div style={{ background: '#F5F5F7', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Follow-up</span>
                    <button onClick={() => setFollowupFor({ leadId: selectedLeadId })} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: 'rgba(0,113,227,0.1)', color: '#0071E3', border: 'none', cursor: 'pointer' }}>
                      {selectedLead.next_followup_date ? 'Ändern' : 'Planen'}
                    </button>
                  </div>
                  {selectedLead.next_followup_date ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CalendarDays size={15} color={fwInfo?.color || '#86868B'} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: fwInfo?.color || '#1D1D1F' }}>
                        {fmtDate(selectedLead.next_followup_date, { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      {fwInfo && <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: fwInfo.color + '18', color: fwInfo.color }}>{fwInfo.label}</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#AEAEB2' }}>Kein Follow-up geplant</div>
                  )}
                  {selectedLead.next_followup_note && <div style={{ fontSize: 12, color: '#86868B', marginTop: 4 }}>{selectedLead.next_followup_note}</div>}
                </div>

                {/* Notizen */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Notizen</div>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNotesBlur}
                    placeholder="Notizen zum Lead..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, border: '1.5px solid #E5E5EA', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Anrufe */}
                {leadCalls.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Anrufe ({leadCalls.length})</div>
                    <div style={{ background: '#F5F5F7', borderRadius: 12, overflow: 'hidden' }}>
                      {leadCalls.slice(0, 5).map((c, idx) => {
                        const o = OUTCOME_CFG[c.outcome] || OUTCOME_CFG.reached;
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: idx < Math.min(leadCalls.length, 5) - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1D1D1F' }}>{fmtDateTime(c.started_at)}</div>
                              {c.notes && <div style={{ fontSize: 11.5, color: '#86868B', marginTop: 2 }}>{c.notes}</div>}
                            </div>
                            <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: o.bg, color: o.color }}>{o.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Vollansicht */}
                <button
                  onClick={() => { setSelectedLeadId(null); navigate(`/sales/leads/${selectedLeadId}`); }}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'rgba(0,0,0,0.05)', color: '#636366', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  Vollansicht öffnen <ChevronRight size={15} />
                </button>
              </div>

              {/* Sheet Footer — sticky Actions */}
              <div style={{
                padding: '12px 16px',
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff',
                display: 'flex', gap: 10, flexShrink: 0,
              }}>
                <button
                  onClick={() => {
                    const hasWebsite = selectedLead.website_status ? selectedLead.website_status !== 'Keine Website' : null;
                    navigate('/wizard', { state: { prefill: { company_name: selectedLead.company_name || '', contact_person: selectedLead.contact_person || '', email: selectedLead.email || '', phone: selectedLead.phone || '', industry: selectedLead.industry || '', has_website: hasWebsite, website_url: selectedLead.domain ? (selectedLead.domain.startsWith('http') ? selectedLead.domain : `https://${selectedLead.domain}`) : '', domain_url: selectedLead.domain || '' } } });
                  }}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(124,58,237,0.1)', color: '#7C3AED', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  <Sparkles size={15} /> Projekt
                </button>
                <button
                  onClick={() => handleCall(selectedLead)}
                  disabled={!selectedLead.phone}
                  style={{ flex: 2, padding: '13px', borderRadius: 12, background: selectedLead.phone ? '#34C759' : '#E5E5EA', color: selectedLead.phone ? '#fff' : '#AEAEB2', border: 'none', cursor: selectedLead.phone ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Phone size={16} /> Anrufen
                </button>
              </div>
            </div>
          </>
        )}

        {/* Overlays */}
        {activeCall && <CallInProgressSheet callId={activeCall.callId} clientName={activeCall.clientName} phone={activeCall.phone} onEnd={handleCallEnd} onClose={() => setActiveCall(null)} />}
        {followupFor && <FollowupScheduler leadId={followupFor.leadId} currentDate={selectedLead?.next_followup_date} onSave={handleFollowupSave} onClose={() => setFollowupFor(null)} />}
        {showAddLead && <CreateLeadModal onClose={() => setShowAddLead(false)} onCreate={data => createLeadMut.mutate(data)} isCreating={createLeadMut.isPending} />}
        {showExcelImport && <ExcelImportModal onClose={() => setShowExcelImport(false)} onImport={handleImport} isImporting={importLeadsMut.isPending} />}
        {showTargets && stats?.targets && <SalesTargetModal targets={stats.targets} onSave={data => updateTargetsMut.mutate(data)} onClose={() => setShowTargets(false)} isPending={updateTargetsMut.isPending} />}
      </div>
    );
  }

  // ── Desktop Render ────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', padding: '16px 22px',
      boxSizing: 'border-box', gap: 12, overflow: 'hidden',
    }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {/* Title */}
        <div style={{ flexShrink: 0 }}>
          <h1 style={{
            fontSize: 20, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px',
            margin: 0, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Flame size={18} color="#FF9500" /> Sales Engine
          </h1>
          <p style={{ fontSize: 11.5, color: '#86868B', margin: '2px 0 0' }}>
            {t.calls_total || 0} Anrufe · {t.calls_reached || 0} Gespräche · {stats?.followups_due || 0} Follow-ups
            {stats?.demos_active > 0 && <span style={{ color: '#34C759', fontWeight: 600 }}> · {stats.demos_active} Demos</span>}
          </p>
        </div>

        {/* KPI cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 220px))', gap: 10, flex: 1 }}>
          <KpiCard icon={PhoneCall}    label="Anrufe heute"      value={t.calls_total || 0}   color="#0071E3" target={targets.daily_calls} />
          <KpiCard icon={Phone}        label="Gespräche"          value={t.calls_reached || 0} color="#34C759" sub={`${t.connect_rate || 0}%`} target={targets.daily_connects} />
          <KpiCard icon={CheckCircle2} label="Abschlüsse"         value={t.closings || 0}      color="#7C3AED" target={targets.daily_closings} />
          <KpiCard icon={Clock}        label="Follow-ups fällig"  value={stats?.followups_due || 0} color="#FF9500" />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={() => setShowExcelImport(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9,
              fontSize: 12, fontWeight: 600, background: 'rgba(52,199,89,0.1)', color: '#1A8F40',
              border: '1px solid rgba(52,199,89,0.2)', cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button
            onClick={() => setShowAddLead(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9,
              fontSize: 12, fontWeight: 600, background: '#0071E3', color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Lead
          </button>
          <button
            onClick={() => setShowTargets(true)}
            title="Ziele einstellen"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(0,0,0,0.05)', color: '#636366',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* ── Motivation banner ── */}
      {mot && (mot.type === 'warning' || mot.type === 'urgent') && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: mot.type === 'urgent' ? 'rgba(255,59,48,0.08)' : 'rgba(255,149,0,0.08)',
          border: `1px solid ${mot.type === 'urgent' ? 'rgba(255,59,48,0.2)' : 'rgba(255,149,0,0.2)'}`,
        }}>
          {mot.type === 'urgent' ? <Flame size={14} color="#FF3B30" /> : <AlertCircle size={14} color="#FF9500" />}
          <span style={{ fontSize: 13, fontWeight: 600, color: mot.type === 'urgent' ? '#FF3B30' : '#B35A00' }}>
            {mot.message}
          </span>
        </div>
      )}
      {mot && (mot.type === 'success' || mot.type === 'excellent') && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)',
        }}>
          <CheckCircle2 size={14} color="#34C759" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A8F40' }}>{mot.message}</span>
        </div>
      )}

      {/* ── 3-Panel Grid ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '380px 1fr 300px', gap: 14,
      }}>

        {/* ════ LEFT: Lead List ════ */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* List header */}
          <div style={{ padding: '12px 14px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto', marginBottom: 10 }}>
              {TABS.map(t => (
                <button
                  key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    padding: '6px 10px', fontSize: 12, fontWeight: tab === t.key ? 600 : 500,
                    color: tab === t.key ? '#1D1D1F' : '#86868B', background: 'none', border: 'none',
                    borderBottom: tab === t.key ? '2px solid #0071E3' : '2px solid transparent',
                    cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} color="#AEAEB2" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Suchen..."
                style={{
                  width: '100%', padding: '7px 9px 7px 28px', borderRadius: 8,
                  fontSize: 12.5, border: '1.5px solid #E5E5EA', outline: 'none',
                  boxSizing: 'border-box', background: '#FAFAFA',
                }}
              />
            </div>
          </div>

          {/* Lead count */}
          <div style={{ padding: '6px 14px', fontSize: 11, color: '#AEAEB2', flexShrink: 0, borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
            {leadsLoading ? 'Laden...' : `${leads.length} Lead${leads.length !== 1 ? 's' : ''}`}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!leadsLoading && leads.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>📭</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>Keine Leads</div>
                <div style={{ fontSize: 12, color: '#86868B', marginTop: 2 }}>
                  {tab === 'due' ? 'Keine Follow-ups heute fällig' : 'Leads anlegen oder per Excel importieren'}
                </div>
              </div>
            ) : (
              leads.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  isSelected={lead.id === selectedLeadId}
                  onClick={() => setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id)}
                  onCall={handleCall}
                />
              ))
            )}
          </div>
        </div>

        {/* ════ MIDDLE: Lead Detail ════ */}
        {!selectedLead ? <EmptyDetail /> : (
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Detail header */}
            <div style={{
              padding: '16px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.4px', marginBottom: 4 }}>
                    {selectedLead.company_name}
                  </div>
                  {/* Contact chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {selectedLead.contact_person && (
                      <span style={{ fontSize: 12, color: '#636366', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {selectedLead.contact_person}
                      </span>
                    )}
                    {selectedLead.city && (
                      <span style={{ fontSize: 12, color: '#86868B', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={11} />{selectedLead.city}
                      </span>
                    )}
                    {selectedLead.phone && (
                      <a href={`tel:${selectedLead.phone}`} style={{ fontSize: 12, color: '#0071E3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Phone size={11} />{selectedLead.phone}
                      </a>
                    )}
                    {selectedLead.email && (
                      <a href={`mailto:${selectedLead.email}`} style={{ fontSize: 12, color: '#0071E3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Mail size={11} />{selectedLead.email}
                      </a>
                    )}
                    {selectedLead.domain && (
                      <a href={`https://${selectedLead.domain}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#0071E3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Globe size={11} />{selectedLead.domain} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {/* Convert button */}
                  {!isConverted && (
                    <button
                      onClick={() => {
                        if (window.confirm(`"${selectedLead.company_name}" als Kunden anlegen?`)) {
                          convertMut.mutate(selectedLeadId);
                        }
                      }}
                      disabled={convertMut.isPending}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8,
                        fontSize: 11.5, fontWeight: 600, background: 'rgba(52,199,89,0.1)', color: '#1A8F40',
                        border: '1px solid rgba(52,199,89,0.25)', cursor: 'pointer',
                      }}
                    >
                      <UserCheck size={12} /> Zu Kunde
                    </button>
                  )}
                  {isConverted && (
                    <span style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                      background: 'rgba(52,199,89,0.1)', color: '#1A8F40',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <UserCheck size={12} /> Kunde
                    </span>
                  )}

                  {/* Neues Projekt aus Lead erstellen */}
                  <button
                    onClick={() => {
                      const hasWebsite = selectedLead.website_status
                        ? selectedLead.website_status !== 'Keine Website'
                        : null;
                      navigate('/wizard', {
                        state: {
                          prefill: {
                            company_name:   selectedLead.company_name  || '',
                            contact_person: selectedLead.contact_person || '',
                            email:          selectedLead.email          || '',
                            phone:          selectedLead.phone          || '',
                            industry:       selectedLead.industry       || '',
                            has_website:    hasWebsite,
                            website_url:    selectedLead.domain
                              ? (selectedLead.domain.startsWith('http') ? selectedLead.domain : `https://${selectedLead.domain}`)
                              : '',
                            domain_url:     selectedLead.domain || '',
                          },
                        },
                      });
                    }}
                    title="Neues Projekt für diesen Lead erstellen"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8,
                      fontSize: 11.5, fontWeight: 600, background: 'rgba(124,58,237,0.1)', color: '#7C3AED',
                      border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer',
                    }}
                  >
                    <Sparkles size={12} /> Projekt
                  </button>

                  {/* Full detail page link */}
                  <button
                    onClick={() => navigate(`/sales/leads/${selectedLeadId}`)}
                    title="Vollansicht öffnen"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                      background: 'transparent', color: '#86868B', cursor: 'pointer',
                    }}
                  >
                    <ArrowRight size={14} />
                  </button>

                  {/* Call button */}
                  <button
                    onClick={() => handleCall(selectedLead)}
                    disabled={!selectedLead.phone}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                      fontSize: 13, fontWeight: 600,
                      background: selectedLead.phone ? '#34C759' : '#E5E5EA',
                      color: selectedLead.phone ? '#fff' : '#AEAEB2',
                      border: 'none', cursor: selectedLead.phone ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Phone size={13} /> Anrufen
                  </button>
                </div>
              </div>

              {/* Status / Priority / Website status row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Status dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowStatusMenu(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99,
                      fontSize: 11.5, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: (LEAD_STATUSES[selectedLead.status] || LEAD_STATUSES.neu).bg,
                      color: (LEAD_STATUSES[selectedLead.status] || LEAD_STATUSES.neu).color,
                    }}
                  >
                    {(LEAD_STATUSES[selectedLead.status] || LEAD_STATUSES.neu).label}
                    <ChevronDown size={11} />
                  </button>
                  {showStatusMenu && (
                    <div style={{
                      position: 'absolute', left: 0, top: '100%', marginTop: 4, background: '#fff',
                      borderRadius: 12, padding: 5, minWidth: 160, zIndex: 50,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.08)',
                    }}>
                      {Object.entries(LEAD_STATUSES)
                        .filter(([k]) => k !== 'abgeschlossen')
                        .map(([k, v]) => (
                          <button key={k} onClick={() => handleStatusChange(k)} style={{
                            display: 'block', width: '100%', padding: '7px 10px', fontSize: 12.5, fontWeight: 500,
                            color: selectedLead.status === k ? v.color : '#1D1D1F',
                            background: selectedLead.status === k ? v.bg : 'none',
                            border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                          }}>
                            {v.label}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <select
                  value={selectedLead.priority ?? 0}
                  onChange={e => updateLeadMut.mutate({ id: selectedLeadId, data: { priority: Number(e.target.value) } })}
                  style={{
                    padding: '4px 8px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    border: '1.5px solid #E5E5EA', outline: 'none', cursor: 'pointer',
                    color: PRIORITY_CFG[selectedLead.priority ?? 0].color,
                    background: '#fff',
                  }}
                >
                  <option value={0}>Normal</option>
                  <option value={1}>Hoch</option>
                  <option value={2}>Dringend</option>
                </select>

                {/* Website status */}
                {selWS && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    background: selWS.bg, color: selWS.color,
                  }}>
                    {selectedLead.website_status}
                  </span>
                )}

                {/* Industry */}
                {selectedLead.industry && (
                  <span style={{ fontSize: 11.5, color: '#86868B', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Building2 size={11} /> {selectedLead.industry}
                  </span>
                )}
              </div>
            </div>

            {/* Detail body — 2 columns */}
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 280px', overflow: 'hidden' }}>

              {/* LEFT: Notes + Follow-up + Deal */}
              <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, borderRight: '1px solid rgba(0,0,0,0.06)' }}>

                {/* Follow-up */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Follow-up
                    </span>
                    <button
                      onClick={() => setFollowupFor({ leadId: selectedLeadId })}
                      style={{
                        padding: '3px 9px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                        background: 'rgba(0,113,227,0.1)', color: '#0071E3', border: 'none', cursor: 'pointer',
                      }}
                    >
                      {selectedLead.next_followup_date ? 'Ändern' : 'Planen'}
                    </button>
                  </div>
                  {selectedLead.next_followup_date ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CalendarDays size={15} color={fwInfo?.color || '#86868B'} />
                      <div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: fwInfo?.color || '#1D1D1F' }}>
                          {fmtDate(selectedLead.next_followup_date, { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        {fwInfo && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
                            background: fwInfo.color + '18', color: fwInfo.color,
                          }}>{fwInfo.label}</span>
                        )}
                        {selectedLead.next_followup_note && (
                          <div style={{ fontSize: 12, color: '#86868B', marginTop: 3 }}>{selectedLead.next_followup_note}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: '#AEAEB2' }}>Kein Follow-up geplant</div>
                  )}
                </div>

                {/* Notes */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Notizen
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Notizen zum Lead..."
                    style={{
                      width: '100%', minHeight: 140, padding: '10px 12px', borderRadius: 10,
                      fontSize: 13, border: '1.5px solid #E5E5EA', outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                      lineHeight: 1.5, color: '#1D1D1F',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#0071E3'; }}
                    onBlurCapture={e => { e.target.style.borderColor = '#E5E5EA'; }}
                  />
                </div>

                {/* Details grid */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Deal value */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#AEAEB2', display: 'block', marginBottom: 4 }}>Deal-Wert</label>
                      <div style={{ position: 'relative' }}>
                        <Euro size={12} color="#86868B" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          type="number" min={0} step={100}
                          defaultValue={selectedLead.deal_value || ''}
                          key={`dv-${selectedLeadId}`}
                          onBlur={e => {
                            const v = parseFloat(e.target.value) || null;
                            if (v !== selectedLead.deal_value) updateLeadMut.mutate({ id: selectedLeadId, data: { deal_value: v } });
                          }}
                          placeholder="0"
                          style={{ width: '100%', padding: '7px 8px 7px 24px', borderRadius: 8, fontSize: 12.5, border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    {/* Kontaktperson — immer editierbar */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#AEAEB2', display: 'block', marginBottom: 4 }}>Kontaktperson</label>
                      <input
                        key={`cp-${selectedLeadId}`}
                        defaultValue={selectedLead.contact_person || ''}
                        onBlur={e => { if (e.target.value !== (selectedLead.contact_person || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { contact_person: e.target.value } }); }}
                        placeholder="Max Mustermann"
                        style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Phone (editable for non-converted) */}
                    {!isConverted && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#AEAEB2', display: 'block', marginBottom: 4 }}>Telefon</label>
                        <input
                          key={`ph-${selectedLeadId}`}
                          defaultValue={selectedLead.phone || ''}
                          onBlur={e => { if (e.target.value !== (selectedLead.phone || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { phone: e.target.value } }); }}
                          placeholder="0711 123456"
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    {!isConverted && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#AEAEB2', display: 'block', marginBottom: 4 }}>E-Mail</label>
                        <input
                          key={`em-${selectedLeadId}`}
                          defaultValue={selectedLead.email || ''}
                          onBlur={e => { if (e.target.value !== (selectedLead.email || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { email: e.target.value } }); }}
                          placeholder="info@firma.de"
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    {!isConverted && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#AEAEB2', display: 'block', marginBottom: 4 }}>Domain</label>
                        <input
                          key={`dm-${selectedLeadId}`}
                          defaultValue={selectedLead.domain || ''}
                          onBlur={e => { if (e.target.value !== (selectedLead.domain || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { domain: e.target.value } }); }}
                          placeholder="firma.de"
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Call history */}
              <div style={{ overflowY: 'auto', padding: '16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anrufe</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#86868B',
                    background: '#F2F2F7', padding: '2px 7px', borderRadius: 99,
                  }}>{leadCalls.length}</span>
                </div>

                {leadCalls.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: '#AEAEB2' }}>
                    <Phone size={22} strokeWidth={1.5} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 12.5 }}>Noch keine Anrufe</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {leadCalls.map(c => {
                      const o = OUTCOME_CFG[c.outcome] || OUTCOME_CFG.reached;
                      return (
                        <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1D1D1F' }}>
                              {fmtDateTime(c.started_at)}
                            </span>
                            <span style={{
                              padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                              background: o.bg, color: o.color,
                            }}>{o.label}</span>
                          </div>
                          {c.duration_sec && (
                            <div style={{ fontSize: 11, color: '#AEAEB2' }}>{fmtDuration(c.duration_sec)}</div>
                          )}
                          {c.notes && (
                            <div style={{ fontSize: 11.5, color: '#636366', marginTop: 4, lineHeight: 1.4 }}>{c.notes}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ RIGHT: Stats ════ */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto',
        }}>
          {/* Chart */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '14px 16px 8px',
            border: '1px solid rgba(0,0,0,0.06)', flexShrink: 0,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1D1D1F', marginBottom: 12, letterSpacing: '-0.1px' }}>
              Anrufe / Tag
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartDays} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#AEAEB2' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#AEAEB2' }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', fontSize: 11.5, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 600, color: '#1D1D1F' }}
                />
                <Bar dataKey="reached"     name="Erreicht"       stackId="a" fill="#34C759" radius={[0,0,0,0]} />
                <Bar dataKey="not_reached" name="Nicht erreicht" stackId="a" fill="#E5E5EA" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent calls */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: 16,
            border: '1px solid rgba(0,0,0,0.06)', flex: 1,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1D1D1F', marginBottom: 12, letterSpacing: '-0.1px' }}>
              Letzte Anrufe
            </div>
            {recentCalls.length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#AEAEB2', textAlign: 'center', padding: '20px 0' }}>
                Noch keine Anrufe heute
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {recentCalls.map(c => {
                  const o = OUTCOME_CFG[c.outcome] || OUTCOME_CFG.reached;
                  return (
                    <div
                      key={c.id}
                      onClick={() => c.lead_id && setSelectedLeadId(c.lead_id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        cursor: c.lead_id ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12.5, fontWeight: 600, color: '#1D1D1F',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{c.company_name}</div>
                        <div style={{ fontSize: 10.5, color: '#AEAEB2' }}>{relTime(c.started_at)}</div>
                      </div>
                      <span style={{
                        padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                        background: o.bg, color: o.color, flexShrink: 0,
                      }}>{o.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Overlays ── */}
      {activeCall && (
        <CallInProgressSheet
          callId={activeCall.callId}
          clientName={activeCall.clientName}
          phone={activeCall.phone}
          onEnd={handleCallEnd}
          onClose={() => setActiveCall(null)}
        />
      )}
      {followupFor && (
        <FollowupScheduler
          leadId={followupFor.leadId}
          currentDate={selectedLead?.next_followup_date}
          onSave={handleFollowupSave}
          onClose={() => setFollowupFor(null)}
        />
      )}
      {showAddLead && (
        <CreateLeadModal
          onClose={() => setShowAddLead(false)}
          onCreate={data => createLeadMut.mutate(data)}
          isCreating={createLeadMut.isPending}
        />
      )}
      {showExcelImport && (
        <ExcelImportModal
          onClose={() => setShowExcelImport(false)}
          onImport={handleImport}
          isImporting={importLeadsMut.isPending}
        />
      )}
      {showTargets && stats?.targets && (
        <SalesTargetModal
          targets={stats.targets}
          onSave={data => updateTargetsMut.mutate(data)}
          onClose={() => setShowTargets(false)}
          isPending={updateTargetsMut.isPending}
        />
      )}
    </div>
  );
}
