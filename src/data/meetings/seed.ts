import { addDays, addMonths, startOfToday, toIso } from '../../lib/date'
import type { AgendaItem, Attendance, Meeting, Motion } from './types'

/* Sample meetings for a local checkout. Names, motions and quoted text are
   invented — the design handoff says so, and so does this file. Nothing here
   is ever seeded into the database. Person ids match src/data/seed.ts as
   strings, which is what the stub's roster produces. */

function secondMonday(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (8 - first.getDay()) % 7
  return addDays(first, offset + 7)
}

const today = startOfToday()
const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const lastMeeting = secondMonday(addMonths(thisMonth, -1))
const nextMeeting = secondMonday(thisMonth) >= today ? secondMonday(thisMonth) : secondMonday(addMonths(thisMonth, 1))

export const seedMeetings: Meeting[] = [
  {
    id: 'm-last', meetsOn: toIso(lastMeeting), timeLabel: '7:00 PM', location: 'fellowship hall', kind: 'regular',
    status: 'held', agendaLockedAt: toIso(addDays(lastMeeting, -3)), agendaLockedBy: '8', minutesStatus: 'none', approvedAt: null,
  },
  {
    id: 'm-next', meetsOn: toIso(nextMeeting), timeLabel: '7:00 PM', location: 'fellowship hall', kind: 'regular',
    status: 'planned', agendaLockedAt: null, agendaLockedBy: null, minutesStatus: 'none', approvedAt: null,
  },
]

export const seedAgenda: AgendaItem[] = [
  { id: 'a-1', meetingId: 'm-last', position: 1, title: "Treasurer's report", source: 'recurring', sourceRef: 'Art. II.C ¶2', notes: '', removedAt: null },
  { id: 'a-2', meetingId: 'm-last', position: 2, title: 'Resurfacing of the north lot', source: 'manual', sourceRef: '', notes: 'Bid from Tulsa Paving in hand.', removedAt: null },
  { id: 'a-3', meetingId: 'm-next', position: 1, title: "Treasurer's report", source: 'recurring', sourceRef: 'Art. II.C ¶2', notes: '', removedAt: null },
  { id: 'a-4', meetingId: 'm-next', position: 2, title: 'Approve the minutes of the last meeting', source: 'recurring', sourceRef: '', notes: '', removedAt: null },
  { id: 'a-5', meetingId: 'm-next', position: 3, title: 'October filing — the committee roster to the church', source: 'recurring', sourceRef: 'Art. II.B §3', notes: 'Family Assistance membership is excluded.', removedAt: null },
]

export const seedAttendance: Attendance[] = [
  { id: 't-1', meetingId: 'm-last', personId: '8', status: 'present', justCauseNote: '', recordedBy: '8' },
  { id: 't-2', meetingId: 'm-last', personId: '1', status: 'present', justCauseNote: '', recordedBy: '8' },
  { id: 't-3', meetingId: 'm-last', personId: '9', status: 'present', justCauseNote: '', recordedBy: '8' },
  { id: 't-4', meetingId: 'm-last', personId: '10', status: 'absent', justCauseNote: 'Out of town for his daughter’s wedding. He told me the Sunday before.', recordedBy: '8' },
  { id: 't-5', meetingId: 'm-last', personId: '11', status: 'excused', justCauseNote: '', recordedBy: '8' },
  { id: 't-6', meetingId: 'm-last', personId: '12', status: 'present', justCauseNote: '', recordedBy: '8' },
  { id: 't-7', meetingId: 'm-last', personId: '13', status: 'absent', justCauseNote: '', recordedBy: '8' },
]

export const seedMotions: Motion[] = [
  {
    id: 'mo-1', meetingId: 'm-last', position: 1,
    text: 'That the Board approve the resurfacing of the north lot by Tulsa Paving at $18,400, funded from the building reserve.',
    movedBy: '9', secondedBy: '12', disposition: 'tabled', tabledToMeetingId: null, voteFor: null, voteAgainst: null,
    bylawReference: '', textBefore: '', textAfter: '',
  },
  {
    id: 'mo-2', meetingId: 'm-last', position: 2,
    text: 'That the Board receive the Finance committee’s report for the month.',
    movedBy: '11', secondedBy: '9', disposition: 'approved', tabledToMeetingId: null, voteFor: 6, voteAgainst: 0,
    bylawReference: '', textBefore: '', textAfter: '',
  },
]
