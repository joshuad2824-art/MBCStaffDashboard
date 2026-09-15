import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSession } from '../../session/session'
import { referenceRepository } from './repository'
import type { ReferenceData } from './repository'

/* The manual, loaded once a person is signed in — whichever side they are on.
   What comes back is the policies' answer: the documents whose audience names
   a body they sit in, and the docket only on the deacon side. A staff member
   for whom nothing has been marked gets an empty list, and that is a true
   answer, not a failure. */

interface ReferenceStore {
  data: ReferenceData | null
  error: string | null
}

const ReferenceContext = createContext<ReferenceStore | null>(null)

export function ReferenceProvider({ children }: { children: ReactNode }) {
  const { member, bodies } = useSession()
  const [data, setData] = useState<ReferenceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const meId = member?.id ?? null
  // Seats change only with a sign-in; the list is keyed so a new person, or the
  // same person seated differently, reloads and nobody else does.
  const seated = bodies.join(',')

  useEffect(() => {
    if (meId === null) {
      setData(null)
      return
    }
    let live = true
    referenceRepository
      .load({ bodies: seated ? seated.split(',') : [] })
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
  }, [meId, seated])

  const value = useMemo<ReferenceStore>(() => ({ data, error }), [data, error])
  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>
}

export function useReference(): ReferenceStore {
  const store = useContext(ReferenceContext)
  if (!store) throw new Error('useReference must be used inside a ReferenceProvider')
  return store
}
