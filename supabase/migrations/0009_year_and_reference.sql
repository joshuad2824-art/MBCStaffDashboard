-- 0009 — the year and the reference.
--
-- mbc-deacons-dashboard-brief.md §3.3 ("The year", "Governance reference") and
-- §7 Phase 5. Two things the bylaws create that the dashboard has so far only
-- hinted at: the dated obligations of the deacon year, and the text those
-- obligations come from.
--
-- The year. Every dated obligation the bylaws and policies create, seeded
-- from the governance corpus. What is stored is the rule: its source, its
-- cadence and its anchor. What is *derived* — next due, announce by, due
-- soon, which meeting it lands on — is never stored, exactly as the cadence
-- ledger on the staff side works. Editing an anchor moves everything that
-- depends on it, because nothing depends on a stored copy.
--
-- The reference. The transcribed bylaws and policies, and the discrepancy
-- docket that says where the manual disagrees with itself. Already built and
-- verified as a corpus of documents; this migration gives it a home the
-- policies can gate. It lives in the database, not in the application bundle,
-- so that "the Board can read it" is a policy and not an accident of hosting.
--
-- None of these three tables has a write policy. They are governance content
-- and are written by the administrator, by SQL: the obligations here, and the
-- corpus by the loader in supabase/governance/. A deacon reads them; nobody
-- edits the bylaws from a form.

-- ---------------------------------------------------------------- obligation

create table obligation (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z][a-z0-9-]*$'),
  title           text not null,
  -- The citation. "Art. II.C ¶2", "A009 §3". Never a paraphrase of the rule.
  rule_source     text not null,
  -- What the rule requires, in a sentence, as the corpus puts it.
  requirement     text not null default '',
  -- monthly: at every regular monthly meeting. annual: once a deacon year.
  cadence         text not null check (cadence in ('monthly', 'annual')),
  -- Where in the year it falls:
  --   'meeting'     every regular monthly meeting (cadence monthly)
  --   'meeting:MM'  the regular monthly meeting in month MM
  --   'MM-DD'       a fixed date
  anchor          text not null check (anchor ~ '^(meeting|meeting:(0[1-9]|1[0-2])|(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))$'),
  -- How far ahead it should be on somebody's mind. Announce-by is derived.
  notice_days     integer not null default 0 check (notice_days >= 0),
  owner_body_slug text not null references body (slug),
  active          boolean not null default true,
  position        integer not null default 0
);

comment on table obligation is 'A dated obligation the bylaws or policies create. next_due, announce_by and due_soon are derived, never stored.';

alter table obligation enable row level security;

create policy obligation_read on obligation
  for select using (is_on_deacon_side());

-- Seeded from the corpus (brief §3.3). Where the brief names an obligation
-- but the anchor could not be read from the manual at the time of writing,
-- the row is anchored to the regular meeting of the month the brief gives and
-- the requirement says so, so that a man reading the year sees exactly what
-- is settled and what is not. Correcting an anchor is one UPDATE.
insert into obligation (slug, title, rule_source, requirement, cadence, anchor, notice_days, owner_body_slug, position) values
  ('treasurer-monthly-report', 'Treasurer’s itemised report', 'Art. II.C ¶2',
   'An itemized report of receipts and disbursements for the preceding month, at each regular monthly meeting.',
   'monthly', 'meeting', 7, 'committee:finance', 10),
  ('committee-reports', 'Committee reports to the Board', 'Art. II.B §3',
   'Each standing committee reports at the regular monthly meeting; the reports are appended to the minutes.',
   'monthly', 'meeting', 7, 'deacon-board', 20),
  ('nominations-open', 'Nominations for the Board open', 'Art. II.B §2',
   'The July nomination clocks: nominations for the coming deacon year are received at the July meeting.',
   'annual', 'meeting:07', 21, 'deacon-board', 30),
  ('deacon-election', 'Election of deacons', 'Art. II.B §2',
   'The church elects deacons in August for terms beginning with the new deacon year.',
   'annual', 'meeting:08', 21, 'deacon-board', 40),
  ('officer-election', 'Election of Board officers', 'Art. II.B §3',
   'The Board elects its chairman, vice-chairman and secretary at the September meeting.',
   'annual', 'meeting:09', 14, 'deacon-board', 50),
  ('october-roster-filing', 'October filing — the committee roster to the church', 'Art. II.B §3',
   'The committee assignments for the year are published to the church in October. Family Assistance membership is excluded.',
   'annual', '10-01', 21, 'deacon-board', 60),
  ('budget-calendar-start', 'Budget calendar opens', 'A009',
   'The first of the A009 budget calendar’s five dates: committees begin the next year’s requests.',
   'annual', '10-10', 14, 'committee:finance', 70),
  ('treasurer-annual-report', 'Treasurer’s annual report and audit', 'Art. II.C',
   'The annual report of the year’s receipts and disbursements, and the audit window that follows it. The month is taken from the corpus when it is loaded; until then it is anchored to the January meeting.',
   'annual', 'meeting:01', 30, 'committee:finance', 80);

-- ---------------------------------------------------------------- the reference

create table governance_document (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  kind       text not null check (kind in ('bylaws', 'policy', 'procedure')),
  -- "Art. II", "A009", "D002": the code the corpus files the document under.
  code       text not null default '',
  title      text not null check (length(btrim(title)) > 0),
  -- Markdown, as transcribed. The reference renders it; nothing edits it here.
  body       text not null default '',
  position   integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table governance_document is 'The transcribed bylaws, policies and procedures. Loaded by supabase/governance/build-seed.mjs; never edited through the API.';

-- The discrepancy docket: where the manual disagrees with itself, numbered,
-- with what each finding cites. Findings 8 and 9 are why motions quote the
-- text before and after (brief §3.2).
create table governance_finding (
  id       uuid primary key default gen_random_uuid(),
  number   integer not null unique check (number > 0),
  title    text not null check (length(btrim(title)) > 0),
  body     text not null default '',
  -- Citations, as the docket writes them: "Art. II.B §3 ¶12", "A009 §4".
  cites    text[] not null default '{}',
  status   text not null default 'open' check (status in ('open', 'resolved'))
);

alter table governance_document enable row level security;
alter table governance_finding  enable row level security;

create policy governance_document_read on governance_document
  for select using (is_on_deacon_side());

create policy governance_finding_read on governance_finding
  for select using (is_on_deacon_side());
