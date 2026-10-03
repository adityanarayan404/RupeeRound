export { formatPaise } from '@rupeeround/shared'

const dayMonth = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' })

/** "01 Oct" from an ISO date or yyyy-mm-dd. */
export function formatShortDate(value: string): string {
  return dayMonth.format(parseDate(value))
}

export function formatLongDate(value: string): string {
  return dayMonthYear.format(parseDate(value))
}

export function formatTime(value: string): string {
  return time.format(new Date(value))
}

/** yyyy-mm-dd is a calendar date; parse it as local midnight, not UTC. */
function parseDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** "Today", "Yesterday" or "28 Sep". */
export function formatDayLabel(value: string): string {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (localDayKey(date) === localDayKey(today)) return 'Today'
  if (localDayKey(date) === localDayKey(yesterday)) return 'Yesterday'
  return dayMonth.format(date)
}

export function dayKey(value: string): string {
  return localDayKey(new Date(value))
}

export function formatPercent(fraction: number, signed = false): string {
  const value = `${(Math.abs(fraction) * 100).toFixed(Math.abs(fraction) < 0.1 ? 2 : 1)}%`
  if (!signed) return value
  return `${fraction >= 0 ? '+' : '−'}${value}`
}

export function formatNav(nav: number): string {
  return `₹${nav.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** "+91 98765 43210" */
export function formatPhone(phone: string): string {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name
}

export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function daysUntil(isoDate: string): number {
  const target = parseDate(isoDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** Keeps only digits and one decimal point with up to 2 decimals, for amount inputs. */
export function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [whole = '', ...rest] = cleaned.split('.')
  const trimmedWhole = whole.replace(/^0+(?=\d)/, '').slice(0, 7)
  if (rest.length === 0) return trimmedWhole
  return `${trimmedWhole || '0'}.${rest.join('').slice(0, 2)}`
}
