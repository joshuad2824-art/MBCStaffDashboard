import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BodyBadge, Button, Card, Eyebrow } from '../components/ui'
import { useMeetings } from '../data/meetings/store'
import { useStore } from '../data/store'
import { agendaFor, deaconYearLabel } from '../data/meetings/derive'
import { deriveYear, onAgenda, yearByMonth } from '../data/meetings/year'
import type { ObligationDerived } from '../data/meetings/year'
import { countDays, daysBetween, formatMonthTitle, formatShort, startOfToday } from '../lib/date'
import { SURFACES } from './surfaces'

/* The year (brief §3.3). Every dated obligation the bylaws and policies
   create, derived rather than typed: the rule is stored, the date is computed
   from its anchor and the Board's real meeting dates. Two views of the same
   list — what is coming, and the deacon year month by month — and one action:
   put an obligation on the agenda of the meeting it lands on. */

export function Year() {
  const { data, error, addAgendaItem } = useMeetings()
  const { say } = useStore()
  const navigate = useNavigate()
  const [view, setView] = useState<'ahead' | 'year'>('ahead')
  const today = startOfToday()

  if (error) return <Note>{error}</Note>
  if (!data) return <Note>Opening the year…</Note>

  const ahead = deriveYear(data.obligations, data.meetings, today)
  const soon = ahead.filter((d) => d.dueSoon)
  const months = yearByMonth(data.obligations, data.meetings, today, data.deaconYearStartMonth)
  const yearLabel = deaconYearLabel(today, data.deaconYearStartMonth)

  const putOnAgenda = async (d: ObligationDerived) => {
    if (!d.meeting) return
    const position = agendaFor(data.agenda, d.meeting).length + 1
    await addAgendaItem({
      meetingId: d.meeting.id,
      position,
      title: d.obligation.title,
      source: 'recurring',
      sourceRef: d.obligation.slug,
      notes: d.obligation.ruleSource + (d.nextDue && d.nextDue.getTime() !== new Date(d.meeting.meetsOn + 'T00:00').getTime() ? ' · due ' + formatShort(d.nextDue) : ''),
    })
    say('On the agenda for ' + formatShort(new Date(d.meeting.meetsOn + 'T00:00')) + '.')
  }

  const row = (d: ObligationDerived) => {
    const item = d.meeting ? onAgenda(data.agenda, d.meeting, d.obligation) : null
    const days = d.nextDue ? daysBetween(today, d.nextDue) : null
    return (
      <div key={d.obligation.id + (d.nextDue?.toISOString() ?? '')} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: '6px 18px', padding: '16px 2px', background: 'var(--surface-card)', alignItems: 'baseline' }}>
        <span className="tabular" style={{ font: '600 16px/1.3 var(--mbc-font-serif)', color: d.dueSoon ? 'var(--text-eyebrow)' : 'var(--text-heading)' }}>
          {d.nextDue ? formatShort(d.nextDue) : '—'}
        </span>
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', textWrap: 'pretty' } as React.CSSProperties}>{d.obligation.title}</span>
          <span style={meta}>
            {d.obligation.ruleSource}
            {days !== null ? ' · ' + (days === 0 ? 'today' : days > 0 ? 'in ' + countDays(days) : countDays(-days) + ' ago') : ''}
            {d.announceBy ? ' · on the mind by ' + formatShort(d.announceBy) : ''}
            {d.projected ? ' · meeting not yet scheduled; the usual second Sunday' : ''}
          </span>
          {d.obligation.requirement ? <span style={{ ...meta, color: 'var(--text-body)', maxWidth: '72ch' }}>{d.obligation.requirement}</span> : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <BodyBadge bodies={[d.obligation.ownerBodySlug]} />
            {d.meeting ? (
              item ? (
                <button type="button" onClick={() => navigate(`${SURFACES.meeting.path}/${d.meeting?.id}/agenda`)} style={link}>
                  On the {formatShort(new Date(d.meeting.meetsOn + 'T00:00'))} agenda
                </button>
              ) : d.meeting.status === 'held' ? (
                <span style={meta}>Meeting held</span>
              ) : (
                <button type="button" onClick={() => void putOnAgenda(d)} style={link}>
                  Put it on the {formatShort(new Date(d.meeting.meetsOn + 'T00:00'))} agenda
                </button>
              )
            ) : (
              <span style={meta}>No meeting scheduled for it yet</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <Card radius="card" pad="22px 24px" style={{ flex: '3 1 560px', minWidth: 0, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Eyebrow size="sm">{view === 'ahead' ? 'What is coming' : `The ${yearLabel} deacon year`}</Eyebrow>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant={view === 'ahead' ? 'primary' : 'outline'} size="sm" onClick={() => setView('ahead')}>Coming up</Button>
              <Button variant={view === 'year' ? 'primary' : 'outline'} size="sm" onClick={() => setView('year')}>Month by month</Button>
            </div>
          </div>

          {view === 'ahead' ? (
            <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>{ahead.map(row)}</div>
          ) : (
            <div style={{ display: 'grid', gap: 18 }}>
              {months.map(({ month, items }) => (
                <div key={month.toISOString()} style={{ display: 'grid', gap: 6 }}>
                  <h3 style={{ font: '600 18px/1.3 var(--mbc-font-serif)', color: month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth() ? 'var(--mbc-lamplight-deep)' : 'var(--text-heading)', margin: 0 }}>
                    {formatMonthTitle(month)}
                  </h3>
                  {items.length === 0 ? (
                    <p style={{ ...meta, margin: 0 }}>Nothing the bylaws date to this month beyond the regular meeting.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>{items.map(row)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div style={{ flex: '1 1 300px', display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>
          <Card tone="panel" radius="card" pad="22px 24px" style={{ display: 'grid', gap: 10 }}>
            <Eyebrow size="sm">On the mind now</Eyebrow>
            {soon.length === 0 ? (
              <p style={{ ...body, margin: 0 }}>Nothing is inside its notice window. The next date is {ahead[0]?.nextDue ? formatShort(ahead[0].nextDue) : '—'}.</p>
            ) : (
              soon.map((d) => (
                <p key={d.obligation.id} style={{ ...body, margin: 0 }}>
                  <span style={{ color: 'var(--text-heading)' }}>{d.obligation.title}</span> · {d.nextDue ? formatShort(d.nextDue) : ''} · {d.obligation.ruleSource}
                </p>
              ))
            )}
          </Card>
          <Card tone="panel" radius="card" pad="22px 24px" style={{ display: 'grid', gap: 10 }}>
            <Eyebrow size="sm">How this list is made</Eyebrow>
            <p style={{ ...body, margin: 0 }}>
              Each line is a rule the bylaws or a policy states, with its citation. The date is derived from the rule’s anchor and the Board’s meeting dates; nobody types it. The rules themselves are read in the reference and changed only by the administrator.
            </p>
            <button type="button" onClick={() => navigate(SURFACES.reference.path)} style={link}>Open the reference</button>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Note({ children }: { children: string }) {
  return <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>{children}</p>
}

const meta: React.CSSProperties = { font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }
const body: React.CSSProperties = { font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)' }
const link: React.CSSProperties = { background: 'none', border: 'none', padding: 0, font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer', textAlign: 'left' }
