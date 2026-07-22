/**
 * Formats an ISO date string into a readable Arabic date, e.g. "22 يوليو 2026".
 * `calendar: 'gregory'` is forced explicitly so the output stays consistent
 * regardless of the visitor's OS/locale settings (some Arabic locales default
 * to the Hijri calendar, which would not match the date the post was saved with).
 */
export function formatDate(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: 'gregory',
  }).format(date)
}
