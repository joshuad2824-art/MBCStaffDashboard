-- 0022 — church family: what the church would announce.
--
-- mbc-dashboard-home-brief.md §4. New members, baptisms, births, the families
-- expecting, passings, who is in the hospital, weddings and engagements,
-- graduations, membership milestones, who has moved, who is deployed — and
-- the birthdays and anniversaries coming round. What belongs in a bulletin, on
-- a prayer list or in a word from the pulpit, and nothing more private.
--
-- Two rules keep this a church-news board and not a records system:
--
-- * Situation, never diagnosis. An illness entry says where someone is and how
--   to reach them — "Saint Francis, room 412 — cards welcome" — never what is
--   wrong. There is no condition, diagnosis, health or notes column on any
--   table here, and the policy test checks the catalogue for one.
-- * Only what has been shared with the church. A hospital stay or an expecting
--   couple goes on the board only once the family has let it be known. The
--   form says so beside the button. Nothing is ever copied from Care.
--
-- Members are not in `person` — that is the staff roster — so an entry names
-- people in text, the way a bulletin does: 'Tom and Linda Rogers'.
--
-- Minors (decided by Joshua, 10 November 2026, accepting brief §4.6): an entry
-- may name a minor only for a public church milestone already announced to the
-- church — a baptism or a birth. Never a birthday, an age, an address or a
-- school. Birthdays are adults only (the import skips anyone under 18 and
-- anyone whose age it cannot tell), a birthday stores no year, and a birth
-- names the parents.
--
-- Reach: the whole staff body reads the board, limited accounts included,
-- except the two restricted kinds — illness and expecting — which are the
-- staff role's, like Care. `restricted` is set from the kind by a trigger, so
-- no form can get it wrong. Anyone who can read an entry may add, edit or
-- remove one (Joshua, 10 November 2026): this is a news board the whole staff
-- keeps, and an entry that has run its course is simply taken down.

-- ------------------------------------------------------------- family_news

create table family_news (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('new-member', 'baptism', 'birth', 'expecting', 'passing', 'illness',
                                            'wedding', 'engagement', 'graduation', 'milestone', 'moved', 'military')),
  -- Who, as the church would say it: 'Tom and Linda Rogers'.
  names       text not null check (length(btrim(names)) > 0 and length(names) <= 200),
  -- The date of the thing itself: the baptism, the birth, the service.
  on_date     date,
  -- One line. There is no field for a condition, and this is not one.
  detail      text not null default '' check (length(detail) <= 280),
  -- An obituary, a livestream, a registry.
  link        text check (link is null or link ~* '^https?://'),
  -- Set from the kind by the trigger below; never trusted from a form.
  restricted  boolean not null default false,
  -- On the board through this date.
  show_until  date not null,
  posted_by   uuid not null references person (id) default current_person_id(),
  created_at  timestamptz not null default now()
);

comment on table family_news is 'Church-family news: what the church would announce. Says where someone is, never what is wrong (home brief §4.2).';

-- ------------------------------------------------------------- member_date

create table member_date (
  id      uuid primary key default gen_random_uuid(),
  names   text not null check (length(btrim(names)) > 0 and length(names) <= 200),
  kind    text not null check (kind in ('birthday', 'anniversary')),
  month   smallint not null check (month between 1 and 12),
  day     smallint not null check (day between 1 and 31),
  -- Anniversaries only, for "50 years". A birthday never stores a year: Home
  -- only needs to know the day comes round.
  year    smallint check (year is null or year between 1900 and 2100),
  source  text not null default 'manual' check (source in ('breeze-import', 'manual')),
  check (kind <> 'birthday' or year is null)
);

comment on table member_date is 'Birthdays (adults only, no year) and anniversaries, for Home''s This week. Imported from Breeze or entered by hand.';

create index family_news_show_until on family_news (show_until);
create index member_date_month_day on member_date (month, day);

-- ---------------------------------------------------------------- the guards

-- restricted follows the kind, on every insert and update; posted_by and
-- created_at are the database's; show_until has a sensible default by kind
-- when the form leaves it out.
create or replace function guard_family_news() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := current_person_id();
begin
  new.restricted := new.kind in ('illness', 'expecting');

  if tg_op = 'INSERT' then
    if me is not null then
      new.posted_by := me;
      new.created_at := now();
    end if;
  elsif me is not null and (new.posted_by is distinct from old.posted_by or new.created_at is distinct from old.created_at) then
    raise exception 'Who posted an entry, and when, does not change.';
  end if;

  if new.show_until is null then
    new.show_until := case new.kind
      when 'illness'    then current_date + 14
      when 'expecting'  then current_date + 120
      when 'engagement' then coalesce(new.on_date, current_date + 90)
      else greatest(coalesce(new.on_date, current_date), current_date) + 30
    end;
  end if;

  return new;
end;
$$;

create trigger family_news_guards
  before insert or update on family_news
  for each row execute function guard_family_news();

-- ---------------------------------------------------------------- policies

alter table family_news enable row level security;
alter table member_date enable row level security;

-- The board: the whole staff body; the restricted kinds, the staff role only.
-- Anyone who can read an entry may add, edit or remove one. The trigger sets
-- `restricted` before the check runs, so a limited account cannot slip an
-- illness entry past it by sending restricted = false.
create policy family_news_read   on family_news for select
  using (is_member_of('staff') and (restricted = false or is_staff_role()));
create policy family_news_insert on family_news for insert
  with check (is_member_of('staff') and (restricted = false or is_staff_role()));
create policy family_news_update on family_news for update
  using (is_member_of('staff') and (restricted = false or is_staff_role()))
  with check (is_member_of('staff') and (restricted = false or is_staff_role()));
create policy family_news_delete on family_news for delete
  using (is_member_of('staff') and (restricted = false or is_staff_role()));

-- Birthdays and anniversaries: the whole staff body reads and keeps them.
create policy member_date_read   on member_date for select using (is_member_of('staff'));
create policy member_date_insert on member_date for insert with check (is_member_of('staff'));
create policy member_date_update on member_date for update using (is_member_of('staff')) with check (is_member_of('staff'));
create policy member_date_delete on member_date for delete using (is_member_of('staff'));
