import type { AgendaItem, Meeting, Obligation } from './types'
import { addDays, addMonths, daysBetween, parseDate, toIso } from '../../lib/date'
import { deaconYearBounds } from './derive'

/* The year, derived. Nothing in this file is stored: next due, announce by,
   due soon and which meeting an obligation lands on are computed on read
   from the rule's anchor and the Board's actual meeting dates — the same
   pattern lib/derive.ts uses for the cadence ledger. Correct an anchor and
   everything that depends on it moves; there is no stale copy to chase.

   Anchors:
     'meeting'     every regular monthly meeting
     'meeting:MM'  the regular monthly meeting in month MM
     'MM-DD'       a fixed date, every year */

export interface ObligationDerived {
  obligation: Obligation
  /** When it falls due next, on or after today. */
  nextDue: Date | null
  announceBy: Date | null
  /** Within its notice window. */
  dueSoon: boolean
  /** The regular meeting it lands on, if the Board has one scheduled for it. */
  meeting: Meeting | null
  /** For a 'meeting:MM' anchor with no meeting scheduled yet — the day the
      Board usually meets, so the year still reads. */
  projected: boolean
}

/** The Board meets the second Sunday of the month at four, as its minutes
    record. Used only where no meeting is scheduled yet. */
export function secondSunday(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (7 - first.getDay()) % 7
  return addDays(first, offset + 7)
}

function regularMeetings(meetings: Meeting[]): Meeting[] {
  return meetings.filter((m) => m.kind === 'regular' && m.status !== 'cancelled').sort((a, b) => a.meetsOn.localeCompare(b.meetsOn))
}

/** The regular meeting held in a given month, scheduled or projected. */
function meetingInMonth(meetings: Meeting[], year: number, month: number): { on: Date; meeting: Meeting | null } {
  const scheduled = regularMeetings(meetings).find((m) => {
    const on = parseDate(m.meetsOn)
    return on !== null && on.getFullYear() === year && on.getMonth() === month
  })
  const on = scheduled ? (parseDate(scheduled.meetsOn) as Date) : secondSunday(new Date(year, month, 1))
  return { on, meeting: scheduled ?? null }
}

/** Where a fixed date lands: the last regular meeting in the six weeks before
    it, so the Board is reminded ahead of the date rather than after. */
function meetingBefore(meetings: Meeting[], date: Date): Meeting | null {
  const before = regularMeetings(meetings).filter((m) => {
    const on = parseDate(m.meetsOn)
    return on !== null && on <= date && daysBetween(on, date) <= 45
  })
  return before[before.length - 1] ?? null
}

/** The obligation's next occurrence on or after `from`. */
export function deriveObligation(obligation: Obligation, meetings: Meeting[], from: Date): ObligationDerived {
  const anchor = obligation.anchor
  let nextDue: Date | null = null
  let meeting: Meeting | null = null
  let projected = false

  if (anchor === 'meeting') {
    // The next regular meeting, scheduled or projected.
    const upcoming = regularMeetings(meetings).find((m) => (parseDate(m.meetsOn) ?? from) >= from) ?? null
    if (upcoming) {
      nextDue = parseDate(upcoming.meetsOn)
      meeting = upcoming
    } else {
      let month = new Date(from.getFullYear(), from.getMonth(), 1)
      let candidate = secondSunday(month)
      if (candidate < from) {
        month = addMonths(month, 1)
        candidate = secondSunday(month)
      }
      nextDue = candidate
      projected = true
    }
  } else if (anchor.startsWith('meeting:')) {
    const month = Number(anchor.slice(8)) - 1
    for (let year = from.getFullYear(); year <= from.getFullYear() + 1; year += 1) {
      const found = meetingInMonth(meetings, year, month)
      if (found.on >= from) {
        nextDue = found.on
        meeting = found.meeting
        projected = found.meeting === null
        break
      }
    }
  } else {
    const [mm, dd] = anchor.split('-').map(Number)
    for (let year = from.getFullYear(); year <= from.getFullYear() + 1; year += 1) {
      const candidate = new Date(year, mm - 1, dd)
      if (candidate >= from) {
        nextDue = candidate
        meeting = meetingBefore(meetings, candidate)
        break
      }
    }
  }

  const announceBy = nextDue ? addDays(nextDue, -obligation.noticeDays) : null
  const dueSoon = nextDue !== null && announceBy !== null && from >= announceBy && from <= nextDue
  return { obligation, nextDue, announceBy, dueSoon, meeting, projected }
}

/** Every active obligation, derived, in the order of the year from today. */
export function deriveYear(obligations: Obligation[], meetings: Meeting[], from: Date): ObligationDerived[] {
  return obligations
    .filter((o) => o.active)
    .map((o) => deriveObligation(o, meetings, from))
    .sort((a, b) => {
      const at = a.nextDue?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bt = b.nextDue?.getTime() ?? Number.MAX_SAFE_INTEGER
      return at - bt || a.obligation.position - b.obligation.position
    })
}

/** The obligations that land on a particular meeting: everything anchored to
    it, and every fixed date it is the last meeting before. Derived on read so
    the agenda can offer them; nothing here is on the agenda until a man puts
    it there. */
export function obligationsForMeeting(obligations: Obligation[], meetings: Meeting[], meeting: Meeting): ObligationDerived[] {
  const on = parseDate(meeting.meetsOn)
  if (!on || meeting.kind !== 'regular') return []
  const out: ObligationDerived[] = []
  for (const obligation of obligations.filter((o) => o.active)) {
    const anchor = obligation.anchor
    if (anchor === 'meeting') {
      out.push({ obligation, nextDue: on, announceBy: addDays(on, -obligation.noticeDays), dueSoon: false, meeting, projected: false })
    } else if (anchor.startsWith('meeting:')) {
      if (Number(anchor.slice(8)) - 1 === on.getMonth()) {
        out.push({ obligation, nextDue: on, announceBy: addDays(on, -obligation.noticeDays), dueSoon: false, meeting, projected: false })
      }
    } else {
      const [mm, dd] = anchor.split('-').map(Number)
      for (const year of [on.getFullYear(), on.getFullYear() + 1]) {
        const date = new Date(year, mm - 1, dd)
        if (meetingBefore(meetings, date)?.id === meeting.id) {
          out.push({ obligation, nextDue: date, announceBy: addDays(date, -obligation.noticeDays), dueSoon: false, meeting, projected: false })
          break
        }
      }
    }
  }
  return out.sort((a, b) => a.obligation.position - b.obligation.position)
}

/** Whether an obligation is already on a meeting's agenda: a recurring item
    whose source_ref is the obligation's slug. */
export function onAgenda(agenda: AgendaItem[], meeting: Meeting, obligation: Obligation): AgendaItem | null {
  return agenda.find((a) => a.meetingId === meeting.id && a.removedAt === null && a.source === 'recurring' && a.sourceRef === obligation.slug) ?? null
}

/** The obligations of one deacon year, month by month, for the year screen. */
export function yearByMonth(obligations: Obligation[], meetings: Meeting[], today: Date, startMonth: number): { month: Date; items: ObligationDerived[] }[] {
  const { start } = deaconYearBounds(today, startMonth)
  const months: { month: Date; items: ObligationDerived[] }[] = []
  for (let i = 0; i < 12; i += 1) {
    const month = addMonths(start, i)
    const items = obligations
      .filter((o) => o.active)
      .map((o) => deriveObligation(o, meetings, month))
      .filter((d) => d.nextDue !== null && d.nextDue.getFullYear() === month.getFullYear() && d.nextDue.getMonth() === month.getMonth())
    months.push({ month, items: items.sort((a, b) => (a.nextDue as Date).getTime() - (b.nextDue as Date).getTime() || a.obligation.position - b.obligation.position) })
  }
  return months
}

export function isoOf(date: Date | null): string {
  return date ? toIso(date) : ''
}
