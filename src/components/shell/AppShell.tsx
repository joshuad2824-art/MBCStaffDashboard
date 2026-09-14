import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Header } from './Header'
import { HistoryDrawer } from './HistoryDrawer'
import { PresentMode } from './PresentMode'
import { Sidebar } from './Sidebar'
import { ContextBar } from './ContextBar'
import { Toast } from './Toast'
import { useData } from '../../data/store'
import { useSession } from '../../session/session'
import { useUnreadThreadIds } from '../../lib/unread'
import { reaches } from '../../lib/audience'
import type { Surface } from '../../screens/surfaces'
import { NARROW, useMediaQuery } from '../../lib/media'

export function AppShell({ surface, children }: { surface: Surface; children: ReactNode }) {
  const data = useData()
  const { member, viewAs, context } = useSession()
  const [historyOpen, setHistoryOpen] = useState(false)
  const narrow = useMediaQuery(NARROW)

  /* One count per room. A thread addressed to both rooms counts in each; it is
     the same thread, unread in both places until it is opened in one. */
  const staffThreads = useMemo(() => data.threads.filter((thread) => reaches(thread.audience, 'staff')), [data.threads])
  const boardThreads = useMemo(() => data.threads.filter((thread) => reaches(thread.audience, 'deacon-board')), [data.threads])
  const unread = {
    staff: useUnreadThreadIds(member?.id ?? null, staffThreads).length,
    deacon: useUnreadThreadIds(member?.id ?? null, boardThreads).length,
  }

  /* Tables and calendars take the whole monitor. Everything else stops where
     lines stop being comfortable to read — and is centred there, so on a very
     wide screen the leftover space sits evenly either side rather than piling
     up on the right and reading as a mistake. */
  const contentMax = surface.wide ? '100%' : 'var(--mbc-measure-max)'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        // The deacon side's nav labels are 15px, so its column is 258px.
        gridTemplateColumns: narrow ? 'minmax(0,1fr)' : `minmax(0,${context === 'deacon' ? 258 : 244}px) minmax(0,1fr)`,
      }}
    >
      <Sidebar unread={viewAs === 'limited' ? { staff: 0, deacon: unread.deacon } : unread} />

      <div style={{ minWidth: 0 }}>
        <ContextBar />
        <Header
          eyebrow={surface.eyebrow}
          title={surface.title}
          maxWidth={contentMax}
          onOpenHistory={() => setHistoryOpen(true)}
        />

        <main
          style={{
            padding: 'clamp(24px,3vw,40px) clamp(20px,3vw,40px) 90px',
            maxWidth: contentMax,
            marginInline: 'auto',
          }}
        >
          <p
            style={{
              // Raised for the deacon side: monthly users, some in their seventies.
              font: context === 'deacon' ? '400 17px/1.7 var(--mbc-font-sans)' : '400 16px/1.7 var(--mbc-font-sans)',
              color: 'var(--text-meta)',
              maxWidth: context === 'deacon' ? '64ch' : '66ch',
              margin: context === 'deacon' ? '0 0 30px' : '0 0 28px',
            }}
          >
            {surface.lead}
          </p>

          {children}
        </main>
      </div>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <PresentMode />
      <Toast />
    </div>
  )
}
