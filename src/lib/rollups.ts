import { CARE_TYPES } from '../data/seed'
import type { CadenceItem, CareEntry, DashboardData } from '../data/types'
import { careDueBy, deriveCadence, firstName, isUnclaimed, noticeGap, staffName } from './derive'
import { daysBetween, formatShort, parseDate } from './date'

/* Roll-ups shared by Today, the Huddle's "Due next" column and present mode.
   They are all derived from the same records the other surfaces show — there is
   no roll-up table and there are no stored notifications. */

export type DueKind = 'due' | 'announce' | 'care'

export interface DueRow {
  key: string
  kind: DueKind
  date: Date
  label: string
  meta: string
  unclaimed: boolean
}

export function unclaimedCount(cadence: CadenceItem[]): number {
  return cadence.filter(isUnclaimed).length
}

export function openCare(care: CareEntry[]): CareEntry[] {
  return care.filter((entry) => entry.status !== 'closed')
}

export function carePastWindow(care: CareEntry[], today: Date): CareEntry[] {
  return openCare(care).filter((entry) => {
    const due = careDueBy(entry)
    return due !== null && daysBetween(today, due) < 0
  })
}

export function unannouncedNotices(data: DashboardData) {
  return data.notices.filter((notice) => notice.notifiedOn === null)
}

/** Cadence items and care windows entering their window inside `days` days. */
export function dueWithin(data: DashboardData, today: Date, days: number, viewAsStaff: boolean): DueRow[] {
  const rows: DueRow[] = []

  for (const item of data.cadence) {
    const { nextDue, announceBy } = deriveCadence(item)
    const owner = staffName(data.staff, item.ownerId)
    if (nextDue) {
      const away = daysBetween(today, nextDue)
      if (away >= 0 && away <= days) {
        rows.push({
          key: 'due-' + item.id,
          kind: 'due',
          date: nextDue,
          label: item.name,
          meta: owner + ' · ' + item.ministry,
          unclaimed: isUnclaimed(item),
        })
      }
    }
    if (announceBy) {
      const away = daysBetween(today, announceBy)
      if (away >= 0 && away <= days) {
        rows.push({
          key: 'announce-' + item.id,
          kind: 'announce',
          date: announceBy,
          label: 'Announce by — ' + item.name,
          meta: owner + ' · ' + item.noticeDays + '-day notice',
          unclaimed: isUnclaimed(item),
        })
      }
    }
  }

  // Care windows carry a person's name, so they are staff-role only and the
  // sensitive ones show a first name even there.
  if (viewAsStaff) {
    for (const entry of openCare(data.care)) {
      const due = careDueBy(entry)
      if (!due) continue
      const away = daysBetween(today, due)
      if (away < 0 || away > days) continue
      const person = entry.sensitive ? firstName(entry.person) : entry.person
      rows.push({
        key: 'care-' + entry.id,
        kind: 'care',
        date: due,
        label: person + ' — ' + entry.type,
        meta: staffName(data.staff, entry.ownerId) + ' · ' + (CARE_TYPES.find((t) => t.name === entry.type)?.window ?? ''),
        unclaimed: entry.ownerId === null,
      })
    }
  }

  return rows.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Median notice gap by month, oldest first. */
export function medianGapByMonth(data: DashboardData): { month: string; label: string; median: number | null }[] {
  const buckets = new Map<string, number[]>()
  for (const notice of data.notices) {
    const decided = parseDate(notice.decidedOn)
    const gap = noticeGap(notice)
    if (!decided || gap === null) continue
    const key = decided.getFullYear() + '-' + String(decided.getMonth() + 1).padStart(2, '0')
    buckets.set(key, [...(buckets.get(key) ?? []), gap])
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, gaps]) => {
      const sorted = [...gaps].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      const [year, monthNumber] = month.split('-').map(Number)
      return {
        month,
        label: new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
        median: Math.round(value * 10) / 10,
      }
    })
}

/** The next thing on the calendar: a standing service or an entered event. */
export function describeDue(row: DueRow): string {
  const prefix = row.kind === 'due' ? 'Due' : row.kind === 'announce' ? 'Notice' : 'Care'
  return prefix + ' · ' + formatShort(row.date)
}
