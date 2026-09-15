import { supabase, supabaseConfigured } from '../../lib/supabase'
import { seedDocuments } from '../meetings/governance'
import { splitSections } from './sections'
import type { GovernanceDocument, GovernanceSection, SearchHit } from './types'

/* The reference's persistence seam.
   ---------------------------------
   Separate from the Board's room (src/data/meetings/repository.ts) because the
   manual is not the Board's alone: since 0015 it is open to everyone who
   signs in, on either side. Two reads and one search; no write, as there is
   no write policy on either table — the corpus and its sections are loaded
   by supabase/governance/build-seed.mjs, by SQL.

   The search is search_manual() in Postgres (0016): a citation typed as a
   string lands on the paragraph, above the ranked text hits, and the snippet
   marks the matched words. The stub does a plain substring pass over the
   seeded sections and answers in the same shape, so the screen never knows
   which one answered. */

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

function readHit(row: Row): SearchHit {
  return {
    sectionId: text(row.section_id), documentId: text(row.document_id), documentSlug: text(row.document_slug), documentKind: kindOf(row.document_kind),
    documentCode: text(row.document_code), documentTitle: text(row.document_title), anchor: text(row.anchor), citation: text(row.citation),
    headingPath: strings(row.heading_path), position: Number(row.section_position ?? 0) || 0, byCitation: row.by_citation === true, snippet: text(row.snippet),
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
    a substring search over the result in search_manual()'s shape — citation
    prefix matches first, then every section that contains every word, with a
    window around the first match and the words marked. No ranking. */
export class LocalReferenceRepository implements ReferenceRepository {
  private data: ReferenceData | null = null

  async load(): Promise<ReferenceData> {
    if (!this.data) this.data = { documents: seedDocuments, sections: seedDocuments.flatMap(splitSections) }
    return this.data
  }

  async search(q: string): Promise<SearchHit[]> {
    const { documents, sections } = await this.load()
    const raw = q.trim().replace(/\s+/g, ' ').toLowerCase()
    if (!raw) return []
    const byId = new Map(documents.map((d) => [d.id, d]))
    const terms = raw.replace(/["“”]/g, '').split(' ').filter((t) => t.length > 1 && !t.startsWith('-'))
    const hit = (s: GovernanceSection, byCitation: boolean): SearchHit => {
      const doc = byId.get(s.documentId)
      return {
        sectionId: s.id, documentId: s.documentId, documentSlug: doc?.slug ?? '', documentKind: doc?.kind ?? 'reference', documentCode: doc?.code ?? '',
        documentTitle: doc?.title ?? '', anchor: s.anchor, citation: s.citation, headingPath: s.headingPath, position: s.position, byCitation,
        snippet: byCitation ? s.body.slice(0, 240) : snippetOf(s.body, terms),
      }
    }
    const cited = sections
      .filter((s) => s.citation && s.citation.toLowerCase().startsWith(raw))
      .sort((a, b) => Number(b.citation.toLowerCase() === raw) - Number(a.citation.toLowerCase() === raw) || a.position - b.position)
    const citedIds = new Set(cited.map((s) => s.id))
    const texts = terms.length
      ? sections.filter((s) => !citedIds.has(s.id) && terms.every((t) => (s.citation + ' ' + s.headingPath.join(' ') + ' ' + s.body).toLowerCase().includes(t)))
      : []
    return [...cited.map((s) => hit(s, true)), ...texts.map((s) => hit(s, false))].slice(0, 80)
  }
}

/** A window of the body around the first matched word, with every matched word marked. */
function snippetOf(body: string, terms: string[]): string {
  const plain = body.replace(/^#{1,6}[ \t]+.*$/m, '').replace(/\s+/g, ' ').trim()
  const lower = plain.toLowerCase()
  const first = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0), plain.length)
  let start = Math.max(0, first - 100)
  if (start > 0) start = plain.indexOf(' ', start) + 1 || start
  let end = Math.min(plain.length, start + 230)
  if (end < plain.length) end = plain.lastIndexOf(' ', end) > start ? plain.lastIndexOf(' ', end) : end
  let window = plain.slice(start, end)
  for (const term of terms) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig')
    window = window.replace(pattern, (m) => `<mark>${m}</mark>`)
  }
  return (start > 0 ? '…' : '') + window + (end < plain.length ? '…' : '')
}

export const referenceRepository: ReferenceRepository = supabaseConfigured ? new SupabaseReferenceRepository() : new LocalReferenceRepository()
