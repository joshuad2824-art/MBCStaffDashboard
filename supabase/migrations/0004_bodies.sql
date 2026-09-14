-- Bodies and membership: the access model for two sides of one application.
--
-- Until now the question was "how much access?" — none < limited < staff.
-- That ladder cannot say that the Senior Pastor is staff *and* sits with the
-- deacons, or that the Finance chair is a deacon *and* Treasurer. From here the
-- question is "which bodies do you belong to?", and what a person sees is
-- assembled from the answer. See mbc-deacons-dashboard-brief.md §2.1.
--
-- Two things are deliberately kept from the old model, because dropping them
-- would hand out access nobody meant to grant:
--
--   * `person.access` still decides whether a person may sign in at all
--     ('none' cannot), and inside the staff body it still separates the staff
--     role from a limited account. The staff brief defines `limited` as every
--     staff surface except the pastoral ones, and this brief puts the whole
--     staff roster — limited accounts included — in the `staff` body. A bare
--     is_member_of('staff') would therefore have opened care records to every
--     limited account. is_staff_role() below is membership *and* access, and
--     nothing already written has to change.
--
--   * Nothing here writes through the API. Memberships are administered by
--     one person (decisions on record, §9) and change by SQL until the
--     membership editor lands. The only automatic membership is the one that
--     keeps the People page working: inviting somebody who belongs to no body
--     yet puts them in `staff`, because that page is the staff side inviting a
--     colleague. To seat a deacon, write his memberships first and grant
--     access second — the trigger then adds nothing.
--
-- No new surfaces come with this file. When it is applied the staff dashboard
-- behaves as it did yesterday and the foundation underneath it is different.

-- ---------------------------------------------------------------- bodies

create type body_kind as enum ('staff', 'board', 'committee');

create table body (
  id             uuid primary key default gen_random_uuid(),
  slug           text      not null unique check (slug ~ '^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)?$'),
  kind           body_kind not null,
  name           text      not null,
  parent_body_id uuid references body (id) on delete set null,
  -- A confidential body's room is invisible to non-members like any other,
  -- *and* its membership is left out of any roster published to the church.
  confidential   boolean   not null default false,
  active         boolean   not null default true
);

create type body_role as enum ('chair', 'member', 'ex_officio');

create table membership (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid      not null references person (id) on delete cascade,
  body_id      uuid      not null references body (id) on delete cascade,
  role_in_body body_role not null default 'member',
  term_start   date,
  term_end     date,
  active       boolean   not null default true,
  created_at   timestamptz not null default now(),
  constraint membership_term_in_order check (term_end is null or term_start is null or term_end >= term_start)
);

-- One live seat per person per body. Past terms stay as inactive rows, so a
-- man's memberships can expire without erasing what he wrote or owned.
create unique index membership_one_live_seat on membership (person_id, body_id) where active;
create index membership_person_idx on membership (person_id) where active;
create index membership_body_idx   on membership (body_id)   where active;

-- The bodies at MBC on day one (§2.1). Church standing committees under
-- Article III fit this table later without a schema change.
insert into body (slug, kind, name, confidential) values
  ('staff',                       'staff',     'Staff',                        false),
  ('deacon-board',                'board',     'Deacon Board',                 false),
  ('deacon-body',                 'board',     'Deacon Body',                  false),
  ('committee:finance',           'committee', 'Finance Committee',            false),
  ('committee:personnel',         'committee', 'Personnel Committee',          false),
  ('committee:building-grounds',  'committee', 'Building & Grounds Committee', false),
  ('committee:family-assistance', 'committee', 'Family Assistance Committee',  true);

update body set parent_body_id = (select id from body where slug = 'deacon-board')
 where kind = 'committee';

-- --------------------------------------------------------------- helpers
--
-- security definer, like the helpers in 0002: the lookup itself is not subject
-- to the policies it is used by, which would recurse. A membership counts only
-- while the person can sign in, the body is active, and today is inside the
-- term. current_person_id() already refuses access 'none' and inactive rows.

create or replace function my_bodies() returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select b.slug
    from membership m
    join body b on b.id = m.body_id
   where m.person_id = current_person_id()
     and m.active
     and b.active
     and (m.term_start is null or m.term_start <= current_date)
     and (m.term_end   is null or m.term_end   >= current_date);
$$;

create or replace function is_member_of(body_slug text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from my_bodies() as slug where slug = body_slug);
$$;

create or replace function is_chair_of(body_slug text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from membership m
      join body b on b.id = m.body_id
     where m.person_id = current_person_id()
       and b.slug = body_slug
       and m.role_in_body = 'chair'
       and m.active
       and b.active
       and (m.term_start is null or m.term_start <= current_date)
       and (m.term_end   is null or m.term_end   >= current_date)
  );
$$;

-- The gate 0002 protects care and discussion with, on the new foundation.
-- Membership in the staff body *and* the staff role inside it — see the note
-- at the top of this file for why it is not membership alone.
create or replace function is_staff_role() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_member_of('staff')
     and exists (
       select 1 from person
        where auth_id = auth.uid() and active and access = 'staff'
     );
$$;

grant execute on function my_bodies(), is_member_of(text), is_chair_of(text) to authenticated;

-- --------------------------------------------------------------- policies

alter table body       enable row level security;
alter table membership enable row level security;

-- A body you are not in does not exist to you if it is confidential. The
-- others are readable so a record can say who else is reading it.
create policy body_read on body
  for select using (is_signed_in() and (not confidential or is_member_of(slug)));

-- Your own seats, and the roster of every body you sit in. Nobody else's.
create policy membership_read on membership
  for select using (
    person_id = current_person_id()
    or exists (select 1 from body b where b.id = membership.body_id and is_member_of(b.slug))
  );

-- No insert, update or delete policy on either table: the API cannot seat
-- anyone. Membership changes by SQL, by one administrator, for now.

-- ------------------------------------------------- the staff body, seated

-- Everybody who can sign in today signs in on the staff side. Give each of
-- them their seat, and keep the People page working for whoever is invited
-- next: an active person granted access who belongs to no body yet is staff.
-- Somebody marked inactive gets no seat; their old seats are left as they are.
create or replace function seat_new_account() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.access <> 'none'
     and new.active
     and not exists (select 1 from membership where person_id = new.id)
  then
    insert into membership (person_id, body_id)
    select new.id, id from body where slug = 'staff';
  end if;
  return new;
end;
$$;

create trigger person_seats_new_account
  after insert or update of access on person
  for each row execute function seat_new_account();

insert into membership (person_id, body_id)
select p.id, b.id
  from person p, body b
 where b.slug = 'staff'
   and p.access <> 'none'
   and p.active
   and not exists (select 1 from membership m where m.person_id = p.id);
