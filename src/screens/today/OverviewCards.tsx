import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Rule } from '../../components/ui'
import { CARE_TYPES } from '../../data/seed'
import { useData } from '../../data/store'
import { useSession } from '../../session/session'
import { staffName, threadForgetsIn } from '../../lib/derive'
import { dueWithin, medianGapByMonth, openCare, unannouncedNotices } from '../../lib/rollups'
import type { DueRow } from '../../lib/rollups'
import { countDays, formatShort, monthKey, startOfToday } from '../../lib/date'
import type { DashboardData } from '../../data/types'

/** Five cards, each a summary of one surface with one way through to it. */
export function OverviewCards() {
  const data = useData()
  const { viewAs } = useSession()
  const today = startOfToday()
  const staffOnly = viewAs === 'staff'

  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(298px, 1fr))' }}>
      <DueCard days={30} rows={dueWithin(data, today, 30, staffOnly)} />
      <NoticeCard data={data} today={today} />
      {staffOnly ? <CareCard data={data} /> : null}
      {staffOnly ? <DiscussionCard data={data} today={today} /> : null}
      <HuddleCard data={data} />
    </div>
  )
}

/** The page's second dark band, and the last one — two is the limit. */
function DueCard({ days, rows }: { days: number; rows: DueRow[] }) {
  const navigate = useNavigate()
  const unclaimed = rows.filter((row) => row.unclaimed).length

  return (
    <Card tone="dark" radius="card" pad={24} style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <span
            style={{
              font: '700 10px/1 var(--mbc-font-sans)',
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'var(--text-on-dark-accent)',
            }}
          >
            Due in {days} days
          </span>
          <span className="tabular" style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)' }}>
            {unclaimed} unclaimed
          </span>
        </div>
        <Rule tone="dark" />
      </div>

      {rows.length === 0 ? (
        <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)', margin: 0 }}>
          Nothing enters its window in the next {days} days.
        </p>
      ) : (
        <div style={{ display: 'grid' }}>
          {rows.slice(0, 6).map((row) => (
            <div key={row.key} style={{ padding: '11px 0', borderBottom: '1px solid var(--border-dark)' }}>
              <p style={{ font: '400 14px/1.45 var(--mbc-font-sans)', color: 'var(--text-on-dark)', margin: 0 }}>
                {row.label}
              </p>
              <p
                className="tabular"
                style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)', margin: '4px 0 0' }}
              >
                {formatShort(row.date)} · {row.meta}
              </p>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghostDark" size="sm" style={{ justifySelf: 'start' }} onClick={() => navigate('/cadence')}>
        Open the cadence ledger
      </Button>
    </Card>
  )
}

/* Sage at or under the seven-day standard, lamplight over it. No red anywhere —
   the height of the bar is the argument. */
function NoticeCard({ data, today }: { data: DashboardData; today: Date }) {
  const navigate = useNavigate()
  const months = medianGapByMonth(data)
  const highest = Math.max(1, ...months.map((month) => month.median ?? 0))
  const thisMonth = months.find((month) => month.month === monthKey(today))
  const unannounced = unannouncedNotices(data).length

  return (
    <SurfaceCard title="Notice log" action="Open the notice log" onAction={() => navigate('/notice')}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: 104 }}>
        {months.map((month) => {
          const value = month.median ?? 0
          return (
            <div key={month.month} style={{ display: 'grid', gap: 6, justifyItems: 'center', flex: 1 }}>
              <span className="tabular" style={{ font: '400 11px/1 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                {value}
              </span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 34,
                  height: 10 + (value / highest) * 62,
                  borderRadius: '6px 6px 0 0',
                  background: value <= 7 ? 'var(--mbc-yale-sage)' : 'var(--mbc-lamplight)',
                }}
              />
              <span
                style={{
                  font: '700 10px/1 var(--mbc-font-sans)',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                {month.label}
              </span>
            </div>
          )
        })}
      </div>
      <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
        {thisMonth && thisMonth.median !== null
          ? 'This month the median gap between deciding and telling people is ' + countDays(thisMonth.median) + '. '
          : 'Nothing has been decided and announced yet this month. '}
        {unannounced} {unannounced === 1 ? 'decision has' : 'decisions have'} not been announced at all.
      </p>
    </SurfaceCard>
  )
}

function CareCard({ data }: { data: DashboardData }) {
  const navigate = useNavigate()
  const open = openCare(data.care)

  return (
    <SurfaceCard title="Care pipelines" action="Open care pipelines" onAction={() => navigate('/care')}>
      <div style={{ display: 'grid' }}>
        {CARE_TYPES.map((type) => (
          <div
            key={type.name}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <span style={{ font: '400 14px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{type.name}</span>
            <span className="tabular" style={{ font: '400 13px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
              {open.filter((entry) => entry.type === type.name).length} open · {type.window}
            </span>
          </div>
        ))}
      </div>
    </SurfaceCard>
  )
}

function DiscussionCard({ data, today }: { data: DashboardData; today: Date }) {
  const navigate = useNavigate()

  return (
    <SurfaceCard title="Discussion board" action="Open the discussion board" onAction={() => navigate('/discussion')}>
      <div style={{ display: 'grid' }}>
        {data.threads.length === 0 ? (
          <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
            Nothing on the board. Everything has aged out.
          </p>
        ) : (
          data.threads.map((thread) => (
            <div key={thread.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-hairline)' }}>
              <p style={{ font: '400 14px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
                {thread.subject}
              </p>
              <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '4px 0 0' }}>
                forgets in {countDays(Math.max(threadForgetsIn(thread, today), 0))}
              </p>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  )
}

function HuddleCard({ data }: { data: DashboardData }) {
  const navigate = useNavigate()
  const tensions = data.huddle
    .filter((post) => post.col === 'tension' && post.resolvedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3)
  const wins = data.huddle.filter((post) => post.col === 'win').length
  const fyis = data.huddle.filter((post) => post.col === 'fyi').length

  return (
    <SurfaceCard tone="panel" title="Huddle" action="Open the Huddle" onAction={() => navigate('/huddle')}>
      <div style={{ display: 'grid' }}>
        {tensions.map((post) => (
          <div key={post.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-section)' }}>
            <p style={{ font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
              {post.body}
            </p>
            <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '4px 0 0' }}>
              {staffName(data.staff, post.authorId)}
            </p>
          </div>
        ))}
      </div>
      <p className="tabular" style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
        {wins} wins · {fyis} FYIs this fortnight
      </p>
    </SurfaceCard>
  )
}

function SurfaceCard({
  title,
  action,
  onAction,
  tone = 'paper',
  children,
}: {
  title: string
  action: string
  onAction(): void
  tone?: 'paper' | 'panel'
  children: ReactNode
}) {
  return (
    <Card tone={tone} radius="card" pad={24} style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <span
          style={{
            font: '700 10px/1 var(--mbc-font-sans)',
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: 'var(--text-eyebrow)',
          }}
        >
          {title}
        </span>
        <Rule tone={tone === 'panel' ? 'section' : 'hair'} />
      </div>
      {children}
      <Button variant="outline" size="sm" style={{ justifySelf: 'start' }} onClick={onAction}>
        {action}
      </Button>
    </Card>
  )
}
