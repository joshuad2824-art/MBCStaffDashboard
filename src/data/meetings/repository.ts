import { supabase, supabaseConfigured } from '../../lib/supabase'
import { SEED_SEATS } from '../seed'
import type { Person } from '../types'
import { attendanceCounts } from './derive'
import { seedAgenda, seedAttendance, seedMeetings, seedMotions } from './seed'
import type {
  AgendaItem,
  Attendance,
  AttendanceCount,
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
  updateMeeting(id: string, patch: Partial<Pick<Meeting, 'status' | 'agendaLockedAt' | 'agendaLockedBy' | 'minutesStatus' | 'approvedAt' | 'timeLabel' | 'location'>>): Promise<void>
  addAgendaItem(item: Omit<AgendaItem, 'id' | 'removedAt'>, me: string): Promise<AgendaItem>
  removeAgendaItem(id: string): Promise<void>
  recordAttendance(meetingId: string, personId: string, status: AttendanceStatus, note: string, me: string): Promise<Attendance>
  recordMotion(meetingId: string, position: number, motion: NewMotion, me: string): Promise<Motion>
  takeUp(motionId: string, meetingId: string): Promise<void>
  /** The chairman's count. Empty for anyone else — the database decides. */
  attendanceCounts(data: MeetingsData, meeting: Meeting): Promise<AttendanceCount[]>
}

const STORAGE_KEY = 'mbc.deacons.meetings.v1'

interface Stored {
  meetings: Meeting[]
  agenda: AgendaItem[]
  attendance: Attendance[]
  motions: Motion[]
}

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
    let data: Stored = { meetings: seedMeetings, agenda: seedAgenda, attendance: seedAttendance, motions: seedMotions }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) data = JSON.parse(raw) as Stored
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

  async load(stub: StubContext): Promise<MeetingsData> {
    const data = this.read()
    this.roster = stub.people
      .filter((person) => person.active)
      .flatMap((person) => {
        const seat = (SEED_SEATS[person.id] ?? []).find((s) => s.slug === 'deacon-board')
        return seat ? [{ personId: String(person.id), name: person.name, role: person.role, seat: seat.role }] : []
      })
    return {
      ...data,
      roster: this.roster,
      me: stub.meId === null ? null : String(stub.meId),
      deaconYearStartMonth: 1,
    }
  }

  async createMeeting(input: { meetsOn: string; kind: MeetingKind; timeLabel: string; location: string }, _me: string): Promise<Meeting> {
    const meeting: Meeting = {
      id: newId(), ...input, status: 'planned', agendaLockedAt: null, agendaLockedBy: null, minutesStatus: 'none', approvedAt: null,
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

  async recordAttendance(meetingId: string, personId: string, status: AttendanceStatus, note: string, me: string): Promise<Attendance> {
    const data = this.read()
    const existing = data.attendance.find((a) => a.meetingId === meetingId && a.personId === personId)
    const row: Attendance = existing
      ? { ...existing, status, justCauseNote: note }
      : { id: newId(), meetingId, personId, status, justCauseNote: note, recordedBy: me }
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

  async attendanceCounts(data: MeetingsData, meeting: Meeting): Promise<AttendanceCount[]> {
    // The stub has no chairman-only query, so the screen decides who asks.
    return attendanceCounts(data, meeting)
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
    status: text(row.status) as AttendanceStatus, justCauseNote: text(row.just_cause_note), recordedBy: nullableText(row.recorded_by),
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
    const [meetings, agenda, attendance, motions, seats, settings, me] = await Promise.all([
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
    ])
    for (const [what, result] of [['read meetings', meetings], ['read the agenda', agenda], ['read attendance', attendance], ['read motions', motions], ['read the roll', seats]] as const) {
      if (result.error) fail(what, result.error)
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
      meetings: ((meetings.data ?? []) as Row[]).map(readMeeting),
      agenda: ((agenda.data ?? []) as Row[]).map(readAgenda),
      attendance: ((attendance.data ?? []) as Row[]).map(readAttendance),
      motions: ((motions.data ?? []) as Row[]).map(readMotion),
      roster,
      me: meRow ? text(meRow.id) || null : null,
      deaconYearStartMonth: Number(settingsRow?.deacon_year_start_month ?? 1) || 1,
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

  async recordAttendance(meetingId: string, personId: string, status: AttendanceStatus, note: string, me: string): Promise<Attendance> {
    const { data, error } = await this.client()
      .from('meeting_attendance')
      .upsert({ meeting_id: meetingId, person_id: personId, status, just_cause_note: note, recorded_by: me }, { onConflict: 'meeting_id,person_id' })
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

  async attendanceCounts(_data: MeetingsData, meeting: Meeting): Promise<AttendanceCount[]> {
    const { data, error } = await this.client().rpc('board_attendance_summary', { on_date: meeting.meetsOn })
    if (error) fail('read the attendance count', error)
    return ((data ?? []) as Row[]).map((row) => ({
      personId: text(row.person_id), name: text(row.name), meetingsHeld: Number(row.meetings_held ?? 0),
      present: Number(row.present ?? 0), absent: Number(row.absent ?? 0), excused: Number(row.excused ?? 0),
    }))
  }
}

export const meetingRepository: MeetingRepository = supabaseConfigured ? new SupabaseMeetingRepository() : new LocalMeetingRepository()
