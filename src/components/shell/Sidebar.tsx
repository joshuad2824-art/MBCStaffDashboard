import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Rule } from '../ui'
import { useSession } from '../../session/session'
import { NARROW, useMediaQuery } from '../../lib/media'
import { SURFACES, bodyName, surfacesFor } from '../../screens/surfaces'
import { ChangePasswordDialog } from './ChangePasswordDialog'

interface NavItem {
  to: string
  label: string
  badge?: number
}

function Item({ item, large }: { item: NavItem; large: boolean }) {
  const badge = item.badge && item.badge > 0 ? item.badge : null
  const content = (active: boolean) => (
    <>
      <span style={{ fontWeight: active ? 700 : 400 }}>{item.label}</span>
      {badge ? (
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
    // 48px and 15px on the deacon side: monthly users need larger targets.
    minHeight: large ? 48 : 44,
    borderRadius: 10,
    padding: large ? '13px 14px' : '12px 14px',
    font: large ? '400 15px/1.3 var(--mbc-font-sans)' : '400 14px/1.3 var(--mbc-font-sans)',
    color: 'var(--text-heading)',
    transition: 'var(--motion-hover)',
    border: '1px solid transparent',
  } as const

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

export function Sidebar({ unread }: { unread: { staff: number; deacon: number } }) {
  const { member, seats, bodies, viewAs, sides, context, signOut, auth, previewSeat, access } = useSession()
  const narrow = useMediaQuery(NARROW)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const deacon = context === 'deacon'

  /* Assembled from membership. A surface this person cannot open is not here
     — not locked, not dimmed, not there. The router gives the same answer. */
  const groups: NavItem[][] = []
  for (const surface of surfacesFor({ bodies, viewAs, sides, context, previewSeat, access })) {
    const item: NavItem = { to: surface.path, label: surface.nav }
    if (surface === SURFACES.discussion) item.badge = unread.staff
    if (surface === SURFACES.boardDiscussion) item.badge = unread.deacon
    ;(groups[surface.group] ??= []).push(item)
  }

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
            {deacon ? 'DEACONS\u2019 DASHBOARD' : 'STAFF DASHBOARD'}
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
        {groups.filter(Boolean).map((group, index) => (
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
                <Item key={item.to} item={item} large={deacon} />
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
        <span style={{ font: deacon ? '700 15px/1.3 var(--mbc-font-sans)' : '700 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>
          {member?.name}
        </span>
        {/* On the deacon side a man is described by what he belongs to, not
            by where he sits on a ladder. */}
        <span style={{ font: deacon ? '400 13px/1.4 var(--mbc-font-sans)' : '400 12px/1.4 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>
          {previewSeat
            ? `Viewing as — ${previewSeat.label}`
            : deacon
            ? seats
                .filter((seat) => seat.slug !== 'staff')
                .map((seat) => bodyName(seat.slug) + (seat.role === 'chair' ? ' · chair' : seat.role === 'ex_officio' ? ' · ex officio' : ''))
                .join(' · ')
            : `${member?.role} · role ${viewAs}`}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: narrow ? 12 : 8 }}>
          {auth.mode === 'supabase' ? (
            <button type="button" onClick={() => setPasswordOpen(true)} style={accountActionStyle}>
              Change password
            </button>
          ) : null}
          <button type="button" onClick={signOut} style={accountActionStyle}>
            Sign out
          </button>
        </div>
      </div>
      </nav>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  )
}

const accountActionStyle = {
  background: 'none',
  border: 'none',
  padding: '4px 0',
  textAlign: 'left',
  font: '400 13px/1.4 var(--mbc-font-sans)',
  color: 'var(--text-link)',
  cursor: 'pointer',
} as const
