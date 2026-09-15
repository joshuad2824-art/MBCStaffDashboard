-- 0013 — the year, verified against the manual.
--
-- 0009 seeded the deacon year's obligations from the brief, before the
-- governance corpus could be read. It has now been read — the 2-11-2025
-- Bylaws, Policies & Procedures Manual as transcribed — and this migration
-- brings the seed into line with the text. Every requirement below quotes or
-- closely follows the manual; every citation resolves.
--
-- What changed, and why:
--   * "Committee reports to the Board" is the Board's standing practice (the
--     minutes and their appendices A–D), not a bylaw. It stays, and says so.
--   * A009 sets the budget calendar in seven dated steps, not one. Each is
--     its own line, because each falls to somebody on a date.
--   * The Treasurer's annual report is due within sixty days of fiscal year
--     end (Art. II.C ¶3), audited first (¶4; Art. III §3 ¶2). The bylaws
--     never define the fiscal year; A009 makes the budget year the calendar
--     year, so it is anchored to 1 March and says what would move it.
--   * The Senior Pastor's review, conducted by Personnel and evaluated by the
--     Board (Art. II.B §3), is added; the month is practice, not bylaw.
--   * The election and nomination clocks run from the church's quarterly
--     business meeting, which the dashboard does not schedule, so they are
--     anchored to the Board's meeting in the month the manual names.
--
-- Also: the reference gains two kinds of document the corpus holds — the
-- Constitution, and the derived reference material (the index, the quick
-- reference, the amendment history, the chairman's guide).

alter table governance_document drop constraint governance_document_kind_check;
alter table governance_document
  add constraint governance_document_kind_check
  check (kind in ('constitution', 'bylaws', 'policy', 'procedure', 'reference'));

-- The budget calendar's first date was seeded under a generic slug; keep any
-- agenda item that points at it by renaming rather than replacing.
update obligation set slug = 'budget-requests-out' where slug = 'budget-calendar-start';

insert into obligation (slug, title, rule_source, requirement, cadence, anchor, notice_days, owner_body_slug, position) values
  ('treasurer-monthly-report', 'Treasurer’s itemised report', 'Art. II.C ¶2',
   'The Treasurer renders to the deacons at each regular monthly meeting an itemized report of receipts and disbursements for the preceding month; the report is presented to the church in its regular business meeting.',
   'monthly', 'meeting', 7, 'committee:finance', 10),
  ('committee-reports', 'Committee reports to the Board', 'Board practice · minutes, appendices A–D',
   'Finance, Family Assistance, Personnel and Building & Grounds report at the regular monthly meeting and the reports are filed as appendices to the minutes. The Board’s standing practice, not a bylaw.',
   'monthly', 'meeting', 7, 'deacon-board', 20),
  ('budget-requests-out', 'Budget request materials go out', 'A009 §2',
   'Budget request materials distributed by the Church Administrator on behalf of the Finance Committee to committee chairs, program directors and staff.',
   'annual', '10-10', 14, 'committee:finance', 30),
  ('budget-requests-due', 'Budget requests due back', 'A009 §2',
   'Budget requests returned to the Church Administrator.',
   'annual', '10-24', 7, 'committee:finance', 40),
  ('budget-proposal-begins', 'Finance begins the budget proposal', 'A009 §2',
   'The Finance Committee begins work to develop the budget proposal.',
   'annual', '11-01', 7, 'committee:finance', 50),
  ('budget-to-board', 'Budget presented to the Board for approval', 'A009 §2 ¶1',
   'The budget is presented to the Board of Deacons for review and approval. A Board action, at the Board’s meeting; the rest of the calendar depends on it.',
   'annual', '11-15', 14, 'deacon-board', 60),
  ('town-halls-complete', 'Both town hall meetings held', 'A009 §2 ¶2',
   'Upon approval by the deacons the budget is presented to the church for review: copies made available, and two town hall meetings — one Wednesday evening, one Sunday evening — completed. Proposed changes come in writing to the Finance Committee.',
   'annual', '11-30', 14, 'committee:finance', 70),
  ('budget-vote', 'Special business meeting to vote on the budget', 'A009 §2 ¶3',
   'A special business meeting following the town halls votes on the budget: approve or oppose only, no amendments, simple majority. Approval must be completed no later than December 31st.',
   'annual', '12-15', 14, 'deacon-board', 80),
  ('unused-funds-transfer', 'Unused budgeted funds to Expansion & Improvement', 'A009 §3',
   'No budgeted funds carry forward. Any remaining funds are transferred to the Expansion & Improvement Fund by February 15th of the following calendar year.',
   'annual', '02-15', 14, 'committee:finance', 90),
  ('treasurer-annual-report', 'Treasurer’s annual report and audit', 'Art. II.C ¶¶3–5 · Art. III §3 ¶2',
   'Within 60 days after the end of each fiscal year the Treasurer renders to the deacons and to the church an annual report of total receipts and an itemized statement of disbursements, audited first by the Audit Committee and delivered afterwards to the Church Clerk. The bylaws do not define the fiscal year; A009 makes the budget year the calendar year, so this is anchored to 1 March. If the fiscal year is the church year, it falls at the end of November instead.',
   'annual', '03-01', 30, 'committee:finance', 100),
  ('senior-pastor-review', 'Senior Pastor’s performance review', 'Art. II.B §3 · Personnel Committee',
   'The Personnel Committee conducts a performance review of the Senior Pastor, to be evaluated by the Deacon Board, and annually evaluates the staff’s performance reviews. The month is the Board’s practice, not the bylaw’s. No compensation figure enters the dashboard.',
   'annual', 'meeting:04', 21, 'committee:personnel', 110),
  ('nominations-open', 'Deacon nominations open', 'Art. II.B §3 ¶10',
   'Nomination forms are made available not less than one month before the election, and all nominations are made at least 30 days before the electing business meeting — from the church first, then from the Board. Before nominations and elections the qualifications in Art. II.B §1 and 1 Timothy 3:8–13 are printed and distributed. The clock runs from the church’s business meeting; this is the Board meeting before it.',
   'annual', 'meeting:07', 21, 'deacon-board', 120),
  ('deacon-election', 'Election of deacons', 'Art. II.B §3 ¶¶9–11',
   'At the business meeting preceding the September Deacon Board meeting, deacons are elected to replace those whose terms expire on the last day of September, by an affirmative majority of those voting. Nominations are screened by the pastor and the chairman first. Historically the August business meeting.',
   'annual', 'meeting:08', 21, 'deacon-board', 130),
  ('officer-election', 'Election of Board officers', 'Art. II.B §3 ¶3',
   'The Chairman, Vice-Chairman and Secretary are elected for a one-year term by a simple majority of the Deacon Board prior to the start of the church year (October–September).',
   'annual', 'meeting:09', 14, 'deacon-board', 140),
  ('october-roster-filing', 'Committee roster reported to the church', 'Art. II.B §3',
   'Each committee’s term of service is one year beginning in October. The membership of all committees except the Family Assistance Committee is reported to the church in the regular October business meeting.',
   'annual', 'meeting:10', 21, 'deacon-board', 150)
on conflict (slug) do update set
  title = excluded.title, rule_source = excluded.rule_source, requirement = excluded.requirement,
  cadence = excluded.cadence, anchor = excluded.anchor, notice_days = excluded.notice_days,
  owner_body_slug = excluded.owner_body_slug, position = excluded.position, active = true;
