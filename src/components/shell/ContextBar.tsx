import { useNavigate } from 'react-router-dom'
import { useSession } from '../../session/session'
import { homeOf } from '../../screens/surfaces'

/* The current side, for the two people who hold both. Rule 2 of §2.4: it is
   the loudest thing on the screen, and it does not fade, collapse or move —
   someone who has been in the deacon view for twenty minutes should never
   have to wonder before they type. Rule 1: switching narrows what is drawn
   and changes nothing about what the database returns. */
export function ContextBar() {
  const { sides, context, setContext } = useSession()
  const navigate = useNavigate()
  if (sides.length < 2) return null

  const other = context === 'deacon' ? 'staff' : 'deacon'
  const switchSide = () => {
    setContext(other)
    navigate(homeOf(other))
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 6,
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
          {context === 'deacon' ? 'Deacon view' : 'Staff view'}
        </span>
        <span style={{ font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-on-dark-label)' }}>
          {context === 'deacon'
            ? 'Anything you write here goes to the Board unless you widen it.'
            : 'Anything you write here goes to staff unless you widen it.'}
        </span>
      </div>
      <button
        type="button"
        onClick={switchSide}
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
        {other === 'deacon' ? 'Switch to deacon view' : 'Switch to staff view'}
      </button>
    </div>
  )
}
