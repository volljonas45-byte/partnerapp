const STATUS = {
  neu:              { label: 'Neu',             color: '#86868B', bg: 'rgba(118,118,128,0.1)' },
  interessiert:     { label: 'Interessiert',    color: '#0071E3', bg: 'rgba(0,113,227,0.1)' },
  kein_interesse:   { label: 'Kein Interesse',  color: '#FF3B30', bg: 'rgba(255,59,48,0.1)' },
  spaeter:          { label: 'Später',          color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  abgeschlossen:    { label: 'Abgeschlossen',   color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
  verloren:         { label: 'Verloren',        color: '#636366', bg: 'rgba(99,99,102,0.1)' },
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
