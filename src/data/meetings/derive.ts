import { parseDate, toIso } from '../../lib/date'
import type { AgendaItem, Attendance, Meeting, Motion, Phase } from './types'

/* Derived, never stored — the pattern the cadence ledger already uses. The
   attendance count against the threshold, the ordinal of a meeting in its
   deacon year, what is carried forward as old business: all of it is computed
   on read so there is no second copy to fall out of step. */

/** Art. II.B §3 ¶5: monthly. Twelve regular meetings in a deacon year. */
export const MEETINGS_PER_YEAR = 12

export function phaseOf(meeting: Meeting): Phase {
  if (meeting.status === 'held') return 'minutes'
  if (meeting.status === 'in_session') return 'session'
  return 'agenda'
}

/** The deacon year containing a date, given the month it starts in. */
export function deaconYearBounds(date: Date, startMonth: number): { start: Date; end: Date } {
  const month = startMonth - 1
  const year = date.getMonth() >= month ? date.getFullYear() : date.getFullYear() - 1
  const start = new Date(year, month, 1)
  const end = new Date(year + 1, month, 0)
  return { start, end }
}

export function deaconYearLabel(date: Date, startMonth: number): string {
  const { start, end } = deaconYearBounds(date, startMonth)
  return start.getFullYear() === end.getFullYear()
    ? String(start.getFullYear())
    : start.getFullYear() + '–' + String(end.getFullYear()).slice(2)
}

/** Regular meetings of the deacon year the given meeting falls in, in order. */
export function meetingsInYear(meetings: Meeting[], meeting: Meeting, startMonth: number): Meeting[] {
  const on = parseDate(meeting.meetsOn)
  if (!on) return []
  const { start, end } = deaconYearBounds(on, startMonth)
  return meetings
    .filter((m) => m.kind === 'regular' && m.status !== 'cancelled')
    .filter((m) => {
      const d = parseDate(m.meetsOn)
      return d !== null && d >= start && d <= end
    })
    .sort((a, b) => a.meetsOn.localeCompare(b.meetsOn))
}

/** "ninth of twelve" — which regular meeting of its deacon year this is. */
export function ordinalInYear(meetings: Meeting[], meeting: Meeting, startMonth: number): number {
  const year = meetingsInYear(meetings, meeting, startMonth)
  return year.findIndex((m) => m.id === meeting.id) + 1
}

/** The meeting the screen opens on: tonight's, else the next one, else the last. */
export function currentMeeting(meetings: Meeting[], today: Date): Meeting | null {
  const live = meetings.filter((m) => m.status !== 'cancelled').sort((a, b) => a.meetsOn.localeCompare(b.meetsOn))
  if (live.length === 0) return null
  const todayIso = toIso(today)
  const inSession = live.find((m) => m.status === 'in_session')
  if (inSession) return inSession
  return live.find((m) => m.meetsOn >= todayIso) ?? live[live.length - 1]
}

/** Motions tabled at an earlier meeting and not yet taken up, or taken up here. */
export function oldBusiness(motions: Motion[], meetings: Meeting[], meeting: Meeting): Motion[] {
  const before = new Set(meetings.filter((m) => m.meetsOn < meeting.meetsOn).map((m) => m.id))
  return motions
    .filter((motion) => motion.disposition === 'tabled' && before.has(motion.meetingId))
    .filter((motion) => motion.tabledToMeetingId === null || motion.tabledToMeetingId === meeting.id)
    .sort((a, b) => a.position - b.position)
}

/** What the next agenda will carry from this meeting: tonight's tabled motions. */
export function carriedForward(motions: Motion[], meeting: Meeting): Motion[] {
  return motions.filter((motion) => motion.meetingId === meeting.id && motion.disposition === 'tabled')
}

export function agendaFor(agenda: AgendaItem[], meeting: Meeting): AgendaItem[] {
  return agenda
    .filter((item) => item.meetingId === meeting.id && item.removedAt === null)
    .sort((a, b) => a.position - b.position)
}

export function attendanceFor(attendance: Attendance[], meeting: Meeting): Map<string, Attendance> {
  return new Map(attendance.filter((row) => row.meetingId === meeting.id).map((row) => [row.personId, row]))
}

export function motionsFor(motions: Motion[], meeting: Meeting): Motion[] {
  return motions.filter((motion) => motion.meetingId === meeting.id).sort((a, b) => a.position - b.position)
}

export function sortedByDate(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort((a, b) => a.meetsOn.localeCompare(b.meetsOn))
}

export function seatLabel(member: { role: string; seat: string }): string {
  const parts = [member.role.toLowerCase()]
  if (member.seat === 'chair') parts.push('chairman')
  if (member.seat === 'ex_officio') parts.push('ex officio')
  return parts.join(' · ')
}
