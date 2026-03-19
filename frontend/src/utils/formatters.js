/** Format a number as currency (EUR by default) */
export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/** Format an ISO date string to DD.MM.YYYY */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00'); // Avoid timezone shifts
  return d.toLocaleDateString('de-DE');
}

/** Returns today's date as YYYY-MM-DD */
export function today() {
  return new Date().toISOString().split('T')[0];
}

/** Add N days to a YYYY-MM-DD string and return YYYY-MM-DD */
export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Check if a date string is in the past */
export function isPast(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(today());
}
