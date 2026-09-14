-- Reports, second pass, and no attendance tracker.
--
-- Three things the Board settled after seeing Phase 3:
--
--   * There is no attendance tracker. The three-fourths count, the chairman's
--     panel, the excused state and the just-cause note are gone. The roll is
--     called so the minutes can say who was present and who was not, which
--     is all the Board's minutes have ever said. board_attendance_summary()
--     is dropped; nothing computes a count against Art. II.B §3 ¶12.
--
--   * A report may be uploaded as a file instead of built. Whoever puts a
--     report together their traditional way — a spreadsheet, a PDF — files
--     it, or someone on the Board files it for them. An uploaded report moves
--     through the same four states, and each new file is a new version.
--     Files live in the `reports` storage bucket, under the report's id, and
--     the bucket's policies ask the same two questions the table's do.
--
--   * Who may write: the committee's chair, as before; any Board member for
--     the minutes; and any Board member may create a report for a committee
--     on its behalf and keep writing the one he created. Nobody edits what
--     another man created unless he chairs the committee it belongs to.

-- ------------------------------------------------- no attendance tracker

drop function if exists board_attendance_summary(date);
drop function if exists deacon_year_bounds(date);

alter table meeting_attendance drop column just_cause_note;

-- The enum keeps its third value; nothing writes it any more.
comment on type attendance_status is 'present or absent. excused is unused since 0007: there is no attendance tracker.';

-- --------------------------------------------------------- uploaded files

alter table report
  add column file_path text,
  add column file_name text,
  add column file_type text;

alter table report_version
  add column file_path text,
  add column file_name text,
  add column file_type text;

-- ------------------------------------------------------------ who writes

drop policy report_insert on report;
drop policy report_update on report;
drop policy report_version_insert on report_version;
drop function can_write_report(report_kind, uuid);

create or replace function can_write_report(report_kind report_kind, report_body_id uuid, report_created_by uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
           when report_kind = 'minutes' then is_member_of('deacon-board')
           else exists (select 1 from body b where b.id = report_body_id and is_chair_of(b.slug))
             or (is_member_of('deacon-board') and report_created_by is not distinct from current_person_id() and report_created_by is not null)
         end;
$$;

grant execute on function can_write_report(report_kind, uuid, uuid) to authenticated;

create policy report_insert on report
  for insert with check (created_by = current_person_id() and can_write_report(kind, body_id, created_by));
create policy report_update on report
  for update using (can_write_report(kind, body_id, created_by)) with check (can_write_report(kind, body_id, created_by));

create policy report_version_insert on report_version
  for insert with check (
    created_by = current_person_id()
    and exists (select 1 from report r where r.id = report_id and can_write_report(r.kind, r.body_id, r.created_by))
  );

-- ------------------------------------------------------- the file bucket
--
-- Objects are named <report id>/<version>-<file name>. The first folder is
-- the report, and the policies ask the report's own questions of it.

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

create or replace function report_of_object(object_name text) returns report
language sql
stable
security definer
set search_path = public
as $$
  select r.* from report r where r.id::text = (storage.foldername(object_name))[1];
$$;

create policy reports_bucket_read on storage.objects
  for select using (
    bucket_id = 'reports'
    and (select can_read_report(r.body_id, r.status) from report_of_object(name) r)
  );

create policy reports_bucket_write on storage.objects
  for insert with check (
    bucket_id = 'reports'
    and (select can_write_report(r.kind, r.body_id, r.created_by) from report_of_object(name) r)
  );

-- No update and no delete on the bucket: a filed file is a record.
