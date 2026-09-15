-- 0018 — the four ministry columns reference the ministry table, by name.
--
-- mbc-dashboard-expansion-brief.md §B.3. cadence_item, event, notice_entry
-- and goal all carry `ministry text`, constrained until now by a hard-coded
-- TypeScript union. This is its own migration, four statements long, because
-- it is the one that can fight the Cadence ledger: if it does, it can be
-- reverted without taking the directory with it.
--
-- The foreign key is on ministry.name, not on an id. Converting four columns
-- to id references is four table rewrites, four repository mappings and four
-- screens' filters, to gain integrity the application does not presently
-- need. 0017 seeds every string already in use, so the constraint holds on
-- the day it is added and no data moves. Renaming a ministry cascades.
--
-- In TypeScript, Ministry becomes string and the list is loaded from the
-- table rather than declared in src/data/seed.ts. The cost is honest: a
-- misspelled ministry is caught by Postgres at write time rather than by the
-- compiler — which is where it matters — and a ministry can be added without
-- a deploy, which is the point.

alter table cadence_item add constraint cadence_item_ministry_fkey
  foreign key (ministry) references ministry (name) on update cascade;

alter table event add constraint event_ministry_fkey
  foreign key (ministry) references ministry (name) on update cascade;

alter table notice_entry add constraint notice_entry_ministry_fkey
  foreign key (ministry) references ministry (name) on update cascade;

alter table goal add constraint goal_ministry_fkey
  foreign key (ministry) references ministry (name) on update cascade;
