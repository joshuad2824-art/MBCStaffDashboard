import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../data/store'
import { useSession } from '../../session/session'
import type { Side } from '../../session/session'
import { homeOf } from '../../screens/surfaces'
import type { Surface } from '../../screens/surfaces'
import { tabLabel } from '../../screens/rooms'
import type { OpenRoom } from '../../screens/rooms'
import { useNarrow } from '../../lib/displayScale'
import { useTheme } from '../../lib/theme'

/* The top of every page: the mark, the room you are in with its lamp, and —
   for the two people who hold both sides — which side this is. That switch is
   the loudest thing in the header (brief §2.4, rule 2): a filled segment that
   never fades or moves. It narrows what is drawn and reaches no query.

   A room with more than one surface shows them as tabs beneath. The page's own
   title is still an h1 for a screen reader; on screen the room and the lit
   tab say it. */
export function TopBar({ room, surface, maxWidth }: { room: OpenRoom | null; surface: Surface; maxWidth: string }) {
  const { history, undo } = useStore()
  const { sides, context, setContext, previewSeat } = useSession()
  const { evening } = useTheme()
  const navigate = useNavigate()
  const narrow = useNarrow()

  const switchTo = (side: Side) => {
    if (side === context) return
    setContext(side)
    navigate(homeOf(side))
  }

  const title = room?.label ?? surface.nav
  const lamp = room?.lamp ?? 'var(--room-more)'
  const tabs = room && room.open.length > 1 ? room.open : []

  return (
    <header style={{ background: 'var(--mbc-header-bg)', backdropFilter: 'var(--mbc-blur-chrome)', WebkitBackdropFilter: 'var(--mbc-blur-chrome)', borderBottom: '1px solid var(--border-section)' }}>
      <div
        style={{
          maxWidth,
          marginInline: 'auto',
          padding: narrow ? '10px 16px' : '14px clamp(20px,3vw,40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 12 : 16, minWidth: 0 }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: narrow ? 34 : 40,
              height: narrow ? 34 : 40,
              borderRadius: 999,
              background: evening ? 'var(--mbc-on-dark)' : 'transparent',
              flex: 'none',
            }}
          >
            <img src="/assets/mbc-mark.png" alt="Memorial Baptist Church" width={narrow ? 28 : 34} height={narrow ? 28 : 34} style={{ objectFit: 'contain' }} />
          </span>
          {narrow ? null : <span aria-hidden="true" style={{ width: 1, height: 28, background: 'var(--border-section)' }} />}
          <span style={{ display: 'flex', alignItems: 'center', gap: narrow ? 10 : 12, minWidth: 0 }}>
            <span className="lamp" style={{ background: lamp }} aria-hidden="true" />
            <span
              style={{
                font: `600 ${narrow ? 23 : 28}px/1.1 var(--mbc-font-serif)`,
                letterSpacing: '-.02em',
                color: 'var(--text-heading)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </span>
          </span>
          <h1 className="sr-only">{surface.title}</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          {context === 'staff' && history.length > 0 && !previewSeat ? (
            <button type="button" onClick={undo} style={outline(narrow)}>
              Undo
            </button>
          ) : null}
          {sides.length > 1 ? (
            <div
              role="group"
              aria-label="Which side you are on"
              style={{ display: 'flex', gap: 4, padding: 4, border: '1px solid var(--border-control)', borderRadius: 999, background: 'var(--surface-card)' }}
            >
              {(['staff', 'deacon'] as Side[]).map((side) => {
                const on = side === context
                return (
                  <button
                    key={side}
                    type="button"
                    aria-pressed={on}
                    onClick={() => switchTo(side)}
                    style={{
                      minHeight: narrow ? 36 : 40,
                      padding: narrow ? '0 12px' : '0 20px',
                      borderRadius: 999,
                      border: 'none',
                      cursor: on ? 'default' : 'pointer',
                      background: on ? 'var(--text-heading)' : 'transparent',
                      color: on ? 'var(--surface-page)' : 'var(--text-body)',
                      font: `700 ${narrow ? 13 : 14}px/1 var(--mbc-font-sans)`,
                    }}
                  >
                    {narrow ? (side === 'staff' ? 'Staff' : 'Deacons') : side === 'staff' ? 'Staff side' : 'Deacon side'}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      {tabs.length > 0 && room ? (
        <nav
          aria-label={room.label}
          className="quiet-scroll"
          style={
            {
              maxWidth,
              marginInline: 'auto',
              padding: narrow ? '0 16px 12px' : '0 clamp(20px,3vw,40px) 14px',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              '--tab-fill': room.tabFill,
              '--tab-ink': room.tabInk,
            } as React.CSSProperties
          }
        >
          {tabs.map((tab) => (
            <Link key={tab.path} to={tab.path} className="room-tab" aria-current={tab === surface ? 'page' : undefined}>
              {tabLabel(tab)}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  )
}

const outline = (narrow: boolean) =>
  ({
    minHeight: narrow ? 36 : 40,
    padding: '0 16px',
    borderRadius: 999,
    background: 'none',
    border: '1px solid var(--border-control)',
    font: `700 ${narrow ? 13 : 14}px/1 var(--mbc-font-sans)`,
    color: 'var(--text-heading)',
    cursor: 'pointer',
  }) as const
