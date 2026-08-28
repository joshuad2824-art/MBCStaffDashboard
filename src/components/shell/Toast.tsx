import { Button } from '../ui'
import { useStore } from '../../data/store'

/** Fixed bottom-centre pill. Auto-dismisses after three seconds and carries an
    UNDO button when the action it announces can be taken back. */
export function Toast() {
  const { toast, undo, dismissToast } = useStore()
  if (!toast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 26,
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'var(--surface-dark)',
        color: 'var(--text-on-dark)',
        borderRadius: 'var(--mbc-radius-pill)',
        padding: '14px 18px 14px 24px',
        boxShadow: 'var(--mbc-shadow-print)',
        maxWidth: 'min(560px, calc(100vw - 40px))',
      }}
    >
      <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)' }}>{toast.message}</span>
      {toast.undoable ? (
        <Button
          variant="ghostDark"
          size="sm"
          style={{ minHeight: 34, padding: '9px 16px' }}
          onClick={() => {
            undo()
            dismissToast()
          }}
        >
          UNDO
        </Button>
      ) : null}
    </div>
  )
}
