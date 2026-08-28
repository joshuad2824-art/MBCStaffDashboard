import { Card } from '../../components/ui'
import { useData } from '../../data/store'
import { useClock } from '../../lib/weather'
import { nextOnCalendar } from '../../lib/calendar'
import { formatLong, formatShort, parseDate, relativeDay, startOfToday } from '../../lib/date'

/** The first of the page's two dark bands. Three blocks: the time, the next
    thing on the calendar, and where Sunday's bulletin stands. */
export function RightNowBand() {
  const data = useData()
  const today = startOfToday()
  const clock = useClock()
  const next = nextOnCalendar(data, today)
  const service = parseDate(data.week.serviceDate)

  return (
    <Card tone="dark" radius="panel" pad="30px clamp(24px,2.4vw,34px)">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px,1fr))', gap: '28px 34px' }}>
        <Block label="Right now" meta={formatLong(today)}>
          <span
            className="tabular"
            style={{
              font: '600 clamp(34px,3.4vw,46px)/1 var(--mbc-font-serif)',
              color: 'var(--text-on-dark)',
              letterSpacing: '-.02em',
            }}
          >
            {clock}
          </span>
        </Block>

        <Block
          label="Next on the calendar"
          meta={
            next
              ? next.when.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
                ' · ' +
                next.time +
                ' · ' +
                relativeDay(next.when, today)
              : 'Nothing in the next two months.'
          }
        >
          <span style={{ font: '400 clamp(19px,1.6vw,23px)/1.3 var(--mbc-font-sans)', color: 'var(--text-on-dark)' }}>
            {next ? next.name : '—'}
          </span>
        </Block>

        <Block
          label="Sunday’s bulletin"
          meta={data.week.sermonTitle + ' · ' + data.week.scripture + ' · ' + formatShort(service)}
        >
          <span style={{ font: '400 clamp(19px,1.6vw,23px)/1.3 var(--mbc-font-sans)', color: 'var(--text-on-dark)' }}>
            {data.week.status === 'draft' ? 'Still a draft' : 'Published'}
          </span>
        </Block>
      </div>
    </Card>
  )
}

function Block({ label, meta, children }: { label: string; meta: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
      <span
        style={{
          font: '700 10px/1 var(--mbc-font-sans)',
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: 'var(--text-on-dark-accent)',
        }}
      >
        {label}
      </span>
      {children}
      <span style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-on-dark-soft)' }}>{meta}</span>
    </div>
  )
}
