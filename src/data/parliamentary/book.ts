import { splitSections } from '../reference/sections'
import { searchSections } from '../reference/matching'
import type { GovernanceDocument, GovernanceSection, SearchHit } from '../reference/types'

/* Robert's Rules of Order — the 1915 text, behind the plain-language guide.
   --------------------------------------------------------------------------
   The guide (guide.ts) is what the surface opens on and searches; this is
   Robert's own words, which the guide's section citations open (/rules/1915).
   The text is General Henry M. Robert's *Robert's Rules of Order Revised*
   (1915), the last edition in the public domain, as the Constitution Society
   put it online in 1996 and as the PDF of that page set was supplied to us.
   The Society's notice permits copying on a non-profit basis with attribution
   and with its links kept; the screen carries both. Its editorial changes are
   kept: sections are numbered (§1–§75) instead of paged, footnotes sit at the
   end of their section, and the two tables are reformatted. On top of that,
   the Order of Precedence and the Table of Rules are written out in words
   here (a star as the rule it reverses, a figure as its note), because a grid
   of stars does not search and does not read on a phone.

   Left out: the Lesson Outlines (a study course for clubs) and the Index
   (page references, which the search replaces).

   Unlike the church's manual, this lives in the bundle and not in the
   database. It is a published book, it is nobody's record, and there is no
   question of who may read it; a table and a policy would be a gate with
   nothing behind it. Each file is a separate chunk, fetched the first time
   someone opens this layer.

   The search is the manual's own stub (matching.ts) over these sections — the
   same tiers, so it forgives two letters and a misspelling the same way —
   with one addition: a section number typed on its own ("29", "§29") or an
   article ("art v") is a citation and lands there. */

export type Part = 'quick' | 'front' | 'part-1' | 'part-2'

export interface RulesDocument extends GovernanceDocument {
  part: Part
}

export interface RulesBook {
  documents: RulesDocument[]
  sections: GovernanceSection[]
}

export const PARTS: { part: Part; title: string; line: string }[] = [
  { part: 'quick', title: 'At a glance', line: 'The order of precedence of motions, and every motion’s rules — debatable, amendable, the vote it needs — written out.' },
  { part: 'front', title: 'Preface and introduction', line: 'What parliamentary law is for, how the book is arranged, and what its terms mean.' },
  { part: 'part-1', title: 'Part I · Rules of Order', line: 'How business is conducted: motions, debate, the vote, committees and boards, officers and the minutes, quorum and order of business.' },
  { part: 'part-2', title: 'Part II · Organization, Meetings, and Legal Rights', line: 'Organising a meeting, a society and a convention; the rights of an assembly over its members.' },
]

/** File, part and order. The articles' titles come from their own first heading. */
const FILES: { file: string; part: Part }[] = [
  { file: 'order-of-precedence', part: 'quick' },
  { file: 'table-of-rules', part: 'quick' },
  { file: 'preface', part: 'front' },
  { file: 'introduction', part: 'front' },
  ...['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].map((n) => ({ file: `art-${n}`, part: 'part-1' as Part })),
  { file: 'art-12', part: 'part-2' },
  { file: 'art-13', part: 'part-2' },
]

const SOURCES = import.meta.glob('./robert-1915/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

/** "# Art. III. Privileged Motions" → code "Art. III", title "Privileged Motions". */
function named(body: string): { code: string; title: string } {
  const heading = /^#\s+(.+)$/m.exec(body)?.[1].trim() ?? ''
  const article = /^(Art\.\s+[IVXL]+)\.\s+(.+)$/.exec(heading)
  return article ? { code: article[1], title: article[2] } : { code: '', title: heading }
}

/** The manual's splitter, then the book's own citations: a heading "29. The
    Previous Question" is §29, anchored as s29. A section that is only its
    article's heading is left out — the rail and the breadcrumb already say it. */
function sectionsOf(doc: RulesDocument): GovernanceSection[] {
  const kept = splitSections(doc).filter((s) => s.body.replace(/^#{1,6}[ \t]+.*$/gm, '').trim())
  const seen = new Set<string>()
  return kept.map((section, index) => {
    const n = /^(\d{1,2})\.\s/.exec(section.headingPath[section.headingPath.length - 1] ?? '')?.[1]
    let anchor = n ? `s${n}` : section.anchor
    if (seen.has(anchor)) anchor = `${anchor}-${index + 1}`
    seen.add(anchor)
    return { ...section, id: `${doc.id}:${anchor}`, anchor, citation: n ? `§${n}` : '', position: index + 1 }
  })
}

let loading: Promise<RulesBook> | null = null

/** The book, fetched once per page load. */
export function loadRulesBook(): Promise<RulesBook> {
  loading ??= Promise.all(
    FILES.map(async ({ file, part }, index): Promise<RulesDocument> => {
      const load = SOURCES[`./robert-1915/${file}.md`]
      if (!load) throw new Error(`Robert’s Rules is missing ${file}.md`)
      const body = await load()
      return { id: `rr-${file}`, slug: file, kind: 'reference', ...named(body), body, position: (index + 1) * 10, part }
    }),
  ).then((documents) => ({ documents, sections: documents.flatMap(sectionsOf) }))
  loading.catch(() => {
    loading = null
  })
  return loading
}

/** Which article file holds a numbered section, without loading the book —
    so a guide article can link "§28" straight to /rules/1915/art-05#s28. */
const ARTICLE_SPANS: [string, number, number][] = [
  ['art-01', 1, 10], ['art-02', 11, 15], ['art-03', 16, 20], ['art-04', 21, 27], ['art-05', 28, 34], ['art-06', 35, 41], ['art-07', 42, 45],
  ['art-08', 46, 48], ['art-09', 49, 57], ['art-10', 58, 62], ['art-11', 63, 68], ['art-12', 69, 71], ['art-13', 72, 75],
]

export function sectionPath(n: number): string | null {
  const span = ARTICLE_SPANS.find(([, lo, hi]) => n >= lo && n <= hi)
  return span ? `/rules/1915/${span[0]}#s${n}` : null
}

/** The section a citation names, by number: "29", "§29", "sec. 29", "s29". */
export function citedSection(query: string): number | null {
  const m = /^\s*(?:§|sec(?:tion)?\.?|s)?\s*(\d{1,2})\s*$/i.exec(query)
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 75 ? n : null
}

/** An article typed as a citation: "art v", "Article XII", "Art. IX". */
export function citedArticle(query: string): string | null {
  const m = /^\s*art(?:icle)?\.?\s*([ivxl]+)\.?\s*$/i.exec(query)
  return m ? `Art. ${m[1].toUpperCase()}` : null
}

export function searchRules(book: RulesBook, query: string): SearchHit[] {
  const article = citedArticle(query)
  const doc = article ? book.documents.find((d) => d.code === article) : undefined
  const opening = doc ? book.sections.find((s) => s.documentId === doc.id) : undefined
  if (doc && opening) {
    return [{
      sectionId: opening.id, documentId: doc.id, documentSlug: doc.slug, documentKind: doc.kind, documentCode: doc.code, documentTitle: doc.title,
      anchor: opening.anchor, citation: opening.citation, headingPath: opening.headingPath, position: opening.position, byCitation: true,
      snippet: opening.body.slice(0, 400), matchKind: 'citation', matchedAs: '',
    }]
  }
  const n = citedSection(query)
  if (n !== null) {
    const section = book.sections.find((s) => s.citation === `§${n}`)
    const doc = section ? book.documents.find((d) => d.id === section.documentId) : undefined
    if (section && doc) {
      return [{
        sectionId: section.id, documentId: doc.id, documentSlug: doc.slug, documentKind: doc.kind, documentCode: doc.code, documentTitle: doc.title,
        anchor: section.anchor, citation: section.citation, headingPath: section.headingPath, position: section.position, byCitation: true,
        snippet: section.body.slice(0, 400), matchKind: 'citation', matchedAs: '',
      }]
    }
  }
  return searchSections(book.documents, book.sections, query)
}
