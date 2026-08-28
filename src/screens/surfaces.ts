/** Eyebrow, H1 and lead paragraph for each surface. The lead is the first thing
    on every page: 16px, 1.7, 66ch, in meta ink. */
export interface Surface {
  path: string
  eyebrow: string
  title: string
  lead: string
  staffOnly?: boolean
}

export const SURFACES: Record<string, Surface> = {
  today: {
    path: '/today',
    eyebrow: 'Leave this one up',
    title: 'Today at Memorial',
    lead: 'The whole week on one screen: the calendar, the forecast, and whatever is waiting on somebody. Every number here comes from another surface — clicking it takes you there.',
  },
  huddle: {
    path: '/huddle',
    eyebrow: 'Monday · 9:00 AM',
    title: 'Huddle',
    lead: 'The meeting itself, as a board. Any staff member can post to any column; entries are attributed and timestamped. Wins and FYIs archive after fourteen days, tensions stay until they are cleared, and Due next is a read-only roll-up.',
  },
  cadence: {
    path: '/cadence',
    eyebrow: 'Recurring commitments',
    title: 'Cadence ledger',
    lead: 'Commitments that should happen whether or not anyone remembers. Dates are derived, not typed: next due is the last time it was held plus its interval, and announce by is that date minus its notice window.',
  },
  notice: {
    path: '/notice',
    eyebrow: 'The instrument',
    title: 'Notice log',
    lead: 'Two dates for anything that affects people outside this staff: when it was decided, and when the affected people were informed. The gap is a measurement that accumulates into a median by month.',
  },
  discussion: {
    path: '/discussion',
    eyebrow: '14-day memory',
    title: 'Discussion board',
    lead: 'A rolling staff conversation that forgets. Expiry runs from a thread’s most recent activity, so a live discussion stays whole and a finished one ages out. Anything that becomes a commitment gets promoted before it disappears.',
    staffOnly: true,
  },
  communicator: {
    path: '/communicator',
    eyebrow: 'One entry, many outputs',
    title: 'Communicator',
    lead: 'Fill in the five forms and the printed piece formats itself: one letter sheet, folded in half, four panels. Nobody touches type, spacing, or the fold. Weeks live in the database so anyone can pick up last week’s issue, and publishing counts as a real notification.',
  },
  care: {
    path: '/care',
    eyebrow: 'Pastoral layer',
    title: 'Care pipelines',
    lead: 'Per-person and rolling. Every entry carries a response window and an owner. Sensitive entries show a first name and an owner on any list or projected view; full detail requires opening the record.',
    staffOnly: true,
  },
  goals: {
    path: '/goals',
    eyebrow: 'Annual · reviewed quarterly',
    title: 'Goals',
    lead: 'Entered once, reviewed four times. Deliberately lightweight — a sentence per quarter, not a metric. The point is remembering what we said in January.',
  },
}
