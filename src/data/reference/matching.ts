import type { GovernanceDocument, GovernanceSection, MatchKind, SearchHit } from './types'

/* The stub's search. search_manual() in Postgres (0019) is the real one; this
   answers in the same shape and the same tiers so a checkout without Supabase
   behaves like production and the screen never knows which answered. It must
   only agree with the SQL, which decides — the same relationship sections.ts
   has to the loader.

   Tiers, strongest first, each section shown once at the strongest:

     citation   what was typed, punctuation ignored, starts a citation ("a9",
                "A 009", "art ii b")
     title      every word typed begins a word of a document's code or title
     heading    every word typed begins a word of a section's own heading
     exact      whole words (a stem counts), with "quoted phrases" and -minus
     prefix     every word typed begins a word of the section ("treas")

   Only when none of those finds anything, and the query carries no operator:

     corrected  a word that begins no word in the manual is replaced by the
                nearest word that does, and every corrected word must be there
     some       more than one word, no section has them all: sections with some

   A citation that found something silences title, heading and prefix, so a
   man who typed a citation gets that paragraph.

   Where it differs from Postgres, Postgres is right: the stemmer here is a
   stand-in, so a word the real one files differently ("itemized" as "item")
   can match a section in one and not the other. The tiers and the shape do
   not differ. */

const LIMIT = 80
const TOKENS = 12

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const wordsOf = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/** A crude stand-in for the english stemmer: enough that flowers meets flower. */
function stem(word: string): string {
  const cut = word.replace(/(ingly|edly|ing|ed|es|s)$/, '')
  return cut.length >= 3 ? cut : word
}

const sameWord = (token: string, word: string) => token === word || stem(token) === stem(word)
/** The typed word begins the document's word, or is the same word in another form
    (flowers, flower). A stem is not a prefix: the stemmer files "itemized" as
    "item", and "itemis" is not a way of typing it. */
const begins = (token: string, word: string) => word.startsWith(token) || sameWord(token, word)

/** The words Postgres's english configuration drops from a query. websearch
    keeps a single letter or digit that is not on this list — the 4 of "A009 §4" —
    and so must the exact tier here. */
const STOP = new Set(
  ('i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs ' +
    'themselves what which who whom this that these those am is are was were be been being have has had having do does did doing a an the and but if or ' +
    'because as until while of at by for with about against between into through during before after above below to from up down in out on off over under ' +
    'again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very s t ' +
    'can will just don should now').split(' '),
)

function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, row[j])
    }
    if (best > max) return max + 1
    previous = row
  }
  return previous[b.length]
}

interface Entry {
  section: GovernanceSection
  doc: GovernanceDocument | undefined
  /** Every word of the section as written: citation, headings, body. */
  words: string[]
  heading: string[]
  lower: string
}

interface Index {
  entries: Entry[]
  docs: Map<string, GovernanceDocument>
  vocabulary: Map<string, number>
}

const cache = new WeakMap<GovernanceSection[], Index>()

function indexOf(documents: GovernanceDocument[], sections: GovernanceSection[]): Index {
  const hit = cache.get(sections)
  if (hit) return hit
  const docs = new Map(documents.map((d) => [d.id, d]))
  const vocabulary = new Map<string, number>()
  const entries = sections.map((section): Entry => {
    const text = [section.citation, section.headingPath.join(' '), section.body].join(' ')
    const words = wordsOf(text)
    for (const word of new Set(words)) if (word.length >= 4 && /^[a-z]+$/.test(word)) vocabulary.set(word, (vocabulary.get(word) ?? 0) + 1)
    return { section, doc: docs.get(section.documentId), words, heading: wordsOf(section.headingPath[section.headingPath.length - 1] ?? ''), lower: text.toLowerCase().replace(/\s+/g, ' ') }
  })
  const built = { entries, docs, vocabulary }
  cache.set(sections, built)
  return built
}

/** A window of the body around the first word that matched, with every
    matching word marked. The heading line is left out: the screen shows it. */
function snippetOf(body: string, matches: (word: string) => boolean): string {
  const plain = body.replace(/^#{1,6}[ \t]+.*$/m, '').replace(/\s+/g, ' ').trim() || body.replace(/\s+/g, ' ').trim()
  const first = (() => {
    const re = /[A-Za-z0-9]+/g
    for (let m = re.exec(plain); m; m = re.exec(plain)) if (matches(m[0].toLowerCase())) return m.index
    return -1
  })()
  let start = Math.max(0, (first < 0 ? 0 : first) - 100)
  if (start > 0) start = plain.indexOf(' ', start) + 1 || start
  let end = Math.min(plain.length, start + 230)
  if (end < plain.length) end = plain.lastIndexOf(' ', end) > start ? plain.lastIndexOf(' ', end) : end
  const window = plain.slice(start, end).replace(/[A-Za-z0-9]+/g, (w) => (matches(w.toLowerCase()) ? `<mark>${w}</mark>` : w))
  return (start > 0 ? '…' : '') + window + (end < plain.length ? '…' : '')
}

export function searchSections(documents: GovernanceDocument[], sections: GovernanceSection[], query: string): SearchHit[] {
  const raw = query.trim().replace(/\s+/g, ' ')
  if (!raw) return []
  const { entries, docs, vocabulary } = indexOf(documents, sections)

  const ops = /"/.test(raw) || /(^|\s)-\S/.test(raw)
  const tokens = wordsOf(raw).filter((t) => t.length >= 2).slice(0, TOKENS)

  const found = new Map<string, { entry: Entry; kind: MatchKind; tier: number; rank: number; matches: (word: string) => boolean; as: string }>()
  const add = (entry: Entry, kind: MatchKind, tier: number, rank: number, matches: (word: string) => boolean, as = '') => {
    const have = found.get(entry.section.id)
    if (!have || tier < have.tier) found.set(entry.section.id, { entry, kind, tier, rank, matches, as })
  }
  const anyToken = (list: string[]) => (word: string) => list.some((t) => begins(t, word))

  // citation ---------------------------------------------------------------
  const nq = norm(raw)
  const cq = /^[a-z]\d{1,2}$/.test(nq) ? nq[0] + nq.slice(1).padStart(3, '0') : nq
  const looksCited = /^(art(icle)?\.?\s*[ivx]+|[a-z]\s*-?\s*\d)/i.test(raw)
  let cited = 0
  if (looksCited && cq.length >= 2) {
    for (const e of entries) {
      if (e.section.citation && norm(e.section.citation).startsWith(cq)) {
        add(e, 'citation', 0, norm(e.section.citation) === cq ? 2 : 1, () => false)
        cited++
      }
    }
  }

  // title and heading ------------------------------------------------------
  if (!ops && !cited && tokens.length) {
    const seen = new Set<string>()
    for (const e of entries) {
      if (!e.doc || seen.has(e.doc.id)) continue
      const docWords = wordsOf(e.doc.code + ' ' + e.doc.title)
      if (tokens.every((t) => docWords.some((w) => w.startsWith(t)))) {
        seen.add(e.doc.id)
        const first = entries.filter((x) => x.section.documentId === e.doc?.id).sort((a, b) => a.section.position - b.section.position)[0]
        add(first, 'title', 1, 1, anyToken(tokens))
      }
    }
    for (const e of entries) {
      if (e.heading.length && tokens.every((t) => e.heading.some((w) => w.startsWith(t)))) add(e, 'heading', 2, 1, anyToken(tokens))
    }
  }

  // exact: whole words, phrases and exclusions ------------------------------
  const phrases = [...raw.matchAll(/"([^"]+)"/g)].map((m) => wordsOf(m[1]).join(' ')).filter(Boolean)
  const stripped = raw.replace(/"[^"]*"/g, ' ')
  const excluded = [...stripped.matchAll(/(?:^|\s)-([A-Za-z0-9]+)/g)].map((m) => m[1].toLowerCase())
  const required = wordsOf(stripped.replace(/(?:^|\s)-[A-Za-z0-9]+/g, ' ')).filter((t) => !STOP.has(t)).slice(0, TOKENS)
  if (required.length || phrases.length) {
    for (const e of entries) {
      const text = ' ' + wordsOf(e.lower).join(' ') + ' '
      if (required.every((t) => e.words.some((w) => sameWord(t, w))) && phrases.every((p) => text.includes(' ' + p + ' ')) && !excluded.some((x) => e.words.some((w) => sameWord(x, w)))) {
        add(e, 'exact', 3, required.length, (w) => required.some((t) => sameWord(t, w)) || phrases.some((p) => p.split(' ').includes(w)))
      }
    }
  }

  // prefix -------------------------------------------------------------------
  if (!ops && !cited && tokens.length) {
    for (const e of entries) {
      if (tokens.every((t) => e.words.some((w) => begins(t, w)))) add(e, 'prefix', 4, tokens.length, anyToken(tokens))
    }
  }

  // loosen, once, only when nothing stronger answered --------------------------
  if (found.size === 0 && !ops && tokens.length) {
    const vocab = [...vocabulary.entries()]
    const fixed = tokens.map((t) => {
      if (t.length < 4 || vocab.some(([w]) => w.startsWith(t))) return t
      const max = t.length >= 6 ? 2 : 1
      let best: { word: string; d: number; n: number } | null = null
      for (const [word, n] of vocab) {
        if (word[0] !== t[0] || (Math.abs(word.length - t.length) > 2 && word.length <= t.length)) continue
        const d = Math.min(distance(word, t, max), distance(word.slice(0, t.length), t, max))
        if (d > max) continue
        if (!best || d < best.d || (d === best.d && (n > best.n || (n === best.n && word < best.word)))) best = { word, d, n }
      }
      return best?.word ?? t
    })
    const changed = fixed.some((t, i) => t !== tokens[i])
    if (changed) {
      for (const e of entries) {
        if (fixed.every((t) => e.words.some((w) => begins(t, w)))) add(e, 'corrected', 5, fixed.length, anyToken(fixed), fixed.join(' '))
      }
    }
    if (found.size === 0 && tokens.length > 1) {
      for (const e of entries) {
        const score = fixed.filter((t) => e.words.some((w) => begins(t, w))).length
        if (score > 0) add(e, 'some', 6, score, anyToken(fixed), changed ? fixed.join(' ') : '')
      }
    }
  }

  return [...found.values()]
    .sort((a, b) => a.tier - b.tier || b.rank - a.rank || (a.entry.doc?.position ?? 0) - (b.entry.doc?.position ?? 0) || a.entry.section.position - b.entry.section.position)
    .slice(0, LIMIT)
    .map(({ entry, kind, matches, as }): SearchHit => {
      const doc = docs.get(entry.section.documentId)
      return {
        sectionId: entry.section.id, documentId: entry.section.documentId, documentSlug: doc?.slug ?? '', documentKind: doc?.kind ?? 'reference',
        documentCode: doc?.code ?? '', documentTitle: doc?.title ?? '', anchor: entry.section.anchor, citation: entry.section.citation,
        headingPath: entry.section.headingPath, position: entry.section.position, byCitation: kind === 'citation',
        snippet: kind === 'citation' ? entry.section.body.slice(0, 240) : snippetOf(entry.section.body, matches),
        matchKind: kind, matchedAs: kind === 'corrected' || (kind === 'some' && as) ? as : '',
      }
    })
}

/** Documents whose code or title is near what was typed — for the answer
    "nothing matched", which should still point somewhere. */
export function suggestDocuments(documents: GovernanceDocument[], query: string, limit = 3): GovernanceDocument[] {
  const tokens = wordsOf(query).filter((t) => t.length >= 3)
  if (!tokens.length) return []
  return documents
    .map((doc) => {
      const words = wordsOf(doc.code + ' ' + doc.title)
      let score = 0
      for (const token of tokens) {
        const max = token.length >= 6 ? 2 : 1
        let best = max + 1
        for (const word of words) best = Math.min(best, distance(word, token, max), distance(word.slice(0, token.length), token, max))
        if (best <= max) score += 3 - best
      }
      return { doc, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.position - b.doc.position)
    .slice(0, limit)
    .map((x) => x.doc)
}
