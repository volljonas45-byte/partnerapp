const STATUS = {
  neu:             { label: 'Neu',             color: '#86868B', bg: 'rgba(118,118,128,0.1)' },
  anrufen:         { label: 'Anrufen',         color: '#0071E3', bg: 'rgba(0,113,227,0.1)' },
  follow_up:       { label: 'Follow Up',       color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  interessiert:    { label: 'Interessiert',    color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  demo:            { label: 'Demo geplant',    color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
  gewonnen:        { label: 'Gewonnen',        color: '#00C853', bg: 'rgba(0,200,83,0.12)' },
  abgeschlossen:   { label: 'Gewonnen',        color: '#00C853', bg: 'rgba(0,200,83,0.12)' },
  kein_interesse:  { label: 'Kein Interesse',  color: '#FF3B30', bg: 'rgba(255,59,48,0.1)' },
  spaeter:         { label: 'Später',          color: '#8E8E93', bg: 'rgba(142,142,147,0.1)' },
  verloren:        { label: 'Verloren',        color: '#636366', bg: 'rgba(99,99,102,0.1)' },
};

export { STATUS as LEAD_STATUSES };

export default function LeadStatusBadge({ status }) {
  const s = STATUS[status] || STATUS.neu;
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}
