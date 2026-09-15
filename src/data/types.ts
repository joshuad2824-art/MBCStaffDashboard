/* The shapes the surfaces read. These mirror the Postgres tables in the build
   brief: ids are numbers only while the local repository is in play — when
   Supabase lands they become uuids and nothing else here has to move. */

export type Id = number

/* Who can sign in, and what they see.

   'staff'    everything, including care pipelines and the discussion board
   'limited'  every surface except those two
   'none'     cannot sign in at all

   'none' is the important one. A deacon or a volunteer can own a commitment
   without having an account: being named as the owner of something is a fact
   about who is responsible, not a grant of access to members' circumstances.
   Adding someone to the roster and inviting them are deliberately two acts. */
export type Access = 'staff' | 'limited' | 'none'

/** Anyone who can be named — staff, deacons, volunteers. */
export interface Person {
  id: Id
  name: string
  /** Their title on the roster: "Senior Pastor", "Deacon", "Volunteer". */
  role: string
  /** Required to sign in; optional for someone who only owns things. */
  email: string
  access: Access
  active: boolean
}

export function canSignIn(person: Person): boolean {
  return person.active && person.access !== 'none'
}

/** A ministry's name, as the `ministry` table spells it. It was a union of
    seven strings; since 0018 the table is the constraint, at write time,
    and a ministry can be added without a deploy. 'All' and 'All groups' are
    church-wide values the ledger carries, not ministries in the directory. */
export type Ministry = string

export interface MinistryRecord {
  id: Id
  slug: string
  name: string
  description: string
  position: number
  active: boolean
  /** Listed in the directory. False for the church-wide values. */
  directory: boolean
}

export type GroupKind = 'class' | 'community-group' | 'team'

/** A class, a community group or a ministry team: where and when it meets
    and a note on whom it is for. Who serves in it is a ServingAssignment.
    Never who attends — there is no field for it, on purpose. */
export interface ServingGroup {
  id: Id
  ministryId: Id
  kind: GroupKind
  name: string
  /** A sentence, not a schedule engine: 'Sundays 10:00 AM'. */
  meets: string
  location: string
  /** Free text, never a roster: 'Grades 5–6'. */
  audienceNote: string
  notes: string
  startedOn: string | null
  /** The group ended on this date. Null is a live group. Never deleted. */
  endedOn: string | null
}

export interface ServingRole {
  slug: string
  name: string
  position: number
  leads: boolean
}

export interface ServingAssignment {
  id: Id
  groupId: Id
  personId: Id
  roleSlug: string
  startedOn: string
  /** Stepped down on this date. Null is current. Never deleted. */
  endedOn: string | null
  /** The one to call. */
  isPrimary: boolean
}

/** next_due and announce_by are never stored. See lib/derive.ts. */
export interface CadenceItem {
  id: Id
  name: string
  ministry: Ministry
  ownerId: Id | null
  months: number
  intervalLabel: string
  noticeDays: number
  lastHeld: string | null
  notes: string
}

export type HuddleColumn = 'win' | 'tension' | 'fyi'

export interface HuddlePost {
  id: Id
  col: HuddleColumn
  authorId: Id
  body: string
  createdAt: string
  resolvedAt: string | null
}

export interface Notice {
  id: Id
  subject: string
  ministry: Ministry
  category: string
  decidedOn: string
  notifiedOn: string | null
  audience: string
  channel: string
  eventId: Id | null
}

export type CareStatus = 'open' | 'touched' | 'closed'

export interface CareEntry {
  id: Id
  person: string
  type: string
  openedOn: string
  ownerId: Id | null
  status: CareStatus
  lastTouchOn: string | null
  /** Set when the entry is closed; the twelve-month archive counts from it. */
  closedOn: string | null
  sensitive: boolean
  notes: string
}

export interface Goal {
  id: Id
  title: string
  ministry: Ministry
  ownerId: Id | null
  target: string
  status: string
  q: { q1: string; q2: string; q3: string; q4: string }
}

/** Body slugs a record is addressed to. Never empty: a record with no audience
    is a bug, not a private record (mbc-deacons-dashboard-brief.md §3.1). */
export type Audience = string[]

/** Expires 14 days after lastActivity, not 14 days after it was started. */
export interface Thread {
  id: Id
  subject: string
  createdBy: Id
  lastActivity: string
  /** `{staff}` is the staff board; `{deacon-board}` the Board's own;
      `{staff, deacon-board}` is how the two sides talk. */
  audience: Audience
}

export interface Post {
  id: Id
  threadId: Id
  /** A reference only. Quoted text is rendered live from the referenced post. */
  replyTo: Id | null
  authorId: Id
  body: string
  createdAt: string
  time: string
  editedAt: string | null
  removed: boolean
}

/** Mentions are parsed on save and keyed to staff_id, never left as raw text. */
export interface Mention {
  id: Id
  postId: Id
  staffId: Id
}

export interface ChurchEvent {
  id: Id
  name: string
  ministry: Ministry
  startsAt: string
  time: string
  location: string
  cadenceItemId: Id | null
  /** Who can read it. A staff working draft is `{staff}`; publishing widens it. */
  audience: Audience
  /** Stamped when the audience was widened beyond the staff. Null is a draft. */
  publishedAt: string | null
}

/** Short-lived and audience-scoped, authored by either side. Shown until
    `expiresOn`, purged fourteen days after that, like the board. */
export interface Announcement {
  id: Id
  body: string
  audience: Audience
  authorId: Id
  createdAt: string
  expiresOn: string
}

export type OrderKind = 'song' | 'spoken' | 'sermon'

/** One line in the order of worship. Kind decides how it is set on the sheet:
    songs in italic serif, spoken in sans, the sermon tracked and bold. */
export interface OrderItem {
  id: Id
  title: string
  kind: OrderKind
  detail: string
}

/** A Coming Up line. `eventId` is what makes publishing count as notice for the
    event it names; a line typed by hand carries null and notifies nobody. */
export interface BulletinEvent {
  id: Id
  date: string
  title: string
  when: string
  detail: string
  eventId: Id | null
}

export interface StewardshipLine {
  label: string
  value: string
}

export interface CommunicatorWeek {
  id: Id
  serviceDate: string
  series: string
  sermonTitle: string
  scripture: string
  coverImageUrl?: string
  artCaption: string
  order: OrderItem[]
  bulletinEvents: BulletinEvent[]
  give: string[]
  stewardship: StewardshipLine[]
  status: 'draft' | 'published'
  /** What publishing this issue did to the notice log, so unpublishing can undo
      exactly that: entries it created, and entries it only stamped with a
      notification date. */
  publishedCreatedNoticeIds: Id[]
  publishedStampedNoticeIds: Id[]
  updatedBy: Id
  updatedAt: string
}

export interface ContactLine {
  role: string
  name: string
  phone: string
}

export interface MeetingBlock {
  day: string
  lines: string[]
}

/** Standing content. It lives here rather than in one person's browser so the
    issue is identical whoever builds it. */
export interface ChurchSettings {
  welcome: string
  families: string
  address: string
  contacts: ContactLine[]
  meetingBlocks: MeetingBlock[]
  waysToGive: string[]
}

export interface CareType {
  name: string
  days: number
  window: string
  note: string
}

export interface NoticeCategory {
  name: string
  std: number
}

export interface DashboardData {
  people: Person[]
  cadence: CadenceItem[]
  huddle: HuddlePost[]
  notices: Notice[]
  care: CareEntry[]
  goals: Goal[]
  threads: Thread[]
  posts: Post[]
  mentions: Mention[]
  events: ChurchEvent[]
  announcements: Announcement[]
  weeks: CommunicatorWeek[]
  settings: ChurchSettings
  /** The directory: who serves, never who attends. */
  ministries: MinistryRecord[]
  servingRoles: ServingRole[]
  groups: ServingGroup[]
  assignments: ServingAssignment[]
}
