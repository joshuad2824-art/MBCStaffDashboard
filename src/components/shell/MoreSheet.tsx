import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../session/session'
import { bodyName, homeOf } from '../../screens/surfaces'
import type { Surface } from '../../screens/surfaces'
import type { OpenRoom, RoomKey } from '../../screens/rooms'
import { useNarrow } from '../../lib/displayScale'
import { APPEARANCE_CHOICES, useTheme } from '../../lib/theme'
import type { Appearance } from '../../lib/theme'
import { DisplaySizeControl } from './DisplaySizeControl'
import { ViewAsPicker } from './ViewAsPicker'
import { RememberDevice } from '../RememberDevice'

/* More: one sheet, two taps from anywhere. On a phone it carries the rooms too,
   since the pill there holds only the room you are in. Below them, the back
   rooms (the manual and Robert's Rules, opened twice a year), then the things
   that used to sit at the top of every page — recent changes, present mode,
   view as — and then this browser's settings and the account. Escape, the
   scrim or going anywhere closes it; Tab stays inside while it is open. */
export function MoreSheet({
  open,
  onClose,
  rooms,
  room,
  back,
  unread,
  onOpenHistory,
  onChangePassword,
}: {
  open: boolean
  onClose(): void
  rooms: OpenRoom[]
  room: OpenRoom | null
  back: Surface[]
  unread: Partial<Record<RoomKey, number>>
  onOpenHistory(): void
  onChangePassword(): void
}) {
  const { member, seats, viewAs, sides, context, setContext, admin, previewSeat, setPresentMode, signOut, auth } = useSession()
  const { choice, setChoice } = useTheme()
  const narrow = useNarrow()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const panel = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) onClose()
    // Going anywhere closes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    closeButton.current?.focus()
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

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

  const other = context === 'deacon' ? 'staff' : 'deacon'
  const switchSide = () => {
    setContext(other)
    onClose()
    navigate(homeOf(other))
  }

  const describedAs = previewSeat
    ? `Viewing as — ${previewSeat.label}`
    : context === 'deacon'
      ? seats
          .filter((seat) => seat.slug !== 'staff')
          .map((seat) => bodyName(seat.slug) + (seat.role === 'chair' ? ' · chair' : seat.role === 'ex_officio' ? ' · ex officio' : ''))
          .join(' · ')
      : `${member?.role ?? ''} · role ${viewAs}`

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 26 }} onKeyDown={trap}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, border: 'none', background: 'var(--mbc-scrim)', backdropFilter: 'var(--mbc-blur-scrim)', WebkitBackdropFilter: 'var(--mbc-blur-scrim)', cursor: 'pointer' }}
      />
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="More"
        className="quiet-scroll"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          width: narrow ? '100%' : 'min(560px, calc(100% - 32px))',
          maxHeight: 'calc(var(--ui-vh) - 48px)',
          overflowY: 'auto',
          background: 'var(--surface-card)',
          borderRadius: narrow ? '22px 22px 0 0' : '22px 22px 0 0',
          padding: narrow ? '12px 16px 104px' : '14px 22px 110px',
          display: 'grid',
          gap: 14,
          alignContent: 'start',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border-control)', marginLeft: 'calc(50% - 18px)' }} />
          <button ref={closeButton} type="button" onClick={onClose} style={smallButton}>
            Close
          </button>
        </div>

        {narrow && rooms.length > 0 ? (
          <Section label="Rooms">
            <nav aria-label="Rooms" style={{ display: 'grid', gap: 2 }}>
              {rooms.map((r) => {
                const here = r === room
                return (
                  <Link
                    key={r.key}
                    to={r.landing}
                    aria-current={here ? 'page' : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      minHeight: 56,
                      padding: '10px 14px',
                      borderRadius: 14,
                      background: here ? 'var(--surface-panel)' : 'transparent',
                      color: 'var(--text-heading)',
                    }}
                  >
                    <span className="lamp" style={{ background: r.lamp }} aria-hidden="true" />
                    <span style={{ flex: 1, font: '600 20px/1.1 var(--mbc-font-serif)' }}>{r.label}</span>
                    {unread[r.key] ? (
                      <span className="tabular" style={{ font: '700 13px/1 var(--mbc-font-sans)', color: 'var(--text-eyebrow)' }}>
                        {unread[r.key]} new
                      </span>
                    ) : here ? (
                      <span style={{ font: '700 12px/1 var(--mbc-font-sans)', color: 'var(--text-category)' }}>You’re here</span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>
          </Section>
        ) : null}

        <Section label="Also here">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
            {back.map((surface) => (
              <Link key={surface.path} to={surface.path} style={tileButton}>
                {surface === back.find((s) => s.path === '/reference') ? 'The manual' : surface.nav}
              </Link>
            ))}
            {context === 'staff' ? (
              <button
                type="button"
                style={{ ...tileButton, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => {
                  onClose()
                  onOpenHistory()
                }}
              >
                Recent changes
              </button>
            ) : null}
            {context === 'staff' && !narrow ? (
              <button
                type="button"
                style={{ ...tileButton, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => {
                  onClose()
                  setPresentMode(true)
                }}
              >
                Present on a screen
              </button>
            ) : null}
          </div>
          {admin && !previewSeat ? (
            <div style={{ marginTop: 6 }}>
              <ViewAsPicker />
            </div>
          ) : null}
        </Section>

        <Section label="This browser">
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={fieldLabel}>Appearance</span>
            <select data-reads="" value={choice} onChange={(event) => setChoice(event.target.value as Appearance)} style={select}>
              {APPEARANCE_CHOICES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <DisplaySizeControl />
          {!previewSeat ? <RememberDevice compact /> : null}
        </Section>

        <Section label="Signed in as">
          <span style={{ font: '700 16px/1.3 var(--mbc-font-sans)', color: 'var(--text-heading)' }}>{member?.name}</span>
          <span style={{ font: '400 14px/1.45 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>{describedAs}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 18px' }}>
            {auth.mode === 'supabase' ? (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onChangePassword()
                }}
                style={textButton}
              >
                Change password
              </button>
            ) : null}
            <button type="button" onClick={signOut} style={textButton}>
              Sign out
            </button>
          </div>
        </Section>

        {sides.length > 1 ? (
          <button type="button" onClick={switchSide} style={{ ...smallButton, minHeight: 48, width: '100%', border: '1px solid var(--text-heading)' }}>
            {other === 'deacon' ? 'Switch to the deacon side' : 'Switch to the staff side'}
          </button>
        ) : null}
      </section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-hairline)' }}>
      <span style={{ font: '700 10px/1 var(--mbc-font-sans)', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-category)', padding: '2px 2px 4px' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

const smallButton = {
  minHeight: 40,
  padding: '0 18px',
  borderRadius: 999,
  background: 'none',
  border: '1px solid var(--border-control)',
  font: '700 14px/1 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
  cursor: 'pointer',
} as const

const tileButton = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 48,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid var(--border-card)',
  background: 'var(--surface-page)',
  font: '400 15px/1.2 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
} as const

const textButton = {
  background: 'none',
  border: 'none',
  padding: '6px 0',
  minHeight: 36,
  font: '400 14px/1.4 var(--mbc-font-sans)',
  color: 'var(--text-link)',
  cursor: 'pointer',
} as const

const fieldLabel = {
  font: '700 9px/1 var(--mbc-font-sans)',
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
} as const

const select = {
  minHeight: 44,
  width: '100%',
  background: 'var(--surface-field)',
  border: '1px solid var(--mbc-border-input)',
  borderRadius: 10,
  padding: '0 12px',
  font: '400 14px/1.3 var(--mbc-font-sans)',
  color: 'var(--text-heading)',
} as const
