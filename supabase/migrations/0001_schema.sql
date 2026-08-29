-- Memorial Baptist Church staff dashboard — schema.
--
-- Nothing derived is stored. next_due, announce_by, notice_gap_days and
-- days_open are computed on read, in the application, every time. That is what
-- keeps the ledger honest when someone corrects a date: there is no second copy
-- to fall out of step.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- staff

create type role_level as enum ('staff', 'limited');

-- One row per staff member, keyed to the Supabase auth user. There is no
-- self-registration: a row here is the invitation.
create table staff (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique references auth.users (id) on delete set null,
  name        text        not null,
  role        text        not null,
  email       citext      not null unique,
  role_level  role_level  not null default 'limited',
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- cadence

create table cadence_item (
  id             uuid primary key default gen_random_uuid(),
  name           text    not null,
  ministry       text    not null,
  owner_id       uuid references staff (id) on delete set null,  -- null is Unclaimed
  interval_count integer not null check (interval_count > 0),
  interval_unit  text    not null default 'month' check (interval_unit in ('month', 'week')),
  interval_label text    not null,
  notice_days    integer not null check (notice_days >= 0),
  last_held      date,                                            -- null is "never held"
  notes          text    not null default '',
  archived       boolean not null default false
);

create index cadence_item_owner_idx on cadence_item (owner_id);

-- A held occurrence. last_held on the item is the most recent of these; the
-- table keeps the history the ledger's single date cannot.
create table cadence_occurrence (
  id              uuid primary key default gen_random_uuid(),
  cadence_item_id uuid not null references cadence_item (id) on delete cascade,
  held_on         date not null,
  announced_on    date,
  notes           text not null default ''
);

create index cadence_occurrence_item_idx on cadence_occurrence (cadence_item_id, held_on desc);

-- ---------------------------------------------------------------- events

create table event (
  id              uuid primary key default gen_random_uuid(),
  name            text        not null,
  ministry        text        not null,
  starts_at       date        not null,
  time_label      text        not null default '',
  location        text        not null default '',
  detail          text        not null default '',
  audience        text        not null default '',
  owner_id        uuid references staff (id) on delete set null,
  cadence_item_id uuid references cadence_item (id) on delete set null,
  public          boolean     not null default false,
  created_at      timestamptz not null default now()
);

create index event_starts_at_idx on event (starts_at);

-- ---------------------------------------------------------------- huddle

create type huddle_column as enum ('win', 'tension', 'fyi');

create table huddle_post (
  id          uuid primary key default gen_random_uuid(),
  column_key  huddle_column not null,
  body        text          not null check (length(btrim(body)) > 0),
  author_id   uuid          not null references staff (id) on delete cascade,
  created_at  timestamptz   not null default now(),
  resolved_at timestamptz                                          -- tensions only
);

create index huddle_post_column_idx on huddle_post (column_key, created_at desc);

-- ---------------------------------------------------------------- notice log

create table notice_category (
  name          text primary key,
  standard_days integer not null check (standard_days >= 0)
);

create table notice_entry (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  ministry        text not null,
  category        text not null references notice_category (name),
  decided_on      date not null,
  notified_on     date,                                            -- null is "not yet communicated"
  audience        text not null default '',
  channel         text not null default 'Not sent',
  cadence_item_id uuid references cadence_item (id) on delete set null,
  event_id        uuid references event (id) on delete set null,
  created_by      uuid references staff (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint notice_entry_notified_after_decided check (notified_on is null or notified_on >= decided_on)
);

create index notice_entry_decided_idx on notice_entry (decided_on desc);
create index notice_entry_unannounced_idx on notice_entry (notified_on) where notified_on is null;

-- ---------------------------------------------------------------- care

create type care_status as enum ('open', 'touched', 'closed');

create table care_type (
  name          text primary key,
  window_days   integer not null check (window_days > 0),
  window_label  text    not null,
  note          text    not null default ''
);

-- Named individuals' health, family and spiritual circumstances. See 0002 for
-- the policies; this table is never readable by a limited account, and it never
-- shares a database with the member-facing site.
create table care_entry (
  id            uuid primary key default gen_random_uuid(),
  person_name   text        not null,
  type          text        not null references care_type (name),
  opened_on     date        not null,
  owner_id      uuid references staff (id) on delete set null,
  status        care_status not null default 'open',
  last_touch_on date,
  sensitive     boolean     not null default false,
  notes         text        not null default '',
  closed_at     timestamptz,
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index care_entry_status_idx on care_entry (status, opened_on);

-- ---------------------------------------------------------------- discussion

create table thread (
  id               uuid primary key default gen_random_uuid(),
  subject          text        not null check (length(btrim(subject)) > 0),
  created_by       uuid        not null references staff (id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create index thread_last_activity_idx on thread (last_activity_at);

create table post (
  id               uuid primary key default gen_random_uuid(),
  thread_id        uuid        not null references thread (id) on delete cascade,
  -- A reference only. The quoted strip is rendered live from the referenced
  -- post: storing a copy of its text would let a deleted message survive inside
  -- every reply that quoted it, breaking both the author's delete control and
  -- the fourteen-day purge.
  reply_to_post_id uuid references post (id) on delete set null,
  body             text        not null default '',
  author_id        uuid        not null references staff (id) on delete cascade,
  created_at       timestamptz not null default now(),
  edited_at        timestamptz,
  removed          boolean     not null default false
);

create index post_thread_idx on post (thread_id, created_at);

-- Mentions are parsed on save and keyed to staff_id rather than left as raw
-- text, so a name change does not orphan the link.
create table mention (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references post (id) on delete cascade,
  staff_id   uuid not null references staff (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, staff_id)
);

-- Per-person read marks behind the one unread count in the nav.
create table thread_read (
  staff_id  uuid        not null references staff (id) on delete cascade,
  thread_id uuid        not null references thread (id) on delete cascade,
  read_at   timestamptz not null default now(),
  primary key (staff_id, thread_id)
);

-- Any insert or edit on a post moves its thread's clock. The fourteen days run
-- from the most recent activity, so a live discussion stays whole.
create or replace function touch_thread() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update thread set last_activity_at = now() where id = new.thread_id;
  return new;
end;
$$;

create trigger post_touches_thread
  after insert or update of body, removed on post
  for each row execute function touch_thread();

-- ---------------------------------------------------------------- goals

create table goal (
  id       uuid primary key default gen_random_uuid(),
  title    text    not null,
  ministry text    not null,
  owner_id uuid references staff (id) on delete set null,
  target   text    not null default '',
  status   text    not null default 'Not started',
  year     integer not null,
  q1       text    not null default '',
  q2       text    not null default '',
  q3       text    not null default '',
  q4       text    not null default ''
);

-- ---------------------------------------------------------------- communicator

create type week_status as enum ('draft', 'published');

create table communicator_week (
  id            uuid primary key default gen_random_uuid(),
  service_date  date        not null unique,
  series        text        not null default '',
  sermon_title  text        not null default '',
  cover_verse   text        not null default '',
  verse_ref     text        not null default '',
  order_json    jsonb       not null default '[]'::jsonb,
  notes_json    jsonb       not null default '{}'::jsonb,
  event_ids     uuid[]      not null default '{}',
  prayer_lines  text[]      not null default '{}',
  giving_json   jsonb       not null default '{}'::jsonb,
  status        week_status not null default 'draft',
  updated_by    uuid references staff (id) on delete set null,
  updated_at    timestamptz not null default now()
);

-- Standing content, identical for whoever builds the issue.
create table church_settings (
  id            boolean primary key default true check (id),
  meeting_times text not null default '',
  address       text not null default '',
  welcome_text  text not null default '',
  families_text text not null default '',
  contact_lines text[] not null default '{}',
  ways_to_give  text[] not null default '{}'
);

-- ---------------------------------------------------------------- retention

-- A board that says it forgets has to actually forget. This is a real delete,
-- not a flag and not a filter, and it cascades to posts and mentions.
-- Schedule nightly, e.g. with pg_cron:
--   select cron.schedule('purge-threads', '0 3 * * *', $$select purge_expired_threads()$$);
create or replace function purge_expired_threads() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from thread where last_activity_at < now() - interval '14 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Closed care entries are archived after twelve months and purged after
-- twenty-four unless flagged sensitive, which holds them for a decision.
create or replace function archive_closed_care() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched integer;
begin
  update care_entry
     set archived_at = now()
   where status = 'closed'
     and archived_at is null
     and closed_at < now() - interval '12 months';
  get diagnostics touched = row_count;

  delete from care_entry
   where status = 'closed'
     and not sensitive
     and closed_at < now() - interval '24 months';

  return touched;
end;
$$;
