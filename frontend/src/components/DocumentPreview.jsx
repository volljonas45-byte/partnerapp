import { formatCurrency, formatDate } from '../utils/formatters';

/**
 * Live scaled A4 document preview.
 *
 * Uses CSS `zoom` instead of `transform: scale` so the layout box
 * automatically resizes with the content — no outer-width tricks needed.
 *
 * Props:
 *   type      – 'invoice' | 'quote'
 *   form      – current form state
 *   clients   – full clients array
 *   settings  – user settings
 *   scale     – zoom factor (default 0.64 for sidebar, 1 for full preview)
 */

const A4_W = 595; // pt / px — matches pdf-lib page width
const A4_H = 842; // pt / px — DIN A4 height

export default function DocumentPreview({ type = 'invoice', form = {}, clients = [], settings = {}, scale = 0.64 }) {
  const client  = clients.find(c => String(c.id) === String(form.clientId)) || null;
  const primary = settings.primary_color || 'var(--color-text)';

  const items    = form.items || [];
  const pv = v => parseFloat(String(v).replace(',', '.')) || 0;
  const subtotal = items.reduce((s, i) => s + pv(i.quantity) * pv(i.unit_price), 0);
  const taxTotal = form.reverseCharge
    ? 0
    : items.reduce((s, i) => s + pv(i.quantity) * pv(i.unit_price) * (pv(i.tax_rate) / 100), 0);
  const total = subtotal + taxTotal;

  const CYCLE_ORDER  = ['once', 'yearly', 'monthly'];
  const CYCLE_LABELS = { once: 'Einmalige Leistungen', yearly: 'Jährliche Kosten', monthly: 'Monatliche Kosten' };
  const CYCLE_BADGE  = { once: null, yearly: { bg: '#EBF4FF', color: 'var(--color-blue)', text: 'Jährlich' }, monthly: { bg: '#F3EEFF', color: '#7C3AED', text: 'Monatlich' } };
  const hasMixed = items.some(i => (i.billing_cycle || 'once') !== 'once');
  const grouped  = hasMixed
    ? CYCLE_ORDER.map(c => ({ cycle: c, rows: items.filter(i => (i.billing_cycle || 'once') === c) })).filter(g => g.rows.length > 0)
    : [{ cycle: 'once', rows: items }];
  const cycleSums = {};
  items.forEach(i => { const c = i.billing_cycle || 'once'; cycleSums[c] = (cycleSums[c] || 0) + pv(i.quantity) * pv(i.unit_price); });

  const docTitle = type === 'quote'
    ? 'ANGEBOT'
    : form.invoiceType === 'abschlag' ? 'ABSCHLAGSRECHNUNG'
    : form.invoiceType === 'schluss'  ? 'SCHLUSSRECHNUNG'
    : 'RECHNUNG';

  // ── styles ──────────────────────────────────────────────────────────────────
  const lbl  = { fontSize: 7.5, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 };
  const meta = { fontSize: 8.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 };
  const bld  = { fontWeight: 600, color: 'var(--color-text)' };

  return (
    // `zoom` scales the element AND its layout box — no wrapper-width tricks needed
    <div style={{
      width: A4_W,
      minHeight: A4_H,
      zoom: scale,
      backgroundColor: '#ffffff',
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      color: 'var(--color-text)',
      padding: '44px 44px 40px',
      lineHeight: 1.4,
      boxShadow: '0 4px 28px rgba(0,0,0,0.14)',
      borderRadius: 4,
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          {settings.logo_base64 ? (
            <img src={settings.logo_base64} alt="Logo"
              style={{ maxHeight: 44, maxWidth: 120, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 15, fontWeight: 700, color: primary }}>
              {settings.company_name || 'Ihr Unternehmen'}
            </span>
          )}
        </div>
        <div style={{ ...meta, textAlign: 'right', fontSize: 8 }}>
          {settings.logo_base64 && settings.company_name && (
            <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 9, marginBottom: 2 }}>
              {settings.company_name}
            </div>
          )}
          {settings.address && <div>{settings.address}</div>}
          {(settings.postal_code || settings.city) && (
            <div>{[settings.postal_code, settings.city].filter(Boolean).join(' ')}</div>
          )}
          {settings.email && <div style={{ color: 'var(--color-text-tertiary)' }}>{settings.email}</div>}
        </div>
      </div>

      {/* ── RULE ── */}
      <div style={{ height: 1.5, backgroundColor: primary, marginBottom: 22, opacity: 0.85 }} />

      {/* ── CLIENT | DOC INFO ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div style={{ ...meta, flex: 1, minWidth: 0 }}>
          <div style={lbl}>{type === 'quote' ? 'Angebotsempfänger' : 'Rechnungsempfänger'}</div>
          {client ? (
            <>
              <div style={bld}>{client.company_name}</div>
              {client.contact_person && <div>{client.contact_person}</div>}
              {client.address        && <div>{client.address}</div>}
              {(client.postal_code || client.city) && (
                <div>{[client.postal_code, client.city].filter(Boolean).join(' ')}</div>
              )}
              {client.country && <div>{client.country}</div>}
            </>
          ) : (
            <div style={{ color: 'var(--color-border)', fontStyle: 'italic', fontSize: 8 }}>Kein Kunde ausgewählt</div>
          )}
        </div>

        <div style={{ ...meta, textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: primary, letterSpacing: '-0.01em', marginBottom: 8 }}>
            {docTitle}
          </div>
          <div>
            <span style={{ color: 'var(--color-text-tertiary)' }}>Datum: </span>
            <span style={bld}>{formatDate(form.issueDate || form.issue_date || '') || '—'}</span>
          </div>
          {type === 'invoice' ? (
            <div>
              <span style={{ color: 'var(--color-text-tertiary)' }}>Fällig: </span>
              <span style={bld}>{formatDate(form.dueDate || form.due_date || '') || '—'}</span>
            </div>
          ) : (
            <div>
              <span style={{ color: 'var(--color-text-tertiary)' }}>Gültig bis: </span>
              <span style={bld}>{formatDate(form.validUntil || form.valid_until || '') || '—'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── ITEMS TABLE ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 8.5 }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-card-secondary)', borderBottom: '1.5px solid #e5e7eb' }}>
            {[
              { h: 'Leistung', align: 'left',  w: undefined },
              { h: 'Menge',    align: 'right', w: 48 },
              { h: 'Preis',    align: 'right', w: 76 },
              { h: 'MwSt.',    align: 'right', w: 48 },
              { h: 'Betrag',   align: 'right', w: 76 },
            ].map(({ h, align, w }) => (
              <th key={h} style={{
                padding: '6px 8px', textAlign: align, fontWeight: 600,
                color: 'var(--color-text-tertiary)', fontSize: 7, textTransform: 'uppercase',
                letterSpacing: '0.05em', width: w,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '12px 8px', color: 'var(--color-border)', fontStyle: 'italic', fontSize: 8 }}>
                Noch keine Positionen
              </td>
            </tr>
          ) : grouped.map(({ cycle, rows }) => [
            // Section header row (only when mixed)
            hasMixed && (
              <tr key={`hdr-${cycle}`}>
                <td colSpan={5} style={{ padding: '5px 8px', background: '#F0F6FF', borderTop: '1px solid #D0E4FF', borderBottom: '1px solid #D0E4FF' }}>
                  <span style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--color-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {CYCLE_LABELS[cycle]}
                  </span>
                </td>
              </tr>
            ),
            // Item rows
            ...rows.map((item, idx) => (
              <tr key={`${cycle}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 1 ? 'var(--color-card-secondary)' : 'transparent' }}>
                <td style={{ padding: '7px 8px', color: 'var(--color-text)' }}>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {item.title || <span style={{ color: 'var(--color-border)' }}>—</span>}
                    {!hasMixed && CYCLE_BADGE[item.billing_cycle || 'once'] && (
                      <span style={{ fontSize: 6.5, fontWeight: 600, padding: '1px 5px', borderRadius: 99, ...CYCLE_BADGE[item.billing_cycle] }}>
                        {CYCLE_BADGE[item.billing_cycle].text}
                      </span>
                    )}
                  </div>
                  {item.title && item.description && (
                    <div style={{ fontSize: 7.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{item.description}</div>
                  )}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--color-text-tertiary)' }}>{pv(item.quantity) || 1}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--color-text-tertiary)' }}>{formatCurrency(pv(item.unit_price))}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--color-text-tertiary)' }}>
                  {form.reverseCharge ? '—' : `${pv(item.tax_rate) || 0} %`}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 500 }}>
                  {formatCurrency(pv(item.quantity) * pv(item.unit_price))}
                </td>
              </tr>
            )),
          ])}
        </tbody>
      </table>

      {/* ── KOSTENÜBERBLICK (nur bei gemischten Zyklen) ── */}
      {hasMixed && (
        <div style={{ margin: '10px 0', padding: '10px 14px', background: '#F0F6FF', border: '1px solid #C5DCFF', borderRadius: 6 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--color-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Kostenüberblick</div>
          {CYCLE_ORDER.filter(c => cycleSums[c]).map(c => (
            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, marginBottom: 3 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{c === 'once' ? 'Einmalig' : c === 'yearly' ? 'Jährlich' : 'Monatlich'}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{formatCurrency(cycleSums[c])}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── TOTALS ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ width: 210, fontSize: 8.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--color-text-tertiary)' }}>
            <span>Nettobetrag</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--color-text-tertiary)' }}>
            <span>Umsatzsteuer</span>
            <span>{form.reverseCharge ? '—' : formatCurrency(taxTotal)}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '7px 0 4px', borderTop: '1.5px solid #e5e7eb',
            fontWeight: 700, fontSize: 10, marginTop: 4,
          }}>
            <span style={{ color: 'var(--color-text)' }}>Gesamt</span>
            <span style={{ color: primary }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* ── NOTES ── */}
      {form.notes && (
        <div style={{ fontSize: 8, color: 'var(--color-text-tertiary)', borderTop: '1px solid #f3f4f6', paddingTop: 12, marginTop: 4 }}>
          {form.notes}
        </div>
      )}

      {/* ── LEGAL NOTICES ── */}
      {settings.kleinunternehmer ? (
        <div style={{ fontSize: 7.5, color: 'var(--color-text-tertiary)', marginTop: 12 }}>
          Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
        </div>
      ) : form.reverseCharge ? (
        <div style={{ fontSize: 7.5, color: 'var(--color-text-tertiary)', marginTop: 12 }}>
          Steuerschuldnerschaft des Leistungsempfängers (§13b UStG)
        </div>
      ) : null}

      {/* ── FOOTER ── */}
      {(settings.bank_name || settings.iban || settings.footer_text) && (
        <div style={{
          marginTop: 28, paddingTop: 10, borderTop: '1px solid #e5e7eb',
          fontSize: 7.5, color: 'var(--color-text-tertiary)', display: 'flex', justifyContent: 'space-between', gap: 8,
        }}>
          <div>
            {settings.bank_name && <span>{settings.bank_name}{settings.iban ? ' · ' : ''}</span>}
            {settings.iban      && <span>IBAN: {settings.iban}</span>}
          </div>
          <div>{settings.footer_text || 'Vielen Dank für Ihr Vertrauen.'}</div>
        </div>
      )}

    </div>
  );
}
