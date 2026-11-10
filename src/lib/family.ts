import type { DashboardData, FamilyKind, FamilyNews, MemberDate } from '../data/types'
import { addDays, parseDate, startOfToday, toIso } from './date'

/* Church family (home brief §4), derived: what is on the board today, in what
   order, and which birthdays and anniversaries come round soon. Nothing here
   is stored. Situation, never diagnosis; only what has been shared with the
   church. */

export interface KindInfo {
  kind: FamilyKind
  /** The group heading on the board. */
  heading: string
  /** One entry's label. */
  one: string
  /** Illness and expecting: the staff role's alone (the database decides). */
  restricted: boolean
  /** What the names field holds. */
  names: string
  namesHint: string
  /** What the date is the date of, or null when it has none. */
  date: string | null
  detailHint: string
}

/** In the order the board reads: the church's joys first, then those to pray
    for, then the rest. */
export const KINDS: KindInfo[] = [
  { kind: 'baptism', heading: 'Baptisms', one: 'Baptism', restricted: false, names: 'Who', namesHint: 'Ava Rogers', date: 'Date of the baptism', detailHint: 'Sunday morning worship' },
  { kind: 'new-member', heading: 'New members', one: 'New member', restricted: false, names: 'Who', namesHint: 'Dan and Erin Whitfield', date: 'Date joined', detailHint: 'By letter / by statement / by baptism' },
  { kind: 'birth', heading: 'Births', one: 'Birth', restricted: false, names: 'Parents', namesHint: 'Josh and Amy Hale', date: 'Date of birth', detailHint: '' },
  { kind: 'expecting', heading: 'Expecting', one: 'Expecting', restricted: true, names: 'Parents', namesHint: 'Sam and Kate Moore', date: null, detailHint: 'Due in spring' },
  { kind: 'illness', heading: 'Prayer', one: 'Prayer', restricted: true, names: 'Who', namesHint: 'Ruth Ellison', date: null, detailHint: '' },
  { kind: 'passing', heading: 'Passings', one: 'Passing', restricted: false, names: 'Who', namesHint: 'Harold Pruitt', date: 'Date of passing', detailHint: 'Service Saturday at 11:00 in the sanctuary' },
  { kind: 'wedding', heading: 'Weddings', one: 'Wedding', restricted: false, names: 'The couple', namesHint: 'Caleb Ward and Mia Ortiz', date: 'Wedding date', detailHint: 'In the chapel' },
  { kind: 'engagement', heading: 'Engagements', one: 'Engagement', restricted: false, names: 'The couple', namesHint: 'Caleb Ward and Mia Ortiz', date: 'Wedding date, if set', detailHint: 'A June wedding' },
  { kind: 'graduation', heading: 'Graduations', one: 'Graduation', restricted: false, names: 'Who', namesHint: 'Grace Lowry', date: 'Graduation date', detailHint: 'Booker T. Washington High School' },
  { kind: 'milestone', heading: 'Membership milestones', one: 'Milestone', restricted: false, names: 'Who', namesHint: 'Bill and June Carter', date: 'Anniversary of joining', detailHint: '50 years at Memorial' },
  { kind: 'military', heading: 'Military', one: 'Military', restricted: false, names: 'Who', namesHint: 'Sgt. Marcus Bell', date: 'Date', detailHint: 'Deployed to Germany · or · Home from deployment' },
  { kind: 'moved', heading: 'Moved away', one: 'Moved', restricted: false, names: 'Who', namesHint: 'The Garcia family', date: 'Date', detailHint: 'Letter transferred to Grace Church, Edmond' },
]

export const kindInfo = (kind: FamilyKind): KindInfo => KINDS.find((k) => k.kind === kind) ?? KINDS[0]

/** The three situations an illness entry offers. Where someone is — never
    what is wrong (§4.2). */
export const SITUATIONS = ['In the hospital', 'Recovering at home', 'Ongoing illness'] as const

/** How long an entry stays up when nobody says: the same rule the database
    applies (0022, guard_family_news). */
export function defaultShowUntil(kind: FamilyKind, onDate: string | null, today = startOfToday()): string {
  const on = parseDate(onDate)
  if (kind === 'illness') return toIso(addDays(today, 14))
  if (kind === 'expecting') return toIso(addDays(today, 120))
  if (kind === 'engagement') return on ? toIso(on) : toIso(addDays(today, 90))
  return toIso(addDays(on && on > today ? on : today, 30))
}

/** What is on the board today: up, and readable by this account (the
    database has already left out what is not). Newest first within a kind. */
export function onTheBoard(data: DashboardData, today = startOfToday()): FamilyNews[] {
  const iso = toIso(today)
  return data.familyNews.filter((entry) => entry.showUntil >= iso).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** The board grouped by kind, in the board's order. */
export function grouped(entries: FamilyNews[]): { info: KindInfo; entries: FamilyNews[] }[] {
  return KINDS.map((info) => ({ info, entries: entries.filter((entry) => entry.kind === info.kind) })).filter((group) => group.entries.length > 0)
}

/** Posted in the last seven days: the "new" count on Home. */
export function newThisWeek(entries: FamilyNews[], today = startOfToday()): number {
  const since = toIso(addDays(today, -7))
  return entries.filter((entry) => entry.createdAt.slice(0, 10) >= since).length
}

/** "Baptism · Sunday 15 Nov" before the day, "Baptized Sunday 8 Nov" after. */
export function whenLabel(entry: FamilyNews, today = startOfToday()): string {
  const on = parseDate(entry.onDate)
  if (!on) return ''
  const words = on.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '')
  if (entry.kind === 'baptism') return on >= today ? `Upcoming · ${words}` : `Baptized ${words}`
  return words
}

export interface ComingRound {
  entry: MemberDate
  date: Date
  /** "50 years", for an anniversary whose year is known. */
  years: number | null
}

/** Birthdays and anniversaries that come round in the next `days` days,
    today included, soonest first. A 29 February falls on the 28th in other
    years. */
export function comingRound(dates: MemberDate[], days: number, today = startOfToday()): ComingRound[] {
  const out: ComingRound[] = []
  for (const entry of dates) {
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
      const leap = new Date(year, 1, 29).getMonth() === 1
      const day = entry.month === 2 && entry.day === 29 && !leap ? 28 : entry.day
      const date = new Date(year, entry.month - 1, day)
      const offset = Math.round((date.getTime() - today.getTime()) / 86400000)
      if (offset >= 0 && offset < days) {
        out.push({ entry, date, years: entry.kind === 'anniversary' && entry.year ? year - entry.year : null })
        break
      }
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime() || a.entry.names.localeCompare(b.entry.names))
}

/** "Fri 13 Nov". */
export function shortDay(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '')
}
