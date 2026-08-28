import { NavLink } from 'react-router-dom'
import { Rule } from '../ui'
import { useSession } from '../../session/session'
import { NARROW, useMediaQuery } from '../../lib/media'

interface NavItem {
  to: string
  label: string
  badge?: number
  /** Staff-role surfaces. A limited account sees the label and a LOCKED tag. */
  staffOnly?: boolean
}

const ITEM_HEIGHT = 44

function Item({ item, locked }: { item: NavItem; locked: boolean }) {
  const badge = item.badge && item.badge > 0 ? item.badge : null
  const content = (active: boolean) => (
    <>
      <span style={{ fontWeight: active ? 700 : 400 }}>{item.label}</span>
      {locked ? (
        <span
          style={{
            font: '700 9px/1 var(--mbc-font-sans)',
            letterSpacing: '.18em',
            color: 'var(--text-muted)',
          }}
        >
          LOCKED
        </span>
      ) : badge ? (
        <span
          className="tabular"
          style={{
            background: 'var(--action-dark)',
            color: 'var(--text-on-dark)',
            borderRadius: 'var(--mbc-radius-pill)',
            font: '700 11px/1 var(--mbc-font-sans)',
            padding: '4px 8px',
          }}
        >
          {badge}
        </span>
      ) : null}
    </>
  )

  const base = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: ITEM_HEIGHT,
    borderRadius: 10,
    padding: '12px 14px',
    font: '400 14px/1.3 var(--mbc-font-sans)',
    color: 'var(--text-heading)',
    transition: 'var(--motion-hover)',
    border: '1px solid transparent',
  } as const

  if (locked) {
    return <div style={{ ...base, color: 'var(--text-muted)', cursor: 'not-allowed' }}>{content(false)}</div>
  }

  return (
    <NavLink
      to={item.to}
      style={({ isActive }) => ({
        ...base,
        background: isActive ? 'var(--surface-panel)' : 'transparent',
        borderColor: isActive ? 'var(--border-section)' : 'transparent',
      })}
      onMouseEnter={(event) => {
        const el = event.currentTarget
        if (el.getAttribute('aria-current') !== 'page') el.style.background = 'var(--surface-panel)'
      }}
      onMouseLeave={(event) => {
        const el = event.currentTarget
        if (el.getAttribute('aria-current') !== 'page') el.style.background = 'transparent'
      }}
    >
      {({ isActive }) => content(isActive)}
    </NavLink>
  )
}

export function Sidebar({ unread }: { unread: number }) {
  const { member, viewAs, signOut } = useSession()
  const narrow = useMediaQuery(NARROW)
  const limited = viewAs === 'limited'

  const groups: NavItem[][] = [
    [{ to: '/today', label: 'Today' }],
    [
      { to: '/huddle', label: 'Huddle' },
      { to: '/cadence', label: 'Cadence ledger' },
      { to: '/notice', label: 'Notice log' },
      { to: '/discussion', label: 'Discussion', badge: unread, staffOnly: true },
    ],
    [
      { to: '/communicator', label: 'Communicator' },
      { to: '/care', label: 'Care pipelines', staffOnly: true },
      { to: '/goals', label: 'Goals' },
    ],
  ]

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        borderRight: narrow ? 'none' : '1px solid var(--border-section)',
        borderBottom: narrow ? '1px solid var(--border-section)' : 'none',
        minWidth: 0,
      }}
    >
      <nav
        aria-label="Surfaces"
        style={{
          padding: narrow ? '16px clamp(20px,3vw,40px)' : '24px 16px',
          position: narrow ? 'static' : 'sticky',
          top: 0,
          height: narrow ? 'auto' : '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: narrow ? 12 : 18,
          overflowY: narrow ? 'visible' : 'auto',
        }}
      >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 6px 4px' }}>
        <img src="/assets/mbc-mark.png" alt="" width={38} height={38} style={{ objectFit: 'contain' }} />
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              font: '600 18px/1.1 var(--mbc-font-serif)',
              letterSpacing: '-.015em',
              color: 'var(--text-heading)',
            }}
          >
            Memorial
          </span>
          <span
            style={{
              font: '700 8px/1 var(--mbc-font-sans)',
              letterSpacing: '.26em',
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            STAFF DASHBOARD
          </span>
        </span>
      </div>

      <div
        style={
          narrow
            ? { display: 'flex', flexWrap: 'wrap', gap: 4 }
            : { display: 'grid', gap: 14, flex: 1, alignContent: 'start' }
        }
      >
        {groups.map((group, index) => (
          <div
            key={index}
            style={
              narrow
                ? { display: 'flex', flexWrap: 'wrap', gap: 4 }
                : { display: 'grid', gap: 14 }
            }
          >
            {index > 0 && !narrow ? <Rule tone="hair" /> : null}
            <div style={narrow ? { display: 'flex', flexWrap: 'wrap', gap: 4 } : { display: 'grid', gap: 2 }}>
              {group.map((item) => (
                <Item key={item.to} item={item} locked={Boolean(item.staffOnly) && limited} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: narrow ? 'flex' : 'grid',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: narrow ? 10 : 8,
          paddingTop: 14,
          borderTop: '1px solid var(--border-hairline)',
        }}
      >
        {narrow ? null : (
          <span
            style={{
              font: '700 9px/1 var(--mbc-font-sans)',
              letterSpacing: '.2em',
              color: 'var(--text-muted)',
            }}
          >
            SIGNED IN AS
          </span>
        )}
        <span style={{ font: '700 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
          {member?.name}
        </span>
        <span style={{ font: '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
          {member?.role} · role {viewAs}
        </span>
        <button
          type="button"
          onClick={signOut}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 0',
            textAlign: 'left',
            font: '400 13px/1.4 var(--mbc-font-sans)',
            color: 'var(--text-link)',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
      </nav>
    </div>
  )
}
