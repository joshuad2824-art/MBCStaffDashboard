import { useMemo, useState } from 'react'
import { BodyBadge, Button, Card, Chip, Eyebrow, Rule } from '../components/ui'
import { OwnerSelect } from '../components/OwnerSelect'
import { useData, useStore } from '../data/store'
import { repository } from '../data/repository'
import { CARE_TYPES } from '../data/seed'
import { useCare } from '../data/care/store'
import { HELP_KINDS, helpLabel } from '../data/care/types'
import type { HelpKind } from '../data/care/types'
import type { CareEntry, CareStatus } from '../data/types'
import { careDueBy, careWindow, firstName, nextId, personName } from '../lib/derive'
import { daysBetween, formatShort, parseDate, startOfToday, todayIso } from '../lib/date'
import { useSession } from '../session/session'

/* Care pipelines (staff brief §2.6, §6; handoff §8). Per-person, rolling:
   each entry has a person, a type, an opened date, a response window derived
   from the type, an owner, and a status of open / touched / closed.

   This surface holds sensitive information. It is staff-role only — the
   policy, not this file, decides that. An entry marked sensitive shows only
   a first name in the list; the notes appear only in the open record. Nothing
   here is ever pulled into the Communicator, and present mode never draws it.

   The handoff (deacons' brief §3.3) lives on the open record: "Ask a deacon"
   composes a request — household, kind of help, by when — in a form whose
   fields are the only things that travel. There is no button that copies the
   entry across and no field the reason could be typed into. The loop closes
   on the same record: done, on a date, by a man. */

type Filter = 'all' | 'open' | 'touched' | 'unclaimed' | 'closed'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'touched', label: 'Touched' },
  { key: 'unclaimed', label: 'Unclaimed' },
  { key: 'closed', label: 'Closed' },
]

export function Care() {
  const data = useData()
  const { mutate, update } = useStore()
  const { member } = useSession()
  const care = useCare()
  const today = startOfToday()
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  const entries = useMemo(
    () =>
      [...data.care]
        .filter((e) => {
          if (filter === 'all') return true
          if (filter === 'unclaimed') return e.ownerId === null && e.status !== 'closed'
          return e.status === filter
        })
        .sort((a, b) => order(a.status) - order(b.status) || (careDueBy(a)?.getTime() ?? 0) - (careDueBy(b)?.getTime() ?? 0)),
    [data.care, filter],
  )
  const open = data.care.find((e) => e.id === openId) ?? null
  const requests = care.data?.requests ?? []
  const links = care.data?.links ?? []
  const names = care.data?.names ?? {}
  const name = (id: string | null) => (id ? names[id] ?? 'Someone' : '—')
  const askedFor = (entry: CareEntry) => {
    const ref = repository.careEntryRef(entry.id)
    return requests.filter((r) => links.some((l) => l.requestId === r.id && l.careEntryId === ref))
  }
  const thisSunday = new Date(today)
  thisSunday.setDate(today.getDate() - today.getDay())
  const week = care.data?.weeks.find((w) => w.weekOf === thisSunday.toLocaleDateString('en-CA')) ?? null

  const patch = (id: number, label: string, change: Partial<CareEntry>) =>
    mutate(label, (current) => ({ ...current, care: current.care.map((e) => (e.id === id ? { ...e, ...change } : e)) }))

  const setStatus = (entry: CareEntry, status: CareStatus) => {
    const now = todayIso()
    if (status === 'closed') patch(entry.id, 'Closed. It archives after twelve months and is purged after twenty-four unless flagged.', { status, closedOn: now, lastTouchOn: entry.lastTouchOn ?? now })
    else if (status === 'touched') patch(entry.id, 'Touched today.', { status, lastTouchOn: now, closedOn: null })
    else patch(entry.id, 'Reopened.', { status, closedOn: null })
  }

  const addEntry = (draft: Omit<CareEntry, 'id'>) => {
    const id = nextId(data.care)
    setAdding(false)
    setOpenId(id)
    mutate('Opened a care entry. Its window started today.', (current) => ({ ...current, care: [...current.care, { ...draft, id }] }))
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
        <span style={{ flex: 1 }} />
        <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Never mind' : 'Open an entry'}
        </Button>
      </div>

      {adding ? <NewEntry meId={member?.id ?? null} onCancel={() => setAdding(false)} onSave={addEntry} /> : null}

      <Card radius="card" pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1, background: 'var(--border-hairline)' }}>
          {CARE_TYPES.map((type) => {
            const openCount = data.care.filter((e) => e.type === type.name && e.status !== 'closed').length
            const late = data.care.filter((e) => e.type === type.name && e.status === 'open' && (careDueBy(e) ?? today) < today).length
            return (
              <div key={type.name} style={{ background: 'var(--surface-card)', padding: '16px 18px', display: 'grid', gap: 4 }}>
                <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{type.name}</span>
                <span className="tabular" style={{ font: '600 22px/1 var(--mbc-font-serif)', color: late ? 'var(--mbc-lamplight-deep)' : 'var(--text-heading)' }}>{openCount}</span>
                <span style={meta}>{type.window}{late ? ' · ' + late + ' past the window' : ''}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <Card radius="card" pad="22px 24px" style={{ flex: '3 1 480px', minWidth: 0, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Eyebrow size="sm">Entries · staff role only</Eyebrow>
            <span className="tabular" style={meta}>{entries.length} shown</span>
          </div>
          {entries.length === 0 ? (
            <p style={{ ...body, margin: 0 }}>Nothing here under that filter.</p>
          ) : (
            <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
              {entries.map((entry) => {
                const due = careDueBy(entry)
                const late = entry.status === 'open' && due !== null && due < today
                const asked = askedFor(entry)
                const isOpen = open?.id === entry.id
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : entry.id)}
                    style={{ textAlign: 'left', border: 'none', cursor: 'pointer', display: 'grid', gap: 6, padding: '14px 10px', background: isOpen ? 'var(--surface-panel)' : 'var(--surface-card)' }}
                  >
                    <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                      <span style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                        {entry.sensitive ? firstName(entry.person) : entry.person}
                        {entry.sensitive ? <span style={{ ...meta, marginLeft: 8 }}>sensitive</span> : null}
                      </span>
                      <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: entry.status === 'closed' ? 'var(--text-muted)' : entry.status === 'touched' ? 'var(--mbc-yale-sage)' : late ? 'var(--mbc-lamplight-deep)' : 'var(--text-eyebrow)' }}>
                        {late ? 'past the window' : entry.status}
                      </span>
                    </span>
                    <span style={meta}>
                      {entry.type} · opened {formatShort(parseDate(entry.openedOn))} · {careWindow(entry)}
                      {due && entry.status !== 'closed' ? ' · respond by ' + formatShort(due) : ''}
                      {entry.lastTouchOn ? ' · last touch ' + formatShort(parseDate(entry.lastTouchOn)) : ''}
                      {' · '}
                      {entry.ownerId === null ? 'unclaimed' : personName(data.people, entry.ownerId)}
                    </span>
                    {asked.length ? (
                      <span style={{ ...meta, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                        <BodyBadge bodies={['deacon-board']} />
                        {asked.map((r) => (
                          <span key={r.id}>
                            {helpLabel(r.helpKind)}{r.status === 'open' ? ' · waiting for a deacon' : r.status === 'accepted' ? ' · ' + name(r.assignedTo) + ' has it' : ' · done ' + formatShort(parseDate(r.completedOn)) + ' by ' + name(r.assignedTo)}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <div style={{ flex: '2 1 360px', display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>
          {open ? (
            <Detail
              entry={open}
              asked={askedFor(open)}
              names={name}
              canAsk={care.data !== null && open.status !== 'closed'}
              onOwner={(ownerId, who) => patch(open.id, ownerId === null ? 'Unclaimed. It shows on the Unclaimed filter until someone takes it.' : who + ' owns it now.', { ownerId })}
              onNotes={(notes) => update((current) => ({ ...current, care: current.care.map((e) => (e.id === open.id ? { ...e, notes } : e)) }))}
              onSensitive={(sensitive) => patch(open.id, sensitive ? 'Marked sensitive. Lists show a first name only.' : 'No longer marked sensitive.', { sensitive })}
              onStatus={(status) => setStatus(open, status)}
              onAsk={async (input) => care.askDeacon({ ...input, careEntryId: repository.careEntryRef(open.id) })}
              onClose={() => setOpenId(null)}
            />
          ) : (
            <Card tone="panel" radius="card" pad="22px 24px" style={{ display: 'grid', gap: 10 }}>
              <Eyebrow size="sm">The record</Eyebrow>
              <p style={{ ...body, margin: 0 }}>Open an entry to read its notes, name an owner, mark it touched or closed, or ask a deacon for a visit, a call, a meal or a ride.</p>
            </Card>
          )}
          <Card tone="panel" radius="card" pad="22px 24px" style={{ display: 'grid', gap: 10 }}>
            <Eyebrow size="sm">Deacon of the Week</Eyebrow>
            {week ? (
              <p style={{ ...body, margin: 0 }}>
                <span style={{ color: 'var(--text-heading)', font: '600 18px/1.3 var(--mbc-font-serif)' }}>{name(week.personId)}</span>
                <br />
                week of {formatShort(parseDate(week.weekOf))}
                {week.backupPersonId ? ' · backup ' + name(week.backupPersonId) : ''}
              </p>
            ) : (
              <p style={{ ...body, margin: 0 }}>The Board has not named anyone for this week.</p>
            )}
          </Card>
          {care.error ? <p style={{ ...meta, color: 'var(--text-eyebrow)', margin: 0 }}>{care.error}</p> : null}
        </div>
      </div>
    </div>
  )
}

function Detail({
  entry, asked, names, canAsk, onOwner, onNotes, onSensitive, onStatus, onAsk, onClose,
}: {
  entry: CareEntry
  asked: { id: string; helpKind: HelpKind; status: string; assignedTo: string | null; completedOn: string | null; createdAt: string; neededBy: string | null }[]
  names(id: string | null): string
  canAsk: boolean
  onOwner(ownerId: number | null, who: string): void
  onNotes(notes: string): void
  onSensitive(sensitive: boolean): void
  onStatus(status: CareStatus): void
  onAsk(input: { householdLabel: string; helpKind: HelpKind; neededBy: string | null }): Promise<boolean>
  onClose(): void
}) {
  const [asking, setAsking] = useState(false)
  const due = careDueBy(entry)
  const today = startOfToday()
  return (
    <Card radius="card" pad="22px 24px" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ font: '600 22px/1.25 var(--mbc-font-serif)', letterSpacing: '-.01em', color: 'var(--text-heading)', margin: 0 }}>{entry.person}</h2>
        <button type="button" onClick={onClose} style={link}>Close the record</button>
      </div>
      <p style={{ ...meta, margin: 0 }}>
        {entry.type} · opened {formatShort(parseDate(entry.openedOn))} · {careWindow(entry)}
        {due ? ' · respond by ' + formatShort(due) + (entry.status === 'open' && due < today ? ' · ' + daysBetween(due, today) + ' days past' : '') : ''}
        {entry.closedOn ? ' · closed ' + formatShort(parseDate(entry.closedOn)) : ''}
      </p>
      <Rule tone="hair" />

      <div style={{ display: 'grid', gap: 8 }}>
        <span style={label}>Owner</span>
        <OwnerSelect ownerId={entry.ownerId} label={'Owner of ' + entry.person} onChange={onOwner} />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <span style={label}>Notes · never leave this record</span>
        <textarea value={entry.notes} rows={4} onChange={(e) => onNotes(e.target.value)} style={textarea} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        {entry.status !== 'closed' ? (
          <>
            <Button variant="outline" size="sm" onClick={() => onStatus('touched')}>Touched today</Button>
            <Button variant="outline" size="sm" onClick={() => onStatus('closed')}>Close it</Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onStatus('open')}>Reopen</Button>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', cursor: 'pointer' }}>
          <input type="checkbox" checked={entry.sensitive} onChange={(e) => onSensitive(e.target.checked)} />
          Sensitive · first name only on lists
        </label>
      </div>

      <Rule tone="hair" />
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <span style={label}>The deacons</span>
          <BodyBadge bodies={['deacon-board']} />
        </div>
        {asked.length === 0 ? <p style={{ ...meta, margin: 0 }}>Nothing asked of a deacon for this entry.</p> : null}
        {asked.map((r) => (
          <p key={r.id} style={{ ...body, margin: 0 }}>
            {helpLabel(r.helpKind)} · asked {formatShort(parseDate(r.createdAt))}
            {r.neededBy ? ' · by ' + formatShort(parseDate(r.neededBy)) : ''}
            {r.status === 'open' ? ' · waiting for a deacon' : r.status === 'accepted' ? ' · ' + names(r.assignedTo) + ' has it' : ' · done ' + formatShort(parseDate(r.completedOn)) + ' by ' + names(r.assignedTo)}
          </p>
        ))}
        {canAsk ? (
          asking ? (
            <AskForm entry={entry} onCancel={() => setAsking(false)} onAsk={async (input) => { if (await onAsk(input)) setAsking(false) }} />
          ) : (
            <button type="button" onClick={() => setAsking(true)} style={{ ...link, justifySelf: 'start' }}>Ask a deacon</button>
          )
        ) : null}
      </div>
    </Card>
  )
}

function AskForm({ entry, onAsk, onCancel }: { entry: CareEntry; onAsk(input: { householdLabel: string; helpKind: HelpKind; neededBy: string | null }): Promise<void>; onCancel(): void }) {
  const [household, setHousehold] = useState(entry.person)
  const [kind, setKind] = useState<HelpKind>('visit')
  const [by, setBy] = useState('')
  return (
    <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-section)', borderRadius: 14, padding: '14px 16px', display: 'grid', gap: 10 }}>
      <p style={{ ...meta, margin: 0 }}>What you are asking a deacon to do. These fields are the only things that travel; the notes above stay here.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <label style={label}>
          Household
          <input value={household} onChange={(e) => setHousehold(e.target.value)} style={field} />
        </label>
        <label style={label}>
          Kind of help
          <select value={kind} onChange={(e) => setKind(e.target.value as HelpKind)} style={field}>
            {HELP_KINDS.map((h) => (
              <option key={h.kind} value={h.kind}>{h.label}</option>
            ))}
          </select>
        </label>
        <label style={label}>
          By when, if it matters
          <input type="date" value={by} onChange={(e) => setBy(e.target.value)} style={field} />
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Button variant="outline" size="sm" disabled={!household.trim()} onClick={() => void onAsk({ householdLabel: household.trim(), helpKind: kind, neededBy: by || null })}>
          Ask a deacon
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function NewEntry({ meId, onSave, onCancel }: { meId: number | null; onSave(entry: Omit<CareEntry, 'id'>): void; onCancel(): void }) {
  const [person, setPerson] = useState('')
  const [type, setType] = useState(CARE_TYPES[0].name)
  const [openedOn, setOpenedOn] = useState(todayIso())
  const [sensitive, setSensitive] = useState(false)
  const [notes, setNotes] = useState('')
  const [claim, setClaim] = useState(true)
  const window = CARE_TYPES.find((t) => t.name === type)
  return (
    <Card tone="panel" radius="card" pad="20px 22px" style={{ display: 'grid', gap: 12 }}>
      <Eyebrow size="sm">A new entry</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <label style={label}>
          Person or household
          <input value={person} onChange={(e) => setPerson(e.target.value)} style={field} />
        </label>
        <label style={label}>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)} style={field}>
            {CARE_TYPES.map((t) => (
              <option key={t.name} value={t.name}>{t.name} · {t.window}</option>
            ))}
          </select>
        </label>
        <label style={label}>
          Opened
          <input type="date" value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} style={field} />
        </label>
      </div>
      <label style={label}>
        Notes
        <textarea value={notes} rows={3} onChange={(e) => setNotes(e.target.value)} style={textarea} />
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        <Button variant="outline" size="sm" disabled={!person.trim() || !parseDate(openedOn)} onClick={() => onSave({ person: person.trim(), type, openedOn, ownerId: claim ? meId : null, status: 'open', lastTouchOn: null, closedOn: null, sensitive, notes })}>
          Open it
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', cursor: 'pointer' }}>
          <input type="checkbox" checked={claim} onChange={(e) => setClaim(e.target.checked)} disabled={meId === null} />
          I own it
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', cursor: 'pointer' }}>
          <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
          Sensitive
        </label>
        <span style={meta}>{window ? 'Respond within ' + window.window + ' — ' + window.note + '.' : ''}</span>
      </div>
    </Card>
  )
}

function order(status: CareStatus): number {
  return status === 'open' ? 0 : status === 'touched' ? 1 : 2
}

const meta: React.CSSProperties = { font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const body: React.CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)' }
const link: React.CSSProperties = { background: 'none', border: 'none', padding: 0, font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer', textAlign: 'left' }
const label: React.CSSProperties = { display: 'grid', gap: 6, font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }
const field: React.CSSProperties = { minHeight: 40, background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 10, padding: '0 12px', font: '400 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)', textTransform: 'none', letterSpacing: 0 }
const textarea: React.CSSProperties = { width: '100%', resize: 'vertical', background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 10, padding: '10px 12px', font: '400 15px/1.55 var(--mbc-font-sans)', color: 'var(--text-heading)', textTransform: 'none', letterSpacing: 0 }
