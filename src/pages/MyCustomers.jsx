import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2, CheckCircle2, Clock, XCircle, CalendarDays,
  Mail, Phone, MessageSquare, TrendingUp, Euro, Globe, ExternalLink,
} from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  accent: '#E07A00', accentL: 'rgba(224,122,0,0.12)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
  orange: '#E07A00', orangeL: 'rgba(224,122,0,0.12)',
  red: '#FF453A', redL: 'rgba(255,69,58,0.12)',
  purple: '#BF5AF2', purpleL: 'rgba(191,90,242,0.12)',
  border: 'rgba(255,255,255,0.06)',
  borderSubtle: 'rgba(255,255,255,0.04)',
};

const STATUS_INFO = {
  anrufen:        { label: 'In Prüfung — wir melden uns bald',                color: D.accent,   bg: D.accentL,   Icon: Clock },
  kontaktiert:    { label: 'In Prüfung — wir melden uns bald',                color: D.accent,   bg: D.accentL,   Icon: Clock },
  termin_gesetzt: { label: 'Demo-Termin vereinbart — Projekt wird vorbereitet', color: D.purple, bg: D.purpleL, Icon: CalendarDays },
  gewonnen:       { label: 'Projekt gewonnen! Provision wird ausgezahlt.',      color: D.green,  bg: D.greenL,  Icon: CheckCircle2 },
  verloren:       { label: 'Kein Abschluss bei diesem Lead',                   color: D.red,    bg: D.redL,    Icon: XCircle },
};

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtEur(n) {
  if (!n) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

// ── Milestone Timeline ────────────────────────────────────────────────────────

function MilestoneTimeline({ milestones }) {
  if (!milestones || milestones.length === 0) return null;
  const total = milestones.length;
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content', gap: 0 }}>
        {milestones.map((m, i) => {
          const isLast = i === total - 1;
          const color  = m.done ? D.green : D.border;
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 80 }}>
                {/* Circle */}
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${color}`,
                  background: m.done ? D.greenL : 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                }}>
                  {m.done
                    ? <CheckCircle2 size={13} color={D.green} />
                    : <div style={{ width: 6, height: 6, borderRadius: '50%', background: D.border }} />}
                </div>
                {/* Label */}
                <span style={{
                  fontSize: 10, fontWeight: m.done ? 700 : 400,
                  color: m.done ? D.green : D.text3,
                  textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap',
                }}>{m.label}</span>
                {/* Date */}
                {m.done && m.done_at && (
                  <span style={{ fontSize: 9, color: D.text3, textAlign: 'center' }}>
                    {fmtDate(m.done_at)}
                  </span>
                )}
              </div>
              {/* Connector */}
              {!isLast && (
                <div style={{
                  width: 28, height: 2, background: m.done ? D.green : D.borderSubtle,
                  marginTop: 12, flexShrink: 0, borderRadius: 99,
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary badge ─────────────────────────────────────────────────────────────

function Badge({ label, value, color, bg }) {
  if (!value) return null;
  return (
    <div style={{ padding: '6px 12px', borderRadius: 8, background: bg, border: `1px solid ${color}25`, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyCustomers() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['my-customers'],
    queryFn: partnerApi.listCustomers,
    refetchInterval: 30000,
  });

  const { data: me } = useQuery({ queryKey: ['partner-me'], queryFn: partnerApi.me });

  const totals = customers.reduce((acc, c) => {
    acc.count++;
    if (c.agreed_budget) acc.budget += parseFloat(c.agreed_budget);
    else if (c.deal_value) acc.budget += parseFloat(c.deal_value);
    if (c.status === 'gewonnen') acc.won++;
    if (c.commission_amount) acc.commission += parseFloat(c.commission_amount);
    return acc;
  }, { count: 0, budget: 0, won: 0, commission: 0 });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 820, margin: '0 auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>
          Übersicht
        </p>
        <h1 style={{
          margin: '0 0 4px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Meine Kunden</h1>
        <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>
          Alle Projekte die du über den Demo-Wizard eingereicht hast
        </p>
      </motion.div>

      {/* Summary row */}
      {customers.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <Badge label="Kunden gesamt" value={totals.count} color={D.accent} bg={D.accentL} />
          <Badge label="Gewonnen" value={totals.won || null} color={D.green} bg={D.greenL} />
          {totals.budget > 0 && <Badge label="Projektvolumen" value={fmtEur(totals.budget)} color={D.orange} bg={D.orangeL} />}
          {totals.commission > 0 && <Badge label="Meine Provision" value={fmtEur(totals.commission)} color={D.purple} bg={D.purpleL} />}
        </motion.div>
      )}

      {/* Customer cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: D.text3 }}>Laden...</div>
      ) : customers.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '64px 24px',
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${D.border}`, borderRadius: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: D.accentL,
            border: `1px solid rgba(224,122,0,0.3)`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px' }}>
            <Building2 size={26} color={D.accent} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: D.text, margin: '0 0 8px' }}>
            Noch keine Kunden eingereicht
          </h3>
          <p style={{ fontSize: 13, color: D.text3, margin: 0, lineHeight: 1.6 }}>
            Starte den Demo-Wizard über einen Lead in "Meine Leads"
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {customers.map((c, i) => {
            const info         = STATUS_INFO[c.status] || STATUS_INFO.anrufen;
            const StatusIcon   = info.Icon;
            const isWon        = c.status === 'gewonnen';
            const isLost       = c.status === 'verloren';
            const budget       = c.agreed_budget ? parseFloat(c.agreed_budget) : c.deal_value ? parseFloat(c.deal_value) : null;
            const budgetLabel  = c.agreed_budget ? 'Vereinbartes Budget' : 'Geschätzter Projektwert';
            const commission   = c.commission_amount ? parseFloat(c.commission_amount)
                               : (budget && c.commission_rate_pct) ? budget * (c.commission_rate_pct / 100) : null;
            const milestones   = Array.isArray(c.milestones) ? c.milestones
                               : (c.milestones ? (() => { try { return JSON.parse(c.milestones); } catch { return []; } })() : []);

            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  padding: '20px 22px',
                  background: isWon ? 'rgba(52,211,153,0.03)' : isLost ? 'rgba(255,69,58,0.02)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isWon ? 'rgba(52,211,153,0.18)' : isLost ? 'rgba(255,69,58,0.12)' : D.border}`,
                  borderRadius: 16,
                }}>

                {/* ── Card header ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: D.text, marginBottom: 3 }}>{c.company}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {c.contact_person && <span style={{ fontSize: 12, color: D.text2 }}>{c.contact_person}</span>}
                      {c.city && <span style={{ fontSize: 12, color: D.text3 }}>{c.city}</span>}
                      {c.industry && <span style={{ fontSize: 12, color: D.text3 }}>{c.industry}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: D.text3 }}>Eingereicht</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: D.text2 }}>{fmtDate(c.created_at)}</div>
                  </div>
                </div>

                {/* ── Milestone timeline ── */}
                {milestones.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <MilestoneTimeline milestones={milestones} />
                  </div>
                )}

                {/* ── Status badge ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 9, background: info.bg,
                  width: 'fit-content', marginBottom: 14 }}>
                  <StatusIcon size={13} color={info.color} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: info.color }}>{info.label}</span>
                </div>

                {/* ── Value + links row ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  paddingTop: 12, borderTop: `1px solid ${D.borderSubtle}` }}>

                  {budget && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                      borderRadius: 8, background: c.agreed_budget ? D.greenL : D.orangeL,
                      border: `1px solid ${c.agreed_budget ? 'rgba(52,211,153,0.25)' : 'rgba(224,122,0,0.25)'}` }}>
                      <Euro size={12} color={c.agreed_budget ? D.green : D.orange} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: c.agreed_budget ? D.green : D.orange }}>
                        {budgetLabel}: {fmtEur(budget)}
                      </span>
                    </div>
                  )}

                  {commission && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                      borderRadius: 8, background: isWon ? D.purpleL : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isWon ? 'rgba(191,90,242,0.25)' : D.border}` }}>
                      <TrendingUp size={12} color={isWon ? D.purple : D.text3} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: isWon ? D.purple : D.text3 }}>
                        {c.commission_rate_pct ? `${c.commission_rate_pct}% · ` : ''}Provision: {fmtEur(commission)}
                      </span>
                    </div>
                  )}

                  <div style={{ flex: 1 }} />

                  {c.demo_link && (
                    <a href={c.demo_link} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                        borderRadius: 8, background: D.accentL, border: `1px solid rgba(224,122,0,0.3)`,
                        color: D.accent, fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
                      <ExternalLink size={12} /> Demo ansehen
                    </a>
                  )}

                  {c.phone && (
                    <a href={`tel:${c.phone}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: D.text3, textDecoration: 'none' }}>
                      <Phone size={11} /> {c.phone}
                    </a>
                  )}
                  {c.website && (
                    <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: D.accent, textDecoration: 'none' }}>
                      <Globe size={11} /> Website
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Contact block */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ marginTop: 32, padding: '22px 24px',
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${D.border}`, borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <MessageSquare size={16} color={D.accent} />
          <span style={{ fontSize: 14, fontWeight: 700, color: D.text }}>Fragen? Wir sind immer für dich da</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {me?.ws_email && (
            <a href={`mailto:${me.ws_email}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
                background: D.accentL, border: `1px solid rgba(224,122,0,0.25)`,
                color: D.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <Mail size={13} /> {me.ws_email}
            </a>
          )}
          {me?.ws_phone && (
            <a href={`tel:${me.ws_phone}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
                background: D.greenL, border: `1px solid rgba(52,211,153,0.25)`,
                color: D.green, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <Phone size={13} /> {me.ws_phone}
            </a>
          )}
          <button onClick={() => window.open('https://discord.gg/gWMEVa7PNR', '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
              background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.25)',
              color: '#7289DA', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Discord beitreten →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
