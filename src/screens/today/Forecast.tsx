import { Card, Rule } from '../../components/ui'
import { useForecast } from '../../lib/weather'
import { parseDate, sameDay, startOfToday } from '../../lib/date'

/** Seven days in words. There is no icon set, so the condition is written out. */
export function Forecast() {
  const { days, state } = useForecast()
  const today = startOfToday()
  const wet = days.find((day) => day.precipitation >= 40)

  const source =
    state === 'live' ? 'Live · Tulsa, OK' : state === 'seed' ? 'Seed forecast — live data unavailable' : 'Loading the forecast…'

  return (
    <Card radius="card" pad="22px 24px 24px" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <span
            style={{
              font: '700 10px/1 var(--mbc-font-sans)',
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'var(--text-eyebrow)',
            }}
          >
            Tulsa · seven days
          </span>
          <span style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>{source}</span>
        </div>
        <Rule tone="hair" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0,1fr))',
          gap: 1,
          background: 'var(--border-hairline)',
        }}
      >
        {days.map((day) => {
          const date = parseDate(day.date)
          const isToday = date ? sameDay(date, today) : false
          return (
            <div
              key={day.date}
              style={{
                background: 'var(--surface-card)',
                padding: '12px 6px',
                display: 'grid',
                gap: 5,
                justifyItems: 'center',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  font: '700 11px/1 var(--mbc-font-sans)',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: isToday ? 'var(--text-eyebrow)' : 'var(--text-heading)',
                }}
              >
                {isToday ? 'Today' : date?.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="tabular" style={{ font: '400 11px/1 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                {date ? date.getMonth() + 1 + '/' + date.getDate() : ''}
              </span>
              <span className="tabular" style={{ font: '600 30px/1.1 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>
                {day.high}
              </span>
              <span className="tabular" style={{ font: '400 13px/1 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                {day.low}
              </span>
              <span style={{ font: '400 12px/1.35 var(--mbc-font-sans)', color: 'var(--text-body)' }}>
                {day.condition}
              </span>
              {day.precipitation >= 25 ? (
                <span
                  className="tabular"
                  style={{
                    font: '700 10px/1 var(--mbc-font-sans)',
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: 'var(--text-eyebrow)',
                  }}
                >
                  {day.precipitation}% rain
                </span>
              ) : null}
            </div>
          )
        })}
      </div>

      {wet ? (
        <>
          <Rule tone="hair" />
          <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
            {parseDate(wet.date)?.toLocaleDateString('en-US', { weekday: 'long' })} is {wet.precipitation}% wet. Check
            anything planned outdoors.
          </p>
        </>
      ) : null}
    </Card>
  )
}
