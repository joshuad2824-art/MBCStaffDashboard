import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Card, Eyebrow } from '../components/ui'
import { useMeetings } from '../data/meetings/store'
import type { Finding, GovernanceDocument } from '../data/meetings/types'

/* The governance reference (brief §3.3): the transcribed bylaws and policies,
   searchable, with the discrepancy docket attached. It reads; nothing here
   writes. What the Board can read is a policy on the tables, not an accident
   of where the files are hosted. */

const KINDS: { kind: GovernanceDocument['kind']; label: string }[] = [
  { kind: 'bylaws', label: 'Bylaws' },
  { kind: 'policy', label: 'Policies' },
  { kind: 'procedure', label: 'Procedures' },
]

export function Reference() {
  const { data, error } = useMeetings()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>('') // a document slug, or 'docket'

  const documents = data?.documents ?? []
  const findings = data?.findings ?? []
  const current = selected || documents[0]?.slug || 'docket'
  const needle = query.trim().toLowerCase()

  const hits = useMemo(() => {
    if (!needle) return null
    const out = new Map<string, number>()
    for (const doc of documents) {
      const count = countMatches(doc.title + '\n' + doc.body, needle)
      if (count) out.set(doc.slug, count)
    }
    const docket = findings.reduce((total, f) => total + countMatches(f.title + '\n' + f.body + '\n' + f.cites.join(' '), needle), 0)
    if (docket) out.set('docket', docket)
    return out
  }, [documents, findings, needle])

  if (error) return <Note>{error}</Note>
  if (!data) return <Note>Opening the reference…</Note>

  const doc = documents.find((d) => d.slug === current) ?? null
  const citing = (finding: Finding) => finding.cites

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <Card radius="card" pad={22} style={{ flex: '1 1 280px', maxWidth: 340, display: 'grid', gap: 16, minWidth: 0 }}>
        <input
          value={query}
          placeholder="Search the manual"
          onChange={(event) => setQuery(event.target.value)}
          style={{ width: '100%', minHeight: 44, background: 'var(--surface-field)', border: '1px solid var(--mbc-border-panel)', borderRadius: 'var(--mbc-radius-input)', padding: '12px 14px', font: '400 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }}
        />
        {documents.length === 0 ? (
          <p style={{ ...meta, margin: 0 }}>The corpus has not been loaded yet. The administrator loads it with the script in supabase/governance.</p>
        ) : null}
        {KINDS.map(({ kind, label }) => {
          const docs = documents.filter((d) => d.kind === kind && (!hits || hits.has(d.slug)))
          if (docs.length === 0) return null
          return (
            <div key={kind} style={{ display: 'grid', gap: 2 }}>
              <Eyebrow size="sm" style={{ marginBottom: 8 }}>{label}</Eyebrow>
              {docs.map((d) => (
                <NavRow key={d.slug} active={current === d.slug} onClick={() => setSelected(d.slug)} code={d.code} title={d.title.replace(/^[A-Z]\d{3}\s*[—–-]\s*|^Article\s+[IVX]+\s*[—–-]\s*/i, '')} count={hits?.get(d.slug)} />
              ))}
            </div>
          )
        })}
        {!hits || hits.has('docket') ? (
          <div style={{ display: 'grid', gap: 2 }}>
            <Eyebrow size="sm" style={{ marginBottom: 8 }}>Where the manual disagrees with itself</Eyebrow>
            <NavRow active={current === 'docket'} onClick={() => setSelected('docket')} code={String(findings.length)} title="Discrepancy docket" count={hits?.get('docket')} />
          </div>
        ) : null}
        {hits && hits.size === 0 ? <p style={{ ...meta, margin: 0 }}>Nothing in the manual says that.</p> : null}
      </Card>

      <Card radius="card" pad={28} style={{ flex: '3 1 520px', minWidth: 0, display: 'grid', gap: 18 }}>
        {current === 'docket' ? (
          <div style={{ display: 'grid', gap: 18, maxWidth: '78ch' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <Eyebrow size="sm">Discrepancy docket</Eyebrow>
              <h2 style={h2}>Where the manual disagrees with itself</h2>
              <p style={{ ...meta, margin: 0 }}>
                Each finding names the passages it concerns. Findings 8 and 9 are the reason a motion that amends the bylaws quotes the text before and after: a record that cites a paragraph number drifts; one that quotes the sentence does not.
              </p>
            </div>
            {findings.length === 0 ? <p style={{ ...meta, margin: 0 }}>No findings loaded.</p> : null}
            {findings.filter((f) => !needle || countMatches(f.title + '\n' + f.body + '\n' + f.cites.join(' '), needle) > 0).map((f) => (
              <article key={f.id} style={{ display: 'grid', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
                  <span className="tabular" style={{ font: '600 20px/1 var(--mbc-font-serif)', color: 'var(--text-meta)' }}>{f.number}</span>
                  <h3 style={{ font: '600 19px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>{highlight(f.title, needle)}</h3>
                  <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: f.status === 'resolved' ? 'var(--mbc-yale-sage)' : 'var(--text-eyebrow)' }}>{f.status}</span>
                </div>
                <Markdown text={f.body} needle={needle} />
                {citing(f).length ? (
                  <p style={{ ...meta, margin: 0 }}>
                    Cites{' '}
                    {citing(f).map((cite, index) => (
                      <span key={cite}>
                        {index ? ' · ' : ''}
                        <button type="button" onClick={() => { const target = documentFor(cite, documents); if (target) setSelected(target.slug) }} style={link}>
                          {cite}
                        </button>
                      </span>
                    ))}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : doc ? (
          <div style={{ display: 'grid', gap: 12, maxWidth: '78ch' }}>
            <Eyebrow size="sm">{doc.code || KINDS.find((k) => k.kind === doc.kind)?.label}</Eyebrow>
            <Markdown text={doc.body} needle={needle} />
            {findings.some((f) => f.cites.some((c) => citesDocument(c, doc))) ? (
              <div style={{ display: 'grid', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-hairline)' }}>
                <Eyebrow size="sm">On the docket</Eyebrow>
                {findings.filter((f) => f.cites.some((c) => citesDocument(c, doc))).map((f) => (
                  <p key={f.id} style={{ ...meta, margin: 0 }}>
                    <button type="button" onClick={() => setSelected('docket')} style={link}>Finding {f.number}</button> · {f.title} · {f.cites.filter((c) => citesDocument(c, doc)).join(', ')}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p style={{ ...meta, margin: 0 }}>Nothing to read yet.</p>
        )}
      </Card>
    </div>
  )
}

function NavRow({ active, onClick, code, title, count }: { active: boolean; onClick(): void; code: string; title: string; count?: number }) {
  return (
    <button type="button" onClick={onClick} style={{ textAlign: 'left', background: active ? 'var(--surface-panel)' : 'transparent', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '56px minmax(0,1fr) auto', gap: 10, alignItems: 'baseline' }}>
      <span className="tabular" style={{ font: '700 11px/1.3 var(--mbc-font-sans)', letterSpacing: '.06em', color: 'var(--text-meta)' }}>{code}</span>
      <span style={{ font: (active ? '700' : '400') + ' 15px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{title}</span>
      {count ? <span className="tabular" style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--mbc-yale-sage)' }}>{count}</span> : <span />}
    </button>
  )
}

/* Which document a citation points at: "Art. II.B §3 ¶12" → the document
   whose code is "Art. II"; "A009 §4" → "A009". */
function documentFor(cite: string, documents: GovernanceDocument[]): GovernanceDocument | null {
  return documents.find((d) => citesDocument(cite, d)) ?? null
}

function citesDocument(cite: string, doc: GovernanceDocument): boolean {
  if (!doc.code) return false
  const code = doc.code.replace(/\s+/g, ' ').toLowerCase()
  const c = cite.replace(/\s+/g, ' ').toLowerCase()
  return c === code || c.startsWith(code + '.') || c.startsWith(code + ' ')
}

function countMatches(text: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let at = text.toLowerCase().indexOf(needle)
  while (at !== -1) {
    count += 1
    at = text.toLowerCase().indexOf(needle, at + needle.length)
  }
  return count
}

function highlight(text: string, needle: string): ReactNode {
  if (!needle) return text
  const parts: ReactNode[] = []
  const lower = text.toLowerCase()
  let from = 0
  let at = lower.indexOf(needle)
  while (at !== -1) {
    parts.push(text.slice(from, at))
    parts.push(<mark key={at} style={{ background: 'var(--mbc-lamplight-tint)', color: 'inherit', borderRadius: 3 }}>{text.slice(at, at + needle.length)}</mark>)
    from = at + needle.length
    at = lower.indexOf(needle, from)
  }
  parts.push(text.slice(from))
  return <>{parts}</>
}

/* A small renderer for a transcription: headings, paragraphs, lists, block
   quotes, bold and italics. The corpus is text the Board reads, not a page
   somebody designed, so this stays plain and lets the type do the work. */
function Markdown({ text, needle }: { text: string; needle: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text])
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const style = block.level === 1 ? h2 : block.level === 2 ? h3 : h4
          return <p key={index} style={{ ...style, marginTop: index ? 10 : 0 }}>{inline(block.text, needle)}</p>
        }
        if (block.kind === 'quote') return <blockquote key={index} style={{ margin: 0, paddingLeft: 14, borderLeft: '2px solid var(--border-control)', ...meta }}>{inline(block.text, needle)}</blockquote>
        if (block.kind === 'list') {
          return block.ordered ? (
            <ol key={index} style={{ margin: 0, paddingLeft: 24, display: 'grid', gap: 6, ...body }}>{block.items.map((item, i) => <li key={i} value={item.number}>{inline(item.text, needle)}</li>)}</ol>
          ) : (
            <ul key={index} style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 6, ...body }}>{block.items.map((item, i) => <li key={i}>{inline(item.text, needle)}</li>)}</ul>
          )
        }
        return <p key={index} style={{ ...body, margin: 0, textWrap: 'pretty' } as CSSProperties}>{inline(block.text, needle)}</p>
      })}
    </div>
  )
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: { number?: number; text: string }[] }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.replace(/\r/g, '').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i += 1; continue }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) { blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() }); i += 1; continue }
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1 }
      blocks.push({ kind: 'quote', text: quote.join(' ').trim() }); continue
    }
    const ordered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line)
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line)
    if (ordered || bullet) {
      const isOrdered = Boolean(ordered)
      const items: { number?: number; text: string }[] = []
      while (i < lines.length) {
        const o = /^\s*(\d+)[.)]\s+(.*)$/.exec(lines[i])
        const b = /^\s*[-*•]\s+(.*)$/.exec(lines[i])
        if (isOrdered && o) items.push({ number: Number(o[1]), text: o[2] })
        else if (!isOrdered && b) items.push({ text: b[1] })
        else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) items[items.length - 1].text += ' ' + lines[i].trim()
        else break
        i += 1
      }
      blocks.push({ kind: 'list', ordered: isOrdered, items }); continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>\s?|\s*\d+[.)]\s|\s*[-*•]\s)/.test(lines[i])) { para.push(lines[i].trim()); i += 1 }
    blocks.push({ kind: 'paragraph', text: para.join(' ') })
  }
  return blocks
}

function inline(text: string, needle: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g)
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index}>{highlight(part.slice(2, -2), needle)}</strong>
    if (/^\*[^*]+\*$/.test(part) || /^_[^_]+_$/.test(part)) return <em key={index}>{highlight(part.slice(1, -1), needle)}</em>
    return <span key={index}>{highlight(part, needle)}</span>
  })
}

function Note({ children }: { children: string }) {
  return <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>{children}</p>
}

const h2: CSSProperties = { font: '600 26px/1.25 var(--mbc-font-serif)', letterSpacing: '-.01em', color: 'var(--text-heading)', margin: 0 }
const h3: CSSProperties = { font: '600 20px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }
const h4: CSSProperties = { font: '700 12px/1.3 var(--mbc-font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-eyebrow)', margin: 0 }
const meta: CSSProperties = { font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const body: CSSProperties = { font: '400 16px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)' }
const link: CSSProperties = { background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--text-link)', cursor: 'pointer' }
