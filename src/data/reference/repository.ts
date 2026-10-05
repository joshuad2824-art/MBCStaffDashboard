import { supabase, supabaseConfigured } from '../../lib/supabase'
import { seedDocuments } from '../meetings/governance'
import { splitSections } from './sections'
import type { GovernanceDocument, GovernanceSection, MatchKind, SearchHit } from './types'
import { searchSections } from './matching'

/* The reference's persistence seam.
   ---------------------------------
   Separate from the Board's room (src/data/meetings/repository.ts) because the
   manual is not the Board's alone: since 0015 it is open to everyone who
   signs in, on either side. Two reads and one search; no write, as there is
   no write policy on either table — the corpus and its sections are loaded
   by supabase/governance/build-seed.mjs, by SQL.

   The search is search_manual() in Postgres (0016, made forgiving in 0019): a
   citation typed as a string lands on the paragraph, above a title, a heading
   and the text, a word's start is enough, and a misspelling is corrected and
   says so. The stub runs the same tiers over the seeded sections in
   matching.ts and answers in the same shape, so the screen never knows which
   one answered. */

export interface ReferenceData {
  documents: GovernanceDocument[]
  sections: GovernanceSection[]
}

export interface ReferenceRepository {
  load(): Promise<ReferenceData>
  search(q: string): Promise<SearchHit[]>
}

type Row = Record<string, unknown>
const text = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value))
const strings = (value: unknown): string[] => (Array.isArray(value) ? (value as unknown[]).filter((s): s is string => typeof s === 'string') : [])
const KINDS: GovernanceDocument['kind'][] = ['constitution', 'bylaws', 'policy', 'procedure', 'reference']
const kindOf = (value: unknown): GovernanceDocument['kind'] => (KINDS.includes(text(value) as GovernanceDocument['kind']) ? (text(value) as GovernanceDocument['kind']) : 'reference')

function readDocument(row: Row): GovernanceDocument {
  return { id: text(row.id), slug: text(row.slug), kind: kindOf(row.kind), code: text(row.code), title: text(row.title), body: text(row.body), position: Number(row.position ?? 0) || 0 }
}

function readSection(row: Row): GovernanceSection {
  return {
    id: text(row.id), documentId: text(row.document_id), headingPath: strings(row.heading_path), anchor: text(row.anchor),
    citation: text(row.citation), body: text(row.body), position: Number(row.position ?? 0) || 0,
  }
}

const MATCH_KINDS: MatchKind[] = ['citation', 'title', 'heading', 'exact', 'prefix', 'corrected', 'some']

function readHit(row: Row): SearchHit {
  const byCitation = row.by_citation === true
  const kind = text(row.match_kind) as MatchKind
  return {
    sectionId: text(row.section_id), documentId: text(row.document_id), documentSlug: text(row.document_slug), documentKind: kindOf(row.document_kind),
    documentCode: text(row.document_code), documentTitle: text(row.document_title), anchor: text(row.anchor), citation: text(row.citation),
    headingPath: strings(row.heading_path), position: Number(row.section_position ?? 0) || 0, byCitation, snippet: text(row.snippet),
    matchKind: MATCH_KINDS.includes(kind) ? kind : byCitation ? 'citation' : 'exact', matchedAs: text(row.matched_as),
  }
}

/** The reference in Postgres. The policies decide what comes back and this
    class adds nothing to them and hides nothing. */
export class SupabaseReferenceRepository implements ReferenceRepository {
  private client() {
    if (!supabase) throw new Error('Supabase is not configured for this build.')
    return supabase
  }

  async load(): Promise<ReferenceData> {
    const client = this.client()
    const [documents, sections] = await Promise.all([
      client.from('governance_document').select('*').order('position'),
      client.from('governance_section').select('id, document_id, heading_path, anchor, citation, body, position').order('position'),
    ])
    if (documents.error) throw new Error(`Could not read the reference: ${documents.error.message}`)
    if (sections.error) throw new Error(`Could not read the manual's sections: ${sections.error.message}`)
    return { documents: ((documents.data ?? []) as Row[]).map(readDocument), sections: ((sections.data ?? []) as Row[]).map(readSection) }
  }

  async search(q: string): Promise<SearchHit[]> {
    const { data, error } = await this.client().rpc('search_manual', { q })
    if (error) throw new Error(`Could not search the manual: ${error.message}`)
    return ((data ?? []) as Row[]).map(readHit)
  }
}

/** The stub: the seeded documents, split the way the loader splits them, and
    the same tiers as search_manual() — citation, title, heading, whole words,
    prefixes, then a correction or "some of the words" only when nothing
    stronger answered — in the same shape (matching.ts). */
export class LocalReferenceRepository implements ReferenceRepository {
  private data: ReferenceData | null = null

  async load(): Promise<ReferenceData> {
    if (!this.data) this.data = { documents: seedDocuments, sections: seedDocuments.flatMap(splitSections) }
    return this.data
  }

  async search(q: string): Promise<SearchHit[]> {
    const { documents, sections } = await this.load()
    return searchSections(documents, sections, q)
  }
}

export const referenceRepository: ReferenceRepository = supabaseConfigured ? new SupabaseReferenceRepository() : new LocalReferenceRepository()
