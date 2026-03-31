import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Phone, Search, Flame, Settings, AlertCircle, CheckCircle2,
  Plus, Clock, PhoneCall, FileSpreadsheet, UserPlus, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../api/sales';
import { clientsApi } from '../api/clients';
import LeadStatusBadge from '../components/sales/LeadStatusBadge';
import CallInProgressSheet from '../components/sales/CallInProgressSheet';
import FollowupScheduler from '../components/sales/FollowupScheduler';
import SalesTargetModal from '../components/sales/SalesTargetModal';
import ExcelImportModal from '../components/sales/ExcelImportModal';
import CreateLeadModal from '../components/sales/CreateLeadModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'Gerade eben';
  if (diff < 60) return `vor ${diff}m`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `vor ${h}h`;
  const d = Math.floor(h / 24);
  return `vor ${d}d`;
}

const OUTCOME_CFG = {
  reached:     { label: 'Erreicht',       color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
  not_reached: { label: 'Nicht erreicht', color: '#86868B', bg: 'rgba(118,118,128,0.1)' },
  voicemail:   { label: 'Mailbox',        color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  callback:    { label: 'Rückruf',        color: '#0071E3', bg: 'rgba(0,113,227,0.1)' },
};

const PRIORITY_DOTS = { 2: '#FF3B30', 1: '#FF9500', 0: '#C7C7CC' };

const TABS = [
  { key: 'due',           label: 'Fällig heute' },
  { key: 'all',           label: 'Alle' },
  { key: 'anrufen',       label: 'Anrufen' },
  { key: 'follow_up',     label: 'Follow Up' },
  { key: 'interessiert',  label: 'Interessiert' },
  { key: 'demo',          label: 'Demo' },
];

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color, target }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#86868B', marginTop: 3 }}>{label}</div>
        </div>
      </div>
      {sub && <div style={{ fontSize: 11.5, color: '#AEAEB2' }}>{sub}</div>}
      {pct !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10.5, color: '#86868B' }}>{value}/{target}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: '#F2F2F7', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function SalesEngine() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab]               = useState('due');
  const [search, setSearch]         = useState('');
  const [showAddLead, setShowAddLead]     = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showTargets, setShowTargets]     = useState(false);
  const [activeCall, setActiveCall]       = useState(null);
  const [followupFor, setFollowupFor]     = useState(null);

  // Data
  const { data: stats } = useQuery({ queryKey: ['sales-stats'], queryFn: salesApi.stats, refetchInterval: 30000 });
  const { data: chartData } = useQuery({ queryKey: ['sales-chart'], queryFn: () => salesApi.chart(14) });
  const { data: recentCalls = [] } = useQuery({ queryKey: ['sales-calls-recent'], queryFn: () => salesApi.listCalls({ limit: 5 }) });

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

  // Mutations
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
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
      return res;
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Import fehlgeschlagen'),
  });

  const logCallMut = useMutation({ mutationFn: salesApi.logCall });

  const updateCallMut = useMutation({
    mutationFn: ({ id, data }) => salesApi.updateCall(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['sales-calls-recent'] });
    },
  });

  const updateLeadMut = useMutation({
    mutationFn: ({ id, data }) => salesApi.updateLead(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
      qc.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });

  const updateTargetsMut = useMutation({
    mutationFn: salesApi.updateTargets,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-stats'] }); toast.success('Ziele aktualisiert'); setShowTargets(false); },
  });

  // Click-to-Call
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

  function handleCallEnd(callId, outcome, notes, duration) {
    updateCallMut.mutate({ id: callId, data: { outcome, notes, duration_sec: duration } });
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

  async function handleImport(leads) {
    const res = await importLeadsMut.mutateAsync(leads);
    toast.success(`${res.imported} Leads importiert`);
    return res;
  }

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

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }} className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flame size={22} color="#FF9500" />
            Sales Engine
          </h1>
          <p style={{ fontSize: 13, color: '#86868B', margin: '4px 0 0' }}>
            {t.calls_total || 0} Anrufe heute · {t.calls_reached || 0} Gespräche · {stats?.followups_due || 0} Follow-ups offen
            {stats?.demos_active > 0 && <span style={{ color: '#34C759', fontWeight: 600 }}> · {stats.demos_active} Demos aktiv</span>}
          </p>
        </div>
        <button
          onClick={() => setShowTargets(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, background: 'rgba(0,0,0,0.04)', color: '#636366',
            border: 'none', cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        >
          <Settings size={14} />
          Ziele
        </button>
      </div>

      {/* Motivation Banner */}
      {mot && (mot.type === 'warning' || mot.type === 'urgent') && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, marginBottom: 16,
          background: mot.type === 'urgent' ? 'rgba(255,59,48,0.08)' : 'rgba(255,149,0,0.08)',
          border: `1px solid ${mot.type === 'urgent' ? 'rgba(255,59,48,0.15)' : 'rgba(255,149,0,0.15)'}`,
        }}>
          {mot.type === 'urgent' ? <Flame size={16} color="#FF3B30" /> : <AlertCircle size={16} color="#FF9500" />}
          <span style={{ fontSize: 13.5, fontWeight: 600, color: mot.type === 'urgent' ? '#FF3B30' : '#B35A00' }}>{mot.message}</span>
        </div>
      )}
      {mot && (mot.type === 'success' || mot.type === 'excellent') && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.15)',
        }}>
          <CheckCircle2 size={16} color="#34C759" />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1A8F40' }}>{mot.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard icon={PhoneCall}    label="Anrufe heute"    value={t.calls_total || 0}  color="#0071E3" target={targets.daily_calls} />
        <KpiCard icon={Phone}        label="Gespräche"       value={t.calls_reached || 0} color="#34C759" sub={`${t.connect_rate || 0}% Gesprächsquote`} target={targets.daily_connects} />
        <KpiCard icon={CheckCircle2} label="Abschlüsse"      value={t.closings || 0}     color="#7C3AED" target={targets.daily_closings} />
        <KpiCard icon={Clock}        label="Follow-ups fällig" value={stats?.followups_due || 0} color="#FF9500" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, alignItems: 'start' }}>

        {/* LEFT — Lead List */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
                {TABS.map(t => (
                  <button
                    key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      padding: '8px 12px', fontSize: 12.5, fontWeight: tab === t.key ? 600 : 500,
                      color: tab === t.key ? '#1D1D1F' : '#86868B', background: 'none', border: 'none',
                      borderBottom: tab === t.key ? '2px solid #0071E3' : '2px solid transparent',
                      cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                <button
                  onClick={() => setShowExcelImport(true)}
                  title="Excel-Datei importieren"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, background: 'rgba(52,199,89,0.1)', color: '#34C759',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button
                  onClick={() => setShowAddLead(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, background: 'rgba(0,113,227,0.1)', color: '#0071E3',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  <Plus size={13} /> Lead
                </button>
              </div>
            </div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} color="#AEAEB2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..."
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, fontSize: 13, border: '1.5px solid #E5E5EA', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {leadsLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#86868B', fontSize: 13 }}>Laden...</div>
            ) : leads.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>Keine Leads</div>
                <div style={{ fontSize: 12.5, color: '#86868B', marginTop: 3 }}>
                  {tab === 'due' ? 'Keine Follow-ups heute fällig' : 'Leads manuell anlegen oder per Excel importieren'}
                </div>
              </div>
            ) : (
              leads.map(lead => (
                <div
                  key={lead.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                    borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9F9FB'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                  onClick={() => navigate(`/sales/leads/${lead.id}`)}
                >
                  <div style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: PRIORITY_DOTS[lead.priority] || '#C7C7CC' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.company_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#86868B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[lead.contact_person, lead.city, lead.phone].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                  {lead.website_status && (
                    <span style={{ fontSize: 10.5, color: '#86868B', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Building2 size={10} />{lead.website_status.replace('Alte Website + nicht Resp.', 'Nicht Resp.')}
                    </span>
                  )}
                  <span style={{ fontSize: 11.5, color: '#AEAEB2', whiteSpace: 'nowrap', minWidth: 50, textAlign: 'right' }}>{relTime(lead.last_call_at)}</span>
                  <span style={{ fontSize: 11, color: '#AEAEB2', minWidth: 24, textAlign: 'right' }}>{lead.total_calls || 0}x</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleCall(lead); }}
                    disabled={!lead.phone}
                    style={{
                      width: 34, height: 34, borderRadius: 10, border: 'none',
                      background: lead.phone ? 'rgba(52,199,89,0.12)' : 'rgba(0,0,0,0.04)',
                      color: lead.phone ? '#34C759' : '#C7C7CC',
                      cursor: lead.phone ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                    onMouseEnter={e => { if (lead.phone) e.currentTarget.style.background = 'rgba(52,199,89,0.22)'; }}
                    onMouseLeave={e => { if (lead.phone) e.currentTarget.style.background = 'rgba(52,199,89,0.12)'; }}
                  >
                    <Phone size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT — Charts + Recent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 18px 8px', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', marginBottom: 14, letterSpacing: '-0.2px' }}>Anrufe / Tag</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartDays} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#AEAEB2' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#AEAEB2' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} labelStyle={{ fontWeight: 600, color: '#1D1D1F' }} />
                <Bar dataKey="reached"     name="Erreicht"         stackId="a" fill="#34C759" radius={[0, 0, 0, 0]} />
                <Bar dataKey="not_reached" name="Nicht erreicht"   stackId="a" fill="#E5E5EA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', marginBottom: 12, letterSpacing: '-0.2px' }}>Letzte Anrufe</div>
            {recentCalls.length === 0 ? (
              <div style={{ fontSize: 13, color: '#AEAEB2', textAlign: 'center', padding: '16px 0' }}>Noch keine Anrufe</div>
            ) : (
              recentCalls.map(c => {
                const o = OUTCOME_CFG[c.outcome] || OUTCOME_CFG.reached;
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.company_name}</div>
                      <div style={{ fontSize: 11, color: '#AEAEB2' }}>{relTime(c.started_at)}</div>
                    </div>
                    <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: o.bg, color: o.color }}>{o.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Overlays */}
      {activeCall && <CallInProgressSheet callId={activeCall.callId} clientName={activeCall.clientName} phone={activeCall.phone} onEnd={handleCallEnd} onClose={() => setActiveCall(null)} />}
      {followupFor && <FollowupScheduler leadId={followupFor.leadId} onSave={handleFollowupSave} onClose={() => setFollowupFor(null)} />}
      {showAddLead && <CreateLeadModal onClose={() => setShowAddLead(false)} onCreate={data => createLeadMut.mutate(data)} isCreating={createLeadMut.isPending} />}
      {showExcelImport && <ExcelImportModal onClose={() => setShowExcelImport(false)} onImport={handleImport} isImporting={importLeadsMut.isPending} />}
      {showTargets && stats?.targets && <SalesTargetModal targets={stats.targets} onSave={data => updateTargetsMut.mutate(data)} onClose={() => setShowTargets(false)} isPending={updateTargetsMut.isPending} />}
    </div>
  );
}
