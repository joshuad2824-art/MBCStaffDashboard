-- 0017 — ministries, classes and groups: who serves, never who attends.
--
-- mbc-dashboard-expansion-brief.md §B. The ministries of the church, the
-- groups inside them — Sunday school classes, community groups, ministry
-- teams — and who serves in each one, in what role, since when. Editable by
-- the staff, from the application.
--
-- It is not a directory of members and it is not Breeze. A group record says
-- this class meets here at this hour and these adults lead it; it never says
-- who sits in the chairs. There is no attendee, roster, enrolment or member
-- column on any table here, no table for one, and policies.sql checks the
-- catalogue for one. The audience note is free text on purpose: "Grades 7–12"
-- describes a group, it does not list children.
--
-- Nothing is deleted. A teacher who stepped down in March is a fact about
-- last spring, so an assignment ends with a date and a group ends with a
-- date, and no table here has a delete policy. Roles are enumerated, because
-- free-text roles become eleven spellings of "volunteer" inside a year.
--
-- Reach: the whole staff body reads — a limited account may read the
-- directory, which is the point of having one — and the staff role writes.
-- Nothing here is on the deacon side in v1.
--
-- Also riding along, per brief §C.5: person.admin, which decides who is
-- offered the view-as control and gates nothing in the database.

-- ---------------------------------------------------------------- ministry

create table ministry (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z][a-z0-9-]*$'),
  name        text not null unique check (length(btrim(name)) > 0),
  description text not null default '',
  position    integer not null default 0,
  active      boolean not null default true,
  -- Listed in the directory. `All` and `All groups` are values the ledger,
  -- the calendar, the notice log and the goals already carry — church-wide,
  -- not a ministry — and 0018's foreign key needs them to exist here. The
  -- directory does not draw them, and the filters treat them as they did.
  directory   boolean not null default true
);

comment on table ministry is 'The ministries of the church. cadence_item, event, notice_entry and goal reference ministry.name (0018), so a ministry can be added without a deploy.';

-- The strings already in use, so 0018's constraint holds on the day it is
-- added and no data moves; then the five the directory was designed around.
insert into ministry (slug, name, description, position, directory) values
  ('all',        'All',        'Church-wide. Not a ministry: the value a commitment, an event or a notice carries when it belongs to everyone.', 0, false),
  ('all-groups', 'All groups', 'Every group at once. Not a ministry: the value a commitment carries when it applies across them.', 1, false),
  ('adults',     'Adults',     'The Sunday classes, and the community groups that meet in homes and set their own year.', 10, true),
  ('students',   'Students',   'Seventh through twelfth grade.', 20, true),
  ('children',   'Children',   'First through sixth grade.', 30, true),
  ('preschool',  'Preschool',  'Birth through four.', 40, true),
  ('music',      'Music',      'The worship team and the choirs.', 50, true),
  ('men',        'Men',        '', 60, true),
  ('women',      'Women',      '', 70, true);

-- ------------------------------------------------------------ serving_role

create table serving_role (
  slug     text primary key check (slug ~ '^[a-z][a-z-]*$'),
  name     text not null,
  position integer not null default 0,
  -- A leading role: the one a group is missing when nobody holds it. Which
  -- leading role a group needs depends on its kind (a class a teacher, a
  -- community group a host, a team a coordinator); the client decides that.
  leads    boolean not null default false
);

insert into serving_role (slug, name, position, leads) values
  ('teacher',     'Teacher',     10, true),
  ('co-teacher',  'Co-teacher',  20, true),
  ('apprentice',  'Apprentice',  30, false),
  ('leader',      'Leader',      40, true),
  ('co-leader',   'Co-leader',   50, true),
  ('host',        'Host',        60, true),
  ('volunteer',   'Volunteer',   70, false),
  ('coordinator', 'Coordinator', 80, true);

-- ----------------------------------------------------------- serving_group

create table serving_group (
  id            uuid primary key default gen_random_uuid(),
  ministry_id   uuid not null references ministry (id),
  kind          text not null check (kind in ('class', 'community-group', 'team')),
  name          text not null check (length(btrim(name)) > 0),
  -- A sentence, not a schedule engine: 'Sundays 10:00 AM'.
  meets         text not null default '',
  location      text not null default '',
  -- Free text, never a roster: 'Grades 5–6'.
  audience_note text not null default '',
  notes         text not null default '',
  started_on    date,
  -- The group ended on this date. Null is a live group. Never deleted.
  ended_on      date,
  created_at    timestamptz not null default now(),
  check (started_on is null or ended_on is null or ended_on >= started_on)
);

comment on table serving_group is 'A class, community group or ministry team: where and when it meets and a note on whom it is for. Never who attends. Ended with a date, never deleted.';

-- ------------------------------------------------------ serving_assignment

create table serving_assignment (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references serving_group (id),
  person_id  uuid not null references person (id),
  role_slug  text not null references serving_role (slug),
  started_on date not null default current_date,
  -- Stepped down on this date. Null is a current assignment. Never deleted.
  ended_on   date,
  -- The one to call.
  is_primary boolean not null default false,
  check (ended_on is null or ended_on >= started_on)
);

comment on table serving_assignment is 'A person serving in a group, in an enumerated role, from a date and until one. Never deleted.';

create index serving_group_ministry on serving_group (ministry_id);
create index serving_assignment_group on serving_assignment (group_id);
create index serving_assignment_person on serving_assignment (person_id);

-- --------------------------------------------------------------- policies

alter table ministry           enable row level security;
alter table serving_role       enable row level security;
alter table serving_group      enable row level security;
alter table serving_assignment enable row level security;

-- The whole staff body reads: the roster, limited accounts included.
create policy ministry_read           on ministry           for select using (is_member_of('staff'));
create policy serving_role_read       on serving_role       for select using (is_member_of('staff'));
create policy serving_group_read      on serving_group      for select using (is_member_of('staff'));
create policy serving_assignment_read on serving_assignment for select using (is_member_of('staff'));

-- The staff role writes. No delete policy on any of the four; the roles are
-- changed by migration and not through the API at all.
create policy ministry_insert on ministry for insert with check (is_staff_role());
create policy ministry_update on ministry for update using (is_staff_role()) with check (is_staff_role());

create policy serving_group_insert on serving_group for insert with check (is_staff_role());
create policy serving_group_update on serving_group for update using (is_staff_role()) with check (is_staff_role());

create policy serving_assignment_insert on serving_assignment for insert with check (is_staff_role());
create policy serving_assignment_update on serving_assignment for update using (is_staff_role()) with check (is_staff_role());

-- ------------------------------------------------------------ person.admin

-- Who is offered view-as (brief §C.2 rule 6): two people. It gates nothing
-- in the database — no policy reads it — and it is set by SQL, by the
-- administrator: the API may read it and may not change it.
alter table person add column admin boolean not null default false;

create or replace function guard_admin_flag() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.admin is distinct from old.admin and auth.uid() is not null then
    raise exception 'The admin flag is set by the administrator, not through the site.';
  end if;
  return new;
end;
$$;

create trigger person_guards_admin_flag
  before update of admin on person
  for each row execute function guard_admin_flag();

-- claim_account() returns it, so the client knows whom to offer the control.
-- The return type changes, so the function is dropped and recreated with the
-- same body and the same grants as 0003.
drop function claim_account();

create function claim_account()
returns table (id uuid, name text, role text, email text, access access_level, admin boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  addr citext;
begin
  if auth.uid() is null then
    return;
  end if;

  addr := nullif(auth.jwt() ->> 'email', '');

  update person p
     set auth_id = auth.uid()
   where p.auth_id is null
     and p.email = addr
     and p.active
     and p.access <> 'none';

  return query
    select p.id, p.name, p.role, p.email::text, p.access, p.admin
      from person p
     where p.auth_id = auth.uid()
       and p.active
       and p.access <> 'none';
end;
$$;

revoke execute on function claim_account() from public;
revoke execute on function claim_account() from anon;
grant execute on function claim_account() to authenticated;
