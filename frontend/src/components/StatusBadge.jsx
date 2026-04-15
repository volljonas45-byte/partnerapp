import { useTheme } from '../context/ThemeContext';

const STATUS_MAP = {
  draft:     { label: 'Entwurf',       color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
  sent:      { label: 'Gesendet',      color: 'var(--color-blue)', bg: 'rgba(0,122,255,0.08)'   },
  paid:      { label: 'Bezahlt',       color: '#34C759', bg: 'rgba(52,199,89,0.08)'   },
  unpaid:    { label: 'Offen',         color: '#FF9500', bg: 'rgba(255,149,0,0.08)'   },
  overdue:   { label: 'Überfällig',    color: '#FF3B30', bg: 'rgba(255,59,48,0.08)'   },
  cancelled: { label: 'Storniert',     color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
  accepted:  { label: 'Akzeptiert',    color: '#34C759', bg: 'rgba(52,199,89,0.08)'   },
  rejected:  { label: 'Abgelehnt',     color: '#FF3B30', bg: 'rgba(255,59,48,0.08)'   },
  expired:   { label: 'Abgelaufen',    color: '#FF9500', bg: 'rgba(255,149,0,0.08)'   },
  converted: { label: 'Umgewandelt',   color: '#AF52DE', bg: 'rgba(175,82,222,0.08)'  },
  planned:   { label: 'Geplant',       color: 'var(--color-text-secondary)', bg: 'rgba(142,142,147,0.10)' },
  active:    { label: 'Aktiv',         color: 'var(--color-blue)', bg: 'rgba(0,122,255,0.08)'   },
  waiting:   { label: 'Wartend',       color: '#FF9500', bg: 'rgba(255,149,0,0.08)'   },
  completed: { label: 'Abgeschlossen', color: '#34C759', bg: 'rgba(52,199,89,0.08)'   },
};

const STATUS_MAP_DARK = {
  draft:     { color: '#98989D', bg: 'rgba(152,152,157,0.12)' },
  sent:      { color: '#0A84FF', bg: 'rgba(10,132,255,0.12)'  },
  paid:      { color: '#30D158', bg: 'rgba(48,209,88,0.12)'   },
  unpaid:    { color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)'  },
  overdue:   { color: '#FF453A', bg: 'rgba(255,69,58,0.12)'   },
  cancelled: { color: '#98989D', bg: 'rgba(152,152,157,0.12)' },
  accepted:  { color: '#30D158', bg: 'rgba(48,209,88,0.12)'   },
  rejected:  { color: '#FF453A', bg: 'rgba(255,69,58,0.12)'   },
  expired:   { color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)'  },
  converted: { color: '#BF5AF2', bg: 'rgba(191,90,242,0.12)'  },
  planned:   { color: '#98989D', bg: 'rgba(152,152,157,0.12)' },
  active:    { color: '#0A84FF', bg: 'rgba(10,132,255,0.12)'  },
  waiting:   { color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)'  },
  completed: { color: '#30D158', bg: 'rgba(48,209,88,0.12)'   },
};

export default function StatusBadge({ status }) {
  const { isDark } = useTheme();
  const light = STATUS_MAP[status] || STATUS_MAP.draft;
  const dark = STATUS_MAP_DARK[status] || STATUS_MAP_DARK.draft;
  const s = isDark ? { ...light, ...dark } : light;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '2px 10px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: '-0.006em',
      color: s.color,
      background: s.bg,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: s.color, flexShrink: 0,
      }} />
      {light.label || status}
    </span>
  );
}
