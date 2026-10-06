import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Rule } from '../ui'
import { useSession } from '../../session/session'
import { useNarrow } from '../../lib/displayScale'
import { SURFACES, bodyName, surfacesFor } from '../../screens/surfaces'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { RememberDevice } from '../RememberDevice'
import { DisplaySizeControl } from './DisplaySizeControl'

interface NavItem {
  to: string
  label: string
  badge?: number
}

function Item({ item, large, onNavigate }: { item: NavItem; large: boolean; onNavigate?(): void }) {
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
    // 48px and 15px on the deacon side and in the phone menu: monthly users
    // and thumbs need larger targets.
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
      onClick={onNavigate}
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

function Brand({ deacon }: { deacon: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <img src="/assets/mbc-mark.png" alt="" width={38} height={38} style={{ objectFit: 'contain', flex: 'none' }} />
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ font: '600 18px/1.1 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)' }}>Memorial</span>
        <span style={{ font: '700 8px/1 var(--mbc-font-sans)', letterSpacing: '.26em', color: 'var(--text-muted)', marginTop: 4 }}>
          {deacon ? 'DEACONS’ DASHBOARD' : 'STAFF DASHBOARD'}
        </span>
      </span>
    </div>
  )
}

function NavGroups({ groups, large, onNavigate }: { groups: NavItem[][]; large: boolean; onNavigate?(): void }) {
  return (
    <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      {groups.filter(Boolean).map((group, index) => (
        <div key={index} style={{ display: 'grid', gap: 14 }}>
          {index > 0 ? <Rule tone="hair" /> : null}
          <div style={{ display: 'grid', gap: 2 }}>
            {group.map((item) => (
              <Item key={item.to} item={item} large={large} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Account({ deacon, onChangePassword }: { deacon: boolean; onChangePassword(): void }) {
  const { member, seats, viewAs, signOut, auth, previewSeat } = useSession()
  return (
    <div style={{ display: 'grid', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-hairline)' }}>
      <span style={{ font: '700 9px/1 var(--mbc-font-sans)', letterSpacing: '.2em', color: 'var(--text-muted)' }}>SIGNED IN AS</span>
      <span style={{ font: deacon ? '700 15px/1.3 var(--mbc-font-sans)' : '700 14px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{member?.name}</span>
      {/* On the deacon side a man is described by what he belongs to, not by
          where he sits on a ladder. */}
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px' }}>
        {auth.mode === 'supabase' ? (
          <button type="button" onClick={onChangePassword} style={accountActionStyle}>
            Change password
          </button>
        ) : null}
        <button type="button" onClick={signOut} style={accountActionStyle}>
          Sign out
        </button>
      </div>
      <DisplaySizeControl />
      {!previewSeat ? <RememberDevice compact /> : null}
    </div>
  )
}

export function Sidebar({ unread }: { unread: { staff: number; deacon: number } }) {
  const { bodies, viewAs, sides, context, previewSeat, access } = useSession()
  const narrow = useNarrow()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const deacon = context === 'deacon'
  const badges = viewAs === 'limited' ? { staff: 0, deacon: unread.deacon } : unread

  /* Assembled from membership. A surface this person cannot open is not here
     — not locked, not dimmed, not there. The router gives the same answer. */
  const groups: NavItem[][] = []
  for (const surface of surfacesFor({ bodies, viewAs, sides, context, previewSeat, access })) {
    const item: NavItem = { to: surface.path, label: surface.nav }
    if (surface === SURFACES.discussion) item.badge = badges.staff
    if (surface === SURFACES.boardDiscussion) item.badge = badges.deacon
    ;(groups[surface.group] ??= []).push(item)
  }

  return (
    <>
      {narrow ? (
        <MobileNav groups={groups} deacon={deacon} onChangePassword={() => setPasswordOpen(true)} />
      ) : (
        <div style={{ background: 'var(--surface-card)', borderRight: '1px solid var(--border-section)', minWidth: 0 }}>
          <nav
            aria-label="Surfaces"
            style={{ padding: '24px 16px', position: 'sticky', top: 0, height: 'var(--ui-vh)', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}
          >
            <div style={{ padding: '0 6px 4px' }}>
              <Brand deacon={deacon} />
            </div>
            <div style={{ flex: 1 }}>
              <NavGroups groups={groups} large={deacon} />
            </div>
            <Account deacon={deacon} onChangePassword={() => setPasswordOpen(true)} />
          </nav>
        </div>
      )}
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  )
}

/* The sidebar, folded. A slim bar that stays at the top — the mark, the room
   you are in, and one button that says what it is — and a menu that is the same
   list, built from the same membership, at thumb size. Closing it is Escape, the
   scrim, the close button, or going anywhere. */
function MobileNav({ groups, deacon, onChangePassword }: { groups: NavItem[][]; deacon: boolean; onChangePassword(): void }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  const items = groups.filter(Boolean).flat()
  const here = items.find((item) => pathname === item.to || pathname.startsWith(item.to + '/'))
  const unread = items.reduce((total, item) => total + (item.badge ?? 0), 0)

  // Going anywhere closes it.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    closeButton.current?.focus()
    const opener = menuButton.current
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [open])

  // Keep Tab inside the menu while it is open.
  const trap = (event: ReactKeyboardEvent) => {
    if (event.key !== 'Tab' || !panel.current) return
    const focusable = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        height: 'var(--mobile-bar-h)',
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-section)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '0 clamp(16px,3vw,28px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <img src="/assets/mbc-mark.png" alt="" width={34} height={34} style={{ objectFit: 'contain', flex: 'none' }} />
        <span style={{ font: '600 19px/1.15 var(--mbc-font-serif)', letterSpacing: '-.015em', color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {here?.label ?? 'Memorial'}
        </span>
      </div>
      <button
        ref={menuButton}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
        style={{ ...pillButton, flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}
      >
        Menu
        {unread > 0 ? (
          <span className="tabular" style={{ background: 'var(--action-dark)', color: 'var(--text-on-dark)', borderRadius: 'var(--mbc-radius-pill)', font: '700 11px/1 var(--mbc-font-sans)', padding: '4px 8px' }}>
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex' }} onKeyDown={trap}>
          <aside
            id="mobile-menu"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            style={{
              position: 'relative',
              width: 'min(380px, 88%)',
              height: '100%',
              background: 'var(--surface-card)',
              borderRight: '1px solid var(--border-section)',
              padding: '16px 16px 32px',
              overflowY: 'auto',
              display: 'grid',
              gap: 20,
              alignContent: 'start',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 6px' }}>
              <Brand deacon={deacon} />
              <button ref={closeButton} type="button" onClick={() => setOpen(false)} style={{ ...pillButton, flex: 'none' }}>
                Close
              </button>
            </div>
            <NavGroups groups={groups} large onNavigate={() => setOpen(false)} />
            <Account deacon={deacon} onChangePassword={() => { setOpen(false); onChangePassword() }} />
          </aside>
          <button
            type="button"
            aria-label="Close the menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            style={{ flex: 1, background: 'var(--mbc-scrim)', border: 'none', cursor: 'pointer' }}
          />
        </div>
      ) : null}
    </div>
  )
}

const pillButton = {
  minHeight: 44,
  padding: '0 20px',
  borderRadius: 'var(--mbc-radius-pill)',
  background: 'none',
  border: '1px solid var(--border-control)',
  font: '700 14px/1 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
  cursor: 'pointer',
} as const

const accountActionStyle = {
  background: 'none',
  border: 'none',
  padding: '4px 0',
  minHeight: 32,
  textAlign: 'left',
  font: '400 13px/1.4 var(--mbc-font-sans)',
  color: 'var(--text-link)',
  cursor: 'pointer',
} as const
