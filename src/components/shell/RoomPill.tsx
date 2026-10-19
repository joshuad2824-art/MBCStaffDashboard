import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { OpenRoom, RoomKey } from '../../screens/rooms'
import { useNarrow } from '../../lib/displayScale'

/* The pill: the one control that floats, and it holds still. Every room keeps
   its slot on every page, so the hand learns where a room is and it stays
   there. Each word carries its lamp; the room you are in is the lit well.

   ← is "up" to the room's front page, then to the side's home; it never leaves
   the app. On a phone the pill folds to ← and the room you are in, and the
   room's name opens the one sheet with every room and back room in it.

   It sits in a lane the page leaves free at the bottom (--pill-lane), so it
   never covers the last thing on a page. */
export function RoomPill({
  rooms,
  room,
  home,
  unread,
  moreOpen,
  onMore,
}: {
  rooms: OpenRoom[]
  room: OpenRoom | null
  home: string
  unread: Partial<Record<RoomKey, number>>
  moreOpen: boolean
  onMore(): void
}) {
  const narrow = useNarrow()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const upTo = room && pathname !== room.landing ? room.landing : pathname !== home ? home : null
  const totalUnread = rooms.reduce((sum, r) => sum + (unread[r.key] ?? 0), 0)

  const up = (
    <button
      type="button"
      aria-label={upTo ? 'Up one level' : 'You are at the top'}
      disabled={!upTo}
      onClick={() => upTo && navigate(upTo)}
      style={{
        width: narrow ? 48 : 44,
        height: narrow ? 48 : 44,
        borderRadius: 999,
        border: 'none',
        background: 'none',
        flex: 'none',
        cursor: upTo ? 'pointer' : 'default',
        font: '400 19px/1 var(--mbc-font-sans)',
        color: upTo ? 'var(--pill-ink)' : 'var(--mbc-dark-border)',
      }}
    >
      ←
    </button>
  )

  const shell = {
    display: 'flex',
    alignItems: 'center',
    gap: narrow ? 6 : 2,
    background: 'var(--pill-ground)',
    borderRadius: 999,
    padding: 8,
    boxShadow: 'var(--pill-shadow)',
    pointerEvents: 'auto',
  } as const

  return (
    <nav
      aria-label="Rooms"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: narrow ? 16 : 22,
        zIndex: 28,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      {narrow ? (
        <div style={{ ...shell, width: '100%', maxWidth: 460 }}>
          {up}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={onMore}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 999,
              border: 'none',
              background: 'var(--pill-well)',
              color: 'var(--pill-well-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              font: '700 16px/1 var(--mbc-font-sans)',
              cursor: 'pointer',
            }}
          >
            <span className="lamp-sm" style={{ background: wellLamp(room) }} aria-hidden="true" />
            {room?.label ?? 'More'}
            {totalUnread > 0 ? <Badge n={totalUnread} /> : null}
            <span className={moreOpen ? 'chev' : 'chev-up'} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div style={shell}>
          {up}
          {rooms.map((r) => (
            <Link key={r.key} to={r.landing} className="room-link" aria-current={r === room ? 'page' : undefined}>
              <span className="lamp-sm" style={{ background: r === room ? wellLamp(r) : r.lit }} aria-hidden="true" />
              {r.label}
              {unread[r.key] ? <Badge n={unread[r.key] ?? 0} /> : null}
            </Link>
          ))}
          <span aria-hidden="true" style={{ width: 1, height: 26, background: 'var(--pill-rule)', margin: '0 6px' }} />
          <button
            type="button"
            className="room-link"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-current={room ? undefined : 'page'}
            onClick={onMore}
            style={{ border: 'none', cursor: 'pointer', minWidth: 84, background: room ? 'transparent' : undefined }}
          >
            More
          </button>
        </div>
      )}
    </nav>
  )
}

/** The lamp drawn inside the lit well. Home's lamp is the well's own ink, so
    it never vanishes into the well at night. */
function wellLamp(room: OpenRoom | null): string {
  if (!room) return 'var(--room-more)'
  return room.key === 'today' || room.key === 'meeting' ? 'var(--pill-well-ink)' : room.lamp
}

function Badge({ n }: { n: number }) {
  return (
    <span
      className="tabular"
      aria-label={`${n} new`}
      style={{ background: 'var(--action-primary)', color: 'var(--action-primary-text)', borderRadius: 999, font: '700 11px/1 var(--mbc-font-sans)', padding: '4px 7px' }}
    >
      {n}
    </span>
  )
}
