import { useState } from 'react'
import { BodyBadge, Button, Card, Eyebrow } from '../components/ui'
import { useData } from '../data/store'
import { repository } from '../data/repository'
import { useCare } from '../data/care/store'
import { HELP_KINDS, helpLabel } from '../data/care/types'
import type { HelpKind } from '../data/care/types'
import type { CareEntry } from '../data/types'
import { careDueBy, careWindow, firstName, personName } from '../lib/derive'
import { formatShort, parseDate, startOfToday } from '../lib/date'

/* The staff care surface, and the handoff (brief §3.3). Staff see a need;
   sometimes the right response is a deacon. "Ask a deacon" composes a
   request — household, kind of help, by when — in a form whose fields are
   the only things that travel. There is no button that copies an entry
   across, and no field the reason could be typed into. The translation from
   a circumstance to an action is done here, by the person who knows the
   situation, and not by a rule.

   The round trip closes below: done, on a date, by a man. Nothing else. */

export function Care() {
  const data = useData()
  const care = useCare()
  const [asking, setAsking] = useState<number | null>(null)
  const today = startOfToday()

  const entries = [...data.care].sort((a, b) => order(a.status) - order(b.status) || a.openedOn.localeCompare(b.openedOn))
  const requests = care.data?.requests ?? []
  const links = care.data?.links ?? []
  const names = care.data?.names ?? {}
  const name = (id: string | null) => (id ? names[id] ?? 'Someone' : '—')
  const thisSunday = new Date(today)
  thisSunday.setDate(today.getDate() - today.getDay())
  const week = care.data?.weeks.find((w) => w.weekOf === thisSunday.toLocaleDateString('en-CA')) ?? null

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <Card radius="card" pad="22px 24px" style={{ flex: '3 1 480px', minWidth: 0, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Eyebrow size="sm">Entries · staff role only</Eyebrow>
            <span className="tabular" style={meta}>{entries.filter((e) => e.status !== 'closed').length} open</span>
          </div>
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {entries.map((entry) => {
              const due = careDueBy(entry)
              const asked = requests.filter((r) => links.some((l) => l.requestId === r.id && l.careEntryId === repository.careEntryRef(entry.id)))
              return (
                <div key={entry.id} style={{ display: 'grid', gap: 6, padding: '14px 2px', background: 'var(--surface-card)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                      {entry.sensitive ? firstName(entry.person) : entry.person}
                      {entry.sensitive ? <span style={{ ...meta, marginLeft: 8 }}>sensitive · first name on lists</span> : null}
                    </span>
                    <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.16em', textTransform: 'uppercase', color: entry.status === 'closed' ? 'var(--text-muted)' : entry.status === 'touched' ? 'var(--mbc-yale-sage)' : 'var(--text-eyebrow)' }}>
                      {entry.status}
                    </span>
                  </div>
                  <span style={meta}>
                    {entry.type} · opened {formatShort(parseDate(entry.openedOn))} · {careWindow(entry)}
                    {due ? ' · respond by ' + formatShort(due) : ''}
                    {' · '}
                    {entry.ownerId === null ? 'unclaimed' : personName(data.people, entry.ownerId)}
                  </span>
                  {asked.map((r) => (
                    <span key={r.id} style={{ ...meta, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                      <BodyBadge bodies={['deacon-board']} />
                      {helpLabel(r.helpKind)} asked {formatShort(parseDate(r.createdAt))}
                      {r.status === 'open' ? ' · waiting for a deacon' : r.status === 'accepted' ? ' · ' + name(r.assignedTo) + ' has it' : ' · done ' + formatShort(parseDate(r.completedOn)) + ' by ' + name(r.assignedTo)}
                    </span>
                  ))}
                  {entry.status !== 'closed' && care.data ? (
                    asking === entry.id ? (
                      <AskForm
                        entry={entry}
                        onCancel={() => setAsking(null)}
                        onAsk={async (input) => {
                          const ok = await care.askDeacon({ ...input, careEntryId: repository.careEntryRef(entry.id) })
                          if (ok) setAsking(null)
                        }}
                      />
                    ) : (
                      <button type="button" onClick={() => setAsking(entry.id)} style={link}>Ask a deacon</button>
                    )
                  ) : null}
                </div>
              )
            })}
          </div>
        </Card>

        <div style={{ flex: '1 1 300px', display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>
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
          <Card tone="panel" radius="card" pad="22px 24px" style={{ display: 'grid', gap: 10 }}>
            <Eyebrow size="sm">What travels when you ask</Eyebrow>
            <p style={{ ...body, margin: 0 }}>
              The household’s name, the kind of help, by when, and your name. The entry itself, the reason it is needed and anything marked sensitive stay here. “Visit the Hendersons this week” travels; why does not, and there is no field it could be typed into.
            </p>
          </Card>
          {care.error ? <p style={{ ...meta, color: 'var(--text-eyebrow)', margin: 0 }}>{care.error}</p> : null}
        </div>
      </div>
    </div>
  )
}

function AskForm({ entry, onAsk, onCancel }: { entry: CareEntry; onAsk(input: { householdLabel: string; helpKind: HelpKind; neededBy: string | null }): Promise<void>; onCancel(): void }) {
  const [household, setHousehold] = useState(entry.person)
  const [kind, setKind] = useState<HelpKind>('visit')
  const [by, setBy] = useState('')
  return (
    <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-section)', borderRadius: 14, padding: '14px 16px', display: 'grid', gap: 10, maxWidth: '72ch' }}>
      <p style={{ ...meta, margin: 0 }}>What you are asking a deacon to do. This form is the whole handoff.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
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
        <BodyBadge bodies={['deacon-board']} />
      </div>
    </div>
  )
}

function order(status: CareEntry['status']): number {
  return status === 'open' ? 0 : status === 'touched' ? 1 : 2
}

const meta: React.CSSProperties = { font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const body: React.CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)' }
const link: React.CSSProperties = { background: 'none', border: 'none', padding: 0, font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer', textAlign: 'left' }
const label: React.CSSProperties = { display: 'grid', gap: 6, font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' }
const field: React.CSSProperties = { minHeight: 40, background: 'var(--surface-field)', border: '1px solid var(--mbc-border-input)', borderRadius: 10, padding: '0 12px', font: '400 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)', textTransform: 'none', letterSpacing: 0 }
