import { supabase, supabaseConfigured } from '../../lib/supabase'
import { seedSeatsFor } from '../seed'
import type { Person } from '../types'
import { seedAssignments, seedLinks, seedRequests, seedVisits, seedWeeks } from './seed'
import type { CareAssignment, CareData, CareRequest, CareRequestLink, DeaconVisit, DeaconWeek, HelpKind, VisitKind } from './types'

/* The care seam — named operations, like the meetings seam, because every
   row here is a record. Nothing is deleted: an assignment goes inactive, a
   request goes done. And nothing here carries a circumstance: the operations
   take a household, a kind of help, a date and a man, and nothing else.

   askDeacon is the one place something crosses the sensitivity boundary. It
   writes a request — household, kind of help, by when, who asked — and a
   link from that request to the staff member's own care entry, in a table
   the deacon side reads zero rows of. There is no operation that takes a
   care entry and produces a request from it; the translation from a
   circumstance to an action is done by the person asking, in the form. */

export interface StubContext {
  people: Person[]
  meId: number | null
}

export interface CareRepository {
  load(stub: StubContext): Promise<CareData>
  /* The plan. */
  assign(householdLabel: string, deaconId: string, me: string): Promise<CareAssignment>
  contacted(assignmentId: string, on: string): Promise<void>
  reassign(assignmentId: string, deaconId: string): Promise<void>
  retire(assignmentId: string): Promise<void>
  /* The handoff. */
  askDeacon(input: { householdLabel: string; helpKind: HelpKind; neededBy: string | null; careEntryId: string | null }, me: string): Promise<CareRequest>
  takeUp(requestId: string, deaconId: string): Promise<void>
  markDone(requestId: string, on: string): Promise<void>
  /* Deacon of the Week. */
  setWeek(weekOf: string, personId: string, backupPersonId: string | null, me: string): Promise<DeaconWeek>
  logVisit(weekId: string, householdLabel: string, kind: VisitKind, on: string, me: string): Promise<DeaconVisit>
}

const STORAGE_KEY = 'mbc.deacons.care.v1'

interface Stored {
  assignments: CareAssignment[]
  requests: CareRequest[]
  links: CareRequestLink[]
  weeks: DeaconWeek[]
  visits: DeaconVisit[]
}

function newId(): string {
  return crypto.randomUUID()
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA')
}

/** Seed data in the browser. The stub's version of the policies: the Board
    reads the plan and the requests; the staff role reads the requests and the
    links; a limited account reads only who is on call. */
export class LocalCareRepository implements CareRepository {
  private stored: Stored | null = null

  private read(): Stored {
    if (this.stored) return this.stored
    let data: Stored = { assignments: seedAssignments, requests: seedRequests, links: seedLinks, weeks: seedWeeks, visits: seedVisits }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) data = { ...data, ...(JSON.parse(raw) as Partial<Stored>) }
    } catch {
      // A corrupt store is not worth failing the page over.
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

  async load(stub: StubContext): Promise<CareData> {
    const data = this.read()
    const me = stub.people.find((p) => p.id === stub.meId) ?? null
    const seats = me ? seedSeatsFor(me) : []
    const onBoard = seats.some((s) => s.slug === 'deacon-board')
    const staffRole = me?.access === 'staff' && seats.some((s) => s.slug === 'staff')
    return {
      assignments: onBoard ? data.assignments : [],
      requests: onBoard || staffRole ? data.requests : [],
      links: staffRole ? data.links : [],
      weeks: me ? data.weeks : [],
      visits: onBoard ? data.visits : [],
      names: Object.fromEntries(stub.people.map((p) => [String(p.id), p.name])),
      me: stub.meId === null ? null : String(stub.meId),
    }
  }

  async assign(householdLabel: string, deaconId: string, me: string): Promise<CareAssignment> {
    const row: CareAssignment = { id: newId(), householdLabel, assignedTo: deaconId, lastContactOn: null, active: true, createdBy: me }
    const data = this.read()
    this.write({ ...data, assignments: [...data.assignments, row] })
    return row
  }

  async contacted(assignmentId: string, on: string): Promise<void> {
    const data = this.read()
    this.write({ ...data, assignments: data.assignments.map((a) => (a.id === assignmentId ? { ...a, lastContactOn: on } : a)) })
  }

  async reassign(assignmentId: string, deaconId: string): Promise<void> {
    const data = this.read()
    this.write({ ...data, assignments: data.assignments.map((a) => (a.id === assignmentId ? { ...a, assignedTo: deaconId } : a)) })
  }

  async retire(assignmentId: string): Promise<void> {
    const data = this.read()
    this.write({ ...data, assignments: data.assignments.map((a) => (a.id === assignmentId ? { ...a, active: false } : a)) })
  }

  async askDeacon(input: { householdLabel: string; helpKind: HelpKind; neededBy: string | null; careEntryId: string | null }, me: string): Promise<CareRequest> {
    const row: CareRequest = {
      id: newId(), householdLabel: input.householdLabel, helpKind: input.helpKind, neededBy: input.neededBy,
      requestedBy: me, assignedTo: null, status: 'open', completedOn: null, createdAt: todayIso(),
    }
    const data = this.read()
    this.write({
      ...data,
      requests: [...data.requests, row],
      links: input.careEntryId ? [...data.links, { requestId: row.id, careEntryId: input.careEntryId }] : data.links,
    })
    return row
  }

  async takeUp(requestId: string, deaconId: string): Promise<void> {
    const data = this.read()
    this.write({ ...data, requests: data.requests.map((r) => (r.id === requestId && r.status === 'open' ? { ...r, status: 'accepted', assignedTo: deaconId } : r)) })
  }

  async markDone(requestId: string, on: string): Promise<void> {
    const data = this.read()
    this.write({ ...data, requests: data.requests.map((r) => (r.id === requestId && r.status !== 'done' ? { ...r, status: 'done', completedOn: on } : r)) })
  }

  async setWeek(weekOf: string, personId: string, backupPersonId: string | null, _me: string): Promise<DeaconWeek> {
    const data = this.read()
    const existing = data.weeks.find((w) => w.weekOf === weekOf)
    const row: DeaconWeek = existing ? { ...existing, personId, backupPersonId } : { id: newId(), weekOf, personId, backupPersonId }
    this.write({ ...data, weeks: existing ? data.weeks.map((w) => (w.id === row.id ? row : w)) : [...data.weeks, row] })
    return row
  }

  async logVisit(weekId: string, householdLabel: string, kind: VisitKind, on: string, me: string): Promise<DeaconVisit> {
    const row: DeaconVisit = { id: newId(), weekId, householdLabel, kind, visitedOn: on, personId: me }
    const data = this.read()
    this.write({ ...data, visits: [...data.visits, row] })
    return row
  }
}

type Row = Record<string, unknown>

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Could not ${what}: ${error?.message ?? 'no row came back'}`)
}

const readAssignment = (row: Row): CareAssignment => ({
  id: text(row.id), householdLabel: text(row.household_label), assignedTo: text(row.assigned_to),
  lastContactOn: nullableText(row.last_contact_on), active: row.active === true, createdBy: nullableText(row.created_by),
})
const readRequest = (row: Row): CareRequest => ({
  id: text(row.id), householdLabel: text(row.household_label), helpKind: text(row.help_kind) as HelpKind,
  neededBy: nullableText(row.needed_by), requestedBy: text(row.requested_by), assignedTo: nullableText(row.assigned_to),
  status: text(row.status) as CareRequest['status'], completedOn: nullableText(row.completed_on), createdAt: text(row.created_at).slice(0, 10),
})
const readWeek = (row: Row): DeaconWeek => ({
  id: text(row.id), weekOf: text(row.week_of), personId: text(row.person_id), backupPersonId: nullableText(row.backup_person_id),
})
const readVisit = (row: Row): DeaconVisit => ({
  id: text(row.id), weekId: text(row.deacon_week_id), householdLabel: text(row.household_label),
  kind: text(row.kind) as VisitKind, visitedOn: text(row.visited_on), personId: text(row.person_id),
})

/** The configured project. Every read is what the policies return and
    nothing more; every write is one named row. */
export class SupabaseCareRepository implements CareRepository {
  private client() {
    if (!supabase) throw new Error('Supabase is not configured.')
    return supabase
  }

  async load(): Promise<CareData> {
    const client = this.client()
    const [assignments, requests, links, weeks, visits, people, me] = await Promise.all([
      client.from('care_assignment').select('*').order('household_label'),
      client.from('care_request').select('*').order('created_at', { ascending: false }),
      client.from('care_request_link').select('*'),
      client.from('deacon_week').select('*').order('week_of'),
      client.from('deacon_visit').select('*').order('visited_on', { ascending: false }),
      client.from('person').select('id, name'),
      client.rpc('claim_account'),
    ])
    for (const [what, result] of [['read the plan', assignments], ['read requests', requests], ['read links', links], ['read the rotation', weeks], ['read visits', visits], ['read names', people]] as const) {
      if (result.error) fail(what, result.error)
    }
    const meRow = (Array.isArray(me.data) ? me.data[0] : me.data) as Row | null
    return {
      assignments: ((assignments.data ?? []) as Row[]).map(readAssignment),
      requests: ((requests.data ?? []) as Row[]).map(readRequest),
      links: ((links.data ?? []) as Row[]).map((row) => ({ requestId: text(row.care_request_id), careEntryId: text(row.care_entry_id) })),
      weeks: ((weeks.data ?? []) as Row[]).map(readWeek),
      visits: ((visits.data ?? []) as Row[]).map(readVisit),
      names: Object.fromEntries(((people.data ?? []) as Row[]).map((row) => [text(row.id), text(row.name)])),
      me: meRow ? text(meRow.id) || null : null,
    }
  }

  async assign(householdLabel: string, deaconId: string, me: string): Promise<CareAssignment> {
    const { data, error } = await this.client().from('care_assignment').insert({ household_label: householdLabel, assigned_to: deaconId, created_by: me }).select('*').single()
    if (error || !data) fail('assign the household', error)
    return readAssignment(data as Row)
  }

  async contacted(assignmentId: string, on: string): Promise<void> {
    const { error } = await this.client().from('care_assignment').update({ last_contact_on: on }).eq('id', assignmentId)
    if (error) fail('record the contact', error)
  }

  async reassign(assignmentId: string, deaconId: string): Promise<void> {
    const { error } = await this.client().from('care_assignment').update({ assigned_to: deaconId }).eq('id', assignmentId)
    if (error) fail('reassign the household', error)
  }

  async retire(assignmentId: string): Promise<void> {
    const { error } = await this.client().from('care_assignment').update({ active: false }).eq('id', assignmentId)
    if (error) fail('retire the assignment', error)
  }

  async askDeacon(input: { householdLabel: string; helpKind: HelpKind; neededBy: string | null; careEntryId: string | null }, me: string): Promise<CareRequest> {
    const client = this.client()
    const { data, error } = await client
      .from('care_request')
      .insert({ household_label: input.householdLabel, help_kind: input.helpKind, needed_by: input.neededBy, requested_by: me })
      .select('*')
      .single()
    if (error || !data) fail('ask a deacon', error)
    const request = readRequest(data as Row)
    if (input.careEntryId) {
      const { error: linkError } = await client.from('care_request_link').insert({ care_request_id: request.id, care_entry_id: input.careEntryId })
      if (linkError) fail('keep the thread to the care entry', linkError)
    }
    return request
  }

  async takeUp(requestId: string, deaconId: string): Promise<void> {
    const { error } = await this.client().from('care_request').update({ status: 'accepted', assigned_to: deaconId }).eq('id', requestId)
    if (error) fail('take the request up', error)
  }

  async markDone(requestId: string, on: string): Promise<void> {
    const { error } = await this.client().from('care_request').update({ status: 'done', completed_on: on }).eq('id', requestId)
    if (error) fail('mark the request done', error)
  }

  async setWeek(weekOf: string, personId: string, backupPersonId: string | null, me: string): Promise<DeaconWeek> {
    const client = this.client()
    const existing = await client.from('deacon_week').select('id').eq('week_of', weekOf).maybeSingle()
    if (existing.error) fail('read the rotation', existing.error)
    if (existing.data) {
      const { data, error } = await client.from('deacon_week').update({ person_id: personId, backup_person_id: backupPersonId }).eq('id', text((existing.data as Row).id)).select('*').single()
      if (error || !data) fail('set the week', error)
      return readWeek(data as Row)
    }
    const { data, error } = await client.from('deacon_week').insert({ week_of: weekOf, person_id: personId, backup_person_id: backupPersonId, created_by: me }).select('*').single()
    if (error || !data) fail('set the week', error)
    return readWeek(data as Row)
  }

  async logVisit(weekId: string, householdLabel: string, kind: VisitKind, on: string, me: string): Promise<DeaconVisit> {
    const { data, error } = await this.client().from('deacon_visit').insert({ deacon_week_id: weekId, household_label: householdLabel, kind, visited_on: on, person_id: me }).select('*').single()
    if (error || !data) fail('log the visit', error)
    return readVisit(data as Row)
  }
}

export const careRepository: CareRepository = supabaseConfigured ? new SupabaseCareRepository() : new LocalCareRepository()
