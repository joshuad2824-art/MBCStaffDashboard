import { useState } from 'react'
import type { ReactNode } from 'react'
import { Card, Eyebrow } from '../ui'
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

  const locked = Boolean(surface.staffOnly) && viewAs === 'limited'

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
        <Header eyebrow={surface.eyebrow} title={surface.title} onOpenHistory={() => setHistoryOpen(true)} />

        <main style={{ padding: 'clamp(24px,3vw,40px) clamp(20px,3vw,40px) 90px', maxWidth: 1380 }}>
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

          {locked ? <RoleGate /> : children}
        </main>
      </div>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <PresentMode />
      <Toast />
    </div>
  )
}

/** What a limited account sees in place of Care and Discussion. In production
    this is a query the database refuses, not a panel the client chooses to draw. */
function RoleGate() {
  return (
    <Card tone="panel" pad="clamp(28px,3vw,44px)" style={{ maxWidth: 640 }}>
      <Eyebrow>Role</Eyebrow>
      <p
        style={{
          font: '600 24px/1.25 var(--mbc-font-serif)',
          color: 'var(--text-heading)',
          margin: '14px 0 12px',
        }}
      >
        This surface is staff-role only.
      </p>
      <p style={{ font: '400 15px/1.7 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
        Care pipelines and the discussion board hold named members’ circumstances. Access is by role, enforced in the
        database rather than by hiding buttons here.
      </p>
    </Card>
  )
}
