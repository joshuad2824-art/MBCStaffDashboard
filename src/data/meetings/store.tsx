import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useData } from '../store'
import { useSession } from '../../session/session'
import { meetingRepository } from './repository'
import type { AgendaItem, AttendanceStatus, Meeting, MeetingKind, MeetingsData, NewMotion } from './types'

/* The Board's room, loaded once a person who sits on the Board is signed in
   and never for anyone else. Every action writes under the signed-in man's
   name and applies the row that came back; nothing here is undoable and
   nothing is deleted. */

interface MeetingsStore {
  data: MeetingsData | null
  error: string | null
  createMeeting(input: { meetsOn: string; kind: MeetingKind; timeLabel: string; location: string }): Promise<Meeting | null>
  updateMeeting(id: string, patch: Parameters<typeof meetingRepository.updateMeeting>[1]): Promise<void>
  addAgendaItem(item: Omit<AgendaItem, 'id' | 'removedAt'>): Promise<void>
  removeAgendaItem(id: string): Promise<void>
  recordAttendance(meetingId: string, personId: string, status: AttendanceStatus, note: string): Promise<void>
  recordMotion(meetingId: string, position: number, motion: NewMotion): Promise<void>
  takeUp(motionId: string, meetingId: string): Promise<void>
  counts: typeof meetingRepository.attendanceCounts
}

const MeetingsContext = createContext<MeetingsStore | null>(null)

export function MeetingsProvider({ children }: { children: ReactNode }) {
  const { people } = useData()
  const { member, bodies } = useSession()
  const [data, setData] = useState<MeetingsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const onBoard = bodies.includes('deacon-board')
  const meId = member?.id ?? null

  useEffect(() => {
    if (!onBoard || meId === null) {
      setData(null)
      return
    }
    let live = true
    meetingRepository
      .load({ people, meId })
      .then((loaded) => {
        if (live) {
          setData(loaded)
          setError(null)
        }
      })
      .catch((failure: unknown) => {
        if (live) setError(failure instanceof Error ? failure.message : 'The Board’s room could not be reached.')
      })
    return () => {
      live = false
    }
    // The roster is read once per sign-in; edits to the staff roster do not reopen the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBoard, meId])

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

  const value = useMemo<MeetingsStore>(
    () => ({
      data,
      error,
      createMeeting: (input) =>
        guard(async (who) => {
          const meeting = await meetingRepository.createMeeting(input, who)
          setData((current) => (current ? { ...current, meetings: [...current.meetings, meeting] } : current))
          return meeting
        }),
      updateMeeting: async (id, patch) => {
        await guard(async () => {
          await meetingRepository.updateMeeting(id, patch)
          setData((current) =>
            current ? { ...current, meetings: current.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) } : current,
          )
        })
      },
      addAgendaItem: async (item) => {
        await guard(async (who) => {
          const row = await meetingRepository.addAgendaItem(item, who)
          setData((current) => (current ? { ...current, agenda: [...current.agenda, row] } : current))
        })
      },
      removeAgendaItem: async (id) => {
        await guard(async () => {
          await meetingRepository.removeAgendaItem(id)
          const removedAt = new Date().toISOString()
          setData((current) =>
            current ? { ...current, agenda: current.agenda.map((a) => (a.id === id ? { ...a, removedAt } : a)) } : current,
          )
        })
      },
      recordAttendance: async (meetingId, personId, status, note) => {
        await guard(async (who) => {
          const row = await meetingRepository.recordAttendance(meetingId, personId, status, note, who)
          setData((current) => {
            if (!current) return current
            const rest = current.attendance.filter((a) => !(a.meetingId === meetingId && a.personId === personId))
            return { ...current, attendance: [...rest, row] }
          })
        })
      },
      recordMotion: async (meetingId, position, motion) => {
        await guard(async (who) => {
          const row = await meetingRepository.recordMotion(meetingId, position, motion, who)
          setData((current) => (current ? { ...current, motions: [...current.motions, row] } : current))
        })
      },
      takeUp: async (motionId, meetingId) => {
        await guard(async () => {
          await meetingRepository.takeUp(motionId, meetingId)
          setData((current) =>
            current
              ? { ...current, motions: current.motions.map((m) => (m.id === motionId ? { ...m, tabledToMeetingId: meetingId } : m)) }
              : current,
          )
        })
      },
      counts: (current, meeting) => meetingRepository.attendanceCounts(current, meeting),
    }),
    [data, error, guard],
  )

  return <MeetingsContext.Provider value={value}>{children}</MeetingsContext.Provider>
}

export function useMeetings(): MeetingsStore {
  const store = useContext(MeetingsContext)
  if (!store) throw new Error('useMeetings must be used inside a MeetingsProvider')
  return store
}
