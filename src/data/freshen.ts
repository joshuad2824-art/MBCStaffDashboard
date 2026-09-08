import type { DashboardData } from './types'
import { addDays, daysBetween, parseDate, startOfToday, toIso } from '../lib/date'

/* The sample records were written around a Friday in August 2026. Left alone
   they age: wins and FYIs pass their fourteen-day archive, threads reach their
   purge, care windows close, and the board looks emptier than it will ever be
   in use — which is a poor way to meet it for the first time.

   So on a first load the whole set is slid forward as one piece. Every date
   moves by the same number of days, which keeps every relationship intact: the
   gap between a decision and its announcement, the interval between when a
   commitment was held and when it falls due, the order of a conversation.
   Nothing is invented and nothing is re-timed relative to anything else.

   The shift is a whole number of weeks so that weekdays survive it — a Sunday
   service has to stay on a Sunday.

   This runs only when there is nothing stored yet. Once anybody has used the
   board, the dates on it are theirs and are left alone. */

const SEED_EPOCH = '2026-08-28'

const DATE_FIELDS = [
  'createdAt',
  'resolvedAt',
  'lastHeld',
  'decidedOn',
  'notifiedOn',
  'openedOn',
  'lastTouchOn',
  'lastActivity',
  'editedAt',
  'startsAt',
  'serviceDate',
  'updatedAt',
] as const

function shiftIso(value: unknown, days: number): unknown {
  if (typeof value !== 'string') return value
  const date = parseDate(value)
  if (!date || toIso(date) !== value) return value
  return toIso(addDays(date, days))
}

function shiftDeep<T>(value: T, days: number): T {
  if (Array.isArray(value)) return value.map((item) => shiftDeep(item, days)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = { ...(value as Record<string, unknown>) }
    for (const [key, inner] of Object.entries(out)) {
      out[key] = (DATE_FIELDS as readonly string[]).includes(key)
        ? shiftIso(inner, days)
        : shiftDeep(inner, days)
    }
    return out as T
  }
  return value
}

/** Whole weeks, and never so far that a record written in the past lands in
    the future. */
export function shiftDays(today: Date): number {
  const epoch = parseDate(SEED_EPOCH)
  if (!epoch) return 0
  const elapsed = daysBetween(epoch, today)
  if (elapsed <= 0) return 0
  return Math.floor(elapsed / 7) * 7
}

function label(date: Date): string {
  return date.getMonth() + 1 + '.' + String(date.getDate()).padStart(2, '0')
}

/** "8.30" is a month and a day with no year; read it against the seed's own. */
function shiftLabel(value: string, days: number): Date | null {
  const match = /^(\d{1,2})\.(\d{1,2})$/.exec(value.trim())
  if (!match) return null
  const epoch = parseDate(SEED_EPOCH)
  if (!epoch) return null
  const original = new Date(epoch.getFullYear(), Number(match[1]) - 1, Number(match[2]))
  // A bulletin that runs into January would have been written the year before.
  if (original.getTime() < epoch.getTime() - 90 * 86400000) original.setFullYear(epoch.getFullYear() + 1)
  return addDays(original, days)
}

export function freshenSeed(data: DashboardData, today = startOfToday()): DashboardData {
  const days = shiftDays(today)
  if (days === 0) return data

  const shifted = shiftDeep(data, days)

  /* The Coming Up block carries its own short date labels. A line pulled from
     the calendar is relabelled from the event it points at; a line typed by
     hand has only its "M.DD" string, so that slides by the same number of days
     as everything else. Either way the issue keeps agreeing with itself and
     with the calendar — which is the whole point of the block. */
  const weeks = shifted.weeks.map((week) => ({
    ...week,
    bulletinEvents: week.bulletinEvents.map((line) => {
      const event = line.eventId === null ? null : shifted.events.find((e) => e.id === line.eventId)
      const date = event ? parseDate(event.startsAt) : shiftLabel(line.date, days)
      return date ? { ...line, date: label(date) } : line
    }),
  }))

  return { ...shifted, weeks }
}
