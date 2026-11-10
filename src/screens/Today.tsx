import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store'
import { useSession } from '../session/session'
import { useDisplayScale, useNarrow } from '../lib/displayScale'
import { WEATHER_URL, untilTime, useClock, useWeather } from '../lib/weather'
import type { Weather, WeatherAlert } from '../lib/weather'
import { itemsForDay } from '../lib/calendar'
import type { CalendarItem } from '../lib/calendar'
import { carePastWindow, unannouncedNotices, unclaimedCount } from '../lib/rollups'
import { gapsIn } from '../lib/serving'
import { addDays, formatMonthTitle, parseDate, sameDay, startOfToday, toIso, todayIso } from '../lib/date'
import { reaches } from '../lib/audience'
import { useUnreadThreadIds } from '../lib/unread'
import { MonthGrid, MonthNav, useMonthPager } from '../components/month/Month'
import { Announcements } from './discussion/Announcements'
import { useCanOpen } from './useSurfaces'
import { SURFACES } from './surfaces'
import type { DashboardData } from '../data/types'

/* Home (home brief §2). The page that is up on a staff member's monitor all
   day: glanceable across the room, readable up close, and every tile answers
   either "what's happening" or "what needs me". Field Notes is the reference
   for how clean — a handful of large tiles, each doing one thing, each a
   different colour, an eyebrow and nothing else. No greeting, no lead.

   Every tile wears the colour of the room it opens. Nothing here is stored:
   every count is derived from the records the rooms show.

   Home never points at a room that is off (§1.3). A tile, or a row inside one,
   names the surface it opens, and `Tile` / `TileRow` ask `canOpen()` before
   drawing anything — so the next page switched off takes its tile with it, and
   no caller has to remember. Tiles for what is not built yet (Post a need,
   Church family, News) arrive with their workstreams through the same door.

   The one interruption Home allows is severe weather: an NWS watch or warning
   for Tulsa County turns the Weather tile into the warning and runs a band
   across the top. Severity is carried by words, weight and position, never by
   colour alone; there is no status red. */

export function Home() {
  const data = useData()
  const weather = useWeather()
  const narrow = useNarrow()
  const { width } = useDisplayScale()
  const medium = !narrow && width < 1180
  const today = startOfToday()
  const live = data.announcements.some((item) => reaches(item.audience, 'staff') && item.expiresOn >= todayIso())

  const band = weather.alerts.length > 0 ? <SevereBand alerts={weather.alerts} /> : null
  const announcements = live ? (
    <div style={{ gridColumn: 'span 12', minWidth: 0 }} data-wide="">
      <Announcements side="staff" />
    </div>
  ) : null

  /* Phone: one column in priority order (§2.2) — Date and Weather side by
     side, then what is waiting, the days, the month, the pages. */
  if (narrow) {
    return (
      <div className="board" data-narrow="">
        {band}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, minWidth: 0 }}>
          <DateTile today={today} span={1} compact />
          <WeatherTile weather={weather} span={1} compact />
        </div>
        <WaitingTile data={data} today={today} span={12} />
        <ScheduleTile data={data} today={today} span={12} />
        <MonthTile data={data} span={12} />
        <PagesTile data={data} span={12} />
        {announcements}
      </div>
    )
  }

  return (
    <div className="board" data-medium={medium ? '' : undefined}>
      {band}
      <DateTile today={today} span={2} />
      <ScheduleTile data={data} today={today} span={4} />
      <MonthTile data={data} span={3} />
      <WeatherTile weather={weather} span={3} />
      <WaitingTile data={data} today={today} span={7} />
      <PagesTile data={data} span={5} />
      {announcements}
    </div>
  )
}

/** The surface is still `today` (its path and key), and Home is its name. */
export const Today = Home

/* --------------------------------------------------------------- the date */

function DateTile({ today, span, compact = false }: { today: Date; span: number; compact?: boolean }) {
  const clock = useClock()
  return (
    <Tile
      label="Today’s date"
      heading={false}
      span={span}
      style={{ background: 'var(--tile-home)', color: 'var(--tile-home-ink)', border: '2px solid var(--tile-home-edge)', padding: compact ? '20px 18px' : undefined, gap: compact ? 4 : 6 }}
    >
      <p className="tile-label" style={{ color: 'var(--tile-home-accent)', fontSize: 13 }}>
        {today.toLocaleDateString('en-US', { weekday: 'short' })}
      </p>
      <p className="tabular" style={{ margin: 0, font: `600 ${compact ? 56 : 76}px/0.95 var(--mbc-font-serif)`, letterSpacing: '-.03em' }}>
        {today.getDate()}
      </p>
      <p className="tile-label" style={{ color: 'var(--tile-home-ink)', fontSize: 13 }}>
        {today.toLocaleDateString('en-US', { month: 'short' })} {today.getFullYear()}
      </p>
      <p className="tabular" style={{ margin: compact ? '8px 0 0' : 'auto 0 0', font: '400 17px/1.3 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)' }}>
        {clock}
      </p>
    </Tile>
  )
}

/* ------------------------------------------------------ today, coming up */

/** What happens on a day, as Home tells it: the standing services and the
    events addressed to the staff. Derived dates from rooms that are off
    (the ledger) and pastoral rows (care) are not Home's to show. */
function happening(data: DashboardData, day: Date): CalendarItem[] {
  return itemsForDay(data, day, false).filter((item) => item.source === 'service' || item.source === 'event')
}

function ScheduleTile({ data, today, span }: { data: DashboardData; today: Date; span: number }) {
  const navigate = useNavigate()
  const open = (day: Date) => navigate(`${SURFACES.calendar.path}?day=${toIso(day)}`)
  const todays = happening(data, today)

  /* The next several days that have something entered on them — the standing
     services happen every week and would crowd out what is news. */
  const coming = useMemo(() => {
    const days: { day: Date; items: CalendarItem[] }[] = []
    for (let offset = 1; offset <= 21 && days.length < 5; offset++) {
      const day = addDays(today, offset)
      const items = itemsForDay(data, day, false).filter((item) => item.source === 'event')
      if (items.length) days.push({ day, items })
    }
    return days
  }, [data, today])

  return (
    <Tile label="Today and coming up" heading={false} opens="calendar" span={span} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-card)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '22px 28px', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <button type="button" onClick={() => open(today)} className="tile-label" style={{ ...bare, color: 'var(--room-calendar)' }}>
            Today
          </button>
          {/* The vertical rail: today's day, in the calendar's colour. */}
          <div style={{ display: 'grid', gap: 12, paddingLeft: 14, borderLeft: '4px solid var(--room-calendar)' }}>
            {todays.length === 0 ? (
              <p style={{ margin: 0, font: '400 17px/1.45 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Nothing on the calendar today.</p>
            ) : (
              todays.map((item) => (
                <div key={item.key} style={{ display: 'grid', gap: 2 }}>
                  <span className="tabular" style={{ font: '700 14px/1.2 var(--mbc-font-sans)', color: 'var(--room-calendar)' }}>{item.slot}</span>
                  <span style={{ font: '400 17px/1.35 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{item.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 4 }}>
          <p className="tile-label" style={{ color: 'var(--room-calendar)', marginBottom: 8 }}>Coming up</p>
          {coming.length === 0 ? (
            <p style={{ margin: 0, font: '400 17px/1.45 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Nothing entered for the next three weeks.</p>
          ) : (
            coming.map(({ day, items }) => (
              <button
                key={toIso(day)}
                type="button"
                onClick={() => open(day)}
                aria-label={`${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}: ${items.map((i) => i.label).join(', ')} — open on the calendar`}
                className="tile-row"
                style={{ alignItems: 'flex-start', gap: 14, padding: '10px 4px', fontSize: 17 }}
              >
                <span style={{ display: 'grid', justifyItems: 'center', width: 42, flex: 'none' }}>
                  <span className="tabular" style={{ font: '600 24px/1 var(--mbc-font-serif)', color: 'var(--room-calendar)' }}>{day.getDate()}</span>
                  <span style={{ font: '700 11px/1.4 var(--mbc-font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-meta)' }}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </span>
                <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  {items.slice(0, 2).map((item) => (
                    <span key={item.key} style={{ font: '400 17px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                      {item.label}
                      {item.slot ? <span className="tabular" style={{ color: 'var(--text-meta)' }}> · {item.slot}</span> : null}
                    </span>
                  ))}
                  {items.length > 2 ? <span className="tabular" style={{ font: '400 15px/1.3 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>and {items.length - 2} more</span> : null}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Tile>
  )
}

/* -------------------------------------------------------------- the month */

function MonthTile({ data, span }: { data: DashboardData; span: number }) {
  const navigate = useNavigate()
  const pager = useMonthPager()
  const today = startOfToday()
  const entered = useMemo(() => new Set(data.events.filter((event) => event.audience.includes('staff')).map((event) => event.startsAt)), [data.events])
  const chosen = happening(data, pager.selected)

  return (
    <Tile label="Month" heading={false} opens="calendar" span={span} style={{ background: 'var(--tile-time)', color: 'var(--tile-time-ink)', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p className="tile-label" style={{ fontSize: 13 }} aria-live="polite">
          {formatMonthTitle(pager.month)}
        </p>
        <MonthNav pager={pager} label={false} />
      </div>
      <MonthGrid pager={pager} marked={(day) => entered.has(toIso(day))} ink="var(--tile-time-ink)" soft="var(--tile-time-soft)" ground="var(--tile-time)" />
      <div style={{ display: 'grid', gap: 6, paddingTop: 12, borderTop: '1px solid color-mix(in srgb, var(--tile-time-ink) 30%, transparent)' }}>
        <p style={{ margin: 0, font: '700 15px/1.3 var(--mbc-font-sans)' }}>
          {pager.selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {sameDay(pager.selected, today) ? ' · today' : ''}
        </p>
        {chosen.length === 0 ? (
          <p style={{ margin: 0, font: '400 17px/1.4 var(--mbc-font-sans)', color: 'var(--tile-time-soft)' }}>Nothing on the calendar.</p>
        ) : (
          chosen.slice(0, 4).map((item) => (
            <p key={item.key} style={{ margin: 0, font: '400 17px/1.35 var(--mbc-font-sans)' }}>
              <span className="tabular" style={{ color: 'var(--tile-time-soft)' }}>{item.slot}</span> {item.label}
            </p>
          ))
        )}
        <button type="button" className="tile-link" style={{ fontSize: 15, justifySelf: 'start' }} onClick={() => navigate(`${SURFACES.calendar.path}?day=${toIso(pager.selected)}`)}>
          Open on the calendar
        </button>
      </div>
    </Tile>
  )
}

/* ------------------------------------------------------------ the weather */

const KIND_WORD: Record<WeatherAlert['kind'], string> = { warning: 'Weather warning', watch: 'Weather watch' }

/** One line for an alert: "Tornado Warning until 5:45 PM". */
function alertLine(alert: WeatherAlert): string {
  const until = untilTime(alert.until)
  return until ? `${alert.event} until ${until}` : alert.event
}

/** The whole tile is one link to weather.com's Tulsa page (§2.3): one focus
    stop, nothing inside it separately clickable. During a watch or warning it
    becomes the warning. */
function WeatherTile({ weather, span, compact = false }: { weather: Weather; span: number; compact?: boolean }) {
  const top = weather.alerts[0]
  const today = weather.days.find((day) => day.date === todayIso()) ?? weather.days[0]
  const ahead = weather.days.filter((day) => day.date > (today?.date ?? '')).slice(0, 5)
  const now = weather.now

  if (top) {
    const others = weather.alerts.length - 1
    return (
      <Tile
        label="Weather"
        heading={false}
        span={span}
        link={{ href: WEATHER_URL, label: `${alertLine(top)}, Tulsa County${others > 0 ? `, and ${others} more` : ''} — opens weather.com` }}
        style={{ background: 'var(--text-heading)', color: 'var(--surface-page)', border: '3px solid var(--text-heading)', padding: compact ? '18px 16px' : undefined }}
      >
        <p className="tile-label" style={{ fontSize: 13, letterSpacing: '.2em', lineHeight: 1.5 }}>{KIND_WORD[top.kind]} · Tulsa County</p>
        <p style={{ margin: 0, font: `700 ${compact ? 24 : 32}px/1.1 var(--mbc-font-serif)`, letterSpacing: '-.01em' }}>{top.event}</p>
        {untilTime(top.until) ? <p className="tabular" style={{ margin: 0, font: '700 18px/1.3 var(--mbc-font-sans)' }}>Until {untilTime(top.until)}</p> : null}
        {others > 0 ? (
          <p style={{ margin: 0, font: '400 17px/1.4 var(--mbc-font-sans)' }}>Also: {weather.alerts.slice(1).map((alert) => alert.event).join(', ')}</p>
        ) : null}
        {now ? <p className="tabular" style={{ margin: 'auto 0 0', font: '400 17px/1.4 var(--mbc-font-sans)', opacity: 0.85 }}>Now {now.temperature}° · {now.condition.toLowerCase()}</p> : null}
      </Tile>
    )
  }

  return (
    <Tile
      label="Weather"
      heading={false}
      span={span}
      link={{ href: WEATHER_URL, label: 'Tulsa weather — opens weather.com' }}
      style={{ background: 'var(--surface-card)', color: 'var(--text-heading)', border: '1px solid var(--border-card)', padding: compact ? '20px 18px' : undefined, gap: compact ? 6 : 12 }}
    >
      <p className="tile-label" style={{ color: 'var(--text-category)', fontSize: 13 }}>Weather</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 14px' }}>
        <span className="tabular" style={{ font: `600 ${compact ? 46 : 58}px/1 var(--mbc-font-serif)`, letterSpacing: '-.03em' }}>{now ? now.temperature : today?.high}°</span>
        <span style={{ font: '400 17px/1.3 var(--mbc-font-sans)' }}>{now ? now.condition : today?.condition}</span>
      </div>
      {today ? (
        <p className="tabular" style={{ margin: 0, font: '400 17px/1.3 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
          H {today.high}° · L {today.low}°{today.precipitation >= 30 ? ` · ${today.precipitation}% rain` : ''}
        </p>
      ) : null}
      {!compact && ahead.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ahead.length}, minmax(0,1fr))`, gap: 4, marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border-hairline)' }}>
          {ahead.map((day) => {
            const date = parseDate(day.date)
            return (
              <span key={day.date} style={{ display: 'grid', justifyItems: 'center', gap: 4, textAlign: 'center' }} title={`${day.condition}${day.precipitation >= 30 ? `, ${day.precipitation}% rain` : ''}`}>
                <span style={{ font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-meta)' }}>{date?.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="tabular" style={{ font: '600 18px/1 var(--mbc-font-serif)' }}>{day.high}°</span>
                <span className="tabular" style={{ font: '400 14px/1 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{day.low}°</span>
              </span>
            )
          })}
        </div>
      ) : null}
      {weather.state === 'seed' ? <p style={{ margin: 0, font: '400 13px/1.3 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>Seed forecast — live data unavailable</p> : null}
    </Tile>
  )
}

/** A thin band across the top of the board while a watch or warning is
    active, opening the same page the Weather tile does. Dark ground, heavy
    type, first in the reading order: position and weight, not red. */
function SevereBand({ alerts }: { alerts: WeatherAlert[] }) {
  const top = alerts[0]
  return (
    <a
      href={WEATHER_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-wide=""
      aria-label={`${alertLine(top)}, Tulsa County${alerts.length > 1 ? `, and ${alerts.length - 1} more` : ''} — opens weather.com`}
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px 18px',
        padding: '12px 20px',
        borderRadius: 14,
        background: 'var(--text-heading)',
        color: 'var(--surface-page)',
        textDecoration: 'none',
      }}
    >
      <span style={{ font: '700 17px/1.3 var(--mbc-font-sans)' }}>
        <span style={{ letterSpacing: '.14em', textTransform: 'uppercase', marginRight: 10 }}>{top.kind === 'warning' ? 'Warning' : 'Watch'}</span>
        <span className="tabular">{alertLine(top)}</span>
        {alerts.length > 1 ? <span style={{ fontWeight: 400 }}> · and {alerts.length - 1} more</span> : null}
      </span>
      <span style={{ font: '700 15px/1 var(--mbc-font-sans)', textDecoration: 'underline', textUnderlineOffset: 4 }}>weather.com</span>
    </a>
  )
}

/* ------------------------------------------------------ waiting on someone */

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
              {row.of !== undefined ? <span style={{ font: '400 15px var(--mbc-font-sans)', color: 'var(--text-meta)' }}> of {row.of}</span> : null}
              <span style={{ color: 'var(--text-link)', marginLeft: 8 }} aria-hidden="true">→</span>
            </span>
          </TileRow>
        ))}
      </div>
    </Tile>
  )
}

/* -------------------------------------------------------------- the pages */

/** The pages Home does not hold, each with its room's colour as a rule on the
    left (§2.2), in the brief's order. A page not built yet, or off, or not
    this person's, is simply not a row. */
const PAGES: { key: string; rule: string }[] = [
  { key: 'ministries', rule: 'var(--room-people)' },
  { key: 'leadership', rule: 'var(--room-people)' },
  { key: 'homebound', rule: 'var(--room-people)' },
  { key: 'resources', rule: 'var(--room-work)' },
  { key: 'discussion', rule: 'var(--room-huddle)' },
]

function PagesTile({ data, span }: { data: DashboardData; span: number }) {
  const canOpen = useCanOpen()
  const { member } = useSession()
  const threads = useMemo(() => data.threads.filter((thread) => reaches(thread.audience, 'staff')), [data.threads])
  const unread = useUnreadThreadIds(member?.id ?? null, threads).length
  const pages = PAGES.filter((page) => canOpen(page.key))

  return (
    <Tile label="Pages" span={span} drawn={pages.length > 0} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-card)', paddingBottom: 12 }} labelColour="var(--text-category)">
      <div>
        {pages.map((page) => (
          <TileRow key={page.key} opens={page.key}>
            <span aria-hidden="true" style={{ width: 4, alignSelf: 'stretch', minHeight: 24, borderRadius: 2, background: page.rule }} />
            <span style={{ flex: 1, font: '600 20px/1.2 var(--mbc-font-serif)' }}>{SURFACES[page.key].nav}</span>
            {page.key === 'discussion' && unread > 0 ? (
              <span className="tabular" style={{ font: '700 15px/1 var(--mbc-font-sans)', color: 'var(--text-eyebrow)' }}>{unread} new</span>
            ) : null}
            <span style={{ color: 'var(--text-link)' }} aria-hidden="true">→</span>
          </TileRow>
        ))}
      </div>
    </Tile>
  )
}

/* ------------------------------------------------------- tile and row */

/** One tile on the board. `opens` names the SURFACES key the tile leads to;
    when that surface would not open for this person — switched off, or not
    theirs — the tile is not drawn at all. The check lives here so that no
    caller can forget it (home brief §1.3). `drawn` lets a tile with nothing to
    show stand down the same way. `heading` draws the label as the tile's
    eyebrow; tiles that set their own eyebrows inside pass false. `link` makes
    the whole tile one outside link, opening in a new tab. */
function Tile({
  label,
  span,
  style,
  opens,
  link,
  drawn = true,
  heading = true,
  labelColour,
  children,
}: {
  label: string
  span: number
  style: CSSProperties
  opens?: string
  link?: { href: string; label: string }
  drawn?: boolean
  heading?: boolean
  labelColour?: string
  children: ReactNode
}) {
  const canOpen = useCanOpen()
  if (!drawn || (opens && !canOpen(opens))) return null
  const body = (
    <>
      {heading ? (
        <p className="tile-label" style={labelColour ? { color: labelColour } : undefined}>
          {label}
        </p>
      ) : null}
      {children}
    </>
  )
  if (link) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} className="tile tile-anchor" style={{ gridColumn: `span ${span}`, ...style }}>
        {body}
      </a>
    )
  }
  return (
    <section aria-label={label} className="tile" style={{ gridColumn: `span ${span}`, ...style }}>
      {body}
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
    <button type="button" className="tile-row" style={{ fontSize: 17 }} onClick={() => navigate(surface.path)}>
      {children}
    </button>
  )
}

const bare = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', justifySelf: 'start' } as const
