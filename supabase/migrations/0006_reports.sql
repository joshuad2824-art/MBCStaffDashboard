-- Reports: the builders' record, and the lifecycle every report shares.
--
-- Three builders — committee reports, the Treasurer's monthly report, the
-- secretary's minutes — produce stored, dated, versioned reports that land on
-- the meeting agenda automatically and move through the same four states:
--
--   draft → submitted → published → archived
--
-- mbc-deacons-dashboard-brief.md §4. The brief sketches committee_report and
-- treasurer_report as separate tables with report_version over both. One
-- `report` table carrying `kind` is the same design with one lifecycle, one
-- Reports page and one versioning path instead of three, and it is what
-- report_version was already reaching for. The kind-specific shape lives in
-- `payload` (jsonb) and in src/data/meetings/reports.ts.
--
-- Three rules from the brief shape this file:
--
--   * Published reports are versioned, not overwritten. Publishing writes a
--     report_version; an edit after publication writes the next one and the
--     prior stays readable. Versions have no update or delete policy at all.
--
--   * Nothing on the deacon side is deleted. Archived is a state, not a bin:
--     when a new period's report is published for the same body, the one it
--     replaces moves to `archived` and stays readable, printable, editable.
--
--   * Pointers, not content. A draft is the committee's own until it is
--     filed; a filed report goes to the whole Board, as the appendices to the
--     Board's minutes always have. What keeps that safe is the shape of each
--     report, not a gate: Family Assistance files counts, amounts and the
--     D002 confirmation and has no field for a circumstance; Personnel
--     carries no compensation figures, and a trigger refuses a dollar amount
--     in one.

create type report_kind   as enum ('committee', 'treasurer', 'minutes');
create type report_status as enum ('draft', 'submitted', 'published', 'archived');

create table report (
  id           uuid primary key default gen_random_uuid(),
  kind         report_kind   not null,
  -- The body the report belongs to: the committee; committee:finance for the
  -- Treasurer's report, whose chair is the Treasurer; deacon-board for minutes.
  body_id      uuid          not null references body (id),
  -- The meeting it is filed against. Minutes are of a meeting, always.
  meeting_id   uuid references board_meeting (id) on delete set null,
  -- The Treasurer's report covers "the preceding month" (Art. II.C ¶2).
  period_start date,
  period_end   date,
  status       report_status not null default 'draft',
  -- The working copy. What was published is in report_version.
  payload      jsonb         not null default '{}'::jsonb,
  created_by   uuid references person (id) on delete set null,
  created_at   timestamptz   not null default now(),
  updated_by   uuid references person (id) on delete set null,
  updated_at   timestamptz   not null default now(),
  submitted_by uuid references person (id) on delete set null,
  submitted_at timestamptz,
  published_at timestamptz,
  archived_at  timestamptz,
  constraint report_minutes_are_of_a_meeting check (kind <> 'minutes' or meeting_id is not null),
  constraint report_treasurer_has_a_period check (
    kind <> 'treasurer' or (period_start is not null and period_end is not null and period_end >= period_start)
  )
);

create unique index report_one_minutes_per_meeting on report (meeting_id) where kind = 'minutes';
create index report_body_idx    on report (body_id, kind, status);
create index report_meeting_idx on report (meeting_id);

create table report_version (
  id                    uuid primary key default gen_random_uuid(),
  report_id             uuid        not null references report (id) on delete cascade,
  version_no            integer     not null check (version_no > 0),
  payload               jsonb       not null,
  -- The report rendered into the standard template, as filed and printed.
  rendered              text        not null default '',
  created_by            uuid references person (id) on delete set null,
  created_at            timestamptz not null default now(),
  published_at          timestamptz not null default now(),
  supersedes_version_id uuid references report_version (id),
  unique (report_id, version_no)
);

-- --------------------------------------------------------------- helpers

-- Anyone seated somewhere other than staff: the deacon side.
create or replace function is_on_deacon_side() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from my_bodies() as slug where slug <> 'staff');
$$;

-- Who may write a report: the chair of the committee it belongs to (the
-- Treasurer chairs Finance), or any Board member for the minutes.
create or replace function can_write_report(report_kind report_kind, report_body_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
           when report_kind = 'minutes' then is_member_of('deacon-board')
           else exists (select 1 from body b where b.id = report_body_id and is_chair_of(b.slug))
         end;
$$;

-- Who may read one: members of its body in any state, and the Board once it
-- is filed. A draft is the committee's own. The same rule the policies use.
create or replace function can_read_report(report_body_id uuid, report_status report_status) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from body b where b.id = report_body_id and is_member_of(b.slug))
      or (report_status <> 'draft' and is_member_of('deacon-board'));
$$;

-- What was filed against a meeting, in agenda order. Returns nothing to
-- anyone who is not on the Board.
create or replace function reports_filed(for_meeting uuid)
returns table (
  report_id    uuid,
  kind         report_kind,
  body_slug    text,
  body_name    text,
  confidential boolean,
  status       report_status,
  submitted_at timestamptz,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.kind, b.slug, b.name, b.confidential, r.status, r.submitted_at, r.published_at
    from report r
    join body b on b.id = r.body_id
   where r.meeting_id = for_meeting
     and r.status in ('submitted', 'published', 'archived')
     and is_member_of('deacon-board')
   order by b.slug, r.kind;
$$;

grant execute on function is_on_deacon_side(), can_write_report(report_kind, uuid), can_read_report(uuid, report_status), reports_filed(uuid) to authenticated;

-- ------------------------------------------ no compensation figures, ever

-- Personnel reports carry reviews completed, staffing actions and items for
-- the Board. The Board evaluates the Senior Pastor's review (Art. II.B §3);
-- it does not need salary detail in a database to do it. A dollar figure in
-- a Personnel report is refused, in the draft and in any version.
create or replace function refuse_compensation_figures() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_json jsonb := to_jsonb(new);   -- report has body_id; report_version has report_id
  slug     text;
begin
  select b.slug into slug
    from body b
   where b.id = coalesce(
     (row_json ->> 'body_id')::uuid,
     (select r.body_id from report r where r.id = (row_json ->> 'report_id')::uuid)
   );
  if slug = 'committee:personnel' and new.payload::text ~ '\$\s?\d' then
    raise exception 'Personnel reports carry no compensation figures.';
  end if;
  return new;
end;
$$;

create trigger report_no_compensation_figures
  before insert or update of payload on report
  for each row execute function refuse_compensation_figures();

create trigger report_version_no_compensation_figures
  before insert on report_version
  for each row execute function refuse_compensation_figures();

-- --------------------------------------------------------------- policies

alter table report         enable row level security;
alter table report_version enable row level security;

create policy report_read on report
  for select using (can_read_report(body_id, status));
create policy report_insert on report
  for insert with check (can_write_report(kind, body_id) and created_by = current_person_id());
create policy report_update on report
  for update using (can_write_report(kind, body_id)) with check (can_write_report(kind, body_id));

create policy report_version_read on report_version
  for select using (exists (select 1 from report r where r.id = report_id and can_read_report(r.body_id, r.status)));
create policy report_version_insert on report_version
  for insert with check (
    created_by = current_person_id()
    and exists (select 1 from report r where r.id = report_id and can_write_report(r.kind, r.body_id))
  );
-- No update and no delete on versions: a published version is a record.

-- The minutes' header says when the meeting opened and adjourned. Stamped by
-- the calls to order and to adjourn; the secretary never types them.
alter table board_meeting
  add column called_to_order_at timestamptz,
  add column adjourned_at       timestamptz;

-- A committee chair who does not sit on the Board still files against a
-- meeting, so the meeting's existence is readable to the whole deacon side.
-- The agenda, the roll and the motions stay the Board's.
drop policy board_meeting_read on board_meeting;
create policy board_meeting_read on board_meeting
  for select using (is_on_deacon_side());
