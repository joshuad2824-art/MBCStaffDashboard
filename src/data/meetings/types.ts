/* The meeting, as the screens read it. Mirrors supabase/migrations/0005_meeting.sql.

   Ids are the database's uuids as strings. The deacon side never went through
   the staff side's numeric-id era, so there is no adapter here and nothing to
   translate. `personId` values are the roster's uuids too — the roster the
   Board sees is read from `membership`, not from the staff blob. */

export type MeetingKind = 'regular' | 'special'
export type MeetingStatus = 'planned' | 'in_session' | 'held' | 'cancelled'
export type MinutesStatus = 'none' | 'draft' | 'approved'
export type AgendaSource = 'recurring' | 'report' | 'old_business' | 'new_business' | 'manual'
export type AttendanceStatus = 'present' | 'absent' | 'excused'
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
  /** A note written by a person, in his own words. Optional. Never a checkbox. */
  justCauseNote: string
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

/** What the chairman's panel reads: the count, and nothing else. */
export interface AttendanceCount {
  personId: string
  name: string
  meetingsHeld: number
  present: number
  absent: number
  excused: number
}

export interface MeetingsData {
  meetings: Meeting[]
  agenda: AgendaItem[]
  attendance: Attendance[]
  motions: Motion[]
  roster: BoardMember[]
  /** Who is signed in, as the roster knows them. Null until the roster loads. */
  me: string | null
  /** Month the deacon year begins in (1 = calendar year). From church_settings. */
  deaconYearStartMonth: number
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
