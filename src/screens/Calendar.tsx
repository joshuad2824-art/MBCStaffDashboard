import { useMemo, useState } from 'react'
import { BodyBadge, Button, Card, Rule } from '../components/ui'
import { useData, useStore } from '../data/store'
import { useMeetings } from '../data/meetings/store'
import { useSession } from '../session/session'
import type { Side } from '../session/session'
import { ministryNames } from '../lib/serving'
import type { ChurchEvent, Ministry } from '../data/types'
import { composedAudience, noticesForEventPublish, otherRoom, reaches, roomOf, widen } from '../lib/audience'
import { monthGrid } from '../lib/calendar'
import { nextId } from '../lib/derive'
import { addMonths, formatMonthTitle, formatShort, parseDate, sameDay, startOfToday, toIso, todayIso } from '../lib/date'

/* One calendar, two rooms (mbc-deacons-dashboard-brief.md §3.1). An event is
   one row with an audience. The staff room shows what is addressed to the
   staff; the Board's room shows what is addressed to the Board, and the
   Board's own meetings beside it. A staff working draft is addressed to the
   staff alone and has no published date; sharing it with the Board widens the
   audience and stamps the date — deacons see it when it is ready and not
   before, and there is no second calendar to keep in step.

   Sharing writes back to the Notice Log the way the Communicator does when
   the bulletin goes out: the event's open notice is stamped, or one is
   created already stamped. One instrument, not two. */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DayEntry {
  key: string
  slot: string
  label: string
  meta: string
  event: ChurchEvent | null
}

export function Calendar({ side }: { side: Side }) {
  const data = useData()
  const { mutate } = useStore()
  const { member, bodies } = useSession()
  const today = startOfToday()
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date>(today)
  const [adding, setAdding] = useState(false)

  const room = roomOf(side)
  const other = otherRoom(side)
  const canWiden = bodies.includes(other)
  const grid = useMemo(() => monthGrid(month), [month])
  const events = useMemo(() => data.events.filter((event) => reaches(event.audience, room)), [data.events, room])

  const meetings = useBoardMeetings(side)

  const entriesFor = (day: Date): DayEntry[] => {
    const iso = toIso(day)
    const entries: DayEntry[] = meetings
      .filter((meeting) => meeting.on === iso)
      .map((meeting) => ({ key: 'meeting-' + meeting.id, slot: meeting.time, label: meeting.label, meta: meeting.meta, event: null }))
    for (const event of events) {
      if (event.startsAt !== iso) continue
      entries.push({
        key: 'event-' + event.id,
        slot: event.time || 'All day',
        label: event.name,
        meta: [event.location, side === 'staff' ? event.ministry : ''].filter(Boolean).join(' · '),
        event,
      })
    }
    return entries
  }

  if (!member) return null

  const monthCount = grid.filter((day) => day.getMonth() === month.getMonth()).reduce((total, day) => total + entriesFor(day).length, 0)
  const selectedEntries = entriesFor(selected)

  const share = (event: ChurchEvent) => {
    const audience = widen(event.audience, other)
    const stamp = todayIso()
    mutate(
      other === 'deacon-board' ? 'Shared with the Board. It counts as notified.' : 'Shared with the staff.',
      (current) => ({
        ...current,
        events: current.events.map((item) => (item.id === event.id ? { ...item, audience, publishedAt: item.publishedAt ?? stamp } : item)),
        // The Notice Log is the staff's instrument; sharing from the staff side writes to it.
        notices: side === 'staff' ? noticesForEventPublish(current, event, stamp, 'Deacon Board') : current.notices,
      }),
    )
  }

  const remove = (event: ChurchEvent) =>
    mutate('Removed an event from the calendar.', (current) => ({
      ...current,
      events: current.events.filter((item) => item.id !== event.id),
    }))

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card radius="card" pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px', display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <h2 style={{ font: '600 24px/1.2 var(--mbc-font-serif)', letterSpacing: '-.01em', color: 'var(--text-heading)', margin: 0 }}>
                {formatMonthTitle(month)}
              </h2>
              <p className="tabular" style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '6px 0 0' }}>
                {monthCount} {monthCount === 1 ? 'entry' : 'entries'} {side === 'deacon' ? 'the Board can see' : 'on the staff calendar'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label="←" title="Previous month" onClick={() => setMonth(addMonths(month, -1))} />
              <Pill
                label="Today"
                onClick={() => {
                  setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                  setSelected(today)
                }}
              />
              <Pill label="→" title="Next month" onClick={() => setMonth(addMonths(month, 1))} />
              <Button variant="outline" size="sm" onClick={() => setAdding((value) => !value)}>
                {adding ? 'Never mind' : 'Add an event'}
              </Button>
            </div>
          </div>

          {adding ? (
            <EventForm
              side={side}
              canWiden={canWiden}
              initialDate={toIso(selected)}
              onDone={() => setAdding(false)}
              onSave={(event) => {
                setAdding(false)
                setSelected(parseDate(event.startsAt) ?? selected)
                mutate(event.audience.length > 1 ? 'Added an event both sides can see.' : 'Added an event.', (current) => ({
                  ...current,
                  events: [...current.events, { ...event, id: nextId(current.events) }],
                  notices:
                    side === 'staff' && event.audience.length > 1
                      ? noticesForEventPublish(current, { ...event, id: nextId(current.events) }, todayIso(), 'Deacon Board')
                      : current.notices,
                }))
              }}
            />
          ) : null}

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
              const entries = entriesFor(day)
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
                      <span style={{ font: '700 9px/1 var(--mbc-font-sans)', letterSpacing: '.16em', color: 'var(--mbc-lamplight-deep)' }}>
                        TODAY
                      </span>
                    ) : null}
                  </span>
                  {entries.slice(0, 3).map((entry) => (
                    <span
                      key={entry.key}
                      style={{
                        font: '400 11px/1.35 var(--mbc-font-sans)',
                        color: entry.event === null ? 'var(--mbc-yale-sage)' : entry.event.audience.length > 1 ? 'var(--mbc-yale-sage)' : 'var(--text-body)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        maxWidth: '100%',
                      }}
                    >
                      {entry.label}
                    </span>
                  ))}
                  {entries.length > 3 ? (
                    <span className="tabular" style={{ font: '400 11px/1.35 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                      +{entries.length - 3} more
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <Rule tone="hair" />

        <div style={{ padding: '20px 24px 24px', display: 'grid', gap: 14 }}>
          <h3 style={{ font: '600 18px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {sameDay(selected, today) ? ' · today' : ''}
          </h3>

          {selectedEntries.length === 0 ? (
            <p style={{ font: '400 14px/1.7 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0, maxWidth: '60ch' }}>
              {side === 'deacon'
                ? 'Nothing on this day that reaches the Board. What the staff shares appears here the moment it is shared.'
                : 'Nothing on this day. An event added here is the staff’s working draft until it is shared.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 1, background: 'var(--border-hairline)' }}>
              {selectedEntries.map((entry) => (
                <div
                  key={entry.key}
                  style={{ background: 'var(--surface-card)', display: 'grid', gridTemplateColumns: '92px 1fr', gap: 14, padding: '12px 2px', alignItems: 'baseline' }}
                >
                  <span className="tabular" style={{ font: '400 13px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                    {entry.slot}
                  </span>
                  <span style={{ display: 'grid', gap: 6 }}>
                    <span style={{ font: '400 15px/1.45 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{entry.label}</span>
                    <span style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{entry.meta}</span>
                    {entry.event ? (
                      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <BodyBadge bodies={entry.event.audience} />
                        <span style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
                          {entry.event.publishedAt
                            ? 'Shared ' + formatShort(parseDate(entry.event.publishedAt))
                            : side === 'deacon'
                              ? 'The Board’s own'
                              : 'Working draft · the staff only'}
                        </span>
                        {canWiden && !reaches(entry.event.audience, other) ? (
                          <TextAction onClick={() => share(entry.event as ChurchEvent)}>
                            {other === 'deacon-board' ? 'Share with the Board' : 'Share with the staff'}
                          </TextAction>
                        ) : null}
                        <TextAction onClick={() => remove(entry.event as ChurchEvent)}>Remove</TextAction>
                      </span>
                    ) : (
                      <BodyBadge bodies={['deacon-board']} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

/* The Board's meetings, drawn beside the events on the Board's side. Loaded
   by MeetingsProvider only for a person seated on the deacon side; on the
   staff side there is nothing to read and nothing is asked for. */
function useBoardMeetings(side: Side): { id: string; on: string; time: string; label: string; meta: string }[] {
  const { data } = useMeetings()
  return useMemo(() => {
    if (side !== 'deacon' || !data) return []
    return data.meetings
      .filter((meeting) => meeting.status !== 'cancelled')
      .map((meeting) => ({
        id: meeting.id,
        on: meeting.meetsOn,
        time: meeting.timeLabel || '4:00 PM',
        label: meeting.kind === 'special' ? 'Special meeting of the Board' : 'Board meeting',
        meta: [meeting.location, meeting.status === 'held' ? 'Held' : ''].filter(Boolean).join(' · '),
      }))
  }, [side, data])
}

function EventForm({
  side,
  canWiden,
  initialDate,
  onSave,
  onDone,
}: {
  side: Side
  canWiden: boolean
  initialDate: string
  onSave(event: Omit<ChurchEvent, 'id'>): void
  onDone(): void
}) {
  const data = useData()
  const [name, setName] = useState('')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [ministry, setMinistry] = useState<Ministry>('All')
  const [alsoOther, setAlsoOther] = useState(false)
  const other = otherRoom(side)
  const audience = composedAudience(side, canWiden && alsoOther)
  const ready = name.trim().length > 0 && parseDate(date) !== null

  return (
    <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--border-section)', borderRadius: 14, padding: '16px 18px', display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <Field label="What" value={name} onChange={setName} placeholder="Name of the event" />
        <Field label="Date" value={date} onChange={setDate} type="date" />
        <Field label="Time" value={time} onChange={setTime} placeholder="6:00 PM" />
        <Field label="Where" value={location} onChange={setLocation} placeholder="Fellowship hall" />
        {side === 'staff' ? (
          <label style={labelStyle}>
            Ministry
            <select value={ministry} onChange={(event) => setMinistry(event.target.value as Ministry)} style={fieldStyle}>
              {ministryNames(data).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        <Button
          variant="outline"
          size="sm"
          disabled={!ready}
          onClick={() =>
            onSave({
              name: name.trim(),
              ministry,
              startsAt: date,
              time: time.trim(),
              location: location.trim(),
              cadenceItemId: null,
              audience,
              publishedAt: audience.length > 1 ? todayIso() : null,
            })
          }
        >
          Add it
        </Button>
        <Button variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        {canWiden ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/1.5 var(--mbc-font-sans)', color: 'var(--text-body)', cursor: 'pointer' }}>
            <input type="checkbox" checked={alsoOther} onChange={(event) => setAlsoOther(event.target.checked)} />
            {other === 'staff' ? 'Also the staff' : 'Share with the Board now'}
          </label>
        ) : null}
        <BodyBadge bodies={audience} />
      </div>
      <p style={{ font: '400 13px/1.5 var(--mbc-font-sans)', color: alsoOther ? 'var(--mbc-yale-sage)' : 'var(--text-meta)', margin: 0 }}>
        {alsoOther
          ? 'Both sides will see it from the start, and it will be stamped as shared today.'
          : side === 'staff'
            ? 'A working draft. The Board sees it when you share it, and not before.'
            : 'The Board’s own. The staff see it if you share it.'}
      </p>
    </div>
  )
}

const labelStyle = { display: 'grid', gap: 6, font: '700 11px/1 var(--mbc-font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-eyebrow)' } as const
const fieldStyle = {
  width: '100%',
  minHeight: 44,
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-panel)',
  borderRadius: 'var(--mbc-radius-input)',
  padding: '10px 12px',
  font: '400 15px/1.3 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
  textTransform: 'none',
  letterSpacing: 0,
} as const

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange(value: string): void; placeholder?: string; type?: string }) {
  return (
    <label style={labelStyle}>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={fieldStyle} />
    </label>
  )
}

function TextAction({ onClick, children }: { onClick(): void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 0, font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer' }}
    >
      {children}
    </button>
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
      }}
    >
      {label}
    </button>
  )
}
