import { Button, Eyebrow } from '../ui'
import { useData } from '../../data/store'
import { useSession } from '../../session/session'
import { deriveCadence, isUnclaimed, staffName } from '../../lib/derive'
import { dueWithin } from '../../lib/rollups'
import { formatDate, formatShort, startOfToday } from '../../lib/date'

/* The Monday meeting on a screen. Wins, tensions, what is due inside thirty
   days, and the ledger — at projection type sizes.

   Care pipelines and the discussion board are deliberately absent. Both hold
   named members' circumstances, and this view is pointed at a wall. Care
   response windows are left out of the due list here for the same reason. */

export function PresentMode() {
  const data = useData()
  const { presentMode, setPresentMode } = useSession()
  const today = startOfToday()

  if (!presentMode) return null

  const wins = data.huddle.filter((post) => post.col === 'win')
  const tensions = data.huddle.filter((post) => post.col === 'tension' && post.resolvedAt === null)
  const due = dueWithin(data, today, 30, false)
  const unclaimed = data.cadence.filter(isUnclaimed).length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--surface-page)',
        overflowY: 'auto',
        padding: 'clamp(28px,3vw,48px)',
      }}
    >
      <div style={{ maxWidth: 1560, margin: '0 auto', display: 'grid', gap: 34 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <Eyebrow>Monday · 9:00 AM</Eyebrow>
            <h1
              style={{
                font: '600 clamp(34px,4vw,54px)/1.05 var(--mbc-font-serif)',
                letterSpacing: '-.025em',
                color: 'var(--text-heading)',
                margin: '14px 0 0',
              }}
            >
              {formatDate(today)}
            </h1>
          </div>
          <Button variant="outline" onClick={() => setPresentMode(false)}>
            Close present mode
          </Button>
        </div>

        <div style={{ display: 'grid', gap: 26, gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
          <Column title="Wins" count={wins.length}>
            {wins.map((post) => (
              <Line key={post.id} body={post.body} meta={staffName(data.staff, post.authorId)} />
            ))}
          </Column>
          <Column title="Tensions" count={tensions.length}>
            {tensions.map((post) => (
              <Line key={post.id} body={post.body} meta={staffName(data.staff, post.authorId)} />
            ))}
          </Column>
        </div>

        <div>
          <SectionTitle>Due in the next thirty days</SectionTitle>
          <div style={{ display: 'grid', gap: 0 }}>
            {due.length === 0 ? (
              <p style={{ font: '400 19px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '18px 0 0' }}>
                Nothing enters its window in the next thirty days.
              </p>
            ) : (
              due.map((row) => (
                <div
                  key={row.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,150px) minmax(0,1fr) minmax(0,320px)',
                    gap: 24,
                    padding: '18px 0',
                    borderBottom: '1px solid var(--border-hairline)',
                    alignItems: 'baseline',
                  }}
                >
                  <span className="tabular" style={{ font: '600 22px/1 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>
                    {formatShort(row.date)}
                  </span>
                  <span style={{ font: '400 21px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                    {row.label}
                  </span>
                  <span style={{ font: '400 19px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{row.meta}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionTitle>
            Cadence ledger — {unclaimed} unclaimed of {data.cadence.length}
          </SectionTitle>
          <div>
            {data.cadence.map((item) => {
              const { lastHeld, nextDue } = deriveCadence(item)
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
                    gap: 24,
                    padding: '18px 0',
                    borderBottom: '1px solid var(--border-hairline)',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ font: '400 21px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                    {item.name}
                  </span>
                  <span style={{ font: '400 19px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                    {staffName(data.staff, item.ownerId)}
                  </span>
                  <span className="tabular" style={{ font: '400 19px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                    {lastHeld ? formatDate(lastHeld) : 'Never held'}
                  </span>
                  <span className="tabular" style={{ font: '400 19px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                    {nextDue ? formatDate(nextDue) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>
          Care pipelines and the discussion board are not shown here. Press escape to close.
        </p>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        font: '600 clamp(26px,2.4vw,34px)/1.15 var(--mbc-font-serif)',
        letterSpacing: '-.02em',
        color: 'var(--text-heading)',
        margin: '0 0 10px',
        paddingBottom: 14,
        borderBottom: '1px solid var(--border-section)',
      }}
    >
      {children}
    </h2>
  )
}

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <SectionTitle>
        {title} · {count}
      </SectionTitle>
      <div style={{ display: 'grid', gap: 0 }}>{children}</div>
    </div>
  )
}

function Line({ body, meta }: { body: string; meta: string }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-hairline)' }}>
      <p style={{ font: '400 21px/1.5 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>{body}</p>
      <p style={{ font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '8px 0 0' }}>{meta}</p>
    </div>
  )
}
