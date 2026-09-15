import { isThreadExpired } from '../lib/derive'
import { startOfToday } from '../lib/date'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { seed } from './seed'
import { freshenSeed } from './freshen'
import type {
  Access,
  CareStatus,
  CommunicatorWeek,
  DashboardData,
  HuddleColumn,
  Ministry,
  OrderItem,
  StewardshipLine,
} from './types'

/* The persistence seam.
   ---------------------
   A checkout without Supabase variables keeps the original local repository,
   including its movable sample week. A configured build reads and writes the
   normalized Postgres tables instead. The rest of the application continues to
   work with DashboardData and does not know which repository is active. */

export interface Repository {
  load(): Promise<DashboardData>
  persist(data: DashboardData): Promise<void>
  /** The database's own id for a care entry. The one place the care seam
      names a staff row: it goes into care_request_link, a staff-only table,
      and nowhere else. It never carries the entry itself. */
  careEntryRef(local: number): string | null
}

const STORAGE_KEY = 'mbc.staff-dashboard.v1'

/** Real deletion, not a flag and not a filter. This remains local-only; the
    configured project runs purge_expired_threads() nightly with pg_cron. */
export function purgeExpired(data: DashboardData): DashboardData {
  const today = startOfToday()
  const kept = data.threads.filter((thread) => !isThreadExpired(thread, today))
  if (kept.length === data.threads.length) return data

  const keptIds = new Set(kept.map((t) => t.id))
  const posts = data.posts.filter((post) => keptIds.has(post.threadId))
  const postIds = new Set(posts.map((p) => p.id))
  return {
    ...data,
    threads: kept,
    posts,
    mentions: data.mentions.filter((mention) => postIds.has(mention.postId)),
  }
}

export class LocalRepository implements Repository {
  careEntryRef(local: number): string | null {
    return String(local)
  }

  async load(): Promise<DashboardData> {
    let data = freshenSeed(seed)
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) data = withAudiences({ ...seed, ...(JSON.parse(stored) as DashboardData) })
    } catch {
      // A corrupt or unavailable store is not worth failing the app over.
    }
    const purged = purgeExpired(data)
    if (purged !== data) await this.persist(purged)
    return purged
  }

  async persist(data: DashboardData): Promise<void> {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Private browsing, a full quota — the session still works, it just will
      // not survive a reload. Not worth interrupting anyone over.
    }
  }
}

/* A board stored before 0008 has threads and events with no audience. They were
   the staff's, so that is what they become. */
function withAudiences(data: DashboardData): DashboardData {
  return {
    ...data,
    threads: data.threads.map((thread) => ({ ...thread, audience: thread.audience?.length ? thread.audience : ['staff'] })),
    events: data.events.map((event) => ({
      ...event,
      audience: event.audience?.length ? event.audience : ['staff'],
      publishedAt: event.publishedAt ?? null,
    })),
    announcements: data.announcements ?? [],
  }
}

type Entity =
  | 'person'
  | 'cadence'
  | 'event'
  | 'huddle'
  | 'notice'
  | 'care'
  | 'thread'
  | 'post'
  | 'mention'
  | 'announcement'
  | 'goal'
  | 'week'

type Row = Record<string, unknown>

const entities: Entity[] = [
  'person', 'cadence', 'event', 'huddle', 'notice', 'care',
  'thread', 'post', 'mention', 'announcement', 'goal', 'week',
]

function emptyDashboard(): DashboardData {
  return {
    people: [], cadence: [], huddle: [], notices: [], care: [], goals: [],
    threads: [], posts: [], mentions: [], events: [], announcements: [], weeks: [], settings: seed.settings,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : []
}

function slugs(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === 'string') : []
}

function localDateTime(value: unknown): { date: string; time: string } {
  const raw = text(value)
  const parsed = new Date(raw)
  if (!raw || Number.isNaN(parsed.getTime())) return { date: raw.slice(0, 10), time: '' }
  return {
    date: parsed.toLocaleDateString('en-CA'),
    time: parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }
}

function parseContacts(lines: unknown): DashboardData['settings']['contacts'] {
  if (!Array.isArray(lines)) return []
  return lines.map((line) => {
    const [role = '', name = '', phone = ''] = text(line).split(' · ')
    return { role, name, phone }
  })
}

function parseMeetings(value: unknown): DashboardData['settings']['meetingBlocks'] {
  return text(value).split('\n').filter(Boolean).map((line) => {
    const [day = '', ...lines] = line.split(' · ')
    return { day, lines }
  })
}

/**
 * DashboardData still uses compact numeric ids inside a running browser. This
 * adapter gives each UUID a stable local number for the lifetime of the page,
 * then translates every foreign key back before writing. It keeps Phase 0 at
 * the repository seam instead of making UUID plumbing a UI-wide concern.
 */
export class SupabaseRepository implements Repository {
  private localByRemote = new Map<Entity, Map<string, number>>()
  private remoteByLocal = new Map<Entity, Map<number, string>>()
  private knownRemote = new Map<Entity, Set<string>>()
  private knownOccurrences = new Set<string>()
  private lastSnapshot: DashboardData | null = null
  private pending: DashboardData | null = null
  private flushing: Promise<void> | null = null

  constructor() {
    this.resetIds()
  }

  private resetIds(): void {
    for (const entity of entities) {
      this.localByRemote.set(entity, new Map())
      this.remoteByLocal.set(entity, new Map())
      this.knownRemote.set(entity, new Set())
    }
  }

  private localId(entity: Entity, remote: unknown): number {
    const remoteId = text(remote)
    if (!remoteId) throw new Error(`Missing ${entity} id from Supabase.`)
    const existing = this.localByRemote.get(entity)?.get(remoteId)
    if (existing !== undefined) return existing

    const reverse = this.remoteByLocal.get(entity) as Map<number, string>
    let local = reverse.size + 1
    while (reverse.has(local)) local += 1
    this.localByRemote.get(entity)?.set(remoteId, local)
    reverse.set(local, remoteId)
    this.knownRemote.get(entity)?.add(remoteId)
    return local
  }

  private localOptional(entity: Entity, remote: unknown): number | null {
    return nullableText(remote) ? this.localId(entity, remote) : null
  }

  private remoteId(entity: Entity, local: number): string {
    const reverse = this.remoteByLocal.get(entity) as Map<number, string>
    const existing = reverse.get(local)
    if (existing) return existing
    const remote = crypto.randomUUID()
    reverse.set(local, remote)
    this.localByRemote.get(entity)?.set(remote, local)
    return remote
  }

  private remoteOptional(entity: Entity, local: number | null): string | null {
    return local === null ? null : this.remoteId(entity, local)
  }

  careEntryRef(local: number): string | null {
    return this.remoteByLocal.get('care')?.get(local) ?? null
  }

  private async read(table: string, columns: string): Promise<Row[]> {
    if (!supabase) return []
    const { data, error } = await supabase.from(table).select(columns)
    if (error) throw new Error(`Could not read ${table}: ${error.message}`)
    return rows(data)
  }

  async load(): Promise<DashboardData> {
    if (!supabase) return emptyDashboard()

    // claim_account() is idempotent. Calling it here closes the first-sign-in
    // gap before any RLS-protected reads are attempted.
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) {
      const empty = emptyDashboard()
      this.lastSnapshot = empty
      return empty
    }
    await supabase.rpc('claim_account')

    const [peopleRows, cadenceRows, occurrenceRows, eventRows, huddleRows, noticeRows, careRows,
      threadRows, postRows, mentionRows, announcementRows, goalRows, weekRows, settingsRows] = await Promise.all([
      this.read('person', 'id,name,role,email,access,active'),
      this.read('cadence_item', 'id,name,ministry,owner_id,interval_count,interval_label,notice_days,last_held,notes,archived'),
      this.read('cadence_occurrence', 'cadence_item_id,held_on'),
      this.read('event', 'id,name,ministry,starts_at,time_label,location,cadence_item_id,audience,published_at'),
      this.read('huddle_post', 'id,column_key,body,author_id,created_at,resolved_at'),
      this.read('notice_entry', 'id,subject,ministry,category,decided_on,notified_on,audience,channel,event_id'),
      this.read('care_entry', 'id,person_name,type,opened_on,owner_id,status,last_touch_on,closed_at,sensitive,notes'),
      this.read('thread', 'id,subject,created_by,last_activity_at,audience'),
      this.read('post', 'id,thread_id,reply_to_post_id,body,author_id,created_at,edited_at,removed'),
      this.read('mention', 'id,post_id,person_id'),
      this.read('announcement', 'id,body,audience,author_id,created_at,expires_on'),
      this.read('goal', 'id,title,ministry,owner_id,target,status,year,q1,q2,q3,q4'),
      this.read('communicator_week', 'id,service_date,series,sermon_title,cover_verse,verse_ref,order_json,notes_json,event_ids,prayer_lines,giving_json,status,updated_by,updated_at'),
      this.read('church_settings', 'meeting_times,address,welcome_text,families_text,contact_lines,ways_to_give'),
    ])

    this.resetIds()
    this.knownOccurrences = new Set(
      occurrenceRows.map((row) => `${text(row.cadence_item_id)}:${text(row.held_on)}`),
    )

    const people = peopleRows.map((row) => ({
      id: this.localId('person', row.id), name: text(row.name), role: text(row.role),
      email: text(row.email), access: text(row.access) as Access, active: row.active === true,
    }))
    const cadence = cadenceRows.filter((row) => row.archived !== true).map((row) => ({
      id: this.localId('cadence', row.id), name: text(row.name), ministry: text(row.ministry) as Ministry,
      ownerId: this.localOptional('person', row.owner_id), months: number(row.interval_count, 1),
      intervalLabel: text(row.interval_label), noticeDays: number(row.notice_days),
      lastHeld: nullableText(row.last_held), notes: text(row.notes),
    }))
    const events = eventRows.map((row) => ({
      id: this.localId('event', row.id), name: text(row.name), ministry: text(row.ministry) as Ministry,
      startsAt: text(row.starts_at), time: text(row.time_label), location: text(row.location),
      cadenceItemId: this.localOptional('cadence', row.cadence_item_id),
      audience: slugs(row.audience), publishedAt: nullableText(row.published_at)?.slice(0, 10) ?? null,
    }))
    const huddle = huddleRows.map((row) => ({
      id: this.localId('huddle', row.id), col: text(row.column_key) as HuddleColumn,
      authorId: this.localId('person', row.author_id), body: text(row.body),
      createdAt: text(row.created_at).slice(0, 10), resolvedAt: nullableText(row.resolved_at)?.slice(0, 10) ?? null,
    }))
    const notices = noticeRows.map((row) => ({
      id: this.localId('notice', row.id), subject: text(row.subject), ministry: text(row.ministry) as Ministry,
      category: text(row.category), decidedOn: text(row.decided_on), notifiedOn: nullableText(row.notified_on),
      audience: text(row.audience), channel: text(row.channel), eventId: this.localOptional('event', row.event_id),
    }))
    const care = careRows.map((row) => ({
      id: this.localId('care', row.id), person: text(row.person_name), type: text(row.type),
      openedOn: text(row.opened_on), ownerId: this.localOptional('person', row.owner_id),
      status: text(row.status) as CareStatus, lastTouchOn: nullableText(row.last_touch_on),
      closedOn: nullableText(row.closed_at)?.slice(0, 10) ?? null,
      sensitive: row.sensitive === true, notes: text(row.notes),
    }))
    const threads = threadRows.map((row) => ({
      id: this.localId('thread', row.id), subject: text(row.subject),
      createdBy: this.localId('person', row.created_by), lastActivity: text(row.last_activity_at).slice(0, 10),
      audience: slugs(row.audience),
    }))
    const posts = postRows.map((row) => {
      const created = localDateTime(row.created_at)
      return {
        id: this.localId('post', row.id), threadId: this.localId('thread', row.thread_id),
        replyTo: this.localOptional('post', row.reply_to_post_id), authorId: this.localId('person', row.author_id),
        body: text(row.body), createdAt: created.date, time: created.time,
        editedAt: nullableText(row.edited_at)?.slice(0, 10) ?? null, removed: row.removed === true,
      }
    })
    const mentions = mentionRows.map((row) => ({
      id: this.localId('mention', row.id), postId: this.localId('post', row.post_id),
      staffId: this.localId('person', row.person_id),
    }))
    const announcements = announcementRows.map((row) => ({
      id: this.localId('announcement', row.id), body: text(row.body), audience: slugs(row.audience),
      authorId: this.localId('person', row.author_id), createdAt: text(row.created_at).slice(0, 10),
      expiresOn: text(row.expires_on),
    }))
    const goals = goalRows.map((row) => ({
      id: this.localId('goal', row.id), title: text(row.title), ministry: text(row.ministry) as Ministry,
      ownerId: this.localOptional('person', row.owner_id), target: text(row.target), status: text(row.status),
      q: { q1: text(row.q1), q2: text(row.q2), q3: text(row.q3), q4: text(row.q4) },
    }))
    const weeks = weekRows.map((row) => {
      const notes = (row.notes_json && typeof row.notes_json === 'object' ? row.notes_json : {}) as Row
      const giving = (row.giving_json && typeof row.giving_json === 'object' ? row.giving_json : {}) as Row
      const bulletinEvents = rows(notes.bulletinEvents).map((line) => ({
        id: number(line.id), date: text(line.date), title: text(line.title), when: text(line.when),
        detail: text(line.detail), eventId: this.localOptional('event', line.eventId),
      }))
      return {
        id: this.localId('week', row.id), serviceDate: text(row.service_date), series: text(row.series),
        sermonTitle: text(row.sermon_title), scripture: text(notes.scripture) || text(row.verse_ref),
        coverImageUrl: text(notes.coverImageUrl), artCaption: text(notes.artCaption) || text(row.cover_verse),
        order: (Array.isArray(row.order_json) ? row.order_json : []) as OrderItem[], bulletinEvents,
        give: Array.isArray(giving.give) ? (giving.give as string[]) : [],
        stewardship: Array.isArray(giving.stewardship) ? (giving.stewardship as StewardshipLine[]) : [],
        status: text(row.status) === 'published' ? 'published' : 'draft',
        publishedCreatedNoticeIds: (Array.isArray(notes.publishedCreatedNoticeIds) ? notes.publishedCreatedNoticeIds : [])
          .map((id) => this.localId('notice', id)),
        publishedStampedNoticeIds: (Array.isArray(notes.publishedStampedNoticeIds) ? notes.publishedStampedNoticeIds : [])
          .map((id) => this.localId('notice', id)),
        updatedBy: this.localOptional('person', row.updated_by) ?? people[0]?.id ?? 0,
        updatedAt: text(row.updated_at).slice(0, 10),
      } satisfies CommunicatorWeek
    })

    const settingsRow = settingsRows[0]
    const settings = settingsRow ? {
      welcome: text(settingsRow.welcome_text), families: text(settingsRow.families_text),
      address: text(settingsRow.address), contacts: parseContacts(settingsRow.contact_lines),
      meetingBlocks: parseMeetings(settingsRow.meeting_times),
      waysToGive: Array.isArray(settingsRow.ways_to_give) ? (settingsRow.ways_to_give as string[]) : [],
    } : seed.settings

    const loaded = { people, cadence, huddle, notices, care, goals, threads, posts, mentions, events, announcements, weeks, settings }
    this.lastSnapshot = loaded
    return loaded
  }

  async persist(data: DashboardData): Promise<void> {
    this.pending = data
    if (!this.flushing) {
      this.flushing = this.flush().finally(() => { this.flushing = null })
    }
    return this.flushing
  }

  private async flush(): Promise<void> {
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    while (this.pending) {
      const current = this.pending
      this.pending = null
      await this.persistSnapshot(current)
    }
  }

  private async save(entity: Entity, table: string, records: Row[]): Promise<void> {
    if (!supabase || records.length === 0) return
    const client = supabase
    const known = this.knownRemote.get(entity) as Set<string>
    const additions = records.filter((record) => !known.has(text(record.id)))
    const updates = records.filter((record) => known.has(text(record.id)))

    if (additions.length) {
      const { error } = await client.from(table).insert(additions)
      if (error) throw new Error(`Could not add ${table}: ${error.message}`)
    }
    await Promise.all(updates.map(async (record) => {
      const { id, ...fields } = record
      const { error } = await client.from(table).update(fields).eq('id', id)
      if (error) throw new Error(`Could not update ${table}: ${error.message}`)
    }))
  }

  private async deleteMissing(entity: Entity, table: string, current: Set<string>): Promise<void> {
    if (!supabase) return
    const known = this.knownRemote.get(entity) as Set<string>
    const removed = [...known].filter((id) => !current.has(id))
    if (removed.length) {
      const { error } = await supabase.from(table).delete().in('id', removed)
      if (error) throw new Error(`Could not remove ${table}: ${error.message}`)
    }
    this.knownRemote.set(entity, current)
  }

  private async persistSnapshot(data: DashboardData): Promise<void> {
    if (!supabase) return
    const ids = (entity: Entity, values: { id: number }[]) => new Set(values.map((value) => this.remoteId(entity, value.id)))
    const changed = <T extends { id: number }>(current: T[], previous: T[] | undefined): Set<number> => {
      const before = new Map((previous ?? []).map((row) => [row.id, JSON.stringify(row)]))
      return new Set(current.filter((row) => before.get(row.id) !== JSON.stringify(row)).map((row) => row.id))
    }
    const prior = this.lastSnapshot
    const changedPeople = changed(data.people, prior?.people)
    const changedCadence = changed(data.cadence, prior?.cadence)
    const changedEvents = changed(data.events, prior?.events)
    const changedHuddle = changed(data.huddle, prior?.huddle)
    const changedNotices = changed(data.notices, prior?.notices)
    const changedCare = changed(data.care, prior?.care)
    const changedThreads = changed(data.threads, prior?.threads)
    const changedPosts = changed(data.posts, prior?.posts)
    const changedMentions = changed(data.mentions, prior?.mentions)
    const changedAnnouncements = changed(data.announcements, prior?.announcements)
    const changedGoals = changed(data.goals, prior?.goals)
    const changedWeeks = changed(data.weeks, prior?.weeks)
    const priorCadence = new Map((prior?.cadence ?? []).map((item) => [item.id, item]))

    const peopleRows = data.people.map((person) => ({
      id: this.remoteId('person', person.id), name: person.name, role: person.role,
      email: person.email || null, access: person.access, active: person.active,
    }))
    const cadenceRows = data.cadence.map((item) => ({
      id: this.remoteId('cadence', item.id), name: item.name, ministry: item.ministry,
      owner_id: this.remoteOptional('person', item.ownerId), interval_count: item.months, interval_unit: 'month',
      interval_label: item.intervalLabel, notice_days: item.noticeDays, last_held: item.lastHeld,
      notes: item.notes, archived: false,
    }))
    const eventRows = data.events.map((event) => ({
      id: this.remoteId('event', event.id), name: event.name, ministry: event.ministry,
      starts_at: event.startsAt, time_label: event.time, location: event.location,
      cadence_item_id: this.remoteOptional('cadence', event.cadenceItemId),
      audience: event.audience, published_at: event.publishedAt,
    }))
    const huddleRows = data.huddle.map((post) => ({
      id: this.remoteId('huddle', post.id), column_key: post.col, body: post.body,
      author_id: this.remoteId('person', post.authorId), created_at: post.createdAt, resolved_at: post.resolvedAt,
    }))
    const noticeRows = data.notices.map((notice) => ({
      id: this.remoteId('notice', notice.id), subject: notice.subject, ministry: notice.ministry,
      category: notice.category, decided_on: notice.decidedOn, notified_on: notice.notifiedOn,
      audience: notice.audience, channel: notice.channel, event_id: this.remoteOptional('event', notice.eventId),
    }))
    const careRows = data.care.map((entry) => ({
      id: this.remoteId('care', entry.id), person_name: entry.person, type: entry.type,
      opened_on: entry.openedOn, owner_id: this.remoteOptional('person', entry.ownerId), status: entry.status,
      last_touch_on: entry.lastTouchOn, closed_at: entry.closedOn, sensitive: entry.sensitive, notes: entry.notes,
    }))
    const threadRows = data.threads.map((thread) => ({
      id: this.remoteId('thread', thread.id), subject: thread.subject,
      created_by: this.remoteId('person', thread.createdBy), last_activity_at: thread.lastActivity,
      audience: thread.audience,
    }))
    const postRows = data.posts.map((post) => ({
      id: this.remoteId('post', post.id), thread_id: this.remoteId('thread', post.threadId),
      reply_to_post_id: this.remoteOptional('post', post.replyTo), body: post.body,
      author_id: this.remoteId('person', post.authorId), edited_at: post.editedAt, removed: post.removed,
    }))
    const mentionRows = data.mentions.map((mention) => ({
      id: this.remoteId('mention', mention.id), post_id: this.remoteId('post', mention.postId),
      person_id: this.remoteId('person', mention.staffId),
    }))
    const announcementRows = data.announcements.map((item) => ({
      id: this.remoteId('announcement', item.id), body: item.body, audience: item.audience,
      author_id: this.remoteId('person', item.authorId), created_at: item.createdAt, expires_on: item.expiresOn,
    }))
    const goalRows = data.goals.map((goal) => ({
      id: this.remoteId('goal', goal.id), title: goal.title, ministry: goal.ministry,
      owner_id: this.remoteOptional('person', goal.ownerId), target: goal.target, status: goal.status,
      year: new Date().getFullYear(), q1: goal.q.q1, q2: goal.q.q2, q3: goal.q.q3, q4: goal.q.q4,
    }))
    const weekRows = data.weeks.map((week) => ({
      id: this.remoteId('week', week.id), service_date: week.serviceDate, series: week.series,
      sermon_title: week.sermonTitle, cover_verse: week.artCaption, verse_ref: week.scripture,
      order_json: week.order,
      notes_json: {
        scripture: week.scripture, coverImageUrl: week.coverImageUrl ?? '', artCaption: week.artCaption,
        bulletinEvents: week.bulletinEvents.map((line) => ({ ...line, eventId: this.remoteOptional('event', line.eventId) })),
        publishedCreatedNoticeIds: week.publishedCreatedNoticeIds.map((id) => this.remoteId('notice', id)),
        publishedStampedNoticeIds: week.publishedStampedNoticeIds.map((id) => this.remoteId('notice', id)),
      },
      event_ids: week.bulletinEvents.map((line) => this.remoteOptional('event', line.eventId))
        .filter((id): id is string => id !== null),
      giving_json: { give: week.give, stewardship: week.stewardship }, status: week.status,
      updated_by: this.remoteId('person', week.updatedBy), updated_at: week.updatedAt,
    }))

    await this.save('person', 'person', peopleRows.filter((row) => changedPeople.has(this.localId('person', row.id))))
    await this.save('cadence', 'cadence_item', cadenceRows.filter((row) => changedCadence.has(this.localId('cadence', row.id))))
    const heldItems = data.cadence
      .filter((item) => item.lastHeld && priorCadence.get(item.id)?.lastHeld !== item.lastHeld)
      .filter((item) => !this.knownOccurrences.has(`${this.remoteId('cadence', item.id)}:${item.lastHeld}`))
    const heldRows = heldItems
      .map((item) => ({ cadence_item_id: this.remoteId('cadence', item.id), held_on: item.lastHeld, notes: '' }))
    if (heldRows.length) {
      const { error } = await supabase.from('cadence_occurrence').insert(heldRows)
      if (error) throw new Error(`Could not save cadence_occurrence: ${error.message}`)
      heldItems.forEach((item) => this.knownOccurrences.add(`${this.remoteId('cadence', item.id)}:${item.lastHeld}`))
    }
    await this.save('event', 'event', eventRows.filter((row) => changedEvents.has(this.localId('event', row.id))))
    await this.save('huddle', 'huddle_post', huddleRows.filter((row) => changedHuddle.has(this.localId('huddle', row.id))))
    await this.save('notice', 'notice_entry', noticeRows.filter((row) => changedNotices.has(this.localId('notice', row.id))))
    await this.save('care', 'care_entry', careRows.filter((row) => changedCare.has(this.localId('care', row.id))))
    await this.save('thread', 'thread', threadRows.filter((row) => changedThreads.has(this.localId('thread', row.id))))
    await this.save('post', 'post', postRows.filter((row) => changedPosts.has(this.localId('post', row.id))))
    await this.save('mention', 'mention', mentionRows.filter((row) => changedMentions.has(this.localId('mention', row.id))))
    await this.save('announcement', 'announcement', announcementRows.filter((row) => changedAnnouncements.has(this.localId('announcement', row.id))))
    await this.save('goal', 'goal', goalRows.filter((row) => changedGoals.has(this.localId('goal', row.id))))
    await this.save('week', 'communicator_week', weekRows.filter((row) => changedWeeks.has(this.localId('week', row.id))))

    const meetingTimes = data.settings.meetingBlocks.map((block) => [block.day, ...block.lines].join(' · ')).join('\n')
    const contactLines = data.settings.contacts.map((contact) => [contact.role, contact.name, contact.phone].join(' · '))
    if (!prior || JSON.stringify(prior.settings) !== JSON.stringify(data.settings)) {
      const { error: settingsError } = await supabase.from('church_settings').update({
        meeting_times: meetingTimes, address: data.settings.address,
        welcome_text: data.settings.welcome, families_text: data.settings.families,
        contact_lines: contactLines, ways_to_give: data.settings.waysToGive,
      }).eq('id', true)
      if (settingsError) throw new Error(`Could not save church_settings: ${settingsError.message}`)
    }

    await this.deleteMissing('mention', 'mention', ids('mention', data.mentions))
    await this.deleteMissing('announcement', 'announcement', ids('announcement', data.announcements))
    await this.deleteMissing('post', 'post', ids('post', data.posts))
    await this.deleteMissing('thread', 'thread', ids('thread', data.threads))
    await this.deleteMissing('care', 'care_entry', ids('care', data.care))
    await this.deleteMissing('notice', 'notice_entry', ids('notice', data.notices))
    await this.deleteMissing('huddle', 'huddle_post', ids('huddle', data.huddle))
    await this.deleteMissing('event', 'event', ids('event', data.events))
    await this.deleteMissing('cadence', 'cadence_item', ids('cadence', data.cadence))
    await this.deleteMissing('goal', 'goal', ids('goal', data.goals))
    await this.deleteMissing('week', 'communicator_week', ids('week', data.weeks))

    // People are intentionally never deleted. Marking someone inactive keeps
    // the history of what they owned while shutting their account door.
    this.knownRemote.set('person', ids('person', data.people))
    this.lastSnapshot = data
  }
}

export const repository: Repository = supabaseConfigured ? new SupabaseRepository() : new LocalRepository()
