import { useNavigate } from 'react-router-dom'
import { useSession } from '../../session/session'

/* Loud, persistent, and honest: the dark band the design system already uses
   for the context toggle. `Viewing as — <seat> · Read only · Exit`. It does
   not survive a reload and does not survive sign-out, because a preview that
   somebody forgot they were in is a preview that gets written under. */
export function ViewAsBar() {
  const { previewSeat, setPreviewSeat } = useSession()
  const navigate = useNavigate()
  if (!previewSeat) return null

  const exit = () => {
    setPreviewSeat(null)
    navigate('/')
  }

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 7,
        background: 'var(--surface-dark)',
        padding: '14px clamp(20px,3vw,40px)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px 24px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 16px', minWidth: 0 }}>
        <span style={{ font: '700 20px/1.2 var(--mbc-font-serif)', letterSpacing: '-.01em', color: 'var(--text-on-dark-strong)' }}>
          Viewing as — {previewSeat.label}
        </span>
        <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-on-dark-label)' }}>
          Read only. The surfaces are this seat’s; the records are your own.
        </span>
      </div>
      <button
        type="button"
        onClick={exit}
        style={{
          background: 'none',
          border: '1px solid var(--mbc-dark-border)',
          borderRadius: 'var(--mbc-radius-pill)',
          padding: '0 20px',
          minHeight: 44,
          font: '700 14px/1 var(--mbc-font-sans)',
          color: 'var(--text-on-dark)',
          cursor: 'pointer',
        }}
      >
        Exit view-as
      </button>
    </div>
  )
}
