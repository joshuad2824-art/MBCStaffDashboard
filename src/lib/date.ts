/* Dates are handled as local-midnight Date objects built from 'YYYY-MM-DD'
   strings. Never `new Date('2026-08-28')` — that parses as UTC and lands on the
   day before for anyone west of Greenwich, which is all of Tulsa. */

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const [y, m, d] = String(value).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function toIso(date: Date): string {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  )
}

export function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function todayIso(): string {
  return toIso(startOfToday())
}

export function addDays(date: Date, n: number): Date {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + n)
  return next
}

export function addMonths(date: Date, n: number): Date {
  const next = new Date(date.getTime())
  next.setMonth(next.getMonth() + n)
  return next
}

/** Whole days from a to b. Positive when b is later. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

export function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

export function formatShort(date: Date | null): string {
  return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
}

export function formatLong(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function countDays(n: number): string {
  return n + (Math.abs(n) === 1 ? ' day' : ' days')
}

/** "today" / "in 3 days" / "6 days ago", measured from `from`. */
export function relativeDay(date: Date, from: Date): string {
  const n = daysBetween(from, date)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? 'in ' + countDays(n) : countDays(Math.abs(n)) + ' ago'
}

export function monthKey(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
}
