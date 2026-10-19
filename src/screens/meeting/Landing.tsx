import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../data/store'
import { useCare } from '../../data/care/store'
import { useSession } from '../../session/session'
import { useDisplayScale, useNarrow } from '../../lib/displayScale'
import { reaches } from '../../lib/audience'
import { useUnreadThreadIds } from '../../lib/unread'
import { personName } from '../../lib/derive'
import { addDays, parseDate, relativeDay, startOfToday, toIso } from '../../lib/date'
import type { Meeting, MeetingsData } from '../../data/meetings/types'

/* The front of the deacon side (October 2026 redesign): how far off the
   meeting is, and one tile for each room it draws on — the reports filed for
   it, the care plan, the Board's own table. Every tile wears its room's lamp.

   Two things it deliberately does not carry. There is no attendance count,
   flag or note here or anywhere (the Board decided against a tracker). And
   the care tile is pointers only: how many households have been reached, never
   anything about them. */
export function MeetingLanding({ data, meeting }: { data: MeetingsData; meeting: Meeting | null }) {
  const narrow = useNarrow()
  const { width } = useDisplayScale()
  const medium = !narrow && width < 1180
  const today = startOfToday()
  const on = meeting ? parseDate(meeting.meetsOn) : null

  return (
    <div style={{ display: 'grid', gap: narrow ? 18 : 26 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: narrow ? 16 : '20px 48px' }}>
        <div>
          <p className="tile-label" style={{ color: 'var(--text-eyebrow)' }}>
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).replace(',', ' ·')}
          </p>
          <p style={{ margin: '12px 0 0', font: `500 ${narrow ? 30 : 48}px/1.06 var(--mbc-font-serif)`, letterSpacing: '-.025em', color: 'var(--text-heading)' }}>
            {headline(meeting, on, today)}
          </p>
        </div>
        {narrow ? null : (
        <figure style={{ margin: 0, maxWidth: 460, paddingLeft: narrow ? 0 : 28, borderLeft: narrow ? 'none' : '1px solid var(--border-section)' }}>
          <blockquote style={{ margin: 0, font: 'italic 400 19px/1.5 var(--mbc-font-serif)', color: 'var(--text-scripture)' }}>
            “For those who serve well as deacons gain a good standing for themselves and also great confidence in the faith that is in Christ Jesus.”
          </blockquote>
          <figcaption className="tile-label" style={{ marginTop: 10, color: 'var(--text-meta)', fontSize: 10 }}>
            1 Timothy 3:13 · ESV
          </figcaption>
        </figure>
        )}
      </div>

      <div className="board" data-narrow={narrow ? '' : undefined} data-medium={medium ? '' : undefined}>
        <DateTile meeting={meeting} on={on} compact={narrow} />
        <ReportsTile data={data} meeting={meeting} />
        <CareTile />
        <BoardRoomTile />
      </div>
    </div>
  )
}

function headline(meeting: Meeting | null, on: Date | null, today: Date): string {
  if (!meeting || !on) return 'No Board meeting is on the calendar yet.'
  if (meeting.status === 'in_session') return 'The Board is in session.'
  const iso = toIso(today)
  if (meeting.meetsOn === iso) return 'The Board meets today.'
  if (meeting.meetsOn < iso) return `The Board met ${relativeDay(on, today)}.`
  let sundays = 0
  for (let day = addDays(today, 1); toIso(day) <= meeting.meetsOn; day = addDays(day, 1)) if (day.getDay() === 0) sundays++
  if (sundays === 0) return `The Board meets ${relativeDay(on, today)}.`
  const words = ['', 'One Sunday', 'Two Sundays', 'Three Sundays', 'Four Sundays', 'Five Sundays']
  return `${words[sundays] ?? sundays + ' Sundays'} until the Board meets.`
}

function DateTile({ meeting, on, compact }: { meeting: Meeting | null; on: Date | null; compact: boolean }) {
  return (
    <section
      aria-label="The next meeting"
      className="tile"
      style={{
        gridColumn: 'span 3',
        background: 'var(--tile-home)',
        color: 'var(--tile-home-ink)',
        border: '2px solid var(--tile-home-edge)',
        borderRadius: '260px 260px 22px 22px',
        padding: compact ? '58px 20px 22px' : '96px 22px 24px',
        alignItems: 'center',
        textAlign: 'center',
        gap: 6,
        minHeight: compact ? 0 : 340,
      }}
    >
      {on ? (
        <>
          <p className="tile-label" style={{ color: 'var(--tile-home-accent)' }}>{on.toLocaleDateString('en-US', { month: 'long' })}</p>
          <p className="tabular" style={{ margin: 0, font: `600 ${compact ? 88 : 112}px/0.9 var(--mbc-font-serif)`, letterSpacing: '-.04em' }}>{on.getDate()}</p>
          <p style={{ margin: '6px 0 0', font: '700 18px/1.3 var(--mbc-font-sans)' }}>
            {on.toLocaleDateString('en-US', { weekday: 'long' })} · {meeting?.timeLabel}
          </p>
          <p style={{ margin: 0, font: '400 16px/1.4 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)' }}>{meeting?.location}</p>
        </>
      ) : (
        <p style={{ margin: 0, font: '400 17px/1.5 var(--mbc-font-sans)' }}>The chairman adds the year’s meetings on the Board’s calendar.</p>
      )}
    </section>
  )
}

const STATUS_WORDS: Record<string, string> = { draft: 'Draft saved', submitted: 'Filed', published: 'Published', archived: 'Archived' }

function ReportsTile({ data, meeting }: { data: MeetingsData; meeting: Meeting | null }) {
  const navigate = useNavigate()
  const forMeeting = meeting ? data.reports.filter((report) => report.meetingId === meeting.id && report.kind !== 'minutes') : []
  const filed = forMeeting.filter((report) => report.status === 'submitted' || report.status === 'published')
  const month = meeting ? (parseDate(meeting.meetsOn) ?? startOfToday()).toLocaleDateString('en-US', { month: 'long' }) : ''

  return (
    <section aria-label="Reports" className="tile" style={{ gridColumn: 'span 3', background: 'var(--tile-gold)', color: 'var(--tile-gold-ink)' }}>
      <p className="tile-label">{month ? `${month} reports` : 'Reports'}</p>
      <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="tabular" style={{ font: '600 46px/1 var(--mbc-font-serif)' }}>{filed.length}</span>
        <span style={{ font: '400 18px/1.3 var(--mbc-font-sans)' }}>{filed.length === 1 ? 'filed so far' : 'filed so far'}</span>
      </p>
      {forMeeting.length === 0 ? (
        <p style={{ margin: 0, font: '400 16px/1.5 var(--mbc-font-sans)' }}>Nothing is filed against this meeting yet.</p>
      ) : (
        <div>
          {forMeeting.map((report) => (
            <div key={report.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderTop: '1px solid var(--tile-gold-rule)', font: '400 16px/1.35 var(--mbc-font-sans)' }}>
              <span>{report.kind === 'treasurer' ? 'Treasurer’s report' : report.bodyName.replace(/ committee$/i, '')}</span>
              <span style={{ fontWeight: report.status === 'draft' ? 400 : 700, whiteSpace: 'nowrap' }}>
                {report.status === 'draft' ? '' : '✓ '}
                {STATUS_WORDS[report.status] ?? report.status}
              </span>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="tile-link" onClick={() => navigate('/reports')}>
        All reports
      </button>
    </section>
  )
}

function CareTile() {
  const navigate = useNavigate()
  const care = useCare()
  if (!care.data) return null
  const today = startOfToday()
  const since = toIso(addDays(today, -30))
  const households = care.data.assignments.filter((a) => a.active)
  const reached = households.filter((a) => a.lastContactOn && a.lastContactOn >= since).length
  const sunday = toIso(addDays(today, -today.getDay()))
  const week = care.data.weeks.find((w) => w.weekOf === sunday) ?? null
  const deacon = week ? care.data.names[week.personId] ?? null : null

  return (
    <section aria-label="Care" className="tile" style={{ gridColumn: 'span 3', background: 'var(--tile-care)', color: 'var(--tile-care-ink)' }}>
      <p className="tile-label">Care · the last thirty days</p>
      <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="tabular" style={{ font: '600 46px/1 var(--mbc-font-serif)' }}>{reached}</span>
        <span style={{ font: '400 18px/1.3 var(--mbc-font-sans)' }}>of {households.length} households reached</span>
      </p>
      {households.length > 0 ? (
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(households.length, 12)}, minmax(0,1fr))`, gap: 4 }}>
          {households.slice(0, 24).map((a) => {
            const done = Boolean(a.lastContactOn && a.lastContactOn >= since)
            return <span key={a.id} style={{ height: 24, borderRadius: '999px 999px 3px 3px', background: done ? 'var(--tile-care-ink)' : 'transparent', border: done ? 'none' : '1.5px solid var(--tile-care-ink)' }} />
          })}
        </div>
      ) : null}
      <p style={{ margin: 0, font: '400 16px/1.5 var(--mbc-font-sans)' }}>{deacon ? `Deacon of the Week: ${deacon}.` : 'No Deacon of the Week named for this week.'}</p>
      <button type="button" className="tile-link" onClick={() => navigate('/board/care')}>
        Open the care list
      </button>
    </section>
  )
}

function BoardRoomTile() {
  const navigate = useNavigate()
  const data = useData()
  const { member } = useSession()
  const threads = useMemo(
    () => data.threads.filter((thread) => reaches(thread.audience, 'deacon-board')).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity)),
    [data.threads],
  )
  const unread = useUnreadThreadIds(member?.id ?? null, threads).length
  const today = startOfToday()

  return (
    <section aria-label="Board room" className="tile" style={{ gridColumn: 'span 3', background: 'var(--tile-talk)', color: 'var(--tile-talk-ink)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p className="tile-label">Board room</p>
        {unread > 0 ? <span className="tabular" style={{ font: '700 14px/1 var(--mbc-font-sans)' }}>{unread} new</span> : null}
      </div>
      {threads.length === 0 ? (
        <p style={{ margin: 0, font: '400 16px/1.5 var(--mbc-font-sans)' }}>A quiet table. Start a thread when something needs talking through.</p>
      ) : (
        <div>
          {threads.slice(0, 2).map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => navigate('/board/discussion')}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '13px 0', background: 'none', border: 'none', borderTop: '1px solid var(--tile-talk-rule)', color: 'inherit', cursor: 'pointer' }}
            >
              <span style={{ display: 'block', font: '600 18px/1.3 var(--mbc-font-serif)' }}>{thread.subject}</span>
              <span style={{ display: 'block', marginTop: 4, font: '400 14px/1.4 var(--mbc-font-sans)' }}>
                {personName(data.people, thread.createdBy)} · {relativeDay(parseDate(thread.lastActivity) ?? today, today)}
                {thread.audience.length > 1 ? ' · staff can read this one' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="tile-link" onClick={() => navigate('/board/discussion')}>
        Go to the Board room
      </button>
    </section>
  )
}
