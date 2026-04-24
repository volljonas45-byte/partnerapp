import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, Clock, XCircle, CalendarDays, Mail, Phone, MessageSquare } from 'lucide-react';
import { partnerApi } from '../api/partner';

const D = {
  text: '#F2F2F7', text2: '#AEAEB2', text3: '#636366',
  blue: '#5B8CF5', blueL: 'rgba(91,140,245,0.12)',
  green: '#34D399', greenL: 'rgba(52,211,153,0.12)',
  orange: '#FF9F0A', orangeL: 'rgba(255,159,10,0.12)',
  red: '#FF453A', redL: 'rgba(255,69,58,0.12)',
  purple: '#BF5AF2', purpleL: 'rgba(191,90,242,0.12)',
  border: 'rgba(255,255,255,0.06)',
};

const STATUS_INFO = {
  anrufen:        { label: 'In Bearbeitung — wir melden uns bald',           color: D.blue,   bg: D.blueL,   Icon: Clock },
  kontaktiert:    { label: 'In Bearbeitung — wir melden uns bald',           color: D.blue,   bg: D.blueL,   Icon: Clock },
  termin_gesetzt: { label: 'Demo-Termin vereinbart — wird vorbereitet',      color: D.purple, bg: D.purpleL, Icon: CalendarDays },
  gewonnen:       { label: 'Kunde hat zugesagt! Provision wird ausgezahlt.', color: D.green,  bg: D.greenL,  Icon: CheckCircle2 },
  verloren:       { label: 'Leider kein Abschluss bei diesem Lead',          color: D.red,    bg: D.redL,    Icon: XCircle },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtEur(n) {
  if (!n) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function MyCustomers() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['my-customers'],
    queryFn: partnerApi.listCustomers,
    refetchInterval: 60000,
  });

  const { data: me } = useQuery({
    queryKey: ['partner-me'],
    queryFn: partnerApi.me,
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 760, margin: '0 auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>
          Übersicht
        </p>
        <h1 style={{
          margin: '0 0 4px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Meine Kunden</h1>
        <p style={{ margin: 0, fontSize: 13, color: D.text3 }}>
          Alle Leads die du über den Demo-Wizard eingereicht hast
        </p>
      </motion.div>

      {/* Customer list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: D.text3 }}>Laden...</div>
      ) : customers.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '64px 24px',
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${D.border}`, borderRadius: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: D.blueL,
            border: `1px solid rgba(91,140,245,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Building2 size={26} color={D.blue} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: D.text, margin: '0 0 8px' }}>
            Noch keine Kunden eingereicht
          </h3>
          <p style={{ fontSize: 13, color: D.text3, margin: 0, lineHeight: 1.6 }}>
            Starte den Demo-Wizard über einen Lead in "Meine Leads"
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {customers.map((c, i) => {
            const info = STATUS_INFO[c.status] || STATUS_INFO.anrufen;
            const StatusIcon = info.Icon;
            const isWon = c.status === 'gewonnen';
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  padding: '18px 20px',
                  background: isWon ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isWon ? 'rgba(52,211,153,0.2)' : D.border}`,
                  borderRadius: 14,
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: D.text, marginBottom: 4 }}>
                      {c.company}
                    </div>
                    {(c.city || c.industry) && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {c.city && <span style={{ fontSize: 11.5, color: D.text3 }}>{c.city}</span>}
                        {c.city && c.industry && <span style={{ fontSize: 11.5, color: D.text3 }}>·</span>}
                        {c.industry && <span style={{ fontSize: 11.5, color: D.text3 }}>{c.industry}</span>}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 8, background: info.bg, width: 'fit-content' }}>
                      <StatusIcon size={13} color={info.color} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: info.color }}>{info.label}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isWon && c.commission_amount && (
                      <div style={{ padding: '4px 10px', borderRadius: 8, background: D.greenL,
                        border: '1px solid rgba(52,211,153,0.2)', marginBottom: 6 }}>
                        <div style={{ fontSize: 11.5, color: D.green, fontWeight: 700 }}>
                          {c.commission_rate_pct ? `${c.commission_rate_pct}% · ` : ''}{fmtEur(c.commission_amount)}
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: D.text3 }}>{fmtDate(c.created_at)}</div>
                  </div>
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
          <MessageSquare size={16} color={D.blue} />
          <span style={{ fontSize: 14, fontWeight: 700, color: D.text }}>Fragen? Wir sind immer für dich da</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {me?.ws_email && (
            <a href={`mailto:${me.ws_email}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
                background: D.blueL, border: `1px solid rgba(91,140,245,0.25)`,
                color: D.blue, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
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
