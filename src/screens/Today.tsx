import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store'
import { useCare } from '../data/care/store'
import { useSession } from '../session/session'
import { useDisplayScale, useNarrow } from '../lib/displayScale'
import { useClock, useForecast } from '../lib/weather'
import { itemsForDay, monthGrid, nextOnCalendar } from '../lib/calendar'
import { currentWeek, issueChecks } from '../lib/communicator'
import { carePastWindow, unannouncedNotices, unclaimedCount } from '../lib/rollups'
import { gapsIn } from '../lib/serving'
import { firstName, isHuddleArchived, personName } from '../lib/derive'
import { addDays, parseDate, relativeDay, sameDay, startOfToday, toIso, todayIso } from '../lib/date'
import { reaches } from '../lib/audience'
import { useUnreadThreadIds } from '../lib/unread'
import { Announcements } from './discussion/Announcements'
import { Forecast } from './today/Forecast'
import type { DashboardData } from '../data/types'

/* Today at Memorial, as a board of tiles (October 2026 redesign). Every tile
   wears the colour of the room it opens — the bulletin is Sunbeam because it
   opens Work, Deacon of the Week is Sage because it is care — so after a week
   the eye finds things by colour without being told. Nothing here is stored:
   every count is derived from the same records the rooms show. */

export function Today() {
  const data = useData()
  const { member, viewAs } = useSession()
  const narrow = useNarrow()
  const { width } = useDisplayScale()
  const medium = !narrow && width < 1180
  const today = startOfToday()
  const staffRole = viewAs === 'staff'
  const live = data.announcements.some((item) => reaches(item.audience, 'staff') && item.expiresOn >= todayIso())

  return (
    <div style={{ display: 'grid', gap: narrow ? 20 : 30 }}>
      <Masthead data={data} today={today} name={member ? firstName(member.name) : ''} narrow={narrow} />
      <div className="board" data-narrow={narrow ? '' : undefined} data-medium={medium ? '' : undefined}>
        <NowTile data={data} today={today} span={3} compact={narrow} />
        <WaitingTile data={data} today={today} staffRole={staffRole} span={5} />
        <MonthTile data={data} today={today} span={4} />
        <ScheduleTile data={data} today={today} staffRole={staffRole} span={5} />
        <HuddleTile data={data} today={today} span={4} />
        <BulletinTile data={data} today={today} span={3} />
        {live ? (
          <div style={{ gridColumn: `span ${staffRole ? 5 : 9}`, minWidth: 0 }} data-wide={staffRole ? undefined : ''}>
            <Announcements side="staff" />
          </div>
        ) : null}
        {staffRole ? <DiscussionTile data={data} today={today} span={live ? 4 : 9} /> : null}
        <DeaconWeekTile span={3} />
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
    <section
      aria-label="Right now"
      className="tile"
      style={{
        gridColumn: `span ${span}`,
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
    </section>
  )
}

function WaitingTile({ data, today, staffRole, span }: { data: DashboardData; today: Date; staffRole: boolean; span: number }) {
  const navigate = useNavigate()
  const rows: { label: string; count: number; of?: number; to: string; lamp: string }[] = [
    { label: 'Recurring commitments with no owner', count: unclaimedCount(data.cadence), of: data.cadence.length, to: '/cadence', lamp: 'var(--room-work)' },
    ...(staffRole ? [{ label: 'Care entries past their window', count: carePastWindow(data.care, today).length, to: '/care', lamp: 'var(--room-people)' }] : []),
    { label: 'Decisions not yet announced', count: unannouncedNotices(data).length, to: '/notice', lamp: 'var(--room-work)' },
    { label: 'Groups with no leader named', count: gapsIn(data).length, to: '/ministries', lamp: 'var(--room-people)' },
  ]
  const waiting = rows.filter((row) => row.count > 0)
  const words = ['Nothing', 'One thing needs', 'Two things need', 'Three things need', 'Four things need']

  return (
    <section aria-label="Waiting on someone" className="tile" style={{ gridColumn: `span ${span}`, background: 'var(--surface-card)', border: '1px solid var(--border-card)', paddingBottom: 12 }}>
      <p className="tile-label" style={{ color: 'var(--text-category)' }}>Waiting on someone</p>
      <p style={{ margin: '0 0 6px', font: '600 26px/1.15 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)' }}>
        {waiting.length === 0 ? 'Every commitment has a name beside it.' : `${words[waiting.length] ?? waiting.length + ' things need'} a name beside them.`}
      </p>
      <div>
        {rows.map((row) => (
          <button key={row.label} type="button" className="tile-row" onClick={() => navigate(row.to)}>
            <span className="lamp-sm" style={{ background: row.lamp }} aria-hidden="true" />
            <span style={{ flex: 1 }}>{row.label}</span>
            <span className="tabular" style={{ font: '600 20px/1 var(--mbc-font-serif)', whiteSpace: 'nowrap', color: row.count ? 'var(--text-heading)' : 'var(--text-muted)' }}>
              {row.count}
              {row.of !== undefined ? <span style={{ font: '400 14px var(--mbc-font-sans)', color: 'var(--text-meta)' }}> of {row.of}</span> : null}
              <span style={{ color: 'var(--text-link)', marginLeft: 8 }} aria-hidden="true">→</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function MonthTile({ data, today, span }: { data: DashboardData; today: Date; span: number }) {
  const navigate = useNavigate()
  const grid = monthGrid(today)
  const weeks = grid[35] && grid[35].getMonth() === today.getMonth() ? grid : grid.slice(0, 35)
  const busy = (day: Date) => itemsForDay(data, day, false).some((item) => item.source === 'event' || item.source === 'service')
  const month = today.toLocaleDateString('en-US', { month: 'long' })

  return (
    <section aria-label="This month" className="tile" style={{ gridColumn: `span ${span}`, background: 'var(--tile-time)', color: 'var(--tile-time-ink)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ font: '600 24px/1 var(--mbc-font-serif)' }}>{month}</span>
        <button type="button" className="tile-link" style={{ marginTop: 0, fontSize: 14, textDecoration: 'none' }} onClick={() => navigate('/calendar')}>
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
    </section>
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
    <section aria-label="Today and coming up" className="tile" style={{ gridColumn: `span ${span}`, background: 'var(--surface-card)', border: '1px solid var(--border-card)' }}>
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
    </section>
  )
}

function HuddleTile({ data, today, span }: { data: DashboardData; today: Date; span: number }) {
  const navigate = useNavigate()
  const current = data.huddle.filter((post) => !isHuddleArchived(post.createdAt, today) && !post.resolvedAt)
  const count = (col: string) => current.filter((post) => post.col === col).length
  const win = [...current].filter((post) => post.col === 'win').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  return (
    <section aria-label="This week’s huddle" className="tile" style={{ gridColumn: `span ${span}`, background: 'var(--tile-talk)', color: 'var(--tile-talk-ink)' }}>
      <p className="tile-label">This week’s huddle</p>
      <div style={{ display: 'flex', gap: 26 }}>
        {[
          ['win', 'Wins'],
          ['tension', 'Tensions'],
          ['fyi', 'FYIs'],
        ].map(([col, label]) => (
          <span key={col}>
            <span className="tabular" style={{ display: 'block', font: '600 40px/1 var(--mbc-font-serif)' }}>{count(col)}</span>
            <span style={{ font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</span>
          </span>
        ))}
      </div>
      {win ? (
        <>
          <p style={{ margin: '6px 0 0', paddingTop: 16, borderTop: '1px solid var(--tile-talk-rule)', font: 'italic 400 18px/1.5 var(--mbc-font-serif)' }}>“{win.body}”</p>
          <p style={{ margin: 0, font: '400 14px/1.4 var(--mbc-font-sans)' }}>{personName(data.people, win.authorId)} · a win</p>
        </>
      ) : null}
      <button type="button" className="tile-link" onClick={() => navigate('/huddle')}>
        Open the huddle
      </button>
    </section>
  )
}

function BulletinTile({ data, today, span }: { data: DashboardData; today: Date; span: number }) {
  const navigate = useNavigate()
  const week = currentWeek(data.weeks, today)
  const checks = week ? issueChecks(week, data.settings) : []
  const ready = checks.filter((check) => check.ok).length

  return (
    <section aria-label="Sunday’s bulletin" className="tile" style={{ gridColumn: `span ${span}`, background: 'var(--tile-gold)', color: 'var(--tile-gold-ink)' }}>
      <p className="tile-label">Sunday’s bulletin</p>
      <p style={{ margin: 0, font: '600 26px/1.1 var(--mbc-font-serif)', letterSpacing: '-.015em' }}>
        {!week ? 'Not started yet.' : week.status === 'draft' ? 'Still a draft.' : 'Published.'}
      </p>
      {week ? <p style={{ margin: 0, font: '400 15px/1.5 var(--mbc-font-sans)' }}>{[week.sermonTitle, week.scripture].filter(Boolean).join(' · ')}</p> : null}
      {week ? (
        <>
          <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${checks.length}, minmax(0,1fr))`, gap: 4, marginTop: 4 }}>
            {checks.map((check) => (
              <span
                key={check.key}
                style={{ height: 30, borderRadius: '999px 999px 3px 3px', background: check.ok ? 'var(--tile-gold-ink)' : 'transparent', border: check.ok ? 'none' : '1.5px dashed var(--tile-gold-ink)' }}
              />
            ))}
          </div>
          <p className="tabular" style={{ margin: 0, font: '700 14px/1.4 var(--mbc-font-sans)' }}>
            {ready} of {checks.length} ready to print
          </p>
        </>
      ) : null}
      <button type="button" className="tile-link" onClick={() => navigate('/communicator')}>
        {!week ? 'Start this week’s issue' : week.status === 'draft' ? 'Finish it' : 'Open it'}
      </button>
    </section>
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
    <section aria-label="Discussion" className="tile" style={{ gridColumn: `span ${span}`, background: 'var(--tile-tint)', color: 'var(--tile-tint-ink)', paddingBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p className="tile-label" style={{ color: 'var(--tile-tint-label)' }}>Discussion</p>
        {unread > 0 ? <span className="tabular" style={{ font: '700 13px/1 var(--mbc-font-sans)', color: 'var(--tile-tint-label)' }}>{unread} new</span> : null}
      </div>
      {threads.length === 0 ? (
        <p style={{ margin: 0, font: '400 16px/1.5 var(--mbc-font-sans)' }}>A quiet board. Start a thread when something needs talking through.</p>
      ) : (
        <div>
          {threads.slice(0, 3).map((thread) => (
            <button key={thread.id} type="button" className="tile-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderColor: 'var(--tile-tint-rule)', color: 'inherit' }} onClick={() => navigate('/discussion')}>
              <span style={{ font: '600 18px/1.3 var(--mbc-font-serif)' }}>{thread.subject}</span>
              <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                {personName(data.people, thread.createdBy)} · {relativeDay(parseDate(thread.lastActivity) ?? today, today)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function DeaconWeekTile({ span }: { span: number }) {
  const care = useCare()
  if (!care.data) return null
  const today = startOfToday()
  const sunday = toIso(addDays(today, -today.getDay()))
  const week = care.data.weeks.find((w) => w.weekOf === sunday) ?? null
  const name = (id: string | null) => (id ? care.data?.names[id] ?? null : null)
  const who = week ? name(week.personId) : null
  const backup = week ? name(week.backupPersonId) : null

  return (
    <Tile span={span} label="Deacon of the Week" style={{ background: 'var(--tile-care)', color: 'var(--tile-care-ink)' }}>
      <p style={{ margin: 0, font: '600 28px/1.1 var(--mbc-font-serif)', letterSpacing: '-.015em' }}>{who ?? 'Not named yet'}</p>
      <p style={{ margin: 0, font: '400 15px/1.5 var(--mbc-font-sans)' }}>
        {who ? (backup ? `Backup, ${backup}. Calls to the office go to him this week.` : 'Calls to the office go to him this week.') : 'The chairman sets the rotation on the deacon side.'}
      </p>
    </Tile>
  )
}

function Tile({ span, label, style, children }: { span: number; label: string; style: CSSProperties; children: ReactNode }) {
  return (
    <section aria-label={label} className="tile" style={{ gridColumn: `span ${span}`, ...style }}>
      <p className="tile-label">{label}</p>
      {children}
    </section>
  )
}
