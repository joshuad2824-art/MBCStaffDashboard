import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { repository } from './repository'
import type { DashboardData } from './types'
import { READ_ONLY, isPreviewLocked } from '../session/viewAs'

/* Every mutating action commits {label, snapshot, timestamp} to a session stack.
   Undo restores the newest snapshot, one step at a time — the drawer lists them
   and only the newest row is undoable. The stack is capped at 24 and is not
   persisted: it is a session convenience, not a record. */

const HISTORY_CAP = 24

export interface HistoryEntry {
  id: number
  label: string
  at: Date
  snapshot: DashboardData
}

interface Toast {
  message: string
  undoable: boolean
  /** A failure: stays until it is closed or for a long while, because somebody
      is about to walk away believing their work was saved. */
  lasting?: boolean
}

interface Store {
  data: DashboardData
  loading: boolean
  history: HistoryEntry[]
  toast: Toast | null
  /** Apply a change, announce it, and make it undoable. */
  mutate(label: string, change: (data: DashboardData) => DashboardData): void
  /** Apply a change that is not worth an undo step (drafts, marking read). */
  update(change: (data: DashboardData) => DashboardData): void
  undo(): void
  say(message: string): void
  dismissToast(): void
}

const StoreContext = createContext<Store | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [toast, setToast] = useState<Toast | null>(null)
  const historyId = useRef(1)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    let revision = 0

    const load = async () => {
      const mine = ++revision
      try {
        const loaded = await repository.load()
        if (!cancelled && mine === revision) {
          setData(loaded)
          setLoadError(null)
        }
      } catch (error) {
        if (!cancelled && mine === revision) {
          setLoadError(error instanceof Error ? error.message : 'The board could not reach its database.')
        }
      }
    }

    void load()
    const listener = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Supabase advises against calling another client method directly in
        // its auth callback. Queue the reload outside that callback instead.
        window.setTimeout(() => void load(), 0)
      }
    })
    return () => {
      cancelled = true
      listener?.data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message: string, undoable: boolean, lasting = false) => {
    window.clearTimeout(toastTimer.current)
    setToast({ message, undoable, lasting })
    toastTimer.current = window.setTimeout(() => setToast(null), lasting ? 20000 : 3000)
  }, [])

  /* Saving happens after the screen has already changed, so a save that fails
     was silent: the work stayed on screen and was not in the database. Say so.
     The data layer only advances its "last saved" snapshot on success, so the
     change that failed goes again with the next one. */
  const persist = useCallback(
    (next: DashboardData) => {
      repository.persist(next).catch((error: unknown) => {
        console.error(error)
        showToast('That did not save. ' + (error instanceof Error ? error.message : 'The database could not be reached.') + ' Your next change will try it again.', false, true)
      })
    },
    [showToast],
  )

  const write = useCallback(
    (next: DashboardData) => {
      setData(next)
      persist(next)
    },
    [persist],
  )

  const mutate = useCallback<Store['mutate']>(
    (label, change) => {
      // View as is read-only, and the guard lives here rather than on the
      // buttons: a composer somebody forgot to hide still cannot write.
      if (isPreviewLocked()) {
        showToast(READ_ONLY, false)
        return
      }
      setData((current) => {
        if (!current) return current
        const next = change(current)
        setHistory((entries) =>
          [{ id: historyId.current++, label, at: new Date(), snapshot: current }, ...entries].slice(0, HISTORY_CAP),
        )
        persist(next)
        return next
      })
      showToast(label, true)
    },
    [showToast, persist],
  )

  const update = useCallback<Store['update']>(
    (change) => {
      if (isPreviewLocked()) return
      setData((current) => {
        if (!current) return current
        const next = change(current)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const undo = useCallback(() => {
    setHistory((entries) => {
      if (entries.length === 0) return entries
      const [newest, ...rest] = entries
      write(newest.snapshot)
      showToast('Undid: ' + newest.label.replace(/\.$/, '') + '.', false)
      return rest
    })
  }, [showToast, write])

  /* While a seat is worn only the read-only notice speaks. A screen that
     announces success after awaiting a store call cannot tell that the store
     refused, and its "Removed from the agenda" would paint over the refusal. */
  const say = useCallback(
    (message: string) => {
      if (isPreviewLocked() && message !== READ_ONLY) return
      showToast(message, false)
    },
    [showToast],
  )

  const value = useMemo<Store | null>(() => {
    if (!data) return null
    return {
      data,
      loading: false,
      history,
      toast,
      mutate,
      update,
      undo,
      say,
      dismissToast: () => setToast(null),
    }
  }, [data, history, toast, mutate, update, undo, say])

  if (!value) {
    return (
      <div style={{ minHeight: 'var(--ui-vh)', display: 'grid', placeItems: 'center', background: 'var(--surface-page)' }}>
        <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', maxWidth: 520 }}>
          {loadError ?? 'Opening the board…'}
        </p>
      </div>
    )
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside a DataProvider')
  return store
}

/** Convenience for the common case: the records themselves. */
export function useData(): DashboardData {
  return useStore().data
}
