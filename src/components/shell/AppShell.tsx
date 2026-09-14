import { useState } from 'react'
import type { ReactNode } from 'react'
import { Header } from './Header'
import { HistoryDrawer } from './HistoryDrawer'
import { PresentMode } from './PresentMode'
import { Sidebar } from './Sidebar'
import { Toast } from './Toast'
import { useData } from '../../data/store'
import { useSession } from '../../session/session'
import { useUnreadThreadIds } from '../../lib/unread'
import type { Surface } from '../../screens/surfaces'
import { NARROW, useMediaQuery } from '../../lib/media'

export function AppShell({ surface, children }: { surface: Surface; children: ReactNode }) {
  const data = useData()
  const { member, viewAs } = useSession()
  const [historyOpen, setHistoryOpen] = useState(false)
  const narrow = useMediaQuery(NARROW)

  const unread = useUnreadThreadIds(member?.id ?? null, data.threads).length

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
        gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'minmax(0,244px) minmax(0,1fr)',
      }}
    >
      <Sidebar unread={viewAs === 'limited' ? 0 : unread} />

      <div style={{ minWidth: 0 }}>
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
              font: '400 16px/1.7 var(--mbc-font-sans)',
              color: 'var(--text-meta)',
              maxWidth: '66ch',
              margin: '0 0 28px',
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
