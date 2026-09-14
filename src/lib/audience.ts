import type { Audience, ChurchEvent, DashboardData, Notice } from '../data/types'
import type { Side } from '../session/session'
import { nextId } from './derive'

/* One record, two audiences (mbc-deacons-dashboard-brief.md §3.1). A shared
   surface is the same row read from two rooms. The room is the body a side's
   surface is drawn for; a record is in the room if its audience names it.

   None of this decides what anyone may read. Row Level Security has already
   decided that before a row reaches the client. These helpers decide which
   room a row is shown in, and what a composer proposes — the interface's
   half of the rule that a person who holds both sides should not say
   something in the wrong room. */

/** The body a side's shared surfaces are addressed to. */
export function roomOf(side: Side): string {
  return side === 'deacon' ? 'deacon-board' : 'staff'
}

/** The other room, for the "also the staff" / "also the Board" widening. */
export function otherRoom(side: Side): string {
  return side === 'deacon' ? 'staff' : 'deacon-board'
}

export function reaches(audience: Audience, body: string): boolean {
  return audience.includes(body)
}

/** Widening is a deliberate second act: the audience keeps its order and the
    room being added goes on the end, so the badge reads as a change. */
export function widen(audience: Audience, body: string): Audience {
  return reaches(audience, body) ? audience : [...audience, body]
}

export function narrow(audience: Audience, body: string): Audience {
  const kept = audience.filter((slug) => slug !== body)
  return kept.length > 0 ? kept : audience
}

/** The audience of a record started in a room: that room, and the other one
    only when the author chose to add it. */
export function composedAudience(side: Side, alsoOther: boolean): Audience {
  return alsoOther ? [roomOf(side), otherRoom(side)] : [roomOf(side)]
}

/** Whether an event has been widened beyond a working draft. */
export function isPublished(event: ChurchEvent): boolean {
  return event.publishedAt !== null
}

/** What publishing an event writes back to the Notice Log — the same thing the
    Communicator writes when the bulletin goes out: the open notice for the
    event is stamped, or one is created already stamped. One instrument, not
    two. Returns the notices unchanged if the event was already announced. */
export function noticesForEventPublish(
  data: DashboardData,
  event: ChurchEvent,
  todayIso: string,
  audienceLabel: string,
): Notice[] {
  const notices = [...data.notices]
  const announced = notices.find((notice) => notice.eventId === event.id && notice.notifiedOn !== null)
  if (announced) return notices

  const open = notices.findIndex((notice) => notice.eventId === event.id)
  if (open !== -1) {
    notices[open] = { ...notices[open], notifiedOn: todayIso, channel: 'Dashboard', audience: notices[open].audience || audienceLabel }
    return notices
  }

  notices.push({
    id: nextId(notices),
    subject: event.name,
    ministry: event.ministry,
    category: 'Calendar',
    decidedOn: todayIso,
    notifiedOn: todayIso,
    audience: audienceLabel,
    channel: 'Dashboard',
    eventId: event.id,
  })
  return notices
}
