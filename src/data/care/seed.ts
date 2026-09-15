import type { CareAssignment, CareRequest, CareRequestLink, DeaconVisit, DeaconWeek } from './types'
import { addDays, startOfToday, toIso } from '../../lib/date'

/* Sample care pointers for a checkout without Supabase. Household names are
   invented. Person ids match src/data/seed.ts as strings. Notice what is not
   here: not one field says why anyone needs anything. */

const today = startOfToday()
const sunday = addDays(today, -today.getDay())

export const seedAssignments: CareAssignment[] = [
  { id: 'ca-1', householdLabel: 'The Whitfields', assignedTo: '10', lastContactOn: toIso(addDays(today, -12)), active: true, createdBy: '8' },
  { id: 'ca-2', householdLabel: 'The Alvarados', assignedTo: '9', lastContactOn: toIso(addDays(today, -3)), active: true, createdBy: '8' },
  { id: 'ca-3', householdLabel: 'Ruth Hollingsworth', assignedTo: '12', lastContactOn: null, active: true, createdBy: '8' },
  { id: 'ca-4', householdLabel: 'The Prentiss family', assignedTo: '11', lastContactOn: toIso(addDays(today, -40)), active: true, createdBy: '8' },
  { id: 'ca-5', householdLabel: 'The Boyers', assignedTo: '13', lastContactOn: toIso(addDays(today, -60)), active: false, createdBy: '8' },
]

export const seedRequests: CareRequest[] = [
  { id: 'cr-1', householdLabel: 'Ruth Hollingsworth', helpKind: 'meal', neededBy: toIso(addDays(today, 4)), requestedBy: '1', assignedTo: null, status: 'open', completedOn: null, createdAt: toIso(addDays(today, -1)) },
  { id: 'cr-2', householdLabel: 'The Alvarado family', helpKind: 'visit', neededBy: null, requestedBy: '1', assignedTo: '9', status: 'accepted', completedOn: null, createdAt: toIso(addDays(today, -6)) },
  { id: 'cr-3', householdLabel: 'Tina Boyer', helpKind: 'ride', neededBy: toIso(addDays(today, -20)), requestedBy: '4', assignedTo: '13', status: 'done', completedOn: toIso(addDays(today, -21)), createdAt: toIso(addDays(today, -25)) },
]

/** Staff-only. The stub hands these to a staff-role session and to nobody else. */
export const seedLinks: CareRequestLink[] = [
  { requestId: 'cr-1', careEntryId: '205' },
  { requestId: 'cr-2', careEntryId: '203' },
  { requestId: 'cr-3', careEntryId: '207' },
]

export const seedWeeks: DeaconWeek[] = [
  { id: 'dw-0', weekOf: toIso(addDays(sunday, -7)), personId: '11', backupPersonId: '13' },
  { id: 'dw-1', weekOf: toIso(sunday), personId: '12', backupPersonId: '9' },
  { id: 'dw-2', weekOf: toIso(addDays(sunday, 7)), personId: '10', backupPersonId: '11' },
]

export const seedVisits: DeaconVisit[] = [
  { id: 'dv-1', weekId: 'dw-0', householdLabel: 'The Prentiss family', kind: 'call', visitedOn: toIso(addDays(sunday, -5)), personId: '11' },
  { id: 'dv-2', weekId: 'dw-1', householdLabel: 'The Alvarados', kind: 'visit', visitedOn: toIso(addDays(sunday, 2)), personId: '12' },
]
