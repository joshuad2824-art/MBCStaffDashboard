import type { Side } from '../session/session'
import { SURFACES } from './surfaces'
import type { Surface } from './surfaces'

/* Rooms (October 2026 redesign). Fifteen menu entries became five rooms on the
   staff side and four on the deacon side, each with its own lamp. A room is
   only a grouping of surfaces the person can already open: it is assembled
   from `surfacesFor()` and never adds one. A room none of whose surfaces
   opens is not drawn — absence, not greyed-out, exactly as before.

   The surfaces rooms do not hold — the manual and Robert's Rules — live in
   More, one tap from anywhere: they are opened twice a year, not twice a day. */

export type RoomKey = 'today' | 'huddle' | 'calendar' | 'work' | 'people' | 'meeting' | 'reports' | 'care' | 'boardroom'

export interface Room {
  key: RoomKey
  side: Side
  label: string
  /** The lamp's colour on a light ground, and lit on the dark pill. */
  lamp: string
  lit: string
  /** The in-room tab's fill and ink. */
  tabFill: string
  tabInk: string
  /** SURFACES keys, in tab order. The first one the person may open is the landing. */
  surfaces: string[]
}

export const ROOMS: Room[] = [
  { key: 'today', side: 'staff', label: 'Today', lamp: 'var(--room-today)', lit: 'var(--lamp-today)', tabFill: 'var(--action-dark)', tabInk: 'var(--text-on-dark)', surfaces: ['today'] },
  { key: 'huddle', side: 'staff', label: 'Huddle', lamp: 'var(--room-huddle)', lit: 'var(--lamp-huddle)', tabFill: 'var(--tile-talk)', tabInk: 'var(--tile-talk-ink)', surfaces: ['huddle', 'discussion'] },
  { key: 'calendar', side: 'staff', label: 'Calendar', lamp: 'var(--room-calendar)', lit: 'var(--lamp-calendar)', tabFill: 'var(--tile-time)', tabInk: 'var(--tile-time-ink)', surfaces: ['calendar'] },
  { key: 'work', side: 'staff', label: 'Work', lamp: 'var(--room-work)', lit: 'var(--lamp-work)', tabFill: 'var(--tile-gold)', tabInk: 'var(--tile-gold-ink)', surfaces: ['cadence', 'notice', 'communicator', 'goals'] },
  { key: 'people', side: 'staff', label: 'People', lamp: 'var(--room-people)', lit: 'var(--lamp-people)', tabFill: 'var(--tile-care)', tabInk: 'var(--tile-care-ink)', surfaces: ['care', 'ministries', 'people'] },

  { key: 'meeting', side: 'deacon', label: 'Meeting', lamp: 'var(--room-today)', lit: 'var(--lamp-today)', tabFill: 'var(--action-dark)', tabInk: 'var(--text-on-dark)', surfaces: ['meeting'] },
  {
    key: 'reports',
    side: 'deacon',
    label: 'Reports',
    lamp: 'var(--room-work)',
    lit: 'var(--lamp-work)',
    tabFill: 'var(--tile-gold)',
    tabInk: 'var(--tile-gold-ink)',
    surfaces: ['reports', 'committeeFinance', 'committeePersonnel', 'committeeGrounds', 'committeeFamily', 'year'],
  },
  { key: 'care', side: 'deacon', label: 'Care', lamp: 'var(--room-people)', lit: 'var(--lamp-people)', tabFill: 'var(--tile-care)', tabInk: 'var(--tile-care-ink)', surfaces: ['boardCare', 'deaconWeek'] },
  { key: 'boardroom', side: 'deacon', label: 'Board room', lamp: 'var(--room-huddle)', lit: 'var(--lamp-huddle)', tabFill: 'var(--tile-talk)', tabInk: 'var(--tile-talk-ink)', surfaces: ['boardDiscussion', 'boardCalendar'] },
]

/** The back rooms, in More. */
export const MORE_SURFACES = ['reference', 'robertsRules']

export interface OpenRoom extends Room {
  open: Surface[]
  landing: string
}

/** The rooms a person gets on the side they are drawn for, each with the
    surfaces in it they may open. Built only from `open`, so it can never offer
    more than the router does. */
export function roomsFor(open: Surface[], side: Side): OpenRoom[] {
  const rooms: OpenRoom[] = []
  for (const room of ROOMS) {
    if (room.side !== side) continue
    const inRoom = room.surfaces.map((key) => SURFACES[key]).filter((surface) => surface && open.includes(surface))
    if (inRoom.length === 0) continue
    rooms.push({ ...room, open: inRoom, landing: inRoom[0].path })
  }
  return rooms
}

/** Which room a surface sits in, if any. */
export function roomOf(surface: Surface, rooms: OpenRoom[]): OpenRoom | null {
  return rooms.find((room) => room.open.includes(surface)) ?? null
}

/** The surfaces that live in More for this person. */
export function moreFor(open: Surface[]): Surface[] {
  return MORE_SURFACES.map((key) => SURFACES[key]).filter((surface) => surface && open.includes(surface))
}

/** The short name a surface carries as an in-room tab. */
export function tabLabel(surface: Surface): string {
  if (surface === SURFACES.boardDiscussion || surface === SURFACES.discussion) return 'Discussion'
  if (surface === SURFACES.boardCalendar) return 'Calendar'
  if (surface === SURFACES.boardCare) return 'Care list'
  if (surface === SURFACES.reports) return 'All reports'
  return surface.nav
}
