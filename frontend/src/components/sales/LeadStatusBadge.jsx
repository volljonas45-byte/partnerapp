const STATUS = {
  neu:             { label: 'Neu',             color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
  anrufen:         { label: 'Anrufen',         color: 'var(--color-blue)', bg: 'rgba(0,122,255,0.08)' },
  follow_up:       { label: 'Follow Up',       color: '#FF9500', bg: 'rgba(255,149,0,0.08)' },
  interessiert:    { label: 'Interessiert',    color: '#AF52DE', bg: 'rgba(175,82,222,0.08)' },
  demo:            { label: 'Demo geplant',    color: '#34C759', bg: 'rgba(52,199,89,0.08)' },
  gewonnen:        { label: 'Gewonnen',        color: '#34C759', bg: 'rgba(52,199,89,0.08)' },
  abgeschlossen:   { label: 'Gewonnen',        color: '#34C759', bg: 'rgba(52,199,89,0.08)' },
  kein_interesse:  { label: 'Kein Interesse',  color: '#FF3B30', bg: 'rgba(255,59,48,0.08)' },
  spaeter:         { label: 'Später',          color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
  verloren:        { label: 'Verloren',        color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
  nicht_existent:  { label: 'Existiert nicht mehr', color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
};

export { STATUS as LEAD_STATUSES };

export default function LeadStatusBadge({ status }) {
  const s = STATUS[status] || STATUS.neu;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
      letterSpacing: '-0.006em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}
