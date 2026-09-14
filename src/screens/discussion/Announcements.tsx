import { useState } from 'react'
import { BodyBadge, Button, Card, Rule } from '../../components/ui'
import { useData, useStore } from '../../data/store'
import { useSession } from '../../session/session'
import type { Side } from '../../session/session'
import { composedAudience, otherRoom, reaches, roomOf } from '../../lib/audience'
import { nextId, personName } from '../../lib/derive'
import { formatShort, parseDate, startOfToday, todayIso, toIso, addDays } from '../../lib/date'

/* Short-lived, audience-scoped, authored by either side. A deacon announcement
   to staff and a staff announcement to deacons are the same feature
   (mbc-deacons-dashboard-brief.md §3.1). One shows until the day it expires
   and is purged fourteen days after that, like the board. The author may take
   it down; nobody else may, and that is a policy, not a hidden button. */

const DAYS = [7, 14, 30]

export function Announcements({ side, compose = false }: { side: Side; compose?: boolean }) {
  const data = useData()
  const { mutate } = useStore()
  const { member, bodies } = useSession()
  const [body, setBody] = useState('')
  const [days, setDays] = useState(14)
  const [alsoOther, setAlsoOther] = useState(false)
  const [open, setOpen] = useState(false)

  const room = roomOf(side)
  const other = otherRoom(side)
  const canWiden = bodies.includes(other)
  const today = todayIso()
  const live = data.announcements
    .filter((item) => reaches(item.audience, room) && item.expiresOn >= today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (!member) return null
  if (live.length === 0 && !compose) return null

  const post = () => {
    const text = body.trim()
    if (!text) return
    const audience = composedAudience(side, canWiden && alsoOther)
    setBody('')
    setAlsoOther(false)
    setOpen(false)
    mutate(audience.length > 1 ? 'Announced to both sides.' : 'Announced.', (current) => ({
      ...current,
      announcements: [
        ...current.announcements,
        {
          id: nextId(current.announcements),
          body: text,
          audience,
          authorId: member.id,
          createdAt: today,
          expiresOn: toIso(addDays(startOfToday(), days)),
        },
      ],
    }))
  }

  const takeDown = (id: number) =>
    mutate('Took an announcement down.', (current) => ({
      ...current,
      announcements: current.announcements.filter((item) => item.id !== id),
    }))

  return (
    <Card radius="card" pad={22} style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span
          style={{
            font: '700 11px/1 var(--mbc-font-sans)',
            letterSpacing: 'var(--mbc-track-label)',
            textTransform: 'uppercase',
            color: 'var(--text-eyebrow)',
          }}
        >
          Announcements
        </span>
        {compose ? (
          <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? 'Never mind' : 'Announce something'}
          </Button>
        ) : null}
      </div>
      <Rule tone="hair" />

      {live.length === 0 ? (
        <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>
          Nothing announced at the moment.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {live.map((item) => (
            <div key={item.id} style={{ display: 'grid', gap: 6, paddingBottom: 12, borderBottom: '1px solid var(--border-hairline)' }}>
              <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0, maxWidth: '82ch' }}>
                {item.body}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                  {personName(data.people, item.authorId)} ·{' '}
                  <span className="tabular">{formatShort(parseDate(item.createdAt))}</span> · until{' '}
                  <span className="tabular">{formatShort(parseDate(item.expiresOn))}</span>
                </span>
                <BodyBadge bodies={item.audience} />
                {item.authorId === member.id ? (
                  <button
                    type="button"
                    onClick={() => takeDown(item.id)}
                    style={{ background: 'none', border: 'none', padding: 0, font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer' }}
                  >
                    Take it down
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div style={{ display: 'grid', gap: 10, maxWidth: '82ch' }}>
          <textarea
            value={body}
            rows={3}
            placeholder={side === 'deacon' ? 'Something the Board should know this week.' : 'Something the staff should know this week.'}
            onChange={(event) => setBody(event.target.value)}
            style={{
              width: '100%',
              resize: 'vertical',
              background: 'var(--surface-field)',
              border: '1px solid var(--mbc-border-panel)',
              borderRadius: 'var(--mbc-radius-input)',
              padding: '12px 14px',
              font: '400 15px/1.55 var(--mbc-font-sans)',
              color: 'var(--text-heading)',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <label style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Shows for
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                style={{ font: '400 13px/1.3 var(--mbc-font-sans)', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--mbc-border-panel)', background: 'var(--surface-field)', color: 'var(--text-heading)' }}
              >
                {DAYS.map((n) => (
                  <option key={n} value={n}>
                    {n} days
                  </option>
                ))}
              </select>
            </label>
            {canWiden ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', cursor: 'pointer' }}>
                <input type="checkbox" checked={alsoOther} onChange={(event) => setAlsoOther(event.target.checked)} />
                {other === 'staff' ? 'Also the staff' : 'Also the Board'}
              </label>
            ) : null}
            <BodyBadge bodies={composedAudience(side, canWiden && alsoOther)} />
          </div>
          {canWiden && alsoOther ? (
            <p style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--mbc-yale-sage)', margin: 0 }}>
              Both sides will read this. Say it the way you would say it in either room.
            </p>
          ) : null}
          <Button variant="outline" size="sm" disabled={body.trim().length === 0} onClick={post} style={{ justifySelf: 'start' }}>
            Announce
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
