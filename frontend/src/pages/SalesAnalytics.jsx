import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  TrendingUp, TrendingDown, Phone, Users, Euro, Target,
  AlertTriangle, Clock, BarChart3, Activity, ArrowUpRight,
  ArrowDownRight, Minus,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMobile } from '../hooks/useMobile';
import { salesApi } from '../api/sales';
import { teamApi } from '../api/team';

// ── Formatters ──────────────────────────────────────────────────────────────

const fmtNum = (v) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${Math.round(v || 0)}%`;
const fmtDuration = (sec) => {
  if (!sec) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const STATUS_LABELS = {
  neu: 'Neu', anrufen: 'Anrufen', follow_up: 'Follow Up',
  interessiert: 'Interessiert', demo: 'Demo geplant', gewonnen: 'Gewonnen',
  abgeschlossen: 'Abgeschlossen', verloren: 'Verloren',
  kein_interesse: 'Kein Interesse', spaeter: 'Später',
};

const STATUS_COLORS = {
  neu: '#86868B', anrufen: '#0071E3', follow_up: '#FF9500',
  interessiert: '#7C3AED', demo: '#34C759', gewonnen: '#00C853',
  abgeschlossen: '#00C853', verloren: '#636366',
  kein_interesse: '#FF3B30', spaeter: '#8E8E93',
};

const PIPELINE_ORDER = ['neu','anrufen','follow_up','interessiert','demo','gewonnen','abgeschlossen','verloren','kein_interesse','spaeter'];

const DOW_LABELS = ['So','Mo','Di','Mi','Do','Fr','Sa'];

// ── Sub-Components ──────────────────────────────────────────────────────────

function GradientAreaChart({ data, dataKey, color, height = 200, secondaryKey, secondaryColor, c }) {
  const id = `g-${dataKey}-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
          {secondaryKey && secondaryColor && (
            <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.02} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.borderSubtle} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: c.textTertiary }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: c.textTertiary }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 10, border: `1px solid ${c.borderSubtle}`,
            fontSize: 11.5, background: c.card, color: c.text,
            boxShadow: c.shadowSm,
          }}
          labelStyle={{ fontWeight: 600, color: c.text }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          fill={`url(#${id})`} dot={false}
          activeDot={{ r: 4, stroke: color, strokeWidth: 2, fill: c.card }}
        />
        {secondaryKey && (
          <Area type="monotone" dataKey={secondaryKey} stroke={secondaryColor} strokeWidth={1.5}
            fill={`url(#${id}-s)`} dot={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatCard({ label, value, icon: Icon, color, suffix, c }) {
  return (
    <div style={{
      background: c.card, borderRadius: 14, padding: 16,
      border: `1px solid ${c.borderSubtle}`, boxShadow: c.shadowSm,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} color={color} />
      </div>
      <div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: c.text,
          letterSpacing: '-0.5px', lineHeight: 1.1,
        }}>
          {value}
          {suffix && <span style={{ fontSize: 13, fontWeight: 500, color: c.textSecondary, marginLeft: 2 }}>{suffix}</span>}
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: c.textSecondary, marginTop: 4 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, c }) {
  return (
    <div style={{
      background: c.card, borderRadius: 12, padding: '12px 14px',
      border: `1px solid ${c.borderSubtle}`,
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: c.text, letterSpacing: '-0.3px' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: c.textSecondary, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionCard({ title, children, style, c }) {
  return (
    <div style={{
      background: c.card, borderRadius: 14, padding: '16px 18px',
      border: `1px solid ${c.borderSubtle}`, boxShadow: c.shadowSm,
      ...style,
    }}>
      {title && (
        <div style={{ fontSize: 13, fontWeight: 700, color: c.text, letterSpacing: '-0.1px', marginBottom: 14 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }
  return (email || '?')[0].toUpperCase();
}

function avatarColor(str = '') {
  const colors = ['#BF5AF2','#0071E3','#34C759','#FF9500','#FF3B30','#5AC8FA','#FF6961'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SalesAnalytics() {
  const { c, isDark } = useTheme();
  const { user } = useAuth();
  const isMobile = useMobile();
  const [period, setPeriod] = useState(30);
  const [viewOwnerId, setViewOwnerId] = useState(null);

  const ownerParam = useMemo(() => {
    if (viewOwnerId === 'all') return 'all';
    if (viewOwnerId) return String(viewOwnerId);
    return undefined;
  }, [viewOwnerId]);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sales-analytics', ownerParam, period],
    queryFn: () => salesApi.analytics({
      period,
      ...(ownerParam ? { owner_id: ownerParam } : {}),
    }),
    refetchInterval: 60000,
  });

  // ── Data Prep ───────────────────────────────────────────────────────────

  const dailyCalls = useMemo(() => {
    if (!data?.trends?.daily_calls) return [];
    return data.trends.daily_calls.map(d => ({
      ...d,
      label: format(new Date(d.date), 'dd.MM', { locale: de }),
      calls: Number(d.calls) || 0,
      reached: Number(d.reached) || 0,
    }));
  }, [data]);

  const dailyClosings = useMemo(() => {
    if (!data?.trends?.daily_closings) return [];
    return data.trends.daily_closings.map(d => ({
      ...d,
      label: format(new Date(d.date), 'dd.MM', { locale: de }),
      closings: Number(d.closings) || 0,
      revenue: Number(d.revenue) || 0,
    }));
  }, [data]);

  const dailyLeads = useMemo(() => {
    if (!data?.trends?.daily_leads_created) return [];
    return data.trends.daily_leads_created.map(d => ({
      ...d,
      label: format(new Date(d.date), 'dd.MM', { locale: de }),
      created: Number(d.created) || 0,
    }));
  }, [data]);

  const funnelData = useMemo(() => {
    if (!data?.pipeline?.funnel) return [];
    const map = {};
    data.pipeline.funnel.forEach(f => { map[f.status] = Number(f.count) || 0; });
    return PIPELINE_ORDER.filter(s => map[s]).map(s => ({
      status: STATUS_LABELS[s] || s,
      count: map[s],
      fill: STATUS_COLORS[s] || '#86868B',
    }));
  }, [data]);

  const dowData = useMemo(() => {
    if (!data?.calls?.by_dow) return [];
    return data.calls.by_dow.map(d => ({
      ...d,
      label: DOW_LABELS[d.dow] || d.dow,
      calls: Number(d.calls) || 0,
      reached: Number(d.reached) || 0,
    }));
  }, [data]);

  const hourData = useMemo(() => {
    if (!data?.calls?.by_hour) return [];
    return data.calls.by_hour.map(d => ({
      ...d,
      label: `${d.hour}h`,
      calls: Number(d.calls) || 0,
      reached: Number(d.reached) || 0,
    }));
  }, [data]);

  const viewingAll = viewOwnerId === 'all';

  // ── Tooltip style ─────────────────────────────────────────────────────

  const tooltipStyle = {
    borderRadius: 10, border: `1px solid ${c.borderSubtle}`,
    fontSize: 11.5, background: c.card, color: c.text,
    boxShadow: c.shadowSm,
  };

  // ── Loading ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: c.textSecondary, fontSize: 13, gap: 8,
      }}>
        <Activity size={16} style={{ animation: 'spin 1s linear infinite' }} />
        Analyse wird geladen...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: isMobile ? '16px 16px 12px' : '20px 28px 14px',
        flexShrink: 0,
        borderBottom: `1px solid ${c.borderSubtle}`,
        background: c.card,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          maxWidth: 1200, margin: '0 auto', width: '100%',
        }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: c.blueLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart3 size={17} color={c.blue} />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: c.text, margin: 0, letterSpacing: '-0.3px' }}>
                Auswertung
              </h1>
              <p style={{ fontSize: 11.5, color: c.textSecondary, margin: 0 }}>
                Sales Performance & KPIs
              </p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Avatar Switcher */}
            {teamMembers.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, color: c.textTertiary,
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 2,
                }}>
                  Ansicht
                </span>
                <button
                  onClick={() => setViewOwnerId(null)}
                  title="Meine Daten"
                  style={{
                    width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: !viewOwnerId ? c.blue : (user?.color || '#6366f1'),
                    color: '#fff', fontSize: 10, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    outline: !viewOwnerId ? `2px solid ${c.blue}` : '2px solid transparent',
                    outlineOffset: 2, transition: 'all 0.15s',
                    opacity: !viewOwnerId ? 1 : 0.6,
                  }}
                >
                  {getInitials(user?.name, user?.email)}
                </button>
                {teamMembers.filter(m => m.id !== user?.id).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setViewOwnerId(m.id)}
                    title={`${m.name || m.email}`}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: viewOwnerId === m.id ? c.blue : (m.color || avatarColor(m.email)),
                      color: '#fff', fontSize: 10, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      outline: viewOwnerId === m.id ? `2px solid ${c.blue}` : '2px solid transparent',
                      outlineOffset: 2, transition: 'all 0.15s',
                      opacity: viewOwnerId === m.id ? 1 : 0.6,
                    }}
                  >
                    {getInitials(m.name, m.email)}
                  </button>
                ))}
                <button
                  onClick={() => setViewOwnerId('all')}
                  title="Alle"
                  style={{
                    width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: viewingAll ? c.blue : c.cardSecondary,
                    color: viewingAll ? '#fff' : c.textSecondary,
                    fontSize: 10, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    outline: viewingAll ? `2px solid ${c.blue}` : '2px solid transparent',
                    outlineOffset: 2, transition: 'all 0.15s',
                    opacity: viewingAll ? 1 : 0.6,
                  }}
                >
                  <Users size={12} />
                </button>
              </div>
            )}

            {/* Period Pills */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: c.inputBg, borderRadius: 10, padding: 3,
            }}>
              {[
                { value: 7, label: '7T' },
                { value: 30, label: '30T' },
                { value: 60, label: '60T' },
                { value: 90, label: '90T' },
                { value: 365, label: 'Gesamt' },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    background: period === p.value ? c.card : 'transparent',
                    color: period === p.value ? c.text : c.textSecondary,
                    border: 'none', cursor: 'pointer',
                    boxShadow: period === p.value ? c.shadowSm : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: isMobile ? '16px 12px 80px' : '20px 28px 40px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Section 1: KPI Cards ───────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: 10,
          }}>
            <StatCard label="Leads gesamt" value={fmtNum(data?.pipeline?.total_leads)} icon={Target} color={c.blue} c={c} />
            <StatCard label="Conversion Rate" value={fmtPct(data?.pipeline?.conversion_rate)} icon={TrendingUp} color={c.green} c={c} />
            <StatCard label="Umsatz gewonnen" value={fmtNum(data?.revenue?.total_won)} icon={Euro} color={c.green} suffix="EUR" c={c} />
            <StatCard label="Durchschn. Deal" value={fmtNum(data?.revenue?.avg_deal_value)} icon={BarChart3} color={c.purple} suffix="EUR" c={c} />
            <StatCard label="Pipeline-Wert" value={fmtNum(data?.revenue?.pipeline_value)} icon={Activity} color={c.orange} suffix="EUR" c={c} />
            <StatCard label="Verlustrate" value={fmtPct(data?.pipeline?.loss_rate)} icon={TrendingDown} color={c.red} c={c} />
          </div>

          {/* ── Section 2: Trend Charts ────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 12,
          }}>
            <SectionCard title="Anrufe pro Tag" c={c}>
              {dailyCalls.length > 0 ? (
                <GradientAreaChart data={dailyCalls} dataKey="calls" color={c.blue}
                  secondaryKey="reached" secondaryColor={c.green} c={c} height={180} />
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textTertiary, fontSize: 12 }}>
                  Keine Daten
                </div>
              )}
            </SectionCard>
            <SectionCard title="Abschlüsse pro Tag" c={c}>
              {dailyClosings.length > 0 ? (
                <GradientAreaChart data={dailyClosings} dataKey="closings" color={c.green} c={c} height={180} />
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textTertiary, fontSize: 12 }}>
                  Keine Daten
                </div>
              )}
            </SectionCard>
            <SectionCard title="Neue Leads pro Tag" c={c}>
              {dailyLeads.length > 0 ? (
                <GradientAreaChart data={dailyLeads} dataKey="created" color={c.purple} c={c} height={180} />
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textTertiary, fontSize: 12 }}>
                  Keine Daten
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Section 3: Call Performance ─────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: 8,
          }}>
            <MiniStat label="Anrufe gesamt" value={fmtNum(data?.calls?.total)} c={c} />
            <MiniStat label="Connect Rate" value={fmtPct(data?.calls?.connect_rate)} c={c} />
            <MiniStat label="Anrufe / Tag" value={Number(data?.calls?.avg_per_day || 0).toFixed(1)} c={c} />
            <MiniStat label="Ø Dauer" value={fmtDuration(data?.calls?.avg_duration_sec)} c={c} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 12,
          }}>
            <SectionCard title="Anrufe nach Wochentag" c={c}>
              {dowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dowData} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.borderSubtle} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: c.textTertiary }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: c.textTertiary }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="reached" stackId="a" fill={c.green} radius={[0, 0, 0, 0]} name="Erreicht" />
                    <Bar dataKey="calls" stackId="b" fill={c.blue} radius={[4, 4, 0, 0]} name="Anrufe" opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textTertiary, fontSize: 12 }}>
                  Keine Daten
                </div>
              )}
            </SectionCard>
            <SectionCard title="Anrufe nach Uhrzeit" c={c}>
              {hourData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourData} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.borderSubtle} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: c.textTertiary }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: c.textTertiary }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="reached" stackId="a" fill={c.green} radius={[0, 0, 0, 0]} name="Erreicht" />
                    <Bar dataKey="calls" stackId="b" fill={c.blue} radius={[3, 3, 0, 0]} name="Anrufe" opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textTertiary, fontSize: 12 }}>
                  Keine Daten
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Section 4: Pipeline Funnel ──────────────────────────────── */}
          <SectionCard title="Pipeline Übersicht" c={c}>
            {funnelData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={Math.max(180, funnelData.length * 34)}>
                  <BarChart data={funnelData} layout="vertical" barSize={14} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: c.textTertiary }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: c.textSecondary }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Leads">
                      {funnelData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{
                  display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap',
                  paddingTop: 12, borderTop: `1px solid ${c.borderSubtle}`,
                }}>
                  <span style={{ fontSize: 12, color: c.textSecondary }}>
                    Demo Rate: <strong style={{ color: c.text }}>{fmtPct(data?.pipeline?.demo_rate)}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: c.textSecondary }}>
                    Conversion Rate: <strong style={{ color: c.green }}>{fmtPct(data?.pipeline?.conversion_rate)}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: c.textSecondary }}>
                    Verlustrate: <strong style={{ color: c.red }}>{fmtPct(data?.pipeline?.loss_rate)}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textTertiary, fontSize: 12 }}>
                Keine Pipeline-Daten
              </div>
            )}
          </SectionCard>

          {/* ── Section 5: Productivity ─────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 10,
          }}>
            <StatCard
              label="Ø Reaktionszeit"
              value={data?.productivity?.avg_hours_to_first_call != null
                ? `${Number(data.productivity.avg_hours_to_first_call).toFixed(1)}h`
                : '—'}
              icon={Clock} color={c.orange} c={c}
            />
            <StatCard
              label="Follow-ups erstellt"
              value={fmtNum(data?.productivity?.followups_created)}
              icon={Activity} color={c.blue} c={c}
            />
            <StatCard
              label="Leads angerufen"
              value={fmtNum(data?.productivity?.leads_called)}
              icon={Phone} color={c.green} c={c}
            />
          </div>

          {/* ── Section 6: Team Comparison ──────────────────────────────── */}
          {viewingAll && data?.team?.length > 0 && (
            <SectionCard title="Team Vergleich" c={c}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 10,
              }}>
                {data.team.map(member => {
                  const bgCol = member.owner_color || avatarColor(member.owner_name || String(member.owner_id));
                  return (
                    <div key={member.owner_id} style={{
                      background: c.cardSecondary, borderRadius: 12, padding: 14,
                      border: `1px solid ${c.borderSubtle}`,
                    }}>
                      {/* Avatar + Name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: bgCol,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#fff',
                        }}>
                          {getInitials(member.owner_name, null)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{member.owner_name || `User ${member.owner_id}`}</div>
                        </div>
                      </div>
                      {/* Stats Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {[
                          { label: 'Leads', value: member.total_leads || 0 },
                          { label: 'Gewonnen', value: member.won || 0 },
                          { label: 'Verloren', value: member.lost || 0 },
                          { label: 'Anrufe', value: member.calls_period || 0 },
                          { label: 'Connect %', value: `${Math.round(member.connect_rate || 0)}%` },
                          { label: 'Umsatz', value: fmtNum(member.revenue) },
                        ].map((s, i) => (
                          <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{s.value}</div>
                            <div style={{ fontSize: 9.5, fontWeight: 500, color: c.textTertiary, marginTop: 1 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ── Section 7: Problems ────────────────────────────────────── */}
          {(data?.problems?.overdue_followups?.length > 0 || data?.problems?.stale_leads?.length > 0 || data?.problems?.loss_by_branch?.length > 0) && (
            <SectionCard title="Probleme & Handlungsbedarf" c={c} style={{ borderLeft: `3px solid ${c.orange}` }}>

              {/* Overdue Follow-ups */}
              {data?.problems?.overdue_followups?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                    fontSize: 12, fontWeight: 600, color: c.red,
                  }}>
                    <AlertTriangle size={13} />
                    Überfällige Follow-ups ({data.problems.overdue_followups.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.problems.overdue_followups.slice(0, 10).map((lead, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: 8,
                        background: c.cardSecondary,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: c.text }}>
                          {lead.company_name || lead.contact_name || 'Unbekannt'}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 99,
                          background: c.redLight, color: c.red,
                        }}>
                          {lead.days_overdue}d überfällig
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stale Leads */}
              {data?.problems?.stale_leads?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                    fontSize: 12, fontWeight: 600, color: c.orange,
                  }}>
                    <Clock size={13} />
                    Inaktive Leads ({data.problems.stale_leads.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.problems.stale_leads.slice(0, 10).map((lead, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: 8,
                        background: c.cardSecondary,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: c.text }}>
                          {lead.company_name || lead.contact_name || 'Unbekannt'}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 99,
                          background: c.orangeLight, color: c.orange,
                        }}>
                          {lead.days_inactive}d inaktiv
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loss by Branch */}
              {data?.problems?.loss_by_branch?.length > 0 && (
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                    fontSize: 12, fontWeight: 600, color: c.textSecondary,
                  }}>
                    <BarChart3 size={13} />
                    Verlustanalyse nach Branche
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%', borderCollapse: 'collapse', fontSize: 12,
                    }}>
                      <thead>
                        <tr>
                          {['Branche', 'Gesamt', 'Verloren', 'Gewonnen', 'Verlustrate'].map(h => (
                            <th key={h} style={{
                              textAlign: h === 'Branche' ? 'left' : 'right',
                              padding: '6px 8px', fontWeight: 600, fontSize: 10.5,
                              color: c.textTertiary, textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderBottom: `1px solid ${c.borderSubtle}`,
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.problems.loss_by_branch.map((row, i) => {
                          const rate = Number(row.loss_rate) || 0;
                          const rateColor = rate > 50 ? c.red : rate > 30 ? c.orange : c.green;
                          return (
                            <tr key={i}>
                              <td style={{ padding: '6px 8px', color: c.text, fontWeight: 500 }}>
                                {row.branch || 'Unbekannt'}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: c.textSecondary }}>
                                {row.total}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: c.red }}>
                                {row.lost}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: c.green }}>
                                {row.won}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: rateColor }}>
                                {Math.round(rate)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
