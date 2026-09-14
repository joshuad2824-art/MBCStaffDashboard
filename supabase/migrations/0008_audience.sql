-- 0008 — shared surfaces: one record, two audiences.
--
-- mbc-deacons-dashboard-brief.md §3.1. The point of one application is that a
-- shared surface is literally the same row, not two copies kept in sync. Every
-- shareable record carries an audience — body slugs — and one policy shape
-- decides who reads it:
--
--     using (audience && array(select my_bodies()))
--
-- This migration gives that audience to `event` and `thread`, adds
-- `announcement`, and rewrites their policies on top of it.
--
-- Three things to hold on to:
--
--   * Audience is never empty. An empty array is refused by a check, and a slug
--     that names no body is refused by a trigger. A record with no audience is
--     a bug, not a private record.
--
--   * Writing is by overlap too. You may address a record to a room you are
--     in, and you may widen it to another room, but you may not narrow it to a
--     room you are not in — you would lose your own record. Nothing here lets
--     a person reach a room they do not sit in.
--
--   * The staff discussion keeps its gate. `is_staff_role()` is membership in
--     `staff` *and* `access = 'staff'`; a limited account sits in the staff body
--     but has never been able to read the board, because the board accumulates
--     named members' circumstances. So for discussion the `staff` slug means the
--     staff role, not the staff roster. Events and announcements carry no
--     circumstances and stay open to the whole roster, as they were.
--
-- The calendar's draft state comes free from the audience model. A staff
-- working draft is `audience = {staff}` and `published_at = null`; publishing
-- widens the audience and stamps the date. Deacons see it when it is ready and
-- not before, and there is no second calendar.

-- ---------------------------------------------------------------- helpers

-- Whether any of the audience's slugs is a body the signed-in person sits in.
create or replace function in_audience(target text[]) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(target && array(select my_bodies()), false);
$$;

-- The same, with the discussion's twist: `staff` means the staff role.
create or replace function in_discussion_audience(target text[]) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from unnest(coalesce(target, '{}'::text[])) as a (slug)
     where case when a.slug = 'staff' then is_staff_role() else is_member_of(a.slug) end
  );
$$;

-- Every slug in an audience names a body. Enforced on write, not by a foreign
-- key, because an array column cannot carry one.
create or replace function check_audience() returns trigger
language plpgsql
as $$
declare
  unknown text;
begin
  select a.slug into unknown
    from unnest(new.audience) as a (slug)
   where not exists (select 1 from body b where b.slug = a.slug)
   limit 1;
  if unknown is not null then
    raise exception 'audience names no body: %', unknown using errcode = 'P0001';
  end if;
  return new;
end;
$$;

grant execute on function in_audience(text[]), in_discussion_audience(text[]) to authenticated;

-- ---------------------------------------------------------------- event

-- The old `audience` was a free-text label nothing read. The array replaces it.
alter table event drop column audience;
alter table event drop column public;
alter table event
  add column audience     text[] not null default '{staff}',
  add column published_at timestamptz;

alter table event
  add constraint event_audience_not_empty check (cardinality(audience) > 0),
  add constraint event_published_reaches_beyond_staff
    check (published_at is null or audience <> '{staff}'::text[]);

create trigger event_audience_names_bodies
  before insert or update of audience on event
  for each row execute function check_audience();

create index event_audience_idx on event using gin (audience);

drop policy event_all on event;

create policy event_read on event
  for select using (in_audience(audience));

create policy event_insert on event
  for insert with check (in_audience(audience));

create policy event_update on event
  for update using (in_audience(audience)) with check (in_audience(audience));

create policy event_delete on event
  for delete using (in_audience(audience));

-- ---------------------------------------------------------------- thread

alter table thread
  add column audience text[] not null default '{staff}';

alter table thread
  add constraint thread_audience_not_empty check (cardinality(audience) > 0);

create trigger thread_audience_names_bodies
  before insert or update of audience on thread
  for each row execute function check_audience();

create index thread_audience_idx on thread using gin (audience);

-- Posts and mentions answer their thread's question. Security definer so the
-- lookup is not itself filtered by the thread policy.
create or replace function can_read_thread(target uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select in_discussion_audience(t.audience) from thread t where t.id = target), false);
$$;

create or replace function thread_of_post(target uuid) returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select thread_id from post where id = target;
$$;

grant execute on function can_read_thread(uuid), thread_of_post(uuid) to authenticated;

drop policy thread_read   on thread;
drop policy thread_insert on thread;
drop policy thread_update on thread;
drop policy post_read       on post;
drop policy post_insert     on post;
drop policy post_update_own on post;
drop policy post_delete_own on post;
drop policy mention_read  on mention;
drop policy mention_write on mention;

create policy thread_read on thread
  for select using (in_discussion_audience(audience));

create policy thread_insert on thread
  for insert with check (in_discussion_audience(audience) and created_by = current_person_id());

create policy thread_update on thread
  for update using (in_discussion_audience(audience)) with check (in_discussion_audience(audience));

create policy post_read on post
  for select using (can_read_thread(thread_id));

create policy post_insert on post
  for insert with check (can_read_thread(thread_id) and author_id = current_person_id());

-- Edit and delete are enforced on author_id here, not by hiding buttons.
create policy post_update_own on post
  for update using (can_read_thread(thread_id) and author_id = current_person_id())
  with check (can_read_thread(thread_id) and author_id = current_person_id());

create policy post_delete_own on post
  for delete using (can_read_thread(thread_id) and author_id = current_person_id());

create policy mention_read on mention
  for select using (can_read_thread(thread_of_post(post_id)));

create policy mention_write on mention
  for all using (can_read_thread(thread_of_post(post_id)))
  with check (can_read_thread(thread_of_post(post_id)));

-- ---------------------------------------------------------------- announcement

-- Short-lived, audience-scoped, authored by either side. A deacon announcement
-- to staff and a staff announcement to deacons are the same feature. It shows
-- until `expires_on` and is purged fourteen days after that, like the board.
create table announcement (
  id         uuid        primary key default gen_random_uuid(),
  body       text        not null check (length(btrim(body)) > 0),
  audience   text[]      not null default '{staff}' check (cardinality(audience) > 0),
  author_id  uuid        not null references person (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_on date        not null default current_date + 14
);

create index announcement_expires_idx on announcement (expires_on);
create index announcement_audience_idx on announcement using gin (audience);

create trigger announcement_audience_names_bodies
  before insert or update of audience on announcement
  for each row execute function check_audience();

alter table announcement enable row level security;

create policy announcement_read on announcement
  for select using (in_audience(audience));

create policy announcement_insert on announcement
  for insert with check (in_audience(audience) and author_id = current_person_id());

create policy announcement_update_own on announcement
  for update using (in_audience(audience) and author_id = current_person_id())
  with check (in_audience(audience) and author_id = current_person_id());

create policy announcement_delete_own on announcement
  for delete using (in_audience(audience) and author_id = current_person_id());

-- Scheduled next to purge-threads, once, by hand:
--   select cron.schedule('purge-announcements', '0 3 * * *', $$select purge_expired_announcements()$$);
create or replace function purge_expired_announcements() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  purged integer;
begin
  delete from announcement where expires_on < current_date - 14;
  get diagnostics purged = row_count;
  return purged;
end;
$$;

revoke execute on function purge_expired_announcements() from public, anon, authenticated;
