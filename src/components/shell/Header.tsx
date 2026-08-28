import { Button, Eyebrow } from '../ui'
import { useStore } from '../../data/store'
import { useSession } from '../../session/session'
import { formatLong, startOfToday } from '../../lib/date'

export function Header({
  eyebrow,
  title,
  onOpenHistory,
}: {
  eyebrow: string
  title: string
  onOpenHistory(): void
}) {
  const { history, undo } = useStore()
  const { previewingLimited, setPreviewingLimited, setPresentMode } = useSession()

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        background: 'var(--mbc-header-bg)',
        backdropFilter: 'var(--mbc-blur-chrome)',
        borderBottom: '1px solid var(--border-section)',
        padding: '20px clamp(20px,3vw,40px)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1
          style={{
            font: '600 clamp(24px,2.4vw,32px)/1.15 var(--mbc-font-serif)',
            letterSpacing: '-.02em',
            color: 'var(--text-heading)',
            margin: '10px 0 0',
          }}
        >
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <span className="tabular" style={{ font: '400 13px/1 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
          {formatLong(startOfToday())}
        </span>
        {history.length > 0 ? (
          <Button variant="outline" size="sm" onClick={undo}>
            Undo
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={onOpenHistory}>
          Recent changes
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPreviewingLimited(!previewingLimited)}>
          Viewing as {previewingLimited ? 'limited' : 'staff'}
        </Button>
        <Button variant="dark" size="sm" onClick={() => setPresentMode(true)}>
          Present mode
        </Button>
      </div>
    </header>
  )
}
