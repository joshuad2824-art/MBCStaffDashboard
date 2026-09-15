import { supabase, supabaseConfigured } from '../../lib/supabase'
import { SEED_SEATS } from '../seed'
import type { Person } from '../types'
import { normalisePayload } from './reports'
import type { FiledPointer, Report, ReportFile, ReportKind, ReportPayload, ReportStatus, ReportVersion } from './reports'
import { seedAgenda, seedAttendance, seedMeetings, seedMotions, seedReports, seedVersions } from './seed'
import { seedDocuments, seedFindings, seedObligations } from './governance'
import type {
  AgendaItem,
  Attendance,
  GovernanceDocument,
  Obligation,
  AttendanceStatus,
  BoardMember,
  Meeting,
  MeetingKind,
  MeetingsData,
  Motion,
  NewMotion,
} from './types'

/* The deacon side's persistence seam.
   ------------------------------------
   Separate from src/data/repository.ts on purpose. The staff seam moves one
   DashboardData blob; this one is a handful of named operations, because the
   things it writes are records — attendance, motions, an agenda — and a record
   is written once, under a name, and not moved around as a snapshot. There is
   no undo here and nothing is ever deleted. */

export interface StubContext {
  people: Person[]
  meId: number | null
}

export interface MeetingRepository {
  load(stub: StubContext): Promise<MeetingsData>
  createMeeting(input: { meetsOn: string; kind: MeetingKind; timeLabel: string; location: string }, me: string): Promise<Meeting>
  updateMeeting(id: string, patch: Partial<Pick<Meeting, 'status' | 'agendaLockedAt' | 'agendaLockedBy' | 'calledToOrderAt' | 'adjournedAt' | 'minutesStatus' | 'approvedAt' | 'timeLabel' | 'location'>>): Promise<void>
  addAgendaItem(item: Omit<AgendaItem, 'id' | 'removedAt'>, me: string): Promise<AgendaItem>
  removeAgendaItem(id: string): Promise<void>
  recordAttendance(meetingId: string, personId: string, status: AttendanceStatus, me: string): Promise<Attendance>
  recordMotion(meetingId: string, position: number, motion: NewMotion, me: string): Promise<Motion>
  takeUp(motionId: string, meetingId: string): Promise<void>
  /* Reports. The lifecycle is draft → submitted → published → archived and
     nothing goes backwards except a draft reopened from submitted. */
  createReport(input: { kind: ReportKind; bodySlug: string; meetingId: string | null; periodStart: string | null; periodEnd: string | null; payload: ReportPayload }, me: string): Promise<Report>
  saveReport(id: string, patch: { payload?: ReportPayload; file?: ReportFile | null; meetingId?: string | null; status?: ReportStatus; submittedAt?: string | null; submittedBy?: string | null; publishedAt?: string | null; archivedAt?: string | null }, me: string): Promise<void>
  /** Publishing writes a version. Never updates one. */
  addVersion(input: { reportId: string; versionNo: number; payload: ReportPayload; rendered: string; file: ReportFile | null; supersedesVersionId: string | null }, me: string): Promise<ReportVersion>
  /** A report filed their traditional way. The file goes under the report's
      id; the bucket asks the report's own questions of it. */
  uploadFile(reportId: string, versionNo: number, file: File): Promise<ReportFile>
  /** Somewhere the file can be opened from, for a little while. */
  fileUrl(file: ReportFile): Promise<string | null>
}

const STORAGE_KEY = 'mbc.deacons.meetings.v1'

interface Stored {
  meetings: Meeting[]
  agenda: AgendaItem[]
  attendance: Attendance[]
  motions: Motion[]
  reports: Report[]
  versions: ReportVersion[]
}

const BODY_NAMES: Record<string, string> = {
  'deacon-board': 'Deacon Board',
  'committee:finance': 'Finance Committee',
  'committee:personnel': 'Personnel Committee',
  'committee:building-grounds': 'Building & Grounds Committee',
  'committee:family-assistance': 'Family Assistance Committee',
}
const CONFIDENTIAL = new Set(['committee:family-assistance'])

function newId(): string {
  return crypto.randomUUID()
}

function nowIso(): string {
  return new Date().toISOString()
}

/** Seed data in the browser, for a checkout without Supabase variables. */
export class LocalMeetingRepository implements MeetingRepository {
  private stored: Stored | null = null
  private roster: BoardMember[] = []

  private read(): Stored {
    if (this.stored) return this.stored
    let data: Stored = { meetings: seedMeetings, agenda: seedAgenda, attendance: seedAttendance, motions: seedMotions, reports: seedReports, versions: seedVersions }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) data = { ...data, ...(JSON.parse(raw) as Partial<Stored>) }
    } catch {
      // A corrupt store is not worth failing the room over.
    }
    this.stored = data
    return data
  }

  private write(next: Stored): void {
    this.stored = next
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Private browsing or a full quota: the session still works.
    }
  }

  /** The stub's version of the read policy: members of the body, and the
      Board unless the body is confidential. */
  private readable(stub: StubContext, bodySlug: string): boolean {
    const seats = stub.meId === null ? [] : (SEED_SEATS[stub.meId] ?? [])
    const mine = new Set(seats.map((s) => s.slug))
    return mine.has(bodySlug) || (mine.has('deacon-board') && !CONFIDENTIAL.has(bodySlug))
  }

  async load(stub: StubContext): Promise<MeetingsData> {
    const data = this.read()
    this.roster = stub.people
      .filter((person) => person.active)
      .flatMap((person) => {
        const seat = (SEED_SEATS[person.id] ?? []).find((s) => s.slug === 'deacon-board')
        return seat ? [{ personId: String(person.id), name: person.name, role: person.role, seat: seat.role }] : []
      })
    const onBoard = stub.meId !== null && (SEED_SEATS[stub.meId] ?? []).some((s) => s.slug === 'deacon-board')
    const reports = data.reports.filter((r) => this.readable(stub, r.bodySlug))
    const readableIds = new Set(reports.map((r) => r.id))
    const filed: FiledPointer[] = onBoard
      ? data.reports
          .filter((r) => r.status !== 'draft' && r.meetingId)
          .map((r) => ({
            meetingId: r.meetingId as string,
            reportId: readableIds.has(r.id) ? r.id : null, kind: r.kind, bodySlug: r.bodySlug, bodyName: r.bodyName,
            confidential: CONFIDENTIAL.has(r.bodySlug), status: r.status, submittedAt: r.submittedAt, publishedAt: r.publishedAt,
          }))
      : []
    return {
      meetings: data.meetings,
      agenda: data.agenda,
      attendance: data.attendance,
      motions: data.motions,
      reports,
      versions: data.versions.filter((v) => readableIds.has(v.reportId)),
      filed,
      names: Object.fromEntries(stub.people.map((p) => [String(p.id), p.name])),
      roster: this.roster,
      me: stub.meId === null ? null : String(stub.meId),
      deaconYearStartMonth: 1,
      obligations: seedObligations,
      documents: seedDocuments,
      findings: seedFindings,
    }
  }

  async createMeeting(input: { meetsOn: string; kind: MeetingKind; timeLabel: string; location: string }, _me: string): Promise<Meeting> {
    const meeting: Meeting = {
      id: newId(), ...input, status: 'planned', agendaLockedAt: null, agendaLockedBy: null, calledToOrderAt: null, adjournedAt: null, minutesStatus: 'none', approvedAt: null,
    }
    const data = this.read()
    this.write({ ...data, meetings: [...data.meetings, meeting] })
    return meeting
  }

  async updateMeeting(id: string, patch: Partial<Meeting>): Promise<void> {
    const data = this.read()
    this.write({ ...data, meetings: data.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  }

  async addAgendaItem(item: Omit<AgendaItem, 'id' | 'removedAt'>, _me: string): Promise<AgendaItem> {
    const row: AgendaItem = { ...item, id: newId(), removedAt: null }
    const data = this.read()
    this.write({ ...data, agenda: [...data.agenda, row] })
    return row
  }

  async removeAgendaItem(id: string): Promise<void> {
    const data = this.read()
    this.write({ ...data, agenda: data.agenda.map((a) => (a.id === id ? { ...a, removedAt: nowIso() } : a)) })
  }

  async recordAttendance(meetingId: string, personId: string, status: AttendanceStatus, me: string): Promise<Attendance> {
    const data = this.read()
    const existing = data.attendance.find((a) => a.meetingId === meetingId && a.personId === personId)
    const row: Attendance = existing ? { ...existing, status } : { id: newId(), meetingId, personId, status, recordedBy: me }
    this.write({
      ...data,
      attendance: existing ? data.attendance.map((a) => (a.id === row.id ? row : a)) : [...data.attendance, row],
    })
    return row
  }

  async recordMotion(meetingId: string, position: number, motion: NewMotion, _me: string): Promise<Motion> {
    const row: Motion = { id: newId(), meetingId, position, tabledToMeetingId: null, ...motion }
    const data = this.read()
    this.write({ ...data, motions: [...data.motions, row] })
    return row
  }

  async takeUp(motionId: string, meetingId: string): Promise<void> {
    const data = this.read()
    this.write({ ...data, motions: data.motions.map((m) => (m.id === motionId ? { ...m, tabledToMeetingId: meetingId } : m)) })
  }

  async createReport(input: { kind: ReportKind; bodySlug: string; meetingId: string | null; periodStart: string | null; periodEnd: string | null; payload: ReportPayload }, me: string): Promise<Report> {
    const now = nowIso()
    const report: Report = {
      id: newId(), kind: input.kind, file: null, bodySlug: input.bodySlug, bodyName: BODY_NAMES[input.bodySlug] ?? input.bodySlug,
      meetingId: input.meetingId, periodStart: input.periodStart, periodEnd: input.periodEnd, status: 'draft', payload: input.payload,
      createdBy: me, updatedBy: me, updatedAt: now, submittedBy: null, submittedAt: null, publishedAt: null, archivedAt: null,
    }
    const data = this.read()
    this.write({ ...data, reports: [...data.reports, report] })
    return report
  }

  async saveReport(id: string, patch: Parameters<MeetingRepository['saveReport']>[1], me: string): Promise<void> {
    const data = this.read()
    this.write({
      ...data,
      reports: data.reports.map((r) => (r.id === id ? { ...r, ...patch, updatedBy: me, updatedAt: nowIso() } : r)),
    })
  }

  async addVersion(input: { reportId: string; versionNo: number; payload: ReportPayload; rendered: string; file: ReportFile | null; supersedesVersionId: string | null }, me: string): Promise<ReportVersion> {
    const version: ReportVersion = { id: newId(), ...input, createdBy: me, publishedAt: nowIso() }
    const data = this.read()
    this.write({ ...data, versions: [...data.versions, version] })
    return version
  }

  /* Files in a local checkout are kept as data URLs beside the records —
     enough for a sample PDF, not for an archive. A configured build keeps
     them in the bucket. */
  async uploadFile(reportId: string, versionNo: number, file: File): Promise<ReportFile> {
    if (file.size > 4 * 1024 * 1024) throw new Error('The local checkout keeps files under 4 MB. A configured build has no such limit.')
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read the file.'))
      reader.readAsDataURL(file)
    })
    const path = `${reportId}/${versionNo}-${file.name}`
    try {
      window.localStorage.setItem(`${STORAGE_KEY}.file.${path}`, dataUrl)
    } catch {
      throw new Error('The browser would not keep that file. Try a smaller one.')
    }
    return { path, name: file.name, type: file.type || 'application/octet-stream' }
  }

  async fileUrl(file: ReportFile): Promise<string | null> {
    try {
      return window.localStorage.getItem(`${STORAGE_KEY}.file.${file.path}`)
    } catch {
      return null
    }
  }
}

type Row = Record<string, unknown>

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}
function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function readMeeting(row: Row): Meeting {
  return {
    id: text(row.id), meetsOn: text(row.meets_on), timeLabel: text(row.time_label), location: text(row.location),
    kind: text(row.kind) as MeetingKind, status: text(row.status) as Meeting['status'],
    agendaLockedAt: nullableText(row.agenda_locked_at), agendaLockedBy: nullableText(row.agenda_locked_by),
    calledToOrderAt: nullableText(row.called_to_order_at), adjournedAt: nullableText(row.adjourned_at),
    minutesStatus: text(row.minutes_status) as Meeting['minutesStatus'], approvedAt: nullableText(row.approved_at),
  }
}
function readAgenda(row: Row): AgendaItem {
  return {
    id: text(row.id), meetingId: text(row.meeting_id), position: Number(row.position ?? 0), title: text(row.title),
    source: text(row.source) as AgendaItem['source'], sourceRef: text(row.source_ref), notes: text(row.notes),
    removedAt: nullableText(row.removed_at),
  }
}
function readAttendance(row: Row): Attendance {
  return {
    id: text(row.id), meetingId: text(row.meeting_id), personId: text(row.person_id),
    status: text(row.status) === 'present' ? 'present' : 'absent', recordedBy: nullableText(row.recorded_by),
  }
}
function readMotion(row: Row): Motion {
  return {
    id: text(row.id), meetingId: text(row.meeting_id), position: Number(row.position ?? 0), text: text(row.text),
    movedBy: nullableText(row.moved_by), secondedBy: nullableText(row.seconded_by),
    disposition: text(row.disposition) as Motion['disposition'], tabledToMeetingId: nullableText(row.tabled_to_meeting_id),
    voteFor: nullableNumber(row.vote_for), voteAgainst: nullableNumber(row.vote_against),
    bylawReference: text(row.bylaw_reference), textBefore: text(row.text_before), textAfter: text(row.text_after),
  }
}

/* A report row carries body_id. The body's row itself is invisible to a
   non-member when the body is confidential, so the slug and name are looked
   up from the bodies this person can read plus the filed pointers, which
   name every filed report's body to the Board. */
function readReport(row: Row, names: Map<string, { slug: string; name: string }>): Report {
  const body = names.get(text(row.body_id)) ?? { slug: '', name: '' }
  const kind = text(row.kind) as ReportKind
  const bodySlug = body.slug
  return {
    id: text(row.id), kind, file: readFile(row), bodySlug, bodyName: body.name, meetingId: nullableText(row.meeting_id),
    periodStart: nullableText(row.period_start), periodEnd: nullableText(row.period_end),
    status: text(row.status) as ReportStatus, payload: normalisePayload(kind, bodySlug, row.payload),
    createdBy: nullableText(row.created_by), updatedBy: nullableText(row.updated_by), updatedAt: text(row.updated_at),
    submittedBy: nullableText(row.submitted_by), submittedAt: nullableText(row.submitted_at),
    publishedAt: nullableText(row.published_at), archivedAt: nullableText(row.archived_at),
  }
}
function readFile(row: Row): ReportFile | null {
  const path = nullableText(row.file_path)
  return path ? { path, name: text(row.file_name) || path.split('/').pop() || 'file', type: text(row.file_type) || 'application/octet-stream' } : null
}
function readVersion(row: Row): ReportVersion {
  return {
    id: text(row.id), reportId: text(row.report_id), versionNo: Number(row.version_no ?? 0), file: readFile(row),
    payload: (row.payload ?? {}) as ReportPayload, rendered: text(row.rendered), createdBy: nullableText(row.created_by),
    publishedAt: text(row.published_at), supersedesVersionId: nullableText(row.supersedes_version_id),
  }
}
function readFiled(row: Row, meetingId: string): FiledPointer {
  return {
    meetingId,
    reportId: nullableText(row.report_id), kind: text(row.kind) as ReportKind, bodySlug: text(row.body_slug), bodyName: text(row.body_name),
    confidential: row.confidential === true, status: text(row.status) as ReportStatus,
    submittedAt: nullableText(row.submitted_at), publishedAt: nullableText(row.published_at),
  }
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Could not ${what}: ${error?.message ?? 'no row came back'}`)
}

/** The Board's room in Postgres. Every read and write goes through the
    policies in 0005; this class adds nothing to them and hides nothing. */
export class SupabaseMeetingRepository implements MeetingRepository {
  private client() {
    if (!supabase) throw new Error('Supabase is not configured for this build.')
    return supabase
  }

  async load(): Promise<MeetingsData> {
    const client = this.client()
    const [meetings, agenda, attendance, motions, seats, settings, me, reports, versions, people, bodies, obligations, documents, findings] = await Promise.all([
      client.from('board_meeting').select('*').order('meets_on'),
      client.from('agenda_item').select('*').order('position'),
      client.from('meeting_attendance').select('*'),
      client.from('motion').select('*').order('position'),
      client
        .from('membership')
        .select('person_id, role_in_body, term_start, term_end, body!inner(slug), person!inner(name, role, active)')
        .eq('body.slug', 'deacon-board')
        .eq('active', true),
      client.from('church_settings').select('deacon_year_start_month').limit(1),
      client.rpc('claim_account'),
      client.from('report').select('*').order('updated_at', { ascending: false }),
      client.from('report_version').select('*').order('version_no'),
      client.from('person').select('id, name'),
      client.from('body').select('id, slug, name'),
      client.from('obligation').select('*').eq('active', true).order('position'),
      client.from('governance_document').select('*').order('position'),
      client.from('governance_finding').select('*').order('number'),
    ])
    for (const [what, result] of [['read meetings', meetings], ['read the agenda', agenda], ['read attendance', attendance], ['read motions', motions], ['read the roll', seats], ['read reports', reports], ['read versions', versions], ['read names', people], ['read the year', obligations], ['read the reference', documents], ['read the docket', findings]] as const) {
      if (result.error) fail(what, result.error)
    }
    // What was filed against each meeting: pointers, Board members only.
    const meetingRows = ((meetings.data ?? []) as Row[]).map(readMeeting)
    const filedRows = await Promise.all(meetingRows.map((m) => client.rpc('reports_filed', { for_meeting: m.id })))
    const filed = filedRows.flatMap((result, index) =>
      result.error ? [] : ((result.data ?? []) as Row[]).map((row) => readFiled(row, meetingRows[index].id)),
    )
    const bodyNames = new Map<string, { slug: string; name: string }>()
    for (const row of (bodies.data ?? []) as Row[]) bodyNames.set(text(row.id), { slug: text(row.slug), name: text(row.name) })
    const bodyIdOf = new Map<string, string>() // report id → body id, so a pointer can name a body the reader cannot see
    for (const row of (reports.data ?? []) as Row[]) bodyIdOf.set(text(row.id), text(row.body_id))
    for (const pointer of filed) {
      const bodyId = pointer.reportId ? bodyIdOf.get(pointer.reportId) : undefined
      if (bodyId && !bodyNames.has(bodyId)) bodyNames.set(bodyId, { slug: pointer.bodySlug, name: pointer.bodyName })
    }
    const today = new Date().toISOString().slice(0, 10)
    const roster: BoardMember[] = ((seats.data ?? []) as Row[])
      .filter((row) => {
        const person = row.person as Row | null
        const start = nullableText(row.term_start)
        const end = nullableText(row.term_end)
        return person?.active === true && (!start || start <= today) && (!end || end >= today)
      })
      .map((row) => {
        const person = row.person as Row
        return { personId: text(row.person_id), name: text(person.name), role: text(person.role), seat: text(row.role_in_body) as BoardMember['seat'] }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    const settingsRow = ((settings.data ?? []) as Row[])[0]
    const meRow = (Array.isArray(me.data) ? me.data[0] : me.data) as Row | null
    return {
      meetings: meetingRows,
      agenda: ((agenda.data ?? []) as Row[]).map(readAgenda),
      attendance: ((attendance.data ?? []) as Row[]).map(readAttendance),
      motions: ((motions.data ?? []) as Row[]).map(readMotion),
      reports: ((reports.data ?? []) as Row[]).map((row) => readReport(row, bodyNames)),
      versions: ((versions.data ?? []) as Row[]).map(readVersion),
      filed,
      names: Object.fromEntries(((people.data ?? []) as Row[]).map((row) => [text(row.id), text(row.name)])),
      roster,
      me: meRow ? text(meRow.id) || null : null,
      deaconYearStartMonth: Number(settingsRow?.deacon_year_start_month ?? 1) || 1,
      obligations: ((obligations.data ?? []) as Row[]).map((row) => ({
        id: text(row.id), slug: text(row.slug), title: text(row.title), ruleSource: text(row.rule_source), requirement: text(row.requirement),
        cadence: text(row.cadence) as Obligation['cadence'], anchor: text(row.anchor), noticeDays: Number(row.notice_days ?? 0) || 0,
        ownerBodySlug: text(row.owner_body_slug), active: row.active === true, position: Number(row.position ?? 0) || 0,
      })),
      documents: ((documents.data ?? []) as Row[]).map((row) => ({
        id: text(row.id), slug: text(row.slug), kind: text(row.kind) as GovernanceDocument['kind'], code: text(row.code), title: text(row.title),
        body: text(row.body), position: Number(row.position ?? 0) || 0,
      })),
      findings: ((findings.data ?? []) as Row[]).map((row) => ({
        id: text(row.id), number: Number(row.number ?? 0) || 0, title: text(row.title), body: text(row.body),
        cites: Array.isArray(row.cites) ? (row.cites as unknown[]).filter((c): c is string => typeof c === 'string') : [],
        status: text(row.status) === 'resolved' ? 'resolved' : 'open',
      })),
    }
  }

  async createMeeting(input: { meetsOn: string; kind: MeetingKind; timeLabel: string; location: string }, me: string): Promise<Meeting> {
    const { data, error } = await this.client()
      .from('board_meeting')
      .insert({ meets_on: input.meetsOn, kind: input.kind, time_label: input.timeLabel, location: input.location, created_by: me })
      .select('*')
      .single()
    if (error || !data) fail('schedule the meeting', error)
    return readMeeting(data as Row)
  }

  async updateMeeting(id: string, patch: Partial<Meeting>): Promise<void> {
    const fields: Row = {}
    if (patch.status !== undefined) fields.status = patch.status
    if (patch.agendaLockedAt !== undefined) fields.agenda_locked_at = patch.agendaLockedAt
    if (patch.agendaLockedBy !== undefined) fields.agenda_locked_by = patch.agendaLockedBy
    if (patch.calledToOrderAt !== undefined) fields.called_to_order_at = patch.calledToOrderAt
    if (patch.adjournedAt !== undefined) fields.adjourned_at = patch.adjournedAt
    if (patch.minutesStatus !== undefined) fields.minutes_status = patch.minutesStatus
    if (patch.approvedAt !== undefined) fields.approved_at = patch.approvedAt
    if (patch.timeLabel !== undefined) fields.time_label = patch.timeLabel
    if (patch.location !== undefined) fields.location = patch.location
    const { error } = await this.client().from('board_meeting').update(fields).eq('id', id)
    if (error) fail('update the meeting', error)
  }

  async addAgendaItem(item: Omit<AgendaItem, 'id' | 'removedAt'>, me: string): Promise<AgendaItem> {
    const { data, error } = await this.client()
      .from('agenda_item')
      .insert({ meeting_id: item.meetingId, position: item.position, title: item.title, source: item.source, source_ref: item.sourceRef, notes: item.notes, created_by: me })
      .select('*')
      .single()
    if (error || !data) fail('add the agenda item', error)
    return readAgenda(data as Row)
  }

  async removeAgendaItem(id: string): Promise<void> {
    const { error } = await this.client().from('agenda_item').update({ removed_at: nowIso() }).eq('id', id)
    if (error) fail('remove the agenda item', error)
  }

  async recordAttendance(meetingId: string, personId: string, status: AttendanceStatus, me: string): Promise<Attendance> {
    const { data, error } = await this.client()
      .from('meeting_attendance')
      .upsert({ meeting_id: meetingId, person_id: personId, status, recorded_by: me }, { onConflict: 'meeting_id,person_id' })
      .select('*')
      .single()
    if (error || !data) fail('record attendance', error)
    return readAttendance(data as Row)
  }

  async recordMotion(meetingId: string, position: number, motion: NewMotion, me: string): Promise<Motion> {
    const { data, error } = await this.client()
      .from('motion')
      .insert({
        meeting_id: meetingId, position, text: motion.text, moved_by: motion.movedBy, seconded_by: motion.secondedBy,
        disposition: motion.disposition, vote_for: motion.voteFor, vote_against: motion.voteAgainst,
        bylaw_reference: motion.bylawReference, text_before: motion.textBefore, text_after: motion.textAfter, recorded_by: me,
      })
      .select('*')
      .single()
    if (error || !data) fail('record the motion', error)
    return readMotion(data as Row)
  }

  async takeUp(motionId: string, meetingId: string): Promise<void> {
    const { error } = await this.client().from('motion').update({ tabled_to_meeting_id: meetingId }).eq('id', motionId)
    if (error) fail('take up the motion', error)
  }

  async createReport(input: { kind: ReportKind; bodySlug: string; meetingId: string | null; periodStart: string | null; periodEnd: string | null; payload: ReportPayload }, me: string): Promise<Report> {
    const client = this.client()
    const body = await client.from('body').select('id').eq('slug', input.bodySlug).single()
    if (body.error || !body.data) fail('find the committee', body.error)
    const { data, error } = await client
      .from('report')
      .insert({
        kind: input.kind, body_id: (body.data as Row).id, meeting_id: input.meetingId, period_start: input.periodStart, period_end: input.periodEnd,
        payload: input.payload, created_by: me, updated_by: me,
      })
      .select('*')
      .single()
    if (error || !data) fail('start the report', error)
    const names = new Map([[text((body.data as Row).id), { slug: input.bodySlug, name: BODY_NAMES[input.bodySlug] ?? input.bodySlug }]])
    return readReport(data as Row, names)
  }

  async saveReport(id: string, patch: Parameters<MeetingRepository['saveReport']>[1], me: string): Promise<void> {
    const fields: Row = { updated_by: me, updated_at: nowIso() }
    if (patch.payload !== undefined) fields.payload = patch.payload
    if (patch.file !== undefined) {
      fields.file_path = patch.file?.path ?? null
      fields.file_name = patch.file?.name ?? null
      fields.file_type = patch.file?.type ?? null
    }
    if (patch.meetingId !== undefined) fields.meeting_id = patch.meetingId
    if (patch.status !== undefined) fields.status = patch.status
    if (patch.submittedAt !== undefined) fields.submitted_at = patch.submittedAt
    if (patch.submittedBy !== undefined) fields.submitted_by = patch.submittedBy
    if (patch.publishedAt !== undefined) fields.published_at = patch.publishedAt
    if (patch.archivedAt !== undefined) fields.archived_at = patch.archivedAt
    const { error } = await this.client().from('report').update(fields).eq('id', id)
    if (error) fail('save the report', error)
  }

  async addVersion(input: { reportId: string; versionNo: number; payload: ReportPayload; rendered: string; file: ReportFile | null; supersedesVersionId: string | null }, me: string): Promise<ReportVersion> {
    const { data, error } = await this.client()
      .from('report_version')
      .insert({
        report_id: input.reportId, version_no: input.versionNo, payload: input.payload, rendered: input.rendered,
        file_path: input.file?.path ?? null, file_name: input.file?.name ?? null, file_type: input.file?.type ?? null,
        supersedes_version_id: input.supersedesVersionId, created_by: me,
      })
      .select('*')
      .single()
    if (error || !data) fail('publish the version', error)
    return readVersion(data as Row)
  }

  async uploadFile(reportId: string, versionNo: number, file: File): Promise<ReportFile> {
    const safeName = file.name.replace(/[^\w.\-]+/g, '-')
    const path = `${reportId}/${versionNo}-${safeName}`
    const { error } = await this.client().storage.from('reports').upload(path, file, { contentType: file.type || undefined, upsert: false })
    if (error) fail('upload the file', error)
    return { path, name: file.name, type: file.type || 'application/octet-stream' }
  }

  async fileUrl(file: ReportFile): Promise<string | null> {
    const { data, error } = await this.client().storage.from('reports').createSignedUrl(file.path, 60 * 60)
    if (error) return null
    return data?.signedUrl ?? null
  }
}

export const meetingRepository: MeetingRepository = supabaseConfigured ? new SupabaseMeetingRepository() : new LocalMeetingRepository()
