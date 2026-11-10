import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, Chip } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import type { DashboardData, Person, ServingAssignment, ServingGroup } from '../data/types'
import { nextId, personName } from '../lib/derive'
import { todayIso } from '../lib/date'
import { OFFICES, hasGap, leadershipRoles } from '../lib/serving'

/* Leadership (home brief §6): who serves. One page, two sections — the
   deacons serving this year, officers first with their offices and then the
   rest of the board; and the church's committees, each with its chair,
   members and terms.

   It is the serving directory (0017, 0024) drawn for the Church leadership
   ministry: a board and a committee are groups, an office is a role, a term is
   an assignment's dates. The September turnover is a date entered, never a row
   removed, so Show past terms answers "who chaired Finance last year".

   A directory, not access control. Nothing here reads or writes membership;
   who may read the deacon side's records is decided there, and the two are
   allowed to disagree for a week in September. The whole staff body reads this
   page; the staff role edits it. */

export function Leadership() {
  const data = useData()
  const { mutate } = useStore()
  const { viewAs } = useSession()
  const [showPast, setShowPast] = useState(false)
  const canEdit = viewAs === 'staff'
  const home = data.ministries.find((m) => m.slug === 'leadership')
  const live = data.groups.filter((g) => home && g.ministryId === home.id && g.endedOn === null)
  const boards = live.filter((g) => g.kind === 'board')
  const committees = live.filter((g) => g.kind === 'committee').sort((a, b) => a.name.localeCompare(b.name))
  const endedCommittees = data.groups.filter((g) => home && g.ministryId === home.id && g.kind === 'committee' && g.endedOn !== null)

  const addGroup = (kind: 'board' | 'committee') => {
    if (!home) return
    const name = kind === 'board' ? 'Deacon Board' : window.prompt('The committee’s name', 'Committee')?.trim()
    if (!name) return
    mutate(`Added ${name}.`, (current) => ({
      ...current,
      groups: [...current.groups, { id: nextId(current.groups), ministryId: home.id, kind, name, meets: '', location: '', audienceNote: '', notes: '', startedOn: todayIso(), endedOn: null }],
    }))
  }

  if (!home) {
    return <p style={quiet}>Leadership arrives with its migration (0024). Once it is applied, the board and the committees appear here.</p>
  }

  return (
    <div style={{ display: 'grid', gap: 34, maxWidth: 1040 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ ...quiet, margin: 0 }}>Who serves, in what office, since when. A directory — it decides nobody’s access.</p>
        <Chip active={showPast} onClick={() => setShowPast((v) => !v)} style={{ minHeight: 44 }}>
          {showPast ? 'Hide past terms' : 'Show past terms'}
        </Chip>
      </div>

      <section aria-label="Deacons" style={{ display: 'grid', gap: 14 }}>
        <h2 style={h2}>Deacons</h2>
        {boards.length === 0 ? (
          <div style={{ display: 'grid', gap: 10, justifyItems: 'start' }}>
            <p style={quiet}>No board is set up yet.</p>
            {canEdit ? <Button variant="dark" onClick={() => addGroup('board')}>Set up the Deacon Board</Button> : null}
          </div>
        ) : (
          boards.map((board) => <GroupPanel key={board.id} group={board} data={data} canEdit={canEdit} showPast={showPast} mutate={mutate} wide />)
        )}
      </section>

      <section aria-label="Committees" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={h2}>Committees</h2>
          {canEdit ? <Button variant="outline" size="sm" onClick={() => addGroup('committee')}>Add a committee</Button> : null}
        </div>
        {committees.length === 0 ? <p style={quiet}>No committees are listed yet.</p> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 440px), 1fr))', gap: 16 }}>
          {committees.map((committee) => (
            <GroupPanel key={committee.id} group={committee} data={data} canEdit={canEdit} showPast={showPast} mutate={mutate} />
          ))}
        </div>
        {showPast && endedCommittees.length ? (
          <p style={quiet}>Committees that have ended: {endedCommittees.map((g) => `${g.name} (ended ${monthYear(g.endedOn)})`).join(' · ')}</p>
        ) : null}
      </section>
    </div>
  )
}

/* ------------------------------------------------------------ one group */

/** Office order first (chairman, vice-chairman, secretary, the deacon
    officers), then everyone else by surname. */
function inOrder(data: DashboardData, rows: ServingAssignment[]): ServingAssignment[] {
  const rank = (a: ServingAssignment) => {
    const i = OFFICES.indexOf(a.roleSlug)
    return i === -1 ? OFFICES.length : i
  }
  const surname = (a: ServingAssignment) => personName(data.people, a.personId).split(' ').slice(-1)[0] ?? ''
  return [...rows].sort((a, b) => rank(a) - rank(b) || surname(a).localeCompare(surname(b)))
}

function GroupPanel({
  group,
  data,
  canEdit,
  showPast,
  mutate,
  wide = false,
}: {
  group: ServingGroup
  data: DashboardData
  canEdit: boolean
  showPast: boolean
  mutate: ReturnType<typeof useStore>['mutate']
  wide?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [ending, setEnding] = useState<{ id: number; on: string } | null>(null)
  /* The page is read far more than it is changed, so a group reads as a list
     until the staff role opens it for editing. */
  const ed = canEdit && editing
  const roles = leadershipRoles(data)
  const all = data.assignments.filter((a) => a.groupId === group.id)
  const current = inOrder(data, all.filter((a) => a.endedOn === null))
  const past = all.filter((a) => a.endedOn !== null).sort((a, b) => (b.endedOn ?? '').localeCompare(a.endedOn ?? ''))
  const officers = current.filter((a) => OFFICES.includes(a.roleSlug))
  const rest = current.filter((a) => !OFFICES.includes(a.roleSlug))
  const roleName = (slug: string) => data.servingRoles.find((r) => r.slug === slug)?.name ?? slug
  const gap = hasGap(data, group)

  const patch = (a: ServingAssignment, label: string, fields: Partial<ServingAssignment>) =>
    mutate(label, (s) => ({ ...s, assignments: s.assignments.map((x) => (x.id === a.id ? { ...x, ...fields } : x)) }))

  const row = (a: ServingAssignment) => {
    const name = personName(data.people, a.personId)
    return (
      <li key={a.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px', padding: '10px 0', borderTop: '1px solid var(--border-hairline)' }}>
        <span style={{ flex: '1 1 200px', minWidth: 0 }}>
          <span style={{ font: '600 19px/1.35 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>{name}</span>
          <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
            {' · '}
            {roleName(a.roleSlug)} · since {monthYear(a.startedOn)}
          </span>
        </span>
        {ed ? (
          ending?.id === a.id ? (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <label style={{ font: '400 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-body)', display: 'flex', gap: 8, alignItems: 'center' }}>
                Term ends
                <input type="date" value={ending.on} onChange={(event) => setEnding({ id: a.id, on: event.target.value })} style={{ ...field, width: 'auto' }} />
              </label>
              <Button
                variant="dark"
                size="sm"
                disabled={!ending.on || ending.on < a.startedOn}
                onClick={() => {
                  patch(a, `${name}’s term as ${roleName(a.roleSlug).toLowerCase()} of ${group.name} ends ${ending.on}. It stays in the record.`, { endedOn: ending.on, isPrimary: false })
                  setEnding(null)
                }}
              >
                End term
              </Button>
              <TextButton onClick={() => setEnding(null)}>Cancel</TextButton>
            </span>
          ) : (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'center' }}>
              <select
                value={a.roleSlug}
                aria-label={`Office of ${name} in ${group.name}`}
                onChange={(event) => patch(a, `${name} is now ${roleName(event.target.value).toLowerCase()} of ${group.name}.`, { roleSlug: event.target.value })}
                style={{ ...field, width: 'auto' }}
              >
                {roles.map((r) => (
                  <option key={r.slug} value={r.slug}>{r.name}</option>
                ))}
              </select>
              <TextButton onClick={() => setEnding({ id: a.id, on: todayIso() })}>End term</TextButton>
            </span>
          )
        ) : null}
      </li>
    )
  }

  return (
    <article aria-label={group.name} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--mbc-radius-panel)', padding: '22px 24px', display: 'grid', gap: 12, alignContent: 'start' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, font: '600 24px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>{group.name}</h3>
        {canEdit ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px' }}>
            {ed ? (
              <TextButton
                onClick={() => {
                  const name = window.prompt('Rename', group.name)?.trim()
                  if (name && name !== group.name) mutate(`Renamed ${group.name} to ${name}.`, (s) => ({ ...s, groups: s.groups.map((g) => (g.id === group.id ? { ...g, name } : g)) }))
                }}
              >
                Rename
              </TextButton>
            ) : null}
            {ed && group.kind === 'committee' ? (
              <TextButton
                onClick={() => {
                  if (window.confirm(`End ${group.name}? It is kept, with everyone who served on it.`))
                    mutate(`${group.name} has ended. It is kept, not deleted.`, (s) => ({ ...s, groups: s.groups.map((g) => (g.id === group.id ? { ...g, endedOn: todayIso() } : g)) }))
                }}
              >
                End committee
              </TextButton>
            ) : null}
            <TextButton
              expanded={editing}
              onClick={() => {
                setEditing((v) => !v)
                setAdding(false)
                setEnding(null)
              }}
            >
              {editing ? 'Done' : 'Edit'}
            </TextButton>
          </span>
        ) : null}
      </div>
      {group.meets || group.location ? <p style={{ ...quiet, margin: 0 }}>{[group.meets, group.location].filter(Boolean).join(' · ')}</p> : null}
      {gap ? <p style={{ margin: 0, font: '700 15px/1.4 var(--mbc-font-sans)', color: 'var(--text-eyebrow)' }}>No chairman named.</p> : null}

      {current.length === 0 ? (
        <p style={quiet}>Nobody named yet.</p>
      ) : wide && officers.length && rest.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '0 32px' }}>
          <List label="Officers">{officers.map(row)}</List>
          <List label="The board">{rest.map(row)}</List>
        </div>
      ) : (
        <List>{current.map(row)}</List>
      )}

      {showPast && past.length ? (
        <List label="Past terms">
          {past.map((a) => (
            <li key={a.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border-hairline)', font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
              <span style={{ color: 'var(--text-body)' }}>{personName(data.people, a.personId)}</span> · {roleName(a.roleSlug)} · {monthYear(a.startedOn)} – {monthYear(a.endedOn)}
            </li>
          ))}
        </List>
      ) : null}

      {canEdit && (ed || gap) ? (
        adding ? (
          <AddPerson
            data={data}
            group={group}
            defaultRole={gap ? 'chairman' : 'member'}
            onCancel={() => setAdding(false)}
            onAdd={(name, roleSlug, startedOn) => {
              const existing = data.people.find((p) => p.active && p.name.trim().toLowerCase() === name.toLowerCase())
              const personId = existing?.id ?? nextId(data.people)
              mutate(
                `${existing?.name ?? name} · ${roleName(roleSlug).toLowerCase()} of ${group.name}.${existing ? '' : ' A person record was created at the same time; they cannot sign in.'}`,
                (s) => ({
                  ...s,
                  people: existing ? s.people : [...s.people, { id: personId, name, role: roleName(roleSlug), email: '', access: 'none', active: true } satisfies Person],
                  assignments: [...s.assignments, { id: nextId(s.assignments), groupId: group.id, personId, roleSlug, startedOn, endedOn: null, isPrimary: roleSlug === 'chairman' && !current.some((a) => a.isPrimary) }],
                }),
              )
              setAdding(false)
            }}
          />
        ) : (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(true)
                setAdding(true)
              }}
            >
              {gap ? 'Name the chairman' : 'Add someone'}
            </Button>
          </div>
        )
      ) : null}
    </article>
  )
}

function AddPerson({ data, group, defaultRole, onAdd, onCancel }: { data: DashboardData; group: ServingGroup; defaultRole: string; onAdd(name: string, roleSlug: string, startedOn: string): void; onCancel(): void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState(defaultRole)
  const [since, setSince] = useState(todayIso())
  const roster = data.people.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (name.trim()) onAdd(name.trim(), role, since)
      }}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', padding: 14, borderRadius: 12, background: 'var(--surface-panel)' }}
    >
      <label style={labelled}>
        <span style={labelText}>Who</span>
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} list={`leaders-${group.id}`} placeholder="Type a name" style={{ ...field, minWidth: 200 }} />
        <datalist id={`leaders-${group.id}`}>{roster.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      </label>
      <label style={labelled}>
        <span style={labelText}>Office</span>
        <select value={role} onChange={(event) => setRole(event.target.value)} style={{ ...field, width: 'auto' }}>
          {leadershipRoles(data).map((r) => (
            <option key={r.slug} value={r.slug}>{r.name}</option>
          ))}
        </select>
      </label>
      <label style={labelled}>
        <span style={labelText}>Term starts</span>
        <input type="date" value={since} onChange={(event) => setSince(event.target.value)} style={{ ...field, width: 'auto' }} />
      </label>
      <Button type="submit" variant="dark" size="sm" disabled={!name.trim() || !since}>Add to {group.name}</Button>
      <TextButton onClick={onCancel}>Cancel</TextButton>
      <p style={{ ...quiet, margin: 0, flexBasis: '100%', fontSize: 15 }}>A name not already on the roster creates the person too; they cannot sign in. Nothing here changes anyone’s access.</p>
    </form>
  )
}

/* ---------------------------------------------------------------- bits */

function List({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 2, alignContent: 'start' }}>
      {label ? <span style={{ font: '700 12px/1.3 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-category)', paddingBottom: 6 }}>{label}</span> : null}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>{children}</ul>
    </div>
  )
}

function TextButton({ onClick, expanded, children }: { onClick(): void; expanded?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} style={{ background: 'none', border: 'none', padding: '8px 0', minHeight: 40, font: '700 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer' }}>
      {children}
    </button>
  )
}

/** "Sep 2025". */
function monthYear(iso: string | null): string {
  if (!iso) return ''
  const [y, m] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const h2: CSSProperties = { margin: 0, font: '600 30px/1.15 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)' }
const quiet: CSSProperties = { font: '400 17px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const labelled: CSSProperties = { display: 'grid', gap: 6 }
const labelText: CSSProperties = { font: '700 12px/1.2 var(--mbc-font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-category)' }
const field: CSSProperties = {
  minHeight: 44,
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-input)',
  borderRadius: 10,
  padding: '0 12px',
  font: '400 16px/1.3 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
}
