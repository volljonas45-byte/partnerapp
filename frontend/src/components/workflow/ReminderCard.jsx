import { Bell, Check, Trash2 } from 'lucide-react';

export default function ReminderCard({ reminder, onDone, onDelete, onClick }) {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const dueDate  = new Date(reminder.due_date); dueDate.setHours(0, 0, 0, 0);
  const isToday  = dueDate.getTime() === today.getTime();
  const isOverdue = dueDate < today;

  const dateLabel = isOverdue
    ? `Überfällig seit ${dueDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`
    : isToday
    ? 'Heute fällig'
    : `Fällig am ${dueDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`;

  const accent = isOverdue ? '#FF3B30' : isToday ? '#FF9500' : '#BF5AF2';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '12px',
        background: isOverdue ? '#FFF5F5' : isToday ? '#FFF9F0' : '#FAF5FF',
        borderLeft: `3px solid ${accent}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity 0.1s',
      }}
    >
      <Bell size={14} color={accent} style={{ flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#1D1D1F',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {reminder.title}
        </div>
        <div style={{ fontSize: '11px', color: accent, marginTop: '1px', fontWeight: 500 }}>
          {dateLabel}
          {reminder.project_name && (
            <span style={{ color: '#8E8E93', fontWeight: 400 }}>
              {' · '}{reminder.project_name}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {onDone && (
          <button
            onClick={e => { e.stopPropagation(); onDone(); }}
            title="Erledigt"
            style={{
              width: '26px', height: '26px',
              borderRadius: '8px',
              border: 'none',
              background: '#34C75920',
              color: '#34C759',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
          >
            <Check size={13} strokeWidth={2.5} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Löschen"
            style={{
              width: '26px', height: '26px',
              borderRadius: '8px',
              border: 'none',
              background: '#FF3B3010',
              color: '#FF3B30',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
