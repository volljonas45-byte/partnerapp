import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../api/finance';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Plus, X, ChevronLeft, ChevronRight,
  Upload, FileText, Trash2, Edit2, Download, AlertCircle, CheckCircle, Info,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Receipt, Building2,
} from 'lucide-react';

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────────
const D = {
  bg:      '#06060F',
  card:    '#0D0D1E',
  card2:   '#121228',
  card3:   '#181838',
  border:  'rgba(255,255,255,0.07)',
  borderB: 'rgba(255,255,255,0.14)',
  text:    '#EEEEFF',
  text2:   '#9090B8',
  text3:   '#55557A',
  green:   '#34D399',
  red:     '#F87171',
  blue:    '#5B8CF5',
  orange:  '#FB923C',
  purple:  '#9B72F2',
  yellow:  '#FBBF24',
  cyan:    '#22D3EE',
  pink:    '#F472B6',
};

const ACCENT = '#34D399';
const ACCENT_GLOW = 'rgba(52,211,153,0.14)';
const ACCENT_BG   = 'linear-gradient(145deg,#060F0B 0%,#0A2018 100%)';

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: 'Übersicht'     },
  { id: 'transactions', label: 'Transaktionen' },
  { id: 'tax',          label: 'Steuer'        },
  { id: 'reports',      label: 'Berichte'      },
  { id: 'settings',     label: 'Einstellungen' },
];

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
function DBtn({ children, onClick, variant = 'primary', style = {}, disabled = false, type = 'button' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 10, border: 'none',
    fontSize: 13, fontWeight: 500, letterSpacing: '-0.008em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)',
  };
  const variants = {
    primary: { background: `linear-gradient(135deg,${ACCENT},#22a677)`, color: '#000', boxShadow: `0 4px 16px ${ACCENT_GLOW}` },
    ghost:   { background: 'rgba(255,255,255,0.06)', color: D.text, border: `0.5px solid ${D.border}` },
    danger:  { background: 'rgba(248,113,113,0.1)', color: D.red },
    blue:    { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = ''; }}
    >
      {children}
    </button>
  );
}

function DInput({ value, onChange, placeholder, type = 'text', style = {} }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '9px 12px',
        background: focused ? D.card2 : 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? ACCENT : D.border}`,
        borderRadius: 10, color: D.text, fontSize: 13,
        outline: 'none',
        boxShadow: focused ? `0 0 0 3px rgba(52,211,153,0.12)` : 'none',
        transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)',
        ...style,
      }}
    />
  );
}

function DSelect({ value, onChange, children, style = {} }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%', padding: '9px 12px',
        background: D.card2, border: `1px solid ${D.border}`,
        borderRadius: 10, color: D.text, fontSize: 13,
        outline: 'none', cursor: 'pointer', ...style,
      }}
    >
      {children}
    </select>
  );
}

function DLabel({ children }) {
  return <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: D.text2, marginBottom: 5 }}>{children}</label>;
}

function DField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <DLabel>{label}</DLabel>}
      {children}
    </div>
  );
}

function DModal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: D.card, borderRadius: 20, width: '100%', maxWidth: width,
          maxHeight: '90vh', overflowY: 'auto',
          border: `0.5px solid ${D.borderB}`,
          boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.24s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: D.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.text3, borderRadius: 8, padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '0 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

function SegCtrl({ tabs, active, onChange }) {
  const btnRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  useLayoutEffect(() => {
    const el = btnRefs.current[active];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  }, [active]);
  return (
    <div style={{ position: 'relative', display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${D.border}`, borderRadius: 14, padding: 4 }}>
      <div style={{ position: 'absolute', top: 4, height: 'calc(100% - 8px)', left: pill.left, width: pill.width, background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)', borderRadius: 10, boxShadow: '0 2px 20px rgba(124,58,237,0.5)', opacity: pill.ready ? 1 : 0, transition: 'left 0.38s cubic-bezier(0.22,1,0.36,1), width 0.38s cubic-bezier(0.22,1,0.36,1)', pointerEvents: 'none' }} />
      {tabs.map(t => (
        <button key={t.id} ref={el => { btnRefs.current[t.id] = el; }} onClick={() => onChange(t.id)} style={{ position: 'relative', padding: '7px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active === t.id ? 700 : 400, background: 'transparent', color: active === t.id ? '#fff' : D.text3, transition: 'color 0.28s cubic-bezier(0.22,1,0.36,1)', letterSpacing: '-0.008em' }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── FORMATTERS ────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';
const fmtShortDate = d => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '–';

// ── METRIC CARD ───────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color, trend }) {
  const shadow = `0 0 40px ${color}14, 0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 8px rgba(0,0,0,0.45)`;
  return (
    <div
      style={{
        background: `linear-gradient(145deg, ${color}18 0%, ${D.card} 55%)`,
        borderRadius: 20,
        border: `0.5px solid ${color}30`,
        boxShadow: shadow,
        overflow: 'hidden',
        transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)',
        cursor: 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 48px ${color}22, 0 1px 0 rgba(255,255,255,0.07) inset`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = shadow; }}
    >
      <div style={{ padding: '18px 20px 4px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} strokeWidth={1.8} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${trend >= 0 ? D.green : D.red}15`, color: trend >= 0 ? D.green : D.red, border: `0.5px solid ${trend >= 0 ? D.green : D.red}25`, display: 'flex', alignItems: 'center', gap: 2 }}>
            {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ padding: '10px 20px 18px' }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: D.text, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: D.text, letterSpacing: '-0.01em', marginBottom: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: D.text3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── SVG CHARTS ───────────────────────────────────────────────────────────────
function BarChart({ data, height = 140 }) {
  if (!data || data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.text3, fontSize: 12 }}>Noch keine Daten</div>
  );
  const maxVal = Math.max(...data.map(m => Math.max(parseFloat(m.income || 0), parseFloat(m.expense || 0))), 1);
  const barW = 10;
  const groupGap = 8;
  const barGap = 3;
  const svgW = data.length * (barW * 2 + barGap + groupGap);
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${svgW} ${height + 20}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="fBarGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={D.green} stopOpacity="1" />
            <stop offset="100%" stopColor={D.green} stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="fBarRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={D.red} stopOpacity="1" />
            <stop offset="100%" stopColor={D.red} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {data.map((m, i) => {
          const gx = i * (barW * 2 + barGap + groupGap) + groupGap / 2;
          const incH = Math.max(2, (parseFloat(m.income || 0) / maxVal) * height);
          const expH = Math.max(2, (parseFloat(m.expense || 0) / maxVal) * height);
          const label = m.label || (m.month ? m.month.slice(0, 3) : '');
          return (
            <g key={i}>
              <rect x={gx} y={height - incH} width={barW} height={incH} fill="url(#fBarGreen)" rx={3}>
                <title>{m.month || label}: {new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(m.income||0)}</title>
              </rect>
              <rect x={gx + barW + barGap} y={height - expH} width={barW} height={expH} fill="url(#fBarRed)" rx={3}>
                <title>{m.month || label}: {new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(m.expense||0)}</title>
              </rect>
              <text x={gx + barW} y={height + 14} textAnchor="middle" fontSize={9} fill={D.text3}>{label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: D.green }} /><span style={{ fontSize: 11, color: D.text3 }}>Einnahmen</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: D.red }} /><span style={{ fontSize: 11, color: D.text3 }}>Ausgaben</span></div>
      </div>
    </div>
  );
}

function HBar({ value, max, color, height = 5 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 99, boxShadow: `0 0 8px ${color}50`, transition: 'width 0.55s cubic-bezier(0.22,1,0.36,1)' }} />
    </div>
  );
}

// ── SETUP WIZARD ─────────────────────────────────────────────────────────────
function SetupWizard({ onComplete }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [form, setForm] = useState({
    legal_form: 'gbr',
    partners: [{ name: '', share_pct: 50 }, { name: '', share_pct: 50 }],
    founded_date: '',
    tax_mode: 'regular',
    vat_rate: 19,
    tax_number: '',
    finanzamt: '',
    fiscal_year_start: 1,
    opening_balance: '',
    open_receivables: '',
    monthly_fixed_costs: '',
    industry: '',
    revenue_goal: '',
    profit_goal: '',
    tax_reserve_pct: 30,
  });

  const s = (k, v) => setForm(x => ({ ...x, [k]: v }));

  const save = useMutation({
    mutationFn: financeApi.saveSetup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-setup'] });
      onComplete();
      toast.success('Finanz-Setup gespeichert!');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const handlePartnerChange = (i, field, val) => {
    const p = [...form.partners];
    p[i] = { ...p[i], [field]: val };
    s('partners', p);
  };

  const addPartner = () => {
    if (form.partners.length >= 5) return;
    s('partners', [...form.partners, { name: '', share_pct: 0 }]);
  };

  const removePartner = i => s('partners', form.partners.filter((_, idx) => idx !== i));

  const handleFinish = () => {
    const data = {
      ...form,
      vat_rate: parseFloat(form.vat_rate) || 19,
      opening_balance: parseFloat(form.opening_balance) || 0,
      open_receivables: parseFloat(form.open_receivables) || 0,
      monthly_fixed_costs: parseFloat(form.monthly_fixed_costs) || 0,
      revenue_goal: parseFloat(form.revenue_goal) || 0,
      profit_goal: parseFloat(form.profit_goal) || 0,
      tax_reserve_pct: parseFloat(form.tax_reserve_pct) || 30,
    };
    save.mutate(data);
  };

  const stepTitles = [
    'Unternehmensform',
    'Steuer-Konfiguration',
    'Aktueller Stand',
    'Ziele',
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: D.card, borderRadius: 24, width: '100%', maxWidth: 560,
        border: `0.5px solid ${D.borderB}`,
        boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 24px 80px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.28s cubic-bezier(0.22,1,0.36,1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '28px 28px 0', background: ACCENT_BG }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color={ACCENT} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: D.text }}>Finanz-Setup</h2>
              <p style={{ margin: 0, fontSize: 12, color: D.text2 }}>Einmalige Konfiguration für dein Unternehmen</p>
            </div>
          </div>
          {/* Progress */}
          <div style={{ display: 'flex', gap: 6, paddingBottom: 24 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 99,
                background: i < step ? ACCENT : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: D.text3, paddingBottom: 20 }}>
            Schritt {step} von {totalSteps} — {stepTitles[step - 1]}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {step === 1 && (
            <>
              <DField label="Rechtsform">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'gbr', label: 'GbR', sub: 'Gesellschaft bürgerlichen Rechts' },
                    { id: 'einzelunternehmen', label: 'Einzelunternehmen', sub: 'Demnächst verfügbar', disabled: true },
                    { id: 'ug', label: 'UG (haftungsbeschränkt)', sub: 'Demnächst verfügbar', disabled: true },
                    { id: 'gmbh', label: 'GmbH', sub: 'Demnächst verfügbar', disabled: true },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      disabled={opt.disabled}
                      onClick={() => s('legal_form', opt.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${form.legal_form === opt.id ? ACCENT : D.border}`,
                        background: form.legal_form === opt.id ? `${ACCENT}11` : D.card2,
                        color: opt.disabled ? D.text3 : D.text, cursor: opt.disabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left', opacity: opt.disabled ? 0.4 : 1, transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: D.text3, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </DField>

              <DField label="Gründungsdatum (optional)">
                <DInput type="date" value={form.founded_date} onChange={e => s('founded_date', e.target.value)} />
              </DField>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <DLabel>Gesellschafter</DLabel>
                  <button onClick={addPartner} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={12} /> Hinzufügen
                  </button>
                </div>
                {form.partners.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <DInput value={p.name} onChange={e => handlePartnerChange(i, 'name', e.target.value)} placeholder={`Gesellschafter ${i + 1}`} />
                    <div style={{ position: 'relative' }}>
                      <DInput type="number" value={p.share_pct} onChange={e => handlePartnerChange(i, 'share_pct', e.target.value)} placeholder="50" />
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: D.text3, fontSize: 12 }}>%</span>
                    </div>
                    {form.partners.length > 1 && (
                      <button onClick={() => removePartner(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.red, borderRadius: 8, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <DField label="Umsatzsteuer">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'regular', label: 'Umsatzsteuerpflichtig', sub: 'Du stellst USt in Rechnung' },
                    { id: 'kleinunternehmer', label: 'Kleinunternehmer', sub: '§19 UStG – keine USt' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => s('tax_mode', opt.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${form.tax_mode === opt.id ? ACCENT : D.border}`,
                        background: form.tax_mode === opt.id ? `${ACCENT}11` : D.card2,
                        color: D.text, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: D.text3, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </DField>

              {form.tax_mode === 'regular' && (
                <DField label="Regelsteuersatz">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[19, 7].map(r => (
                      <button
                        key={r}
                        onClick={() => s('vat_rate', r)}
                        style={{
                          flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${form.vat_rate === r ? ACCENT : D.border}`,
                          background: form.vat_rate === r ? `${ACCENT}11` : D.card2,
                          color: D.text, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                        }}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </DField>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DField label="Steuernummer (optional)">
                  <DInput value={form.tax_number} onChange={e => s('tax_number', e.target.value)} placeholder="12/345/67890" />
                </DField>
                <DField label="Finanzamt (optional)">
                  <DInput value={form.finanzamt} onChange={e => s('finanzamt', e.target.value)} placeholder="FA München" />
                </DField>
              </div>

              <DField label="Steuerjahr beginnt im Monat">
                <DSelect value={form.fiscal_year_start} onChange={e => s('fiscal_year_start', parseInt(e.target.value))}>
                  {['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </DSelect>
              </DField>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}22`, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={14} color={ACCENT} style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: D.text2, lineHeight: 1.5 }}>
                  Diese Angaben helfen dabei, dir personalisierte Empfehlungen zu geben und deinen Cashflow realistisch einzuschätzen.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DField label="Aktueller Kontostand (€)">
                  <DInput type="number" value={form.opening_balance} onChange={e => s('opening_balance', e.target.value)} placeholder="0.00" />
                </DField>
                <DField label="Offene Forderungen (€)">
                  <DInput type="number" value={form.open_receivables} onChange={e => s('open_receivables', e.target.value)} placeholder="0.00" />
                </DField>
              </div>
              <DField label="Monatliche Fixkosten (€, Schätzwert)">
                <DInput type="number" value={form.monthly_fixed_costs} onChange={e => s('monthly_fixed_costs', e.target.value)} placeholder="0.00" />
              </DField>
              <DField label="Branche / Tätigkeitsfeld">
                <DInput value={form.industry} onChange={e => s('industry', e.target.value)} placeholder="z. B. Webdesign, Beratung, Marketing" />
              </DField>
            </>
          )}

          {step === 4 && (
            <>
              <div style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}22`, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={14} color={ACCENT} style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: D.text2, lineHeight: 1.5 }}>
                  Deine Jahresziele helfen dabei, deinen Fortschritt zu messen und Empfehlungen zu kalibrieren.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DField label="Umsatzziel dieses Jahr (€)">
                  <DInput type="number" value={form.revenue_goal} onChange={e => s('revenue_goal', e.target.value)} placeholder="0.00" />
                </DField>
                <DField label="Gewinnziel dieses Jahr (€)">
                  <DInput type="number" value={form.profit_goal} onChange={e => s('profit_goal', e.target.value)} placeholder="0.00" />
                </DField>
              </div>
              <DField label="Steuerrücklage (% des Gewinns)">
                <div style={{ display: 'flex', gap: 8 }}>
                  {[20, 25, 30, 35].map(pct => (
                    <button
                      key={pct}
                      onClick={() => s('tax_reserve_pct', pct)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${form.tax_reserve_pct === pct ? ACCENT : D.border}`,
                        background: form.tax_reserve_pct === pct ? `${ACCENT}11` : D.card2,
                        color: D.text, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: D.text3 }}>Empfehlung für GbR: 30% (Einkommensteuer + Solidaritätszuschlag)</p>
              </DField>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 28px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 ? (
            <DBtn variant="ghost" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={14} /> Zurück
            </DBtn>
          ) : <div />}
          {step < totalSteps ? (
            <DBtn onClick={() => setStep(s => s + 1)}>
              Weiter <ChevronRight size={14} />
            </DBtn>
          ) : (
            <DBtn onClick={handleFinish} disabled={save.isPending}>
              <CheckCircle size={14} /> {save.isPending ? 'Speichern…' : 'Fertig & Starten'}
            </DBtn>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TRANSACTION MODAL ─────────────────────────────────────────────────────────
function TransactionModal({ open, onClose, tx, categories, setup }) {
  const qc = useQueryClient();
  const isEdit = !!tx;
  const vatRate = setup ? parseFloat(setup.vat_rate) : 19;
  const isKlein = setup?.tax_mode === 'kleinunternehmer';

  const empty = { type: 'income', date: new Date().toISOString().slice(0, 10), description: '', amount_gross: '', category_id: '', notes: '', receipt_data: '', receipt_filename: '', receipt_mime: '' };
  const [form, setForm] = useState(tx ? { ...tx, amount_gross: tx.amount_gross, category_id: tx.category_id || '' } : empty);
  const s = (k, v) => setForm(x => ({ ...x, [k]: v }));
  const fileRef = useRef();

  const grossVal = parseFloat(form.amount_gross) || 0;
  const vatAmt   = (form.type === 'income' && !isKlein) ? +(grossVal * (vatRate / (100 + vatRate))).toFixed(2) : 0;
  const netAmt   = +(grossVal - vatAmt).toFixed(2);

  const filteredCats = categories.filter(c => c.type === form.type);

  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      s('receipt_data', ev.target.result);
      s('receipt_filename', file.name);
      s('receipt_mime', file.type);
    };
    reader.readAsDataURL(file);
  };

  const save = useMutation({
    mutationFn: d => isEdit ? financeApi.updateTransaction(tx.id, d) : financeApi.createTransaction(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-stats'] });
      toast.success(isEdit ? 'Transaktion aktualisiert' : 'Transaktion gespeichert');
      onClose();
    },
    onError: () => toast.error('Fehler'),
  });

  const handleSave = () => {
    if (!form.description || !form.amount_gross || !form.date) return toast.error('Beschreibung, Datum und Betrag sind Pflichtfelder');
    save.mutate({ ...form, amount_net: netAmt, vat_amount: vatAmt, amount_gross: grossVal, category_id: form.category_id || null });
  };

  if (!open) return null;
  return (
    <DModal open={open} onClose={onClose} title={isEdit ? 'Transaktion bearbeiten' : 'Neue Transaktion'} width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Type toggle */}
        <DField label="Typ">
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'income', label: 'Einnahme', color: D.green }, { id: 'expense', label: 'Ausgabe', color: D.red }].map(opt => (
              <button
                key={opt.id}
                onClick={() => { s('type', opt.id); s('category_id', ''); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 10,
                  border: `1.5px solid ${form.type === opt.id ? opt.color : D.border}`,
                  background: form.type === opt.id ? `${opt.color}15` : D.card2,
                  color: form.type === opt.id ? opt.color : D.text2,
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </DField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DField label="Datum">
            <DInput type="date" value={form.date} onChange={e => s('date', e.target.value)} />
          </DField>
          <DField label={`Betrag brutto (€)${!isKlein && form.type === 'income' ? ` inkl. ${vatRate}% USt` : ''}`}>
            <DInput type="number" value={form.amount_gross} onChange={e => s('amount_gross', e.target.value)} placeholder="0.00" />
          </DField>
        </div>

        {!isKlein && form.type === 'income' && grossVal > 0 && (
          <div style={{ background: D.card2, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: D.text2 }}>
            <span>Netto: <strong style={{ color: D.text }}>{fmt(netAmt)}</strong></span>
            <span>USt {vatRate}%: <strong style={{ color: D.orange }}>{fmt(vatAmt)}</strong></span>
            <span>Brutto: <strong style={{ color: D.green }}>{fmt(grossVal)}</strong></span>
          </div>
        )}

        <DField label="Beschreibung">
          <DInput value={form.description} onChange={e => s('description', e.target.value)} placeholder="z. B. Rechnung Nr. 2024-001" />
        </DField>

        <DField label="Kategorie">
          <DSelect value={form.category_id} onChange={e => s('category_id', e.target.value)}>
            <option value="">Keine Kategorie</option>
            {filteredCats.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </DSelect>
        </DField>

        <DField label="Notiz (optional)">
          <textarea
            value={form.notes}
            onChange={e => s('notes', e.target.value)}
            placeholder="Weitere Details…"
            rows={2}
            style={{
              width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${D.border}`, borderRadius: 10, color: D.text, fontSize: 13,
              outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </DField>

        <DField label="Beleg (optional)">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFile} style={{ display: 'none' }} />
          {form.receipt_data ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: D.card2, borderRadius: 10, border: `1px solid ${D.border}` }}>
              {form.receipt_mime?.startsWith('image/') ? (
                <img src={form.receipt_data} alt="Beleg" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: `${D.blue}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color={D.blue} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.receipt_filename}</div>
                <button onClick={() => { s('receipt_data', ''); s('receipt_filename', ''); s('receipt_mime', ''); }} style={{ background: 'none', border: 'none', color: D.red, fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}>
                  Entfernen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                border: `1.5px dashed ${D.border}`, background: 'transparent',
                color: D.text2, cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.text2; }}
            >
              <Upload size={14} /> Bild oder PDF hochladen
            </button>
          )}
        </DField>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
          <DBtn variant="ghost" onClick={onClose}>Abbrechen</DBtn>
          <DBtn onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Speichern…' : isEdit ? 'Aktualisieren' : 'Speichern'}
          </DBtn>
        </div>
      </div>
    </DModal>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab({ setup }) {
  const [period, setPeriod] = useState('month');
  const { data: stats, isLoading } = useQuery({
    queryKey: ['finance-stats', period],
    queryFn: () => financeApi.getStats({ period }),
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const vatDueMonth = currentMonth <= 3 ? 4 : currentMonth <= 6 ? 7 : currentMonth <= 9 ? 10 : 1;
  const vatDueDate = `${vatDueMonth === 1 ? now.getFullYear() + 1 : now.getFullYear()}-${String(vatDueMonth).padStart(2, '0')}-10`;
  const daysToVat = Math.ceil((new Date(vatDueDate) - now) / 86400000);

  const isKlein = setup?.tax_mode === 'kleinunternehmer';
  const taxReservePct = setup ? parseFloat(setup.tax_reserve_pct) : 30;
  const monthlyFixed = setup ? parseFloat(setup.monthly_fixed_costs) : 0;
  const openBalance  = setup ? parseFloat(setup.opening_balance) : 0;
  const revenueGoal  = setup ? parseFloat(setup.revenue_goal) : 0;

  const income  = stats?.income  || 0;
  const expense = stats?.expense || 0;
  const profit  = stats?.profit  || 0;
  const taxRes  = stats?.taxReserve || 0;
  const revPct  = revenueGoal > 0 ? Math.min(100, Math.round((income / revenueGoal) * 100)) : 0;
  const monthlyData = stats?.monthly || [];

  // Sparkline
  const sparkPoints = monthlyData.map(m => parseFloat(m.income) - parseFloat(m.expense));
  const spMax = Math.max(...sparkPoints, 1);
  const spMin = Math.min(...sparkPoints, 0);
  const spRange = spMax - spMin || 1;
  const W = 200, H = 40;
  const pts = sparkPoints.map((v, i) => {
    const x = sparkPoints.length <= 1 ? W / 2 : (i / (sparkPoints.length - 1)) * W;
    const y = H - ((v - spMin) / spRange) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: D.text }}>Finanzübersicht</h2>
        <SegCtrl
          tabs={[{ id: 'month', label: 'Monat' }, { id: 'quarter', label: 'Quartal' }, { id: 'year', label: 'Jahr' }]}
          active={period}
          onChange={setPeriod}
        />
      </div>

      {/* Metric cards */}
      <div className="anim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <MetricCard icon={TrendingUp} label="Einnahmen" value={fmt(income)} color={D.green} sub={period === 'month' ? 'Dieser Monat' : period === 'quarter' ? 'Dieses Quartal' : 'Dieses Jahr'} />
        <MetricCard icon={TrendingDown} label="Ausgaben" value={fmt(expense)} color={D.red} />
        <MetricCard icon={DollarSign} label="Gewinn" value={fmt(profit)} color={profit >= 0 ? D.blue : D.red} sub={profit < 0 ? 'Verlust' : 'Netto'} />
        {!isKlein && (
          <MetricCard icon={Percent} label="Steuerrücklage" value={fmt(taxRes)} color={D.orange} sub={`${taxReservePct}% des Gewinns`} />
        )}
      </div>

      {/* Recommendations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!isKlein && daysToVat <= 30 && (
          <div style={{ background: `${D.orange}11`, border: `1px solid ${D.orange}33`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertCircle size={16} color={D.orange} style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>USt-Voranmeldung fällig: </span>
              <span style={{ fontSize: 13, color: D.text2 }}>in {daysToVat} Tagen (bis {fmtDate(vatDueDate)}). Zahllast: {fmt(stats?.vatOwed || 0)}</span>
            </div>
          </div>
        )}
        {monthlyFixed > 0 && openBalance > 0 && openBalance < monthlyFixed * 3 && (
          <div style={{ background: `${D.red}11`, border: `1px solid ${D.red}33`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <AlertCircle size={16} color={D.red} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: D.text2 }}>
              <strong style={{ color: D.text }}>Liquiditätswarnung: </strong>
              Dein Kontostand deckt weniger als 3 Monatsfixkosten. Empfehlung: Liquiditätsreserve aufbauen.
            </span>
          </div>
        )}
        {setup && (
          <div style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}22`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Info size={16} color={ACCENT} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: D.text2 }}>
              <strong style={{ color: D.text }}>GbR-Tipp: </strong>
              Lege mindestens {taxReservePct}% jeder Zahlung als Einkommensteuer-Rücklage zurück
              {setup.partners?.length > 1 ? ` (je Gesellschafter anteilig)` : ''}.
            </span>
          </div>
        )}
        {revenueGoal > 0 && (
          <div style={{ background: `linear-gradient(145deg,${ACCENT}0F 0%,${D.card} 55%)`, borderRadius: 16, padding: '16px 18px', border: `0.5px solid ${ACCENT}25`, boxShadow: `0 0 30px ${ACCENT}08` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em' }}>UMSATZZIEL {new Date().getFullYear()}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: D.text2 }}>{fmt(income)} von {fmt(revenueGoal)} erreicht</p>
              </div>
              <span style={{ fontSize: 26, fontWeight: 900, color: D.text, letterSpacing: '-0.04em' }}>{revPct}<span style={{ fontSize: 14, color: D.text3 }}>%</span></span>
            </div>
            <HBar value={income} max={revenueGoal} color={ACCENT} height={6} />
          </div>
        )}
      </div>

      {/* Cashflow chart + recent transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'linear-gradient(145deg,#060F0B 0%,#0A2018 100%)', borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.green}25`, boxShadow: `0 0 40px ${D.green}0A, 0 1px 0 rgba(255,255,255,0.04) inset` }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: D.green, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CASHFLOW-TREND</p>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>Einnahmen vs. Ausgaben</h3>
          <BarChart data={monthlyData.map(m => ({ ...m, label: m.month?.slice(0,3) || '' }))} height={130} />
        </div>

        <div style={{ background: `linear-gradient(145deg,${D.blue}0D 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.blue}25`, boxShadow: `0 0 40px ${D.blue}08, 0 1px 0 rgba(255,255,255,0.04) inset` }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: D.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>LETZTE BUCHUNGEN</p>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>Transaktionen</h3>
          {isLoading ? (
            <div style={{ color: D.text3, fontSize: 12 }}>Laden…</div>
          ) : (stats?.recent || []).length === 0 ? (
            <div style={{ color: D.text3, fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Noch keine Transaktionen</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(stats?.recent || []).map(tx => {
                const col = tx.type === 'income' ? D.green : D.red;
                return (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: `${col}0D`, borderRadius: 10, padding: '8px 12px', border: `0.5px solid ${col}20` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: `0 0 6px ${col}` }} />
                      <span style={{ fontSize: 12, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col, flexShrink: 0 }}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount_gross)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TRANSACTIONS TAB ──────────────────────────────────────────────────────────
function TransactionsTab({ categories, setup }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ type: '', category_id: '', period: 'month' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);

  const now = new Date();
  const periodDates = {
    month: { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`, to: now.toISOString().slice(0,10) },
    quarter: { from: new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1).toISOString().slice(0,10), to: now.toISOString().slice(0,10) },
    year: { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0,10) },
    all: {},
  };
  const dates = periodDates[filter.period] || {};

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['finance-transactions', filter],
    queryFn: () => financeApi.listTransactions({ ...dates, type: filter.type || undefined, category_id: filter.category_id || undefined }),
  });

  const deleteTx = useMutation({
    mutationFn: financeApi.deleteTransaction,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-transactions'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }); toast.success('Gelöscht'); },
  });

  const totalIncome  = txs.filter(t => t.type === 'income').reduce((s,t) => s + parseFloat(t.amount_gross), 0);
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s,t) => s + parseFloat(t.amount_gross), 0);

  const fset = (k, v) => setFilter(x => ({ ...x, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: D.text }}>Transaktionen</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SegCtrl
            tabs={[{ id: 'month', label: 'Monat' }, { id: 'quarter', label: 'Quartal' }, { id: 'year', label: 'Jahr' }, { id: 'all', label: 'Alle' }]}
            active={filter.period}
            onChange={v => fset('period', v)}
          />
          <select
            value={filter.type}
            onChange={e => fset('type', e.target.value)}
            style={{ padding: '6px 10px', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text2, fontSize: 12, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Alle Typen</option>
            <option value="income">Einnahmen</option>
            <option value="expense">Ausgaben</option>
          </select>
          <select
            value={filter.category_id}
            onChange={e => fset('category_id', e.target.value)}
            style={{ padding: '6px 10px', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text2, fontSize: 12, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Alle Kategorien</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <DBtn onClick={() => { setEditTx(null); setModalOpen(true); }}>
            <Plus size={14} /> Neu
          </DBtn>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { label: 'Einnahmen', val: totalIncome, color: D.green },
          { label: 'Ausgaben', val: totalExpense, color: D.red },
          { label: 'Saldo', val: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? D.blue : D.red },
        ].map(item => (
          <div key={item.label} style={{ background: `linear-gradient(145deg,${item.color}18 0%,${D.card} 55%)`, borderRadius: 16, padding: '16px 18px', border: `0.5px solid ${item.color}30`, boxShadow: `0 0 30px ${item.color}0A, 0 1px 0 rgba(255,255,255,0.04) inset`, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: item.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{fmt(item.val)}</div>
            <div style={{ fontSize: 11, color: D.text3, marginTop: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: D.card, borderRadius: 18, border: `0.5px solid ${D.border}`, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: D.text3 }}>Laden…</div>
        ) : txs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Receipt size={32} color={D.text3} style={{ marginBottom: 10 }} />
            <p style={{ margin: 0, color: D.text3, fontSize: 13 }}>Keine Transaktionen gefunden</p>
            <button onClick={() => { setEditTx(null); setModalOpen(true); }} style={{ marginTop: 12, background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, padding: '7px 14px', color: ACCENT, cursor: 'pointer', fontSize: 13 }}>
              Erste Transaktion anlegen
            </button>
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 140px 100px 100px 80px', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${D.border}`, fontSize: 11, fontWeight: 600, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Datum</span>
              <span>Beschreibung</span>
              <span>Kategorie</span>
              <span style={{ textAlign: 'right' }}>Netto</span>
              <span style={{ textAlign: 'right' }}>Brutto</span>
              <span />
            </div>
            <div className="anim-grid">
              {txs.map(tx => {
                const txCol = tx.type === 'income' ? D.green : D.red;
                return (
                <div
                  key={tx.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 140px 100px 100px 80px', gap: 12,
                    padding: '12px 20px', borderBottom: `1px solid ${D.border}`,
                    background: `linear-gradient(90deg,${txCol}06 0%,transparent 60%)`,
                    transition: 'background 0.15s cubic-bezier(0.22,1,0.36,1)',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `linear-gradient(90deg,${txCol}12 0%,rgba(255,255,255,0.02) 60%)`}
                  onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(90deg,${txCol}06 0%,transparent 60%)`}
                >
                  <span style={{ fontSize: 12, color: D.text3 }}>{fmtShortDate(tx.date)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: tx.type === 'income' ? D.green : D.red, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</span>
                    {tx.receipt_data && <Receipt size={11} color={D.text3} style={{ flexShrink: 0 }} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tx.category_name && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: `${tx.category_color || D.text3}22`, color: tx.category_color || D.text3 }}>
                        {tx.category_name}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: D.text2, textAlign: 'right' }}>{fmt(tx.amount_net)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tx.type === 'income' ? D.green : D.red, textAlign: 'right' }}>
                    {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount_gross)}
                  </span>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setEditTx(tx); setModalOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.text3, padding: 4, borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.color = D.blue} onMouseLeave={e => e.currentTarget.style.color = D.text3}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => { if (confirm('Transaktion löschen?')) deleteTx.mutate(tx.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.text3, padding: 4, borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.color = D.red} onMouseLeave={e => e.currentTarget.style.color = D.text3}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      {txs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <DBtn variant="ghost" onClick={() => financeApi.exportCsv({ ...dates, type: filter.type || undefined })}>
            <Download size={13} /> Als CSV exportieren
          </DBtn>
        </div>
      )}

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} tx={editTx} categories={categories} setup={setup} />
    </div>
  );
}

// ── TAX TAB ───────────────────────────────────────────────────────────────────
function TaxTab({ setup }) {
  const year = new Date().getFullYear();
  const { data: taxData, isLoading } = useQuery({
    queryKey: ['finance-tax-summary', year],
    queryFn: () => financeApi.getTaxSummary({ year }),
  });

  if (!setup) return <div style={{ padding: 40, textAlign: 'center', color: D.text3 }}>Setup nicht abgeschlossen.</div>;

  const isKlein = setup.tax_mode === 'kleinunternehmer';
  const vatRate  = parseFloat(setup.vat_rate) || 19;
  const partners = typeof setup.partners === 'string' ? JSON.parse(setup.partners) : (setup.partners || []);

  const now = new Date();
  const q   = Math.floor(now.getMonth() / 3) + 1;
  const vatDeadlines = [1,2,3,4].map(qn => {
    const dueMonth = qn * 3 + 1;
    const dueYear  = dueMonth > 12 ? year + 1 : year;
    const dueDate  = `${dueYear}-${String(dueMonth > 12 ? dueMonth - 12 : dueMonth).padStart(2,'0')}-10`;
    return { q: qn, dueDate, isPast: new Date(dueDate) < now, isCurrent: qn === q };
  });

  const qData = taxData?.quarters || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: D.text }}>Steuerübersicht {year}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* USt Card */}
        {!isKlein ? (
          <div style={{ background: `linear-gradient(145deg,${D.orange}14 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.orange}28`, boxShadow: `0 0 40px ${D.orange}0A, 0 1px 0 rgba(255,255,255,0.04) inset` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${D.orange}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Percent size={18} color={D.orange} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: D.text }}>Umsatzsteuer ({vatRate}%)</h3>
                <p style={{ margin: 0, fontSize: 11, color: D.text3 }}>Jahr {year}</p>
              </div>
            </div>
            {isLoading ? <div style={{ color: D.text3, fontSize: 12 }}>Laden…</div> : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: D.text2 }}>Eingenommen</span>
                    <span style={{ color: D.green, fontWeight: 600 }}>{fmt(taxData?.quarters.reduce((s,q) => s + q.vatIn, 0) || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: D.text2 }}>Vorsteuer</span>
                    <span style={{ color: D.blue, fontWeight: 600 }}>-{fmt(taxData?.quarters.reduce((s,q) => s + q.vatPre, 0) || 0)}</span>
                  </div>
                  <div style={{ height: 1, background: D.border }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: D.text, fontWeight: 600 }}>Zahllast</span>
                    <span style={{ color: D.orange, fontWeight: 700 }}>{fmt(taxData?.yearVatOwed || 0)}</span>
                  </div>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: D.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Voranmeldungsfristen</p>
                  {vatDeadlines.map(({ q: qn, dueDate, isPast, isCurrent }) => {
                    const qInfo = qData.find(d => d.q === qn);
                    return (
                      <div key={qn} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, marginBottom: 4, background: isCurrent ? `${D.orange}0D` : 'transparent', border: isCurrent ? `1px solid ${D.orange}33` : '1px solid transparent' }}>
                        <span style={{ fontSize: 12, color: isCurrent ? D.orange : isPast ? D.text3 : D.text2 }}>Q{qn} – bis {fmtDate(dueDate)}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isPast ? D.text3 : D.text }}>
                          {qInfo ? fmt(qInfo.vatOwed) : '–'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ background: `linear-gradient(145deg,${D.green}14 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.green}28`, boxShadow: `0 0 40px ${D.green}0A, 0 1px 0 rgba(255,255,255,0.04) inset` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${D.green}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={18} color={D.green} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: D.text }}>Kleinunternehmer (§19 UStG)</h3>
              </div>
            </div>
            <p style={{ fontSize: 13, color: D.text2, margin: 0 }}>Keine Umsatzsteuer-Voranmeldung erforderlich. Du stellst keine USt in Rechnung und erhältst keine Vorsteuer zurück.</p>
          </div>
        )}

        {/* EÜR Card */}
        <div style={{ background: `linear-gradient(145deg,${D.blue}14 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.blue}28`, boxShadow: `0 0 40px ${D.blue}0A, 0 1px 0 rgba(255,255,255,0.04) inset` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${D.blue}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color={D.blue} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: D.text }}>EÜR {year}</h3>
              <p style={{ margin: 0, fontSize: 11, color: D.text3 }}>Einnahmen-Überschuss-Rechnung</p>
            </div>
          </div>
          {isLoading ? <div style={{ color: D.text3, fontSize: 12 }}>Laden…</div> : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: D.text2 }}>Betriebseinnahmen</span>
                  <span style={{ color: D.green, fontWeight: 600 }}>{fmt(taxData?.yearIncome || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: D.text2 }}>Betriebsausgaben</span>
                  <span style={{ color: D.red, fontWeight: 600 }}>-{fmt(taxData?.yearExpense || 0)}</span>
                </div>
                <div style={{ height: 1, background: D.border }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: D.text, fontWeight: 600 }}>Gewinn</span>
                  <span style={{ color: (taxData?.yearProfit || 0) >= 0 ? D.green : D.red, fontWeight: 700 }}>{fmt(taxData?.yearProfit || 0)}</span>
                </div>
              </div>
              {partners.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: D.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gewinnverteilung</p>
                  {(taxData?.partnerSummary || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${D.border}`, fontSize: 13 }}>
                      <span style={{ color: D.text }}>{p.name || `Gesellschafter ${i+1}`} ({p.share_pct}%)</span>
                      <span style={{ color: D.blue, fontWeight: 600 }}>{fmt(p.profit_share)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Gewerbesteuer Card */}
        <div style={{ background: `linear-gradient(145deg,${D.purple}14 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.purple}28`, boxShadow: `0 0 40px ${D.purple}0A, 0 1px 0 rgba(255,255,255,0.04) inset` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${D.purple}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color={D.purple} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: D.text }}>Gewerbesteuer</h3>
              <p style={{ margin: 0, fontSize: 11, color: D.text3 }}>Freibetrag: 24.500 €</p>
            </div>
          </div>
          {isLoading ? <div style={{ color: D.text3, fontSize: 12 }}>Laden…</div> : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: (taxData?.gewerbesteuerPflichtig ? `${D.orange}11` : `${D.green}11`), marginBottom: 12 }}>
                {taxData?.gewerbesteuerPflichtig ? (
                  <AlertCircle size={16} color={D.orange} style={{ flexShrink: 0 }} />
                ) : (
                  <CheckCircle size={16} color={D.green} style={{ flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 13, color: taxData?.gewerbesteuerPflichtig ? D.orange : D.green, fontWeight: 500 }}>
                  {taxData?.gewerbesteuerPflichtig ? 'Gewerbesteuerpflichtig' : 'Unterhalb des Freibetrags'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: D.text2 }}>
                Jahresgewinn: <strong style={{ color: D.text }}>{fmt(taxData?.yearProfit || 0)}</strong>
              </div>
              {taxData?.gewerbesteuerPflichtig && (
                <div style={{ fontSize: 13, color: D.text2, marginTop: 6 }}>
                  Steuerpflichtige Basis: <strong style={{ color: D.orange }}>{fmt(taxData?.gewerbesteuerBasis)}</strong>
                </div>
              )}
              <p style={{ fontSize: 11, color: D.text3, margin: '10px 0 0', lineHeight: 1.5 }}>
                Exakter Steuersatz hängt vom Hebesatz deiner Gemeinde ab. Empfehlung: Steuerberater konsultieren.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Quarterly breakdown */}
      {!isLoading && qData.length > 0 && (
        <div style={{ background: `linear-gradient(145deg,${ACCENT}08 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${ACCENT}20` }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em' }}>QUARTALSBERICHT</p>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>Quartalsübersicht {year}</h3>
          <div className="anim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {qData.map(qItem => {
              const isCurrentQ = qItem.q === q;
              const qCol = isCurrentQ ? ACCENT : D.blue;
              return (
                <div key={qItem.q} style={{ background: `linear-gradient(145deg,${qCol}12 0%,${D.card2} 60%)`, borderRadius: 14, padding: '14px 16px', border: `0.5px solid ${qCol}30`, boxShadow: isCurrentQ ? `0 0 24px ${qCol}18` : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: qCol, marginBottom: 12, letterSpacing: '-0.01em' }}>Q{qItem.q}{isCurrentQ && <span style={{ fontSize: 9, background: `${qCol}22`, padding: '2px 6px', borderRadius: 6, marginLeft: 6 }}>Aktuell</span>}</div>
                  <div style={{ fontSize: 11, color: D.text3, marginBottom: 3 }}>Einnahmen</div>
                  <div style={{ fontSize: 14, color: D.green, fontWeight: 700, marginBottom: 10 }}>{fmt(qItem.income)}</div>
                  <HBar value={qItem.income} max={Math.max(...qData.map(x => x.income), 1)} color={D.green} height={3} />
                  <div style={{ fontSize: 11, color: D.text3, marginBottom: 3, marginTop: 10 }}>Ausgaben</div>
                  <div style={{ fontSize: 14, color: D.red, fontWeight: 700, marginBottom: 10 }}>{fmt(qItem.expense)}</div>
                  <HBar value={qItem.expense} max={Math.max(...qData.map(x => x.income), 1)} color={D.red} height={3} />
                  <div style={{ height: 1, background: D.border, margin: '10px 0 8px' }} />
                  <div style={{ fontSize: 11, color: D.text3, marginBottom: 3 }}>Gewinn</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: qItem.profit >= 0 ? D.green : D.red, letterSpacing: '-0.03em' }}>{fmt(qItem.profit)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── REPORTS TAB ───────────────────────────────────────────────────────────────
function ReportsTab() {
  const [reportType, setReportType] = useState('pnl');
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isLoading } = useQuery({
    queryKey: ['finance-report', reportType, year],
    queryFn: () => financeApi.getReport({ type: reportType, year }),
  });

  const years = [year - 1, year, year + 1].filter(y => y <= new Date().getFullYear());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: D.text }}>Berichte</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <SegCtrl
            tabs={[{ id: 'pnl', label: 'GuV' }, { id: 'cashflow', label: 'Cashflow' }, { id: 'categories', label: 'Kategorien' }]}
            active={reportType}
            onChange={setReportType}
          />
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            style={{ padding: '6px 10px', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text2, fontSize: 12, outline: 'none', cursor: 'pointer' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <DBtn variant="ghost" onClick={() => financeApi.exportCsv({ year })}>
            <Download size={13} /> Export
          </DBtn>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: D.text3 }}>Laden…</div>
      ) : !data ? (
        <div style={{ padding: 40, textAlign: 'center', color: D.text3 }}>Keine Daten vorhanden.</div>
      ) : (
        <>
          {reportType === 'pnl' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { title: 'Einnahmen nach Kategorie', items: data.incomeCategories || [], total: data.totalIncome, color: D.green },
                  { title: 'Ausgaben nach Kategorie', items: data.expenseCategories || [], total: data.totalExpense, color: D.red },
                ].map(section => (
                  <div key={section.title} style={{ background: `linear-gradient(145deg,${section.color}10 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${section.color}25`, boxShadow: `0 0 30px ${section.color}08` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: section.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{section.color === D.green ? 'EINNAHMEN' : 'AUSGABEN'}</p>
                        <h3 style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>{section.title}</h3>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 900, color: section.color, letterSpacing: '-0.03em' }}>{fmt(section.total)}</span>
                    </div>
                    {section.items.length === 0 ? (
                      <div style={{ fontSize: 12, color: D.text3 }}>Keine Daten</div>
                    ) : (
                      section.items.map((item, i) => {
                        const pct = section.total > 0 ? (parseFloat(item.total) / section.total) * 100 : 0;
                        return (
                          <div key={i} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color || section.color, flexShrink: 0 }} />
                                <span style={{ color: D.text }}>{item.name}</span>
                              </div>
                              <span style={{ color: D.text2 }}>{fmt(item.total)} <span style={{ color: D.text3, fontSize: 11 }}>({pct.toFixed(0)}%)</span></span>
                            </div>
                            <HBar value={parseFloat(item.total)} max={section.total} color={item.color || section.color} height={5} />
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
              <div style={{ background: `linear-gradient(145deg,${data.profit >= 0 ? D.green : D.red}14 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 24px', border: `0.5px solid ${data.profit >= 0 ? D.green : D.red}28`, boxShadow: `0 0 40px ${data.profit >= 0 ? D.green : D.red}0A` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: data.profit >= 0 ? D.green : D.red, textTransform: 'uppercase', letterSpacing: '0.1em' }}>JAHRESERGEBNIS</p>
                    <span style={{ fontSize: 14, color: D.text2 }}>Gewinn / Verlust {year}</span>
                  </div>
                  <span style={{ fontWeight: 900, fontSize: 28, color: data.profit >= 0 ? D.green : D.red, letterSpacing: '-0.04em' }}>{fmt(data.profit)}</span>
                </div>
              </div>
            </div>
          )}

          {reportType === 'cashflow' && (
            <div style={{ background: 'linear-gradient(145deg,#060F0B 0%,#0A2018 100%)', borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.green}25`, boxShadow: `0 0 40px ${D.green}0A, 0 1px 0 rgba(255,255,255,0.04) inset` }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: D.green, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CASHFLOW BERICHT</p>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>Monatlicher Cashflow {year}</h3>
              <BarChart
                data={(data.months || []).map(m => ({ ...m, label: (m.month || '').slice(0, 3) }))}
                height={160}
              />
            </div>
          )}

          {reportType === 'categories' && (
            <div style={{ background: `linear-gradient(145deg,${D.red}0D 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.red}20`, boxShadow: `0 0 30px ${D.red}08` }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: D.red, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AUSGABENSTRUKTUR</p>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>Ausgaben nach Kategorie</h3>
              {(data.categories || []).filter(c => c.type === 'expense').length === 0 ? (
                <div style={{ color: D.text3, fontSize: 12 }}>Keine Daten</div>
              ) : (() => {
                const expCats = (data.categories || []).filter(c => c.type === 'expense');
                const allExp = expCats.reduce((s, x) => s + parseFloat(x.total), 0);
                return expCats.map((c, i) => {
                  const pct = allExp > 0 ? (parseFloat(c.total) / allExp) * 100 : 0;
                  return (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
                          <span style={{ color: D.text, fontWeight: 500 }}>{c.name}</span>
                          <span style={{ fontSize: 10, color: D.text3, background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 99 }}>{c.count}x</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ color: D.text3, fontSize: 11 }}>{pct.toFixed(1)}%</span>
                          <span style={{ color: D.red, fontWeight: 700, fontSize: 14 }}>{fmt(c.total)}</span>
                        </div>
                      </div>
                      <HBar value={parseFloat(c.total)} max={allExp} color={c.color} height={5} />
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────────────────────
function SettingsTab({ setup, categories, onSetupEdit }) {
  const qc = useQueryClient();
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#9090B8' });

  const saveCat = useMutation({
    mutationFn: d => editCat ? financeApi.updateCategory(editCat.id, d) : financeApi.createCategory(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-categories'] }); setCatModal(false); toast.success('Kategorie gespeichert'); },
  });

  const deleteCat = useMutation({
    mutationFn: financeApi.deleteCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-categories'] }); toast.success('Gelöscht'); },
  });

  const partners = setup ? (typeof setup.partners === 'string' ? JSON.parse(setup.partners) : (setup.partners || [])) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: D.text }}>Einstellungen</h2>

      {/* Company info */}
      <div style={{ background: `linear-gradient(145deg,${D.cyan}10 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.cyan}22`, boxShadow: `0 0 40px ${D.cyan}08, 0 1px 0 rgba(255,255,255,0.04) inset` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: D.cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>UNTERNEHMENSINFO</p>
            <h3 style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>Stammdaten</h3>
          </div>
          <DBtn variant="ghost" onClick={onSetupEdit}><Edit2 size={12} /> Bearbeiten</DBtn>
        </div>
        {setup ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Rechtsform', value: setup.legal_form?.toUpperCase() },
              { label: 'Steuer', value: setup.tax_mode === 'kleinunternehmer' ? 'Kleinunternehmer §19' : `USt-pflichtig ${setup.vat_rate}%` },
              { label: 'Branche', value: setup.industry || '–' },
              { label: 'Gründung', value: setup.founded_date ? fmtDate(setup.founded_date) : '–' },
              { label: 'Umsatzziel', value: fmt(setup.revenue_goal) },
              { label: 'Gewinnziel', value: fmt(setup.profit_goal) },
              { label: 'Steuerrücklage', value: `${setup.tax_reserve_pct}%` },
              { label: 'Fixkosten/Monat', value: fmt(setup.monthly_fixed_costs) },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 11, color: D.text3, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: D.text, fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>
        ) : <div style={{ color: D.text3, fontSize: 12 }}>Setup nicht abgeschlossen.</div>}
        {partners.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: D.text3, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gesellschafter</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {partners.map((p, i) => (
                <span key={i} style={{ padding: '4px 12px', background: `${ACCENT}15`, border: `1px solid ${ACCENT}33`, borderRadius: 99, fontSize: 12, color: ACCENT }}>
                  {p.name || `Gesellschafter ${i+1}`} · {p.share_pct}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div style={{ background: `linear-gradient(145deg,${D.purple}10 0%,${D.card} 55%)`, borderRadius: 20, padding: '20px 22px', border: `0.5px solid ${D.purple}22`, boxShadow: `0 0 30px ${D.purple}08` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: D.purple, textTransform: 'uppercase', letterSpacing: '0.1em' }}>KATEGORIEN</p>
            <h3 style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>Buchungskategorien</h3>
          </div>
          <DBtn variant="ghost" onClick={() => { setEditCat(null); setCatForm({ name: '', type: 'expense', color: '#9090B8' }); setCatModal(true); }}>
            <Plus size={12} /> Neu
          </DBtn>
        </div>
        {['income', 'expense'].map(type => (
          <div key={type} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: D.text3, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {type === 'income' ? 'Einnahmen' : 'Ausgaben'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.filter(c => c.type === type).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 10px', background: `${c.color}15`, borderRadius: 99, border: `0.5px solid ${c.color}35` }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, boxShadow: `0 0 5px ${c.color}` }} />
                  <span style={{ fontSize: 12, color: D.text, fontWeight: 500 }}>{c.name}</span>
                  {!c.is_default && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={() => { setEditCat(c); setCatForm({ name: c.name, type: c.type, color: c.color }); setCatModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.text3, padding: 2, borderRadius: 4 }}>
                        <Edit2 size={10} />
                      </button>
                      <button onClick={() => { if (confirm('Kategorie löschen?')) deleteCat.mutate(c.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.text3, padding: 2, borderRadius: 4 }}>
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <DModal open={catModal} onClose={() => setCatModal(false)} title={editCat ? 'Kategorie bearbeiten' : 'Neue Kategorie'} width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DField label="Name">
            <DInput value={catForm.name} onChange={e => setCatForm(x => ({ ...x, name: e.target.value }))} placeholder="z. B. Software" />
          </DField>
          {!editCat && (
            <DField label="Typ">
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ id: 'income', label: 'Einnahme' }, { id: 'expense', label: 'Ausgabe' }].map(opt => (
                  <button key={opt.id} onClick={() => setCatForm(x => ({ ...x, type: opt.id }))} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${catForm.type === opt.id ? ACCENT : D.border}`, background: catForm.type === opt.id ? `${ACCENT}11` : D.card2, color: D.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </DField>
          )}
          <DField label="Farbe">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[D.green, D.blue, D.red, D.orange, D.purple, D.yellow, D.cyan, D.pink, '#9090B8'].map(col => (
                <button key={col} onClick={() => setCatForm(x => ({ ...x, color: col }))} style={{ width: 28, height: 28, borderRadius: '50%', background: col, border: catForm.color === col ? `3px solid #fff` : '3px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </DField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <DBtn variant="ghost" onClick={() => setCatModal(false)}>Abbrechen</DBtn>
            <DBtn onClick={() => saveCat.mutate(catForm)} disabled={!catForm.name}>Speichern</DBtn>
          </div>
        </div>
      </DModal>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Finance() {
  const [tab, setTab] = useState('overview');
  const [showSetup, setShowSetup] = useState(false);

  const { data: setup, isLoading: setupLoading } = useQuery({
    queryKey: ['finance-setup'],
    queryFn: financeApi.getSetup,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['finance-categories'],
    queryFn: financeApi.listCategories,
    enabled: !!setup,
  });

  const needsSetup = !setupLoading && !setup;
  const wizardVisible = needsSetup || showSetup;

  if (setupLoading) {
    return (
      <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: D.text2, fontSize: 14 }}>Laden…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: D.bg, padding: '32px 32px 64px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tabIn {
          from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
          to   { opacity: 1; transform: none; filter: none; }
        }
        .anim-grid > * { animation: cardIn 0.38s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-grid > *:nth-child(1) { animation-delay: 0ms; }
        .anim-grid > *:nth-child(2) { animation-delay: 55ms; }
        .anim-grid > *:nth-child(3) { animation-delay: 110ms; }
        .anim-grid > *:nth-child(4) { animation-delay: 165ms; }
        .anim-grid > *:nth-child(5) { animation-delay: 220ms; }
        .anim-grid > *:nth-child(6) { animation-delay: 275ms; }
        .anim-grid > *:nth-child(7) { animation-delay: 330ms; }
        .anim-grid > *:nth-child(8) { animation-delay: 385ms; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        select option { background: #0D0D1E; color: #EEEEFF; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
      `}</style>

      {wizardVisible && (
        <SetupWizard onComplete={() => setShowSetup(false)} />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Unternehmensfinanzen</p>
        <h1 style={{ margin: '0 0 4px', fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#EEEEFF 30%,rgba(52,211,153,0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>Finanzen</h1>
        <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>
          {setup ? `${setup.legal_form?.toUpperCase()} · ${setup.tax_mode === 'kleinunternehmer' ? 'Kleinunternehmer §19' : `USt ${setup.vat_rate}%`}` : 'Setup ausstehend'}
        </p>
      </div>

      {/* Tab navigation */}
      <div style={{ marginBottom: 28 }}>
        <SegCtrl tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* Tab content */}
      <div key={tab} style={{ animation: 'tabIn 0.42s cubic-bezier(0.22,1,0.36,1) both' }}>
        {tab === 'overview'     && <OverviewTab setup={setup} />}
        {tab === 'transactions' && <TransactionsTab categories={categories} setup={setup} />}
        {tab === 'tax'          && <TaxTab setup={setup} />}
        {tab === 'reports'      && <ReportsTab />}
        {tab === 'settings'     && <SettingsTab setup={setup} categories={categories} onSetupEdit={() => setShowSetup(true)} />}
      </div>
    </div>
  );
}
