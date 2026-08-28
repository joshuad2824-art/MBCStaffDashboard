import { STANDING_SERVICES } from '../data/seed'
import type { DashboardData } from '../data/types'
import { careDueBy, deriveCadence, firstName, staffName } from './derive'
import { addDays, sameDay, toIso } from './date'

/* One day cell aggregates four sources. The colour encodes which one, since the
   brand has no icons to do it: standing services in sage, entered events in
   heading ink, cadence due and announce-by dates in lamplight, care response
   windows in bark. */

export type CalendarSource = 'service' | 'event' | 'cadence' | 'care'

export interface CalendarItem {
  key: string
  source: CalendarSource
  /** "9:15 AM", or "Due" / "Notice" / "Care" for the derived rows. */
  slot: string
  label: string
  meta: string
}

const COLOURS: Record<CalendarSource, string> = {
  service: 'var(--mbc-yale-sage)',
  event: 'var(--text-heading)',
  cadence: 'var(--mbc-lamplight)',
  care: 'var(--mbc-bark)',
}

export function itemColour(source: CalendarSource): string {
  return COLOURS[source]
}

export function itemsForDay(data: DashboardData, day: Date, includeCare: boolean): CalendarItem[] {
  const iso = toIso(day)
  const items: CalendarItem[] = []

  for (const service of STANDING_SERVICES) {
    if (service.weekday === day.getDay()) {
      items.push({
        key: 'service-' + iso + '-' + service.name,
        source: 'service',
        slot: service.time,
        label: service.name,
        meta: 'Standing',
      })
    }
  }

  for (const event of data.events) {
    if (event.startsAt === iso) {
      items.push({
        key: 'event-' + event.id,
        source: 'event',
        slot: event.time,
        label: event.name,
        meta: event.location + ' · ' + event.ministry,
      })
    }
  }

  for (const item of data.cadence) {
    const { nextDue, announceBy } = deriveCadence(item)
    const owner = staffName(data.staff, item.ownerId)
    if (nextDue && sameDay(nextDue, day)) {
      items.push({
        key: 'due-' + item.id,
        source: 'cadence',
        slot: 'Due',
        label: item.name,
        meta: owner + ' · ' + item.ministry,
      })
    }
    if (announceBy && sameDay(announceBy, day)) {
      items.push({
        key: 'announce-' + item.id,
        source: 'cadence',
        slot: 'Notice',
        label: 'Announce ' + item.name,
        meta: owner + ' · ' + item.noticeDays + '-day window',
      })
    }
  }

  // Care windows name a person, so they are staff-role only, and a sensitive
  // entry shows a first name even there.
  if (includeCare) {
    for (const entry of data.care) {
      if (entry.status === 'closed') continue
      const due = careDueBy(entry)
      if (!due || !sameDay(due, day)) continue
      items.push({
        key: 'care-' + entry.id,
        source: 'care',
        slot: 'Care',
        label: (entry.sensitive ? firstName(entry.person) : entry.person) + ' — ' + entry.type,
        meta: staffName(data.staff, entry.ownerId),
      })
    }
  }

  return items
}

/** Sunday-first grid covering the whole month plus its leading and trailing days. */
export function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = addDays(first, -first.getDay())
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

/** The next standing service or entered event from `from` onward. */
export function nextOnCalendar(
  data: DashboardData,
  from: Date,
): { name: string; when: Date; time: string } | null {
  for (let offset = 0; offset < 60; offset++) {
    const day = addDays(from, offset)
    const items = itemsForDay(data, day, false).filter(
      (item) => item.source === 'service' || item.source === 'event',
    )
    if (items.length > 0) {
      const item = items[0]
      return { name: item.label, when: day, time: item.slot }
    }
  }
  return null
}
