import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Eyebrow } from '../../components/ui'
import { ALWAYS_NEAR, CREDIT, FRONT_DOOR, GROUPS, loadGuide, searchGuide, shortAnswer } from '../../data/parliamentary/guide'
import type { Guide as GuideData, GuideArticle } from '../../data/parliamentary/guide'
import { citedSection, sectionPath } from '../../data/parliamentary/book'
import type { SearchHit } from '../../data/reference/types'
import { Snippet, meta } from '../reference/Markdown'
import { GuideMarkdown } from './GuideMarkdown'
import { useSession } from '../../session/session'

/* Robert's Rules in plain language — for the moment somebody in the room asks
   "can we do that?" and the answer is wanted in under a minute.

     1 · The landing — the search, then the "I want to…" finder (the front
         door, as the hand-off asks), then every article by group.
     2 · Results — one line per article: its group, its title, the words that
         matched. A phrase people actually say lands first; Enter opens it.
     3 · An article — the cheat sheet, the precedence ladder and the glossary
         one tap away, "At MBC" set apart, Robert's own words for each section
         it rests on, and the credit the Constitution Society's notice asks for.

   Same older-reader rules as the reference: 17px body, 44px controls, the
   search first and never autofocused, nothing carried by colour alone. */

const TRY = ['table it', 'call the question', 'enough people', 'change our minds', 'two-thirds', 'minutes', '§28']

export function Guide() {
  const navigate = useNavigate()
  const location = useLocation()
  const { context } = useSession()
  const [guide, setGuide] = useState<GuideData | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [searching, setSearching] = useState(false)

  const slug = decodeURIComponent(location.pathname.replace(/^\/rules\/?/, '').replace(/\/$/, ''))
  const query = q.trim()
  const fires = query.length >= 2 || citedSection(query) !== null

  useEffect(() => {
    let live = true
    loadGuide()
      .then((loaded) => { if (live) setGuide(loaded) })
      .catch((failure: unknown) => { if (live) setFailed(failure instanceof Error ? failure.message : 'Robert’s Rules could not be opened.') })
    return () => { live = false }
  }, [])

  const bySlug = useMemo(() => new Map((guide?.articles ?? []).map((a) => [a.slug, a])), [guide])
  const article = slug ? bySlug.get(slug) ?? null : null

  // Going to another article clears the search and starts at the top.
  useEffect(() => {
    if (slug) {
      setQ('')
      window.scrollTo({ top: 0 })
    }
  }, [slug])

  const searchId = useRef(0)
  useEffect(() => {
    if (!guide || !fires) {
      setHits(null)
      setSearching(false)
      return
    }
    const mine = ++searchId.current
    setSearching(true)
    const timer = window.setTimeout(() => {
      if (mine !== searchId.current) return
      setHits(searchGuide(guide, query))
      setSearching(false)
    }, 140)
    return () => window.clearTimeout(timer)
  }, [guide, query, fires])

  if (failed) return <p style={{ ...bodyText, margin: 0 }}>{failed}</p>
  if (!guide) return <p style={{ ...bodyText, margin: 0 }}>Opening Robert’s Rules…</p>

  const cited = citedSection(query)
  const first = hits && hits.length > 0 && !searching && ['citation', 'title', 'heading'].includes(hits[0].matchKind) ? hits[0] : null
  const corrected = hits && hits.length > 0 && hits.every((h) => h.matchKind === 'corrected') ? hits[0].matchedAs : ''
  const partial = hits !== null && hits.length > 0 && hits.every((h) => h.matchKind === 'some')
  const n = hits?.length ?? 0
  /* On the deacon side the resting line is left off: the search box and the
     chips beneath it say the same. Once a search runs, the line reports it. */
  const countLine = !fires
    ? context === 'deacon' ? '' : `${guide.articles.length} short articles in plain language, each with a short answer first. Type what’s happening — “table it”, “call the question”, “do we have enough people” — or a section number.`
    : hits === null || searching
      ? `Searching for “${query}”…`
      : cited !== null
        ? n === 0
          ? `No article rests on §${cited}. Robert’s own words for it are a tap away.`
          : `${n === 1 ? 'One article rests' : `${n} articles rest`} on §${cited}.`
        : n === 0
          ? `Nothing in the guide matches “${query}”.`
          : corrected
            ? `Nothing matched “${query}”, so ${n === 1 ? 'this is the result' : `these ${n} are the results`} for “${corrected}”.`
            : partial
              ? `No article has every word of “${query}”. ${n === 1 ? 'This one has' : `These ${n} have`} some of them.`
              : `${n === 1 ? 'One article matches' : `${n} articles match`} “${query}”.${first ? ' Press Enter to open the first.' : ''}`

  const open = (target: string) => navigate(`/rules/${encodeURIComponent(target)}`)
  const clear = () => {
    setQ('')
    if (slug) navigate('/rules')
  }

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section style={card}>
        <label style={{ display: 'grid', gap: 12 }}>
          <span style={{ font: '700 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>Search Robert’s Rules</span>
          <input
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              if (slug) navigate('/rules')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && first) open(first.documentId)
            }}
            placeholder="What’s happening? — table it, call the question, quorum, §28"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            style={{ width: '100%', background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 12, padding: '0 18px', minHeight: 56, font: '400 18px/1 var(--mbc-font-sans)', color: 'var(--text-heading)' }}
          />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'baseline', justifyContent: 'space-between', marginTop: countLine || q ? 16 : 0 }}>
          <p role="status" style={{ ...meta, font: '400 17px/1.6 var(--mbc-font-sans)', margin: 0, maxWidth: '70ch', textWrap: 'pretty' } as CSSProperties}>{countLine}</p>
          {q ? <button type="button" onClick={clear} style={{ ...link, minHeight: 44 }}>Clear the search</button> : null}
        </div>
        {!q && !article ? (
          <div role="group" aria-label="Searches to try" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 14 }}>
            <span style={{ ...meta, font: '400 17px/1.4 var(--mbc-font-sans)' }}>Try:</span>
            {TRY.map((text) => <button key={text} type="button" onClick={() => setQ(text)} style={chip}>{text}</button>)}
          </div>
        ) : null}
      </section>

      {fires && !article ? (
        <Results hits={hits} bySlug={bySlug} cited={cited} onOpen={open} />
      ) : article ? (
        <ArticleView article={article} guide={guide} />
      ) : (
        <Landing guide={guide} bySlug={bySlug} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ 1 · landing */

function Landing({ guide, bySlug }: { guide: GuideData; bySlug: Map<string, GuideArticle> }) {
  const door = bySlug.get(FRONT_DOOR)
  return (
    <section style={{ display: 'grid', gap: 22 }}>
      <Near current={FRONT_DOOR} />
      {door ? (
        <article style={{ ...card, padding: 'clamp(22px, 3vw, 40px)' }}>
          <Eyebrow>Start here</Eyebrow>
          <h2 style={title}>{door.title}</h2>
          <div style={{ paddingTop: 18 }}>
            <GuideMarkdown text={withoutTitle(door.body)} />
          </div>
        </article>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 20 }}>
        {GROUPS.map((group) => {
          const inGroup = guide.articles.filter((a) => a.group === group.name)
          if (!inGroup.length) return null
          return (
            <div key={group.name} style={{ ...card, padding: '24px clamp(18px, 2vw, 28px)', display: 'grid', gap: 10, alignContent: 'start' }}>
              <span style={{ font: '600 22px/1.2 var(--mbc-font-serif)', letterSpacing: '-.01em', color: 'var(--text-heading)' }}>{group.name}</span>
              <span style={{ font: '400 16px/1.55 var(--mbc-font-sans)', color: 'var(--text-body)' }}>{group.line}</span>
              <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)', marginTop: 4 }}>
                {inGroup.map((a) => (
                  <Link key={a.slug} to={`/rules/${a.slug}`} style={{ background: 'var(--surface-card)', padding: '12px 2px', minHeight: 44, display: 'flex', alignItems: 'center', font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', textDecoration: 'none' }}>
                    {a.shortTitle}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Credit />
    </section>
  )
}

/** The rest of the guide is a tap away from anywhere in it. */
function Near({ current }: { current?: string }) {
  const links = [{ slug: FRONT_DOOR, label: 'I want to…' }, ...ALWAYS_NEAR].filter((l) => l.slug !== current)
  return (
    <nav aria-label="Always near" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      {links.map((l) => <Link key={l.slug} to={`/rules/${l.slug}`} style={{ ...chip, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{l.label}</Link>)}
      <Link to="/rules/1915" style={{ ...chip, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'var(--text-link)' }}>Robert’s own words (1915) →</Link>
    </nav>
  )
}

function Credit() {
  return (
    <p style={{ ...meta, margin: 0, maxWidth: '78ch', textWrap: 'pretty' } as CSSProperties}>
      <em>{CREDIT.replace(/constitution\.org\.$/, '')}</em>
      <a href="https://www.constitution.org/" target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)' }}><em>constitution.org</em></a><em>.</em>{' '}
      Where MBC’s bylaws or policies say something different, they govern, and the article’s “At MBC” note says so.
    </p>
  )
}

/* ------------------------------------------------------------ 2 · results */

function Results({ hits, bySlug, cited, onOpen }: { hits: SearchHit[] | null; bySlug: Map<string, GuideArticle>; cited: number | null; onOpen(slug: string): void }) {
  const ownWords = cited !== null ? sectionPath(cited) : null
  if (hits === null) return <p style={{ ...meta, font: '400 17px/1.6 var(--mbc-font-sans)', margin: 0 }}>Searching…</p>
  return (
    <section style={{ display: 'grid', gap: 18 }}>
      {ownWords ? (
        <Link to={ownWords} style={{ ...chip, justifySelf: 'start', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'var(--text-link)' }}>Read §{cited} in Robert’s own words →</Link>
      ) : null}
      {hits.length === 0 && cited === null ? (
        <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-section)', borderRadius: 'var(--mbc-radius-panel)', padding: 'clamp(24px, 3vw, 40px)', maxWidth: 720, display: 'grid', gap: 14 }}>
          <p style={{ font: '600 26px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>The guide doesn’t say that in those words.</p>
          <p style={{ ...bodyText, margin: 0 }}>Try the name of the motion, or what you want the group to do. The “I want to…” page lists them all, and Robert’s own words can be searched too.</p>
          <Near />
        </div>
      ) : (
        <div style={{ ...card, padding: '8px clamp(18px, 2vw, 28px)' }}>
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {hits.map((hit) => {
              const a = bySlug.get(hit.documentId)
              if (!a) return null
              return (
                <button key={hit.sectionId} type="button" onClick={() => onOpen(a.slug)} style={{ textAlign: 'left', background: 'var(--surface-card)', border: 'none', padding: '18px 2px', cursor: 'pointer', display: 'grid', gap: 8 }}>
                  <Eyebrow tone="sage" size="sm">{a.group}</Eyebrow>
                  <span style={{ font: '700 18px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{a.title}</span>
                  <span style={{ font: '400 17px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '78ch', textWrap: 'pretty' } as CSSProperties}>
                    {hit.byCitation ? shortAnswer(a) : <Snippet text={hit.snippet} />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ 3 · article */

function ArticleView({ article, guide }: { article: GuideArticle; guide: GuideData }) {
  const siblings = guide.articles.filter((a) => a.group === article.group && a.slug !== article.slug)
  const text = withoutTitle(article.body)
  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <nav aria-label="Where you are" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'baseline' }}>
          <Link to="/rules" style={link}>Robert’s Rules</Link>
          <span style={{ ...crumb, color: 'var(--text-muted)' }}>›</span>
          <span style={{ ...crumb, color: 'var(--text-meta)' }}>{article.group}</span>
          <span style={{ ...crumb, color: 'var(--text-muted)' }}>›</span>
          <span style={{ ...crumb, color: 'var(--text-heading)' }}>{article.shortTitle}</span>
        </nav>
        <Button variant="outline" size="md" onClick={() => window.print()}>Print this article</Button>
      </div>

      <Near current={article.slug} />

      <article style={{ ...card, padding: 'clamp(22px, 3vw, 44px)', minWidth: 0 }}>
        <Eyebrow tone="sage" size="sm">{article.group}</Eyebrow>
        <h2 style={title}>{article.title}</h2>
        <div style={{ paddingTop: 20, borderTop: '1px solid var(--border-hairline)', marginTop: 18 }}>
          <GuideMarkdown text={text} />
        </div>
        {article.rrSections.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-hairline)' }}>
            <span style={{ ...meta, font: '400 16px/1.4 var(--mbc-font-sans)' }}>Robert’s own words:</span>
            {article.rrSections.map((n) => {
              const to = sectionPath(n)
              return to ? <Link key={n} to={to} style={{ ...chip, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>§{n}</Link> : null
            })}
          </div>
        ) : null}
      </article>

      {siblings.length ? (
        <div style={{ ...card, padding: '20px clamp(18px, 2vw, 28px)', display: 'grid', gap: 10 }}>
          <Eyebrow tone="stone" size="sm">{`More in ${article.group}`}</Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {siblings.map((a) => <Link key={a.slug} to={`/rules/${a.slug}`} style={{ ...chip, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{a.shortTitle}</Link>)}
          </div>
        </div>
      ) : null}

      <Credit />

      {createPortal(
        <div className="print-only" aria-hidden>
          <style>{'@media print { @page { size: letter portrait; margin: 0.75in; } }'}</style>
          <div className="print-section" style={{ fontFamily: 'var(--mbc-font-sans)', color: '#3A322B', display: 'grid', gap: 12 }}>
            <span style={{ font: '700 9px/1 var(--mbc-font-sans)', letterSpacing: '.24em', textTransform: 'uppercase' }}>Memorial Baptist Church · Robert’s Rules in plain language</span>
            <span style={{ font: '600 20px/1.3 var(--mbc-font-serif)' }}>{article.title}</span>
            <GuideMarkdown text={text} />
            <span style={{ font: '400 9px/1.4 var(--mbc-font-sans)' }}>{CREDIT}</span>
          </div>
        </div>,
        document.body,
      )}
    </section>
  )
}

/* ---------------------------------------------------------------- helpers */

/** The "# Title" line is the page's heading already. */
function withoutTitle(text: string): string {
  return text.replace(/^\s*#[ \t]+.*\n?/, '')
}

const bodyText: CSSProperties = { font: '400 17px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '72ch' }
const card: CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--mbc-radius-panel)', padding: 'clamp(22px, 2.4vw, 34px)' }
const link: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-link)', textDecoration: 'none' }
const chip: CSSProperties = { minHeight: 44, padding: '0 18px', borderRadius: 'var(--mbc-radius-pill)', background: 'transparent', border: '1px solid var(--border-control)', font: '400 17px/1.2 var(--mbc-font-sans)', color: 'var(--text-heading)', cursor: 'pointer', textAlign: 'left' }
const crumb: CSSProperties = { font: '400 17px/1.5 var(--mbc-font-sans)' }
const title: CSSProperties = { font: '600 clamp(26px, 2.6vw, 36px)/1.15 var(--mbc-font-serif)', letterSpacing: '-.02em', color: 'var(--text-heading)', margin: '12px 0 0', maxWidth: '36ch', textWrap: 'pretty' } as CSSProperties
