/* The shapes the surfaces read. These mirror the Postgres tables in the build
   brief: ids are numbers only while the local repository is in play — when
   Supabase lands they become uuids and nothing else here has to move. */

export type Id = number

export type RoleLevel = 'staff' | 'limited'

export interface Staff {
  id: Id
  name: string
  role: string
  email: string
  roleLevel: RoleLevel
  active: boolean
}

export type Ministry = 'All' | 'Children' | 'Students' | 'Men' | 'Women' | 'Music' | 'All groups'

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

/** Expires 14 days after lastActivity, not 14 days after it was started. */
export interface Thread {
  id: Id
  subject: string
  createdBy: Id
  lastActivity: string
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
  staff: Staff[]
  cadence: CadenceItem[]
  huddle: HuddlePost[]
  notices: Notice[]
  care: CareEntry[]
  goals: Goal[]
  threads: Thread[]
  posts: Post[]
  mentions: Mention[]
  events: ChurchEvent[]
  weeks: CommunicatorWeek[]
  settings: ChurchSettings
}
