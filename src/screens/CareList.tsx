import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BodyBadge, Button, Card, Eyebrow } from '../components/ui'
import { useCare } from '../data/care/store'
import { useMeetings } from '../data/meetings/store'
import { helpLabel } from '../data/care/types'
import type { CareRequest } from '../data/care/types'
import { countDays, daysBetween, formatShort, parseDate, startOfToday, todayIso } from '../lib/date'
import { SURFACES } from './surfaces'

/* The deacon care list (brief §3.2, §3.3): the family ministry plan, and the
   requests the staff have asked of the Board. Everything on this screen is
   a pointer — a household, a man, a date, a kind of help. There is no field
   for why, and the screen does not pretend otherwise: the row says what the
   record says and nothing more. */

export function CareList() {
  const { data, error, assign, contacted, reassign, retire, takeUp, markDone } = useCare()
  const meetings = useMeetings()
  const navigate = useNavigate()
  const [household, setHousehold] = useState('')
  const [deacon, setDeacon] = useState('')
  const [doneOn, setDoneOn] = useState<Record<string, string>>({})
  const today = startOfToday()

  if (error) return <Note>{error}</Note>
  if (!data) return <Note>Opening the care list…</Note>

  const roster = meetings.data?.roster ?? []
  const name = (id: string | null) => (id ? data.names[id] ?? 'Someone' : '—')
  const open = data.requests.filter((r) => r.status === 'open')
  const accepted = data.requests.filter((r) => r.status === 'accepted')
  const done = data.requests.filter((r) => r.status === 'done').slice(0, 12)
  const plan = data.assignments.filter((a) => a.active).sort((a, b) => a.householdLabel.localeCompare(b.householdLabel))
  const thisSunday = new Date(today)
  thisSunday.setDate(today.getDate() - today.getDay())
  const week = data.weeks.find((w) => w.weekOf === thisSunday.toLocaleDateString('en-CA')) ?? null

  const requestRow = (r: CareRequest) => (
    <div key={r.id} style={{ display: 'grid', gap: 6, padding: '14px 2px', background: 'var(--surface-card)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
          {helpLabel(r.helpKind)} · {r.householdLabel}
        </span>
        <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: r.status === 'done' ? 'var(--mbc-yale-sage)' : r.status === 'accepted' ? 'var(--text-heading)' : 'var(--text-eyebrow)' }}>
          {r.status}
        </span>
      </div>
      <span style={meta}>
        Asked by {name(r.requestedBy)} · {formatShort(parseDate(r.createdAt))}
        {r.neededBy ? ' · by ' + formatShort(parseDate(r.neededBy)) : ''}
        {r.assignedTo ? ' · ' + name(r.assignedTo) : ''}
        {r.completedOn ? ' · done ' + formatShort(parseDate(r.completedOn)) : ''}
      </span>
      {r.status === 'open' ? (
        <button type="button" onClick={() => void takeUp(r.id)} style={link}>Take it up</button>
      ) : r.status === 'accepted' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <input type="date" value={doneOn[r.id] ?? todayIso()} onChange={(e) => setDoneOn((c) => ({ ...c, [r.id]: e.target.value }))} style={field} />
          <button type="button" onClick={() => void markDone(r.id, doneOn[r.id] ?? todayIso())} style={link}>Mark it done</button>
        </div>
      ) : null}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <Card radius="card" pad="22px 24px" style={{ flex: '2 1 420px', minWidth: 0, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Eyebrow size="sm">Asked of the Board by the staff</Eyebrow>
            <BodyBadge bodies={['staff', 'deacon-board']} />
          </div>
          {open.length + accepted.length === 0 ? (
            <p style={{ ...body, margin: 0 }}>Nothing is waiting. When the staff ask for a visit, a call, a meal or a ride, it appears here with a name and a date and nothing else.</p>
          ) : (
            <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
              {open.map(requestRow)}
              {accepted.map(requestRow)}
            </div>
          )}
          {done.length ? (
            <details>
              <summary style={{ ...meta, cursor: 'pointer' }}>Done · {done.length}</summary>
              <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)', marginTop: 8 }}>{done.map(requestRow)}</div>
            </details>
          ) : null}
        </Card>

        <Card tone="panel" radius="card" pad="22px 24px" style={{ flex: '1 1 300px', minWidth: 0, display: 'grid', gap: 10 }}>
          <Eyebrow size="sm">Deacon of the Week</Eyebrow>
          {week ? (
            <p style={{ ...body, margin: 0 }}>
              <span style={{ color: 'var(--text-heading)', font: '600 18px/1.3 var(--mbc-font-serif)' }}>{name(week.personId)}</span>
              <br />
              week of {formatShort(parseDate(week.weekOf))}
              {week.backupPersonId ? ' · backup ' + name(week.backupPersonId) : ''}
            </p>
          ) : (
            <p style={{ ...body, margin: 0 }}>Nobody is named for this week.</p>
          )}
          <button type="button" onClick={() => navigate(SURFACES.deaconWeek.path)} style={link}>The rotation and the visit log</button>
        </Card>
      </div>

      <Card radius="card" pad="22px 24px" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Eyebrow size="sm">The plan · households and the deacon who has them</Eyebrow>
          <span className="tabular" style={meta}>{plan.length} households</span>
        </div>
        {plan.length === 0 ? (
          <p style={{ ...body, margin: 0 }}>No households assigned yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {plan.map((a) => {
              const last = parseDate(a.lastContactOn)
              const ago = last ? daysBetween(last, today) : null
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 2fr) minmax(0, 3fr)', gap: 12, padding: '12px 2px', background: 'var(--surface-card)', alignItems: 'center' }}>
                  <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{a.householdLabel}</span>
                  <select value={a.assignedTo} onChange={(e) => void reassign(a.id, e.target.value)} aria-label={'Deacon for ' + a.householdLabel} style={field}>
                    {roster.map((m) => (
                      <option key={m.personId} value={m.personId}>{m.name}</option>
                    ))}
                    {roster.some((m) => m.personId === a.assignedTo) ? null : <option value={a.assignedTo}>{name(a.assignedTo)}</option>}
                  </select>
                  <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <span className="tabular" style={{ ...meta, color: ago !== null && ago > 30 ? 'var(--text-eyebrow)' : 'var(--text-meta)' }}>
                      {last ? 'last contact ' + formatShort(last) + ' · ' + countDays(ago as number) + ' ago' : 'no contact recorded'}
                    </span>
                    <button type="button" onClick={() => void contacted(a.id, todayIso())} style={link}>Contacted today</button>
                    <button type="button" onClick={() => void retire(a.id)} style={link}>Retire</button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border-hairline)' }}>
          <input value={household} placeholder="A household" onChange={(e) => setHousehold(e.target.value)} style={{ ...field, minWidth: 220 }} />
          <select value={deacon} onChange={(e) => setDeacon(e.target.value)} aria-label="Assign to" style={field}>
            <option value="">Assign to…</option>
            {roster.map((m) => (
              <option key={m.personId} value={m.personId}>{m.name}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            disabled={!household.trim() || !deacon}
            onClick={() => {
              void assign(household.trim(), deacon)
              setHousehold('')
            }}
          >
            Assign
          </Button>
          <span style={meta}>A household and a man. There is no field for anything else, on purpose.</span>
        </div>
      </Card>
    </div>
  )
}

function Note({ children }: { children: string }) {
  return <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>{children}</p>
}

const meta: React.CSSProperties = { font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const body: React.CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)' }
const link: React.CSSProperties = { background: 'none', border: 'none', padding: 0, font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer', textAlign: 'left' }
const field: React.CSSProperties = { minHeight: 40, background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 10, padding: '0 12px', font: '400 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }
