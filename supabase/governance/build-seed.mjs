#!/usr/bin/env node
/* Turns the transcribed governance corpus into SQL for governance_document,
   governance_section and governance_finding (migrations 0009, 0013, 0016).

     node supabase/governance/build-seed.mjs <corpus dir> > supabase/governance/seed.sql
     psql "$DATABASE_URL" -f supabase/governance/seed.sql     # or paste into the SQL editor

   The corpus directory is the transcription the brief cites — the 2-11-2025
   Bylaws, Policies & Procedures Manual as one Markdown file per document,
   each with YAML front matter (id, type, title, sensitivity, …), and
   DISCREPANCY-DOCKET.md at the top. Nothing here is edited through the API;
   re-run the loader when the transcription changes and the upserts replace
   what is there by slug and by finding number.

   What is left out, on purpose:
     - any file whose front matter says `sensitivity: restricted` — the salary
       plan, the individual performance standards, and policy E006. CLAUDE.md:
       staff compensation and anything under E006 never enter the system, in
       any form, behind any gate. The loader refuses them; it does not merely
       skip them quietly — it names each one on stderr.
     - any file with no `sensitivity` key at all. A corpus where the absence
       of a key is meaningful has a quiet failure mode in it, so an unmarked
       file is a build error, named on stderr, and the run stops without
       writing a line of SQL (CORPUS-PREP.md §2). Mark it `sensitivity:
       normal` to load it.
     - the folder's own build artefacts: any file whose front matter says
       `generated: true` (the folder index, which links to every file including
       the restricted ones) or `type: verification-report`. They describe the
       transcription; they are not part of the manual.
     - `_build/`, `source/`, and anything that is not Markdown.

   How a file is read:
     - the slug is the relative path, lower-cased, non-alphanumerics to hyphens
     - the title is the front matter's `title`, else the first `# ` heading
     - the kind comes from the front matter's `type` (constitution,
       bylaw-article → bylaws, policy → policy, everything derived → reference)
       and, for files without a type, from the folder (forms and the
       deacon-in-training program → procedure)
     - the code is the policy number (`id: A009`), "Art. II" for a bylaw
       article, "Constitution" for the constitution, else empty
     - documents sort by folder and file name, which is the manual's own order
     - an `audience:` key in the front matter is ignored: since migration 0015
       the manual is open to everyone who signs in, on either side, and a
       document carries no audience (Joshua's decision, 15 September 2026).
       The loader says once on stderr if it saw any, so a corpus still
       carrying the key is not mistaken for one that is read.
   Sections (0016, CORPUS-PREP.md §3): each document is split at its headings
   into one row per heading — the deepest heading and the text under it, up
   to the next heading of any level — carrying the headings above it, a
   citation, a stable anchor and the markdown verbatim, the heading line
   included. Concatenated in order the sections reconstruct the document's
   body exactly, and the loader asserts that and stops when it does not hold.
     - the citation reuses CITE and normaliseCite below, so there is one
       dialect: a bylaw article is `Art.` + the front matter's `article:` (or
       the ARTICLE heading) + the lettered heading + `§n` from a SECTION
       heading; a policy is its `id:` + `§n` where its headings are numbered;
       everything else — forms, the appendix, the quick reference — carries no
       citation and is found by text alone. Paragraph numbers stay in the body.
     - the anchor is the slug of the citation where there is one (`art-ii-b-3`,
       `a009-4`), else of the heading path; derived from the text, never from a
       position, so a re-load keeps every URL. Duplicates within a document are
       numbered in order.
     - sections are deleted and reinserted per document inside the transaction,
       so a re-load leaves no orphans.
   The docket is split on its numbered `### N. Title` headings; the text below
   each, up to the next heading of any kind, is the finding's body (so the
   docket's closing sections are not glued onto the last finding), and every
   "Art. …" / "Article …" or lettered-code citation in the body is collected
   into `cites`, normalised to the form the reference screen links on. */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, relative, sep } from 'node:path'

const root = process.argv[2]
if (!root) {
  console.error('usage: build-seed.mjs <corpus dir>')
  process.exit(2)
}

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (['_build', 'source', 'node_modules'].includes(name)) continue
      walk(path)
    } else if (['.md', '.markdown'].includes(extname(name).toLowerCase())) files.push(path)
  }
}
walk(root)

const q = (value) => "'" + String(value).replace(/'/g, "''") + "'"
const arr = (values) => 'array[' + (values.length ? values.map(q).join(', ') : '') + ']::text[]'

/** Front matter: the block between the first two `---` lines, as key: value. */
function frontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return { fields: {}, body: text }
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (kv) fields[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1').trim()
  }
  return { fields, body: text.slice(match[0].length) }
}

const CITE =
  /\b(?:(?:Art\.|Article|ARTICLE)\s*([IVX]+)(\.[A-Z]\b)?(?:,?\s*(?:§|Section|SECTION)\s*(\d+))?(?:,?\s*(?:¶|paragraph)\s*(\d+))?|([A-Z]\d{3})(?:\s*§\s*(\d+))?)/g

/** "Article II.B, Section 3, paragraph 10" → "Art. II.B §3 ¶10"; "A009 § 4" → "A009 §4". */
function normaliseCite(match) {
  const [, article, letter, section, paragraph, policy, policySection] = match
  if (policy) return policy + (policySection ? ' §' + policySection : '')
  return 'Art. ' + article + (letter ?? '') + (section ? ' §' + section : '') + (paragraph ? ' ¶' + paragraph : '')
}

const documents = []
const findings = []
const refused = []
const skipped = []
const audienced = []
const unmarked = []

for (const path of files) {
  const rel = relative(root, path).split(sep).join('/')
  const text = readFileSync(path, 'utf8')
  const { fields, body } = frontMatter(text)
  const name = basename(path, extname(path))

  if ((fields.sensitivity ?? '').toLowerCase() === 'restricted') {
    refused.push(rel)
    continue
  }
  if (fields.sensitivity === undefined) {
    unmarked.push(rel)
    continue
  }
  if ((fields.generated ?? '').toLowerCase() === 'true' || (fields.type ?? '').toLowerCase() === 'verification-report') {
    skipped.push(rel)
    continue
  }

  if (fields.type === 'discrepancy-docket' || /discrepancy[-_ ]?docket/i.test(name)) {
    const FINDING = /^#{2,3}\s*(?:finding\s*)?(\d+)[.:)\s-]+(.*)$/i
    const parts = body.split(/^(#{1,3}\s.*)$/m)
    for (let i = 1; i < parts.length; i += 2) {
      const heading = FINDING.exec(parts[i])
      if (!heading) continue
      const number = Number(heading[1])
      const title = heading[2].trim() || 'Finding ' + number
      const findingBody = (parts[i + 1] ?? '').trim().replace(/(?:\s*^(?:---|\*\*\*)\s*$)+$/m, '').trim()
      const cites = [...new Set([...findingBody.matchAll(CITE)].map(normaliseCite))]
      const resolved = /^\s*(?:\*\*)?status(?:\*\*)?\s*[:—-]\s*(?:\*\*)?resolved/im.test(findingBody)
      findings.push({ number, title, body: findingBody, cites, status: resolved ? 'resolved' : 'open' })
    }
    continue
  }

  const type = (fields.type ?? '').toLowerCase()
  const folder = rel.split('/')[0]
  let kind
  if (type === 'constitution') kind = 'constitution'
  else if (type === 'bylaw-article') kind = 'bylaws'
  else if (type === 'policy') kind = 'policy'
  else if (/forms|deacon-in-training|procedure|form/.test(type) || /forms|deacon-in-training/.test(rel)) kind = 'procedure'
  else kind = 'reference'

  let code = ''
  if (kind === 'policy') code = (fields.id ?? '').trim() || (/^([A-Z]\d{3})\b/.exec(name)?.[1] ?? '')
  else if (kind === 'bylaws') code = fields.article ? 'Art. ' + fields.article.trim() : (/^art-\d+/.test(name) ? '' : '')
  else if (kind === 'constitution') code = 'Constitution'
  else if (kind === 'procedure' && /forms\//.test(rel)) code = 'Form'
  else if (kind === 'procedure') code = 'DIT'

  const titleMatch = /^#\s+(.+)$/m.exec(body)
  const title = (fields.title || (titleMatch ? titleMatch[1] : name)).trim()
  const slug = rel.replace(/\.(md|markdown)$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (fields.audience !== undefined) audienced.push(rel)
  const article = (fields.article ?? '').trim()
  const docBody = body.trim()
  const sections = splitSections(docBody, { kind, code, article })
  if (sections.map((s) => s.body).join('') !== docBody) {
    console.error(`${rel}: the sections do not reconstruct the document; nothing written`)
    process.exit(1)
  }
  documents.push({ slug, kind, code, title, body: docBody, rel, folder, sections })
}

/* One section per heading; bodies are exact slices, so joined in order they
   are the document again. Text before the first heading is its own section
   when it says something, else its whitespace is folded into the first. */
function splitSections(body, doc) {
  const lines = body.split(/(?<=\n)/)
  const raw = []
  const stack = []
  let current = { path: [], lines: [] }
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
  const sections = []
  let carry = ''
  for (const s of raw) {
    const text = carry + s.lines.join('')
    carry = ''
    if (s.path.length === 0 && !text.trim() && raw.length > 1) { carry = text; continue }
    if (s.path.length === 0 && !text) continue
    sections.push({ path: s.path, body: text })
  }
  if (carry && sections.length) sections[sections.length - 1].body += carry
  const seen = new Map()
  return sections.map((s, index) => {
    const citation = citationFor(doc, s.path)
    let anchor = slugify(citation) || slugify(s.path.join(' ')) || 'top'
    const n = (seen.get(anchor) ?? 0) + 1
    seen.set(anchor, n)
    if (n > 1) anchor += '-' + n
    return { path: s.path, citation, anchor, body: s.body, position: index + 1 }
  })
}

// A function declaration, not a const: the file's main loop runs above these
// definitions and reaches them before a const would be initialised.
function slugify(text) {
  return text.toLowerCase().replace(/§/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** The citation of a section, in the docket's dialect, or '' where nobody cites it. */
function citationFor(doc, path) {
  let candidate = ''
  if (doc.kind === 'bylaws') {
    const roman = doc.article || path.map((t) => /ARTICLE\s+([IVX]+)/i.exec(t)?.[1]).find(Boolean)
    if (!roman) return ''
    const letter = path.map((t) => /^([A-Z])\.\s/.exec(t)?.[1]).find(Boolean)
    const section = path.map((t) => /^(?:SECTION|Section|§)\s*(\d+)/.exec(t)?.[1]).find(Boolean)
    candidate = `Art. ${roman}${letter ? '.' + letter : ''}${section ? ' §' + section : ''}`
  } else if (doc.kind === 'policy' && doc.code) {
    const number = [...path].reverse().map((t) => /^(?:§\s*|Section\s+|SECTION\s+)?(\d{1,2})[.):]?(?:\s|$)/.exec(t)?.[1]).find(Boolean)
    candidate = doc.code + (number ? ' §' + number : '')
  } else return ''
  const match = new RegExp(CITE.source).exec(candidate)
  return match && match[0] === candidate ? normaliseCite(match) : ''
}

// The manual's own order: folder, then file name; the top-level derived files last.
documents.sort((a, b) => {
  const af = a.rel.includes('/') ? a.folder : '99'
  const bf = b.rel.includes('/') ? b.folder : '99'
  return af.localeCompare(bf) || a.rel.localeCompare(b.rel)
})

const out = []
out.push('-- Generated by supabase/governance/build-seed.mjs. Re-run it; do not edit.')
out.push('begin;')
documents.forEach((d, index) => {
  out.push(
    `insert into governance_document (slug, kind, code, title, body, position) values (${q(d.slug)}, ${q(d.kind)}, ${q(d.code)}, ${q(d.title)}, ${q(d.body)}, ${(index + 1) * 10})` +
      ` on conflict (slug) do update set kind = excluded.kind, code = excluded.code, title = excluded.title, body = excluded.body, position = excluded.position, updated_at = now();`,
  )
  const owner = `(select id from governance_document where slug = ${q(d.slug)})`
  out.push(`delete from governance_section where document_id = ${owner};`)
  if (d.sections.length) {
    out.push(
      `insert into governance_section (document_id, heading_path, anchor, citation, body, position) values\n  ` +
        d.sections.map((s) => `(${owner}, ${arr(s.path)}, ${q(s.anchor)}, ${q(s.citation)}, ${q(s.body)}, ${s.position})`).join(',\n  ') +
        ';',
    )
  }
})
findings.sort((a, b) => a.number - b.number).forEach((f) => {
  out.push(
    `insert into governance_finding (number, title, body, cites, status) values (${f.number}, ${q(f.title)}, ${q(f.body)}, ${arr(f.cites)}, ${q(f.status)})` +
      ` on conflict (number) do update set title = excluded.title, body = excluded.body, cites = excluded.cites, status = excluded.status;`,
  )
})
if (unmarked.length) {
  console.error('refused (no sensitivity key — mark each `sensitivity: normal` or `restricted`; nothing written):\n  ' + unmarked.join('\n  '))
  process.exit(1)
}
out.push('commit;')
process.stdout.write(out.join('\n') + '\n')
const sectionCount = documents.reduce((total, d) => total + d.sections.length, 0)
console.error(`${documents.length} documents, ${sectionCount} sections, ${findings.length} findings`)
if (audienced.length) console.error(`ignored an audience key on ${audienced.length} file(s): the manual is open to everyone who signs in (migration 0015)`)
if (refused.length) console.error('refused (sensitivity: restricted):\n  ' + refused.join('\n  '))
if (skipped.length) console.error('skipped (build artefacts, not part of the manual):\n  ' + skipped.join('\n  '))
