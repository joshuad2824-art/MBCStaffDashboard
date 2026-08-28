import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { repository } from './repository'
import type { DashboardData } from './types'

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
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [toast, setToast] = useState<Toast | null>(null)
  const historyId = useRef(1)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    repository.load().then((loaded) => {
      if (!cancelled) setData(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message: string, undoable: boolean) => {
    window.clearTimeout(toastTimer.current)
    setToast({ message, undoable })
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  const write = useCallback((next: DashboardData) => {
    setData(next)
    void repository.persist(next)
  }, [])

  const mutate = useCallback<Store['mutate']>(
    (label, change) => {
      setData((current) => {
        if (!current) return current
        const next = change(current)
        setHistory((entries) =>
          [{ id: historyId.current++, label, at: new Date(), snapshot: current }, ...entries].slice(0, HISTORY_CAP),
        )
        void repository.persist(next)
        return next
      })
      showToast(label, true)
    },
    [showToast],
  )

  const update = useCallback<Store['update']>((change) => {
    setData((current) => {
      if (!current) return current
      const next = change(current)
      void repository.persist(next)
      return next
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((entries) => {
      if (entries.length === 0) return entries
      const [newest, ...rest] = entries
      write(newest.snapshot)
      showToast('Undid: ' + newest.label.replace(/\.$/, '') + '.', false)
      return rest
    })
  }, [showToast, write])

  const say = useCallback((message: string) => showToast(message, false), [showToast])

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
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--surface-page)' }}>
        <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Opening the board…</p>
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
