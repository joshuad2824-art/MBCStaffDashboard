import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import type { DashboardData, Id, Resource, ResourceCategory } from '../data/types'
import { nextId, personName } from '../lib/derive'
import { cleanLink } from '../lib/needs'
import { SURFACES } from './surfaces'
import { useCanOpen } from './useSurfaces'

/* Resources (home brief §7): the links staff actually reach for, in one list
   the staff keep. Pinned ones first, then by category.

   The manual and Robert's Rules are this app's own pages. They left the menu
   on 10 November 2026 (§1.2) to live here, so the page draws them as built-in
   entries — reached from here, and impossible to remove by accident. They are
   drawn only when the person can open them, through the same canOpen() the
   router asks.

   Anyone on staff adds a link; the person who added it, or any staff-role
   account, edits, pins or removes it — the same rule News keeps. */

export const CATEGORIES: { slug: ResourceCategory; name: string }[] = [
  { slug: 'ministry-tools', name: 'Ministry tools' },
  { slug: 'office-admin', name: 'Office & admin' },
  { slug: 'brand-design', name: 'Brand & design' },
  { slug: 'reference', name: 'Reference' },
  { slug: 'training', name: 'Training' },
]

/** The app's own pages that live here rather than in the menu. */
const BUILT_IN: { key: string; name: string; description: string }[] = [
  { key: 'reference', name: 'The manual', description: 'The church’s bylaws, policies and procedures, searchable' },
  { key: 'robertsRules', name: 'Robert’s Rules of Order', description: 'Parliamentary procedure in plain words, with the 1915 text behind it' },
]

/** A link inside the app, or out to the web. */
const isInternal = (url: string) => /^\/[A-Za-z0-9]/.test(url)

export function Resources() {
  const data = useData()
  const { mutate } = useStore()
  const { member, viewAs } = useSession()
  const canOpen = useCanOpen()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  if (!member) return null

  const me = member.id
  const staffRole = viewAs === 'staff'
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const hit = (text: string) => words.every((w) => text.toLowerCase().includes(w))
  const live = data.resources.filter((r) => r.active && hit(`${r.name} ${r.description}`)).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  const pinned = live.filter((r) => r.pinned)
  const builtIns = BUILT_IN.filter((b) => canOpen(b.key) && hit(`${b.name} ${b.description}`))

  const add = (draft: Draft) => {
    mutate(`Added ${draft.name} to Resources.`, (s) => ({
      ...s,
      resources: [...s.resources, { ...draft, id: nextId(s.resources), addedBy: me, pinned: false, active: true, position: (Math.max(0, ...s.resources.map((r) => r.position)) || 0) + 10 }],
    }))
    setAdding(false)
  }

  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 980 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a resource" aria-label="Find a resource" style={{ ...field, flex: '1 1 260px', maxWidth: 440 }} />
        {!adding ? <Button variant="dark" onClick={() => setAdding(true)}>Add a link</Button> : null}
      </div>

      {adding ? (
        <Card radius="panel" pad="20px 22px" style={{ border: '1px solid var(--border-card)' }}>
          <ResourceForm submit="Add" onSubmit={add} onCancel={() => setAdding(false)} />
        </Card>
      ) : null}

      {pinned.length ? (
        <Group title="Pinned">
          {pinned.map((r) => (
            <Row key={r.id} resource={r} data={data} me={me} staffRole={staffRole} showCategory />
          ))}
        </Group>
      ) : null}

      {CATEGORIES.map((c) => {
        const rows = live.filter((r) => r.category === c.slug && !r.pinned)
        const built = c.slug === 'reference' ? builtIns : []
        if (!rows.length && !built.length) return null
        return (
          <Group key={c.slug} title={c.name}>
            {built.map((b) => (
              <li key={b.key} style={rowStyle}>
                <span style={{ display: 'grid', gap: 2, minWidth: 0, flex: '1 1 280px' }}>
                  <Link to={SURFACES[b.key].path} style={nameStyle}>{b.name}</Link>
                  <span style={desc}>{b.description}</span>
                </span>
                <span style={{ font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-category)' }}>Built in</span>
              </li>
            ))}
            {rows.map((r) => (
              <Row key={r.id} resource={r} data={data} me={me} staffRole={staffRole} />
            ))}
          </Group>
        )
      })}

      {!live.length && !builtIns.length ? <p style={desc}>{words.length ? 'Nothing matches that.' : 'No resources yet. Add the links staff reach for.'}</p> : null}
    </div>
  )
}

/* ---------------------------------------------------------------- a row */

function Row({ resource, data, me, staffRole, showCategory = false }: { resource: Resource; data: DashboardData; me: Id; staffRole: boolean; showCategory?: boolean }) {
  const { mutate } = useStore()
  const [editing, setEditing] = useState(false)
  const canEdit = resource.addedBy === me || staffRole

  if (editing) {
    return (
      <li style={{ ...rowStyle, display: 'block' }}>
        <ResourceForm
          initial={resource}
          submit="Save"
          onCancel={() => setEditing(false)}
          onSubmit={(draft) => {
            mutate(`Updated ${draft.name}.`, (s) => ({ ...s, resources: s.resources.map((r) => (r.id === resource.id ? { ...r, ...draft } : r)) }))
            setEditing(false)
          }}
        />
      </li>
    )
  }

  const internal = isInternal(resource.url)
  return (
    <li style={rowStyle}>
      <span style={{ display: 'grid', gap: 2, minWidth: 0, flex: '1 1 280px' }}>
        {internal ? (
          <Link to={resource.url} style={nameStyle}>{resource.name}</Link>
        ) : (
          <a href={resource.url} target="_blank" rel="noopener noreferrer" style={nameStyle}>
            {resource.name}
            <span aria-hidden="true" style={{ font: '400 15px var(--mbc-font-sans)', color: 'var(--text-meta)' }}> ↗</span>
          </a>
        )}
        {resource.description ? <span style={desc}>{resource.description}</span> : null}
        <span style={{ font: '400 13px/1.4 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
          {showCategory ? `${CATEGORIES.find((c) => c.slug === resource.category)?.name} · ` : ''}
          Added by {resource.addedBy === me ? 'you' : personName(data.people, resource.addedBy)}
        </span>
      </span>
      {canEdit ? (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px' }}>
          <TextButton onClick={() => mutate(resource.pinned ? `Unpinned ${resource.name}.` : `Pinned ${resource.name}.`, (s) => ({ ...s, resources: s.resources.map((r) => (r.id === resource.id ? { ...r, pinned: !r.pinned } : r)) }))}>
            {resource.pinned ? 'Unpin' : 'Pin'}
          </TextButton>
          <TextButton onClick={() => setEditing(true)}>Edit</TextButton>
          <TextButton
            onClick={() => {
              if (window.confirm(`Remove ${resource.name} from Resources?`)) mutate(`Removed ${resource.name} from Resources.`, (s) => ({ ...s, resources: s.resources.filter((r) => r.id !== resource.id) }))
            }}
          >
            Remove
          </TextButton>
        </span>
      ) : null}
    </li>
  )
}

/* ---------------------------------------------------------------- the form */

type Draft = Pick<Resource, 'name' | 'url' | 'description' | 'category'>

/** A path inside the app stays a path; anything else is made a web address. */
function cleanResourceUrl(value: string): string {
  const trimmed = value.trim()
  if (isInternal(trimmed)) return trimmed
  // "//host" is an address that leaves the site, not a path: refused, as the
  // database refuses it, rather than quietly made into https://host.
  if (trimmed.startsWith('//')) return ''
  return cleanLink(trimmed)
}

function ResourceForm({ initial, submit, onSubmit, onCancel }: { initial?: Resource; submit: string; onSubmit(draft: Draft): void; onCancel(): void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState<ResourceCategory>(initial?.category ?? 'ministry-tools')
  const link = cleanResourceUrl(url)
  const ready = name.trim() && link

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) onSubmit({ name: name.trim(), url: link, description: description.trim(), category })
      }}
      style={{ display: 'grid', gap: 12 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Field label="Name">
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Breeze" autoFocus style={field} />
        </Field>
        <Field label="Link">
          <input value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" placeholder="https://… or a page in this app, like /reference" style={field} aria-invalid={Boolean(url.trim()) && !link} />
        </Field>
        <Field label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value as ResourceCategory)} style={field}>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="One line · optional">
        <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder="Members, giving and check-in" style={field} />
      </Field>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Button type="submit" variant="dark" disabled={!ready}>{submit}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Never mind</Button>
        {url.trim() && !link ? <span style={desc}>A link has to be a web address, or a page in this app starting with “/”.</span> : null}
      </div>
    </form>
  )
}

/* ---------------------------------------------------------------- bits */

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} style={{ display: 'grid', gap: 6 }}>
      <h2 style={{ margin: 0, font: '700 12px/1.3 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-category)' }}>{title}</h2>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--mbc-radius-panel)', paddingInline: 22 }}>{children}</ul>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ font: '700 12px/1.2 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-category)' }}>{label}</span>
      {children}
    </label>
  )
}

function TextButton({ onClick, children }: { onClick(): void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', padding: '8px 0', minHeight: 40, font: '700 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer' }}>
      {children}
    </button>
  )
}

const rowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 18px', padding: '16px 0', borderTop: '1px solid var(--border-hairline)' }
const nameStyle: CSSProperties = { font: '600 21px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', textDecoration: 'none' }
const desc: CSSProperties = { font: '400 17px/1.45 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const field: CSSProperties = {
  minHeight: 48,
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-input)',
  borderRadius: 10,
  padding: '0 14px',
  font: '400 17px/1.3 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
}
