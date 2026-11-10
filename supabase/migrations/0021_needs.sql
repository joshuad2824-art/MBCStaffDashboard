-- 0021 — needs: ask a colleague for input, and see what is waiting on you.
--
-- mbc-dashboard-home-brief.md §3. A staff member posts a short need — "Flyer
-- for the Christmas Eve service; Spencer, Jacob, can you look before
-- Thursday?" — tags the people whose input it needs, and those people see it on
-- Home under Waiting on you until it is done. A need with nobody tagged is
-- simply a to-do.
--
-- It is deliberately not an approval workflow. Two states only, open and done;
-- no required approver, no statuses to move through, no step the application
-- insists on. Anyone on staff may mark a need done or reopen it, and the
-- database records who and when — that is the whole audit trail, and a trigger
-- writes it so the browser cannot. A tagged person with something to say
-- replies in the comments.
--
-- Editing is free for the author: the need is the current state of the ask,
-- and the comments are the record of what was said. Nothing here is deleted by
-- the application: done needs stay behind a toggle, and neither `need` nor
-- `need_comment` has a delete policy. The one thing that can be taken away is
-- a tag, by the need's author, because who is asked is part of the ask.
--
-- Reach: the whole staff body, limited accounts included — a need is
-- logistics, not pastoral care. Nothing about a member's circumstance belongs
-- in one, and the form says so ("For pastoral matters, talk in person").
-- Signed out, or seated only on the deacon side: nothing.

-- -------------------------------------------------------------------- need

create table need (
  id          uuid primary key default gen_random_uuid(),
  -- One line.
  title       text not null check (length(btrim(title)) > 0 and length(title) <= 200),
  -- Optional, markdown.
  body        text not null default '',
  -- Optional: a doc, a flyer, a Canva link.
  link        text check (link is null or link ~* '^https?://'),
  needed_by   date,
  created_by  uuid not null references person (id) default current_person_id(),
  created_at  timestamptz not null default now(),
  -- Done is a time and a person, or neither.
  done_at     timestamptz,
  done_by     uuid references person (id),
  check ((done_at is null) = (done_by is null))
);

comment on table need is 'A short ask of colleagues, or a to-do. Open or done, nothing else. Never deleted by the application (home brief §3).';

-- ---------------------------------------------------------------- need_tag

create table need_tag (
  need_id   uuid not null references need (id),
  person_id uuid not null references person (id),
  -- When the tagged person saw it. For the Home count; it gates nothing.
  seen_at   timestamptz,
  primary key (need_id, person_id)
);

comment on table need_tag is 'Who a need asks for input. seen_at is for the Home count, not a gate.';

-- ------------------------------------------------------------ need_comment

create table need_comment (
  id         uuid primary key default gen_random_uuid(),
  need_id    uuid not null references need (id),
  author     uuid not null references person (id) default current_person_id(),
  body       text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

comment on table need_comment is 'A reply under a need: the record of what was said. Appended, never edited or deleted through the API.';

create index need_done_at on need (done_at);
create index need_tag_person on need_tag (person_id);
create index need_comment_need on need_comment (need_id);

-- ------------------------------------------------------------- the guards

-- Who may change what on a need, and who it says did it.
--
-- * created_by and created_at never change.
-- * Only the author changes the ask itself: title, body, link, needed_by.
-- * Anyone who may update the row may mark it done or reopen it. The time is
--   the database's and the person is whoever is signed in; a value sent from
--   the browser for either is ignored. Reopening clears both. A need already
--   done keeps its first done_at and done_by — marking it done again rewrites
--   nobody's history.
--
-- Run by the API only: a superuser or a service role (no signed-in person)
-- is left to set what it sets, as the seed and the administrator do.
create or replace function guard_need() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := current_person_id();
begin
  if me is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := me;
    new.created_at := now();
    if new.done_at is not null then
      new.done_at := now();
      new.done_by := me;
    else
      new.done_by := null;
    end if;
    return new;
  end if;

  if new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Who posted a need, and when, does not change.';
  end if;

  if me is distinct from old.created_by
     and (new.title is distinct from old.title
          or new.body is distinct from old.body
          or new.link is distinct from old.link
          or new.needed_by is distinct from old.needed_by) then
    raise exception 'Only the person who posted a need can change what it asks. Reply in the comments instead.';
  end if;

  if new.done_at is null then
    new.done_by := null;
  elsif old.done_at is null then
    new.done_at := now();
    new.done_by := me;
  else
    new.done_at := old.done_at;
    new.done_by := old.done_by;
  end if;

  return new;
end;
$$;

create trigger need_guards
  before insert or update on need
  for each row execute function guard_need();

-- A tag's seen_at is the tagged person's own, and only seen_at may change.
create or replace function guard_need_tag() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_person_id() is null then
    return new;
  end if;
  if new.need_id is distinct from old.need_id or new.person_id is distinct from old.person_id then
    raise exception 'A tag is removed and added, not moved.';
  end if;
  return new;
end;
$$;

create trigger need_tag_guards
  before update on need_tag
  for each row execute function guard_need_tag();

-- -------------------------------------------------------------- policies

alter table need         enable row level security;
alter table need_tag     enable row level security;
alter table need_comment enable row level security;

-- The whole staff body reads and writes: the roster, limited accounts included.
create policy need_read   on need for select using (is_member_of('staff'));
create policy need_insert on need for insert with check (is_member_of('staff') and created_by = current_person_id());
create policy need_update on need for update using (is_member_of('staff')) with check (is_member_of('staff'));
-- No delete policy: done needs stay, behind a toggle.

-- Whose input a need asks for is the author's to say: only the author adds or
-- removes a tag. The tagged person marks their own tag seen.
create policy need_tag_read on need_tag for select using (is_member_of('staff'));
create policy need_tag_insert on need_tag for insert with check (
  is_member_of('staff')
  and exists (select 1 from need n where n.id = need_id and n.created_by = current_person_id())
);
create policy need_tag_delete on need_tag for delete using (
  is_member_of('staff')
  and exists (select 1 from need n where n.id = need_id and n.created_by = current_person_id())
);
create policy need_tag_seen on need_tag for update
  using (is_member_of('staff') and person_id = current_person_id())
  with check (is_member_of('staff') and person_id = current_person_id());

-- Anyone on staff replies, in their own name. Appended only: no update and no
-- delete policy.
create policy need_comment_read   on need_comment for select using (is_member_of('staff'));
create policy need_comment_insert on need_comment for insert with check (is_member_of('staff') and author = current_person_id());
