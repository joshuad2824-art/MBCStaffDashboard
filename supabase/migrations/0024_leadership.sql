-- 0024 — leadership: the deacons and their offices; the church's committees.
--
-- mbc-dashboard-home-brief.md §6. One page, two sections: the deacons serving
-- this year, officers first with their offices, then the rest of the board;
-- and the church's committees, each with its chair, members and terms.
--
-- It reuses the serving directory (0017) rather than starting a parallel
-- table: a board and a committee are groups, an office is a role, and a term
-- is an assignment's started_on and ended_on. The September turnover is dates
-- entered, not rows destroyed, so "who chaired Finance last year" stays
-- answerable. Everything 0017 says still holds: groups hold who serves, never
-- who attends; the whole staff body reads; the staff role writes; nobody
-- deletes; roles change by migration only.
--
-- This is a directory, not access control. `body` and `membership` decide who
-- may read what; this says who serves. Nothing here reads or writes membership,
-- and nothing should be derived from one into the other. They will sometimes
-- disagree for a week in September, and that is fine.

-- A board and a committee become kinds of group. The check 0017 put inline
-- carries the name Postgres gave it.
alter table serving_group drop constraint serving_group_kind_check;
alter table serving_group add constraint serving_group_kind_check
  check (kind in ('class', 'community-group', 'team', 'board', 'committee'));

-- The offices. Chairman leads (a board or committee with nobody in the chair
-- has a gap, as a class with no teacher does); the deacon officers' titles are
-- roles of their own so the board lists them by office.
insert into serving_role (slug, name, position, leads) values
  ('chairman',         'Chairman',           100, true),
  ('vice-chairman',    'Vice-Chairman',      110, false),
  ('secretary',        'Secretary',          120, false),
  ('finance',          'Finance',            130, false),
  ('building-grounds', 'Building & Grounds', 140, false),
  ('personnel',        'Personnel',          150, false),
  ('member',           'Member',             160, false),
  ('ex-officio',       'Ex officio',         170, false);

-- The parent of the board and the committees. Not a ministry in the
-- directory's sense, so the Ministries index leaves it out (directory = false).
insert into ministry (slug, name, description, position, directory) values
  ('leadership', 'Church leadership', 'The Deacon Board and the church''s committees: who serves in each, in what office, for what term.', 100, false);

-- The board itself, so the page has somewhere to start. Its members are the
-- staff's to name, from the page.
insert into serving_group (ministry_id, kind, name, audience_note)
  select id, 'board', 'Deacon Board', ''
    from ministry where slug = 'leadership';
