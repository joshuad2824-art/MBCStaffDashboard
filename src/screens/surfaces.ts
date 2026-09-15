import type { Access } from '../data/types'
import type { Side } from '../session/session'

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
  /** Which side of the application it is drawn on. `both` is the landing
      screen for the two people who hold both sides. */
  side: Side | 'both'
  /** Only for a person who holds both sides. */
  bothSides?: boolean
  /** The screen owns the paths beneath its own — a meeting, a phase. */
  nested?: boolean
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
  whichSide: {
    nav: 'Which side today',
    group: 0,
    bodies: ['staff'],
    side: 'both',
    bothSides: true,
    path: '/which-side',
    eyebrow: 'You hold both sides',
    title: 'Which side today?',
    lead: 'Two people at Memorial belong to the staff and to the Board. Everything on this screen exists to stop one of them saying something in the wrong room — the choice, the marker that stays on screen afterwards, and the badge that travels on the record.',
  },
  meeting: {
    nav: 'The meeting',
    group: 1,
    bodies: ['deacon-board'],
    side: 'deacon',
    nested: true,
    path: '/meeting',
    eyebrow: 'The spine of the deacon year',
    title: 'The Board meeting',
    lead: 'One record per month in three phases. Before: the agenda assembles itself. During: the roll is called and motions are captured. After: the secretary writes only the parts that are actually narrative.',
  },
  reports: {
    nav: 'Reports',
    group: 1,
    bodies: ['deacon-board', 'committee:finance', 'committee:personnel', 'committee:building-grounds', 'committee:family-assistance'],
    side: 'deacon',
    nested: true,
    path: '/reports',
    eyebrow: 'Records, not conversation',
    title: 'Reports',
    lead: 'Every report — a committee’s, the Treasurer’s, the minutes — moves through the same four states and lives here. Publishing makes it official and printable. An edit after publication is a new version, the one it replaces moves to the archive, and nothing is ever deleted.',
  },
  year: {
    nav: 'The year',
    group: 2,
    bodies: ['deacon-board', 'committee:finance', 'committee:personnel', 'committee:building-grounds', 'committee:family-assistance'],
    side: 'deacon',
    path: '/year',
    eyebrow: 'Derived, never typed',
    title: 'The deacon year',
    lead: 'Every dated obligation the bylaws and policies create — the Treasurer’s report, the committee reports, the July nominations, the August election, the October filing — with its citation. The dates are computed from each rule’s anchor and the Board’s meeting dates, and an obligation goes on the agenda of the meeting it lands on.',
  },
  /* The manual is open to everyone who signs in (0015) and the surface is
     drawn on whichever side the person is on. Only the docket is the deacon
     side's, and the screen draws it only when there is one. */
  reference: {
    nav: 'Reference',
    group: 2,
    bodies: ['staff', 'deacon-board', 'committee:finance', 'committee:personnel', 'committee:building-grounds', 'committee:family-assistance'],
    side: 'both',
    path: '/reference',
    eyebrow: 'The manual, as transcribed',
    title: 'Governance reference',
    lead: 'The bylaws, policies and procedures, searchable. The deacon side also sees the discrepancy docket — the places where the manual disagrees with itself. This surface reads; nothing here edits the record.',
  },
  boardCare: {
    nav: 'Care',
    group: 2,
    bodies: ['deacon-board'],
    side: 'deacon',
    wide: true,
    path: '/board/care',
    eyebrow: 'Pointers, not content',
    title: 'The care list',
    lead: 'Households and the deacon who has each of them, with the date of last contact — and what the staff have asked of the Board: a visit, a call, a meal, a ride, by when. Every line here says that care is happening, who owns it and when it last happened. None says why. There is no field for it, on purpose.',
  },
  deaconWeek: {
    nav: 'Deacon of the Week',
    group: 2,
    bodies: ['deacon-board'],
    side: 'deacon',
    path: '/board/week',
    eyebrow: 'A rotation and a visit log',
    title: 'Deacon of the Week',
    lead: 'Who has the week, who backs him up, and the calls and visits made. The office sees who is on call; the log records that a household was reached, on a date, by whom, and nothing about what was said.',
  },
  committeeFinance: {
    nav: 'Finance',
    group: 3,
    bodies: ['committee:finance'],
    side: 'deacon',
    path: '/committee/finance',
    eyebrow: 'Committee room',
    title: 'Finance committee',
    lead: 'The committee’s roster and terms, its report history, and its working notes. Visible to its members and to nobody else — not disabled for the rest, not there.',
  },
  committeePersonnel: {
    nav: 'Personnel',
    group: 3,
    bodies: ['committee:personnel'],
    side: 'deacon',
    path: '/committee/personnel',
    eyebrow: 'Committee room',
    title: 'Personnel committee',
    lead: 'The committee’s roster and terms, its report history, and its working notes. Compensation figures never enter the system; the report refuses them and the notes should not carry them either.',
  },
  committeeGrounds: {
    nav: 'Building & Grounds',
    group: 3,
    bodies: ['committee:building-grounds'],
    side: 'deacon',
    path: '/committee/building-grounds',
    eyebrow: 'Committee room',
    title: 'Building & Grounds committee',
    lead: 'The committee’s roster and terms, its report history, and its working notes. Visible to its members and to nobody else.',
  },
  committeeFamily: {
    nav: 'Family Assistance',
    group: 3,
    bodies: ['committee:family-assistance'],
    side: 'deacon',
    path: '/committee/family-assistance',
    eyebrow: 'Committee room · confidential',
    title: 'Family Assistance committee',
    lead: 'The committee’s roster and terms, its report history, and its working notes. This committee is confidential: its room does not exist to non-members, and its membership is left off the roster published to the church. Its notes record approvals, amounts and dates — never a family’s circumstance.',
  },
  boardCalendar: {
    nav: 'Calendar',
    group: 1,
    bodies: ['deacon-board'],
    side: 'deacon',
    wide: true,
    path: '/board/calendar',
    eyebrow: 'One calendar, shared',
    title: 'The Board’s calendar',
    lead: 'The Board’s meetings, the Board’s own dates, and whatever the staff has shared. A staff working draft is not here; it arrives the day it is shared, stamped with that date, and it is the same entry on both sides — not a copy.',
  },
  boardDiscussion: {
    nav: 'Discussion',
    group: 1,
    bodies: ['deacon-board'],
    side: 'deacon',
    path: '/board/discussion',
    eyebrow: '14-day memory',
    title: 'The Board’s room',
    lead: 'A rolling conversation among the deacons that forgets, on the same terms as the staff’s: expiry runs from a thread’s most recent activity. A thread addressed to both rooms is how the two sides talk. Anything that became business goes on the agenda before it disappears.',
  },
  today: {
    nav: 'Today',
    group: 0,
    bodies: ['staff'],
    side: 'staff',
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
    side: 'staff',
    path: '/huddle',
    eyebrow: 'Monday · 9:00 AM',
    title: 'Huddle',
    lead: 'The meeting itself, as a board. Any staff member can post to any column; entries are attributed and timestamped. Wins and FYIs archive after fourteen days, tensions stay until they are cleared, and Due next is a read-only roll-up.',
  },
  cadence: {
    nav: 'Cadence ledger',
    group: 1,
    bodies: ['staff'],
    side: 'staff',
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
    side: 'staff',
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
    side: 'staff',
    path: '/discussion',
    eyebrow: '14-day memory',
    title: 'Discussion board',
    lead: 'A rolling staff conversation that forgets. Expiry runs from a thread’s most recent activity, so a live discussion stays whole and a finished one ages out. Anything that becomes a commitment gets promoted before it disappears.',
    staffOnly: true,
  },
  calendar: {
    nav: 'Calendar',
    group: 1,
    bodies: ['staff'],
    side: 'staff',
    wide: true,
    path: '/calendar',
    eyebrow: 'One calendar, shared',
    title: 'Calendar',
    lead: 'Every event the staff is working on, and which of them the Board can see. An event added here is a working draft until it is shared; sharing it widens who can read it, stamps the date, and counts as notice in the log — the same entry on both sides, not a copy.',
  },
  communicator: {
    nav: 'Communicator',
    group: 2,
    bodies: ['staff'],
    side: 'staff',
    path: '/communicator',
    eyebrow: 'One entry, many outputs',
    title: 'Communicator',
    lead: 'Fill in the weekly details, add the cover image, and the printed piece formats itself: one letter sheet, folded in half, four panels. Nobody touches type, spacing, or the fold. Weeks live in the database so anyone can pick up last week’s issue, and publishing counts as a real notification.',
  },
  care: {
    nav: 'Care pipelines',
    group: 2,
    bodies: ['staff'],
    side: 'staff',
    path: '/care',
    eyebrow: 'Pastoral layer',
    title: 'Care pipelines',
    lead: 'Every entry carries a response window and an owner. Sensitive entries show a first name on any list. When the right response is a deacon, ask for one here: what you write in that form is the only thing that travels, and the loop closes here when a deacon marks it done.',
    staffOnly: true,
  },
  goals: {
    nav: 'Goals',
    group: 2,
    bodies: ['staff'],
    side: 'staff',
    path: '/goals',
    eyebrow: 'Annual · reviewed quarterly',
    title: 'Goals',
    lead: 'Entered once, reviewed four times. Deliberately lightweight — a sentence per quarter, not a metric. The point is remembering what we said in January.',
  },
  people: {
    nav: 'People',
    group: 2,
    bodies: ['staff'],
    side: 'staff',
    wide: true,
    path: '/people',
    eyebrow: 'Who can be named',
    title: 'People',
    lead: 'Everyone who can own something, and separately, everyone who can sign in. A deacon or a volunteer belongs on this list the moment they take responsibility for something; giving them a way into the site is a second, deliberate step.',
    staffOnly: true,
  },
}

export interface Viewer {
  bodies: readonly string[]
  viewAs: Access
  sides: readonly Side[]
  context: Side
}

/** Whether a person may open a surface: they sit in one of its bodies, and if
    it is staff-role only, they hold that role. The same answer the sidebar,
    the router and — underneath both — the policies give.

    The context is applied last and only narrows: a person who holds both
    sides sees one side at a time. It never lets anyone open a surface their
    bodies would not. */
export function canOpen(surface: Surface, viewer: Viewer): boolean {
  if (!surface.bodies.some((slug) => viewer.bodies.includes(slug))) return false
  if (surface.staffOnly && viewer.viewAs !== 'staff') return false
  if (surface.bothSides && viewer.sides.length < 2) return false
  if (viewer.sides.length > 1 && surface.side !== 'both' && surface.side !== viewer.context) return false
  return true
}

/** The surfaces a person gets, in the order the sidebar lists them. What is not
    in this list is not rendered anywhere — not disabled, not dimmed, not there. */
export function surfacesFor(viewer: Viewer): Surface[] {
  return Object.values(SURFACES).filter((surface) => canOpen(surface, viewer))
}

/** Where a side opens. */
export function homeOf(side: Side): string {
  return side === 'deacon' ? SURFACES.meeting.path : SURFACES.today.path
}

/** Readable names for the badge and the signed-in line. */
export const BODY_NAMES: Record<string, string> = {
  staff: 'Staff',
  'deacon-board': 'Deacon Board',
  'deacon-body': 'Deacon Body',
  'committee:finance': 'Finance committee',
  'committee:personnel': 'Personnel committee',
  'committee:building-grounds': 'Building & Grounds committee',
  'committee:family-assistance': 'Family Assistance committee',
}

export function bodyName(slug: string): string {
  return BODY_NAMES[slug] ?? slug
}
