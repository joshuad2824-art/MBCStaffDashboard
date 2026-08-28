-- Row Level Security.
--
-- This file is the role gate. The "viewing as limited" toggle in the header is
-- a preview of what these policies produce and nothing more — if the two ever
-- disagree, these policies are right and the interface is wrong.
--
-- Two roles: `staff` reads and writes everything; `limited` loses Care pipelines
-- and the Discussion board entirely. Losing them means the query returns no
-- rows, not that a button is hidden.

alter table staff              enable row level security;
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

-- The signed-in staff row. security definer so the lookup itself is not subject
-- to the policies it is used by, which would recurse.
create or replace function current_staff_id() returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from staff where auth_id = auth.uid() and active;
$$;

create or replace function is_staff_role() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff
     where auth_id = auth.uid() and active and role_level = 'staff'
  );
$$;

create or replace function is_signed_in() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from staff where auth_id = auth.uid() and active);
$$;

-- ---------------------------------------------------------------- staff

-- Everyone signed in can see the roster: it is what owner dropdowns and the
-- mention picker are built from. Nobody edits it from the application — adding
-- a row is the invitation, and that happens in the dashboard.
create policy staff_read on staff
  for select using (is_signed_in());

create policy staff_update_self on staff
  for update using (auth_id = auth.uid()) with check (auth_id = auth.uid());

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
  for insert with check (author_id = current_staff_id());

-- Anyone may clear or reopen a tension — that is the board working — but the
-- body belongs to whoever wrote it.
create policy huddle_update on huddle_post
  for update using (is_signed_in()) with check (is_signed_in());

create policy huddle_delete on huddle_post
  for delete using (author_id = current_staff_id());

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
  for insert with check (is_staff_role() and created_by = current_staff_id());

create policy thread_update on thread
  for update using (is_staff_role()) with check (is_staff_role());

create policy post_read on post
  for select using (is_staff_role());

create policy post_insert on post
  for insert with check (is_staff_role() and author_id = current_staff_id());

-- Edit and delete are enforced on author_id here, not by hiding buttons.
create policy post_update_own on post
  for update using (is_staff_role() and author_id = current_staff_id())
  with check (is_staff_role() and author_id = current_staff_id());

create policy post_delete_own on post
  for delete using (is_staff_role() and author_id = current_staff_id());

create policy mention_read on mention
  for select using (is_staff_role());

create policy mention_write on mention
  for all using (is_staff_role()) with check (is_staff_role());

-- Your own read marks, nobody else's.
create policy thread_read_own on thread_read
  for all using (staff_id = current_staff_id()) with check (staff_id = current_staff_id());

-- ---------------------------------------------------------------- notes
--
-- Sensitivity is not a policy. An entry marked `sensitive` is still readable by
-- the staff role — the redaction to a first name and an owner happens in list,
-- roll-up and projected views, and full detail requires opening the record.
-- Enforcing it in SQL would break the record view the owner needs.
--
-- Present mode is likewise not a policy: it is a view that omits care and the
-- discussion board because it is pointed at a wall.
