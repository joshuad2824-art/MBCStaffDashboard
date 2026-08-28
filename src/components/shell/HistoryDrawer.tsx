import { Button, Eyebrow, Rule } from '../ui'
import { useStore } from '../../data/store'

/** A 420px right drawer listing this session's changes. Only the newest row is
    undoable — the others say so rather than pretending otherwise. */
export function HistoryDrawer({ open, onClose }: { open: boolean; onClose(): void }) {
  const { history, undo } = useStore()
  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', justifyContent: 'flex-end' }}>
      <button
        type="button"
        aria-label="Close recent changes"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'var(--mbc-scrim)', border: 'none', cursor: 'pointer' }}
      />
      <aside
        style={{
          position: 'relative',
          width: 'min(420px, 100%)',
          height: '100%',
          background: 'var(--surface-card)',
          borderLeft: '1px solid var(--border-section)',
          padding: '26px 26px 40px',
          overflowY: 'auto',
          display: 'grid',
          gap: 20,
          alignContent: 'start',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Eyebrow>This session</Eyebrow>
            <p
              style={{
                font: '600 24px/1.2 var(--mbc-font-serif)',
                color: 'var(--text-heading)',
                margin: '10px 0 0',
              }}
            >
              Recent changes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: '1px solid var(--border-control)',
              borderRadius: 'var(--mbc-radius-pill)',
              width: 44,
              height: 44,
              cursor: 'pointer',
              color: 'var(--text-heading)',
              font: '400 16px/1 var(--mbc-font-sans)',
            }}
          >
            ×
          </button>
        </div>

        <Rule />

        {history.length === 0 ? (
          <p style={{ font: '400 15px/1.7 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
            Nothing has changed since you opened the board.
          </p>
        ) : (
          <div style={{ display: 'grid' }}>
            {history.map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  display: 'grid',
                  gap: 8,
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border-hairline)',
                }}
              >
                <p style={{ font: '400 15px/1.5 var(--mbc-font-sans)', color: 'var(--text-heading)', margin: 0 }}>
                  {entry.label}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span
                    className="tabular"
                    style={{ font: '400 12px/1 var(--mbc-font-sans)', color: 'var(--text-muted)' }}
                  >
                    {entry.at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {index === 0 ? (
                    <Button variant="outline" size="sm" style={{ minHeight: 36, padding: '10px 18px' }} onClick={undo}>
                      Undo
                    </Button>
                  ) : (
                    <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-muted)' }}>
                      Undo the ones above first
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
