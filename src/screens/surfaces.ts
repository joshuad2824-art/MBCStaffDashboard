import type { Access } from '../data/types'

/** Eyebrow, H1 and lead paragraph for each surface. The lead is the first thing
    on every page: 16px, 1.7, 66ch, in meta ink.

    Which surfaces a person gets is assembled from which bodies they belong to
    (mbc-deacons-dashboard-brief.md §2.1). `bodies` names the bodies a surface
    belongs to; a person opens it if they sit in any of them. Every staff
    surface belongs to `staff`, which is the staff roster. Inside that room
    `staffOnly` still separates the staff role from a limited account — the
    pastoral surfaces — exactly as before.

    Absence, not greyed-out: a surface a person cannot open is not in the nav
    and its route refuses. Neither of those is the gate. Row Level Security is,
    and these are so the interface tells the truth about it. */
export interface Surface {
  path: string
  /** The nav label; the title is the H1. */
  nav: string
  /** Sidebar group: 0 the landing screen, 1 the week, 2 the instruments. */
  group: number
  eyebrow: string
  title: string
  lead: string
  /** Body slugs. A person opens the surface if they belong to any of them. */
  bodies: string[]
  /** Staff-role only, within the staff body: the pastoral surfaces. */
  staffOnly?: boolean
  /* Whether a wide screen buys this surface anything.

     A table or a calendar is better at every extra pixel: columns stop
     colliding, day cells hold more of what is on them. Those run edge to edge.

     A surface built from columns of prose is not. Past about seventy characters
     a line gets hard to track back from, so those stop at a measure and leave
     the rest of the monitor alone. That is the design system's rule, and it is
     right — it just should not have been applied to the ledger. */
  wide?: boolean
}

export const SURFACES: Record<string, Surface> = {
  today: {
    nav: 'Today',
    group: 0,
    bodies: ['staff'],
    wide: true,
    path: '/today',
    eyebrow: 'Leave this one up',
    title: 'Today at Memorial',
    lead: 'The whole week on one screen: the calendar, the forecast, and whatever is waiting on somebody. Every number here comes from another surface — clicking it takes you there.',
  },
  huddle: {
    nav: 'Huddle',
    group: 1,
    bodies: ['staff'],
    path: '/huddle',
    eyebrow: 'Monday · 9:00 AM',
    title: 'Huddle',
    lead: 'The meeting itself, as a board. Any staff member can post to any column; entries are attributed and timestamped. Wins and FYIs archive after fourteen days, tensions stay until they are cleared, and Due next is a read-only roll-up.',
  },
  cadence: {
    nav: 'Cadence ledger',
    group: 1,
    bodies: ['staff'],
    wide: true,
    path: '/cadence',
    eyebrow: 'Recurring commitments',
    title: 'Cadence ledger',
    lead: 'Commitments that should happen whether or not anyone remembers. Dates are derived, not typed: next due is the last time it was held plus its interval, and announce by is that date minus its notice window.',
  },
  notice: {
    nav: 'Notice log',
    group: 1,
    bodies: ['staff'],
    wide: true,
    path: '/notice',
    eyebrow: 'The instrument',
    title: 'Notice log',
    lead: 'Two dates for anything that affects people outside this staff: when it was decided, and when the affected people were informed. The gap is a measurement that accumulates into a median by month.',
  },
  discussion: {
    nav: 'Discussion',
    group: 1,
    bodies: ['staff'],
    path: '/discussion',
    eyebrow: '14-day memory',
    title: 'Discussion board',
    lead: 'A rolling staff conversation that forgets. Expiry runs from a thread’s most recent activity, so a live discussion stays whole and a finished one ages out. Anything that becomes a commitment gets promoted before it disappears.',
    staffOnly: true,
  },
  communicator: {
    nav: 'Communicator',
    group: 2,
    bodies: ['staff'],
    path: '/communicator',
    eyebrow: 'One entry, many outputs',
    title: 'Communicator',
    lead: 'Fill in the weekly details, add the cover image, and the printed piece formats itself: one letter sheet, folded in half, four panels. Nobody touches type, spacing, or the fold. Weeks live in the database so anyone can pick up last week’s issue, and publishing counts as a real notification.',
  },
  care: {
    nav: 'Care pipelines',
    group: 2,
    bodies: ['staff'],
    path: '/care',
    eyebrow: 'Pastoral layer',
    title: 'Care pipelines',
    lead: 'Per-person and rolling. Every entry carries a response window and an owner. Sensitive entries show a first name and an owner on any list or projected view; full detail requires opening the record.',
    staffOnly: true,
  },
  goals: {
    nav: 'Goals',
    group: 2,
    bodies: ['staff'],
    path: '/goals',
    eyebrow: 'Annual · reviewed quarterly',
    title: 'Goals',
    lead: 'Entered once, reviewed four times. Deliberately lightweight — a sentence per quarter, not a metric. The point is remembering what we said in January.',
  },
  people: {
    nav: 'People',
    group: 2,
    bodies: ['staff'],
    wide: true,
    path: '/people',
    eyebrow: 'Who can be named',
    title: 'People',
    lead: 'Everyone who can own something, and separately, everyone who can sign in. A deacon or a volunteer belongs on this list the moment they take responsibility for something; giving them a way into the site is a second, deliberate step.',
    staffOnly: true,
  },
}

/** Whether a person may open a surface: they sit in one of its bodies, and if
    it is staff-role only, they hold that role. The same answer the sidebar,
    the router and — underneath both — the policies give. */
export function canOpen(surface: Surface, bodies: readonly string[], viewAs: Access): boolean {
  if (!surface.bodies.some((slug) => bodies.includes(slug))) return false
  if (surface.staffOnly && viewAs !== 'staff') return false
  return true
}

/** The surfaces a person gets, in the order the sidebar lists them. What is not
    in this list is not rendered anywhere — not disabled, not dimmed, not there. */
export function surfacesFor(bodies: readonly string[], viewAs: Access): Surface[] {
  return Object.values(SURFACES).filter((surface) => canOpen(surface, bodies, viewAs))
}
