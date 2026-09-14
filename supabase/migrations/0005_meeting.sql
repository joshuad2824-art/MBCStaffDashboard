-- The meeting: the spine of the deacon year.
--
-- The bylaws organise the office around one recurring event — the Board "will
-- convene monthly" (Art. II.B §3 ¶5) — and so does this side of the dashboard.
-- One board_meeting per month, in three phases: the agenda assembles before it,
-- attendance and motions are captured during it, and afterwards the secretary
-- writes only what is narrative. mbc-deacons-dashboard-brief.md §1, §3.2, §7.
--
-- Two rules from the brief shape this file more than anything else:
--
--   * Attendance flags, never removes. Art. II.B §3 ¶12 makes failure to attend
--     three-fourths of meetings "without just cause" an automatic removal, so a
--     system that counts attendance is computing something consequential. The
--     count lives in board_attendance_summary(), which returns rows only to the
--     chairman, and nothing anywhere acts on it. "Just cause" is free text a
--     person writes; there is no boolean for it.
--
--   * Nothing on the deacon side is deleted. No table here has a delete policy.
--     An agenda item added by mistake is marked removed and kept; a motion
--     recorded by mistake is withdrawn. Records keep.
--
-- The secretary's narrative, publication and versions arrive with the report
-- builders (Phase 3, report_version). This file records what happened.

-- ------------------------------------------------------------- settings

-- Attendance is counted per deacon year, and the manual does not say which
-- month that year begins. A setting, so the Board can say so without a
-- migration. 1 is the calendar year.
alter table church_settings
  add column deacon_year_start_month integer not null default 1
    check (deacon_year_start_month between 1 and 12);

-- -------------------------------------------------------------- meetings

create type meeting_kind    as enum ('regular', 'special');
create type meeting_status  as enum ('planned', 'in_session', 'held', 'cancelled');
create type minutes_status  as enum ('none', 'draft', 'approved');

create table board_meeting (
  id               uuid primary key default gen_random_uuid(),
  meets_on         date           not null,
  time_label       text           not null default '7:00 PM',
  location         text           not null default 'fellowship hall',
  kind             meeting_kind   not null default 'regular',
  status           meeting_status not null default 'planned',
  -- A timestamp and a person, not a boolean: who locked it and when is part
  -- of the record.
  agenda_locked_at timestamptz,
  agenda_locked_by uuid references person (id) on delete set null,
  minutes_status   minutes_status not null default 'none',
  approved_at      timestamptz,
  created_by       uuid references person (id) on delete set null,
  created_at       timestamptz    not null default now()
);

-- One regular meeting per date. Special meetings may share a date with it.
create unique index board_meeting_one_regular_per_day on board_meeting (meets_on) where kind = 'regular';
create index board_meeting_meets_on_idx on board_meeting (meets_on desc);

create type agenda_source as enum ('recurring', 'report', 'old_business', 'new_business', 'manual');

create table agenda_item (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid          not null references board_meeting (id) on delete cascade,
  position   integer       not null default 0,
  title      text          not null check (length(btrim(title)) > 0),
  source     agenda_source not null default 'manual',
  -- What the item points at: a rule citation, a report id, a motion id.
  source_ref text          not null default '',
  notes      text          not null default '',
  -- Removed, not deleted. Hidden from the agenda; still in the record.
  removed_at timestamptz,
  created_by uuid references person (id) on delete set null,
  created_at timestamptz   not null default now()
);

create index agenda_item_meeting_idx on agenda_item (meeting_id, position);

create type attendance_status as enum ('present', 'absent', 'excused');

create table meeting_attendance (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid              not null references board_meeting (id) on delete cascade,
  person_id       uuid              not null references person (id) on delete cascade,
  status          attendance_status not null,
  -- A note written by a person, in his own words. Optional. Never a checkbox.
  just_cause_note text              not null default '',
  recorded_by     uuid references person (id) on delete set null,
  recorded_at     timestamptz       not null default now(),
  unique (meeting_id, person_id)
);

create type motion_disposition as enum ('approved', 'tabled', 'withdrawn', 'failed');

create table motion (
  id                   uuid primary key default gen_random_uuid(),
  meeting_id           uuid               not null references board_meeting (id) on delete cascade,
  position             integer            not null default 0,
  text                 text               not null check (length(btrim(text)) > 0),
  moved_by             uuid references person (id) on delete set null,
  seconded_by          uuid references person (id) on delete set null,
  disposition          motion_disposition not null,
  -- Set when a tabled motion is taken up again. Until then it rolls forward
  -- as old business on every following agenda.
  tabled_to_meeting_id uuid references board_meeting (id) on delete set null,
  vote_for             integer check (vote_for     is null or vote_for     >= 0),
  vote_against         integer check (vote_against is null or vote_against >= 0),
  -- Where a motion amends the bylaws, the sentence before and after — not the
  -- paragraph number. A ledger that quotes the sentence cannot drift the way
  -- a ledger that cites a location does (DISCREPANCY-DOCKET.md, 8 and 9).
  bylaw_reference      text               not null default '',
  text_before          text               not null default '',
  text_after           text               not null default '',
  recorded_by          uuid references person (id) on delete set null,
  recorded_at          timestamptz        not null default now(),
  constraint motion_amendment_quotes_both check (
    bylaw_reference = '' or (text_before <> '' and text_after <> '')
  )
);

create index motion_meeting_idx on motion (meeting_id, position);
create index motion_tabled_idx  on motion (disposition, tabled_to_meeting_id) where disposition = 'tabled';

-- --------------------------------------------------------------- helpers

-- Which bodies, and in what role. The client assembles the nav from the
-- slugs and draws the chairman's panel from the role; the policies use
-- neither, they ask is_member_of() and is_chair_of() directly.
create or replace function my_seats() returns table (slug text, role_in_body text)
language sql
stable
security definer
set search_path = public
as $$
  select b.slug, m.role_in_body::text
    from membership m
    join body b on b.id = m.body_id
   where m.person_id = current_person_id()
     and m.active
     and b.active
     and (m.term_start is null or m.term_start <= current_date)
     and (m.term_end   is null or m.term_end   >= current_date)
   order by b.slug;
$$;

grant execute on function my_seats() to authenticated;

-- The deacon year containing a date.
create or replace function deacon_year_bounds(on_date date, out year_start date, out year_end date)
language sql
stable
security definer
set search_path = public
as $$
  select s, (s + interval '1 year' - interval '1 day')::date
    from (
      select case
               when extract(month from on_date) >= cs.deacon_year_start_month
                 then make_date(extract(year from on_date)::int, cs.deacon_year_start_month, 1)
               else make_date(extract(year from on_date)::int - 1, cs.deacon_year_start_month, 1)
             end as s
        from church_settings cs
       where cs.id
    ) bounds;
$$;

-- The count, and the threshold. Nothing else.
--
-- Per Board member, over the regular meetings of the deacon year containing
-- `on_date` whose roll has been called: how many were held, and how many he
-- was present, absent and excused for. Returns no rows to anyone who is not
-- the chairman of the Board. It never changes a status, and nothing calls it
-- but the chairman's screen.
create or replace function board_attendance_summary(on_date date)
returns table (
  person_id     uuid,
  name          text,
  meetings_held integer,
  present       integer,
  absent        integer,
  excused       integer
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (select * from deacon_year_bounds(on_date)),
  held as (
    select bm.id
      from board_meeting bm, bounds
     where bm.kind = 'regular'
       and bm.status in ('in_session', 'held')
       and bm.meets_on between bounds.year_start and bounds.year_end
  ),
  roll as (
    select m.person_id, p.name
      from membership m
      join body b on b.id = m.body_id
      join person p on p.id = m.person_id
     where b.slug = 'deacon-board'
       and m.active and b.active and p.active
       and (m.term_start is null or m.term_start <= current_date)
       and (m.term_end   is null or m.term_end   >= current_date)
  )
  select roll.person_id,
         roll.name,
         (select count(*) from held)::int,
         (select count(*) from meeting_attendance a where a.person_id = roll.person_id and a.meeting_id in (select id from held) and a.status = 'present')::int,
         (select count(*) from meeting_attendance a where a.person_id = roll.person_id and a.meeting_id in (select id from held) and a.status = 'absent')::int,
         (select count(*) from meeting_attendance a where a.person_id = roll.person_id and a.meeting_id in (select id from held) and a.status = 'excused')::int
    from roll
   where is_chair_of('deacon-board')
   order by roll.name;
$$;

grant execute on function board_attendance_summary(date) to authenticated;

-- -------------------------------------------------------------- policies
--
-- The Board's room. A member reads all of it and writes to it under his own
-- name. Nobody else — staff included, unless seated ex officio — gets a row.
-- No delete policy on any table: nothing here is deleted.

alter table board_meeting      enable row level security;
alter table agenda_item        enable row level security;
alter table meeting_attendance enable row level security;
alter table motion             enable row level security;

create policy board_meeting_read on board_meeting
  for select using (is_member_of('deacon-board'));
create policy board_meeting_insert on board_meeting
  for insert with check (is_member_of('deacon-board') and created_by = current_person_id());
create policy board_meeting_update on board_meeting
  for update using (is_member_of('deacon-board')) with check (is_member_of('deacon-board'));

create policy agenda_item_read on agenda_item
  for select using (is_member_of('deacon-board'));
create policy agenda_item_insert on agenda_item
  for insert with check (is_member_of('deacon-board') and created_by = current_person_id());
create policy agenda_item_update on agenda_item
  for update using (is_member_of('deacon-board')) with check (is_member_of('deacon-board'));

create policy meeting_attendance_read on meeting_attendance
  for select using (is_member_of('deacon-board'));
create policy meeting_attendance_insert on meeting_attendance
  for insert with check (is_member_of('deacon-board') and recorded_by = current_person_id());
create policy meeting_attendance_update on meeting_attendance
  for update using (is_member_of('deacon-board')) with check (is_member_of('deacon-board'));

create policy motion_read on motion
  for select using (is_member_of('deacon-board'));
create policy motion_insert on motion
  for insert with check (is_member_of('deacon-board') and recorded_by = current_person_id());
create policy motion_update on motion
  for update using (is_member_of('deacon-board')) with check (is_member_of('deacon-board'));
