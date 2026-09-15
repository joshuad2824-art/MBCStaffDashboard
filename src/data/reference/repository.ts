import { supabase, supabaseConfigured } from '../../lib/supabase'
import { seedDocuments, seedFindings } from '../meetings/governance'
import type { Finding, GovernanceDocument } from '../meetings/types'

/* The reference's persistence seam.
   ---------------------------------
   Separate from the Board's room (src/data/meetings/repository.ts) because the
   manual is not the Board's alone: since 0015 it is open to everyone who
   signs in, on either side. Loading the reference must not mean loading the
   meeting, so it has its own two reads and nothing else.

   It reads. There is no write here, as there is no write policy on either
   table: the corpus is loaded by supabase/governance/build-seed.mjs, by SQL.

   The docket stays the deacon side's, and a staff account gets zero rows of
   it — which the screen must not mistake for a loading failure. */

export interface ReferenceData {
  documents: GovernanceDocument[]
  findings: Finding[]
}

export interface StubContext {
  /** The bodies the signed-in person sits in, for the stub's copy of the docket's policy. */
  bodies: string[]
}

export interface ReferenceRepository {
  load(stub: StubContext): Promise<ReferenceData>
}

type Row = Record<string, unknown>
const text = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value))
const KINDS: GovernanceDocument['kind'][] = ['constitution', 'bylaws', 'policy', 'procedure', 'reference']

function readDocument(row: Row): GovernanceDocument {
  const kind = text(row.kind) as GovernanceDocument['kind']
  return {
    id: text(row.id), slug: text(row.slug), kind: KINDS.includes(kind) ? kind : 'reference', code: text(row.code), title: text(row.title),
    body: text(row.body), position: Number(row.position ?? 0) || 0,
  }
}

function readFinding(row: Row): Finding {
  return {
    id: text(row.id), number: Number(row.number ?? 0) || 0, title: text(row.title), body: text(row.body),
    cites: Array.isArray(row.cites) ? (row.cites as unknown[]).filter((c): c is string => typeof c === 'string') : [],
    status: text(row.status) === 'resolved' ? 'resolved' : 'open',
  }
}

/** The reference in Postgres. The policies decide what comes back — the
    manual to anyone signed in, the docket to the deacon side — and this class
    adds nothing to them and hides nothing. */
export class SupabaseReferenceRepository implements ReferenceRepository {
  async load(): Promise<ReferenceData> {
    if (!supabase) throw new Error('Supabase is not configured for this build.')
    const [documents, findings] = await Promise.all([
      supabase.from('governance_document').select('*').order('position'),
      supabase.from('governance_finding').select('*').order('number'),
    ])
    if (documents.error) throw new Error(`Could not read the reference: ${documents.error.message}`)
    if (findings.error) throw new Error(`Could not read the docket: ${findings.error.message}`)
    return {
      documents: ((documents.data ?? []) as Row[]).map(readDocument),
      findings: ((findings.data ?? []) as Row[]).map(readFinding),
    }
  }
}

/** The stub's copy of the two policies: the manual to anyone signed in, the
    docket if they sit anywhere but staff. Same answers the database gives;
    nothing else decides. */
export class LocalReferenceRepository implements ReferenceRepository {
  async load(stub: StubContext): Promise<ReferenceData> {
    const onDeaconSide = stub.bodies.some((slug) => slug !== 'staff')
    return {
      documents: seedDocuments,
      findings: onDeaconSide ? seedFindings : [],
    }
  }
}

export const referenceRepository: ReferenceRepository = supabaseConfigured ? new SupabaseReferenceRepository() : new LocalReferenceRepository()
