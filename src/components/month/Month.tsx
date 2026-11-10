import { useCallback, useMemo, useState } from 'react'
import { addMonths, formatMonthTitle, sameDay, startOfToday, toIso } from '../../lib/date'
import { monthGrid } from '../../lib/calendar'

/* The month, shared (home brief §2.2, §9.2). Home's Month tile and the
   Calendar screen page through months the same way — ‹ › and Today — and keep
   a selected day the same way, so "Calendar at that day" lands where the tile
   was pointing. The two draw their grids differently (a tile is a glance, the
   Calendar is the record), so what is shared is the paging, the control and
   the compact grid, not one picture forced on both. */

export interface MonthPager {
  /** The first of the month on screen. */
  month: Date
  selected: Date
  select(day: Date): void
  previous(): void
  next(): void
  /** Back to this month, with today selected. */
  today(): void
  /** Whether the month on screen is this one and today is selected. */
  atToday: boolean
}

const firstOf = (day: Date) => new Date(day.getFullYear(), day.getMonth(), 1)

export function useMonthPager(initial?: Date | null): MonthPager {
  const start = initial ?? startOfToday()
  const [month, setMonth] = useState(() => firstOf(start))
  const [selected, setSelected] = useState<Date>(start)
  const now = startOfToday()

  const select = useCallback((day: Date) => {
    setSelected(day)
    setMonth(firstOf(day))
  }, [])

  return {
    month,
    selected,
    select,
    previous: () => setMonth((m) => addMonths(m, -1)),
    next: () => setMonth((m) => addMonths(m, 1)),
    today: () => select(startOfToday()),
    atToday: sameDay(selected, now) && month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear(),
  }
}

/** ‹ Today ›. Drawn in the ink of whatever it sits on (currentColor), so it
    reads on the Month tile's blue and on the Calendar's card alike. Every
    control is 44px. */
export function MonthNav({ pager, label = true }: { pager: MonthPager; label?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {label ? (
        <span aria-live="polite" className="sr-only">
          {formatMonthTitle(pager.month)}
        </span>
      ) : null}
      <button type="button" aria-label="Previous month" onClick={pager.previous} style={round}>
        <span aria-hidden="true">‹</span>
      </button>
      <button type="button" onClick={pager.today} disabled={pager.atToday} aria-label="Back to today" style={{ ...pill, opacity: pager.atToday ? 0.45 : 1, cursor: pager.atToday ? 'default' : 'pointer' }}>
        Today
      </button>
      <button type="button" aria-label="Next month" onClick={pager.next} style={round}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  )
}

const round = {
  width: 44,
  height: 44,
  borderRadius: 999,
  border: '1px solid currentColor',
  background: 'transparent',
  color: 'inherit',
  font: '400 24px/1 var(--mbc-font-sans)',
  display: 'grid',
  placeItems: 'center',
  paddingBottom: 3,
  cursor: 'pointer',
} as const

const pill = {
  minHeight: 44,
  padding: '0 16px',
  borderRadius: 999,
  border: '1px solid currentColor',
  background: 'transparent',
  color: 'inherit',
  font: '700 14px/1 var(--mbc-font-sans)',
} as const

/** The compact grid: days of the week across the top, today ringed, the
    selected day filled, a dot under any day with something on it. Selecting
    a day is a button press, so the keyboard reaches every day. */
export function MonthGrid({
  pager,
  marked,
  ink,
  soft,
  ground,
}: {
  pager: MonthPager
  /** Whether a day has something on it. */
  marked(day: Date): boolean
  /** The tile's ink, its softer ink, and its ground (the selected day's text). */
  ink: string
  soft: string
  ground: string
}) {
  const today = startOfToday()
  const grid = useMemo(() => monthGrid(pager.month), [pager.month])
  // Five rows when the month fits in five.
  const days = grid[35] && grid[35].getMonth() === pager.month.getMonth() ? grid : grid.slice(0, 35)

  return (
    <div role="group" aria-label={formatMonthTitle(pager.month)} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', textAlign: 'center', rowGap: 2 }}>
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
        <span key={i} aria-hidden="true" style={{ font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.12em', color: soft, padding: '4px 0 10px' }}>
          {d}
        </span>
      ))}
      {days.map((day) => {
        const inMonth = day.getMonth() === pager.month.getMonth()
        const isToday = sameDay(day, today)
        const isSelected = sameDay(day, pager.selected)
        const busy = marked(day)
        return (
          <button
            key={toIso(day)}
            type="button"
            aria-pressed={isSelected}
            aria-current={isToday ? 'date' : undefined}
            aria-label={day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + (busy ? ', has events' : '')}
            onClick={() => pager.select(day)}
            style={{ height: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: ink }}
          >
            <span
              className="tabular"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                borderRadius: 999,
                background: isSelected ? ink : 'transparent',
                color: isSelected ? ground : ink,
                boxShadow: isToday && !isSelected ? `inset 0 0 0 2px ${ink}` : undefined,
                font: `${isToday || isSelected ? 700 : 400} 15px/1 var(--mbc-font-sans)`,
                opacity: inMonth ? 1 : 0.45,
              }}
            >
              {day.getDate()}
            </span>
            <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 999, background: busy && inMonth ? soft : 'transparent' }} />
          </button>
        )
      })}
    </div>
  )
}
