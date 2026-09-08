import type { BulletinEvent, CommunicatorWeek, DashboardData, Notice } from '../data/types'
import { nextId } from './derive'
import { parseDate, toIso } from './date'

/* One entry, many outputs. The Coming Up block reads the same event records the
   calendar and the cadence ledger read, so an event is entered once and appears
   in the bulletin without anyone rekeying it. */

/** The issue being worked on: the next service on or after today, else the most
    recent one. A staff of seven is only ever building one at a time. */
export function currentWeek(weeks: CommunicatorWeek[], today: Date): CommunicatorWeek | null {
  if (weeks.length === 0) return null
  const iso = toIso(today)
  const upcoming = weeks
    .filter((week) => week.serviceDate >= iso)
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))
  return upcoming[0] ?? [...weeks].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0]
}

export function sortedWeeks(weeks: CommunicatorWeek[]): CommunicatorWeek[] {
  return [...weeks].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
}

/** "9.13" — the short date the Coming Up column sets in Lora. */
export function bulletinDate(startsAt: string): string {
  const date = parseDate(startsAt)
  if (!date) return ''
  return date.getMonth() + 1 + '.' + String(date.getDate()).padStart(2, '0')
}

/** Pull an event off the shared table into the issue, rather than retyping it. */
export function eventAsBulletinLine(
  data: DashboardData,
  eventId: number,
  existing: BulletinEvent[],
): BulletinEvent | null {
  const event = data.events.find((candidate) => candidate.id === eventId)
  if (!event) return null
  return {
    id: nextId(existing),
    date: bulletinDate(event.startsAt),
    title: event.name,
    when: event.time + (event.location ? ' · ' + event.location : ''),
    detail: '',
    eventId: event.id,
  }
}

/* Publishing.
   -----------
   The bulletin is a real notification channel, so marking a week published sets
   a notification date for every event it carries — unless an earlier one already
   exists, which would overwrite somebody's honest record with today's date.

   Two things can happen to an event, and the week records them separately so
   unpublishing can undo exactly what it did:

   - `created`  a decision nobody had logged. The entry is removed on unpublish.
   - `stamped`  a decision already logged but never announced. Publishing fills
                in its notification date; unpublishing clears it again and
                leaves the decision where it was. */

export interface PublishResult {
  notices: Notice[]
  created: number[]
  stamped: number[]
}

export function noticesForPublish(data: DashboardData, week: CommunicatorWeek, todayIso: string): PublishResult {
  const notices = [...data.notices]
  const created: number[] = []
  const stamped: number[] = []

  for (const line of week.bulletinEvents) {
    if (line.eventId === null) continue
    const event = data.events.find((candidate) => candidate.id === line.eventId)
    if (!event) continue

    const announced = notices.find((notice) => notice.eventId === event.id && notice.notifiedOn !== null)
    if (announced) continue

    const open = notices.findIndex((notice) => notice.eventId === event.id)
    if (open !== -1) {
      notices[open] = { ...notices[open], notifiedOn: todayIso, channel: 'Bulletin' }
      stamped.push(notices[open].id)
      continue
    }

    const id = nextId(notices)
    notices.push({
      id,
      subject: event.name,
      ministry: event.ministry,
      category: 'Calendar',
      decidedOn: todayIso,
      notifiedOn: todayIso,
      audience: 'Whole church',
      channel: 'Bulletin',
      eventId: event.id,
    })
    created.push(id)
  }

  return { notices, created, stamped }
}

/** Undo exactly what publishing wrote, and nothing anyone else logged. */
export function noticesForUnpublish(
  notices: Notice[],
  created: number[],
  stamped: number[],
): Notice[] {
  const createdIds = new Set(created)
  const stampedIds = new Set(stamped)

  return notices
    .filter((notice) => !createdIds.has(notice.id))
    .map((notice) =>
      stampedIds.has(notice.id) ? { ...notice, notifiedOn: null, channel: 'Not sent' } : notice,
    )
}
