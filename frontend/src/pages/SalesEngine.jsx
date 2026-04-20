import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Phone, Search, Flame, Settings, AlertCircle, CheckCircle2, Plus, Clock,
  PhoneCall, FileSpreadsheet, Building2, Mail, Globe, MapPin, ExternalLink,
  ChevronDown, CalendarDays, Euro, UserCheck, ArrowRight, MousePointerClick,
  Sparkles, X, ChevronRight, Users, Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../api/sales';
import { teamApi } from '../api/team';
import { LEAD_STATUSES } from '../components/sales/LeadStatusBadge';
import CallInProgressSheet from '../components/sales/CallInProgressSheet';
import FollowupScheduler from '../components/sales/FollowupScheduler';
import LeadEmailModal from '../components/sales/LeadEmailModal';
import SalesTargetModal from '../components/sales/SalesTargetModal';
import ExcelImportModal from '../components/sales/ExcelImportModal';
import CreateLeadModal from '../components/sales/CreateLeadModal';
import ScreenshotImportModal from '../components/sales/ScreenshotImportModal';
import { useMobile } from '../hooks/useMobile';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

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

function followupInfo(dateStr, lastCallAt) {
  if (!dateStr) return null;
  const berlinDay = d => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(d));
    const y = +parts.find(p => p.type === 'year').value;
    const m = +parts.find(p => p.type === 'month').value;
    const dd = +parts.find(p => p.type === 'day').value;
    return Date.UTC(y, m - 1, dd);
  };
  const today = berlinDay(Date.now());
  const due   = berlinDay(dateStr);
  const diff  = Math.round((due - today) / 86400000);
  if (diff < 0 && lastCallAt && berlinDay(lastCallAt) >= due) {
    return { color: '#FF9500', label: 'Heute', urgent: true };
  }
  if (diff < 0) return { color: '#FF3B30', label: `${Math.abs(diff)}T überfällig`, urgent: true };
  if (diff === 0) return { color: '#FF9500', label: 'Heute', urgent: true };
  if (diff <= 2) return { color: '#FF9500', label: `in ${diff}T`, urgent: false };
  return { color: '#34C759', label: `in ${diff}T`, urgent: false };
}

const OUTCOME_CFG = {
  reached:     { label: 'Erreicht',       color: '#34C759', bg: 'rgba(52,199,89,0.08)' },
  not_reached: { label: 'Nicht erreicht', color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
  voicemail:   { label: 'Mailbox',        color: '#FF9500', bg: 'rgba(255,149,0,0.08)' },
  callback:    { label: 'Rückruf',        color: 'var(--color-blue)', bg: 'rgba(0,122,255,0.08)' },
};

const WEBSITE_STATUS_CFG = {
  'Keine Website':              { color: '#FF3B30', bg: 'rgba(255,59,48,0.08)',   short: 'Keine Website' },
  'Website Fehler':             { color: '#FF3B30', bg: 'rgba(255,59,48,0.08)',   short: 'Fehler' },
  'Alte Website + nicht Resp.': { color: '#FF9500', bg: 'rgba(255,149,0,0.08)',   short: 'Nicht Resp.' },
  'Veraltete Website':          { color: '#FF9500', bg: 'rgba(255,149,0,0.08)',   short: 'Veraltet' },
  'Website/ Branchenbuch':      { color: '#B8860B', bg: 'rgba(255,214,10,0.1)',   short: 'Branchenbuch' },
};

const PRIORITY_CFG = {
  0: { color: 'var(--color-text-tertiary)', label: 'Normal', dot: 'var(--color-text-tertiary)' },
  1: { color: '#FF9500', label: 'Hoch',   dot: '#FF9500' },
  2: { color: '#FF3B30', label: 'Dringend', dot: '#FF3B30' },
};

const TAB_GROUPS = [
  {
    label: 'Zeitraum',
    tabs: [
      { key: 'due',       label: 'Heute' },
      { key: 'tomorrow',  label: 'Morgen' },
      { key: 'week',      label: 'Diese Woche' },
    ],
  },
  {
    label: 'Übersicht',
    tabs: [
      { key: 'neu',       label: 'Neu' },
      { key: 'all',       label: 'Alle' },
    ],
  },
  {
    label: 'Archiv',
    tabs: [
      { key: 'verloren',  label: 'Verloren' },
      { key: 'spaeter',   label: 'Später' },
    ],
  },
  {
    label: 'CRM',
    tabs: [
      { key: 'kunden',    label: 'Kunden' },
    ],
  },
];

// Flat list for easy lookup
const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color, target }) {
  const { c } = useTheme();
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
  return (
    <div style={{
      background: c.card, borderRadius: 12, padding: '12px 14px',
      border: `0.5px solid ${c.borderSubtle}`, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: c.textSecondary, marginTop: 2 }}>{label}</div>
        </div>
        {sub && <div style={{ fontSize: 11, color: c.textTertiary, marginLeft: 'auto', textAlign: 'right' }}>{sub}</div>}
      </div>
      {pct !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: c.textSecondary }}>{value}/{target}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color }}>{pct}%</span>
          </div>
          <div style={{ height: 3, background: c.cardSecondary, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function LeadRow({ lead, isSelected, onClick, onCall, showOwner = false }) {
  const { c } = useTheme();
  const fu = followupInfo(lead.next_followup_date, lead.last_call_at);
  const ws = WEBSITE_STATUS_CFG[lead.website_status];
  const pc = PRIORITY_CFG[lead.priority ?? 0];
  const s  = LEAD_STATUSES[lead.status] || LEAD_STATUSES.neu;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderBottom: `1px solid ${c.borderSubtle}`, cursor: 'pointer',
        background: isSelected ? c.blueLight : 'transparent',
        borderLeft: isSelected ? `3px solid ${c.blue}` : '3px solid transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = c.cardSecondary; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Priority dot + optional owner ring */}
      <div style={{ position: 'relative', width: 7, height: 7, flexShrink: 0, marginTop: 1 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: pc.dot }} />
        {showOwner && lead.owner_color && (
          <div title={lead.owner_name} style={{
            position: 'absolute', top: -4, left: -4, width: 14, height: 14, borderRadius: '50%',
            border: `2px solid ${lead.owner_color}`, boxSizing: 'border-box',
          }} />
        )}
      </div>

      {/* Text block — nimmt den ganzen verfügbaren Platz */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Zeile 1: Firmenname — volle Breite */}
        <div style={{ fontSize: 13, fontWeight: 600, color: c.text, letterSpacing: '-0.1px', marginBottom: 3 }}>
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
            <span style={{ fontSize: 10.5, color: c.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[lead.contact_person, lead.city].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>

      {/* Rechts: Follow-up + Anzahl + Anruf-Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        {fu ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: fu.color, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
            {lead.next_followup_type === 'email'
              ? <Mail size={9} />
              : null}
            {fu.label}
          </span>
        ) : <span style={{ fontSize: 10, color: c.border }}>—</span>}
        <span style={{ fontSize: 10, color: c.textTertiary }}>
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
          background: lead.phone ? 'rgba(52,199,89,0.12)' : c.inputBg,
          color: lead.phone ? '#34C759' : c.textTertiary,
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
  const { c } = useTheme();
  return (
    <div style={{
      background: c.card, borderRadius: 12, border: `0.5px solid ${c.borderSubtle}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 12, color: c.textSecondary,
    }}>
      <MousePointerClick size={36} strokeWidth={1.5} />
      <div style={{ fontSize: 14, fontWeight: 600, color: c.textSecondary }}>Lead auswählen</div>
      <div style={{ fontSize: 12.5, color: c.textTertiary }}>Klicke einen Lead in der Liste an</div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function SalesEngine() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { c, isDark } = useTheme();
  const { user } = useAuth();

  // UI state
  const [tab, setTab]                       = useState('due');
  const [search, setSearch]                 = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showAddLead, setShowAddLead]       = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showTargets, setShowTargets]       = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [viewOwnerId, setViewOwnerId]       = useState(null); // null = me
  const [activeCall, setActiveCall]         = useState(null);
  const [followupFor, setFollowupFor]       = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Detail-panel local state
  const [notes, setNotes]         = useState('');
  const prevLeadIdRef             = useRef(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  // Owner param for API calls
  const ownerParam = useMemo(() => {
    if (viewOwnerId === 'all') return 'all';
    if (viewOwnerId) return String(viewOwnerId);
    return undefined; // default = me (server-side)
  }, [viewOwnerId]);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['sales-stats', ownerParam],
    queryFn: () => salesApi.stats(ownerParam ? { owner_id: ownerParam } : {}),
    refetchInterval: 30000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['sales-chart', ownerParam],
    queryFn: () => salesApi.chart(14, ownerParam ? { owner_id: ownerParam } : {}),
  });

  const { data: recentCalls = [] } = useQuery({
    queryKey: ['sales-calls-recent'],
    queryFn: () => salesApi.listCalls({ limit: 8 }),
  });

  const isKundenTab = tab === 'kunden';

  const leadsParams = useMemo(() => {
    if (isKundenTab) return null;
    const p = {};
    if (ownerParam) p.owner_id = ownerParam;
    if (tab === 'due') p.due_today = '1';
    else if (tab === 'tomorrow') p.due_tomorrow = '1';
    else if (tab === 'week') p.due_week = '1';
    else if (tab !== 'all') p.status = tab;
    if (search) p.search = search;
    return p;
  }, [tab, search, isKundenTab, ownerParam]);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['sales-leads', leadsParams],
    queryFn: () => salesApi.listLeads(leadsParams),
    enabled: !isKundenTab,
  });

  const { data: salesClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['sales-clients', search],
    queryFn: () => salesApi.listSalesClients(search ? { search } : {}),
    enabled: isKundenTab,
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

  function handleFollowupSave(leadId, date, note, type) {
    updateLeadMut.mutate({ id: leadId, data: { next_followup_date: date, next_followup_note: note, next_followup_type: type || 'anruf' } });
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
      toast.success(status === 'verloren' ? 'Lead als Verloren markiert' : 'Lead auf Später verschoben');
    } else {
      toast.success('Status aktualisiert');
    }
  }

  async function handleClientCall(client) {
    try {
      const call = await logCallMut.mutateAsync({ client_id: client.id });
      window.open('tel:' + (client.phone || ''), '_self');
      setActiveCall({ callId: call.id, clientName: client.company_name, phone: client.phone });
    } catch { toast.error('Fehler beim Starten des Anrufs'); }
  }

  // Unified list data for rendering
  const listItems = isKundenTab ? salesClients : leads;
  const listLoading = isKundenTab ? clientsLoading : leadsLoading;

  const emptyMessage = useMemo(() => {
    switch (tab) {
      case 'due':      return 'Keine Follow-ups heute fällig';
      case 'tomorrow': return 'Keine Follow-ups morgen fällig';
      case 'week':     return 'Keine Follow-ups diese Woche';
      case 'kunden':   return 'Noch keine Kunden angelegt';
      case 'verloren': return 'Keine verlorenen Leads';
      case 'spaeter':  return 'Keine Leads auf Später';
      default:         return 'Leads anlegen oder per Excel importieren';
    }
  }, [tab]);

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
  const fwInfo  = followupInfo(selectedLead?.next_followup_date, selectedLead?.last_call_at);
  const selWS   = WEBSITE_STATUS_CFG[selectedLead?.website_status];
  const isMobile = useMobile();

  // Viewing another user's pipeline?
  const viewingOther = viewOwnerId && viewOwnerId !== 'all' && viewOwnerId !== user?.id;
  const viewingAll = viewOwnerId === 'all';
  const viewedMember = viewingOther ? teamMembers.find(m => m.id === viewOwnerId) : null;

  function getInitials(name, email) {
    if (name) {
      const parts = name.trim().split(/\s+/);
      return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
    }
    return (email || '?')[0].toUpperCase();
  }

  function renderAvatarSwitcher(compact = false) {
    if (teamMembers.length <= 1) return null;
    const size = compact ? 24 : 28;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 6, padding: compact ? '0 0 8px' : '0 0 10px' }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 2 }}>
          Pipeline
        </span>
        {/* "Ich" avatar */}
        {(() => {
          const isActive = !viewOwnerId;
          return (
            <button
              key="me"
              onClick={() => { setViewOwnerId(null); setSelectedLeadId(null); }}
              title="Meine Pipeline"
              style={{
                width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: isActive ? c.blue : (user?.color || '#6366f1'),
                color: '#fff', fontSize: compact ? 10 : 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                outline: isActive ? `2px solid ${c.blue}` : '2px solid transparent',
                outlineOffset: 2, transition: 'all 0.15s',
                opacity: isActive ? 1 : 0.6,
              }}
            >
              {getInitials(user?.name, user?.email)}
            </button>
          );
        })()}
        {/* Team members */}
        {teamMembers
          .filter(m => m.id !== user?.id)
          .map(m => {
            const isActive = viewOwnerId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { setViewOwnerId(m.id); setSelectedLeadId(null); }}
                title={`${m.name || m.email}'s Pipeline`}
                style={{
                  width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: isActive ? c.blue : (m.color || '#8B5CF6'),
                  color: '#fff', fontSize: compact ? 10 : 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  outline: isActive ? `2px solid ${c.blue}` : '2px solid transparent',
                  outlineOffset: 2, transition: 'all 0.15s',
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                {getInitials(m.name, m.email)}
              </button>
            );
          })}
        {/* "Alle" button */}
        <button
          onClick={() => { setViewOwnerId('all'); setSelectedLeadId(null); }}
          title="Alle Pipelines"
          style={{
            width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: viewingAll ? c.blue : c.cardSecondary,
            color: viewingAll ? '#fff' : c.textSecondary,
            fontSize: compact ? 10 : 11, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: viewingAll ? `2px solid ${c.blue}` : '2px solid transparent',
            outlineOffset: 2, transition: 'all 0.15s',
            opacity: viewingAll ? 1 : 0.6,
          }}
        >
          <Users size={compact ? 11 : 13} />
        </button>
      </div>
    );
  }

  // ── Tab renderer (shared) ──────────────────────────────────────────────────

  function renderGroupedTabs(compact = false) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TAB_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ display: 'flex', alignItems: 'center' }}>
            {gi > 0 && (
              <div style={{
                width: 1, height: 16, background: c.border, margin: '0 6px', flexShrink: 0, opacity: 0.5,
              }} />
            )}
            {group.tabs.map(tb => {
              const isActive = tab === tb.key;
              return (
                <button
                  key={tb.key}
                  onClick={() => { setTab(tb.key); setSelectedLeadId(null); }}
                  style={{
                    padding: compact ? '5px 8px' : '6px 10px',
                    fontSize: compact ? 11.5 : 12,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? c.text : c.textSecondary,
                    background: 'none', border: 'none',
                    borderBottom: isActive ? `2px solid ${c.blue}` : '2px solid transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'color 0.15s',
                  }}
                >
                  {tb.key === 'kunden' && <Users size={compact ? 11 : 12} style={{ marginRight: 3, verticalAlign: '-1px' }} />}
                  {tb.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  function ClientRow({ client, onClick, onCall }) {
    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderBottom: `1px solid ${c.borderSubtle}`, cursor: 'pointer',
          borderLeft: '3px solid transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = c.cardSecondary; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: isDark ? 'rgba(10,132,255,0.12)' : 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={13} color={c.blue} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.text, letterSpacing: '-0.1px', marginBottom: 3 }}>
            {client.company_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
            {client.contact_person && (
              <span style={{ fontSize: 10.5, color: c.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {client.contact_person}
              </span>
            )}
            {client.active_projects > 0 && (
              <span style={{
                padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                background: 'rgba(52,199,89,0.1)', color: '#34C759',
              }}>
                {client.active_projects} Projekt{client.active_projects !== 1 ? 'e' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          {client.last_call_at ? (
            <span style={{ fontSize: 10, color: c.textTertiary }}>{relTime(client.last_call_at)}</span>
          ) : <span style={{ fontSize: 10, color: c.border }}>—</span>}
          <span style={{ fontSize: 10, color: c.textTertiary }}>
            {client.total_calls ? `${client.total_calls}x angerufen` : 'noch kein Anruf'}
          </span>
        </div>

        {/* Call button */}
        <button
          onClick={e => { e.stopPropagation(); onCall(client); }}
          disabled={!client.phone}
          title={client.phone || 'Keine Nummer'}
          style={{
            width: 30, height: 30, borderRadius: 8, border: 'none', flexShrink: 0,
            background: client.phone ? 'rgba(52,199,89,0.12)' : c.inputBg,
            color: client.phone ? '#34C759' : c.textTertiary,
            cursor: client.phone ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (client.phone) e.currentTarget.style.background = 'rgba(52,199,89,0.24)'; }}
          onMouseLeave={e => { if (client.phone) e.currentTarget.style.background = 'rgba(52,199,89,0.12)'; }}
        >
          <Phone size={13} />
        </button>
      </div>
    );
  }

  // ── Mobile Render ─────────────────────────────────────────────────────────

  if (isMobile) {
    const s = selectedLead ? (LEAD_STATUSES[selectedLead.status] || LEAD_STATUSES.neu) : null;

    return (
      <div style={{ minHeight: '100%', background: c.bg, display: 'flex', flexDirection: 'column' }}>

        {/* Mobile Header */}
        <div style={{ background: c.card, borderBottom: `1px solid ${c.borderSubtle}`, position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: c.text, letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Flame size={18} color="#FF9500" /> Sales Engine
                </h1>
                <p style={{ fontSize: 11.5, color: c.textSecondary, margin: '2px 0 0' }}>
                  {t.calls_total || 0} Anrufe · {stats?.followups_due || 0} Follow-ups
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowScreenshot(true)} style={{ padding: '7px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: 'rgba(0,122,255,0.08)', color: 'var(--color-blue)', border: 'none', cursor: 'pointer' }}>
                  <Camera size={14} />
                </button>
                <button onClick={() => setShowExcelImport(true)} style={{ padding: '7px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: 'rgba(52,199,89,0.1)', color: '#1A8F40', border: 'none', cursor: 'pointer' }}>
                  <FileSpreadsheet size={14} />
                </button>
                <button onClick={() => setShowAddLead(true)} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 12, fontWeight: 600, background: c.blue, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* KPI Strip – horizontaler Scroll */}
            <div style={{ overflowX: 'auto', margin: '0 -16px', scrollbarWidth: 'none' }}>
              <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', width: 'max-content' }}>
                {[
                  { icon: PhoneCall, label: 'Anrufe', value: t.calls_total || 0, color: 'var(--color-blue)', target: targets.daily_calls },
                  { icon: Phone,     label: 'Gespräche', value: t.calls_reached || 0, color: '#34C759', sub: `${t.connect_rate || 0}%` },
                  { icon: CheckCircle2, label: 'Abschlüsse', value: t.closings || 0, color: '#7C3AED', target: targets.daily_closings },
                  { icon: Clock,     label: 'Fällig', value: stats?.followups_due || 0, color: '#FF9500' },
                ].map(({ icon: Icon, label, value, color, target: tgt, sub }) => {
                  const pct = tgt ? Math.min(100, Math.round((value / tgt) * 100)) : null;
                  return (
                    <div key={label} style={{ background: c.cardSecondary, borderRadius: 12, padding: '10px 14px', minWidth: 110, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Icon size={13} color={color} />
                        <span style={{ fontSize: 11, color: c.textSecondary, fontWeight: 500 }}>{label}</span>
                        {sub && <span style={{ fontSize: 10, color: c.textTertiary, marginLeft: 'auto' }}>{sub}</span>}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: c.text, letterSpacing: '-0.5px' }}>{value}</div>
                      {pct !== null && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ height: 3, background: c.inputBg, borderRadius: 99, overflow: 'hidden' }}>
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

            {/* Avatar Switcher (Mobile) */}
            <div style={{ padding: '0 0 4px' }}>
              {renderAvatarSwitcher(true)}
            </div>

            {/* Motivation Banner */}
            {mot && (mot.type === 'urgent' || mot.type === 'warning') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, marginBottom: 10,
                background: mot.type === 'urgent' ? 'rgba(255,59,48,0.08)' : 'rgba(255,149,0,0.08)',
                border: `1px solid ${mot.type === 'urgent' ? 'rgba(255,59,48,0.2)' : 'rgba(255,149,0,0.2)'}`,
              }}>
                <Flame size={13} color={mot.type === 'urgent' ? '#FF3B30' : '#FF9500'} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: mot.type === 'urgent' ? '#FF3B30' : '#FF9500' }}>{mot.message}</span>
              </div>
            )}

            {/* Tabs */}
            <div style={{ margin: '0 -16px', padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {renderGroupedTabs(true)}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 16px', background: c.card, borderBottom: `1px solid ${c.borderSubtle}` }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={c.textTertiary} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 10, fontSize: 14, border: `1.5px solid ${c.border}`, outline: 'none', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
            />
          </div>
        </div>

        {/* Count */}
        <div style={{ padding: '6px 16px', fontSize: 11, color: c.textTertiary }}>
          {listLoading ? 'Laden...' : `${listItems.length} ${isKundenTab ? 'Kunden' : `Lead${listItems.length !== 1 ? 's' : ''}`}`}
        </div>

        {/* List */}
        <div style={{ flex: 1 }}>
          {!listLoading && listItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{isKundenTab ? '👥' : '📭'}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text }}>{isKundenTab ? 'Keine Kunden' : 'Keine Leads'}</div>
              <div style={{ fontSize: 13, color: c.textSecondary, marginTop: 4 }}>{emptyMessage}</div>
            </div>
          ) : isKundenTab ? (
            salesClients.map(client => {
              return (
                <div
                  key={client.id}
                  onClick={() => handleClientCall(client)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px', background: c.card,
                    borderBottom: `1px solid ${c.borderSubtle}`, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: isDark ? 'rgba(10,132,255,0.12)' : 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 size={14} color={c.blue} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>{client.company_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      {client.contact_person && <span style={{ fontSize: 11, color: c.textTertiary }}>{client.contact_person}</span>}
                      {client.active_projects > 0 && (
                        <span style={{ padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: 'rgba(52,199,89,0.1)', color: '#34C759' }}>
                          {client.active_projects} Projekt{client.active_projects !== 1 ? 'e' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: c.textTertiary }}>
                      {client.total_calls ? `${client.total_calls}x angerufen` : 'kein Anruf'}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); handleClientCall(client); }}
                      disabled={!client.phone}
                      style={{
                        width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0,
                        background: client.phone ? 'rgba(52,199,89,0.12)' : 'rgba(142,142,147,0.12)',
                        color: client.phone ? '#34C759' : 'var(--color-text-tertiary)',
                        cursor: client.phone ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Phone size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            leads.map(lead => {
              const ls = LEAD_STATUSES[lead.status] || LEAD_STATUSES.neu;
              const fu = followupInfo(lead.next_followup_date, lead.last_call_at);
              const ws = WEBSITE_STATUS_CFG[lead.website_status];
              const pc = PRIORITY_CFG[lead.priority ?? 0];
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px', background: c.card,
                    borderBottom: `1px solid ${c.borderSubtle}`, cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>{lead.company_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: ls.bg, color: ls.color }}>{ls.label}</span>
                      {ws && <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: ws.bg, color: ws.color }}>{ws.short}</span>}
                      {lead.city && <span style={{ fontSize: 11, color: c.textTertiary }}>{lead.city}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {fu && <span style={{ fontSize: 10.5, fontWeight: 700, color: fu.color }}>{fu.label}</span>}
                    <button
                      onClick={e => { e.stopPropagation(); handleCall(lead); }}
                      disabled={!lead.phone}
                      style={{
                        width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0,
                        background: lead.phone ? 'rgba(52,199,89,0.12)' : 'rgba(142,142,147,0.12)',
                        color: lead.phone ? '#34C759' : 'var(--color-text-tertiary)',
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
              style={{ position: 'fixed', inset: 0, background: c.overlayBg, zIndex: 110, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            />
            {/* Sheet */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              height: '88vh', background: c.card,
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
              zIndex: 120, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Sheet Handle + Header */}
              <div style={{ padding: '10px 16px 12px', borderBottom: `1px solid ${c.borderSubtle}`, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 99, background: c.border, margin: '0 auto 12px' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: c.text, letterSpacing: '-0.4px', marginBottom: 6 }}>
                      {selectedLead.company_name}
                    </div>
                    {/* Status + Priority */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {s && <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>}
                      {selWS && <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: selWS.bg, color: selWS.color }}>{selectedLead.website_status}</span>}
                      {selectedLead.city && <span style={{ fontSize: 12, color: c.textSecondary, display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{selectedLead.city}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedLeadId(null)} style={{ width: 30, height: 30, borderRadius: 99, border: 'none', background: c.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={15} color={c.textSecondary} />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

                {/* Contact chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  {selectedLead.contact_person && (
                    <div style={{ fontSize: 13.5, color: c.textTertiary, fontWeight: 500 }}>{selectedLead.contact_person}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedLead.phone && (
                      <a href={`tel:${selectedLead.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(52,199,89,0.1)', color: '#1A8F40', textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>
                        <Phone size={14} /> {selectedLead.phone}
                      </a>
                    )}
                    <button
                      onClick={() => setShowEmailModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(175,82,222,0.1)', color: '#AF52DE', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      <Mail size={14} /> E-Mail{!selectedLead.email && <span style={{ fontSize: 10, opacity: 0.7 }}>(keine)</span>}
                    </button>
                    {selectedLead.domain && (
                      <a href={`https://${selectedLead.domain}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: c.inputBg, color: c.textSecondary, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                        <Globe size={14} /> Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Status ändern */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Status</div>
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
                <div style={{ background: c.cardSecondary, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Follow-up</span>
                    <button onClick={() => setFollowupFor({ leadId: selectedLeadId })} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: c.blueLight, color: c.blue, border: 'none', cursor: 'pointer' }}>
                      {selectedLead.next_followup_date ? 'Ändern' : 'Planen'}
                    </button>
                  </div>
                  {selectedLead.next_followup_date ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CalendarDays size={15} color={fwInfo?.color || c.textSecondary} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: fwInfo?.color || c.text }}>
                        {fmtDate(selectedLead.next_followup_date, { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      {fwInfo && <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: fwInfo.color + '18', color: fwInfo.color }}>{fwInfo.label}</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: c.textTertiary }}>Kein Follow-up geplant</div>
                  )}
                  {selectedLead.next_followup_note && <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 4 }}>{selectedLead.next_followup_note}</div>}
                </div>

                {/* Notizen */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Notizen</div>
                  <textarea
                    value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNotesBlur}
                    placeholder="Notizen zum Lead..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, border: `1.5px solid ${c.border}`, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
                  />
                </div>

                {/* Anrufe */}
                {leadCalls.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Anrufe ({leadCalls.length})</div>
                    <div style={{ background: c.cardSecondary, borderRadius: 12, overflow: 'hidden' }}>
                      {leadCalls.slice(0, 5).map((call, idx) => {
                        const o = OUTCOME_CFG[call.outcome] || OUTCOME_CFG.reached;
                        return (
                          <div key={call.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: idx < Math.min(leadCalls.length, 5) - 1 ? `1px solid ${c.borderSubtle}` : 'none' }}>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: c.text }}>{fmtDateTime(call.started_at)}</div>
                              {call.notes && <div style={{ fontSize: 11.5, color: c.textSecondary, marginTop: 2 }}>{call.notes}</div>}
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
                  style={{ width: '100%', padding: '12px', borderRadius: 12, background: c.inputBg, color: c.textSecondary, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  Vollansicht öffnen <ChevronRight size={15} />
                </button>
              </div>

              {/* Sheet Footer — sticky Actions */}
              <div style={{
                padding: '12px 16px',
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                borderTop: `1px solid ${c.borderSubtle}`, background: c.card,
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
                  style={{ flex: 2, padding: '13px', borderRadius: 12, background: selectedLead.phone ? '#34C759' : c.inputBg, color: selectedLead.phone ? '#fff' : c.textTertiary, border: 'none', cursor: selectedLead.phone ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Phone size={16} /> Anrufen
                </button>
              </div>
            </div>
          </>
        )}

        {/* Overlays */}
        {activeCall && <CallInProgressSheet callId={activeCall.callId} clientName={activeCall.clientName} phone={activeCall.phone} onEnd={handleCallEnd} onClose={() => setActiveCall(null)} />}
        {followupFor && <FollowupScheduler leadId={followupFor.leadId} currentDate={selectedLead?.next_followup_date} currentType={selectedLead?.next_followup_type} onSave={handleFollowupSave} onClose={() => setFollowupFor(null)} />}
        {showAddLead && <CreateLeadModal onClose={() => setShowAddLead(false)} onCreate={data => createLeadMut.mutate(data)} isCreating={createLeadMut.isPending} />}
        {showExcelImport && <ExcelImportModal onClose={() => setShowExcelImport(false)} onImport={handleImport} isImporting={importLeadsMut.isPending} />}
        {showTargets && stats?.targets && <SalesTargetModal targets={stats.targets} onSave={data => updateTargetsMut.mutate(data)} onClose={() => setShowTargets(false)} isPending={updateTargetsMut.isPending} />}
        {showScreenshot && <ScreenshotImportModal onClose={() => setShowScreenshot(false)} onCreate={data => { createLeadMut.mutate(data); setShowScreenshot(false); }} isCreating={createLeadMut.isPending} />}
        {showEmailModal && selectedLead && <LeadEmailModal lead={selectedLead} onClose={() => setShowEmailModal(false)} />}
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
            fontSize: 20, fontWeight: 700, color: c.text, letterSpacing: '-0.5px',
            margin: 0, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Flame size={18} color="#FF9500" /> Sales Engine
          </h1>
          <p style={{ fontSize: 11.5, color: c.textSecondary, margin: '2px 0 0' }}>
            {t.calls_total || 0} Anrufe · {t.calls_reached || 0} Gespräche · {stats?.followups_due || 0} Follow-ups
            {stats?.demos_active > 0 && <span style={{ color: '#34C759', fontWeight: 600 }}> · {stats.demos_active} Demos</span>}
          </p>
        </div>

        {/* KPI cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 220px))', gap: 10, flex: 1 }}>
          <KpiCard icon={PhoneCall}    label="Anrufe heute"      value={t.calls_total || 0}   color="#007AFF" target={targets.daily_calls} />
          <KpiCard icon={Phone}        label="Gespräche"          value={t.calls_reached || 0} color="#34C759" sub={`${t.connect_rate || 0}%`} target={targets.daily_connects} />
          <KpiCard icon={CheckCircle2} label="Abschlüsse"         value={t.closings || 0}      color="#7C3AED" target={targets.daily_closings} />
          <KpiCard icon={Clock}        label="Follow-ups fällig"  value={stats?.followups_due || 0} color="#FF9500" />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={() => setShowScreenshot(true)}
            title="Google Maps Screenshot importieren"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9,
              fontSize: 12, fontWeight: 600, background: 'rgba(0,122,255,0.08)', color: 'var(--color-blue)',
              border: '1px solid rgba(0,122,255,0.15)', cursor: 'pointer',
            }}
          >
            <Camera size={13} /> Screenshot
          </button>
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
              fontSize: 12, fontWeight: 600, background: c.blue, color: '#fff',
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
              background: c.inputBg, color: c.textSecondary,
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
          <span style={{ fontSize: 13, fontWeight: 600, color: mot.type === 'urgent' ? '#FF3B30' : '#FF9500' }}>
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
        display: 'grid', gridTemplateColumns: '420px 1fr 260px', gap: 14,
      }}>

        {/* ════ LEFT: Lead List ════ */}
        <div style={{
          background: c.card, borderRadius: 12, border: `0.5px solid ${c.borderSubtle}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* List header */}
          <div style={{ padding: '12px 14px 0', borderBottom: `0.5px solid ${c.borderSubtle}`, flexShrink: 0 }}>
            {/* Avatar Switcher */}
            {renderAvatarSwitcher(false)}
            {/* Viewing-other banner */}
            {viewingOther && viewedMember && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', marginBottom: 8,
                borderRadius: 8, background: `${viewedMember.color || c.blue}12`,
                border: `1px solid ${viewedMember.color || c.blue}30`,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', fontSize: 9, fontWeight: 600,
                  background: viewedMember.color || c.blue, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {getInitials(viewedMember.name, viewedMember.email)}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: c.text, flex: 1 }}>
                  {viewedMember.name || viewedMember.email}'s Pipeline
                </span>
                <button
                  onClick={() => { setViewOwnerId(null); setSelectedLeadId(null); }}
                  style={{ fontSize: 10.5, fontWeight: 600, color: c.blue, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Zurück
                </button>
              </div>
            )}
            {viewingAll && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', marginBottom: 8,
                borderRadius: 8, background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)',
              }}>
                <Users size={13} color={c.blue} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: c.text, flex: 1 }}>Alle Pipelines</span>
                <button
                  onClick={() => { setViewOwnerId(null); setSelectedLeadId(null); }}
                  style={{ fontSize: 10.5, fontWeight: 600, color: c.blue, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Zurück
                </button>
              </div>
            )}
            {/* Grouped Tabs */}
            <div style={{ marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {renderGroupedTabs(false)}
            </div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} color={c.textTertiary} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Suchen..."
                style={{
                  width: '100%', padding: '7px 9px 7px 28px', borderRadius: 8,
                  fontSize: 12.5, border: `1.5px solid ${c.border}`, outline: 'none',
                  boxSizing: 'border-box', background: c.cardSecondary, color: c.text,
                }}
              />
            </div>
          </div>

          {/* Count */}
          <div style={{ padding: '6px 14px', fontSize: 11, color: c.textTertiary, flexShrink: 0, borderBottom: `1px solid ${c.borderSubtle}` }}>
            {listLoading ? 'Laden...' : `${listItems.length} ${isKundenTab ? 'Kunden' : `Lead${listItems.length !== 1 ? 's' : ''}`}`}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!listLoading && listItems.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{isKundenTab ? '👥' : '📭'}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{isKundenTab ? 'Keine Kunden' : 'Keine Leads'}</div>
                <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>{emptyMessage}</div>
              </div>
            ) : isKundenTab ? (
              salesClients.map(client => (
                <ClientRow
                  key={client.id}
                  client={client}
                  onClick={() => handleClientCall(client)}
                  onCall={handleClientCall}
                />
              ))
            ) : (
              leads.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  isSelected={lead.id === selectedLeadId}
                  onClick={() => setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id)}
                  onCall={handleCall}
                  showOwner={viewingAll}
                />
              ))
            )}
          </div>
        </div>

        {/* ════ MIDDLE: Lead Detail ════ */}
        {!selectedLead ? <EmptyDetail /> : (
          <div style={{
            background: c.card, borderRadius: 12, border: `0.5px solid ${c.borderSubtle}`,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Detail header */}
            <div style={{
              padding: '16px 20px 14px', borderBottom: `0.5px solid ${c.borderSubtle}`, flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: c.text, letterSpacing: '-0.4px', marginBottom: 4 }}>
                    {selectedLead.company_name}
                  </div>
                  {/* Contact chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {selectedLead.contact_person && (
                      <span style={{ fontSize: 12, color: c.textTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {selectedLead.contact_person}
                      </span>
                    )}
                    {selectedLead.city && (
                      <span style={{ fontSize: 12, color: c.textSecondary, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={11} />{selectedLead.city}
                      </span>
                    )}
                    {selectedLead.phone && (
                      <a href={`tel:${selectedLead.phone}`} style={{ fontSize: 12, color: c.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Phone size={11} />{selectedLead.phone}
                      </a>
                    )}
                    {selectedLead.email && (
                      <a href={`mailto:${selectedLead.email}`} style={{ fontSize: 12, color: c.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Mail size={11} />{selectedLead.email}
                      </a>
                    )}
                    {selectedLead.domain && (
                      <a href={`https://${selectedLead.domain}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: c.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
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
                      width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.borderSubtle}`,
                      background: 'transparent', color: c.textSecondary, cursor: 'pointer',
                    }}
                  >
                    <ArrowRight size={14} />
                  </button>

                  {/* Email button */}
                  <button
                    onClick={() => setShowEmailModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                      fontSize: 13, fontWeight: 600,
                      background: 'rgba(175,82,222,0.12)', color: '#AF52DE',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    <Mail size={13} /> E-Mail
                  </button>

                  {/* Call button */}
                  <button
                    onClick={() => handleCall(selectedLead)}
                    disabled={!selectedLead.phone}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                      fontSize: 13, fontWeight: 600,
                      background: selectedLead.phone ? '#34C759' : c.inputBg,
                      color: selectedLead.phone ? '#fff' : c.textTertiary,
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
                      position: 'absolute', left: 0, top: '100%', marginTop: 4, background: c.card,
                      borderRadius: 12, padding: 5, minWidth: 160, zIndex: 50,
                      boxShadow: c.shadowLg, border: `1px solid ${c.borderSubtle}`,
                    }}>
                      {Object.entries(LEAD_STATUSES)
                        .filter(([k]) => k !== 'abgeschlossen')
                        .map(([k, v]) => (
                          <button key={k} onClick={() => handleStatusChange(k)} style={{
                            display: 'block', width: '100%', padding: '7px 10px', fontSize: 12.5, fontWeight: 500,
                            color: selectedLead.status === k ? v.color : c.text,
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
                    border: `1.5px solid ${c.border}`, outline: 'none', cursor: 'pointer',
                    color: PRIORITY_CFG[selectedLead.priority ?? 0].color,
                    background: c.card,
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
                  <span style={{ fontSize: 11.5, color: c.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Building2 size={11} /> {selectedLead.industry}
                  </span>
                )}
              </div>
            </div>

            {/* Detail body — 2 columns */}
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 280px', overflow: 'hidden' }}>

              {/* LEFT: Notes + Follow-up + Deal */}
              <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, borderRight: `0.5px solid ${c.borderSubtle}` }}>

                {/* Follow-up */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Follow-up
                    </span>
                    <button
                      onClick={() => setFollowupFor({ leadId: selectedLeadId })}
                      style={{
                        padding: '3px 9px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                        background: c.blueLight, color: c.blue, border: 'none', cursor: 'pointer',
                      }}
                    >
                      {selectedLead.next_followup_date ? 'Ändern' : 'Planen'}
                    </button>
                  </div>
                  {selectedLead.next_followup_date ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CalendarDays size={15} color={fwInfo?.color || c.textSecondary} />
                      <div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: fwInfo?.color || c.text }}>
                          {fmtDate(selectedLead.next_followup_date, { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        {fwInfo && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
                            background: fwInfo.color + '18', color: fwInfo.color,
                          }}>{fwInfo.label}</span>
                        )}
                        {selectedLead.next_followup_note && (
                          <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 3 }}>{selectedLead.next_followup_note}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: c.textTertiary }}>Kein Follow-up geplant</div>
                  )}
                </div>

                {/* Notes */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Notizen
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Notizen zum Lead..."
                    style={{
                      width: '100%', minHeight: 140, padding: '10px 12px', borderRadius: 10,
                      fontSize: 13, border: `1.5px solid ${c.border}`, outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                      lineHeight: 1.5, color: c.text, background: c.cardSecondary,
                    }}
                    onFocus={e => { e.target.style.borderColor = c.blue; }}
                    onBlurCapture={e => { e.target.style.borderColor = c.border; }}
                  />
                </div>

                {/* Details grid */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Deal value */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: c.textTertiary, display: 'block', marginBottom: 4 }}>Deal-Wert</label>
                      <div style={{ position: 'relative' }}>
                        <Euro size={12} color={c.textSecondary} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                          type="number" min={0} step={100}
                          defaultValue={selectedLead.deal_value || ''}
                          key={`dv-${selectedLeadId}`}
                          onBlur={e => {
                            const v = parseFloat(e.target.value) || null;
                            if (v !== selectedLead.deal_value) updateLeadMut.mutate({ id: selectedLeadId, data: { deal_value: v } });
                          }}
                          placeholder="0"
                          style={{ width: '100%', padding: '7px 8px 7px 24px', borderRadius: 8, fontSize: 12.5, border: `1.5px solid ${c.border}`, outline: 'none', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
                        />
                      </div>
                    </div>

                    {/* Kontaktperson — immer editierbar */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: c.textTertiary, display: 'block', marginBottom: 4 }}>Kontaktperson</label>
                      <input
                        key={`cp-${selectedLeadId}`}
                        defaultValue={selectedLead.contact_person || ''}
                        onBlur={e => { if (e.target.value !== (selectedLead.contact_person || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { contact_person: e.target.value } }); }}
                        placeholder="Max Mustermann"
                        style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: `1.5px solid ${c.border}`, outline: 'none', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
                      />
                    </div>

                    {/* Phone (editable for non-converted) */}
                    {!isConverted && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: c.textTertiary, display: 'block', marginBottom: 4 }}>Telefon</label>
                        <input
                          key={`ph-${selectedLeadId}`}
                          defaultValue={selectedLead.phone || ''}
                          onBlur={e => { if (e.target.value !== (selectedLead.phone || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { phone: e.target.value } }); }}
                          placeholder="0711 123456"
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: `1.5px solid ${c.border}`, outline: 'none', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
                        />
                      </div>
                    )}

                    {!isConverted && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: c.textTertiary, display: 'block', marginBottom: 4 }}>E-Mail</label>
                        <input
                          key={`em-${selectedLeadId}`}
                          defaultValue={selectedLead.email || ''}
                          onBlur={e => { if (e.target.value !== (selectedLead.email || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { email: e.target.value } }); }}
                          placeholder="info@firma.de"
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: `1.5px solid ${c.border}`, outline: 'none', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
                        />
                      </div>
                    )}

                    {!isConverted && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: c.textTertiary, display: 'block', marginBottom: 4 }}>Domain</label>
                        <input
                          key={`dm-${selectedLeadId}`}
                          defaultValue={selectedLead.domain || ''}
                          onBlur={e => { if (e.target.value !== (selectedLead.domain || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { domain: e.target.value } }); }}
                          placeholder="firma.de"
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: `1.5px solid ${c.border}`, outline: 'none', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: c.textTertiary, display: 'block', marginBottom: 4 }}>Adresse</label>
                      <input
                        key={`addr-${selectedLeadId}`}
                        defaultValue={selectedLead.address || ''}
                        onBlur={e => { if (e.target.value !== (selectedLead.address || '')) updateLeadMut.mutate({ id: selectedLeadId, data: { address: e.target.value } }); }}
                        placeholder="Straße, PLZ Ort"
                        style={{ width: '100%', padding: '7px 8px', borderRadius: 8, fontSize: 12.5, border: `1.5px solid ${c.border}`, outline: 'none', boxSizing: 'border-box', background: c.cardSecondary, color: c.text }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Call history */}
              <div style={{ overflowY: 'auto', padding: '16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anrufe</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: c.textSecondary,
                    background: c.cardSecondary, padding: '2px 7px', borderRadius: 99,
                  }}>{leadCalls.length}</span>
                </div>

                {leadCalls.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: c.textTertiary }}>
                    <Phone size={22} strokeWidth={1.5} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 12.5 }}>Noch keine Anrufe</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {leadCalls.map(callItem => {
                      const o = OUTCOME_CFG[callItem.outcome] || OUTCOME_CFG.reached;
                      return (
                        <div key={callItem.id} style={{ padding: '10px 0', borderBottom: `1px solid ${c.borderSubtle}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: c.text }}>
                              {fmtDateTime(callItem.started_at)}
                            </span>
                            <span style={{
                              padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                              background: o.bg, color: o.color,
                            }}>{o.label}</span>
                          </div>
                          {callItem.duration_sec && (
                            <div style={{ fontSize: 11, color: c.textTertiary }}>{fmtDuration(callItem.duration_sec)}</div>
                          )}
                          {callItem.notes && (
                            <div style={{ fontSize: 11.5, color: c.textTertiary, marginTop: 4, lineHeight: 1.4 }}>{callItem.notes}</div>
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
            background: c.card, borderRadius: 12, padding: '14px 16px 8px',
            border: `0.5px solid ${c.borderSubtle}`, flexShrink: 0,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: c.text, marginBottom: 12, letterSpacing: '-0.1px' }}>
              Anrufe / Tag
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartDays} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.borderSubtle} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: c.textTertiary }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: c.textTertiary }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: `1px solid ${c.borderSubtle}`, fontSize: 11.5, background: c.card, color: c.text }}
                  labelStyle={{ fontWeight: 600, color: c.text }}
                />
                <Bar dataKey="reached"     name="Erreicht"       stackId="a" fill="#34C759" radius={[0,0,0,0]} />
                <Bar dataKey="not_reached" name="Nicht erreicht" stackId="a" fill={c.border} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent calls */}
          <div style={{
            background: c.card, borderRadius: 12, padding: 16,
            border: `0.5px solid ${c.borderSubtle}`, flex: 1,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: c.text, marginBottom: 12, letterSpacing: '-0.1px' }}>
              Letzte Anrufe
            </div>
            {recentCalls.length === 0 ? (
              <div style={{ fontSize: 12.5, color: c.textTertiary, textAlign: 'center', padding: '20px 0' }}>
                Noch keine Anrufe heute
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {recentCalls.map(rc => {
                  const o = OUTCOME_CFG[rc.outcome] || OUTCOME_CFG.reached;
                  return (
                    <div
                      key={rc.id}
                      onClick={() => rc.lead_id && setSelectedLeadId(rc.lead_id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                        borderBottom: `1px solid ${c.borderSubtle}`,
                        cursor: rc.lead_id ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12.5, fontWeight: 600, color: c.text,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{rc.company_name}</div>
                        <div style={{ fontSize: 10.5, color: c.textTertiary }}>{relTime(rc.started_at)}</div>
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
          currentType={selectedLead?.next_followup_type}
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
      {showScreenshot && (
        <ScreenshotImportModal
          onClose={() => setShowScreenshot(false)}
          onCreate={data => { createLeadMut.mutate(data); setShowScreenshot(false); }}
          isCreating={createLeadMut.isPending}
        />
      )}
      {showEmailModal && selectedLead && (
        <LeadEmailModal lead={selectedLead} onClose={() => setShowEmailModal(false)} />
      )}
    </div>
  );
}
