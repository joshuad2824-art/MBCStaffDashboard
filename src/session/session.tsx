import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useData } from '../data/store'
import type { RoleLevel, Staff } from '../data/types'

/* The magic-link flow is stubbed while the app runs on seed data: entering a
   known staff address and opening the link signs you in for thirty days. When
   Supabase Auth lands, `signIn` sends the real link and `member` comes from the
   session — the shape of what the rest of the app reads does not change.

   `viewAs` is the "Viewing as limited" toggle in the header. It is a preview of
   what a limited account sees, nothing more: the real gate is Row Level
   Security, and this switch must never be what stands between someone and a
   care record. */

const SESSION_KEY = 'mbc.staff-dashboard.session'
const SESSION_DAYS = 30

interface StoredSession {
  staffId: number
  expiresAt: string
}

interface SessionValue {
  member: Staff | null
  /** The role the interface is being drawn for — real role, or the preview. */
  viewAs: RoleLevel
  previewingLimited: boolean
  setPreviewingLimited(value: boolean): void
  signIn(staffId: number): void
  signOut(): void
  presentMode: boolean
  setPresentMode(value: boolean): void
}

const SessionContext = createContext<SessionValue | null>(null)

function readStored(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { staff } = useData()
  const [staffId, setStaffId] = useState<number | null>(() => readStored()?.staffId ?? null)
  const [previewingLimited, setPreviewingLimited] = useState(false)
  const [presentMode, setPresentMode] = useState(false)

  const signIn = useCallback((id: number) => {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString()
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify({ staffId: id, expiresAt }))
    } catch {
      // Session still works for this tab; it just will not survive a reload.
    }
    setStaffId(id)
  }, [])

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      // Nothing to clear.
    }
    setStaffId(null)
    setPreviewingLimited(false)
    setPresentMode(false)
  }, [])

  // Present mode is a full-screen overlay: escape is the way out, and the page
  // behind it must not scroll away underneath the projection.
  useEffect(() => {
    if (!presentMode) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPresentMode(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [presentMode])

  const member = useMemo(() => staff.find((s) => s.id === staffId) ?? null, [staff, staffId])

  const value = useMemo<SessionValue>(
    () => ({
      member,
      viewAs: previewingLimited ? 'limited' : (member?.roleLevel ?? 'limited'),
      previewingLimited,
      setPreviewingLimited,
      signIn,
      signOut,
      presentMode,
      setPresentMode,
    }),
    [member, previewingLimited, presentMode, signIn, signOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside a SessionProvider')
  return session
}
