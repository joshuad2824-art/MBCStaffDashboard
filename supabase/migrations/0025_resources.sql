-- 0025 — resources: the links staff actually reach for.
--
-- mbc-dashboard-home-brief.md §7. One list, staff-editable: Breeze, BAND, the
-- style guide, the tools the church uses, the training. A resource is a name,
-- a link and a line saying what it is for, in one of five categories; pinned
-- ones come first.
--
-- Files are links in v1 (Drive, Canva). There is no upload here; if a link
-- will not do, that is a later PR.
--
-- The manual and Robert's Rules are this app's own pages, so the page draws
-- them as built-in entries rather than rows: they are reached from here and
-- cannot be removed by accident. A row may still point inside the app — a
-- link that starts with "/" — or out to the web over http(s).
--
-- Reach: the whole staff body reads and adds, limited accounts included.
-- Editing, pinning and removing is the person who added it, or any staff-role
-- account's — the same rule News keeps.

create table resource (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0 and length(name) <= 120),
  -- Out to the web, or a path inside this app.
  url         text not null check ((url ~* '^https?://' or url ~ '^/[A-Za-z0-9]') and length(url) <= 2000),
  -- One line.
  description text not null default '' check (length(description) <= 200),
  category    text not null check (category in ('ministry-tools', 'office-admin', 'brand-design', 'reference', 'training')),
  pinned      boolean not null default false,
  added_by    uuid not null references person (id) default current_person_id(),
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table resource is 'A link staff reach for: name, address, one line, category. Pinned first (home brief §7).';

create index resource_category on resource (category, position);

-- Who added it is the database's to say.
create or replace function guard_resource() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := current_person_id();
begin
  if tg_op = 'INSERT' then
    if me is not null then
      new.added_by := me;
      new.created_at := now();
    end if;
  elsif me is not null and (new.added_by is distinct from old.added_by or new.created_at is distinct from old.created_at) then
    raise exception 'Who added a resource, and when, does not change.';
  end if;
  return new;
end;
$$;

create trigger resource_guards
  before insert or update on resource
  for each row execute function guard_resource();

alter table resource enable row level security;

create policy resource_read   on resource for select using (is_member_of('staff'));
create policy resource_insert on resource for insert with check (is_member_of('staff') and added_by = current_person_id());
create policy resource_update on resource for update
  using (is_member_of('staff') and (added_by = current_person_id() or is_staff_role()))
  with check (is_member_of('staff') and (added_by = current_person_id() or is_staff_role()));
create policy resource_delete on resource for delete
  using (is_member_of('staff') and (added_by = current_person_id() or is_staff_role()));
