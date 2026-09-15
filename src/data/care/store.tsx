import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useData } from '../store'
import { useSession } from '../../session/session'
import { careRepository } from './repository'
import type { CareData, HelpKind, VisitKind } from './types'

/* Care pointers, loaded for a person who can hold any of them: the Board, or
   the staff role. Every action writes one named row under the signed-in
   person's name and applies what came back. Nothing is undoable and nothing
   is deleted. */

interface CareStore {
  data: CareData | null
  error: string | null
  assign(householdLabel: string, deaconId: string): Promise<void>
  contacted(assignmentId: string, on: string): Promise<void>
  reassign(assignmentId: string, deaconId: string): Promise<void>
  retire(assignmentId: string): Promise<void>
  askDeacon(input: { householdLabel: string; helpKind: HelpKind; neededBy: string | null; careEntryId: string | null }): Promise<boolean>
  takeUp(requestId: string): Promise<void>
  markDone(requestId: string, on: string): Promise<void>
  setWeek(weekOf: string, personId: string, backupPersonId: string | null): Promise<void>
  logVisit(weekId: string, householdLabel: string, kind: VisitKind, on: string): Promise<void>
}

const CareContext = createContext<CareStore | null>(null)

export function CareProvider({ children }: { children: ReactNode }) {
  const { people } = useData()
  const { member, bodies, viewAs } = useSession()
  const [data, setData] = useState<CareData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const meId = member?.id ?? null
  const holdsAny = bodies.includes('deacon-board') || (bodies.includes('staff') && viewAs === 'staff')

  useEffect(() => {
    if (!holdsAny || meId === null) {
      setData(null)
      return
    }
    let live = true
    careRepository
      .load({ people, meId })
      .then((loaded) => {
        if (live) {
          setData(loaded)
          setError(null)
        }
      })
      .catch((failure: unknown) => {
        if (live) setError(failure instanceof Error ? failure.message : 'The care list could not be reached.')
      })
    return () => {
      live = false
    }
    // The roster is read once per sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdsAny, meId])

  const me = data?.me ?? null
  const guard = useCallback(
    async <T,>(work: (me: string) => Promise<T>): Promise<T | null> => {
      if (!me) return null
      try {
        return await work(me)
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'That did not save.')
        return null
      }
    },
    [me],
  )

  const value = useMemo<CareStore>(
    () => ({
      data,
      error,
      assign: async (householdLabel, deaconId) => {
        await guard(async (who) => {
          const row = await careRepository.assign(householdLabel, deaconId, who)
          setData((current) => (current ? { ...current, assignments: [...current.assignments, row] } : current))
        })
      },
      contacted: async (assignmentId, on) => {
        await guard(async () => {
          await careRepository.contacted(assignmentId, on)
          setData((current) => (current ? { ...current, assignments: current.assignments.map((a) => (a.id === assignmentId ? { ...a, lastContactOn: on } : a)) } : current))
        })
      },
      reassign: async (assignmentId, deaconId) => {
        await guard(async () => {
          await careRepository.reassign(assignmentId, deaconId)
          setData((current) => (current ? { ...current, assignments: current.assignments.map((a) => (a.id === assignmentId ? { ...a, assignedTo: deaconId } : a)) } : current))
        })
      },
      retire: async (assignmentId) => {
        await guard(async () => {
          await careRepository.retire(assignmentId)
          setData((current) => (current ? { ...current, assignments: current.assignments.map((a) => (a.id === assignmentId ? { ...a, active: false } : a)) } : current))
        })
      },
      askDeacon: async (input) => {
        const row = await guard(async (who) => careRepository.askDeacon(input, who))
        if (!row) return false
        setData((current) =>
          current
            ? {
                ...current,
                requests: [row, ...current.requests],
                links: input.careEntryId ? [...current.links, { requestId: row.id, careEntryId: input.careEntryId }] : current.links,
              }
            : current,
        )
        return true
      },
      takeUp: async (requestId) => {
        await guard(async (who) => {
          await careRepository.takeUp(requestId, who)
          setData((current) => (current ? { ...current, requests: current.requests.map((r) => (r.id === requestId ? { ...r, status: 'accepted', assignedTo: who } : r)) } : current))
        })
      },
      markDone: async (requestId, on) => {
        await guard(async () => {
          await careRepository.markDone(requestId, on)
          setData((current) => (current ? { ...current, requests: current.requests.map((r) => (r.id === requestId ? { ...r, status: 'done', completedOn: on } : r)) } : current))
        })
      },
      setWeek: async (weekOf, personId, backupPersonId) => {
        await guard(async (who) => {
          const row = await careRepository.setWeek(weekOf, personId, backupPersonId, who)
          setData((current) =>
            current
              ? { ...current, weeks: current.weeks.some((w) => w.id === row.id) ? current.weeks.map((w) => (w.id === row.id ? row : w)) : [...current.weeks, row].sort((a, b) => a.weekOf.localeCompare(b.weekOf)) }
              : current,
          )
        })
      },
      logVisit: async (weekId, householdLabel, kind, on) => {
        await guard(async (who) => {
          const row = await careRepository.logVisit(weekId, householdLabel, kind, on, who)
          setData((current) => (current ? { ...current, visits: [row, ...current.visits] } : current))
        })
      },
    }),
    [data, error, guard],
  )

  return <CareContext.Provider value={value}>{children}</CareContext.Provider>
}

export function useCare(): CareStore {
  const store = useContext(CareContext)
  if (!store) throw new Error('useCare must be used inside a CareProvider')
  return store
}
