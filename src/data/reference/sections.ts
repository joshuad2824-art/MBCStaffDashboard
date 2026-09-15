import type { GovernanceDocument, GovernanceSection } from './types'

/* The stub's copy of the loader's splitter (supabase/governance/build-seed.mjs,
   "Sections"), so a checkout without Supabase searches over the same shape the
   database holds. One section per heading — the deepest heading and the text
   under it, up to the next heading of any level — carrying the headings above
   it, the citation in the docket's dialect, and a stable anchor. The bodies are
   exact slices: joined in order they are the document again. The loader is the
   one that decides what production holds; this must only agree with it. */

const CITE =
  /\b(?:(?:Art\.|Article|ARTICLE)\s*([IVX]+)(\.[A-Z]\b)?(?:,?\s*(?:§|Section|SECTION)\s*(\d+))?(?:,?\s*(?:¶|paragraph)\s*(\d+))?|([A-Z]\d{3})(?:\s*§\s*(\d+))?)/

function normaliseCite(match: RegExpExecArray): string {
  const [, article, letter, section, paragraph, policy, policySection] = match
  if (policy) return policy + (policySection ? ' §' + policySection : '')
  return 'Art. ' + article + (letter ?? '') + (section ? ' §' + section : '') + (paragraph ? ' ¶' + paragraph : '')
}

const slugify = (text: string) => text.toLowerCase().replace(/§/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function citationFor(doc: GovernanceDocument, path: string[]): string {
  let candidate = ''
  if (doc.kind === 'bylaws') {
    const roman = /^Art\.\s+([IVX]+)/.exec(doc.code)?.[1] ?? path.map((t) => /ARTICLE\s+([IVX]+)/i.exec(t)?.[1]).find(Boolean)
    if (!roman) return ''
    const letter = path.map((t) => /^([A-Z])\.\s/.exec(t)?.[1]).find(Boolean)
    const section = path.map((t) => /^(?:SECTION|Section|§)\s*(\d+)/.exec(t)?.[1]).find(Boolean)
    candidate = `Art. ${roman}${letter ? '.' + letter : ''}${section ? ' §' + section : ''}`
  } else if (doc.kind === 'policy' && doc.code) {
    const number = [...path].reverse().map((t) => /^(?:§\s*|Section\s+|SECTION\s+)?(\d{1,2})[.):]?(?:\s|$)/.exec(t)?.[1]).find(Boolean)
    candidate = doc.code + (number ? ' §' + number : '')
  } else return ''
  const match = CITE.exec(candidate)
  return match && match[0] === candidate ? normaliseCite(match) : ''
}

export function splitSections(doc: GovernanceDocument): GovernanceSection[] {
  const lines = doc.body.split(/(?<=\n)/)
  const raw: { path: string[]; lines: string[] }[] = []
  const stack: { level: number; text: string }[] = []
  let current: { path: string[]; lines: string[] } = { path: [], lines: [] }
  for (const line of lines) {
    const heading = /^(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/.exec(line.replace(/\r?\n$/, ''))
    if (heading) {
      raw.push(current)
      const level = heading[1].length
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
      stack.push({ level, text: heading[2].trim() })
      current = { path: stack.map((s) => s.text), lines: [line] }
    } else current.lines.push(line)
  }
  raw.push(current)
  const sections: { path: string[]; body: string }[] = []
  let carry = ''
  for (const s of raw) {
    const text = carry + s.lines.join('')
    carry = ''
    if (s.path.length === 0 && !text.trim() && raw.length > 1) {
      carry = text
      continue
    }
    if (s.path.length === 0 && !text) continue
    sections.push({ path: s.path, body: text })
  }
  if (carry && sections.length) sections[sections.length - 1].body += carry
  const seen = new Map<string, number>()
  return sections.map((s, index) => {
    const citation = citationFor(doc, s.path)
    let anchor = slugify(citation) || slugify(s.path.join(' ')) || 'top'
    const n = (seen.get(anchor) ?? 0) + 1
    seen.set(anchor, n)
    if (n > 1) anchor += '-' + n
    return { id: `${doc.id}:${anchor}`, documentId: doc.id, headingPath: s.path, anchor, citation, body: s.body, position: index + 1 }
  })
}
