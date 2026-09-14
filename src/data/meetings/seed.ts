import { addDays, addMonths, startOfToday, toIso } from '../../lib/date'
import type { AgendaItem, Attendance, Meeting, Motion } from './types'
import type { Report, ReportVersion } from './reports'

/* Sample meetings for a local checkout. Names, motions and quoted text are
   invented — the design handoff says so, and so does this file. Nothing here
   is ever seeded into the database. Person ids match src/data/seed.ts as
   strings, which is what the stub's roster produces. */

/** The Board meets the second Sunday of the month at four, as its minutes record. */
function secondSunday(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (7 - first.getDay()) % 7
  return addDays(first, offset + 7)
}

const today = startOfToday()
const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const lastMeeting = secondSunday(addMonths(thisMonth, -1))
const nextMeeting = secondSunday(thisMonth) >= today ? secondSunday(thisMonth) : secondSunday(addMonths(thisMonth, 1))

export const seedMeetings: Meeting[] = [
  {
    id: 'm-last', meetsOn: toIso(lastMeeting), timeLabel: '4:00 PM', location: 'fellowship hall', kind: 'regular',
    status: 'held', agendaLockedAt: toIso(addDays(lastMeeting, -3)), agendaLockedBy: '8',
    calledToOrderAt: toIso(lastMeeting) + 'T16:04:00', adjournedAt: toIso(lastMeeting) + 'T17:10:00', minutesStatus: 'none', approvedAt: null,
  },
  {
    id: 'm-next', meetsOn: toIso(nextMeeting), timeLabel: '4:00 PM', location: 'fellowship hall', kind: 'regular',
    status: 'planned', agendaLockedAt: null, agendaLockedBy: null, calledToOrderAt: null, adjournedAt: null, minutesStatus: 'none', approvedAt: null,
  },
]

export const seedAgenda: AgendaItem[] = [
  { id: 'a-2', meetingId: 'm-last', position: 1, title: 'Resurfacing of the north lot', source: 'new_business', sourceRef: '', notes: 'Bid from Tulsa Paving in hand.', removedAt: null },
  { id: 'a-5', meetingId: 'm-next', position: 1, title: 'October filing — the committee roster to the church', source: 'recurring', sourceRef: 'Art. II.B §3', notes: 'Family Assistance membership is excluded.', removedAt: null },
  { id: 'a-6', meetingId: 'm-next', position: 2, title: 'The sign — south side power supplies', source: 'old_business', sourceRef: '', notes: 'Quote for an LED replacement received.', removedAt: null },
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

const lastMonthIso = toIso(new Date(lastMeeting.getFullYear(), lastMeeting.getMonth() - 1, 1))
const lastMonthEnd = toIso(new Date(lastMeeting.getFullYear(), lastMeeting.getMonth(), 0))

/** A Finance report published against last month's meeting, so the Reports
    page, the print view and the versions list have something to show. */
export const seedReports: Report[] = [
  {
    id: 'r-finance-last', kind: 'committee', bodySlug: 'committee:finance', bodyName: 'Finance Committee', meetingId: 'm-last',
    periodStart: lastMonthIso, periodEnd: lastMonthEnd, status: 'published',
    payload: {
      asOf: '', budgetAdopted: 1284000, receivedYtd: 842600, spentYtd: 801350,
      otherReceipts: [{ line: 'Building & property use income', amount: 53945 }],
      variances: [
        { line: 'Utilities', amount: 'over by $3,410', note: 'Two window units failed in July; the replacements are in Building & Grounds\u2019 report.' },
        { line: 'Missions', amount: 'under by $9,800', note: 'The Guatemala team moved to October, so the airfare falls in the next quarter.' },
      ],
      actions: ['Moved $12,000 from the general reserve to the building reserve, under the July authorisation.'],
      items: [{ text: 'Approve the 2027 budget calendar dates before the calendar starts on 10 October.', needsVote: true }],
    },
    createdBy: '9', updatedBy: '9', updatedAt: toIso(addDays(lastMeeting, -2)), submittedBy: '9', submittedAt: toIso(addDays(lastMeeting, -3)),
    publishedAt: toIso(addDays(lastMeeting, -2)), archivedAt: null,
  },
  {
    id: 'r-treasurer-last', kind: 'treasurer', bodySlug: 'committee:finance', bodyName: 'Finance Committee', meetingId: 'm-last',
    periodStart: lastMonthIso, periodEnd: lastMonthEnd, status: 'published',
    payload: {
      receipts: [{ line: 'Tithes and offerings', amount: 96400 }, { line: 'Designated gifts', amount: 4150 }],
      disbursements: [{ line: 'Personnel', amount: 61200 }, { line: 'Facilities', amount: 14880 }, { line: 'Ministries', amount: 9310 }, { line: 'Missions', amount: 7200 }],
    },
    createdBy: '9', updatedBy: '9', updatedAt: toIso(addDays(lastMeeting, -2)), submittedBy: '9', submittedAt: toIso(addDays(lastMeeting, -3)),
    publishedAt: toIso(addDays(lastMeeting, -2)), archivedAt: null,
  },
]

export const seedVersions: ReportVersion[] = [
  {
    id: 'v-finance-last-1', reportId: 'r-finance-last', versionNo: 1, payload: seedReports[0].payload,
    rendered: 'FINANCE COMMITTEE\nFinance committee report\n(as published)\n', createdBy: '9', publishedAt: toIso(addDays(lastMeeting, -2)), supersedesVersionId: null,
  },
  {
    id: 'v-treasurer-last-1', reportId: 'r-treasurer-last', versionNo: 1, payload: seedReports[1].payload,
    rendered: 'TREASURER\nTreasurer\u2019s monthly report\n(as published)\n', createdBy: '9', publishedAt: toIso(addDays(lastMeeting, -2)), supersedesVersionId: null,
  },
]
