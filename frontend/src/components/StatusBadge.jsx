/** Colored pill with dot indicator for invoice and quote statuses */
export default function StatusBadge({ status }) {
  const variants = {
    // Invoice statuses
    draft:     'bg-gray-100   text-gray-600   ring-gray-200',
    sent:      'bg-blue-50    text-blue-700   ring-blue-200',
    paid:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
    unpaid:    'bg-amber-50   text-amber-700  ring-amber-200',
    overdue:   'bg-red-50     text-red-700    ring-red-200',
    cancelled: 'bg-zinc-100   text-zinc-500   ring-zinc-200',
    // Quote statuses
    accepted:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected:  'bg-red-50     text-red-700    ring-red-200',
    expired:   'bg-orange-50  text-orange-700 ring-orange-200',
    converted: 'bg-purple-50  text-purple-700 ring-purple-200',
    // Project statuses
    planned:   'bg-gray-100   text-gray-600   ring-gray-200',
    active:    'bg-blue-50    text-blue-700   ring-blue-200',
    waiting:   'bg-amber-50   text-amber-700  ring-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  };

  const dots = {
    draft:     'bg-gray-400',
    sent:      'bg-blue-500',
    paid:      'bg-emerald-500',
    unpaid:    'bg-amber-500',
    overdue:   'bg-red-500',
    cancelled: 'bg-zinc-400',
    accepted:  'bg-emerald-500',
    rejected:  'bg-red-500',
    expired:   'bg-orange-500',
    converted: 'bg-purple-500',
    planned:   'bg-gray-400',
    active:    'bg-blue-500',
    waiting:   'bg-amber-500',
    completed: 'bg-emerald-500',
  };

  const labels = {
    draft:     'Entwurf',
    sent:      'Gesendet',
    paid:      'Bezahlt',
    unpaid:    'Offen',
    overdue:   'Überfällig',
    cancelled: 'Storniert',
    accepted:  'Akzeptiert',
    rejected:  'Abgelehnt',
    expired:   'Abgelaufen',
    converted: 'Umgewandelt',
    planned:   'Geplant',
    active:    'Aktiv',
    waiting:   'Wartend',
    completed: 'Abgeschlossen',
  };

  const cls    = variants[status] || 'bg-gray-100 text-gray-600 ring-gray-200';
  const dotCls = dots[status]     || 'bg-gray-400';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
      {labels[status] || status}
    </span>
  );
}
