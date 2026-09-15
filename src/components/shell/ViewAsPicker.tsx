import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../data/store'
import { useMeetings } from '../../data/meetings/store'
import { useSession } from '../../session/session'
import { SEATS, seatOf } from '../../session/viewAs'
import type { PreviewSeat } from '../../session/viewAs'

/* Offered to an administrator and to nobody else. Seats first; then people,
   as shortcuts that resolve to their seat set — the roster this person can
   already read, which is every seat in a body he sits in. A name is a way of
   picking a seat, and the label stays a seat. */
export function ViewAsPicker() {
  const { people } = useData()
  const meetings = useMeetings()
  const { setPreviewSeat } = useSession()
  const navigate = useNavigate()

  const shortcuts = useMemo<PreviewSeat[]>(() => {
    const byPerson = new Map<string, { name: string; seats: { slug: string; role: string }[] }>()
    for (const seat of meetings.data?.seats ?? []) {
      const entry = byPerson.get(seat.personId) ?? { name: seat.name, seats: [] }
      entry.seats.push({ slug: seat.bodySlug, role: seat.seat })
      byPerson.set(seat.personId, entry)
    }
    return [...byPerson.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, seats }) => {
        const onRoster = people.find((p) => p.name === name)
        return seatOf(name, seats, onRoster?.access === 'staff' ? 'staff' : 'limited')
      })
  }, [meetings.data, people])

  const choose = (id: string) => {
    const seat = SEATS.find((s) => s.id === id) ?? shortcuts.find((s) => s.id === id) ?? null
    if (!seat) return
    setPreviewSeat(seat)
    navigate('/')
  }

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="sr-only">View as a seat</span>
      <select
        data-reads=""
        value=""
        onChange={(event) => choose(event.target.value)}
        style={{
          minHeight: 40,
          background: 'var(--surface-card)',
          border: '1px solid var(--mbc-border-panel)',
          borderRadius: 'var(--mbc-radius-pill)',
          padding: '0 14px',
          font: '700 13px/1 var(--mbc-font-sans)',
          color: 'var(--text-heading)',
          cursor: 'pointer',
        }}
      >
        <option value="">View as…</option>
        <optgroup label="Seats">
          {SEATS.map((seat) => (
            <option key={seat.id} value={seat.id}>{seat.label}</option>
          ))}
        </optgroup>
        {shortcuts.length ? (
          <optgroup label="A person’s seat">
            {shortcuts.map((seat) => (
              <option key={seat.id} value={seat.id}>{seat.label}</option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  )
}
