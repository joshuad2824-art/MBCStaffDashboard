import type { Access } from '../data/types'

/* View as (mbc-dashboard-expansion-brief.md §C).

   An administrator chooses a *seat* — not a person's data — and the
   application redraws as that seat would see it: the sidebar it would have,
   the routes it would allow, the controls it would offer. The rows on screen
   stay the administrator's own. Not one policy changes for this feature and
   nothing here reaches a query; the nav and the router are the two layers
   being previewed, and the third layer is not in play.

   Two rules the rest of the code leans on:

     * A seat narrows, never widens. `surfacesFor()` asks the same `canOpen()`
       it always has, with the seat's bodies in place of the administrator's,
       and a surface the administrator does not himself hold is drawn as a
       labelled stub rather than opened — see `isStub()` in screens/surfaces.ts.

     * Read-only while a seat is worn. The composers are gone from the screen,
       and — because hiding a button is necessary and not sufficient — every
       store's write path asks `isPreviewLocked()` first and refuses. */

export interface PreviewSeat {
  id: string
  /** Reads as a seat even when reached through a person's name. */
  label: string
  /** Body slugs the seat sits in. */
  bodies: string[]
  /** The access the seat signs in with: what `viewAs` becomes. */
  access: Access
  /** Bodies the seat chairs, for `isChairOf()`. */
  chairOf: string[]
}

const BOARD = 'deacon-board'
const COMMITTEES: [string, string][] = [
  ['committee:finance', 'Finance'],
  ['committee:personnel', 'Personnel'],
  ['committee:building-grounds', 'Building & Grounds'],
  ['committee:family-assistance', 'Family Assistance'],
]

/** The fixed list, brief §C.3: composed from real bodies, each a set of
    (body, role) pairs. A deacon signs in as a limited account. */
export const SEATS: PreviewSeat[] = [
  { id: 'staff', label: 'Staff · staff role', bodies: ['staff'], access: 'staff', chairOf: [] },
  { id: 'staff-limited', label: 'Staff · limited account', bodies: ['staff'], access: 'limited', chairOf: [] },
  { id: 'board', label: 'Deacon · Board seat only', bodies: [BOARD], access: 'limited', chairOf: [] },
  { id: 'board-chair', label: 'Deacon · Board chairman', bodies: [BOARD], access: 'limited', chairOf: [BOARD] },
  ...COMMITTEES.flatMap(([slug, name]): PreviewSeat[] => [
    { id: `board-${slug.split(':')[1]}`, label: `Deacon · Board + ${name}`, bodies: [BOARD, slug], access: 'limited', chairOf: [] },
    { id: `chair-${slug.split(':')[1]}`, label: `Committee chair · ${name}`, bodies: [BOARD, slug], access: 'limited', chairOf: [slug] },
  ]),
  { id: 'both', label: 'Both sides · staff and Board', bodies: ['staff', BOARD], access: 'staff', chairOf: [] },
]

/** A person's seat set, described as a seat: the shortcut in brief §C.3.
    "View as Curtis Nolen's seat" fills in Board + Finance, chair of Finance,
    and the label keeps reading as a seat so the frame stays honest about what
    is being previewed. */
export function seatOf(personName: string, seats: { slug: string; role: string }[], access: Access): PreviewSeat {
  const bodies = [...new Set(seats.map((s) => s.slug))]
  const chairOf = seats.filter((s) => s.role === 'chair').map((s) => s.slug)
  return {
    id: `person:${personName}`,
    label: `${describeSeat(bodies, chairOf, access)} (${personName}’s seat)`,
    bodies,
    access,
    chairOf,
  }
}

export function describeSeat(bodies: string[], chairOf: string[], access: Access): string {
  const committees = COMMITTEES.filter(([slug]) => bodies.includes(slug)).map(([, name]) => name)
  const chairs = COMMITTEES.filter(([slug]) => chairOf.includes(slug)).map(([, name]) => name)
  const onBoard = bodies.includes(BOARD)
  const onStaff = bodies.includes('staff')
  let label: string
  if (onStaff && onBoard) label = 'Both sides · staff and Board'
  else if (onStaff) label = access === 'staff' ? 'Staff · staff role' : 'Staff · limited account'
  else if (onBoard) label = chairOf.includes(BOARD) ? 'Deacon · Board chairman' : committees.length ? `Deacon · Board + ${committees.join(', ')}` : 'Deacon · Board seat only'
  else if (committees.length) label = `Committee member · ${committees.join(', ')}`
  else label = 'No seat'
  if (onBoard && committees.length && chairs.length) label += ` · chair of ${chairs.join(', ')}`
  if (onStaff && onBoard && chairOf.includes(BOARD)) label += ' · Board chairman'
  return label
}

/* ------------------------------------------------------------- the lock
   Set by the session while a seat is worn and read by every store's write
   path. Module state rather than context because the stores sit above the
   session in the tree, and because a lock that any composer could forget to
   check is not a lock. */

export const READ_ONLY = 'Read only while viewing as a seat. Exit view-as to make changes.'

let locked = false

export function setPreviewLocked(value: boolean): void {
  locked = value
}

export function isPreviewLocked(): boolean {
  return locked
}
