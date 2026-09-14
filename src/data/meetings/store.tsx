import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useData } from '../store'
import { useSession } from '../../session/session'
import { meetingRepository } from './repository'
import type { AgendaItem, AttendanceStatus, Meeting, MeetingKind, MeetingsData, NewMotion } from './types'
import type { Report, ReportPayload, ReportVersion } from './reports'

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
  createReport(input: Parameters<typeof meetingRepository.createReport>[0]): Promise<Report | null>
  saveReport(id: string, patch: Parameters<typeof meetingRepository.saveReport>[1]): Promise<void>
  /** Publish: write the next version, mark the report published, and move
      the report it replaces to archived. Nothing is overwritten. */
  publish(report: Report, payload: ReportPayload, rendered: string): Promise<ReportVersion | null>
  /** Reload the room — after a report is filed, the pointers change. */
  refresh(): Promise<void>
}

const MeetingsContext = createContext<MeetingsStore | null>(null)

export function MeetingsProvider({ children }: { children: ReactNode }) {
  const { people } = useData()
  const { member, bodies } = useSession()
  const [data, setData] = useState<MeetingsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Anyone on the deacon side: the Board, and a committee chair filing a report.
  const onDeaconSide = bodies.some((slug) => slug !== 'staff')
  const meId = member?.id ?? null

  const load = useCallback(async () => {
    try {
      const loaded = await meetingRepository.load({ people, meId })
      setData(loaded)
      setError(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The Board’s room could not be reached.')
    }
    // The roster is read once per sign-in; edits to the staff roster do not reopen the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId])

  useEffect(() => {
    if (!onDeaconSide || meId === null) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDeaconSide, meId])

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
      createReport: (input) =>
        guard(async (who) => {
          const report = await meetingRepository.createReport(input, who)
          setData((current) => (current ? { ...current, reports: [report, ...current.reports] } : current))
          return report
        }),
      saveReport: async (id, patch) => {
        await guard(async (who) => {
          await meetingRepository.saveReport(id, patch, who)
          const updatedAt = new Date().toISOString()
          setData((current) =>
            current ? { ...current, reports: current.reports.map((r) => (r.id === id ? { ...r, ...patch, updatedBy: who, updatedAt } : r)) } : current,
          )
        })
      },
      publish: (report, payload, rendered) =>
        guard(async (who) => {
          const current = data
          if (!current) return null
          const prior = current.versions.filter((v) => v.reportId === report.id).sort((a, b) => b.versionNo - a.versionNo)[0] ?? null
          const version = await meetingRepository.addVersion(
            { reportId: report.id, versionNo: (prior?.versionNo ?? 0) + 1, payload, rendered, supersedesVersionId: prior?.id ?? null },
            who,
          )
          const publishedAt = version.publishedAt
          await meetingRepository.saveReport(report.id, { payload, status: 'published', publishedAt }, who)
          // A new period's report retires the one it replaces: same body, same kind.
          const replaced = current.reports.filter(
            (r) => r.id !== report.id && r.kind === report.kind && r.bodySlug === report.bodySlug && r.status === 'published',
          )
          const archivedAt = publishedAt
          for (const old of replaced) await meetingRepository.saveReport(old.id, { status: 'archived', archivedAt }, who)
          setData((state) =>
            state
              ? {
                  ...state,
                  versions: [...state.versions, version],
                  reports: state.reports.map((r) =>
                    r.id === report.id
                      ? { ...r, payload, status: 'published', publishedAt, updatedBy: who, updatedAt: publishedAt }
                      : replaced.some((old) => old.id === r.id)
                        ? { ...r, status: 'archived', archivedAt }
                        : r,
                  ),
                }
              : state,
          )
          return version
        }),
      refresh: load,
    }),
    [data, error, guard, load],
  )

  return <MeetingsContext.Provider value={value}>{children}</MeetingsContext.Provider>
}

export function useMeetings(): MeetingsStore {
  const store = useContext(MeetingsContext)
  if (!store) throw new Error('useMeetings must be used inside a MeetingsProvider')
  return store
}
