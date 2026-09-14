import type { Finding, GovernanceDocument, Obligation } from './types'

/* Sample governance content for a checkout without Supabase. The obligations
   are the same eight rows migration 0009 seeds. The documents are short
   sample transcriptions built from the passages the brief quotes, and they
   say so in their own text — the real corpus is loaded into the database by
   supabase/governance/build-seed.mjs and never lives in this bundle. */

export const seedObligations: Obligation[] = [
  { id: 'o-1', slug: 'treasurer-monthly-report', title: 'Treasurer’s itemised report', ruleSource: 'Art. II.C ¶2', requirement: 'An itemized report of receipts and disbursements for the preceding month, at each regular monthly meeting.', cadence: 'monthly', anchor: 'meeting', noticeDays: 7, ownerBodySlug: 'committee:finance', active: true, position: 10 },
  { id: 'o-2', slug: 'committee-reports', title: 'Committee reports to the Board', ruleSource: 'Art. II.B §3', requirement: 'Each standing committee reports at the regular monthly meeting; the reports are appended to the minutes.', cadence: 'monthly', anchor: 'meeting', noticeDays: 7, ownerBodySlug: 'deacon-board', active: true, position: 20 },
  { id: 'o-3', slug: 'nominations-open', title: 'Nominations for the Board open', ruleSource: 'Art. II.B §2', requirement: 'The July nomination clocks: nominations for the coming deacon year are received at the July meeting.', cadence: 'annual', anchor: 'meeting:07', noticeDays: 21, ownerBodySlug: 'deacon-board', active: true, position: 30 },
  { id: 'o-4', slug: 'deacon-election', title: 'Election of deacons', ruleSource: 'Art. II.B §2', requirement: 'The church elects deacons in August for terms beginning with the new deacon year.', cadence: 'annual', anchor: 'meeting:08', noticeDays: 21, ownerBodySlug: 'deacon-board', active: true, position: 40 },
  { id: 'o-5', slug: 'officer-election', title: 'Election of Board officers', ruleSource: 'Art. II.B §3', requirement: 'The Board elects its chairman, vice-chairman and secretary at the September meeting.', cadence: 'annual', anchor: 'meeting:09', noticeDays: 14, ownerBodySlug: 'deacon-board', active: true, position: 50 },
  { id: 'o-6', slug: 'october-roster-filing', title: 'October filing — the committee roster to the church', ruleSource: 'Art. II.B §3', requirement: 'The committee assignments for the year are published to the church in October. Family Assistance membership is excluded.', cadence: 'annual', anchor: '10-01', noticeDays: 21, ownerBodySlug: 'deacon-board', active: true, position: 60 },
  { id: 'o-7', slug: 'budget-calendar-start', title: 'Budget calendar opens', ruleSource: 'A009', requirement: 'The first of the A009 budget calendar’s five dates: committees begin the next year’s requests.', cadence: 'annual', anchor: '10-10', noticeDays: 14, ownerBodySlug: 'committee:finance', active: true, position: 70 },
  { id: 'o-8', slug: 'treasurer-annual-report', title: 'Treasurer’s annual report and audit', ruleSource: 'Art. II.C', requirement: 'The annual report of the year’s receipts and disbursements, and the audit window that follows it. The month is taken from the corpus when it is loaded; until then it is anchored to the January meeting.', cadence: 'annual', anchor: 'meeting:01', noticeDays: 30, ownerBodySlug: 'committee:finance', active: true, position: 80 },
]

export const seedDocuments: GovernanceDocument[] = [
  {
    id: 'g-1', slug: 'article-ii', kind: 'bylaws', code: 'Art. II', title: 'Article II — Officers and Boards', position: 10,
    body: `# Article II — Officers and Boards

> *Sample transcription for a local checkout. The Board's copy is the transcribed corpus loaded into the database; this page reads whatever is there.*

## B. Deacons

### 2. Nomination and election

Nominations are received in July and the church elects deacons in August, for terms beginning with the new deacon year.

### 3. The Board

5. The Board will convene monthly.

12. Failure to attend three-fourths of the regular meetings of the Board without just cause shall constitute a resignation from the Board.

The committee assignments for the year are published to the church in October.

## C. Treasurer

2. The Treasurer shall present an itemized report of receipts and disbursements for the preceding month at each regular monthly meeting of the Board, and to the church at its business meeting.

## E. Clerk

The Church Clerk shall be the keeper of the records of the church.`,
  },
  {
    id: 'g-2', slug: 'a009-budget-calendar', kind: 'policy', code: 'A009', title: 'A009 — Budget calendar', position: 20,
    body: `# A009 — Budget calendar

> *Sample transcription for a local checkout.*

The budget year is built on five dates. The calendar opens on 10 October, when the committees begin the next year's requests to the Finance committee.`,
  },
  {
    id: 'g-3', slug: 'd002-family-assistance', kind: 'policy', code: 'D002', title: 'D002 — Family assistance', position: 30,
    body: `# D002 — Family assistance

> *Sample transcription for a local checkout.*

## 6. Disbursements

Every disbursement from the fund is made to a third party against an invoice. No payment is made to the family directly.`,
  },
]

export const seedFindings: Finding[] = [
  {
    id: 'f-8', number: 8, title: 'An amendment cites a paragraph that no longer resolves', status: 'open',
    cites: ['Art. II.B §3 ¶12'],
    body: `The recorded amendment names a paragraph number rather than quoting the sentence it changed. The article has since been renumbered, and the citation no longer points at any paragraph that reads the way the amendment assumes.

This is why a motion that amends the bylaws quotes the text before and after (brief §3.2). A ledger that quotes the sentence cannot drift the way a ledger that cites a paragraph does.`,
  },
  {
    id: 'f-9', number: 9, title: 'A second amendment with the same defect', status: 'open',
    cites: ['Art. II.C ¶2'],
    body: `As finding 8. The location was captured; the language was not.`,
  },
]
