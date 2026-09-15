-- 0010 — care on the deacon side: pointers, not content.
--
-- mbc-deacons-dashboard-brief.md §2.3, §3.2, §3.3 and §7 Phase 6. The deacon
-- side records that care is happening, who owns it, and when it last
-- happened. It never records the circumstance. Four tables, and not one of
-- them has a notes column — by design, and a test checks the catalogue for
-- one so that a well-meant convenience cannot add it quietly.
--
--   care_assignment   the deacon family ministry plan: a household, the deacon
--                     it is assigned to, the date of last contact. Nothing else.
--   care_request      the staff → deacon handoff. Staff *compose a request* —
--                     household, kind of help, by when, who asked — and a
--                     deacon marks it done with a date. The circumstance that
--                     prompted it never leaves the staff side; there is no
--                     field it could be typed into.
--   care_request_link staff's own thread back to their care entry. A separate
--                     table with a staff-only policy rather than a column on
--                     care_request, so that the deacon side does not merely
--                     avoid selecting the join — it reads zero rows of it.
--   deacon_week       the Deacon of the Week rotation, and
--   deacon_visit      its visit log: household, kind, date, who. No notes.
--
-- Nothing here is deleted. Assignments are made inactive; requests are done.

-- ---------------------------------------------------------------- assignments

create table care_assignment (
  id              uuid primary key default gen_random_uuid(),
  household_label text not null check (length(btrim(household_label)) > 0),
  assigned_to     uuid not null references person (id),
  last_contact_on date,
  active          boolean not null default true,
  created_by      uuid references person (id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table care_assignment is 'Pointers only. No notes column, by design; do not add one.';

create index care_assignment_deacon_idx on care_assignment (assigned_to) where active;

alter table care_assignment enable row level security;

create policy care_assignment_read on care_assignment
  for select using (is_member_of('deacon-board'));

create policy care_assignment_insert on care_assignment
  for insert with check (is_member_of('deacon-board') and created_by = current_person_id());

create policy care_assignment_update on care_assignment
  for update using (is_member_of('deacon-board')) with check (is_member_of('deacon-board'));

-- ---------------------------------------------------------------- the handoff

create type care_help_kind as enum ('visit', 'call', 'meal', 'ride', 'home_repair', 'other');
create type care_request_status as enum ('open', 'accepted', 'done');

create table care_request (
  id              uuid primary key default gen_random_uuid(),
  household_label text not null check (length(btrim(household_label)) > 0),
  help_kind       care_help_kind not null,
  needed_by       date,
  requested_by    uuid not null references person (id),
  assigned_to     uuid references person (id),
  status          care_request_status not null default 'open',
  completed_on    date,
  created_at      timestamptz not null default now(),
  constraint care_request_done_is_dated check (status <> 'done' or completed_on is not null),
  constraint care_request_dated_is_done check (completed_on is null or status = 'done')
);

comment on table care_request is 'A composed request, never a forwarded record. No notes column, by design; do not add one.';

create index care_request_status_idx on care_request (status, created_at);

alter table care_request enable row level security;

-- Both sides read it: the deacons to act, the staff to see the loop close.
create policy care_request_read on care_request
  for select using (is_member_of('deacon-board') or is_staff_role());

-- Only staff compose one, in their own name, open and unassigned.
create policy care_request_insert on care_request
  for insert with check (
    is_staff_role() and requested_by = current_person_id()
    and status = 'open' and assigned_to is null and completed_on is null
  );

create policy care_request_update on care_request
  for update
  using (is_member_of('deacon-board') or (is_staff_role() and requested_by = current_person_id()))
  with check (is_member_of('deacon-board') or (is_staff_role() and requested_by = current_person_id()));

-- Who may change which columns. A deacon takes it up, marks it done, hands it
-- to another deacon; the staff member who asked may correct what was asked
-- while it is still open. Nobody rewrites who asked.
create or replace function guard_care_request() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  on_board boolean := is_member_of('deacon-board');
  asked    boolean := is_staff_role() and old.requested_by = current_person_id();
begin
  if new.requested_by <> old.requested_by or new.created_at <> old.created_at then
    raise exception 'who asked is part of the record' using errcode = 'P0001';
  end if;
  if (new.household_label, new.help_kind, new.needed_by) is distinct from (old.household_label, old.help_kind, old.needed_by) then
    if not asked then raise exception 'only the staff member who asked may change what was asked' using errcode = 'P0001'; end if;
    if old.status <> 'open' then raise exception 'a request a deacon has taken up is not rewritten' using errcode = 'P0001'; end if;
  end if;
  if (new.assigned_to, new.status, new.completed_on) is distinct from (old.assigned_to, old.status, old.completed_on) then
    if not on_board then raise exception 'only the Board acts on a request' using errcode = 'P0001'; end if;
    if old.status = 'done' then raise exception 'a request marked done stays done' using errcode = 'P0001'; end if;
  end if;
  return new;
end;
$$;

create trigger care_request_guard
  before update on care_request
  for each row execute function guard_care_request();

-- The staff member's thread back to their own care entry. Staff-only, in a
-- table of its own: the deacon side reads zero rows, and there is no join to
-- fail to expose.
create table care_request_link (
  care_request_id uuid primary key references care_request (id),
  care_entry_id   uuid not null references care_entry (id) on delete cascade
);

alter table care_request_link enable row level security;

create policy care_request_link_read on care_request_link
  for select using (is_staff_role());

create policy care_request_link_insert on care_request_link
  for insert with check (is_staff_role());

-- ---------------------------------------------------------------- Deacon of the Week

-- A rotation: a week, a man, a backup. The week is named by its Sunday.
-- Readable by anyone signed in — the office needs to know who is on call —
-- and written by the Board.
create table deacon_week (
  id               uuid primary key default gen_random_uuid(),
  week_of          date not null unique check (extract(dow from week_of) = 0),
  person_id        uuid not null references person (id),
  backup_person_id uuid references person (id),
  created_by       uuid references person (id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table deacon_week enable row level security;

create policy deacon_week_read on deacon_week
  for select using (is_signed_in());

create policy deacon_week_insert on deacon_week
  for insert with check (is_member_of('deacon-board') and created_by = current_person_id());

create policy deacon_week_update on deacon_week
  for update using (is_member_of('deacon-board')) with check (is_member_of('deacon-board'));

-- The visit log: that a household was visited or called, on a date, by whom.
create type deacon_visit_kind as enum ('visit', 'call');

create table deacon_visit (
  id              uuid primary key default gen_random_uuid(),
  deacon_week_id  uuid not null references deacon_week (id),
  household_label text not null check (length(btrim(household_label)) > 0),
  kind            deacon_visit_kind not null default 'visit',
  visited_on      date not null default current_date,
  person_id       uuid not null references person (id),
  created_at      timestamptz not null default now()
);

comment on table deacon_visit is 'Pointers only. No notes column, by design; do not add one.';

create index deacon_visit_week_idx on deacon_visit (deacon_week_id, visited_on);

alter table deacon_visit enable row level security;

create policy deacon_visit_read on deacon_visit
  for select using (is_member_of('deacon-board'));

create policy deacon_visit_insert on deacon_visit
  for insert with check (is_member_of('deacon-board') and person_id = current_person_id());

-- No delete policy on any of the five. No update on the link or the log.
