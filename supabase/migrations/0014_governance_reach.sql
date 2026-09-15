-- 0014 — the manual reaches the staff.
--
-- mbc-dashboard-expansion-brief.md (PR 1 of the kickoff). A staff member who
-- is not a deacon can read the parts of the manual that concern him: the
-- building-use policy he administers, the procedures he follows. *Which*
-- parts is a decision made in the corpus, file by file, in front matter —
-- never here, and never by default.
--
-- The reference gains an audience on the pattern 0008 set for `event` and
-- `thread`: body slugs, never empty, every slug naming a body, and the one
-- policy shape — in_audience(audience) — deciding who reads it. The docket
-- does not: governance_finding stays deacon-only, because a finding says
-- where the manual disagrees with itself and that is the Board's business.
--
-- The default is the deacon side as it stands today, not `{staff,deacon}`.
-- Defaulting the other way would publish the entire manual to the staff in
-- one statement that nobody reviews. This way the surface is empty for the
-- staff on the day this applies and fills as the corpus is re-loaded with
-- audiences marked. That is the intended behaviour, not a bug.
--
-- Why six slugs and not one: there is no body named `deacon`. The deacon side
-- is the Deacon Board, the Deacon Body and the four standing committees, and
-- in_audience() overlaps body slugs with my_bodies() and nothing else. So the
-- default names all six, and the loader expands the word `deacon` in a file's
-- front matter to the same six. A committee chair who sits on no other body
-- reads the manual today (policies.sql §10 proves it) and keeps reading it.
--
-- Still no write policy, on either table. The column is set by the loader and
-- by SQL.

alter table governance_document
  add column audience text[] not null
    default '{deacon-board,deacon-body,committee:finance,committee:personnel,committee:building-grounds,committee:family-assistance}',
  add constraint governance_document_audience_not_empty check (cardinality(audience) > 0);

comment on column governance_document.audience is
  'Body slugs the document is addressed to. Set by supabase/governance/build-seed.mjs from a file''s front matter; never through the API.';

-- Every slug in an audience names a body: 0008's trigger, on 0009's table.
create trigger governance_document_audience_names_bodies
  before insert or update of audience on governance_document
  for each row execute function check_audience();

-- The read policy, reimplemented on the audience. The docket's is untouched.
drop policy governance_document_read on governance_document;

create policy governance_document_read on governance_document
  for select using (in_audience(audience));
