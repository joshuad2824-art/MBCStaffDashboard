import { useState } from 'react'
import { Button, Card, Chip, Input, Rule } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useSession } from '../session/session'
import { nextId } from '../lib/derive'
import type { Access, Person } from '../data/types'
import { canSignIn } from '../data/types'

/* The roster.

   Two different things live on this page and the difference matters:

   Being on the roster means you can be named as the owner of a commitment, a
   goal or a care entry. A deacon, a Sunday school teacher, a volunteer who runs
   the men's breakfast — all of them belong here, and none of them needs an
   account for the ledger to say who is responsible.

   Having an account means you can open this site and read what is on it,
   including — at the staff role — named members' health, family and spiritual
   circumstances. That is why inviting somebody is a separate, deliberate act
   rather than a side effect of naming them as an owner. */

const ACCESS_LABEL: Record<Access, string> = {
  staff: 'Staff · everything',
  limited: 'Limited · no care, no board',
  none: 'No account',
}

export function People() {
  const data = useData()
  const { mutate } = useStore()
  const { viewAs, member } = useSession()
  const [showing, setShowing] = useState<'all' | 'accounts' | 'roster'>('all')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', role: '', email: '' })

  // Editing the roster is staff-role only: it decides who can be given a way in.
  const canEdit = viewAs === 'staff'

  const shown = data.people.filter((person) => {
    if (showing === 'accounts') return canSignIn(person)
    if (showing === 'roster') return !canSignIn(person)
    return true
  })

  const add = () => {
    const name = draft.name.trim()
    if (!name) return
    const person: Person = {
      id: nextId(data.people),
      name,
      role: draft.role.trim() || 'Volunteer',
      email: draft.email.trim(),
      access: 'none',
      active: true,
    }
    setAdding(false)
    setDraft({ name: '', role: '', email: '' })
    mutate('Added ' + name + ' to the roster. No account yet.', (current) => ({
      ...current,
      people: [...current.people, person],
    }))
  }

  const patch = (person: Person, label: string, fields: Partial<Person>) =>
    mutate(label, (current) => ({
      ...current,
      people: current.people.map((row) => (row.id === person.id ? { ...row, ...fields } : row)),
    }))

  const setAccess = (person: Person, access: Access) => {
    if (access !== 'none' && !person.email.trim()) return
    patch(
      person,
      access === 'none'
        ? person.name + ' can no longer sign in. They stay on the roster and keep what they own.'
        : person.name + ' can sign in at the ' + access + ' role.',
      { access },
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card tone="panel" radius="card" pad="22px 24px" style={{ display: 'grid', gap: 16 }}>
        <p style={{ font: '400 15px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0, maxWidth: '68ch' }}>
          Being on this list means you can be named as the owner of something. Having an account means you can open the
          site and read what is on it. They are deliberately not the same: a deacon can own the men's fellowship without
          being able to read a care record.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Chip active={showing === 'all'} onClick={() => setShowing('all')}>
            Everyone · {data.people.length}
          </Chip>
          <Chip active={showing === 'accounts'} onClick={() => setShowing('accounts')}>
            Can sign in · {data.people.filter(canSignIn).length}
          </Chip>
          <Chip active={showing === 'roster'} onClick={() => setShowing('roster')}>
            Roster only · {data.people.filter((person) => !canSignIn(person)).length}
          </Chip>
          {canEdit ? (
            <Button
              variant={adding ? 'outline' : 'primary'}
              size="sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setAdding(!adding)}
            >
              {adding ? 'Close' : 'Add someone'}
            </Button>
          ) : null}
        </div>
      </Card>

      {adding ? (
        <Card radius="card" pad={24} style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            <Input
              label="Name"
              value={draft.name}
              placeholder="Full name"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
            <Input
              label="Role"
              value={draft.role}
              placeholder="Deacon, volunteer, teacher…"
              onChange={(event) => setDraft({ ...draft, role: event.target.value })}
            />
            <Input
              label="Email — only if they need to sign in"
              type="email"
              value={draft.email}
              placeholder="name@example.com"
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            />
          </div>
          <Rule tone="hair" />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <Button variant="outline" size="sm" disabled={draft.name.trim().length === 0} onClick={add}>
              Add to the roster
            </Button>
            <span style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
              They can own things straight away. Giving them a way in is the next step, on their row.
            </span>
          </div>
        </Card>
      ) : null}

      <Card radius="card" pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 880 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                gap: 16,
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-section)',
                background: 'var(--surface-panel)',
              }}
            >
              {['Name', 'Role', 'Email', 'Owns', 'Access'].map((label) => (
                <span
                  key={label}
                  style={{
                    font: '700 10px/1 var(--mbc-font-sans)',
                    letterSpacing: 'var(--mbc-track-label-tight)',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {shown.map((person) => {
              const owns =
                data.cadence.filter((item) => item.ownerId === person.id).length +
                data.goals.filter((goal) => goal.ownerId === person.id).length +
                data.care.filter((entry) => entry.ownerId === person.id).length
              const isMe = person.id === member?.id

              return (
                <div
                  key={person.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: COLUMNS,
                    gap: 16,
                    padding: '18px 24px',
                    borderBottom: '1px solid var(--border-hairline)',
                    alignItems: 'start',
                    opacity: person.active ? 1 : 0.55,
                  }}
                >
                  <div>
                    <p style={{ font: '400 15px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
                      {person.name}
                      {isMe ? ' · you' : ''}
                    </p>
                    {!person.active ? (
                      <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: '5px 0 0' }}>
                        No longer here
                      </p>
                    ) : null}
                  </div>

                  <Cell>{person.role}</Cell>
                  <Cell tone={person.email ? 'body' : 'meta'}>{person.email || '—'}</Cell>
                  <Cell tabular tone={owns === 0 ? 'meta' : 'body'}>
                    {owns === 0 ? 'nothing' : owns + (owns === 1 ? ' thing' : ' things')}
                  </Cell>

                  <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
                    {canEdit && person.active ? (
                      <>
                        <select
                          value={person.access}
                          aria-label={'Access for ' + person.name}
                          disabled={isMe}
                          onChange={(event) => setAccess(person, event.target.value as Access)}
                          style={{
                            minHeight: 36,
                            background: 'var(--surface-field)',
                            border: '1px solid var(--mbc-border-panel)',
                            borderRadius: 'var(--mbc-radius-md)',
                            padding: '7px 9px',
                            font: '400 13px/1.3 var(--mbc-font-sans)',
                            color: 'var(--text-heading)',
                            opacity: isMe ? 0.5 : 1,
                          }}
                        >
                          {(['none', 'limited', 'staff'] as Access[]).map((level) => (
                            <option key={level} value={level} disabled={level !== 'none' && !person.email.trim()}>
                              {ACCESS_LABEL[level]}
                            </option>
                          ))}
                        </select>
                        {!person.email.trim() ? (
                          <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                            An email address is needed before they can be invited.
                          </span>
                        ) : null}
                        {isMe ? (
                          <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                            You cannot change your own access.
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              patch(person, person.name + ' is marked as no longer here.', { active: false })
                            }
                            style={linkButton}
                          >
                            No longer here
                          </button>
                        )}
                      </>
                    ) : (
                      <Cell tone={canSignIn(person) ? 'body' : 'meta'}>{ACCESS_LABEL[person.access]}</Cell>
                    )}
                    {canEdit && !person.active ? (
                      <button
                        type="button"
                        onClick={() => patch(person, person.name + ' is back on the roster.', { active: true })}
                        style={linkButton}
                      >
                        Back on the roster
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <p style={{ font: '400 13px/1.7 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0, maxWidth: '66ch' }}>
        Marking someone as no longer here keeps the record of what they owned and stops them signing in. Nothing they
        owned is deleted — it goes back to unclaimed on the ledger, which is where it belongs until somebody takes it.
      </p>
    </div>
  )
}

const COLUMNS = '1.4fr 1.1fr 1.5fr .7fr 1.5fr'

const linkButton = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: '400 12px/1.4 var(--mbc-font-sans)',
  color: 'var(--text-link)',
  cursor: 'pointer',
} as const

function Cell({
  children,
  tabular = false,
  tone = 'body',
}: {
  children: React.ReactNode
  tabular?: boolean
  tone?: 'body' | 'meta'
}) {
  return (
    <p
      className={tabular ? 'tabular' : undefined}
      style={{
        font: '400 15px/1.45 var(--mbc-font-sans)',
        color: tone === 'meta' ? 'var(--text-meta)' : 'var(--text-body)',
        margin: 0,
      }}
    >
      {children}
    </p>
  )
}
