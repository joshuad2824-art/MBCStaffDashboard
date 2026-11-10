import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store'
import { useSession } from '../session/session'
import { useDisplayScale, useNarrow } from '../lib/displayScale'
import { useClock, useForecast } from '../lib/weather'
import { itemsForDay, monthGrid, nextOnCalendar } from '../lib/calendar'
import { currentWeek } from '../lib/communicator'
import { carePastWindow, unannouncedNotices, unclaimedCount } from '../lib/rollups'
import { gapsIn } from '../lib/serving'
import { firstName, personName } from '../lib/derive'
import { addDays, parseDate, relativeDay, sameDay, startOfToday, toIso, todayIso } from '../lib/date'
import { reaches } from '../lib/audience'
import { useUnreadThreadIds } from '../lib/unread'
import { Announcements } from './discussion/Announcements'
import { Forecast } from './today/Forecast'
import { useCanOpen } from './useSurfaces'
import { SURFACES } from './surfaces'
import type { DashboardData } from '../data/types'

/* Today at Memorial, as a board of tiles (October 2026 redesign). Every tile
   wears the colour of the room it opens, so after a week the eye finds things
   by colour without being told. Nothing here is stored: every count is derived
   from the same records the rooms show.

   Home never points at a room that is off (home brief §1.3). A tile, or a row
   inside one, names the surface it opens, and `Tile` / `TileRow` ask
   `canOpen()` before drawing anything — so the next page switched off takes
   its tile with it, and no caller has to remember. Since 10 November 2026 that
   has taken the Huddle, the bulletin and Deacon of the Week tiles off the
   board, and Cadence, the Notice log and Care out of Waiting on someone. */

export function Today() {
  const data = useData()
  const { member, viewAs } = useSession()
  const canOpen = useCanOpen()
  const narrow = useNarrow()
  const { width } = useDisplayScale()
  const medium = !narrow && width < 1180
  const today = startOfToday()
  const staffRole = viewAs === 'staff'
  const talk = canOpen('discussion')
  const live = data.announcements.some((item) => reaches(item.audience, 'staff') && item.expiresOn >= todayIso())

  return (
    <div style={{ display: 'grid', gap: narrow ? 20 : 30 }}>
      <Masthead data={data} today={today} name={member ? firstName(member.name) : ''} narrow={narrow} />
      <div className="board" data-narrow={narrow ? '' : undefined} data-medium={medium ? '' : undefined}>
        <NowTile data={data} today={today} span={3} compact={narrow} />
        <WaitingTile data={data} today={today} span={5} />
        <MonthTile data={data} today={today} span={4} />
        <ScheduleTile data={data} today={today} staffRole={staffRole} span={talk ? 7 : 12} />
        <DiscussionTile data={data} today={today} span={5} />
        {live ? (
          <div style={{ gridColumn: 'span 12', minWidth: 0 }} data-wide="">
            <Announcements side="staff" />
          </div>
        ) : null}
        <div style={{ gridColumn: 'span 12', minWidth: 0 }} data-wide="">
          <Forecast />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- masthead */

function Masthead({ data, today, name, narrow }: { data: DashboardData; today: Date; name: string; narrow: boolean }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const week = currentWeek(data.weeks, today)
  const dateLine = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).replace(',', ' ·')

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: narrow ? 18 : '20px 48px' }}>
      <div>
        <p className="tile-label" style={{ color: 'var(--text-eyebrow)' }}>{dateLine}</p>
        <p style={{ margin: '12px 0 0', font: `500 ${narrow ? 32 : 50}px/1.04 var(--mbc-font-serif)`, letterSpacing: '-.025em', color: 'var(--text-heading)' }}>
          {greeting}
          {name ? `, ${name}` : ''}.
        </p>
      </div>
      {week && (week.sermonTitle || week.scripture) ? (
        <figure style={{ margin: 0, maxWidth: 470, paddingLeft: narrow ? 0 : 28, borderLeft: narrow ? 'none' : '1px solid var(--border-section)' }}>
          <p style={{ margin: 0, font: 'italic 400 21px/1.45 var(--mbc-font-serif)', color: 'var(--text-scripture)' }}>{week.sermonTitle || week.series}</p>
          <figcaption className="tile-label" style={{ marginTop: 10, color: 'var(--text-meta)', fontSize: 10 }}>
            {[week.scripture, 'Sunday’s text'].filter(Boolean).join(' · ')}
          </figcaption>
        </figure>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------ the tiles */

function NowTile({ data, today, span, compact }: { data: DashboardData; today: Date; span: number; compact: boolean }) {
  const clock = useClock()
  const { days } = useForecast()
  const next = nextOnCalendar(data, today)
  const [time, meridiem] = clock.split(' ')
  const weather = days.find((day) => sameDay(parseDate(day.date) ?? today, today)) ?? days[0]
  const nextLine = next ? (sameDay(next.when, today) ? `${next.name} at ${next.time}.` : `Next: ${next.name}, ${relativeDay(next.when, today)}.`) : 'Nothing on the calendar for a while.'

  return (
    <Tile
      label="Right now"
      heading={false}
      span={span}
      style={{
        background: 'var(--tile-home)',
        color: 'var(--tile-home-ink)',
        border: '2px solid var(--tile-home-edge)',
        borderRadius: '260px 260px 22px 22px',
        padding: compact ? '62px 20px 20px' : '104px 24px 26px',
        gap: compact ? 8 : 12,
        alignItems: 'center',
        textAlign: 'center',
        minHeight: compact ? 0 : 360,
      }}
    >
      <p className="tile-label" style={{ color: 'var(--tile-home-accent)' }}>Right now</p>
      <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="tabular" style={{ font: `600 ${compact ? 54 : 66}px/0.95 var(--mbc-font-serif)`, letterSpacing: '-.03em' }}>{time}</span>
        <span style={{ font: '700 13px/1 var(--mbc-font-sans)', letterSpacing: '.14em', color: 'var(--tile-home-accent)' }}>{meridiem}</span>
      </p>
      <p style={{ margin: 0, font: '400 17px/1.45 var(--mbc-font-sans)' }}>{nextLine}</p>
      <span aria-hidden="true" style={{ marginTop: compact ? 4 : 'auto', width: 40, height: 1, background: 'var(--tile-home-accent)' }} />
      {weather ? (
        <p className="tabular" style={{ margin: 0, font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)' }}>
          {weather.high}° and {weather.condition.toLowerCase()}
          {weather.precipitation >= 40 ? ` · ${weather.precipitation}% rain` : ''}
        </p>
      ) : null}
    </Tile>
  )
}

function WaitingTile({ data, today, span }: { data: DashboardData; today: Date; span: number }) {
  const canOpen = useCanOpen()
  const rows: { label: string; count: () => number; of?: number; opens: string; lamp: string }[] = [
    { label: 'Recurring commitments with no owner', count: () => unclaimedCount(data.cadence), of: data.cadence.length, opens: 'cadence', lamp: 'var(--room-work)' },
    { label: 'Care entries past their window', count: () => carePastWindow(data.care, today).length, opens: 'care', lamp: 'var(--room-people)' },
    { label: 'Decisions not yet announced', count: () => unannouncedNotices(data).length, opens: 'notice', lamp: 'var(--room-work)' },
    { label: 'Groups with no leader named', count: () => gapsIn(data).length, opens: 'ministries', lamp: 'var(--room-people)' },
  ]
  /* The rows that would land, counted once. A row whose room is off is not a
     zero; it is not there. */
  const shown = rows.filter((row) => canOpen(row.opens)).map((row) => ({ ...row, n: row.count() }))
  const waiting = shown.filter((row) => row.n > 0)
  const words = ['Nothing', 'One thing needs', 'Two things need', 'Three things need', 'Four things need']

  return (
    <Tile label="Waiting on someone" span={span} drawn={shown.length > 0} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-card)', paddingBottom: 12 }} labelColour="var(--text-category)">
      <p style={{ margin: '0 0 6px', font: '600 26px/1.15 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)' }}>
        {waiting.length === 0 ? 'Every commitment has a name beside it.' : `${words[waiting.length] ?? waiting.length + ' things need'} a name beside them.`}
      </p>
      <div>
        {shown.map((row) => (
          <TileRow key={row.label} opens={row.opens}>
            <span className="lamp-sm" style={{ background: row.lamp }} aria-hidden="true" />
            <span style={{ flex: 1 }}>{row.label}</span>
            <span className="tabular" style={{ font: '600 20px/1 var(--mbc-font-serif)', whiteSpace: 'nowrap', color: row.n ? 'var(--text-heading)' : 'var(--text-muted)' }}>
              {row.n}
              {row.of !== undefined ? <span style={{ font: '400 14px var(--mbc-font-sans)', color: 'var(--text-meta)' }}> of {row.of}</span> : null}
              <span style={{ color: 'var(--text-link)', marginLeft: 8 }} aria-hidden="true">→</span>
            </span>
          </TileRow>
        ))}
      </div>
    </Tile>
  )
}

function MonthTile({ data, today, span }: { data: DashboardData; today: Date; span: number }) {
  const navigate = useNavigate()
  const grid = monthGrid(today)
  const weeks = grid[35] && grid[35].getMonth() === today.getMonth() ? grid : grid.slice(0, 35)
  const busy = (day: Date) => itemsForDay(data, day, false).some((item) => item.source === 'event' || item.source === 'service')
  const month = today.toLocaleDateString('en-US', { month: 'long' })

  return (
    <Tile label="This month" heading={false} opens="calendar" span={span} style={{ background: 'var(--tile-time)', color: 'var(--tile-time-ink)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ font: '600 24px/1 var(--mbc-font-serif)' }}>{month}</span>
        <button type="button" className="tile-link" style={{ marginTop: 0, fontSize: 14, textDecoration: 'none' }} onClick={() => navigate(SURFACES.calendar.path)}>
          Open the calendar →
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', textAlign: 'center', rowGap: 2 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.12em', color: 'var(--tile-time-soft)', padding: '4px 0 10px' }}>
            {d}
          </span>
        ))}
        {weeks.map((day) => {
          const inMonth = day.getMonth() === today.getMonth()
          const isToday = sameDay(day, today)
          return (
            <span key={toIso(day)} style={{ height: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <span
                className="tabular"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  background: isToday ? 'var(--tile-time-ink)' : 'transparent',
                  color: isToday ? 'var(--tile-time)' : 'var(--tile-time-ink)',
                  font: `${isToday ? 700 : 400} 14px/1 var(--mbc-font-sans)`,
                  opacity: inMonth ? 1 : 0.45,
                }}
              >
                {day.getDate()}
              </span>
              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 999, background: inMonth && !isToday && busy(day) ? 'var(--tile-time-soft)' : 'transparent' }} />
            </span>
          )
        })}
      </div>
    </Tile>
  )
}

const MINISTRY_DOT: Record<string, string> = {
  adults: 'var(--ministry-adults)',
  students: 'var(--ministry-students)',
  children: 'var(--ministry-children)',
  preschool: 'var(--ministry-preschool)',
  music: 'var(--ministry-music)',
  men: 'var(--ministry-men)',
  women: 'var(--ministry-women)',
}

function MinistryDot({ ministry }: { ministry: string }) {
  const colour = MINISTRY_DOT[ministry.toLowerCase()]
  return colour ? (
    <span className="dot" style={{ background: colour }} aria-hidden="true" />
  ) : (
    <span className="dot" style={{ border: '2px solid var(--text-heading)' }} aria-hidden="true" />
  )
}

function ScheduleTile({ data, today, staffRole, span }: { data: DashboardData; today: Date; staffRole: boolean; span: number }) {
  const todays = itemsForDay(data, today, staffRole).slice(0, 3)
  const horizon = toIso(addDays(today, 35))
  const upcoming = data.events
    .filter((event) => event.audience.includes('staff') && event.startsAt > toIso(today) && event.startsAt <= horizon)
    .sort((a, b) => (a.startsAt + a.time).localeCompare(b.startsAt + b.time))
    .slice(0, 4)

  return (
    <Tile label="Today and coming up" heading={false} opens="calendar" span={span} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-card)' }}>
      <p className="tile-label" style={{ color: 'var(--room-calendar)' }}>Today</p>
      {todays.length === 0 ? (
        <p style={{ margin: '0 0 8px', font: '400 16px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Nothing on the calendar today.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
          {todays.map((item) => (
            <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '78px 1fr', gap: 14, alignItems: 'baseline' }}>
              <span className="tabular" style={{ font: '600 16px/1.3 var(--mbc-font-serif)', color: 'var(--room-calendar)' }}>{item.slot}</span>
              <span style={{ font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
      <p className="tile-label" style={{ color: 'var(--room-calendar)', marginTop: 4 }}>Coming up</p>
      {upcoming.length === 0 ? (
        <p style={{ margin: 0, font: '400 16px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Nothing entered for the next five weeks.</p>
      ) : (
        <div>
          {upcoming.map((event) => {
            const when = parseDate(event.startsAt) ?? today
            const shared = event.audience.includes('deacon-board')
            return (
              <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '78px 1fr', gap: 14, padding: '12px 0', borderTop: '1px solid var(--border-hairline)', alignItems: 'baseline' }}>
                <span className="tabular" style={{ font: '600 15px/1.3 var(--mbc-font-serif)', color: 'var(--room-calendar)' }}>
                  {when.getMonth() === today.getMonth() ? when.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + when.getDate() : when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-heading)', minWidth: 0 }}>
                  <MinistryDot ministry={event.ministry} />
                  <span>
                    {event.name}
                    <span style={{ color: 'var(--text-meta)' }}>
                      {' · '}
                      {event.ministry === 'All' ? 'Whole church' : event.ministry}
                      {event.time ? ' · ' + event.time : ''}
                      {shared ? ' · with the Board' : ''}
                    </span>
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Tile>
  )
}

function DiscussionTile({ data, today, span }: { data: DashboardData; today: Date; span: number }) {
  const navigate = useNavigate()
  const { member } = useSession()
  const threads = useMemo(
    () => data.threads.filter((thread) => reaches(thread.audience, 'staff')).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity)),
    [data.threads],
  )
  const unread = useUnreadThreadIds(member?.id ?? null, threads).length

  return (
    <Tile label="Discussion" heading={false} opens="discussion" span={span} style={{ background: 'var(--tile-tint)', color: 'var(--tile-tint-ink)', paddingBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p className="tile-label" style={{ color: 'var(--tile-tint-label)' }}>Discussion</p>
        {unread > 0 ? <span className="tabular" style={{ font: '700 13px/1 var(--mbc-font-sans)', color: 'var(--tile-tint-label)' }}>{unread} new</span> : null}
      </div>
      {threads.length === 0 ? (
        <p style={{ margin: 0, font: '400 16px/1.5 var(--mbc-font-sans)' }}>A quiet board. Start a thread when something needs talking through.</p>
      ) : (
        <div>
          {threads.slice(0, 3).map((thread) => (
            <button key={thread.id} type="button" className="tile-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderColor: 'var(--tile-tint-rule)', color: 'inherit' }} onClick={() => navigate(SURFACES.discussion.path)}>
              <span style={{ font: '600 18px/1.3 var(--mbc-font-serif)' }}>{thread.subject}</span>
              <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                {personName(data.people, thread.createdBy)} · {relativeDay(parseDate(thread.lastActivity) ?? today, today)}
              </span>
            </button>
          ))}
        </div>
      )}
    </Tile>
  )
}

/* ------------------------------------------------------- tile and row */

/** One tile on the board. `opens` names the SURFACES key the tile leads to;
    when that surface would not open for this person — switched off, or not
    theirs — the tile is not drawn at all. The check lives here so that no
    caller can forget it (home brief §1.3). `drawn` lets a tile with nothing to
    show stand down the same way. `heading` draws the label as the tile's
    eyebrow; tiles that set their own eyebrows inside pass false. */
function Tile({
  label,
  span,
  style,
  opens,
  drawn = true,
  heading = true,
  labelColour,
  children,
}: {
  label: string
  span: number
  style: CSSProperties
  opens?: string
  drawn?: boolean
  heading?: boolean
  labelColour?: string
  children: ReactNode
}) {
  const canOpen = useCanOpen()
  if (!drawn || (opens && !canOpen(opens))) return null
  return (
    <section aria-label={label} className="tile" style={{ gridColumn: `span ${span}`, ...style }}>
      {heading ? (
        <p className="tile-label" style={labelColour ? { color: labelColour } : undefined}>
          {label}
        </p>
      ) : null}
      {children}
    </section>
  )
}

/** A row inside a tile that opens a surface. The same rule as `Tile`: a row
    whose surface would not open is not drawn. */
function TileRow({ opens, children }: { opens: string; children: ReactNode }) {
  const navigate = useNavigate()
  const canOpen = useCanOpen()
  const surface = SURFACES[opens]
  if (!surface || !canOpen(opens)) return null
  return (
    <button type="button" className="tile-row" onClick={() => navigate(surface.path)}>
      {children}
    </button>
  )
}
