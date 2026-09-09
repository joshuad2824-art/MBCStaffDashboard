import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useData, useStore } from '../data/store'
import { nextId } from '../lib/derive'
import { clearCallbackFromUrl, linkFailure, supabase, supabaseConfigured } from '../lib/supabase'
import { loadAccount } from './account'
import type { Account } from './account'
import type { Access, Person } from '../data/types'

/* Who is signed in.

   There are two ways in, and which one is live depends on whether the build
   carries VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY:

   **Supabase.** A person can sign in with an administrator-created password or
   ask for an emailed link. Either route brings a session back to the site, and
   `claim_account()` says whether the verified address belongs to somebody on
   the roster and what they may see. There is no sign-up: a person gets in
   because staff put them on the roster and created an account, and for no
   other reason.

   **The stub.** No variables, no network: entering a known address from
   src/data/seed.ts and pressing "Open the link" signs you in. This is what
   `npm run dev` runs on, and it is why a local checkout needs no secrets. It
   must never be what a deployed site runs on — see docs/LOGIN-SETUP.md.

   `viewAs` is the "viewing as limited" toggle in the header. It is a preview of
   what a limited account sees, nothing more: the real gate is Row Level
   Security, and this switch must never be what stands between someone and a
   care record. */

const SESSION_KEY = 'mbc.staff-dashboard.session'
const SESSION_DAYS = 30

interface StoredSession {
  staffId: number
  expiresAt: string
}

export interface AuthValue {
  mode: 'supabase' | 'stub'
  /** True while a stored session or an opened link is still being resolved. */
  checking: boolean
  sending: boolean
  /** Something the person in front of the screen can act on, or null. */
  error: string | null
  clearError(): void
  /** Resolves true once Supabase accepts the email and password. */
  signInWithPassword(email: string, password: string): Promise<boolean>
  /** Resolves true when the screen should say "check your inbox". */
  requestLink(email: string): Promise<boolean>
}

interface SessionValue {
  member: Person | null
  /** The role the interface is being drawn for — real role, or the preview. */
  viewAs: Access
  previewingLimited: boolean
  setPreviewingLimited(value: boolean): void
  /** The stub's way in. Does nothing once Supabase is configured. */
  signIn(staffId: number): void
  signOut(): void
  presentMode: boolean
  setPresentMode(value: boolean): void
  auth: AuthValue
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

const NOT_ON_ROSTER =
  'You are signed in, but that address is not on the staff roster. Ask the office to add you on the People page and set your access.'

const NOT_SET_UP =
  'Sign-in is turned on but the database has not been prepared yet. Whoever set this up needs to run the migrations in supabase/migrations.'

export function SessionProvider({ children }: { children: ReactNode }) {
  const { people } = useData()
  const { update } = useStore()

  // The stub restores its own session; Supabase restores ours, so we start
  // empty and wait rather than flashing somebody in on a stale local id.
  const [staffId, setStaffId] = useState<number | null>(() =>
    supabaseConfigured ? null : (readStored()?.staffId ?? null),
  )
  const [previewingLimited, setPreviewingLimited] = useState(false)
  const [presentMode, setPresentMode] = useState(false)

  const [account, setAccount] = useState<Account | null>(null)
  const [checking, setChecking] = useState(supabaseConfigured)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(linkFailure)
  const claimedFor = useRef<string | null>(null)

  const signIn = useCallback((id: number) => {
    if (supabaseConfigured) return
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
    claimedFor.current = null
    setAccount(null)
    setStaffId(null)
    setPreviewingLimited(false)
    setPresentMode(false)
    if (supabase) void supabase.auth.signOut()
  }, [])

  /* A link that came back refused leaves its complaint on the address bar and
     produces no session, so nothing below will ever clean up after it. The text
     has already been read into `error`; the URL is a credential's leftovers. */
  useEffect(() => {
    if (linkFailure) clearCallbackFromUrl()
  }, [])

  /* Supabase, in one place: whatever session is already stored, whatever
     session an opened link just produced, and every change after that. The
     listener fires for the restored session too, so there is no separate
     start-up read to keep in step with it. */
  useEffect(() => {
    if (!supabase) return
    let live = true

    const resolve = async (email: string | undefined) => {
      if (!email) {
        if (live) {
          setAccount(null)
          setStaffId(null)
          setChecking(false)
        }
        return
      }
      const found = await loadAccount()
      if (!live) return
      if (found.state === 'account') {
        setAccount(found.account)
        setError(null)
        clearCallbackFromUrl()
        setChecking(false)
        return
      }
      // Authenticated, but with no way in. Do not leave a half-signed-in
      // session sitting in the browser to confuse the next attempt.
      setAccount(null)
      setStaffId(null)
      setError(
        found.state === 'not-on-roster'
          ? NOT_ON_ROSTER
          : found.state === 'not-set-up'
            ? NOT_SET_UP
            : found.message,
      )
      clearCallbackFromUrl()
      setChecking(false)
      void supabase?.auth.signOut()
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (!live) return
        claimedFor.current = null
        setAccount(null)
        setStaffId(null)
        setChecking(false)
        return
      }
      void resolve(session?.user?.email)
    })

    // A link that came back with an error produces no session and therefore no
    // event, so nothing above would ever stop the "checking" state.
    void supabase.auth.getSession().then(({ data: current }) => {
      if (live && !current.session) setChecking(false)
    })

    return () => {
      live = false
      data.subscription.unsubscribe()
    }
  }, [])

  /* The roster row the rest of the app reads.

     While the records still live in the browser, Postgres owns who you are and
     the local roster owns everything you can be named on. Matching them on the
     address keeps one person from becoming two: the seeded row is reused when
     the address is already there, and their name, title and access are brought
     into line with what the database says. */
  useEffect(() => {
    if (!account) {
      claimedFor.current = null
      return
    }

    const existing = people.find((person) => person.email.trim().toLowerCase() === account.email)
    if (existing) {
      setStaffId(existing.id)
      const stale =
        existing.name !== account.name ||
        existing.role !== account.role ||
        existing.access !== account.access ||
        !existing.active
      if (stale) {
        update((data) => ({
          ...data,
          people: data.people.map((person) =>
            person.id === existing.id
              ? { ...person, name: account.name, role: account.role, access: account.access, active: true }
              : person,
          ),
        }))
      }
      return
    }

    if (claimedFor.current === account.email) return
    claimedFor.current = account.email
    const id = nextId(people)
    update((data) => ({
      ...data,
      people: [
        ...data.people,
        { id, name: account.name, role: account.role, email: account.email, access: account.access, active: true },
      ],
    }))
  }, [account, people, update])

  const requestLink = useCallback(async (address: string): Promise<boolean> => {
    setError(null)
    if (!supabase) return true

    setSending(true)
    const { error: failed } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    })
    setSending(false)
    if (!failed) return true

    // A sign-in form must never become a roster. With sign-ups turned off — and
    // they must be — an address with no account comes back as "signups not
    // allowed for otp", which is precisely what we refuse to say out loud. That
    // one gets the same "check your inbox" as everybody else.
    const code = (failed as { code?: string }).code ?? ''
    if (code === 'otp_disabled' || code === 'signup_disabled' || /signups? not allowed/i.test(failed.message)) {
      return true
    }

    if (failed.status === 429 || code === 'over_email_send_rate_limit') {
      setError('Too many sign-in links have been sent from this site recently. Try again in an hour.')
      return false
    }

    // Anything else is the setup being wrong, not the person being wrong, and
    // saying so plainly is the only way it ever gets fixed.
    setError(failed.message)
    return false
  }, [])

  const signInWithPassword = useCallback(async (address: string, password: string): Promise<boolean> => {
    setError(null)
    if (!supabase) return false

    setSending(true)
    try {
      const { error: failed } = await supabase.auth.signInWithPassword({ email: address, password })
      if (!failed) return true

      const code = (failed as { code?: string }).code ?? ''
      if (code === 'invalid_credentials' || /invalid login credentials/i.test(failed.message)) {
        setError('That email or password was not accepted.')
        return false
      }
      if (code === 'email_not_confirmed' || /email not confirmed/i.test(failed.message)) {
        setError('That account has not been confirmed yet. Ask an administrator to confirm it.')
        return false
      }

      setError(failed.message)
      return false
    } catch {
      setError('Sign-in could not reach the server. Check your connection and try again.')
      return false
    } finally {
      setSending(false)
    }
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

  const member = useMemo(() => people.find((person) => person.id === staffId) ?? null, [people, staffId])

  const auth = useMemo<AuthValue>(
    () => ({
      mode: supabaseConfigured ? 'supabase' : 'stub',
      // Signed in by Supabase but not yet matched to a local row is still
      // "checking": the alternative is a blink of the sign-in screen.
      checking: checking || (account !== null && staffId === null),
      sending,
      error,
      clearError: () => setError(null),
      signInWithPassword,
      requestLink,
    }),
    [checking, account, staffId, sending, error, signInWithPassword, requestLink],
  )

  const value = useMemo<SessionValue>(
    () => ({
      member,
      viewAs: previewingLimited ? 'limited' : (member?.access ?? 'none'),
      previewingLimited,
      setPreviewingLimited,
      signIn,
      signOut,
      presentMode,
      setPresentMode,
      auth,
    }),
    [member, previewingLimited, presentMode, signIn, signOut, auth],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside a SessionProvider')
  return session
}
