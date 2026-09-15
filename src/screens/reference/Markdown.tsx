import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/* A small renderer for a transcription: headings, paragraphs, lists, block
   quotes, bold and italics. The corpus is text people read, not a page
   somebody designed, so this stays plain and lets the type do the work.
   Body type is 17px on this surface — the manual is read, not scanned. */

export function Markdown({ text, needle = '' }: { text: string; needle?: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text])
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const style = block.level <= 1 ? h2 : block.level === 2 ? h3 : h4
          return <p key={index} style={{ ...style, marginTop: index ? 10 : 0 }}>{inline(block.text, needle)}</p>
        }
        if (block.kind === 'quote') return <blockquote key={index} style={{ margin: 0, paddingLeft: 14, borderLeft: '2px solid var(--border-control)', ...meta }}>{inline(block.text, needle)}</blockquote>
        if (block.kind === 'list') {
          return block.ordered ? (
            <ol key={index} style={{ margin: 0, paddingLeft: 26, display: 'grid', gap: 8, ...body }}>{block.items.map((item, i) => <li key={i} value={item.number}>{inline(item.text, needle)}</li>)}</ol>
          ) : (
            <ul key={index} style={{ margin: 0, paddingLeft: 24, display: 'grid', gap: 8, ...body }}>{block.items.map((item, i) => <li key={i}>{inline(item.text, needle)}</li>)}</ul>
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

export function parseBlocks(text: string): Block[] {
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

/** Plain text of a heading line: the markdown emphasis stripped. */
export function plainHeading(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1').trim()
}

function highlight(text: string, needle: string): ReactNode {
  if (!needle) return text
  const parts: ReactNode[] = []
  const lower = text.toLowerCase()
  const n = needle.toLowerCase()
  let from = 0
  let at = lower.indexOf(n)
  while (at !== -1) {
    parts.push(text.slice(from, at))
    parts.push(<MatchMark key={at}>{text.slice(at, at + needle.length)}</MatchMark>)
    from = at + needle.length
    at = lower.indexOf(n, from)
  }
  parts.push(text.slice(from))
  return <>{parts}</>
}

/** The match mark, the one design-system addition on this surface: weight,
    underline and ground together, so it survives greyscale, a projector and a
    colour-blind reader. It marks the query, never the sentence. */
export function MatchMark({ children }: { children: ReactNode }) {
  return (
    <mark style={{ fontWeight: 700, color: 'var(--text-heading)', background: 'var(--mbc-lamplight-tint)', textDecoration: 'underline', textDecorationThickness: 2, textUnderlineOffset: 3, borderRadius: 2 }}>
      {children}
    </mark>
  )
}

/** A search snippet: `<mark>` markers from search_manual() or the stub, rendered as the mark and never as HTML. */
export function Snippet({ text }: { text: string }) {
  const parts = text.split(/(<mark>[\s\S]*?<\/mark>)/g)
  return (
    <>
      {parts.map((part, index) => {
        const marked = /^<mark>([\s\S]*?)<\/mark>$/.exec(part)
        return marked ? <MatchMark key={index}>{marked[1]}</MatchMark> : <span key={index}>{part}</span>
      })}
    </>
  )
}

export const h2: CSSProperties = { font: '600 26px/1.25 var(--mbc-font-serif)', letterSpacing: '-.01em', color: 'var(--text-heading)', margin: 0 }
export const h3: CSSProperties = { font: '600 21px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }
export const h4: CSSProperties = { font: '700 13px/1.3 var(--mbc-font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-eyebrow)', margin: 0 }
export const meta: CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }
export const body: CSSProperties = { font: '400 17px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', maxWidth: '72ch' }
