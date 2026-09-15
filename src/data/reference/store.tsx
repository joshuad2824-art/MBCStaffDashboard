import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSession } from '../../session/session'
import { referenceRepository } from './repository'
import type { ReferenceData } from './repository'
import type { SearchHit } from './types'

/* The manual, loaded once a person is signed in — whichever side they are on
   — and a search over it. What comes back is the policies' answer, and since
   0015 that is the whole manual for anyone signed in. */

interface ReferenceStore {
  data: ReferenceData | null
  error: string | null
  search(q: string): Promise<SearchHit[]>
}

const ReferenceContext = createContext<ReferenceStore | null>(null)

export function ReferenceProvider({ children }: { children: ReactNode }) {
  const { member } = useSession()
  const [data, setData] = useState<ReferenceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const meId = member?.id ?? null

  useEffect(() => {
    if (meId === null) {
      setData(null)
      return
    }
    let live = true
    referenceRepository
      .load()
      .then((loaded) => {
        if (live) {
          setData(loaded)
          setError(null)
        }
      })
      .catch((failure: unknown) => {
        if (live) setError(failure instanceof Error ? failure.message : 'The reference could not be reached.')
      })
    return () => {
      live = false
    }
  }, [meId])

  const value = useMemo<ReferenceStore>(() => ({ data, error, search: (q) => referenceRepository.search(q) }), [data, error])
  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>
}

export function useReference(): ReferenceStore {
  const store = useContext(ReferenceContext)
  if (!store) throw new Error('useReference must be used inside a ReferenceProvider')
  return store
}
