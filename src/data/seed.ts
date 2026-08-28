import type { CareType, DashboardData, Ministry, NoticeCategory } from './types'

/* Seed records carried over from the design handoff. They stand in for the
   Postgres tables until Supabase is wired up; the shapes are the same either way. */

export const MINISTRIES: Ministry[] = ['All', 'Children', 'Students', 'Men', 'Women', 'Music', 'All groups']

export const NOTICE_CATEGORIES: NoticeCategory[] = [
  { name: 'Family evening', std: 7 },
  { name: 'Leader training', std: 7 },
  { name: 'Room or schedule change', std: 2 },
  { name: 'Internal', std: 10 },
  { name: 'Calendar', std: 14 },
  { name: 'Cancellation', std: 1 },
]

export const CARE_TYPES: CareType[] = [
  { name: 'Guest follow-up', days: 3, window: '72 hours', note: 'from a contact card or a first visit' },
  { name: 'New member follow-up', days: 30, window: '30 days', note: 'post-membership check-in' },
  { name: 'Baptism follow-up', days: 14, window: '14 days', note: 'next-steps conversation' },
  { name: 'Member care need', days: 7, window: '7 days', note: 'first pastoral contact' },
  { name: 'Prayer request', days: 2, window: '48 hours', note: 'routed to whoever follows up' },
]

/** Standing services. They are on the calendar every week and are not events. */
export const STANDING_SERVICES = [
  { weekday: 0, time: '9:15 AM', name: 'Sunday Bible study' },
  { weekday: 0, time: '10:30 AM', name: 'Morning worship' },
  { weekday: 3, time: '6:00 PM', name: 'Wednesday study' },
  { weekday: 3, time: '7:00 PM', name: 'Wednesday dinner' },
]

export const CHURCH = {
  name: 'Memorial Baptist Church',
  city: 'Tulsa',
  address: '2800 South Yale Ave, Tulsa, OK 74114',
  phone: '918.744.0079',
  latitude: 36.1539,
  longitude: -95.9928,
  timezone: 'America/Chicago',
}

export const seed: DashboardData = {
  staff: [
    { id: 1, name: 'Jacob Bice', role: 'Senior Pastor', email: 'jacob@memorialbaptist.com', roleLevel: 'staff', active: true },
    { id: 2, name: 'Spencer Ray', role: 'Associate Pastor', email: 'spencer@memorialbaptist.com', roleLevel: 'staff', active: true },
    { id: 3, name: 'Ricky Weatherford', role: 'Music Minister', email: 'ricky@memorialbaptist.com', roleLevel: 'staff', active: true },
    { id: 4, name: 'Lori Bell', role: 'Family Ministries Associate', email: 'lori@memorialbaptist.com', roleLevel: 'staff', active: true },
    { id: 5, name: 'Michelle Davis', role: 'Preschool Minister', email: 'michelle@memorialbaptist.com', roleLevel: 'staff', active: true },
    { id: 6, name: 'Andrew McGuire', role: 'Campus Minister', email: 'andrew@memorialbaptist.com', roleLevel: 'staff', active: true },
    { id: 7, name: 'Sherry Kitchens', role: 'Office Administrator', email: 'sherry@memorialbaptist.com', roleLevel: 'staff', active: true },
    { id: 8, name: 'Joshua Davis', role: 'Office Administrator', email: 'joshua@memorialbaptist.com', roleLevel: 'staff', active: true },
  ],

  cadence: [
    { id: 1, name: 'Parent meeting — Kids', ministry: 'Children', ownerId: null, months: 6, intervalLabel: '2× / year', noticeDays: 21, lastHeld: null, notes: 'Last occurrence unknown.' },
    { id: 2, name: 'Parent meeting — Students', ministry: 'Students', ownerId: 8, months: 6, intervalLabel: '2× / year', noticeDays: 21, lastHeld: '2024-09-27', notes: 'Held ad hoc, not on a cycle.' },
    { id: 3, name: "Men's fellowship event", ministry: 'Men', ownerId: null, months: 3, intervalLabel: '4× / year', noticeDays: 21, lastHeld: null, notes: 'No owner named yet.' },
    { id: 4, name: "Women's fellowship event", ministry: 'Women', ownerId: 4, months: 3, intervalLabel: '4× / year', noticeDays: 21, lastHeld: '2026-06-20', notes: 'Fall gathering being planned.' },
    { id: 5, name: 'Group leader training', ministry: 'All groups', ownerId: null, months: 4, intervalLabel: '3× / year', noticeDays: 28, lastHeld: null, notes: 'Never held as designed.' },
    { id: 6, name: 'Volunteer appreciation', ministry: 'All', ownerId: null, months: 8, intervalLabel: '1–2× / year', noticeDays: 14, lastHeld: '2026-01-19', notes: 'Internal audience.' },
    { id: 7, name: 'Semester calendar publication', ministry: 'All', ownerId: 7, months: 6, intervalLabel: '2× / year', noticeDays: 30, lastHeld: '2026-03-08', notes: 'Measured against the season it covers.' },
  ],

  huddle: [
    { id: 11, col: 'win', authorId: 4, body: 'Nine new families at the Wednesday dinner. The fellowship hall was full.', createdAt: '2026-08-26', resolvedAt: null },
    { id: 12, col: 'win', authorId: 8, body: 'Camp follow-up calls are done.', createdAt: '2026-08-24', resolvedAt: null },
    { id: 13, col: 'win', authorId: 3, body: 'Worship team picked up two new members over the summer.', createdAt: '2026-08-21', resolvedAt: null },
    { id: 21, col: 'tension', authorId: 2, body: "Men's fellowship still has no owner. Fourth quarter with nothing on the calendar.", createdAt: '2026-08-25', resolvedAt: null },
    { id: 22, col: 'tension', authorId: 7, body: 'The fall calendar went out three weeks after we set it. Families had already booked.', createdAt: '2026-08-18', resolvedAt: null },
    { id: 23, col: 'tension', authorId: 5, body: 'Preschool check-in moves to Hall B on Sept 6 and there is no signage yet.', createdAt: '2026-08-27', resolvedAt: null },
    { id: 31, col: 'fyi', authorId: 6, body: 'I am out Sept 3–7. Spencer has the campus lock up.', createdAt: '2026-08-27', resolvedAt: null },
    { id: 32, col: 'fyi', authorId: 7, body: 'Copier code changed. Ask me for the new one.', createdAt: '2026-08-25', resolvedAt: null },
  ],

  notices: [
    { id: 101, subject: 'Wednesday supper price change', ministry: 'All', category: 'Internal', decidedOn: '2026-05-06', notifiedOn: '2026-05-19', audience: 'Whole church', channel: 'Bulletin', eventId: null },
    { id: 102, subject: 'Kids summer club dates', ministry: 'Children', category: 'Family evening', decidedOn: '2026-05-11', notifiedOn: '2026-05-15', audience: 'Kids parents', channel: 'Email', eventId: null },
    { id: 103, subject: 'Sanctuary AC repair — worship in the fellowship hall', ministry: 'All', category: 'Room or schedule change', decidedOn: '2026-06-02', notifiedOn: '2026-06-05', audience: 'Whole church', channel: 'Email, pulpit', eventId: null },
    { id: 104, subject: 'Student camp room assignments', ministry: 'Students', category: 'Family evening', decidedOn: '2026-06-08', notifiedOn: '2026-06-12', audience: 'Student parents', channel: 'Email', eventId: null },
    { id: 105, subject: 'Group leader training postponed', ministry: 'All groups', category: 'Leader training', decidedOn: '2026-06-15', notifiedOn: '2026-06-29', audience: 'Group leaders', channel: 'Email', eventId: null },
    { id: 106, subject: 'Fall semester calendar', ministry: 'All', category: 'Calendar', decidedOn: '2026-07-06', notifiedOn: '2026-07-27', audience: 'Whole church', channel: 'Bulletin, email', eventId: null },
    { id: 107, subject: 'Choir rehearsal moved to 5:00', ministry: 'Music', category: 'Room or schedule change', decidedOn: '2026-07-14', notifiedOn: '2026-07-15', audience: 'Choir', channel: 'Text', eventId: null },
    { id: 108, subject: 'Nursery volunteer appreciation lunch', ministry: 'All', category: 'Internal', decidedOn: '2026-07-20', notifiedOn: '2026-07-24', audience: 'Volunteers', channel: 'Email', eventId: null },
    { id: 109, subject: 'Fall parent meeting — Students', ministry: 'Students', category: 'Family evening', decidedOn: '2026-08-03', notifiedOn: '2026-08-18', audience: 'Student parents', channel: 'Email, bulletin', eventId: 2 },
    { id: 110, subject: 'Preschool check-in moves to Hall B', ministry: 'Children', category: 'Room or schedule change', decidedOn: '2026-08-10', notifiedOn: '2026-08-11', audience: 'Preschool parents', channel: 'Text', eventId: 4 },
    { id: 111, subject: 'Wednesday dinner cancelled Aug 26', ministry: 'All', category: 'Cancellation', decidedOn: '2026-08-24', notifiedOn: '2026-08-24', audience: 'Whole church', channel: 'Text, email', eventId: null },
    { id: 112, subject: "Women's fellowship — fall gathering", ministry: 'Women', category: 'Family evening', decidedOn: '2026-08-21', notifiedOn: null, audience: 'Women', channel: 'Not sent', eventId: 1 },
  ],

  care: [
    { id: 201, person: 'Hannah Whitfield', type: 'Guest follow-up', openedOn: '2026-08-27', ownerId: 2, status: 'open', lastTouchOn: null, sensitive: false, notes: 'Contact card, first visit Aug 23.' },
    { id: 202, person: 'Marcus Ellery', type: 'Guest follow-up', openedOn: '2026-08-24', ownerId: null, status: 'open', lastTouchOn: null, sensitive: false, notes: 'Asked about the 9:15 class.' },
    { id: 203, person: 'The Alvarado family', type: 'New member follow-up', openedOn: '2026-08-06', ownerId: 1, status: 'touched', lastTouchOn: '2026-08-20', sensitive: false, notes: 'Joined Aug 2. Two children in Kids.' },
    { id: 204, person: 'Caleb Mundy', type: 'Baptism follow-up', openedOn: '2026-08-16', ownerId: 6, status: 'touched', lastTouchOn: '2026-08-22', sensitive: false, notes: 'Baptized Aug 16. Next steps conversation set.' },
    { id: 205, person: 'Ruth Hollingsworth', type: 'Member care need', openedOn: '2026-08-22', ownerId: 1, status: 'open', lastTouchOn: null, sensitive: true, notes: 'Surgery scheduled; family needs meals for two weeks and a ride Thursday.' },
    { id: 206, person: 'Dale Prentiss', type: 'Prayer request', openedOn: '2026-08-27', ownerId: 2, status: 'open', lastTouchOn: null, sensitive: true, notes: 'Submitted through the website. Asked that it not be read aloud.' },
    { id: 207, person: 'Tina Boyer', type: 'Member care need', openedOn: '2026-07-30', ownerId: 4, status: 'closed', lastTouchOn: '2026-08-04', sensitive: false, notes: 'Visit made Aug 4. Closed.' },
  ],

  goals: [
    { id: 301, title: 'Every recurring commitment has a named owner.', ministry: 'All', ownerId: 8, target: '0 unclaimed by Dec 31', status: 'In progress', q: { q1: 'Ledger built. Seven items, four unclaimed.', q2: 'Two claimed at the June retreat.', q3: '', q4: '' } },
    { id: 302, title: 'Nobody hears about a decision after the people it affects.', ministry: 'All', ownerId: 7, target: 'Median notice gap under 7 days', status: 'On track', q: { q1: 'Started logging in May. Median 8.5.', q2: 'Median down to 4.', q3: 'August median 1 — the bulletin is doing the work.', q4: '' } },
    { id: 303, title: 'Two parent meetings a year, in each ministry, on the calendar in advance.', ministry: 'Children', ownerId: 5, target: '4 meetings held', status: 'Behind', q: { q1: 'None scheduled.', q2: 'Students held one ad hoc in February.', q3: 'Fall meeting set for Sept 13.', q4: '' } },
    { id: 304, title: 'Group leader training happens three times, as designed.', ministry: 'All groups', ownerId: 2, target: '3 sessions', status: 'Not started', q: { q1: '', q2: 'Postponed in June.', q3: '', q4: '' } },
    { id: 305, title: 'Every guest is contacted inside 72 hours.', ministry: 'All', ownerId: 6, target: 'No guest entry past its window', status: 'In progress', q: { q1: 'Pipeline opened.', q2: 'Two missed in May.', q3: 'One unclaimed as of this week.', q4: '' } },
  ],

  threads: [
    { id: 401, subject: 'Fall parent meeting — one night or two?', createdBy: 8, lastActivity: '2026-08-27' },
    { id: 402, subject: "Who owns men's fellowship this fall?", createdBy: 2, lastActivity: '2026-08-22' },
    { id: 403, subject: 'Hall B check-in signage', createdBy: 5, lastActivity: '2026-08-18' },
  ],

  posts: [
    { id: 501, threadId: 401, replyTo: null, authorId: 8, body: 'Sept 13 works for the youth house. One night covers both grade bands if we split the room. Two nights doubles the notice work.', createdAt: '2026-08-25', time: '9:12 AM', editedAt: null, removed: false },
    { id: 502, threadId: 401, replyTo: 501, authorId: 5, body: 'One night, but not the 13th — that is the Saturday after check-in moves. Families will already be confused about rooms.', createdAt: '2026-08-26', time: '2:41 PM', editedAt: '2026-08-26', removed: false },
    { id: 503, threadId: 401, replyTo: 502, authorId: 4, body: 'Sept 20 then. @Joshua Davis if we settle it this week the 21-day window still holds.', createdAt: '2026-08-27', time: '8:05 AM', editedAt: null, removed: false },
    { id: 511, threadId: 402, replyTo: null, authorId: 2, body: 'Fourth quarter and nothing on the calendar. I can host the October one but I cannot own the year.', createdAt: '2026-08-20', time: '11:30 AM', editedAt: null, removed: false },
    { id: 512, threadId: 402, replyTo: null, authorId: 3, body: '', createdAt: '2026-08-21', time: '4:02 PM', editedAt: null, removed: true },
    { id: 513, threadId: 402, replyTo: 512, authorId: 1, body: 'Agreed — put it on the ledger as a named owner rather than settling it here. This thread is gone in a week.', createdAt: '2026-08-22', time: '7:48 AM', editedAt: null, removed: false },
    { id: 521, threadId: 403, replyTo: null, authorId: 5, body: 'Signs need to be up by Sept 6. Two at the Hall B door, one at the old preschool desk pointing across.', createdAt: '2026-08-18', time: '1:15 PM', editedAt: null, removed: false },
  ],

  mentions: [{ id: 601, postId: 503, staffId: 8 }],

  events: [
    { id: 1, name: "Women's fellowship — fall gathering", ministry: 'Women', startsAt: '2026-09-20', time: '6:00 PM', location: 'Fellowship hall', cadenceItemId: 4 },
    { id: 2, name: 'Fall parent meeting — Students', ministry: 'Students', startsAt: '2026-09-13', time: '4:00 PM', location: 'Youth house', cadenceItemId: 2 },
    { id: 3, name: 'Volunteer appreciation lunch', ministry: 'All', startsAt: '2026-09-19', time: '12:00 PM', location: 'Fellowship hall', cadenceItemId: 6 },
    { id: 4, name: 'Preschool check-in moves to Hall B', ministry: 'Children', startsAt: '2026-09-06', time: '9:00 AM', location: 'Hall B', cadenceItemId: null },
    { id: 5, name: 'Wednesday study and dinner', ministry: 'All', startsAt: '2026-09-02', time: '6:00 PM', location: 'Fellowship hall', cadenceItemId: null },
  ],

  week: {
    serviceDate: '2026-08-30',
    series: 'Serve',
    sermonTitle: 'Serve one another',
    scripture: 'Philippians 2:1–11',
    status: 'draft',
    updatedBy: 7,
    updatedAt: '2026-08-26',
  },
}
