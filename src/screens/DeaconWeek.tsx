import { useState } from 'react'
import { Button, Card, Eyebrow } from '../components/ui'
import { useCare } from '../data/care/store'
import { useMeetings } from '../data/meetings/store'
import type { VisitKind } from '../data/care/types'
import { addDays, formatShort, parseDate, startOfToday, toIso, todayIso } from '../lib/date'

/* Deacon of the Week (brief §3.2): a rotation and a visit log. Already an MBC
   practice — the DIT schedule names "Deacon-of-the-Week calls". A week is
   named by its Sunday; the man and his backup are set here; and the log
   records that a household was visited or called, on a date, by whom. */

export function DeaconWeek() {
  const { data, error, setWeek, logVisit } = useCare()
  const meetings = useMeetings()
  const [household, setHousehold] = useState('')
  const [kind, setKind] = useState<VisitKind>('visit')
  const [on, setOn] = useState(todayIso())
  const today = startOfToday()

  if (error) return <Note>{error}</Note>
  if (!data) return <Note>Opening the rotation…</Note>

  const roster = meetings.data?.roster ?? []
  const name = (id: string | null) => (id ? data.names[id] ?? 'Someone' : '—')
  const thisSunday = addDays(today, -today.getDay())
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(thisSunday, (i - 1) * 7))
  const current = data.weeks.find((w) => w.weekOf === toIso(thisSunday)) ?? null
  const visits = data.visits.slice(0, 30)

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <Card radius="card" pad="22px 24px" style={{ flex: '2 1 420px', minWidth: 0, display: 'grid', gap: 14 }}>
          <Eyebrow size="sm">The rotation · last week, this week, and the six after</Eyebrow>
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {weeks.map((sunday) => {
              const iso = toIso(sunday)
              const week = data.weeks.find((w) => w.weekOf === iso) ?? null
              const isThis = iso === toIso(thisSunday)
              return (
                <div key={iso} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) minmax(0,1fr)', gap: 12, padding: '12px 2px', background: isThis ? 'var(--mbc-lamplight-tint)' : 'var(--surface-card)', alignItems: 'center' }}>
                  <span className="tabular" style={{ font: '600 15px/1.3 var(--mbc-font-serif)', color: isThis ? 'var(--mbc-lamplight-deep)' : 'var(--text-heading)' }}>
                    {formatShort(sunday)}
                    {isThis ? ' · now' : ''}
                  </span>
                  <select value={week?.personId ?? ''} aria-label={'Deacon of the week of ' + formatShort(sunday)} onChange={(e) => e.target.value && void setWeek(iso, e.target.value, week?.backupPersonId ?? null)} style={field}>
                    <option value="">Not named</option>
                    {roster.map((m) => (
                      <option key={m.personId} value={m.personId}>{m.name}</option>
                    ))}
                  </select>
                  <select value={week?.backupPersonId ?? ''} aria-label={'Backup for the week of ' + formatShort(sunday)} disabled={!week} onChange={(e) => week && void setWeek(iso, week.personId, e.target.value || null)} style={field}>
                    <option value="">No backup</option>
                    {roster.map((m) => (
                      <option key={m.personId} value={m.personId}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
          <p style={{ ...meta, margin: 0 }}>Calls to the office go to the man named for the week, and to his backup if he cannot be reached. The staff see this too.</p>
        </Card>

        <Card tone="panel" radius="card" pad="22px 24px" style={{ flex: '1 1 320px', minWidth: 0, display: 'grid', gap: 12 }}>
          <Eyebrow size="sm">Log a visit or a call · this week</Eyebrow>
          {current ? (
            <>
              <p style={{ ...body, margin: 0 }}>
                <span style={{ color: 'var(--text-heading)' }}>{name(current.personId)}</span> has the week of {formatShort(parseDate(current.weekOf))}.
              </p>
              <input value={household} placeholder="A household" onChange={(e) => setHousehold(e.target.value)} style={field} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <select value={kind} onChange={(e) => setKind(e.target.value as VisitKind)} aria-label="Kind" style={field}>
                  <option value="visit">A visit</option>
                  <option value="call">A call</option>
                </select>
                <input type="date" value={on} onChange={(e) => setOn(e.target.value)} style={field} />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!household.trim()}
                onClick={() => {
                  void logVisit(current.id, household.trim(), kind, on)
                  setHousehold('')
                }}
                style={{ justifySelf: 'start' }}
              >
                Log it
              </Button>
              <p style={{ ...meta, margin: 0 }}>That it happened, when, and by whom. Nothing about what was said.</p>
            </>
          ) : (
            <p style={{ ...body, margin: 0 }}>Name a deacon for this week first; the log hangs off the week.</p>
          )}
        </Card>
      </div>

      <Card radius="card" pad="22px 24px" style={{ display: 'grid', gap: 12 }}>
        <Eyebrow size="sm">The visit log</Eyebrow>
        {visits.length === 0 ? (
          <p style={{ ...body, margin: 0 }}>Nothing logged yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {visits.map((v) => (
              <div key={v.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: '11px 2px', background: 'var(--surface-card)', alignItems: 'baseline' }}>
                <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                  {v.kind === 'call' ? 'Called' : 'Visited'} {v.householdLabel}
                </span>
                <span className="tabular" style={meta}>{formatShort(parseDate(v.visitedOn))} · {name(v.personId)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Note({ children }: { children: string }) {
  return <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>{children}</p>
}

const meta: React.CSSProperties = { font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const body: React.CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)' }
const field: React.CSSProperties = { minHeight: 40, background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 10, padding: '0 12px', font: '400 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }
