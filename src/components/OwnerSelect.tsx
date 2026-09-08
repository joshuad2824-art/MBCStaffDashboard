import { useState } from 'react'
import { Button, Rule } from './ui'
import { useData, useStore } from '../data/store'
import { nextId } from '../lib/derive'
import type { Person } from '../data/types'
import { canSignIn } from '../data/types'

/* The owner picker.

   It lists everyone on the roster, not only people with accounts — a deacon or
   a volunteer can own a commitment without being able to sign in. When the
   person you need is not there yet, "Add someone…" takes a name inline and
   assigns them in the same action, because leaving the page to go and create a
   record first is how a commitment ends up unclaimed.

   Adding someone here creates a roster entry with no account. Giving that
   person a way in is a separate, deliberate act on the People page. */

const ADD = '__add__'

export function OwnerSelect({
  ownerId,
  label,
  onChange,
}: {
  ownerId: number | null
  /** For the screen reader: "Owner of Men's fellowship event". */
  label: string
  onChange(ownerId: number | null, personName: string): void
}) {
  const data = useData()
  const { mutate } = useStore()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', role: '' })

  const roster = data.people.filter((person) => person.active)
  const withAccounts = roster.filter(canSignIn)
  const withoutAccounts = roster.filter((person) => !canSignIn(person))

  const addAndAssign = () => {
    const name = draft.name.trim()
    if (!name) return
    const id = nextId(data.people)
    const person: Person = {
      id,
      name,
      role: draft.role.trim() || 'Volunteer',
      email: '',
      access: 'none',
      active: true,
    }
    setAdding(false)
    setDraft({ name: '', role: '' })
    mutate(name + ' is on the roster and owns it. They cannot sign in yet.', (current) => ({
      ...current,
      people: [...current.people, person],
    }))
    onChange(id, name)
  }

  if (adding) {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <input
          autoFocus
          value={draft.name}
          placeholder="Name"
          aria-label="Name of the person to add"
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addAndAssign()
            if (event.key === 'Escape') setAdding(false)
          }}
          style={field}
        />
        <input
          value={draft.role}
          placeholder="Deacon, volunteer, teacher…"
          aria-label="Their role"
          onChange={(event) => setDraft({ ...draft, role: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addAndAssign()
            if (event.key === 'Escape') setAdding(false)
          }}
          style={field}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="outline"
            size="sm"
            style={{ minHeight: 34, padding: '9px 14px' }}
            disabled={draft.name.trim().length === 0}
            onClick={addAndAssign}
          >
            Add and assign
          </Button>
          <Button
            variant="outline"
            size="sm"
            style={{ minHeight: 34, padding: '9px 14px' }}
            onClick={() => setAdding(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <select
      value={ownerId === null ? '' : String(ownerId)}
      aria-label={label}
      onChange={(event) => {
        const value = event.target.value
        if (value === ADD) {
          setAdding(true)
          return
        }
        const id = value === '' ? null : Number(value)
        const name = id === null ? 'Unclaimed' : (data.people.find((p) => p.id === id)?.name ?? 'Unclaimed')
        onChange(id, name)
      }}
      style={{ ...field, color: ownerId === null ? 'var(--text-muted)' : 'var(--text-heading)' }}
    >
      <option value="">Unclaimed</option>
      {withAccounts.length > 0 ? (
        <optgroup label="Staff">
          {withAccounts.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </optgroup>
      ) : null}
      {withoutAccounts.length > 0 ? (
        <optgroup label="Deacons and volunteers">
          {withoutAccounts.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </optgroup>
      ) : null}
      <option value={ADD}>Add someone…</option>
    </select>
  )
}

/** The roster line under a picker: who they are, and whether they have a way in. */
export function OwnerNote({ ownerId }: { ownerId: number | null }) {
  const data = useData()
  if (ownerId === null) return null
  const person = data.people.find((candidate) => candidate.id === ownerId)
  if (!person) return null
  return (
    <p style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: '5px 0 0' }}>
      {person.role}
      {canSignIn(person) ? '' : ' · no account'}
    </p>
  )
}

export function RosterLegend() {
  return (
    <>
      <Rule tone="hair" />
      <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>
        Anyone on the roster can own something. Signing in is separate — see People.
      </p>
    </>
  )
}

const field = {
  width: '100%',
  minHeight: 40,
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-panel)',
  borderRadius: 'var(--mbc-radius-md)',
  padding: '9px 10px',
  font: '400 14px/1.3 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
} as const
