import type { DashboardData, Id, Need } from '../data/types'
import { addDays, parseDate, sameDay, startOfToday } from './date'

/* Needs (home brief §3), derived. Nothing here is stored: what is waiting on
   whom, in what order, and how a date reads. Two states only — open, and done
   — and a need with nobody tagged is simply a to-do. */

export const isOpen = (need: Need) => need.doneAt === null

/** Who a need is asked of. */
export function taggedOn(data: DashboardData, needId: Id): Id[] {
  return data.needTags.filter((tag) => tag.needId === needId).map((tag) => tag.personId)
}

/** Soonest needed-by first, undated last, then the newest. */
export function byNeededBy(a: Need, b: Need): number {
  if (a.neededBy && b.neededBy && a.neededBy !== b.neededBy) return a.neededBy.localeCompare(b.neededBy)
  if (a.neededBy && !b.neededBy) return -1
  if (!a.neededBy && b.neededBy) return 1
  return b.createdAt.localeCompare(a.createdAt)
}

/** Open needs where this person is tagged — Home's Waiting on you, and the
    count beside Needs. */
export function waitingOn(data: DashboardData, personId: Id | null | undefined): Need[] {
  if (personId == null) return []
  const mine = new Set(data.needTags.filter((tag) => tag.personId === personId).map((tag) => tag.needId))
  return data.needs.filter((need) => isOpen(need) && mine.has(need.id)).sort(byNeededBy)
}

/** Whether this person has not yet seen a need they are tagged on. */
export function unseenBy(data: DashboardData, personId: Id | null | undefined, needId: Id): boolean {
  return data.needTags.some((tag) => tag.needId === needId && tag.personId === personId && tag.seenAt === null)
}

/** "by Thu 12 Nov", "by today", "by tomorrow", "was due Mon 9 Nov". */
export function neededByLabel(neededBy: string | null, today = startOfToday()): string | null {
  const date = parseDate(neededBy)
  if (!date) return null
  if (sameDay(date, today)) return 'by today'
  if (sameDay(date, addDays(today, 1))) return 'by tomorrow'
  const words = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')
  return date < today ? `was due ${words}` : `by ${words}`
}

/** A date-only or ISO time as "Tue 10 Nov". */
export function dayLabel(value: string | null): string {
  if (!value) return ''
  const date = value.length === 10 ? parseDate(value) : new Date(value)
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')
}

/* ---------------------------------------------------------------- changes */

/** Marks a need done by this person, now. The database writes its own time
    and its own person; this is what the screen shows until it reloads. */
export function markDone(data: DashboardData, needId: Id, personId: Id): DashboardData {
  return { ...data, needs: data.needs.map((need) => (need.id === needId && isOpen(need) ? { ...need, doneAt: new Date().toISOString(), doneBy: personId } : need)) }
}

export function reopen(data: DashboardData, needId: Id): DashboardData {
  return { ...data, needs: data.needs.map((need) => (need.id === needId ? { ...need, doneAt: null, doneBy: null } : need)) }
}

/** This person's tags on open needs, marked seen. Not an undo step. */
export function markSeen(data: DashboardData, personId: Id): DashboardData {
  const open = new Set(data.needs.filter(isOpen).map((need) => need.id))
  if (!data.needTags.some((tag) => tag.personId === personId && tag.seenAt === null && open.has(tag.needId))) return data
  const stamp = new Date().toISOString()
  return {
    ...data,
    needTags: data.needTags.map((tag) => (tag.personId === personId && tag.seenAt === null && open.has(tag.needId) ? { ...tag, seenAt: stamp } : tag)),
  }
}

/** The tags a need should have, set: added and taken away as the author says. */
export function setTags(data: DashboardData, needId: Id, people: Id[]): DashboardData {
  const want = new Set(people)
  const kept = data.needTags.filter((tag) => tag.needId !== needId || want.has(tag.personId))
  const have = new Set(kept.filter((tag) => tag.needId === needId).map((tag) => tag.personId))
  const added = people.filter((id) => !have.has(id)).map((personId) => ({ needId, personId, seenAt: null }))
  return { ...data, needTags: [...kept, ...added] }
}

/** Accepts an http or https address, as the database does. Anything else is
    no link at all. */
export function cleanLink(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  return /^https?:\/\//i.test(withScheme) ? withScheme : ''
}
