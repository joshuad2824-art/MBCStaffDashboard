import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card } from './ui'

type SeatRole = 'chair' | 'member' | 'ex_officio'

interface ManagedSeat {
  slug: string
  name: string
  role: SeatRole
  termStart: string | null
  termEnd: string | null
}

interface ManagedPerson {
  id: string
  name: string
  role: string
  email: string
  access: string
  seats: ManagedSeat[]
}

const BODIES = [
  ['deacon-board', 'Deacon Board'],
  ['committee:finance', 'Finance Committee'],
  ['committee:personnel', 'Personnel Committee'],
  ['committee:building-grounds', 'Building & Grounds Committee'],
] as const

const today = new Date().toISOString().slice(0, 10)

export function SeatManager({ currentPersonId }: { currentPersonId: string }) {
  const [people, setPeople] = useState<ManagedPerson[]>([])
  const [personId, setPersonId] = useState('')
  const [bodySlug, setBodySlug] = useState<(typeof BODIES)[number][0]>('deacon-board')
  const [role, setRole] = useState<SeatRole>('member')
  const [termStart, setTermStart] = useState(today)
  const [termEnd, setTermEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('chairman_roster')
    if (error) {
      setMessage('Could not open the seat roster: ' + error.message)
      return
    }
    const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>
    const next = rows.map((row) => ({
      id: String(row.person_id ?? ''),
      name: String(row.person_name ?? ''),
      role: String(row.person_role ?? ''),
      email: String(row.person_email ?? ''),
      access: String(row.person_access ?? 'none'),
      seats: Array.isArray(row.seats) ? row.seats as ManagedSeat[] : [],
    }))
    setPeople(next)
    setPersonId((current) => current || next[0]?.id || '')
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(() => people.find((person) => person.id === personId), [people, personId])
  const seats = people.flatMap((person) => person.seats.map((seat) => ({ person, seat })))

  const save = async (active: boolean, existing?: { person: ManagedPerson; seat: ManagedSeat }) => {
    if (!supabase) return
    const targetPerson = existing?.person.id ?? personId
    const targetBody = existing?.seat.slug ?? bodySlug
    const targetRole = existing?.seat.role ?? role
    if (!targetPerson) return
    setBusy(true)
    setMessage('')
    const { error } = await supabase.rpc('set_managed_membership', {
      target_person_id: targetPerson,
      target_body_slug: targetBody,
      target_role: targetRole,
      target_term_start: (existing?.seat.termStart ?? termStart) || null,
      target_term_end: (existing?.seat.termEnd ?? termEnd) || null,
      target_active: active,
    })
    if (error) setMessage('The seat was not changed: ' + error.message)
    else {
      setMessage(active ? 'Seat saved. Account access is still a separate choice below.' : 'Seat ended.')
      await load()
    }
    setBusy(false)
  }

  if (!supabase) return null

  return (
    <Card radius="card" pad={24} style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <h2 style={heading}>Board &amp; committee seats</h2>
        <p style={copy}>
          This is the chairman's roster. Save the membership first; if the person needs to sign in, choose Limited in
          the Access column below afterward. Saving a seat never sends an email. Family Assistance stays outside this
          roster because its membership is confidential.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Field label="Person">
          <select value={personId} onChange={(event) => setPersonId(event.target.value)} style={control}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
          </select>
        </Field>
        <Field label="Body">
          <select value={bodySlug} onChange={(event) => setBodySlug(event.target.value as typeof bodySlug)} style={control}>
            {BODIES.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </Field>
        <Field label="Seat">
          <select value={role} onChange={(event) => setRole(event.target.value as SeatRole)} style={control}>
            <option value="member">Member</option>
            <option value="chair">Chair</option>
            <option value="ex_officio">Ex officio</option>
          </select>
        </Field>
        <Field label="Starts">
          <input type="date" value={termStart} onChange={(event) => setTermStart(event.target.value)} style={control} />
        </Field>
        <Field label="Ends — optional">
          <input type="date" value={termEnd} onChange={(event) => setTermEnd(event.target.value)} style={control} />
        </Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Button variant="primary" size="sm" disabled={busy || !selected} onClick={() => void save(true)}>Save seat</Button>
        {selected ? <span style={meta}>{selected.email || 'No email'} · {selected.access === 'none' ? 'roster only' : selected.access + ' access'}</span> : null}
      </div>

      {message ? <p style={{ ...copy, color: message.startsWith('The seat') || message.startsWith('Could not') ? 'var(--text-error)' : 'var(--text-body)' }}>{message}</p> : null}

      <div style={{ display: 'grid', gap: 0, borderTop: '1px solid var(--border-section)' }}>
        {seats.length === 0 ? <p style={{ ...copy, paddingTop: 16 }}>No Board or committee seats yet.</p> : seats.map(({ person, seat }) => {
          const ownChair = person.id === currentPersonId && seat.slug === 'deacon-board' && seat.role === 'chair'
          return (
            <div key={person.id + seat.slug} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1fr) minmax(190px, 1.2fr) auto', gap: 14, alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--border-hairline)' }}>
              <span style={copy}>{person.name}</span>
              <span style={meta}>{seat.name} · {seat.role.replace('_', ' ')}{seat.termStart ? ' · ' + seat.termStart : ''}{seat.termEnd ? '–' + seat.termEnd : ''}</span>
              <Button variant="outline" size="sm" disabled={busy || ownChair} onClick={() => void save(false, { person, seat })}>{ownChair ? 'Current chair' : 'End seat'}</Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: 'grid', gap: 6 }}><span style={labelStyle}>{label}</span>{children}</label>
}

const control = {
  minHeight: 42,
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-panel)',
  borderRadius: 'var(--mbc-radius-md)',
  padding: '8px 10px',
  font: '400 14px/1.3 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
} as const

const heading = { font: '600 19px/1.25 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 } as const
const copy = { font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 } as const
const meta = { font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' } as const
const labelStyle = { font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: 'var(--mbc-track-label-tight)', textTransform: 'uppercase', color: 'var(--text-muted)' } as const
