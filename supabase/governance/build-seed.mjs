#!/usr/bin/env node
/* Turns the transcribed governance corpus into SQL for governance_document and
   governance_finding (migrations 0009 and 0013).

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
   The docket is split on its numbered `### N. Title` headings; the text below
   each is the finding's body, and every "Art. …" or lettered-code citation in
   the body is collected into `cites`. */

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

const CITE = /\b(?:Art\.\s*[IVX]+(?:\.[A-Z])?(?:\s*§\s*\d+)?(?:\s*¶\s*\d+)?|[A-Z]\d{3}(?:\s*§\s*\d+)?)/g

const documents = []
const findings = []
const refused = []

for (const path of files) {
  const rel = relative(root, path).split(sep).join('/')
  const text = readFileSync(path, 'utf8')
  const { fields, body } = frontMatter(text)
  const name = basename(path, extname(path))

  if ((fields.sensitivity ?? '').toLowerCase() === 'restricted') {
    refused.push(rel)
    continue
  }

  if (fields.type === 'discrepancy-docket' || /discrepancy[-_ ]?docket/i.test(name)) {
    const parts = body.split(/^(#{2,3}\s*(?:finding\s*)?\d+[.:)\s-].*)$/im)
    for (let i = 1; i < parts.length; i += 2) {
      const heading = parts[i]
      const findingBody = (parts[i + 1] ?? '').trim()
      const number = Number(/(\d+)/.exec(heading)[1])
      const title = heading.replace(/^#{2,3}\s*(?:finding\s*)?\d+[.:)\s-]*/i, '').trim() || 'Finding ' + number
      const cites = [...new Set((findingBody.match(CITE) ?? []).map((c) => c.replace(/\s+/g, ' ')))]
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
  documents.push({ slug, kind, code, title, body: text.trim(), rel, folder })
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
})
findings.sort((a, b) => a.number - b.number).forEach((f) => {
  out.push(
    `insert into governance_finding (number, title, body, cites, status) values (${f.number}, ${q(f.title)}, ${q(f.body)}, ${arr(f.cites)}, ${q(f.status)})` +
      ` on conflict (number) do update set title = excluded.title, body = excluded.body, cites = excluded.cites, status = excluded.status;`,
  )
})
out.push('commit;')
process.stdout.write(out.join('\n') + '\n')
console.error(`${documents.length} documents, ${findings.length} findings`)
if (refused.length) console.error('refused (sensitivity: restricted):\n  ' + refused.join('\n  '))
