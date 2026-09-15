import type { FiledPointer, Report, ReportVersion } from './reports'

/* The meeting, as the screens read it. Mirrors supabase/migrations/0005_meeting.sql.

   Ids are the database's uuids as strings. The deacon side never went through
   the staff side's numeric-id era, so there is no adapter here and nothing to
   translate. `personId` values are the roster's uuids too — the roster the
   Board sees is read from `membership`, not from the staff blob. */

export type MeetingKind = 'regular' | 'special'
export type MeetingStatus = 'planned' | 'in_session' | 'held' | 'cancelled'
export type MinutesStatus = 'none' | 'draft' | 'approved'
export type AgendaSource = 'recurring' | 'report' | 'old_business' | 'new_business' | 'manual'
/** Present or not. There is no attendance tracker: the roll exists so the
    minutes can say who was there. */
export type AttendanceStatus = 'present' | 'absent'
export type MotionDisposition = 'approved' | 'tabled' | 'withdrawn' | 'failed'
export type SeatRole = 'chair' | 'member' | 'ex_officio'

/** The three phases the screen is organised around. Derived from status. */
export type Phase = 'agenda' | 'session' | 'minutes'

export interface Meeting {
  id: string
  meetsOn: string
  timeLabel: string
  location: string
  kind: MeetingKind
  status: MeetingStatus
  agendaLockedAt: string | null
  agendaLockedBy: string | null
  /** Stamped by the calls to order and to adjourn. The minutes' header. */
  calledToOrderAt: string | null
  adjournedAt: string | null
  minutesStatus: MinutesStatus
  approvedAt: string | null
}

export interface AgendaItem {
  id: string
  meetingId: string
  position: number
  title: string
  source: AgendaSource
  sourceRef: string
  notes: string
  removedAt: string | null
}

export interface Attendance {
  id: string
  meetingId: string
  personId: string
  status: AttendanceStatus
  recordedBy: string | null
}

export interface Motion {
  id: string
  meetingId: string
  position: number
  text: string
  movedBy: string | null
  secondedBy: string | null
  disposition: MotionDisposition
  tabledToMeetingId: string | null
  voteFor: number | null
  voteAgainst: number | null
  bylawReference: string
  textBefore: string
  textAfter: string
}

/** A man on the roll: a seat on the Board, with the roster's name and title. */
export interface BoardMember {
  personId: string
  name: string
  /** Their title on the roster — "Deacon", "Senior Pastor". */
  role: string
  seat: SeatRole
}

/* The year. A dated obligation the bylaws or policies create (brief §3.3).
   What is stored is the rule — its citation, cadence and anchor. Next due,
   announce by and which meeting it lands on are derived, never stored. */
export type ObligationCadence = 'monthly' | 'annual'

export interface Obligation {
  id: string
  slug: string
  title: string
  /** The citation: "Art. II.C ¶2", "A009". Never a paraphrase. */
  ruleSource: string
  requirement: string
  cadence: ObligationCadence
  /** 'meeting' every regular meeting · 'meeting:MM' the regular meeting in
      month MM · 'MM-DD' a fixed date. */
  anchor: string
  noticeDays: number
  ownerBodySlug: string
  active: boolean
  position: number
}

/* The reference: the transcribed bylaws and policies, and the docket that
   says where the manual disagrees with itself. Read here, edited nowhere. */
export type DocumentKind = 'constitution' | 'bylaws' | 'policy' | 'procedure' | 'reference'

export interface GovernanceDocument {
  id: string
  slug: string
  kind: DocumentKind
  code: string
  title: string
  /** Markdown, as transcribed. */
  body: string
  position: number
}

export interface Finding {
  id: string
  number: number
  title: string
  body: string
  cites: string[]
  status: 'open' | 'resolved'
}

/** A seat in any body whose roster this person may read: their own seats and
    the rosters of the bodies they sit in. What a committee room draws its
    roster and terms from. */
export interface Seat {
  bodySlug: string
  personId: string
  name: string
  role: string
  seat: SeatRole
  termStart: string | null
  termEnd: string | null
}

export interface MeetingsData {
  meetings: Meeting[]
  agenda: AgendaItem[]
  attendance: Attendance[]
  motions: Motion[]
  roster: BoardMember[]
  /** Every report this person may read, all states. */
  reports: Report[]
  versions: ReportVersion[]
  /** What was filed against each meeting, as pointers. Board members only. */
  filed: FiledPointer[]
  /** The people the reports name — chairs, recorders — by id. */
  names: Record<string, string>
  /** Who is signed in, as the roster knows them. Null until the roster loads. */
  me: string | null
  /** Month the deacon year begins in (1 = calendar year). From church_settings. */
  deaconYearStartMonth: number
  /** Every seat this person may read, current terms and past. */
  seats: Seat[]
  /** The year's obligations, as the bylaws create them. */
  obligations: Obligation[]
}

export interface NewMotion {
  text: string
  movedBy: string | null
  secondedBy: string | null
  disposition: MotionDisposition
  voteFor: number | null
  voteAgainst: number | null
  bylawReference: string
  textBefore: string
  textAfter: string
}
