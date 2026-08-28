import { useMemo, useState } from 'react'
import { Card, Rule } from '../../components/ui'
import { useData } from '../../data/store'
import { useSession } from '../../session/session'
import { itemColour, itemsForDay, monthGrid } from '../../lib/calendar'
import { useForecast } from '../../lib/weather'
import { addMonths, formatMonthTitle, sameDay, startOfToday, toIso } from '../../lib/date'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MonthCalendar() {
  const data = useData()
  const { viewAs } = useSession()
  const { days: forecast } = useForecast()
  const today = startOfToday()
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date>(today)

  const includeCare = viewAs === 'staff'
  const grid = useMemo(() => monthGrid(month), [month])

  // The count in the header is the things somebody entered — standing services
  // happen every week and would drown it.
  const monthCount = grid.filter((day) => day.getMonth() === month.getMonth()).reduce(
    (total, day) => total + itemsForDay(data, day, includeCare).filter((item) => item.source !== 'service').length,
    0,
  )

  const selectedItems = itemsForDay(data, selected, includeCare)
  const selectedForecast = forecast.find((day) => day.date === toIso(selected))

  return (
    <Card radius="card" pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '22px 24px', display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <h2
              style={{
                font: '600 24px/1.2 var(--mbc-font-serif)',
                letterSpacing: '-.01em',
                color: 'var(--text-heading)',
                margin: 0,
              }}
            >
              {formatMonthTitle(month)}
            </h2>
            <p className="tabular" style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '6px 0 0' }}>
              {monthCount} {monthCount === 1 ? 'entry' : 'entries'} beyond the standing services
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill label="←" title="Previous month" onClick={() => setMonth(addMonths(month, -1))} />
            <Pill
              label="Today"
              onClick={() => {
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                setSelected(today)
              }}
            />
            <Pill label="→" title="Next month" onClick={() => setMonth(addMonths(month, 1))} />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0,1fr))',
            gap: 1,
            background: 'var(--border-hairline)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              style={{
                background: 'var(--surface-panel)',
                padding: '9px 10px',
                font: '700 10px/1 var(--mbc-font-sans)',
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              {name}
            </div>
          ))}

          {grid.map((day) => {
            const items = itemsForDay(data, day, includeCare)
            const inMonth = day.getMonth() === month.getMonth()
            const isToday = sameDay(day, today)
            const isSelected = sameDay(day, selected)
            return (
              <button
                key={toIso(day)}
                type="button"
                onClick={() => setSelected(day)}
                style={{
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: 116,
                  padding: '9px 10px',
                  overflow: 'hidden',
                  display: 'grid',
                  gap: 5,
                  alignContent: 'start',
                  background: isToday
                    ? 'var(--mbc-lamplight-tint)'
                    : isSelected
                      ? 'var(--surface-panel)'
                      : inMonth
                        ? 'var(--surface-card)'
                        : 'var(--surface-page)',
                  opacity: inMonth ? 1 : 0.5,
                  boxShadow: isSelected ? 'inset 0 0 0 2px var(--mbc-border-control)' : undefined,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                  <span className="tabular" style={{ font: '600 17px/1 var(--mbc-font-serif)', color: 'var(--text-heading)' }}>
                    {day.getDate()}
                  </span>
                  {isToday ? (
                    <span
                      style={{
                        font: '700 9px/1 var(--mbc-font-sans)',
                        letterSpacing: '.16em',
                        color: 'var(--mbc-lamplight-deep)',
                      }}
                    >
                      TODAY
                    </span>
                  ) : null}
                </span>

                {items.slice(0, 2).map((item) => (
                  <span
                    key={item.key}
                    style={{
                      font: '400 11px/1.35 var(--mbc-font-sans)',
                      color: itemColour(item.source),
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      maxWidth: '100%',
                    }}
                  >
                    {item.label}
                  </span>
                ))}
                {items.length > 2 ? (
                  <span className="tabular" style={{ font: '400 11px/1.35 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                    +{items.length - 2} more
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <Rule tone="hair" />

      <div style={{ padding: '20px 24px 24px', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h3
            style={{
              font: '600 18px/1.3 var(--mbc-font-serif)',
              color: 'var(--text-heading)',
              margin: 0,
            }}
          >
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {sameDay(selected, today) ? ' · today' : ''}
          </h3>
          {selectedForecast ? (
            <span className="tabular" style={{ font: '400 13px/1 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
              {selectedForecast.high}/{selectedForecast.low} · {selectedForecast.condition}
            </span>
          ) : null}
        </div>

        {selectedItems.length === 0 ? (
          <p style={{ font: '400 14px/1.7 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0, maxWidth: '60ch' }}>
            Nothing on this day. Anything logged on another surface — an event, a commitment coming due, a notice
            window — shows up here on its own.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
            {selectedItems.map((item) => (
              <div
                key={item.key}
                style={{
                  background: 'var(--surface-card)',
                  display: 'grid',
                  gridTemplateColumns: '92px 1fr',
                  gap: 14,
                  padding: '11px 2px',
                  alignItems: 'baseline',
                }}
              >
                <span
                  className="tabular"
                  style={{ font: '400 13px/1.4 var(--mbc-font-sans)', color: itemColour(item.source) }}
                >
                  {item.slot}
                </span>
                <span>
                  <span style={{ font: '400 15px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
                    {item.label}
                  </span>
                  <span style={{ display: 'block', font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                    {item.meta}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function Pill({ label, title, onClick }: { label: string; title?: string; onClick(): void }) {
  const wide = label.length > 1
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title ?? label}
      style={{
        minWidth: wide ? undefined : 44,
        height: 44,
        padding: wide ? '0 18px' : 0,
        borderRadius: 'var(--mbc-radius-pill)',
        border: '1px solid var(--border-control)',
        background: 'none',
        cursor: 'pointer',
        font: '700 12px/1 var(--mbc-font-sans)',
        letterSpacing: wide ? '.06em' : undefined,
        textTransform: wide ? 'uppercase' : undefined,
        color: 'var(--text-heading)',
        transition: 'var(--motion-hover)',
      }}
    >
      {label}
    </button>
  )
}
