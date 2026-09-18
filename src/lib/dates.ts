const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const full = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

/** "12 Mar" this year, "12 Mar 2025" otherwise. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.getFullYear() === new Date().getFullYear() ? dayMonth.format(date) : dayMonthYear.format(date)
}

export function formatDateTime(iso: string): string {
  return full.format(new Date(iso))
}
