import { CARE_TYPES, NOTICE_CATEGORIES } from '../data/seed'
import type { CadenceItem, CareEntry, Notice, Post, Staff, Thread } from '../data/types'
import { addDays, addMonths, countDays, daysBetween, parseDate, toIso } from './date'

/* Everything in this file is computed on read. next_due, announce_by, the notice
   gap and days-open are never written to a row — that is what keeps the ledger
   honest when someone edits a date. */

export const THREAD_MEMORY_DAYS = 14
export const HUDDLE_ARCHIVE_DAYS = 14

export interface CadenceDerived {
  lastHeld: Date | null
  nextDue: Date | null
  announceBy: Date | null
}

export function deriveCadence(item: CadenceItem): CadenceDerived {
  const lastHeld = parseDate(item.lastHeld)
  const nextDue = lastHeld ? addMonths(lastHeld, item.months) : null
  const announceBy = nextDue ? addDays(nextDue, -item.noticeDays) : null
  return { lastHeld, nextDue, announceBy }
}

/** A commitment with no named owner. Unclaimed is a state, not a blank. */
export function isUnclaimed(item: CadenceItem): boolean {
  return item.ownerId === null
}

export function noticeGap(notice: Notice): number | null {
  const decided = parseDate(notice.decidedOn)
  const notified = parseDate(notice.notifiedOn)
  if (!decided || !notified) return null
  return daysBetween(decided, notified)
}

/** The standard for a category: the longest delay that still counts as notice. */
export function noticeStandard(category: string): number | null {
  const found = NOTICE_CATEGORIES.find((entry) => entry.name === category)
  return found ? found.std : null
}

export type NoticeVerdict =
  | { kind: 'met'; spare: number }
  | { kind: 'missed'; over: number }
  | { kind: 'unsent' }
  | { kind: 'unmeasured' }

/* A measurement, not a judgement. The sentence states the arithmetic and stops
   there — no red, no exclamation, no "overdue". */
export function noticeVerdict(notice: Notice): NoticeVerdict {
  const gap = noticeGap(notice)
  if (gap === null) return { kind: 'unsent' }
  const standard = noticeStandard(notice.category)
  if (standard === null) return { kind: 'unmeasured' }
  return gap <= standard ? { kind: 'met', spare: standard - gap } : { kind: 'missed', over: gap - standard }
}

export function describeVerdict(verdict: NoticeVerdict): string {
  switch (verdict.kind) {
    case 'met':
      return verdict.spare === 0 ? 'Met exactly' : 'Met with ' + countDays(verdict.spare) + ' to spare'
    case 'missed':
      return 'Missed by ' + countDays(verdict.over)
    case 'unsent':
      return 'Not yet communicated'
    case 'unmeasured':
      return 'No standard set'
  }
}

export function careDueBy(entry: CareEntry): Date | null {
  const opened = parseDate(entry.openedOn)
  if (!opened) return null
  const type = CARE_TYPES.find((t) => t.name === entry.type)
  return addDays(opened, type ? type.days : 7)
}

export function careWindow(entry: CareEntry): string {
  const type = CARE_TYPES.find((t) => t.name === entry.type)
  return type ? type.window : '7 days'
}

/** Days left before a thread is purged. The clock runs from last activity. */
export function threadForgetsIn(thread: Thread, today: Date): number {
  const last = parseDate(thread.lastActivity)
  if (!last) return THREAD_MEMORY_DAYS
  return THREAD_MEMORY_DAYS - daysBetween(last, today)
}

export function isThreadExpired(thread: Thread, today: Date): boolean {
  return threadForgetsIn(thread, today) <= 0
}

/** Wins and FYIs age out after fourteen days; tensions stay until cleared. */
export function isHuddleArchived(createdAt: string, today: Date): boolean {
  const created = parseDate(createdAt)
  if (!created) return false
  return daysBetween(created, today) >= HUDDLE_ARCHIVE_DAYS
}

export function staffName(staff: Staff[], id: number | null): string {
  if (id === null) return 'Unclaimed'
  const person = staff.find((s) => s.id === id)
  return person ? person.name : 'Unclaimed'
}

export function firstName(name: string): string {
  return String(name).split(' ')[0]
}

/** Median rounded to one decimal, so an even count does not lie about precision. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return Math.round(value * 10) / 10
}

/** The next id the local repository hands out. Postgres does this itself later. */
export function nextId(...collections: { id: number }[][]): number {
  let highest = 0
  for (const collection of collections) {
    for (const row of collection) highest = Math.max(highest, row.id)
  }
  return highest + 1
}

/** Mentions are parsed out of the body on save and keyed to staff_id. */
export function parseMentions(body: string, staff: Staff[]): number[] {
  const found: number[] = []
  for (const person of staff) {
    if (!person.active) continue
    if (body.includes('@' + person.name)) found.push(person.id)
  }
  return found
}

export function isoDaysFromNow(days: number, from: Date): string {
  return toIso(addDays(from, days))
}

/** A post whose parent was removed still renders — under a placeholder. */
export function quotedPost(posts: Post[], replyTo: number | null): Post | null {
  if (replyTo === null) return null
  return posts.find((p) => p.id === replyTo) ?? null
}
