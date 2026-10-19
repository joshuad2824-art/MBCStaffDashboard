import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { RoomPill } from './RoomPill'
import { MoreSheet } from './MoreSheet'
import { HistoryDrawer } from './HistoryDrawer'
import { PresentMode } from './PresentMode'
import { ViewAsBar } from './ViewAsBar'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { Toast } from './Toast'
import { useData } from '../../data/store'
import { useSession } from '../../session/session'
import { useUnreadThreadIds } from '../../lib/unread'
import { reaches } from '../../lib/audience'
import { homeOf, surfacesFor } from '../../screens/surfaces'
import type { Surface } from '../../screens/surfaces'
import { moreFor, roomOf, roomsFor } from '../../screens/rooms'
import type { RoomKey } from '../../screens/rooms'
import { useNarrow } from '../../lib/displayScale'

/* The frame every surface is drawn in (October 2026 redesign): a header that
   names the room, the page, and the pill at the bottom with every room in it.
   The sidebar, the dark side band and the per-page header are gone; what they
   carried now lives in the header's side switch and in More.

   Everything here is assembled from `surfacesFor()`: the pill, the tabs and
   More can never offer a surface the router would refuse. */
export function AppShell({ surface, children }: { surface: Surface; children: ReactNode }) {
  const data = useData()
  const { member, viewAs, bodies, sides, context, previewSeat, access } = useSession()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const narrow = useNarrow()

  const open = surfacesFor({ bodies, viewAs, sides, context, previewSeat, access })
  const rooms = roomsFor(open, context)
  const room = roomOf(surface, rooms)
  const back = moreFor(open)

  /* One count per room. A thread addressed to both rooms counts in each; it is
     the same thread, unread in both places until it is opened in one. */
  const staffThreads = useMemo(() => data.threads.filter((thread) => reaches(thread.audience, 'staff')), [data.threads])
  const boardThreads = useMemo(() => data.threads.filter((thread) => reaches(thread.audience, 'deacon-board')), [data.threads])
  const staffUnread = useUnreadThreadIds(member?.id ?? null, staffThreads).length
  const boardUnread = useUnreadThreadIds(member?.id ?? null, boardThreads).length
  const unread: Partial<Record<RoomKey, number>> = {
    huddle: viewAs === 'limited' ? 0 : staffUnread,
    boardroom: boardUnread,
  }

  /* Tables and calendars take the whole monitor. Everything else stops where
     lines stop being comfortable to read. */
  const contentMax = surface.wide ? '100%' : 'var(--mbc-measure-max)'
  const closeMore = useCallback(() => setMoreOpen(false), [])

  return (
    <div data-side={context} style={{ minHeight: 'var(--ui-vh)', background: 'var(--surface-page)' }}>
      {/* The bars that never scroll away — which seat is being worn, which
          room this is and which side — in one sticky stack. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 6 }}>
        <ViewAsBar />
        <TopBar room={room} surface={surface} maxWidth={contentMax} />
      </div>

      <main
        /* Read-only while a seat is worn: the composers are gone, not
           disabled (global.css hides every field under this attribute), and
           the stores refuse underneath in case one was missed. */
        data-view-as={previewSeat ? '' : undefined}
        style={{
          padding: narrow ? '20px 16px calc(var(--pill-lane) + 8px)' : 'clamp(24px,3vw,40px) clamp(20px,3vw,40px) calc(var(--pill-lane) + 24px)',
          maxWidth: contentMax,
          marginInline: 'auto',
        }}
      >
        {children}
      </main>

      <RoomPill rooms={rooms} room={room} home={homeOf(context)} unread={unread} moreOpen={moreOpen} onMore={() => setMoreOpen((v) => !v)} />
      <MoreSheet
        open={moreOpen}
        onClose={closeMore}
        rooms={rooms}
        room={room}
        back={back}
        unread={unread}
        onOpenHistory={() => setHistoryOpen(true)}
        onChangePassword={() => setPasswordOpen(true)}
      />
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <PresentMode />
      <Toast />
    </div>
  )
}
