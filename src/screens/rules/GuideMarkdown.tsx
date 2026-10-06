import { Fragment, useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MatchMark } from '../reference/Markdown'

/* The guide's renderer. The manual's (reference/Markdown.tsx) is deliberately
   small, because a transcription is paragraphs and lists. The guide was written
   for this screen and uses a little more, all of it rendered here:

     - links between articles, `[Amend](amend.md)` → /rules/amend
     - tables (the cheat sheet, the precedence ladder)
     - the facts strip, one line of inline code — `Second: Yes · Debate: No · …` —
       drawn as a row of labelled chips
     - lists with nested lists and indented follow-on paragraphs
     - "## At MBC", set apart, because that is where the bylaws override Robert's
     - "**Short answer:**", set as the lead

   Text is never rendered as HTML. A `needle` marks the words searched for. */

type Inline = string

type Block =
  | { kind: 'heading'; level: number; text: Inline }
  | { kind: 'paragraph'; text: Inline }
  | { kind: 'quote'; lines: Inline[] }
  | { kind: 'facts'; pairs: { label: string; value: string }[] }
  | { kind: 'table'; header: Inline[]; rows: Inline[][] }
  | { kind: 'list'; ordered: boolean; items: { number?: number; text: Inline; children: Block[] }[] }

const BULLET = /^(\s*)[-*]\s+(.*)$/
const ORDERED = /^(\s*)(\d+)[.)]\s+(.*)$/

export function parseGuide(text: string): Block[] {
  const lines = text.replace(/\r/g, '').split('\n')
  return parse(lines)
}

function parse(lines: string[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || /^\s*(---|\*\*\*|___)\s*$/.test(line)) { i += 1; continue }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) { blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() }); i += 1; continue }
    const facts = /^`([^`]+)`\s*$/.exec(line)
    if (facts && /:/.test(facts[1])) {
      blocks.push({ kind: 'facts', pairs: facts[1].split(/\s+·\s+/).map((pair) => {
        const at = pair.indexOf(':')
        return at > 0 ? { label: pair.slice(0, at).trim(), value: pair.slice(at + 1).trim() } : { label: '', value: pair.trim() }
      }) })
      i += 1
      continue
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i += 1
      }
      blocks.push({ kind: 'table', header: rows[0] ?? [], rows: rows.slice(1) })
      continue
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1 }
      blocks.push({ kind: 'quote', lines: quote })
      continue
    }
    const first = BULLET.exec(line) ?? ORDERED.exec(line)
    if (first && first[1].length === 0) {
      const ordered = ORDERED.test(line)
      const items: { number?: number; text: string; children: Block[] }[] = []
      while (i < lines.length) {
        const current = lines[i]
        const item = ordered ? ORDERED.exec(current) : BULLET.exec(current)
        if (item && item[1].length === 0) {
          items.push(ordered ? { number: Number(item[2]), text: item[3], children: [] } : { text: item[2], children: [] })
          i += 1
          continue
        }
        // What belongs to the last item: indented lines, through blank lines
        // that are followed by more indentation.
        if (items.length && (/^\s{2,}\S/.test(current) || (!current.trim() && /^\s{2,}\S/.test(lines[i + 1] ?? '')))) {
          const touching = current.trim() !== '' && !BULLET.test(current) && !ORDERED.test(current)
          const inner: string[] = []
          while (i < lines.length && (/^\s{2,}\S/.test(lines[i]) || (!lines[i].trim() && /^\s{2,}\S/.test(lines[i + 1] ?? '')))) {
            inner.push(lines[i].replace(/^\s{2,4}/, ''))
            i += 1
          }
          const last = items[items.length - 1]
          const nested = parse(inner)
          // A wrapped line right under the item, with no gap, continues its sentence.
          if (touching && nested[0]?.kind === 'paragraph') last.text += ' ' + (nested.shift() as { text: string }).text
          last.children.push(...nested)
          continue
        }
        // A blank line between two items of the same list does not end it.
        if (!current.trim() && (ordered ? ORDERED : BULLET).test(lines[i + 1] ?? '') && /^\S/.test(lines[i + 1] ?? '')) { i += 1; continue }
        break
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>\s?|\s*\||`[^`]+`\s*$)/.test(lines[i]) && !(para.length && (BULLET.test(lines[i]) || ORDERED.test(lines[i])))) {
      para.push(lines[i].trim())
      i += 1
    }
    if (para.length) blocks.push({ kind: 'paragraph', text: para.join(' ') })
    else i += 1
  }
  return blocks
}

/* ---------------------------------------------------------------- inline */

function linkTarget(href: string): { internal: string } | { external: string } | null {
  const md = /^(?:\.\/)?([a-z0-9-]+)\.md(?:#[\w-]*)?$/i.exec(href)
  if (md) return { internal: `/rules/${md[1]}` }
  if (/^https?:\/\//.test(href)) return { external: href }
  return null
}

export function inline(text: string, needle = ''): ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g)
  return parts.map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link) {
      const target = linkTarget(link[2])
      if (target && 'internal' in target) return <Link key={index} to={target.internal} style={linkStyle}>{inline(link[1], needle)}</Link>
      if (target) return <a key={index} href={target.external} target="_blank" rel="noreferrer" style={linkStyle}>{inline(link[1], needle)}</a>
      return <span key={index}>{inline(link[1], needle)}</span>
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index} style={{ color: 'var(--text-heading)' }}>{inline(part.slice(2, -2), needle)}</strong>
    if (/^`[^`]+`$/.test(part)) return <code key={index} style={code}>{part.slice(1, -1)}</code>
    if (/^\*[^*]+\*$/.test(part) || /^_[^_]+_$/.test(part)) return <em key={index}>{inline(part.slice(1, -1), needle)}</em>
    return <Fragment key={index}>{mark(part, needle)}</Fragment>
  })
}

function mark(text: string, needle: string): ReactNode {
  const words = needle.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
  if (!words.length) return text
  return text.split(/([A-Za-z0-9]+)/).map((piece, index) => {
    const lower = piece.toLowerCase()
    return /^[A-Za-z0-9]+$/.test(piece) && words.some((w) => lower.startsWith(w)) ? <MatchMark key={index}>{piece}</MatchMark> : piece
  })
}

/* ---------------------------------------------------------------- blocks */

export function GuideMarkdown({ text, needle = '' }: { text: string; needle?: string }) {
  const blocks = useMemo(() => parseGuide(text), [text])
  // "## At MBC" and everything under it, to the next heading of its level, is one panel.
  const runs: { atMbc: boolean; blocks: Block[] }[] = []
  for (const block of blocks) {
    if (block.kind === 'heading' && block.level <= 2) runs.push({ atMbc: /^At MBC\b/i.test(block.text), blocks: [block] })
    else if (runs.length) runs[runs.length - 1].blocks.push(block)
    else runs.push({ atMbc: false, blocks: [block] })
  }
  // The source line closes the article, not the note it happens to follow.
  const last = runs[runs.length - 1]
  const tail = last?.blocks[last.blocks.length - 1]
  if (last?.atMbc && tail?.kind === 'paragraph' && /^\*Source:/.test(tail.text)) runs.push({ atMbc: false, blocks: [last.blocks.pop() as Block] })
  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {runs.map((run, r) =>
        run.atMbc ? (
          <section key={r} aria-label="At MBC" style={atMbc}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, font: '700 13px/1.2 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-heading)' }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--mbc-sage, var(--text-eyebrow))' }} />
              At MBC · the bylaws and policies come first
            </span>
            <BlockList blocks={run.blocks.slice(1)} needle={needle} />
          </section>
        ) : (
          <BlockList key={r} blocks={run.blocks} needle={needle} />
        ),
      )}
    </div>
  )
}

function BlockList({ blocks, needle }: { blocks: Block[]; needle: string }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {blocks.map((block, index) => <BlockView key={index} block={block} needle={needle} first={index === 0} />)}
    </div>
  )
}

function BlockView({ block, needle, first }: { block: Block; needle: string; first: boolean }) {
  switch (block.kind) {
    case 'heading': {
      const style = block.level <= 2 ? h3 : h4
      return <p style={{ ...style, margin: first ? 0 : '8px 0 0' }}>{inline(block.text, needle)}</p>
    }
    case 'facts':
      return (
        <ul aria-label="The motion’s rules" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {block.pairs.map((pair, i) => (
            <li key={i} style={{ display: 'inline-grid', gap: 2, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-control)', background: 'var(--surface-panel)', minWidth: 0, maxWidth: '100%' }}>
              {pair.label ? <span style={{ font: '700 12.5px/1.2 var(--mbc-font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }}>{pair.label}</span> : null}
              <span style={{ font: '600 16px/1.35 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{pair.value}</span>
            </li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div style={{ overflowX: 'auto', maxWidth: '100%', border: '1px solid var(--border-hairline)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '400 16px/1.45 var(--mbc-font-sans)', color: 'var(--text-body)' }}>
            <thead>
              <tr>{block.header.map((cell, i) => <th key={i} scope="col" style={th}>{inline(cell, needle)}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                  {row.map((cell, c) => <td key={c} style={{ ...td, color: c === 0 ? 'var(--text-heading)' : undefined, minWidth: c === 0 ? 180 : undefined }}>{inline(cell, needle)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'quote':
      return (
        <blockquote style={{ margin: 0, padding: '4px 0 4px 16px', borderLeft: '3px solid var(--border-control)', ...body, color: 'var(--text-heading)' }}>
          {block.lines.map((line, i) => <span key={i} style={{ display: 'block' }}>{inline(line, needle)}</span>)}
        </blockquote>
      )
    case 'list': {
      const items = block.items.map((item, i) => (
        <li key={i} value={item.number} style={{ paddingLeft: 2 }}>
          {inline(item.text, needle)}
          {item.children.length ? <div style={{ marginTop: 8 }}><BlockList blocks={item.children} needle={needle} /></div> : null}
        </li>
      ))
      return block.ordered
        ? <ol style={{ margin: 0, paddingLeft: 26, display: 'grid', gap: 10, ...body }}>{items}</ol>
        : <ul style={{ margin: 0, paddingLeft: 24, display: 'grid', gap: 10, ...body }}>{items}</ul>
    }
    case 'paragraph': {
      const lead = /^\*\*Short answer:\*\*\s*/.exec(block.text)
      if (lead) {
        return (
          <p style={{ margin: 0, font: '400 19px/1.65 var(--mbc-font-sans)', color: 'var(--text-heading)', maxWidth: '68ch', textWrap: 'pretty' } as CSSProperties}>
            <strong>Short answer: </strong>{inline(block.text.slice(lead[0].length), needle)}
          </p>
        )
      }
      if (/^\*Source:/.test(block.text)) return <p style={{ ...meta, margin: 0 }}>{inline(block.text, needle)}</p>
      return <p style={{ ...body, margin: 0, textWrap: 'pretty' } as CSSProperties}>{inline(block.text, needle)}</p>
    }
  }
}

const body: CSSProperties = { font: '400 17px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '72ch' }
const meta: CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const h3: CSSProperties = { font: '600 22px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }
const h4: CSSProperties = { font: '700 13px/1.3 var(--mbc-font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-eyebrow)', margin: 0 }
const linkStyle: CSSProperties = { color: 'var(--text-link)', textDecoration: 'underline', textUnderlineOffset: 3 }
const code: CSSProperties = { font: '400 15px/1.4 var(--mbc-font-sans)', background: 'var(--surface-panel)', borderRadius: 6, padding: '1px 6px' }
const th: CSSProperties = { textAlign: 'left', font: '700 12.5px/1.3 var(--mbc-font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-eyebrow)', padding: '12px 12px 10px', verticalAlign: 'bottom' }
const td: CSSProperties = { padding: '10px 12px', verticalAlign: 'top' }
const atMbc: CSSProperties = { display: 'grid', gap: 14, padding: '20px 22px', borderRadius: 14, background: 'var(--surface-panel)', border: '1px solid var(--border-control)', borderLeft: '5px solid var(--text-eyebrow)' }
