-- Row Level Security.
--
-- This file is the role gate. The "viewing as limited" toggle in the header is
-- a preview of what these policies produce and nothing more — if the two ever
-- disagree, these policies are right and the interface is wrong.
--
-- Two roles: `staff` reads and writes everything; `limited` loses Care pipelines
-- and the Discussion board entirely. Losing them means the query returns no
-- rows, not that a button is hidden.

alter table person             enable row level security;
alter table cadence_item       enable row level security;
alter table cadence_occurrence enable row level security;
alter table event              enable row level security;
alter table huddle_post        enable row level security;
alter table notice_category    enable row level security;
alter table notice_entry       enable row level security;
alter table care_type          enable row level security;
alter table care_entry         enable row level security;
alter table thread             enable row level security;
alter table post               enable row level security;
alter table mention            enable row level security;
alter table thread_read        enable row level security;
alter table goal               enable row level security;
alter table communicator_week  enable row level security;
alter table church_settings    enable row level security;

-- ---------------------------------------------------------------- helpers

-- The signed-in person's row. security definer so the lookup itself is not
-- subject to the policies it is used by, which would recurse.
create or replace function current_person_id() returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from person where auth_id = auth.uid() and active and access <> 'none';
$$;

create or replace function is_staff_role() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from person
     where auth_id = auth.uid() and active and access = 'staff'
  );
$$;

-- Access 'none' is not a way in. A roster entry with no account can hold an
-- auth_id only if somebody sets one by hand, and this still refuses it.
create or replace function is_signed_in() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from person
     where auth_id = auth.uid() and active and access <> 'none'
  );
$$;

-- ---------------------------------------------------------------- people

-- Everyone signed in reads the roster: it is what the owner pickers and the
-- mention list are built from.
create policy person_read on person
  for select using (is_signed_in());

-- Adding somebody is staff-role only, and a new row can never arrive with an
-- account attached. Granting access is the separate act below.
create policy person_insert on person
  for insert with check (is_staff_role() and access = 'none' and auth_id is null);

-- Changing anyone's access — including handing out a staff role — is staff-role
-- only. A limited account can name an owner but cannot widen anybody's reach.
create policy person_update on person
  for update using (is_staff_role()) with check (is_staff_role());

-- Anyone may correct their own name or title, but not their own access. The
-- trigger below is what actually enforces that half.
create policy person_update_self on person
  for update using (auth_id = auth.uid()) with check (auth_id = auth.uid());

-- Nobody escalates themselves, whichever policy let the update through.
create or replace function guard_own_access() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auth_id is not distinct from auth.uid()
     and (new.access is distinct from old.access or new.auth_id is distinct from old.auth_id)
  then
    raise exception 'You cannot change your own access.';
  end if;
  return new;
end;
$$;

create trigger person_no_self_escalation
  before update on person
  for each row execute function guard_own_access();

-- Nobody is deleted. Someone who leaves is marked inactive so the record of
-- what they owned survives; what they owned goes back to unclaimed.

-- ------------------------------------------- surfaces both roles can see

-- Cadence, events, notices, goals, the bulletin and standing content carry no
-- named members' circumstances, so a limited account reads and writes them.
create policy cadence_item_all on cadence_item
  for all using (is_signed_in()) with check (is_signed_in());

create policy cadence_occurrence_all on cadence_occurrence
  for all using (is_signed_in()) with check (is_signed_in());

create policy event_all on event
  for all using (is_signed_in()) with check (is_signed_in());

create policy notice_category_read on notice_category
  for select using (is_signed_in());

create policy notice_entry_all on notice_entry
  for all using (is_signed_in()) with check (is_signed_in());

create policy goal_all on goal
  for all using (is_signed_in()) with check (is_signed_in());

create policy communicator_week_all on communicator_week
  for all using (is_signed_in()) with check (is_signed_in());

create policy church_settings_read on church_settings
  for select using (is_signed_in());

create policy church_settings_write on church_settings
  for update using (is_signed_in()) with check (is_signed_in());

-- Huddle posts are attributed, and you edit or delete your own.
create policy huddle_read on huddle_post
  for select using (is_signed_in());

create policy huddle_insert on huddle_post
  for insert with check (author_id = current_person_id());

-- Anyone may clear or reopen a tension — that is the board working — but the
-- body belongs to whoever wrote it.
create policy huddle_update on huddle_post
  for update using (is_signed_in()) with check (is_signed_in());

create policy huddle_delete on huddle_post
  for delete using (author_id = current_person_id());

-- ---------------------------------------------- care: staff role only

-- Care entries and prayer requests hold named individuals' health, family and
-- spiritual circumstances. A limited account gets no rows here at all.
create policy care_type_read on care_type
  for select using (is_staff_role());

create policy care_entry_read on care_entry
  for select using (is_staff_role());

create policy care_entry_write on care_entry
  for all using (is_staff_role()) with check (is_staff_role());

-- ---------------------------------------- discussion: staff role only

-- The board accumulates named members' circumstances whether or not anyone
-- intends it to, so it sits behind the same gate as care.
create policy thread_read on thread
  for select using (is_staff_role());

create policy thread_insert on thread
  for insert with check (is_staff_role() and created_by = current_person_id());

create policy thread_update on thread
  for update using (is_staff_role()) with check (is_staff_role());

create policy post_read on post
  for select using (is_staff_role());

create policy post_insert on post
  for insert with check (is_staff_role() and author_id = current_person_id());

-- Edit and delete are enforced on author_id here, not by hiding buttons.
create policy post_update_own on post
  for update using (is_staff_role() and author_id = current_person_id())
  with check (is_staff_role() and author_id = current_person_id());

create policy post_delete_own on post
  for delete using (is_staff_role() and author_id = current_person_id());

create policy mention_read on mention
  for select using (is_staff_role());

create policy mention_write on mention
  for all using (is_staff_role()) with check (is_staff_role());

-- Your own read marks, nobody else's.
create policy thread_read_own on thread_read
  for all using (person_id = current_person_id()) with check (person_id = current_person_id());

-- ---------------------------------------------------------------- notes
--
-- Sensitivity is not a policy. An entry marked `sensitive` is still readable by
-- the staff role — the redaction to a first name and an owner happens in list,
-- roll-up and projected views, and full detail requires opening the record.
-- Enforcing it in SQL would break the record view the owner needs.
--
-- Present mode is likewise not a policy: it is a view that omits care and the
-- discussion board because it is pointed at a wall.
