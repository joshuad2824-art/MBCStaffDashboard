/* Care on the deacon side: pointers, not content (brief §2.3, §3.3). Every
   shape here records that care is happening, who owns it, and when it last
   happened. None has a field for a circumstance, and none may grow one. */

export type HelpKind = 'visit' | 'call' | 'meal' | 'ride' | 'home_repair' | 'other'
export type RequestStatus = 'open' | 'accepted' | 'done'
export type VisitKind = 'visit' | 'call'

export const HELP_KINDS: { kind: HelpKind; label: string }[] = [
  { kind: 'visit', label: 'A visit' },
  { kind: 'call', label: 'A call' },
  { kind: 'meal', label: 'A meal' },
  { kind: 'ride', label: 'A ride' },
  { kind: 'home_repair', label: 'Home repair' },
  { kind: 'other', label: 'Something else' },
]

export function helpLabel(kind: HelpKind): string {
  return HELP_KINDS.find((h) => h.kind === kind)?.label ?? kind
}

/** The deacon family ministry plan: a household, a deacon, a date. */
export interface CareAssignment {
  id: string
  householdLabel: string
  assignedTo: string
  lastContactOn: string | null
  active: boolean
  createdBy: string | null
}

/** The staff → deacon handoff. Composed by a staff member; acted on by the
    Board. What is asked travels; why it is needed does not. */
export interface CareRequest {
  id: string
  householdLabel: string
  helpKind: HelpKind
  neededBy: string | null
  requestedBy: string
  assignedTo: string | null
  status: RequestStatus
  completedOn: string | null
  createdAt: string
}

/** Staff-only: the request's thread back to the care entry it came from. The
    deacon side never receives one of these — the table returns it no rows. */
export interface CareRequestLink {
  requestId: string
  careEntryId: string
}

export interface DeaconWeek {
  id: string
  /** The Sunday the week begins. */
  weekOf: string
  personId: string
  backupPersonId: string | null
}

export interface DeaconVisit {
  id: string
  weekId: string
  householdLabel: string
  kind: VisitKind
  visitedOn: string
  personId: string
}

export interface CareData {
  assignments: CareAssignment[]
  requests: CareRequest[]
  /** Only ever non-empty on the staff side. */
  links: CareRequestLink[]
  weeks: DeaconWeek[]
  visits: DeaconVisit[]
  /** Names for every person id above, from the roster. */
  names: Record<string, string>
  /** Who is signed in, as the roster knows them. */
  me: string | null
}
