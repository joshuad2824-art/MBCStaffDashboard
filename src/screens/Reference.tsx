import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Eyebrow } from '../components/ui'
import { useReference } from '../data/reference/store'
import { useSession } from '../session/session'
import type { GovernanceDocument, GovernanceSection, SearchHit } from '../data/reference/types'
import { Markdown, Snippet, body as bodyStyle, meta, plainHeading } from './reference/Markdown'
import { parseDate, relativeDay, startOfToday } from '../lib/date'

/* The governance reference, rebuilt to the three states of the expansion
   brief §A.4 and the Claude Design handoff (design_handoff_reference/):

     1 · The landing — the search field and the categories as cards, then
         the five things this person opened last.
     2 · Results — sections grouped by document, the snippet around the
         match with the matched words marked. Two characters fire it.
     3 · The document — the section arrived at, a contents rail built from
         the headings, a breadcrumb, and Print.

   The search is search_manual() in Postgres, or a substring pass over the
   seeded sections without Supabase; the screen does not know which answered.
   The manual is open to everyone who signs in (0015) and this surface is
   identical on both sides. The discrepancy docket is not on it, at Joshua's
   ask: it is the Board's working record, not the manual.

   Older-reader rules, from Adult Learning/13_Clarity_and_Accessibility.md:
   17px body type, nothing at 12px, every control 44px or more, nothing
   carried by colour alone, a breadcrumb on every document page, one idea
   per screen. The search field is the first tab stop and never autofocused. */

const KIND_LABEL: Record<GovernanceDocument['kind'], string> = {
  constitution: 'Constitution',
  bylaws: 'Bylaws',
  policy: 'Policies',
  procedure: 'Procedures and forms',
  reference: 'Derived reference',
}

const CATEGORIES: { kind: GovernanceDocument['kind']; line: string; unit: [string, string] }[] = [
  { kind: 'constitution', line: 'How the church is organised and governed.', unit: ['document', 'documents'] },
  { kind: 'bylaws', line: 'Membership, leadership, committees, meetings, amendments.', unit: ['article', 'articles'] },
  { kind: 'policy', line: 'Numbered policies, A through V — accounting, balloting, designated funds, education, facilities, memorials, vehicles.', unit: ['letter series', 'letter series'] },
  { kind: 'procedure', line: 'Reimbursement, nomination, balloting — the forms and procedures as the manual prints them.', unit: ['document', 'documents'] },
  { kind: 'reference', line: 'Quick reference, amendment history, appendix, index — assembled from the manual rather than voted on.', unit: ['document', 'documents'] },
]

/* The letter series, as the manual files its policies. The names come from
   the corpus (supabase/governance/CORPUS-PREP.md §2); a letter the manual
   adds later gets a plain line until somebody names it. */
const SERIES: Record<string, { name: string; line: string }> = {
  A: { name: 'Accounting', line: 'Benevolence, contributions, tellers, petty cash, purchases, deposits, employee expenses, building use income.' },
  B: { name: 'Balloting', line: 'Absentee balloting.' },
  D: { name: 'Designated funds', line: 'Designated funds, and the Family Assistance Fund.' },
  E: { name: 'Education', line: 'Scholarships, curriculum, the preschool, professional development.' },
  F: { name: 'Facilities', line: 'Calendar and equipment requests, the library, the kitchen, weddings, funerals, outside organisations.' },
  M: { name: 'Memorials', line: 'Bereavement flowers.' },
  V: { name: 'Vehicles', line: 'Church vehicles.' },
}

type Browse = { at: 'home' } | { at: 'category'; kind: GovernanceDocument['kind'] }

interface Recent {
  slug: string
  anchor: string
  at: string
}

const RECENT_MAX = 5

export function Reference() {
  const { data, error, search } = useReference()
  const { member } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const slug = decodeURIComponent(location.pathname.replace(/^\/reference\/?/, ''))
  const anchor = location.hash.replace(/^#/, '')

  const [q, setQ] = useState('')
  const [browse, setBrowse] = useState<Browse>({ at: 'home' })
  const [openLetter, setOpenLetter] = useState<string | null>(null)
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [recent, setRecent] = useState<Recent[]>(() => readRecent(member?.id ?? null))
  const query = q.trim()

  const documents = useMemo(() => data?.documents ?? [], [data])
  const sections = useMemo(() => data?.sections ?? [], [data])
  const sectionsOf = useMemo(() => {
    const map = new Map<string, GovernanceSection[]>()
    for (const section of sections) map.set(section.documentId, [...(map.get(section.documentId) ?? []), section])
    for (const list of map.values()) list.sort((a, b) => a.position - b.position)
    return map
  }, [sections])
  const doc = useMemo(() => documents.find((d) => d.slug === slug) ?? null, [documents, slug])

  const atDoc = doc !== null
  const atResults = !atDoc && query.length >= 2

  // Two characters fire the search; a keystroke waits a beat for the next one.
  const searchId = useRef(0)
  useEffect(() => {
    if (query.length < 2) {
      setHits(null)
      setSearching(false)
      return
    }
    const mine = ++searchId.current
    setSearching(true)
    const timer = window.setTimeout(() => {
      search(query)
        .then((found) => {
          if (mine === searchId.current) {
            setHits(found)
            setSearching(false)
          }
        })
        .catch(() => {
          if (mine === searchId.current) {
            setHits([])
            setSearching(false)
          }
        })
    }, 220)
    return () => window.clearTimeout(timer)
  }, [query, search])

  const openSection = (target: GovernanceDocument, sectionAnchor: string) => {
    const next = [{ slug: target.slug, anchor: sectionAnchor, at: new Date().toISOString() }, ...recent.filter((r) => !(r.slug === target.slug && r.anchor === sectionAnchor))].slice(0, RECENT_MAX)
    setRecent(next)
    writeRecent(member?.id ?? null, next)
    navigate(`/reference/${encodeURIComponent(target.slug)}#${sectionAnchor}`)
  }
  const openDocument = (target: GovernanceDocument) => openSection(target, sectionsOf.get(target.id)?.[0]?.anchor ?? 'top')
  const goHome = () => {
    setQ('')
    setBrowse({ at: 'home' })
    if (slug) navigate('/reference')
  }
  const goCategory = (kind: GovernanceDocument['kind']) => {
    setQ('')
    setBrowse({ at: 'category', kind })
    if (slug) navigate('/reference')
  }

  if (error) return <Note>{error}</Note>
  if (!data) return <Note>Opening the reference…</Note>

  const resultSections = hits?.length ?? 0
  const resultDocs = new Set((hits ?? []).map((h) => h.documentId)).size
  const countLine =
    documents.length === 0
      ? 'The corpus has not been loaded yet. The administrator loads it with the script in supabase/governance.'
      : query.length < 2
        ? `${documents.length} documents. Search finds any sentence in any of them; the categories below are for when you would rather look than ask.`
        : searching || hits === null
          ? `Searching for “${query}”…`
          : resultSections === 0
            ? `No matches for “${query}”.`
            : `${resultSections} ${resultSections === 1 ? 'section' : 'sections'} in ${resultDocs} ${resultDocs === 1 ? 'document' : 'documents'} match “${query}”. Matched words are bold and underlined.`

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section style={card}>
        <label style={{ display: 'grid', gap: 12 }}>
          <span style={{ font: '700 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>Search the bylaws, policies and procedures</span>
          <input
            type="search"
            data-reads=""
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              if (slug) navigate('/reference')
            }}
            placeholder="A word, a phrase or a citation — chairman, kitchen, flowers, A009"
            style={{ width: '100%', background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 12, padding: '0 18px', minHeight: 56, font: '400 18px/1 var(--mbc-font-sans)', color: 'var(--text-heading)' }}
          />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 16 }}>
          <p className="tabular" style={{ ...meta, font: '400 17px/1.6 var(--mbc-font-sans)', margin: 0, maxWidth: '70ch', textWrap: 'pretty' } as CSSProperties}>{countLine}</p>
          {q ? (
            <button type="button" onClick={goHome} style={link}>Clear the search</button>
          ) : null}
        </div>
      </section>

      {atDoc && doc ? (
        <DocumentView
          doc={doc}
          sections={sectionsOf.get(doc.id) ?? []}
          anchor={anchor}
          onHome={goHome}
          onCategory={() => goCategory(doc.kind)}
          onSection={(a) => navigate(`/reference/${encodeURIComponent(doc.slug)}#${a}`, { replace: true })}
        />
      ) : atResults ? (
        <Results hits={searching ? null : hits} query={query} documents={documents} onOpen={openSection} onClear={goHome} />
      ) : browse.at === 'category' ? (
        <CategoryList
          kind={browse.kind}
          documents={documents.filter((d) => d.kind === browse.kind)}
          sectionsOf={sectionsOf}
          openLetter={openLetter}
          onLetter={(letter) => setOpenLetter(openLetter === letter ? null : letter)}
          onBack={goHome}
          onOpen={openDocument}
        />
      ) : (
        <Landing
          documents={documents}
          sectionsOf={sectionsOf}
          recent={recent}
          onCategory={(kind) => {
            const inKind = documents.filter((d) => d.kind === kind)
            if (kind === 'constitution' && inKind.length === 1) openDocument(inKind[0])
            else goCategory(kind)
          }}
          onRecent={(entry) => {
            const target = documents.find((d) => d.slug === entry.slug)
            if (target) openSection(target, entry.anchor)
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ 1 · landing */

function Landing({ documents, sectionsOf, recent, onCategory, onRecent }: {
  documents: GovernanceDocument[]
  sectionsOf: Map<string, GovernanceSection[]>
  recent: Recent[]
  onCategory(kind: GovernanceDocument['kind']): void
  onRecent(entry: Recent): void
}) {
  const today = startOfToday()
  return (
    <section style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 20 }}>
        {CATEGORIES.map(({ kind, line, unit }) => {
          const inKind = documents.filter((d) => d.kind === kind)
          const count = kind === 'policy' ? new Set(inKind.map((d) => seriesOf(d))).size : inKind.length
          if (inKind.length === 0) return null
          const action = kind === 'constitution' && inKind.length === 1 ? 'Open the document →' : `${count} ${count === 1 ? unit[0] : unit[1]} →`
          return (
            <button key={kind} type="button" onClick={() => onCategory(kind)} style={{ ...card, textAlign: 'left', cursor: 'pointer', display: 'grid', gap: 14, alignContent: 'start', padding: '28px clamp(22px, 2vw, 30px)' }}>
              <span style={{ display: 'flex', gap: 18, alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ font: '600 26px/1.15 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)' }}>{KIND_LABEL[kind]}</span>
                <span className="tabular" style={{ font: '600 26px/1.15 var(--mbc-font-serif)', color: 'var(--text-meta)', flex: 'none' }}>{inKind.length}</span>
              </span>
              <span style={{ font: '400 17px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '46ch', textWrap: 'pretty' } as CSSProperties}>{line}</span>
              <span style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)' }}>{action}</span>
            </button>
          )
        })}
      </div>

      <div style={{ ...card, padding: '26px clamp(22px, 2vw, 30px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border-hairline)' }}>
          <Eyebrow>Recently opened</Eyebrow>
          <span style={meta}>The five you opened last, newest first — on this computer.</span>
        </div>
        {recent.length === 0 ? (
          <p style={{ ...meta, font: '400 17px/1.6 var(--mbc-font-sans)', margin: '16px 0 0' }}>Nothing opened yet. The sections you open will be listed here so you can go straight back to them.</p>
        ) : (
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {recent.map((entry) => {
              const target = documents.find((d) => d.slug === entry.slug)
              const section = target ? sectionsOf.get(target.id)?.find((s) => s.anchor === entry.anchor) : undefined
              if (!target) return null
              const opened = parseDate(entry.at.slice(0, 10))
              return (
                <button key={entry.slug + '#' + entry.anchor} type="button" onClick={() => onRecent(entry)} style={{ textAlign: 'left', background: 'var(--surface-card)', border: 'none', padding: '16px 2px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '6px 18px', alignItems: 'baseline', justifyContent: 'space-between', minHeight: 48 }}>
                  <span style={{ font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{sectionLabel(target, section)}</span>
                  <span className="tabular" style={meta}>{opened ? relativeDay(opened, today) : ''}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

/* ----------------------------------------------------- 1b · one category */

function CategoryList({ kind, documents, sectionsOf, openLetter, onLetter, onBack, onOpen }: {
  kind: GovernanceDocument['kind']
  documents: GovernanceDocument[]
  sectionsOf: Map<string, GovernanceSection[]>
  openLetter: string | null
  onLetter(letter: string): void
  onBack(): void
  onOpen(doc: GovernanceDocument): void
}) {
  const category = CATEGORIES.find((c) => c.kind === kind)
  const row = (d: GovernanceDocument, nested: boolean) => {
    const n = sectionsOf.get(d.id)?.length ?? 0
    return (
      <button key={d.id} type="button" onClick={() => onOpen(d)} style={{ textAlign: 'left', background: nested ? 'var(--surface-panel)' : 'var(--surface-card)', border: 'none', padding: nested ? '15px 16px' : '16px 2px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '6px 18px', alignItems: 'baseline', justifyContent: 'space-between', minHeight: 48 }}>
        <span style={{ font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{d.code && !d.title.includes(d.code) ? `${d.code} — ${d.title}` : d.title}</span>
        <span className="tabular" style={meta}>{n} {n === 1 ? 'section' : 'sections'}</span>
      </button>
    )
  }
  const letters = kind === 'policy' ? [...new Set(documents.map(seriesOf))].sort() : []
  return (
    <section style={card}>
      <button type="button" onClick={onBack} style={link}>← All categories</button>
      <div style={{ padding: '18px 0 20px', borderBottom: '1px solid var(--border-hairline)' }}>
        <p style={{ font: '600 30px/1.15 var(--mbc-font-serif)', letterSpacing: '-.02em', color: 'var(--text-heading)', margin: 0 }}>{KIND_LABEL[kind]}</p>
        <p style={{ font: '400 17px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: '10px 0 0', maxWidth: '66ch', textWrap: 'pretty' } as CSSProperties}>
          {kind === 'policy'
            ? `${documents.length} numbered policies in ${letters.length} letter series. The series is the level worth choosing: nobody looks for “policy nineteen”, they look for the one about the vans.`
            : category?.line}
        </p>
      </div>
      <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
        {kind === 'policy'
          ? letters.map((letter) => {
              const inSeries = documents.filter((d) => seriesOf(d) === letter)
              const series = SERIES[letter] ?? { name: `${letter} series`, line: `Policies in the ${letter} series.` }
              const open = openLetter === letter
              return (
                <div key={letter} style={{ background: 'var(--surface-card)' }}>
                  <button type="button" onClick={() => onLetter(letter)} aria-expanded={open} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '20px 2px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) auto', gap: '8px 18px', alignItems: 'baseline', minHeight: 52 }}>
                    <span style={{ font: '600 26px/1 var(--mbc-font-serif)', color: 'var(--text-eyebrow)' }}>{letter}</span>
                    <span style={{ display: 'grid', gap: 6 }}>
                      <span style={{ font: '700 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{series.name}</span>
                      <span style={{ ...meta, font: '400 16px/1.55 var(--mbc-font-sans)', maxWidth: '60ch' }}>{series.line}</span>
                    </span>
                    <span className="tabular" style={{ ...meta, font: '400 17px/1.4 var(--mbc-font-sans)' }}>{inSeries.length} {inSeries.length === 1 ? 'policy' : 'policies'}</span>
                  </button>
                  {open ? <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)', margin: '0 0 18px', paddingLeft: 62 }}>{inSeries.map((d) => row(d, true))}</div> : null}
                </div>
              )
            })
          : documents.map((d) => row(d, false))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ 2 · results */

function Results({ hits, query, documents, onOpen, onClear }: {
  hits: SearchHit[] | null
  query: string
  documents: GovernanceDocument[]
  onOpen(doc: GovernanceDocument, anchor: string): void
  onClear(): void
}) {
  if (hits === null) return <p style={{ ...meta, font: '400 17px/1.6 var(--mbc-font-sans)', margin: 0 }}>Searching…</p>
  if (hits.length === 0) {
    return (
      <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-section)', borderRadius: 'var(--mbc-radius-panel)', padding: 'clamp(30px, 3vw, 44px)', maxWidth: 720, display: 'grid', gap: 14 }}>
        <p style={{ font: '600 30px/1.2 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)', margin: 0 }}>Nothing in the manual says that.</p>
        <p style={{ font: '400 17px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '60ch', textWrap: 'pretty' } as CSSProperties}>
          That is an answer, not a failure — it is often the answer somebody needs in a meeting. Try a word the manual would use: kitchen, memorial, designated, vehicle, quorum. A citation works too: A009, Art. II.B.
        </p>
        <div style={{ marginTop: 6 }}>
          <Button variant="outline" size="md" onClick={onClear}>Browse the categories instead</Button>
        </div>
      </div>
    )
  }
  const groups: { doc: GovernanceDocument | null; key: string; kind: GovernanceDocument['kind']; code: string; title: string; hits: SearchHit[] }[] = []
  for (const hit of hits) {
    let group = groups.find((g) => g.key === hit.documentId)
    if (!group) {
      group = { key: hit.documentId, doc: documents.find((d) => d.id === hit.documentId) ?? null, kind: hit.documentKind, code: hit.documentCode, title: hit.documentTitle, hits: [] }
      groups.push(group)
    }
    group.hits.push(hit)
  }
  return (
    <section style={{ display: 'grid', gap: 20 }} aria-label={`Results for ${query}`}>
      {groups.map((group) => (
        <div key={group.key} style={{ ...card, padding: '24px clamp(22px, 2vw, 30px)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border-hairline)' }}>
            <span style={{ display: 'grid', gap: 7 }}>
              <Eyebrow tone="sage" size="sm">{groupLabel(group.kind, group.code)}</Eyebrow>
              <span style={{ font: '600 24px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>{group.title}</span>
            </span>
            <span className="tabular" style={{ ...meta, font: '400 17px/1.4 var(--mbc-font-sans)' }}>{group.hits.length} {group.hits.length === 1 ? 'section' : 'sections'}</span>
          </div>
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {group.hits.map((hit) => (
              <button
                key={hit.sectionId}
                type="button"
                onClick={() => { if (group.doc) onOpen(group.doc, hit.anchor) }}
                style={{ textAlign: 'left', background: 'var(--surface-card)', border: 'none', padding: '20px 2px', cursor: 'pointer', display: 'grid', gap: 9 }}
              >
                <span style={{ font: '700 17px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{hitHeading(hit)}</span>
                <span style={{ font: '400 17px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '78ch', textWrap: 'pretty' } as CSSProperties}>
                  <Snippet text={hit.byCitation ? plainSnippet(hit.snippet) : hit.snippet} />
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

/* ----------------------------------------------------------- 3 · document */

const ARRIVED_MS = 4000

function DocumentView({ doc, sections, anchor, onHome, onCategory, onSection }: {
  doc: GovernanceDocument
  sections: GovernanceSection[]
  anchor: string
  onHome(): void
  onCategory(): void
  onSection(anchor: string): void
}) {
  const current = sections.find((s) => s.anchor === anchor) ?? sections[0] ?? null
  const [arrived, setArrived] = useState<string | null>(null)

  // The section arrived at is marked for a beat, then returns to the page.
  useEffect(() => {
    if (!current) return
    setArrived(current.anchor)
    const target = document.getElementById('section-' + current.anchor)
    if (target) target.scrollIntoView({ block: 'start' })
    const timer = window.setTimeout(() => setArrived(null), ARRIVED_MS)
    return () => window.clearTimeout(timer)
  }, [doc.slug, current?.anchor]) // eslint-disable-line react-hooks/exhaustive-deps

  const printed = current ?? null
  const shortName = doc.code || shortTitle(doc)

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <nav aria-label="Where you are" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'baseline' }}>
          <button type="button" onClick={onHome} style={link}>Reference</button>
          <span style={{ ...crumb, color: 'var(--text-muted)' }}>›</span>
          <button type="button" onClick={onCategory} style={link}>{KIND_LABEL[doc.kind]}</button>
          <span style={{ ...crumb, color: 'var(--text-muted)' }}>›</span>
          <span style={{ ...crumb, color: 'var(--text-heading)' }}>{shortName}</span>
        </nav>
        <Button variant="outline" size="md" onClick={() => window.print()}>Print this section</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 262px) minmax(0, 1fr)', gap: 'clamp(22px, 3vw, 44px)', alignItems: 'start' }}>
        <div style={{ position: 'sticky', top: 120, ...card, padding: '22px 20px', display: 'grid', gap: 16 }}>
          <Eyebrow>Contents</Eyebrow>
          <div style={{ display: 'grid', gap: 2 }}>
            {sections.map((section) => {
              const active = current?.anchor === section.anchor
              return (
                <button
                  key={section.anchor}
                  type="button"
                  onClick={() => onSection(section.anchor)}
                  aria-current={active ? 'true' : undefined}
                  style={{ textAlign: 'left', background: active ? 'var(--surface-panel)' : 'none', border: 'none', borderRadius: 8, padding: '11px 12px', cursor: 'pointer', display: 'grid', gridTemplateColumns: 'minmax(34px, auto) minmax(0, 1fr)', gap: 10, alignItems: 'baseline', minHeight: 44, font: `${active ? 700 : 400} 16px/1.45 var(--mbc-font-sans)`, color: 'var(--text-heading)' }}
                >
                  <span className="tabular" style={{ color: 'var(--text-meta)' }}>{citeShort(section, doc)}</span>
                  <span>{sectionTitle(section)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 24, minWidth: 0 }}>
          <article style={{ ...card, padding: 'clamp(26px, 3vw, 44px)' }}>
            <header style={{ paddingBottom: 22, borderBottom: '1px solid var(--border-hairline)' }}>
              <Eyebrow tone="sage" size="sm">{groupLabel(doc.kind, doc.code)}</Eyebrow>
              <h2 style={{ font: '600 clamp(26px, 2.6vw, 36px)/1.15 var(--mbc-font-serif)', letterSpacing: '-.02em', color: 'var(--text-heading)', margin: '12px 0 0', maxWidth: '34ch', textWrap: 'pretty' } as CSSProperties}>{doc.title}</h2>
            </header>
            <div style={{ display: 'grid', gap: 30, paddingTop: 26 }}>
              {sections.length === 0 ? (
                <Markdown text={doc.body} />
              ) : (
                sections.map((section) => {
                  const here = arrived === section.anchor
                  return (
                    <div key={section.anchor} id={'section-' + section.anchor} style={{ background: here ? 'var(--surface-panel)' : 'none', borderRadius: 14, padding: here ? '22px 24px' : 0, scrollMarginTop: 140, transition: 'background .3s' }}>
                      {here ? <Eyebrow style={{ marginBottom: 12 }}>You arrived here</Eyebrow> : null}
                      {section.citation ? (
                        <p className="tabular" style={{ ...meta, font: '700 14px/1.4 var(--mbc-font-sans)', margin: '0 0 8px' }}>{section.citation}</p>
                      ) : null}
                      <Markdown text={section.body} />
                    </div>
                  )
                })
              )}
            </div>
          </article>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', ...card, padding: '26px clamp(22px, 2vw, 30px)' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <Eyebrow tone="stone" size="sm">What Print sends</Eyebrow>
              <p style={{ font: '600 22px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: '12px 0 0' }}>The section, its citation and the document it is from.</p>
              <p style={{ font: '400 16px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: '10px 0 0', maxWidth: '46ch', textWrap: 'pretty' } as CSSProperties}>Not the rail, not the nav, not the search field. A page that prints its own navigation gets photographed on a phone instead, and then the photograph is what gets quoted.</p>
            </div>
          </div>
        </div>
      </div>

      {printed
        ? createPortal(
            <div className="print-only" aria-hidden>
              <style>{'@media print { @page { size: letter portrait; margin: 0.75in; } }'}</style>
              <div className="print-section" style={{ fontFamily: 'var(--mbc-font-sans)', color: '#3A322B', display: 'grid', gap: 12 }}>
                <span style={{ font: '700 9px/1 var(--mbc-font-sans)', letterSpacing: '.24em', textTransform: 'uppercase' }}>Memorial Baptist Church · Bylaws, Policies & Procedures</span>
                <span style={{ font: '600 20px/1.3 var(--mbc-font-serif)' }}>{doc.title}</span>
                {printed.citation ? <span style={{ font: '700 14px/1.4 var(--mbc-font-sans)' }}>{printed.citation}</span> : null}
                <Markdown text={printed.body} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}

/* ---------------------------------------------------------------- helpers */

function readRecent(personId: number | null): Recent[] {
  if (personId === null) return []
  try {
    const raw = window.localStorage.getItem(`mbc.reference.recent.${personId}`)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((r): r is Recent => typeof r === 'object' && r !== null && typeof (r as Recent).slug === 'string' && typeof (r as Recent).anchor === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function writeRecent(personId: number | null, entries: Recent[]): void {
  if (personId === null) return
  try {
    window.localStorage.setItem(`mbc.reference.recent.${personId}`, JSON.stringify(entries))
  } catch {
    // Remembered for this tab only.
  }
}

/** The letter a policy is filed under: the first letter of its code. */
function seriesOf(doc: GovernanceDocument): string {
  return (doc.code[0] ?? '?').toUpperCase()
}

function groupLabel(kind: GovernanceDocument['kind'], code: string): string {
  if (kind !== 'policy') return KIND_LABEL[kind]
  const letter = (code[0] ?? '').toUpperCase()
  return `Policies · ${SERIES[letter]?.name ?? letter + ' series'}`
}

/* The nav shows the part of a title the code does not already say:
   "Policy A009 — Building & Property Use Income" → "Building & Property Use
   Income"; "Bylaws, Article II. CHURCH LEADERSHIP" → "Church leadership". */
function shortTitle(d: GovernanceDocument): string {
  let t = d.title
  t = t.replace(/^Policy\s+[A-Z]\d{3}\s*[—–-]\s*/i, '').replace(/^[A-Z]\d{3}\s*[—–-]\s*/, '')
  t = t.replace(/^Bylaws,\s*Article\s+[IVX]+\.?\s*/i, '').replace(/^Article\s+[IVX]+\s*[—–-]\s*/i, '')
  if (t === t.toUpperCase() && t.length > 3) t = t.charAt(0) + t.slice(1).toLowerCase()
  return t
}

/** A heading as the rail shows it: an all-caps heading in sentence case, with
    its roman numerals kept — "ARTICLE II. CHURCH LEADERSHIP" → "Article II. Church leadership". */
function sectionTitle(section: GovernanceSection): string {
  const last = section.headingPath[section.headingPath.length - 1]
  if (!last) return 'Preamble'
  const text = plainHeading(last)
  if (text !== text.toUpperCase() || text.length <= 3) return text
  return text
    .toLowerCase()
    .replace(/(^|[.:—–-]\s+)([a-z])/g, (_, lead: string, first: string) => lead + first.toUpperCase())
    .replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\b/g, (numeral) => numeral.toUpperCase())
}

/** The part of a citation the document's code does not already say: "A009 §4" → "§4". */
function citeShort(section: GovernanceSection, doc: GovernanceDocument): string {
  if (!section.citation) return String(section.position)
  const short = doc.code ? section.citation.replace(doc.code, '').trim() : section.citation
  return short || section.citation
}

function sectionLabel(doc: GovernanceDocument, section: GovernanceSection | undefined): string {
  const name = doc.code || shortTitle(doc)
  if (!section) return name
  return `${name}${section.citation && section.citation !== doc.code ? ' · ' + citeShort(section, doc) : ''} — ${sectionTitle(section)}`
}

function hitHeading(hit: SearchHit): string {
  const title = plainHeading(hit.headingPath[hit.headingPath.length - 1] ?? '') || 'Preamble'
  const code = hit.documentCode
  const cite = hit.citation && hit.citation !== code ? (code ? hit.citation.replace(code, '').trim() : hit.citation) : ''
  return [code, cite].filter(Boolean).join(' · ') + (code || cite ? ' — ' : '') + title
}

/** A citation hit has no marked words; strip the heading line so the snippet is the text. */
function plainSnippet(text: string): string {
  return text.replace(/^#{1,6}[ \t]+.*$/m, '').replace(/\s+/g, ' ').trim()
}

function Note({ children }: { children: ReactNode }) {
  return <p style={{ ...bodyStyle, margin: 0 }}>{children}</p>
}

const card: CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--mbc-radius-panel)', padding: 'clamp(24px, 2.4vw, 34px)' }
const link: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-link)' }
const crumb: CSSProperties = { font: '400 17px/1.5 var(--mbc-font-sans)' }
