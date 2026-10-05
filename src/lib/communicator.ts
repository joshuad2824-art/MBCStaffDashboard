import type { BulletinEvent, ChurchSettings, CommunicatorWeek, DashboardData, Notice, OrderItem, StewardshipLine } from '../data/types'
import { nextId } from './derive'
import { addDays, parseDate, toIso } from './date'

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

/* Starting an issue.
   ------------------
   An issue is a form the office fills in, and the four panels assemble from it.
   A new one is not blank: it starts with the shape the church's Sundays already
   have, with whatever the rest of the dashboard already knows put in it — the
   calendar's events, the standing ways to give, the series the last issue was
   in — so the office types what is new this week and nothing else. */

/** The Sunday an issue is for: the first Sunday on or after `from` that no issue
    already holds. `service_date` is unique in the database, so a second issue for
    one Sunday could never be saved. */
export function nextOpenSunday(weeks: CommunicatorWeek[], from: Date): string {
  const taken = new Set(weeks.map((week) => week.serviceDate))
  let day = addDays(new Date(from.getFullYear(), from.getMonth(), from.getDate()), (7 - from.getDay()) % 7)
  while (taken.has(toIso(day))) day = addDays(day, 7)
  return toIso(day)
}

/** The order of worship as the church sets it: the spoken parts that are the same
    every week are filled in, the songs are for the office to name, and the sermon
    line follows the sermon title and scripture on the cover. */
export const STANDARD_ORDER: Omit<OrderItem, 'id'>[] = [
  { title: 'Scripture reading and welcome', kind: 'spoken', detail: '' },
  { title: '', kind: 'song', detail: '' },
  { title: '', kind: 'song', detail: '' },
  { title: '', kind: 'song', detail: '' },
  { title: '', kind: 'song', detail: '' },
  { title: 'The Lord’s Prayer', kind: 'spoken', detail: '' },
  { title: 'Offertory', kind: 'spoken', detail: '' },
  { title: '', kind: 'sermon', detail: '' },
  { title: '', kind: 'song', detail: '' },
]

const STEWARDSHIP_LABELS = (year: string) => ['Given in ' + year, 'Spent in ' + year, 'Budgeted for ' + year, 'Missions']

/** How far ahead of the service the Coming Up column looks. */
const COMING_UP_DAYS = 21

export function newIssue(data: DashboardData, today: Date, updatedBy: number): CommunicatorWeek {
  const serviceDate = nextOpenSunday(data.weeks, today)
  const year = serviceDate.slice(0, 4)
  const latest = sortedWeeks(data.weeks)[0] ?? null
  const start = parseDate(serviceDate) as Date
  const horizon = toIso(addDays(start, COMING_UP_DAYS))

  // The calendar already holds what is coming. Pull it in rather than retype it.
  const bulletinEvents: BulletinEvent[] = []
  const upcoming = data.events
    .filter((event) => event.audience.includes('staff') && event.startsAt.slice(0, 10) >= serviceDate && event.startsAt.slice(0, 10) < horizon)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  for (const event of upcoming) {
    const line = eventAsBulletinLine(data, event.id, bulletinEvents)
    if (line) bulletinEvents.push(line)
  }

  const labels = latest && latest.stewardship.length ? latest.stewardship.map((line) => line.label.replace(/\b20\d\d\b/g, year)) : STEWARDSHIP_LABELS(year)
  const stewardship: StewardshipLine[] = labels.map((label) => ({ label, value: '' }))
  const give = data.settings.waysToGive.length ? [...data.settings.waysToGive] : (latest?.give ?? [])

  return {
    id: nextId(data.weeks),
    serviceDate,
    // A series runs for weeks; the sermon, the scripture and the picture are this week's.
    series: latest?.series ?? '',
    sermonTitle: '',
    scripture: '',
    coverImageUrl: '',
    artCaption: latest?.artCaption ?? '',
    order: STANDARD_ORDER.map((line, index) => ({ ...line, id: index + 1 })),
    bulletinEvents,
    give,
    stewardship,
    status: 'draft',
    publishedCreatedNoticeIds: [],
    publishedStampedNoticeIds: [],
    updatedBy,
    updatedAt: toIso(today),
  }
}

/* What is left to fill in.
   -------------------------
   The overflow guard says whether the panels fit. This says whether they are
   finished: a list the office can work down, each item naming the section it is
   in. It is advice, not a lock — printing with something blank asks first. */

export interface IssueCheck {
  key: string
  /** The section of the page it is in, for "go to". */
  section: 'week' | 'cover' | 'order' | 'events' | 'give' | 'standing'
  ok: boolean
  todo: string
}

const blank = (text: string | undefined | null) => !text || text.trim() === ''
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export function issueChecks(week: CommunicatorWeek, settings: ChurchSettings): IssueCheck[] {
  // The sermon line takes its words from the cover when it has none of its own.
  const orderBlanks = week.order.filter((line) => blank(line.title) && !(line.kind === 'sermon' && !blank(week.sermonTitle))).length
  const eventBlanks = week.bulletinEvents.filter((line) => blank(line.title)).length
  const figureBlanks = week.stewardship.filter((line) => blank(line.value)).length
  return [
    { key: 'series', section: 'week', ok: !blank(week.series), todo: 'Add the series name.' },
    { key: 'sermon', section: 'week', ok: !blank(week.sermonTitle), todo: 'Add the sermon title.' },
    { key: 'scripture', section: 'week', ok: !blank(week.scripture), todo: 'Add the scripture.' },
    { key: 'image', section: 'cover', ok: !blank(week.coverImageUrl), todo: 'Add a cover image, or the cover prints with an empty frame.' },
    {
      key: 'order',
      section: 'order',
      ok: week.order.length > 0 && orderBlanks === 0,
      todo: week.order.length === 0 ? 'Add the order of worship.' : `${orderBlanks} ${plural(orderBlanks, 'line in the order of worship has', 'lines in the order of worship have')} no title.`,
    },
    {
      key: 'events',
      section: 'events',
      ok: week.bulletinEvents.length > 0 && eventBlanks === 0,
      todo: week.bulletinEvents.length === 0 ? 'Add what is coming up — pull it from the calendar.' : `${eventBlanks} ${plural(eventBlanks, 'Coming up line has', 'Coming up lines have')} no title.`,
    },
    { key: 'give', section: 'give', ok: week.give.some((line) => !blank(line)), todo: 'Add the ways to give.' },
    {
      key: 'stewardship',
      section: 'give',
      ok: week.stewardship.length > 0 && figureBlanks === 0,
      todo: week.stewardship.length === 0 ? 'Add the stewardship figures.' : `${figureBlanks} ${plural(figureBlanks, 'stewardship figure is', 'stewardship figures are')} still to enter.`,
    },
    {
      key: 'standing',
      section: 'standing',
      ok: !blank(settings.welcome) && !blank(settings.families) && !blank(settings.address),
      todo: 'Fill in the welcome, the families note and the address under Standing content.',
    },
  ]
}
