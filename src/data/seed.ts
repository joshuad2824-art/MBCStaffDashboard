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
  people: [
    { id: 1, name: 'Jacob Bice', role: 'Senior Pastor', email: 'jacob@memorialbaptist.com', access: 'staff', active: true },
    { id: 2, name: 'Spencer Ray', role: 'Associate Pastor', email: 'spencer@memorialbaptist.com', access: 'staff', active: true },
    { id: 3, name: 'Ricky Weatherford', role: 'Music Minister', email: 'ricky@memorialbaptist.com', access: 'staff', active: true },
    { id: 4, name: 'Lori Bell', role: 'Family Ministries Associate', email: 'lori@memorialbaptist.com', access: 'staff', active: true },
    { id: 5, name: 'Michelle Davis', role: 'Preschool Minister', email: 'michelle@memorialbaptist.com', access: 'staff', active: true },
    { id: 6, name: 'Andrew McGuire', role: 'Campus Minister', email: 'andrew@memorialbaptist.com', access: 'staff', active: true },
    { id: 7, name: 'Sherry Kitchens', role: 'Office Administrator', email: 'sherry@memorialbaptist.com', access: 'staff', active: true },
    { id: 8, name: 'Joshua Davis', role: 'Office Administrator', email: 'joshua@memorialbaptist.com', access: 'staff', active: true },
    // Sample deacons. Invented names, as in the design handoff; the real Board
    // is seated in Postgres by the administrator, never from here.
    { id: 9, name: 'Curtis Nolen', role: 'Deacon', email: 'curtis@memorialbaptist.com', access: 'limited', active: true },
    { id: 10, name: 'Arthur Simms', role: 'Deacon', email: 'arthur@memorialbaptist.com', access: 'limited', active: true },
    { id: 11, name: 'Lowell Bracken', role: 'Deacon', email: 'lowell@memorialbaptist.com', access: 'limited', active: true },
    { id: 12, name: 'Marvin Hollis', role: 'Deacon', email: 'marvin@memorialbaptist.com', access: 'limited', active: true },
    { id: 13, name: 'Dale Whitcomb', role: 'Deacon', email: 'dale@memorialbaptist.com', access: 'limited', active: true },
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
    { id: 201, person: 'Hannah Whitfield', type: 'Guest follow-up', openedOn: '2026-08-27', ownerId: 2, status: 'open', lastTouchOn: null, closedOn: null, sensitive: false, notes: 'Contact card, first visit Aug 23.' },
    { id: 202, person: 'Marcus Ellery', type: 'Guest follow-up', openedOn: '2026-08-24', ownerId: null, status: 'open', lastTouchOn: null, closedOn: null, sensitive: false, notes: 'Asked about the 9:15 class.' },
    { id: 203, person: 'The Alvarado family', type: 'New member follow-up', openedOn: '2026-08-06', ownerId: 1, status: 'touched', lastTouchOn: '2026-08-20', closedOn: null, sensitive: false, notes: 'Joined Aug 2. Two children in Kids.' },
    { id: 204, person: 'Caleb Mundy', type: 'Baptism follow-up', openedOn: '2026-08-16', ownerId: 6, status: 'touched', lastTouchOn: '2026-08-22', closedOn: null, sensitive: false, notes: 'Baptized Aug 16. Next steps conversation set.' },
    { id: 205, person: 'Ruth Hollingsworth', type: 'Member care need', openedOn: '2026-08-22', ownerId: 1, status: 'open', lastTouchOn: null, closedOn: null, sensitive: true, notes: 'Surgery scheduled; family needs meals for two weeks and a ride Thursday.' },
    { id: 206, person: 'Dale Prentiss', type: 'Prayer request', openedOn: '2026-08-27', ownerId: 2, status: 'open', lastTouchOn: null, closedOn: null, sensitive: true, notes: 'Submitted through the website. Asked that it not be read aloud.' },
    { id: 207, person: 'Tina Boyer', type: 'Member care need', openedOn: '2026-07-30', ownerId: 4, status: 'closed', lastTouchOn: '2026-08-04', closedOn: '2026-08-04', sensitive: false, notes: 'Visit made Aug 4. Closed.' },
  ],

  goals: [
    { id: 301, title: 'Every recurring commitment has a named owner.', ministry: 'All', ownerId: 8, target: '0 unclaimed by Dec 31', status: 'In progress', q: { q1: 'Ledger built. Seven items, four unclaimed.', q2: 'Two claimed at the June retreat.', q3: '', q4: '' } },
    { id: 302, title: 'Nobody hears about a decision after the people it affects.', ministry: 'All', ownerId: 7, target: 'Median notice gap under 7 days', status: 'On track', q: { q1: 'Started logging in May. Median 8.5.', q2: 'Median down to 4.', q3: 'August median 1 — the bulletin is doing the work.', q4: '' } },
    { id: 303, title: 'Two parent meetings a year, in each ministry, on the calendar in advance.', ministry: 'Children', ownerId: 5, target: '4 meetings held', status: 'Behind', q: { q1: 'None scheduled.', q2: 'Students held one ad hoc in February.', q3: 'Fall meeting set for Sept 13.', q4: '' } },
    { id: 304, title: 'Group leader training happens three times, as designed.', ministry: 'All groups', ownerId: 2, target: '3 sessions', status: 'Not started', q: { q1: '', q2: 'Postponed in June.', q3: '', q4: '' } },
    { id: 305, title: 'Every guest is contacted inside 72 hours.', ministry: 'All', ownerId: 6, target: 'No guest entry past its window', status: 'In progress', q: { q1: 'Pipeline opened.', q2: 'Two missed in May.', q3: 'One unclaimed as of this week.', q4: '' } },
  ],

  threads: [
    { id: 401, subject: 'Fall parent meeting — one night or two?', createdBy: 8, lastActivity: '2026-08-27', audience: ['staff'] },
    { id: 402, subject: "Who owns men's fellowship this fall?", createdBy: 2, lastActivity: '2026-08-22', audience: ['staff'] },
    { id: 403, subject: 'Hall B check-in signage', createdBy: 5, lastActivity: '2026-08-18', audience: ['staff'] },
    // The Board's own room, and the one thread both sides can read.
    { id: 404, subject: 'North lot resurfacing — bids before the September meeting', createdBy: 9, lastActivity: '2026-08-26', audience: ['deacon-board'] },
    { id: 405, subject: 'Volunteer appreciation lunch — can the Board serve?', createdBy: 8, lastActivity: '2026-08-27', audience: ['staff', 'deacon-board'] },
  ],

  posts: [
    { id: 501, threadId: 401, replyTo: null, authorId: 8, body: 'Sept 13 works for the youth house. One night covers both grade bands if we split the room. Two nights doubles the notice work.', createdAt: '2026-08-25', time: '9:12 AM', editedAt: null, removed: false },
    { id: 502, threadId: 401, replyTo: 501, authorId: 5, body: 'One night, but not the 13th — that is the Saturday after check-in moves. Families will already be confused about rooms.', createdAt: '2026-08-26', time: '2:41 PM', editedAt: '2026-08-26', removed: false },
    { id: 503, threadId: 401, replyTo: 502, authorId: 4, body: 'Sept 20 then. @Joshua Davis if we settle it this week the 21-day window still holds.', createdAt: '2026-08-27', time: '8:05 AM', editedAt: null, removed: false },
    { id: 511, threadId: 402, replyTo: null, authorId: 2, body: 'Fourth quarter and nothing on the calendar. I can host the October one but I cannot own the year.', createdAt: '2026-08-20', time: '11:30 AM', editedAt: null, removed: false },
    { id: 512, threadId: 402, replyTo: null, authorId: 3, body: '', createdAt: '2026-08-21', time: '4:02 PM', editedAt: null, removed: true },
    { id: 513, threadId: 402, replyTo: 512, authorId: 1, body: 'Agreed — put it on the ledger as a named owner rather than settling it here. This thread is gone in a week.', createdAt: '2026-08-22', time: '7:48 AM', editedAt: null, removed: false },
    { id: 521, threadId: 403, replyTo: null, authorId: 5, body: 'Signs need to be up by Sept 6. Two at the Hall B door, one at the old preschool desk pointing across.', createdAt: '2026-08-18', time: '1:15 PM', editedAt: null, removed: false },
    { id: 531, threadId: 404, replyTo: null, authorId: 9, body: 'Two bids are in. The third contractor wants to walk the lot first; I have him for Thursday. If we have all three by the 6th it goes on the agenda as new business.', createdAt: '2026-08-24', time: '7:40 PM', editedAt: null, removed: false },
    { id: 532, threadId: 404, replyTo: 531, authorId: 10, body: 'Ask each of them about drainage on the east side. That is what took the last surface out.', createdAt: '2026-08-26', time: '9:02 AM', editedAt: null, removed: false },
    { id: 541, threadId: 405, replyTo: null, authorId: 8, body: 'The lunch is the 19th. It would say something if the deacons served the tables rather than sat at them. Who can be there by 11:30?', createdAt: '2026-08-27', time: '3:20 PM', editedAt: null, removed: false },
    { id: 542, threadId: 405, replyTo: 541, authorId: 12, body: 'I can, and I will bring the coffee urns from the fellowship hall closet.', createdAt: '2026-08-27', time: '6:48 PM', editedAt: null, removed: false },
  ],

  mentions: [{ id: 601, postId: 503, staffId: 8 }],

  events: [
    { id: 1, name: "Women's fellowship — fall gathering", ministry: 'Women', startsAt: '2026-09-20', time: '6:00 PM', location: 'Fellowship hall', cadenceItemId: 4, audience: ['staff'], publishedAt: null },
    { id: 2, name: 'Fall parent meeting — Students', ministry: 'Students', startsAt: '2026-09-13', time: '4:00 PM', location: 'Youth house', cadenceItemId: 2, audience: ['staff'], publishedAt: null },
    { id: 3, name: 'Volunteer appreciation lunch', ministry: 'All', startsAt: '2026-09-19', time: '12:00 PM', location: 'Fellowship hall', cadenceItemId: 6, audience: ['staff', 'deacon-board'], publishedAt: '2026-08-27' },
    { id: 4, name: 'Preschool check-in moves to Hall B', ministry: 'Children', startsAt: '2026-09-06', time: '9:00 AM', location: 'Hall B', cadenceItemId: null, audience: ['staff'], publishedAt: null },
    { id: 5, name: 'Wednesday study and dinner', ministry: 'All', startsAt: '2026-09-02', time: '6:00 PM', location: 'Fellowship hall', cadenceItemId: null, audience: ['staff'], publishedAt: null },
    { id: 6, name: 'Deacon and family cookout', ministry: 'All', startsAt: '2026-09-26', time: '5:30 PM', location: 'Pavilion', cadenceItemId: null, audience: ['deacon-board'], publishedAt: null },
  ],

  announcements: [
    { id: 801, body: 'The copier in the workroom is back. The service call found a worn roller, not the toner.', audience: ['staff'], authorId: 7, createdAt: '2026-08-26', expiresOn: '2026-09-04' },
    { id: 802, body: 'The September Board meeting is the 13th at 4:00. Committee reports are due to the chairman by the 6th.', audience: ['staff', 'deacon-board'], authorId: 8, createdAt: '2026-08-27', expiresOn: '2026-09-13' },
    { id: 803, body: 'Deacon of the Week for the 30th is Marvin Hollis. Calls to the office go to him.', audience: ['deacon-board'], authorId: 8, createdAt: '2026-08-28', expiresOn: '2026-09-05' },
  ],

  weeks: [
    {
      id: 701,
      serviceDate: '2026-08-30',
      series: 'Serve',
      sermonTitle: 'Serve one another',
      scripture: 'Philippians 2:1\u201311',
      coverImageUrl: '',
      artCaption: 'series art \u2014 serve',
      status: 'draft',
      publishedCreatedNoticeIds: [],
      publishedStampedNoticeIds: [],
      updatedBy: 7,
      updatedAt: '2026-08-26',
      order: [
        { id: 1, title: 'Scripture reading and welcome', kind: 'spoken', detail: '' },
        { id: 2, title: 'May the People Praise You', kind: 'song', detail: '' },
        { id: 3, title: 'Praise to the Lord, the Almighty', kind: 'song', detail: '' },
        { id: 4, title: 'Firm Foundation (He Won\u2019t)', kind: 'song', detail: '' },
        { id: 5, title: 'Holy Song', kind: 'song', detail: '' },
        { id: 6, title: 'The Lord\u2019s Prayer', kind: 'spoken', detail: '' },
        { id: 7, title: 'Offertory', kind: 'spoken', detail: '' },
        { id: 8, title: 'SERVE', kind: 'sermon', detail: 'Philippians 2:1\u201311' },
        { id: 9, title: 'Hallelujah, What a Savior', kind: 'song', detail: '' },
      ],
      bulletinEvents: [
        { id: 1, date: '8.30', title: 'Business meeting', when: '11:45 AM in the sanctuary', detail: '', eventId: null },
        { id: 2, date: '9.02', title: 'Wednesday study and meal', when: '6:00 PM study \u00b7 7:00 PM meal', detail: '', eventId: 5 },
        { id: 3, date: '9.06', title: 'Preschool check-in moves to Hall B', when: '9:00 AM \u00b7 same rooms upstairs, new desk', detail: '', eventId: 4 },
        { id: 4, date: '9.13', title: 'Fall parent meeting \u2014 Students', when: '4:00 PM at the youth house', detail: '', eventId: 2 },
        { id: 5, date: '9.19', title: 'Volunteer appreciation lunch', when: '12:00 PM in the fellowship hall', detail: '', eventId: 3 },
      ],
      give: [
        'Text 918.233.3740 or scan the code',
        'Mail 2800 S. Yale Ave, Tulsa, OK 74114',
        'Offering boxes in the sanctuary',
      ],
      stewardship: [
        { label: 'Given in 2026', value: '$643,945.64' },
        { label: 'Spent in 2026', value: '$470,226.42' },
        { label: 'Budgeted for 2026', value: '$485,577.18' },
        { label: 'Missions', value: '$41,739.68' },
      ],
    },
  ],

  settings: {
    welcome:
      'If you are visiting, please fill out a contact card \u2014 in the pew or at memorialbaptist.com \u2014 and return it to an offering box or the Welcome Desk.',
    families:
      'Nursery is available for babies through Pre-K. Children in K\u20133rd are invited to Bible Club after singing and will be walked to the Clubhouse classroom upstairs; pick-up is upstairs after the service. Family Worship is the first Sunday of each month.',
    address: '2800 South Yale Ave, Tulsa, OK 74114 \u00b7 918.744.0079 \u00b7 memorialbaptist.com',
    contacts: [
      { role: 'Senior Pastor', name: 'Jacob Bice', phone: '918.744.0079' },
      { role: 'Associate Pastor', name: 'Spencer Ray', phone: '918.744.0079' },
      { role: 'Music', name: 'Ricky Weatherford', phone: '918.744.0079' },
      { role: 'Preschool', name: 'Michelle Davis', phone: '918.744.0079' },
      { role: 'Office', name: 'Sherry Kitchens', phone: '918.744.0079' },
    ],
    meetingBlocks: [
      { day: 'Sunday', lines: ['9:15 AM Bible study', '10:30 AM Worship'] },
      { day: 'Wednesday', lines: ['6:00 PM Study', '7:00 PM Dinner'] },
    ],
    waysToGive: [
      'Text 918.233.3740 or scan the code',
      'Mail 2800 S. Yale Ave, Tulsa, OK 74114',
      'Offering boxes in the sanctuary',
    ],
  },
}

/** Which bodies the sample people sit in, for the stub. In a configured build
    this is the `membership` table and `my_seats()`; here it is what 0004 would
    have seated: everyone who signs in on the staff side is in `staff`, and the
    sample deacons sit where the handoff drew them. */
export interface SeedSeat {
  slug: string
  role: 'chair' | 'member' | 'ex_officio'
}

/** The stub's answer for anyone: their seeded seats, and for a person the
    seed does not name, what 0004 seats everybody in today — whoever can sign
    in is in `staff`. */
export function seedSeatsFor(person: { id: number; access: string }): SeedSeat[] {
  const seeded = SEED_SEATS[person.id]
  if (seeded) return seeded
  return person.access === 'none' ? [] : [{ slug: 'staff', role: 'member' }]
}

export const SEED_SEATS: Record<number, SeedSeat[]> = {
  1: [{ slug: 'staff', role: 'member' }, { slug: 'deacon-board', role: 'ex_officio' }, { slug: 'committee:finance', role: 'ex_officio' }],
  8: [{ slug: 'staff', role: 'member' }, { slug: 'deacon-board', role: 'chair' }],
  9: [{ slug: 'deacon-board', role: 'member' }, { slug: 'committee:finance', role: 'chair' }],
  10: [{ slug: 'deacon-board', role: 'member' }],
  11: [{ slug: 'deacon-board', role: 'member' }, { slug: 'committee:finance', role: 'member' }],
  12: [{ slug: 'deacon-board', role: 'member' }],
  13: [{ slug: 'deacon-board', role: 'member' }],
}
