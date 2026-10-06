import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Eyebrow } from '../../components/ui'
import { useNarrow } from '../../lib/displayScale'
import { PARTS, citedArticle, citedSection, loadRulesBook, searchRules } from '../../data/parliamentary/book'
import type { RulesBook, RulesDocument } from '../../data/parliamentary/book'
import { suggestDocuments } from '../../data/reference/matching'
import type { GovernanceSection, SearchHit } from '../../data/reference/types'
import { Markdown, Snippet, body as bodyStyle, meta, plainHeading } from '../reference/Markdown'

/* Robert's own words: the 1915 text, behind the plain-language guide.

   The guide (Guide.tsx) is what people open and search. This is where its
   citations go — "§28" on an article opens that section here — and it keeps
   its own search for anyone who wants the book itself. It lives under
   /rules/1915.

   The same three states as the governance reference (Reference.tsx) and the
   same older-reader rules — 17px body type, every control 44px or more,
   nothing carried by colour alone, the search field first and never
   autofocused — so a deacon who can use one can use the other:

     1 · The landing — the search, the order of precedence as a table (the
         one page of the book a chairman most often needs in a hurry), and the
         book's contents.
     2 · Results — sections grouped by article, the match marked.
     3 · The section — the article around it, a contents rail, Print.

   It is a reference and reads only. The text and where it came from are in
   src/data/parliamentary/book.ts; the screen does not know or care that it is
   bundled rather than fetched. */

/** The order of precedence, highest first, as the 1915 list gives it. The
    sections are where each motion is treated; the marks are written out.
    Limit debate's "can be amended" is §30's own words — the list as
    reformatted leaves that column blank (order-of-precedence.md says so). */
const PRECEDENCE: { motion: string; section: number; debate: boolean; amend: boolean; vote: 'Majority' | 'Two-thirds'; privileged?: string }[] = [
  { motion: 'Fix the Time to which to Adjourn', section: 16, debate: false, amend: true, vote: 'Majority', privileged: 'Privileged when another question is pending' },
  { motion: 'Adjourn', section: 17, debate: false, amend: false, vote: 'Majority', privileged: 'Privileged when unqualified' },
  { motion: 'Take a Recess', section: 18, debate: false, amend: true, vote: 'Majority', privileged: 'Privileged when other business is pending' },
  { motion: 'Raise a Question of Privilege', section: 19, debate: false, amend: false, vote: 'Majority', privileged: 'Privileged' },
  { motion: 'Call for the Orders of the Day', section: 20, debate: false, amend: false, vote: 'Majority', privileged: 'Privileged' },
  { motion: 'Lay on the Table', section: 28, debate: false, amend: false, vote: 'Majority' },
  { motion: 'Previous Question', section: 29, debate: false, amend: false, vote: 'Two-thirds' },
  { motion: 'Limit or Extend Limits of Debate', section: 30, debate: false, amend: true, vote: 'Two-thirds' },
  { motion: 'Postpone to a Certain Time', section: 31, debate: true, amend: true, vote: 'Majority' },
  { motion: 'Commit or Refer', section: 32, debate: true, amend: true, vote: 'Majority' },
  { motion: 'Amend', section: 33, debate: true, amend: true, vote: 'Majority' },
  { motion: 'Postpone Indefinitely', section: 34, debate: true, amend: false, vote: 'Majority' },
  { motion: 'A Main Motion', section: 11, debate: true, amend: true, vote: 'Majority' },
]

const TRY = ['quorum', 'previous question', 'lay on the table', 'reconsider', 'two-thirds', 'minutes', '§33']

const BASE = '/rules/1915'

export function Book1915() {
  const navigate = useNavigate()
  const location = useLocation()
  const [book, setBook] = useState<RulesBook | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [searching, setSearching] = useState(false)

  const slug = decodeURIComponent(location.pathname.replace(/^\/rules\/1915\/?/, ''))
  const anchor = location.hash.replace(/^#/, '')
  const query = q.trim()
  // Two characters fire the search, as on the reference — or one digit, which is a section.
  const fires = query.length >= 2 || citedSection(query) !== null

  useEffect(() => {
    let live = true
    loadRulesBook()
      .then((loaded) => { if (live) setBook(loaded) })
      .catch((failure: unknown) => { if (live) setFailed(failure instanceof Error ? failure.message : 'Robert’s Rules could not be opened.') })
    return () => { live = false }
  }, [])

  const sectionsOf = useMemo(() => {
    const map = new Map<string, GovernanceSection[]>()
    for (const section of book?.sections ?? []) map.set(section.documentId, [...(map.get(section.documentId) ?? []), section])
    return map
  }, [book])
  const doc = book?.documents.find((d) => d.slug === slug) ?? null

  // A keystroke waits a beat for the next; the last answer stays until the next arrives.
  const searchId = useRef(0)
  useEffect(() => {
    if (!book || !fires) {
      setHits(null)
      setSearching(false)
      return
    }
    const mine = ++searchId.current
    setSearching(true)
    const timer = window.setTimeout(() => {
      if (mine !== searchId.current) return
      setHits(searchRules(book, query))
      setSearching(false)
    }, 160)
    return () => window.clearTimeout(timer)
  }, [book, query, fires])

  if (failed) return <p style={{ ...bodyStyle, margin: 0 }}>{failed}</p>
  if (!book) return <p style={{ ...bodyStyle, margin: 0 }}>Opening Robert’s Rules…</p>

  const open = (target: RulesDocument, sectionAnchor: string) => navigate(`${BASE}/${encodeURIComponent(target.slug)}#${sectionAnchor}`)
  const openSection = (n: number) => {
    const section = book.sections.find((s) => s.citation === `§${n}`)
    const target = section ? book.documents.find((d) => d.id === section.documentId) : undefined
    if (section && target) {
      setQ('')
      open(target, section.anchor)
    }
  }
  const goHome = () => {
    setQ('')
    if (slug) navigate(BASE)
  }
  const tryThis = (text: string) => {
    setQ(text)
    if (slug) navigate(BASE)
  }

  const atResults = !doc && fires
  const first = hits && hits.length > 0 && !searching && ['citation', 'title', 'heading'].includes(hits[0].matchKind) ? hits[0] : null
  const openFirst = () => {
    if (!first) return
    const target = book.documents.find((d) => d.id === first.documentId)
    if (target) open(target, first.anchor)
  }
  const sectionCount = hits?.length ?? 0
  const articleCount = new Set((hits ?? []).map((h) => h.documentId)).size
  const corrected = hits && hits.length > 0 && hits.every((h) => h.matchKind === 'corrected') ? hits[0].matchedAs : ''
  const partial = hits !== null && hits.length > 0 && hits.every((h) => h.matchKind === 'some')
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const countLine = !fires
    ? ''
    : hits === null || searching
      ? `Searching for “${query}”…`
      : sectionCount === 0
        ? `No matches for “${query}”.`
        : hits[0].matchKind === 'citation'
          ? `${citedArticle(query) ? `${hits[0].documentCode} — ${hits[0].documentTitle}` : headingOf(hits[0].headingPath, hits[0].citation)}. Press Enter to open it.`
          : corrected
          ? `Nothing matched “${query}”, so ${sectionCount === 1 ? 'this is the result' : `these ${sectionCount} are the results`} for “${corrected}”. Matched words are bold and underlined.`
          : partial
            ? `No section has every word of “${query}”. ${sectionCount === 1 ? 'This one has' : `These ${sectionCount} have`} some of them. Matched words are bold and underlined.`
            : `${plural(sectionCount, 'section', 'sections')} in ${plural(articleCount, 'part', 'parts')} of the book ${sectionCount === 1 ? 'matches' : 'match'} “${query}”. Matched words are bold and underlined.${first ? ' Press Enter to open the first.' : ''}`

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <button type="button" onClick={() => navigate('/rules')} style={{ ...link, justifySelf: 'start', minHeight: 44 }}>← The plain-language guide</button>
      <section style={card}>
        <label style={{ display: 'grid', gap: 12 }}>
          <span style={{ font: '700 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>Search Robert’s own words — the 1915 text</span>
          <input
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              if (slug) navigate(BASE)
            }}
            onKeyDown={(event) => { if (event.key === 'Enter') openFirst() }}
            placeholder="A word, a motion or a section — quorum, table, reconsider, 29"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            style={{ width: '100%', background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 12, padding: '0 18px', minHeight: 56, font: '400 18px/1 var(--mbc-font-sans)', color: 'var(--text-heading)' }}
          />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'baseline', justifyContent: 'space-between', marginTop: countLine || q ? 16 : 0 }}>
          <p role="status" className="tabular" style={{ ...meta, font: '400 17px/1.6 var(--mbc-font-sans)', margin: 0, maxWidth: '70ch', textWrap: 'pretty' } as CSSProperties}>{countLine}</p>
          {q ? <button type="button" onClick={goHome} style={{ ...link, minHeight: 44 }}>Clear the search</button> : null}
        </div>
        {!q && !doc ? (
          <div role="group" aria-label="Searches to try" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 14 }}>
            <span style={{ ...meta, font: '400 17px/1.4 var(--mbc-font-sans)' }}>Try:</span>
            {TRY.map((text) => <button key={text} type="button" onClick={() => tryThis(text)} style={chip}>{text}</button>)}
          </div>
        ) : null}
      </section>

      {doc ? (
        <Article doc={doc} sections={sectionsOf.get(doc.id) ?? []} anchor={anchor} onHome={goHome} onSection={(a) => navigate(`${BASE}/${encodeURIComponent(doc.slug)}#${a}`, { replace: true })} />
      ) : atResults ? (
        <Results hits={hits} query={query} book={book} onOpen={open} onTry={tryThis} onClear={goHome} />
      ) : (
        <Landing book={book} sectionsOf={sectionsOf} onSection={openSection} onOpen={(d) => open(d, sectionsOf.get(d.id)?.[0]?.anchor ?? 'top')} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ 1 · landing */

function Landing({ book, sectionsOf, onSection, onOpen }: {
  book: RulesBook
  sectionsOf: Map<string, GovernanceSection[]>
  onSection(n: number): void
  onOpen(doc: RulesDocument): void
}) {
  const narrow = useNarrow()
  return (
    <section style={{ display: 'grid', gap: 22 }}>
      <div style={{ ...card, padding: '26px clamp(18px, 2vw, 30px)' }}>
        <div style={{ display: 'grid', gap: 8, paddingBottom: 16, borderBottom: '1px solid var(--border-hairline)' }}>
          <Eyebrow>Order of precedence of motions</Eyebrow>
          <p style={{ font: '400 17px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '68ch', textWrap: 'pretty' } as CSSProperties}>
            Highest first. While any one of these is immediately pending, the motions above it are in order and those below it are not. Choose a motion to read its section.
          </p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th scope="col" style={th}>Motion</th>
              <th scope="col" style={th}>Debate</th>
              <th scope="col" style={th}>Amend</th>
              <th scope="col" style={th}>Vote</th>
            </tr>
          </thead>
          <tbody>
            {PRECEDENCE.map((row, index) => (
              <tr key={row.motion} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                <td style={td}>
                  <button type="button" onClick={() => onSection(row.section)} style={{ ...link, color: 'var(--text-heading)', textAlign: 'left', minHeight: 44, display: 'grid', gap: 3 }}>
                    <span>
                      <span className="tabular" style={{ color: 'var(--text-meta)', marginRight: 10 }}>{index + 1}</span>
                      <span style={{ textDecoration: 'underline', textDecorationColor: 'var(--border-control)', textUnderlineOffset: 4 }}>{row.motion}</span>
                    </span>
                    <span className="tabular" style={{ ...meta, font: '400 15px/1.4 var(--mbc-font-sans)' }}>
                      §{row.section}{row.privileged && !narrow ? ` · ${row.privileged}` : ''}
                    </span>
                  </button>
                </td>
                <td style={td}>{row.debate ? 'Yes' : 'No'}</td>
                <td style={td}>{row.amend ? 'Yes' : 'No'}</td>
                <td style={{ ...td, fontWeight: row.vote === 'Two-thirds' ? 700 : 400 }}>{narrow && row.vote === 'Two-thirds' ? '⅔' : row.vote}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ ...meta, font: '400 16px/1.6 var(--mbc-font-sans)', margin: '14px 0 0', maxWidth: '70ch', textWrap: 'pretty' } as CSSProperties}>
          Every other motion — an appeal, a point of order, to reconsider, to rescind — is in the Table of Rules below, each with its own rules written out.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(330px, 100%), 1fr))', gap: 20 }}>
        {PARTS.map(({ part, title, line }) => {
          const docs = book.documents.filter((d) => d.part === part)
          return (
            <div key={part} style={{ ...card, padding: '26px clamp(18px, 2vw, 30px)', display: 'grid', gap: 12, alignContent: 'start' }}>
              <span style={{ font: '600 24px/1.2 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)' }}>{title}</span>
              <span style={{ font: '400 16px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', textWrap: 'pretty' } as CSSProperties}>{line}</span>
              <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)', marginTop: 4 }}>
                {docs.map((d) => {
                  const numbered = (sectionsOf.get(d.id) ?? []).filter((s) => s.citation)
                  const span = numbered.length ? `${numbered[0].citation}${numbered.length > 1 ? '–' + numbered[numbered.length - 1].citation.slice(1) : ''}` : ''
                  return (
                    <button key={d.id} type="button" onClick={() => onOpen(d)} style={{ textAlign: 'left', background: 'var(--surface-card)', border: 'none', padding: '13px 2px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'baseline', justifyContent: 'space-between', minHeight: 48 }}>
                      <span style={{ font: '400 17px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{d.code ? `${d.code} — ${d.title}` : d.title}</span>
                      <span className="tabular" style={meta}>{span}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <Provenance />
    </section>
  )
}

/** Whose text this is, and the attribution its online edition asks for. */
function Provenance() {
  return (
    <div style={{ ...card, padding: '24px clamp(18px, 2vw, 30px)', display: 'grid', gap: 10 }}>
      <Eyebrow tone="stone" size="sm">Which Robert’s Rules this is</Eyebrow>
      <p style={{ ...bodyStyle, margin: 0 }}>
        <em>Robert’s Rules of Order Revised</em>, by General Henry M. Robert — the 1915 edition, which is in the public domain. The online edition this is taken from,
        with its section numbering, footnote placement and reformatted tables, is © 1996 Constitution Society, and is used here on a non-profit basis with attribution:{' '}
        <a href="https://www.constitution.org/" target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)' }}>constitution.org</a>.
      </p>
      <p style={{ ...bodyStyle, margin: 0 }}>
        The current edition, <em>Robert’s Rules of Order Newly Revised</em>, numbers its sections differently and has changed some rules since 1915. Where the church’s bylaws or the Board’s own rules say otherwise, they govern.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ 2 · results */

function Results({ hits, query, book, onOpen, onTry, onClear }: {
  hits: SearchHit[] | null
  query: string
  book: RulesBook
  onOpen(doc: RulesDocument, anchor: string): void
  onTry(q: string): void
  onClear(): void
}) {
  if (hits === null) return <p style={{ ...meta, font: '400 17px/1.6 var(--mbc-font-sans)', margin: 0 }}>Searching…</p>
  if (hits.length === 0) {
    const nearest = suggestDocuments(book.documents, query) as RulesDocument[]
    return (
      <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-section)', borderRadius: 'var(--mbc-radius-panel)', padding: 'clamp(26px, 3vw, 44px)', maxWidth: 720, display: 'grid', gap: 14 }}>
        <p style={{ font: '600 28px/1.2 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)', margin: 0 }}>Robert’s Rules doesn’t say that in those words.</p>
        <p style={{ ...bodyStyle, margin: 0 }}>Try the name of the motion — table, postpone, reconsider — or a section number on its own.</p>
        {nearest.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {nearest.map((d) => <button key={d.id} type="button" onClick={() => onOpen(d, 'top')} style={chip}>{d.code ? `${d.code} — ` : ''}{d.title}</button>)}
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {TRY.map((text) => <button key={text} type="button" onClick={() => onTry(text)} style={chip}>{text}</button>)}
        </div>
        <div><Button variant="outline" size="md" onClick={onClear}>Back to the contents</Button></div>
      </div>
    )
  }
  const groups: { doc: RulesDocument; hits: SearchHit[] }[] = []
  for (const hit of hits) {
    const doc = book.documents.find((d) => d.id === hit.documentId)
    if (!doc) continue
    let group = groups.find((g) => g.doc === doc)
    if (!group) groups.push((group = { doc, hits: [] }))
    group.hits.push(hit)
  }
  return (
    <section style={{ display: 'grid', gap: 20 }} aria-label={`Results for ${query}`}>
      {groups.map(({ doc, hits: inDoc }) => (
        <div key={doc.id} style={{ ...card, padding: '24px clamp(18px, 2vw, 30px)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border-hairline)' }}>
            <span style={{ display: 'grid', gap: 7 }}>
              <Eyebrow tone="sage" size="sm">{doc.code || 'Robert’s Rules'}</Eyebrow>
              <span style={{ font: '600 24px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>{doc.title}</span>
            </span>
            <span className="tabular" style={{ ...meta, font: '400 17px/1.4 var(--mbc-font-sans)' }}>{inDoc.length} {inDoc.length === 1 ? 'section' : 'sections'}</span>
          </div>
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {inDoc.map((hit) => (
              <button key={hit.sectionId} type="button" onClick={() => onOpen(doc, hit.anchor)} style={{ textAlign: 'left', background: 'var(--surface-card)', border: 'none', padding: '20px 2px', cursor: 'pointer', display: 'grid', gap: 9 }}>
                <span style={{ font: '700 17px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{headingOf(hit.headingPath, hit.citation)}</span>
                <span style={{ font: '400 17px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '78ch', textWrap: 'pretty' } as CSSProperties}>
                  <Snippet text={hit.byCitation ? plain(hit.snippet) : hit.snippet} />
                </span>
                <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)' }}>Open the section →</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

/* ------------------------------------------------------------ 3 · article */

const ARRIVED_MS = 4000

function Article({ doc, sections, anchor, onHome, onSection }: {
  doc: RulesDocument
  sections: GovernanceSection[]
  anchor: string
  onHome(): void
  onSection(anchor: string): void
}) {
  const narrow = useNarrow()
  const current = sections.find((s) => s.anchor === anchor) ?? sections[0] ?? null
  const [arrived, setArrived] = useState<string | null>(null)

  useEffect(() => {
    if (!current) return
    setArrived(current.anchor)
    document.getElementById('rule-' + current.anchor)?.scrollIntoView({ block: 'start' })
    const timer = window.setTimeout(() => setArrived(null), ARRIVED_MS)
    return () => window.clearTimeout(timer)
  }, [doc.slug, current?.anchor]) // eslint-disable-line react-hooks/exhaustive-deps

  const rail = (
    <div style={{ display: 'grid', gap: 2 }}>
      {sections.map((section) => {
        const active = current?.anchor === section.anchor
        return (
          <button
            key={section.anchor}
            type="button"
            onClick={() => onSection(section.anchor)}
            aria-current={active ? 'true' : undefined}
            style={{ textAlign: 'left', background: active ? 'var(--surface-panel)' : 'none', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', display: 'grid', gridTemplateColumns: 'minmax(34px, auto) minmax(0, 1fr)', gap: 10, alignItems: 'baseline', minHeight: 44, font: `${active ? 700 : 400} 16px/1.45 var(--mbc-font-sans)`, color: 'var(--text-heading)' }}
          >
            <span className="tabular" style={{ color: 'var(--text-meta)' }}>{section.citation}</span>
            <span>{titleOf(section)}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <nav aria-label="Where you are" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'baseline' }}>
          <button type="button" onClick={onHome} style={link}>Robert’s own words</button>
          <span style={{ ...crumb, color: 'var(--text-muted)' }}>›</span>
          <span style={{ ...crumb, color: 'var(--text-heading)' }}>{doc.code || doc.title}</span>
          {current?.citation ? (
            <>
              <span style={{ ...crumb, color: 'var(--text-muted)' }}>›</span>
              <span className="tabular" style={{ ...crumb, color: 'var(--text-heading)' }}>{current.citation}</span>
            </>
          ) : null}
        </nav>
        <Button variant="outline" size="md" onClick={() => window.print()}>Print this section</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(0, 270px) minmax(0, 1fr)', gap: 'clamp(22px, 3vw, 44px)', alignItems: 'start' }}>
        {sections.length > 1 ? (
          narrow ? (
            <details style={{ ...card, padding: '14px 18px' }}>
              <summary style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', font: '700 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>Contents of {doc.code || 'this part'}</summary>
              <div style={{ marginTop: 10 }}>{rail}</div>
            </details>
          ) : (
            <div style={{ position: 'sticky', top: 120, ...card, padding: '22px 18px', display: 'grid', gap: 14, maxHeight: 'calc(var(--ui-vh) - 140px)', overflowY: 'auto' }}>
              <Eyebrow>Contents</Eyebrow>
              {rail}
            </div>
          )
        ) : null}

        <article style={{ ...card, padding: 'clamp(22px, 3vw, 44px)', minWidth: 0, gridColumn: sections.length > 1 || narrow ? undefined : '1 / -1' }}>
          <header style={{ paddingBottom: 22, borderBottom: '1px solid var(--border-hairline)' }}>
            <Eyebrow tone="sage" size="sm">{doc.code ? `Robert’s Rules · ${doc.code}` : 'Robert’s Rules'}</Eyebrow>
            <h2 style={{ font: '600 clamp(26px, 2.6vw, 36px)/1.15 var(--mbc-font-serif)', letterSpacing: '-.02em', color: 'var(--text-heading)', margin: '12px 0 0', maxWidth: '34ch', textWrap: 'pretty' } as CSSProperties}>{doc.title}</h2>
          </header>
          <div style={{ display: 'grid', gap: 30, paddingTop: 26 }}>
            {sections.map((section) => {
              const here = arrived === section.anchor
              return (
                <div key={section.anchor} id={'rule-' + section.anchor} style={{ background: here ? 'var(--surface-panel)' : 'none', borderRadius: 14, padding: here ? '22px 24px' : 0, scrollMarginTop: 140, transition: 'background .3s' }}>
                  {here ? <Eyebrow style={{ marginBottom: 12 }}>You arrived here</Eyebrow> : null}
                  <Markdown text={withoutTitle(section.body)} />
                </div>
              )
            })}
          </div>
        </article>
      </div>

      {current
        ? createPortal(
            <div className="print-only" aria-hidden>
              <style>{'@media print { @page { size: letter portrait; margin: 0.75in; } }'}</style>
              <div className="print-section" style={{ fontFamily: 'var(--mbc-font-sans)', color: '#3A322B', display: 'grid', gap: 12 }}>
                <span style={{ font: '700 9px/1 var(--mbc-font-sans)', letterSpacing: '.24em', textTransform: 'uppercase' }}>Robert’s Rules of Order Revised (1915) · {doc.code ? `${doc.code} — ` : ''}{doc.title}</span>
                <Markdown text={withoutTitle(current.body)} />
                <span style={{ font: '400 9px/1.4 var(--mbc-font-sans)' }}>Public domain text; online edition © 1996 Constitution Society, constitution.org.</span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}

/* ---------------------------------------------------------------- helpers */

/** The article's own "# Art. V. …" line is the page's heading already. */
function withoutTitle(text: string): string {
  return text.replace(/^#[ \t]+.*\n?/m, '')
}

function titleOf(section: GovernanceSection): string {
  if (section.headingPath.length === 1 && /^Art\./.test(section.headingPath[0])) return 'Introduction to the article'
  const last = plainHeading(section.headingPath[section.headingPath.length - 1] ?? '')
  return last.replace(/^\d{1,2}\.\s+/, '').replace(/[¹²³⁴⁵⁶⁷⁸⁹]+$/, '') || 'Introduction'
}

function headingOf(path: string[], citation: string): string {
  const last = plainHeading(path[path.length - 1] ?? '').replace(/^\d{1,2}\.\s+/, '').replace(/[¹²³⁴⁵⁶⁷⁸⁹]+$/, '')
  return [citation, last].filter(Boolean).join(' — ') || 'Introduction'
}

/** A citation hit has no marked words: the text without its heading line. */
function plain(text: string): string {
  const flat = text.replace(/^#{1,6}[ \t]+.*$/gm, '').replace(/\s+/g, ' ').trim()
  return flat.length > 260 ? flat.slice(0, flat.lastIndexOf(' ', 260)) + '…' : flat
}

const card: CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--mbc-radius-panel)', padding: 'clamp(22px, 2.4vw, 34px)' }
const link: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-link)' }
const chip: CSSProperties = { minHeight: 44, padding: '0 18px', borderRadius: 'var(--mbc-radius-pill)', background: 'transparent', border: '1px solid var(--border-control)', font: '400 17px/1.2 var(--mbc-font-sans)', color: 'var(--text-heading)', cursor: 'pointer', textAlign: 'left' }
const crumb: CSSProperties = { font: '400 17px/1.5 var(--mbc-font-sans)' }
const th: CSSProperties = { font: '700 13px/1.3 var(--mbc-font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-eyebrow)', padding: '16px 10px 10px 0' }
const td: CSSProperties = { padding: '8px 10px 8px 0', verticalAlign: 'top' }
