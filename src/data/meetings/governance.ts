import type { Finding, GovernanceDocument, Obligation } from './types'

/* Sample governance content for a checkout without Supabase. The obligations
   are the fifteen rows migration 0013 seeds, verified against the manual. The
   documents are short verbatim excerpts of the 2-11-2025 Bylaws, Policies &
   Procedures Manual as transcribed — enough to read the citations the year
   makes — and they say so in their own text. The full corpus is loaded into
   the database by supabase/governance/build-seed.mjs and never lives in this
   bundle. */

export const seedObligations: Obligation[] = [
  { id: 'o-01', slug: 'treasurer-monthly-report', title: 'Treasurer’s itemised report', ruleSource: 'Art. II.C ¶2', requirement: 'The Treasurer renders to the deacons at each regular monthly meeting an itemized report of receipts and disbursements for the preceding month; the report is presented to the church in its regular business meeting.', cadence: 'monthly', anchor: 'meeting', noticeDays: 7, ownerBodySlug: 'committee:finance', active: true, position: 10 },
  { id: 'o-02', slug: 'committee-reports', title: 'Committee reports to the Board', ruleSource: 'Board practice · minutes, appendices A–D', requirement: 'Finance, Family Assistance, Personnel and Building & Grounds report at the regular monthly meeting and the reports are filed as appendices to the minutes. The Board’s standing practice, not a bylaw.', cadence: 'monthly', anchor: 'meeting', noticeDays: 7, ownerBodySlug: 'deacon-board', active: true, position: 20 },
  { id: 'o-03', slug: 'budget-requests-out', title: 'Budget request materials go out', ruleSource: 'A009 §2', requirement: 'Budget request materials distributed by the Church Administrator on behalf of the Finance Committee to committee chairs, program directors and staff.', cadence: 'annual', anchor: '10-10', noticeDays: 14, ownerBodySlug: 'committee:finance', active: true, position: 30 },
  { id: 'o-04', slug: 'budget-requests-due', title: 'Budget requests due back', ruleSource: 'A009 §2', requirement: 'Budget requests returned to the Church Administrator.', cadence: 'annual', anchor: '10-24', noticeDays: 7, ownerBodySlug: 'committee:finance', active: true, position: 40 },
  { id: 'o-05', slug: 'budget-proposal-begins', title: 'Finance begins the budget proposal', ruleSource: 'A009 §2', requirement: 'The Finance Committee begins work to develop the budget proposal.', cadence: 'annual', anchor: '11-01', noticeDays: 7, ownerBodySlug: 'committee:finance', active: true, position: 50 },
  { id: 'o-06', slug: 'budget-to-board', title: 'Budget presented to the Board for approval', ruleSource: 'A009 §2 ¶1', requirement: 'The budget is presented to the Board of Deacons for review and approval. A Board action, at the Board’s meeting; the rest of the calendar depends on it.', cadence: 'annual', anchor: '11-15', noticeDays: 14, ownerBodySlug: 'deacon-board', active: true, position: 60 },
  { id: 'o-07', slug: 'town-halls-complete', title: 'Both town hall meetings held', ruleSource: 'A009 §2 ¶2', requirement: 'Upon approval by the deacons the budget is presented to the church for review: copies made available, and two town hall meetings — one Wednesday evening, one Sunday evening — completed. Proposed changes come in writing to the Finance Committee.', cadence: 'annual', anchor: '11-30', noticeDays: 14, ownerBodySlug: 'committee:finance', active: true, position: 70 },
  { id: 'o-08', slug: 'budget-vote', title: 'Special business meeting to vote on the budget', ruleSource: 'A009 §2 ¶3', requirement: 'A special business meeting following the town halls votes on the budget: approve or oppose only, no amendments, simple majority. Approval must be completed no later than December 31st.', cadence: 'annual', anchor: '12-15', noticeDays: 14, ownerBodySlug: 'deacon-board', active: true, position: 80 },
  { id: 'o-09', slug: 'unused-funds-transfer', title: 'Unused budgeted funds to Expansion & Improvement', ruleSource: 'A009 §3', requirement: 'No budgeted funds carry forward. Any remaining funds are transferred to the Expansion & Improvement Fund by February 15th of the following calendar year.', cadence: 'annual', anchor: '02-15', noticeDays: 14, ownerBodySlug: 'committee:finance', active: true, position: 90 },
  { id: 'o-10', slug: 'treasurer-annual-report', title: 'Treasurer’s annual report and audit', ruleSource: 'Art. II.C ¶¶3–5 · Art. III §3 ¶2', requirement: 'Within 60 days after the end of each fiscal year the Treasurer renders to the deacons and to the church an annual report of total receipts and an itemized statement of disbursements, audited first by the Audit Committee and delivered afterwards to the Church Clerk. The bylaws do not define the fiscal year; A009 makes the budget year the calendar year, so this is anchored to 1 March. If the fiscal year is the church year, it falls at the end of November instead.', cadence: 'annual', anchor: '03-01', noticeDays: 30, ownerBodySlug: 'committee:finance', active: true, position: 100 },
  { id: 'o-11', slug: 'senior-pastor-review', title: 'Senior Pastor’s performance review', ruleSource: 'Art. II.B §3 · Personnel Committee', requirement: 'The Personnel Committee conducts a performance review of the Senior Pastor, to be evaluated by the Deacon Board, and annually evaluates the staff’s performance reviews. The month is the Board’s practice, not the bylaw’s. No compensation figure enters the dashboard.', cadence: 'annual', anchor: 'meeting:04', noticeDays: 21, ownerBodySlug: 'committee:personnel', active: true, position: 110 },
  { id: 'o-12', slug: 'nominations-open', title: 'Deacon nominations open', ruleSource: 'Art. II.B §3 ¶10', requirement: 'Nomination forms are made available not less than one month before the election, and all nominations are made at least 30 days before the electing business meeting — from the church first, then from the Board. Before nominations and elections the qualifications in Art. II.B §1 and 1 Timothy 3:8–13 are printed and distributed. The clock runs from the church’s business meeting; this is the Board meeting before it.', cadence: 'annual', anchor: 'meeting:07', noticeDays: 21, ownerBodySlug: 'deacon-board', active: true, position: 120 },
  { id: 'o-13', slug: 'deacon-election', title: 'Election of deacons', ruleSource: 'Art. II.B §3 ¶¶9–11', requirement: 'At the business meeting preceding the September Deacon Board meeting, deacons are elected to replace those whose terms expire on the last day of September, by an affirmative majority of those voting. Nominations are screened by the pastor and the chairman first. Historically the August business meeting.', cadence: 'annual', anchor: 'meeting:08', noticeDays: 21, ownerBodySlug: 'deacon-board', active: true, position: 130 },
  { id: 'o-14', slug: 'officer-election', title: 'Election of Board officers', ruleSource: 'Art. II.B §3 ¶3', requirement: 'The Chairman, Vice-Chairman and Secretary are elected for a one-year term by a simple majority of the Deacon Board prior to the start of the church year (October–September).', cadence: 'annual', anchor: 'meeting:09', noticeDays: 14, ownerBodySlug: 'deacon-board', active: true, position: 140 },
  { id: 'o-15', slug: 'october-roster-filing', title: 'Committee roster reported to the church', ruleSource: 'Art. II.B §3', requirement: 'Each committee’s term of service is one year beginning in October. The membership of all committees except the Family Assistance Committee is reported to the church in the regular October business meeting.', cadence: 'annual', anchor: 'meeting:10', noticeDays: 21, ownerBodySlug: 'deacon-board', active: true, position: 150 },
]

export const seedDocuments: GovernanceDocument[] = [
  {
    id: 'g-1', slug: '02-bylaws-art-02-church-leadership', kind: 'bylaws', code: 'Art. II', title: 'Bylaws, Article II. CHURCH LEADERSHIP', position: 10,
    body: `> *Sample for a local checkout: verbatim excerpts of Article II, B §3 and C, from the 2-11-2025 manual as transcribed. The Board's copy is the whole corpus, loaded into the database.*

## ARTICLE II. CHURCH LEADERSHIP

B. Deacons

### SECTION 3. Elected Deacon Board

1. The Deacon Board of Memorial Baptist Church is composed of the twelve deacons elected to serve for the current year.

3. The Officers of the Elected Deacon Board shall be the Chairman, Vice-Chairman, and the Secretary. These positions shall be elected for a one year term by a simple majority of the Deacon Board prior to the start of the church year (Oct. – Sept.).

5. The Deacon Board shall function as a cohesive unit responsible for considering all significant problems and formulating general policies for the church. The Board will convene monthly to discuss these matters.

In consultation with the Senior Pastor, the Deacon Chair will appoint a chairperson from the general church membership or the Deacon Board to chair each standing committee of the Deacon Board. If the Deacon Chair chooses a chairperson from the general church membership, he will also appoint a deacon elected to the active board to the standing committee. Each standing committee must have at least one currently elected deacon serving as a member or chairperson. The appointed chairperson, in collaboration with the deacon assigned to the committee, will then select additional members from the church membership to serve on the committee.

The Deacon Board will have four standing committees, as follows:

Finance, Personnel, Building and Grounds, and Member Care.

Each committee’s term of service will be for one year beginning in October. The membership of all committees except the Family Assistance Committee shall be reported to the church in the regular October business meeting. The Deacon Board may organize themselves into such additional committees as their wisdom may direct for efficiency in service.

9. At the business meeting preceding the September Deacon Board meeting, deacons shall be elected to replace the deacons whose terms of service on the Board will expire of the last day of September in such year. Other vacancies on the Deacon Board shall be filled at any regular or special called business meeting. Nominations to fill vacancies in unexpired terms shall come from the Deacon Board.

10. All nominations of candidates for election to the Deacon Board shall be made at least 30 days prior to that business meeting. Nominations will first be made by the church after which nominations may be received from the Deacon Board. Such nominations from the church shall use a nomination form made available not less than one month prior to election.

11. In any election of a deacon to the Board, an affirmative majority (1/2) of those voting shall be necessary for a decision.

12. Each elected deacon is required to attend three-fourths (¾) of the meetings of the Board in each deacon year. Failure to so attend without just cause shall result in automatic removal of said deacons from the active board, and a qualified man shall be recommended to the church to fill the vacancy.

C. Treasurer

The Chairman of the Finance Committee shall serve as the Treasurer of the Church. He shall consult with the Deacon Chairman to select six other church members who shall comprise the Finance Committee.

2. It shall be the duty of the Treasurer to render to the deacons at each regular monthly meeting an itemized report of receipts and disbursements for the preceding month, and this report shall be presented to the church in its regular business meeting.

3. Within 60 days after the end of each fiscal year, the Treasurer shall render to the deacons and to the church an annual report showing the total amount of receipts, and an itemized statement of all disbursements.

4. Prior to the rendition of this annual report, upon its completion by the Treasurer, the report shall be audited by the church Audit Committee.

E. Church Clerk

The Church Clerk shall keep a suitable record of all the actions of the church, except as otherwise herein provided.`,
  },
  {
    id: 'g-2', slug: '06-policies-a009-building-property-use-income', kind: 'policy', code: 'A009', title: 'Policy A009 — Building & Property Use Income', position: 20,
    body: `> *Sample for a local checkout: the budget portion of A009, verbatim, from the 2-11-2025 manual as transcribed.*

Memorial Baptist Church will utilize a budget for day-to-day operations. The General Fund bank account will be used for budgeted receipts and disbursements.

1. The budget will correspond with the calendar year and be based on the principle that on-going expenditures shall be funded with on-going receipts.

2. The budget will be prepared annually by the Finance Committee.

    1. Budget will be presented to the Board of Deacons for review and approval.

    2. Upon approval by the Deacons, the budget will be presented to the church for review. Copies of the budget proposal will be made available to church members. Two town hall meetings will be scheduled for discussion and review by the church body. One meeting will be scheduled for a Wednesday evening and another for a Sunday evening. Any proposed budget changes by a church member must be submitted in writing to the Finance Committee for further consideration and approval.

    3. A special business meeting will be scheduled following the Town Hall meetings to vote on the budget. No budget amendments are permitted at this time. The vote on the final proposed budget will be an “approve” or “oppose” vote only and will be considered approved by a simple majority vote. Approval of a church budget must be completed no later than December 31st of each year.

3. No budgeted funds will be carried forward from year to year. Any remaining funds are to be transferred to the Expansion & Improvement Fund by February 15th of the following calendar year.

In order to allow sufficient time for proper preparation review, and approval, the following approximate schedule is suggested:

October 10th Budget request materials distributed by Church Administrator on behalf of the Finance Committee to committee chairs, program directors and staff.

October 24th Budget requests returned to the Church Administrator.

November 1st Finance Committee begins work to develop budget proposal.

November 15th Budget presented to the Board of Deacons for their approval.

November 30th Both Town Hall meetings for church review completed.

December 15th Business meeting for church to vote on budget.`,
  },
]

export const seedFindings: Finding[] = [
  {
    id: 'f-8', number: 8, title: 'The 2022 amendment’s citation no longer resolves', status: 'open',
    cites: ['Art. III'],
    body: `**Where:** \`Notes_01.docx\`, \`Notes_02.docx\`, and the manual's Appendix

> MBC approved the addition of the new paragraph **"12. Safety & Emergency Response Committee"** to the By-Laws, Church Committees section.

**The problem.** In the current manual, Article III, Section 3 lists **ten** committees, and Safety & Emergency Response is number **10**. There is no paragraph 12. Anyone reading the 2022 minutes against today's manual will not find what the minutes describe.

**Fix.** Annotate the appendix entry: *"recorded as paragraph 12; renumbered to paragraph 10 following the 2020-12-13 committee merger."* The underlying bylaw text is correct and needs no amendment.`,
  },
  {
    id: 'f-9', number: 9, title: 'The 2024 amendment’s citation points at the wrong paragraph', status: 'open',
    cites: ['Art. II'],
    body: `**Where:** \`Notes_02.docx\` and the manual's Appendix

> Changed the **BYLAWS**, ARTICLE II. CHURCH LEADERSHIP, B. Deacons, SECTION 3. Elected Deacon Board, **paragraph 5**.

**The problem.** Section 3's numbered paragraphs run 1 through 12. Paragraph 5 reads: "The Deacon Board shall function as a cohesive unit responsible for considering all significant problems and formulating general policies for the church" — which has nothing to do with committee chairs.

The language the amendment actually added — "In consultation with the Senior Pastor, the Deacon Chair will appoint a chairperson from the general church membership or the Deacon Board to chair each standing committee…" — sits **between numbered paragraphs 5 and 6, and is not numbered at all.**

**Fix.** Correct the appendix to cite the paragraph following paragraph 5, and quote the amended sentence so the citation cannot drift again.`,
  },
]
