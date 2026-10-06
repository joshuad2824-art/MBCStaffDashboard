import { searchSections } from '../reference/matching'
import type { GovernanceDocument, GovernanceSection, SearchHit } from '../reference/types'
import { citedSection } from './book'

/* Robert's Rules in plain language — the front door of the Robert's Rules surface.
   ----------------------------------------------------------------------------------
   Forty-six articles written for MBC in October 2026 (guide/README.md has the voice
   rules, the lineup and the MBC overrides they carry; guide/HANDOFF.md the original
   hand-off). Each is markdown with front matter: title, short title, group, the
   1915 sections it rests on, the MBC citations in its "At MBC" note, and the
   everyday phrasings people type ("table it", "call the question").

   Where this departs from the hand-off, on Joshua's decision of 6 October 2026:
   the articles ship in the bundle beside the 1915 text, not in governance_document
   (they are an explanation of a public-domain book, and nobody's record), every
   article is approved, and the surface is on both sides. The 1915 text stays
   behind the guide: an article's sections open Robert's own words.

   Search is the manual's stub (matching.ts) over one section per article. The
   phrasings and short title are folded into what the title tier reads, so a
   phrase someone actually says lands on its article ahead of a body match; a
   section number on its own finds the articles that rest on that section. */

export interface GuideArticle {
  slug: string
  id: string
  title: string
  shortTitle: string
  group: string
  rrSections: number[]
  mbcRefs: string[]
  searchTerms: string[]
  status: string
  /** Markdown without its front matter. */
  body: string
}

export interface Guide {
  articles: GuideArticle[]
  /** For matching.ts: one document and one section per article. */
  documents: GovernanceDocument[]
  sections: GovernanceSection[]
}

/** The groups, in the README's lineup order; the reference pages first. */
export const GROUPS: { name: string; line: string }[] = [
  { name: 'Reference', line: 'The finder, the cheat sheet, what outranks what, and the glossary.' },
  { name: 'Meeting basics', line: 'How a motion moves, getting the floor, seconds, quorum, the agenda, general consent.' },
  { name: 'Making and shaping a motion', line: 'Main motions, amendments, referring, dividing, withdrawing.' },
  { name: 'Putting things off', line: 'Tabling, postponing to a set time, postponing indefinitely.' },
  { name: 'Discussion', line: 'Who speaks and for how long, keeping it civil, ending or limiting debate.' },
  { name: 'Voting', line: 'Ways to vote, counted votes, majority and two-thirds, votes that don’t count.' },
  { name: 'Undoing or revisiting', line: 'Reconsider, rescind, bringing a motion back, ratify.' },
  { name: 'Keeping order', line: 'Points of order and appeals, suspending the rules, privilege, recess and adjourn.' },
  { name: 'Officers, minutes, and reports', line: 'Chairing, the secretary and minutes, the treasurer, committees and their reports.' },
  { name: 'Elections and governing documents', line: 'Nominations and elections, bylaws and standing rules, amending the bylaws.' },
]

/** Pages that are one tap away from every article. */
export const FRONT_DOOR = 'i-want-to'
export const ALWAYS_NEAR: { slug: string; label: string }[] = [
  { slug: 'motion-cheat-sheet', label: 'Motion cheat sheet' },
  { slug: 'precedence', label: 'What outranks what' },
  { slug: 'glossary', label: 'Glossary' },
]

export const CREDIT = 'Adapted in plain language from Robert’s Rules of Order Revised (1915, public domain), via the Constitution Society, constitution.org.'

const SOURCES = import.meta.glob('./guide/articles/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

/** The front matter this guide uses: `key: value` and `key: [a, b, "c, d"]`. */
export function frontMatter(raw: string): { fields: Record<string, string | string[]>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) return { fields: {}, body: raw }
  const fields: Record<string, string | string[]> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line)
    if (!kv) continue
    const value = kv[2].trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      const items: string[] = []
      for (const item of value.slice(1, -1).matchAll(/"([^"]*)"|([^,]+)/g)) {
        const text = (item[1] ?? item[2] ?? '').trim()
        if (text) items.push(text)
      }
      fields[kv[1]] = items
    } else {
      fields[kv[1]] = /^"[^"]*"$/.test(value) ? value.slice(1, -1) : value
    }
  }
  return { fields, body: raw.slice(m[0].length) }
}

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : [])

function readArticle(slug: string, raw: string): GuideArticle {
  const { fields, body } = frontMatter(raw)
  return {
    slug,
    id: str(fields.id) || slug,
    title: str(fields.title) || slug,
    shortTitle: str(fields.short_title) || str(fields.title) || slug,
    group: str(fields.group) || 'Reference',
    rrSections: list(fields.rr_sections).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 75),
    mbcRefs: list(fields.mbc_refs),
    searchTerms: list(fields.search_terms),
    status: str(fields.status) || 'approved',
    body,
  }
}

let loading: Promise<Guide> | null = null

export function loadGuide(): Promise<Guide> {
  loading ??= Promise.all(
    Object.entries(SOURCES).map(async ([path, load]) => readArticle(/([^/]+)\.md$/.exec(path)?.[1] ?? path, await load())),
  ).then((loaded) => {
    const order = new Map(GROUPS.map((g, i) => [g.name, i]))
    const articles = loaded.sort((a, b) => (order.get(a.group) ?? 99) - (order.get(b.group) ?? 99) || a.shortTitle.localeCompare(b.shortTitle))
    const documents: GovernanceDocument[] = articles.map((a, i) => ({
      id: a.slug, slug: a.slug, kind: 'reference', code: '', position: i + 1, body: a.body,
      // What the title tier reads: the title, the short title and the phrasings.
      title: [a.title, a.shortTitle, ...a.searchTerms].join(' · '),
    }))
    const sections: GovernanceSection[] = articles.map((a, i) => ({
      id: `${a.slug}:top`, documentId: a.slug, headingPath: [a.searchTerms.join(' · '), a.title], anchor: 'top', citation: '', body: plainText(a.body), position: i + 1,
    }))
    return { articles, documents, sections }
  })
  loading.catch(() => {
    loading = null
  })
  return loading
}

export function searchGuide(guide: Guide, query: string): SearchHit[] {
  const n = citedSection(query)
  if (n !== null) {
    // The article built on the section first, then those that only cite it.
    return guide.articles
      .filter((a) => a.rrSections.includes(n))
      .sort((a, b) => a.rrSections.indexOf(n) - b.rrSections.indexOf(n))
      .map((a, i): SearchHit => ({
        sectionId: `${a.slug}:top`, documentId: a.slug, documentSlug: a.slug, documentKind: 'reference', documentCode: '', documentTitle: a.title,
        anchor: 'top', citation: `§${n}`, headingPath: [a.title], position: i + 1, byCitation: true,
        snippet: shortAnswer(a), matchKind: 'citation', matchedAs: '',
      }))
  }
  // Within a tier, an article whose own title or short title has the words
  // (as typed, or as corrected) goes ahead of one that only mentions them.
  const hits = searchSections(guide.documents, guide.sections, query)
  const named = (hit: SearchHit) => {
    const article = guide.articles.find((a) => a.slug === hit.documentId)
    const words = (article ? `${article.title} ${article.shortTitle}` : '').toLowerCase().split(/[^a-z0-9]+/)
    const wanted = (hit.matchedAs || query).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
    return wanted.length > 0 && wanted.every((w) => words.some((x) => x.startsWith(w))) ? 0 : 1
  }
  const tier = (hit: SearchHit) => ['citation', 'title', 'heading', 'exact', 'prefix', 'corrected', 'some'].indexOf(hit.matchKind)
  return hits.map((hit, i) => ({ hit, i })).sort((a, b) => tier(a.hit) - tier(b.hit) || named(a.hit) - named(b.hit) || a.i - b.i).map(({ hit }) => hit)
}

/** What the search reads and quotes: the words, without the markdown around
    them. The title line goes, because the result already shows the title. */
function plainText(body: string): string {
  return body
    .replace(/^#[ \t]+.*$/m, '')
    .replace(/^#{2,6}[ \t]+/gm, '')
    .replace(/^\|?[\s:|-]+\|[\s:|-]*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/^>\s?/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, '')
}

/** The article's **Short answer:** paragraph, as plain text. */
export function shortAnswer(article: GuideArticle): string {
  const m = /\*\*Short answer:\*\*\s*([^\n]+)/.exec(article.body)
  return (m?.[1] ?? '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}
