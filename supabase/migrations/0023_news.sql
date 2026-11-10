-- 0023 — news & articles: links staff share with each other.
--
-- mbc-dashboard-home-brief.md §5. A post is a link someone on staff found worth
-- passing along, the note they wrote with it, and the categories it belongs in.
-- Nothing is gathered automatically, nothing is copied in, and no article gets
-- a page of its own: a card opens the article at its source.
--
-- News holds links and our own notes, never an article's text. There is no
-- body column, the `unfurl` function reads only a page's own preview tags
-- (title, site name, preview image), and the policy test checks the catalogue
-- for a column that could hold an article.
--
-- Categories are data, not code — a row in news_category, so one can be added
-- without a deploy (by the administrator, in SQL; there is no write path
-- through the API). Joshua decided on 10 November 2026: the brief's five, plus
-- Tulsa & Oklahoma and Other, and a post may carry more than one — at least
-- one, every one of them a known, active category (a trigger checks).
--
-- Current versus archive is derived, never moved: current is
-- post_on <= today <= expires_on; archive is everything past expires_on.
--
-- Reach: the whole staff body reads, shares and comments, limited accounts
-- included. Editing or removing a post is the sharer's, or any staff-role
-- account's. Comments are appended, never edited or deleted, as on a need.

-- ----------------------------------------------------------- news_category

create table news_category (
  slug        text primary key check (slug ~ '^[a-z][a-z0-9-]*$'),
  name        text not null unique,
  -- Shown on the category's page. Politics carries the one neutrality rule a
  -- staff-shared feed needs, and it is a request, not a gate.
  description text not null default '',
  position    integer not null default 0,
  active      boolean not null default true
);

insert into news_category (slug, name, description, position) values
  ('church-faith',  'Church & Faith',    '', 10),
  ('tulsa',         'Tulsa & Oklahoma',  'Road closures, city decisions, school calendars — what touches the church''s week.', 20),
  ('world',         'World',             '', 30),
  ('politics',      'Politics',          'News and policy that affect the church — please share reporting, not opinion pieces.', 40),
  ('digital-tech',  'Digital & Tech',    '', 50),
  ('science',       'Science',           '', 60),
  ('other',         'Other',             'Anything that doesn''t fit cleanly elsewhere — or when you''re just not sure.', 70);

-- --------------------------------------------------------------- news_post

create table news_post (
  id          uuid primary key default gen_random_uuid(),
  url         text not null check (url ~* '^https?://' and length(url) <= 2000),
  -- From unfurl, editable before posting.
  title       text not null check (length(btrim(title)) > 0 and length(title) <= 300),
  -- 'Baptist Press', 'AP News'.
  site_name   text not null default '' check (length(site_name) <= 120),
  -- The page's own preview image, linked to where the publisher serves it.
  image_url   text check (image_url is null or image_url ~* '^https?://'),
  -- The sharer's own words. Optional.
  note        text not null default '' check (length(note) <= 1000),
  -- One or more news_category slugs (guard_news_post checks each).
  categories  text[] not null check (cardinality(categories) >= 1),
  shared_by   uuid not null references person (id) default current_person_id(),
  post_on     date not null default current_date,
  -- Two weeks after post_on unless the sharer says otherwise.
  expires_on  date not null,
  created_at  timestamptz not null default now(),
  search      tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(site_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(note, '')), 'C')
  ) stored,
  check (expires_on >= post_on)
);

comment on table news_post is 'A link a staff member shared, their note, and its categories. Never an article''s text (home brief §5.4).';

create index news_post_search on news_post using gin (search);
create index news_post_categories on news_post using gin (categories);
create index news_post_dates on news_post (post_on, expires_on);

-- ------------------------------------------------------------ news_comment

create table news_comment (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references news_post (id) on delete cascade,
  author     uuid not null references person (id) default current_person_id(),
  body       text not null check (length(btrim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index news_comment_post on news_comment (post_id);

-- --------------------------------------------------------------- the guard

-- Who shared, and when, is the database's. The categories must be known and
-- active, with no repeats, and the expiry defaults to two weeks out.
create or replace function guard_news_post() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := current_person_id();
  unknown text;
begin
  if tg_op = 'INSERT' then
    if me is not null then
      new.shared_by := me;
      new.created_at := now();
    end if;
  elsif me is not null and (new.shared_by is distinct from old.shared_by or new.created_at is distinct from old.created_at) then
    raise exception 'Who shared a link, and when, does not change.';
  end if;

  select string_agg(c, ', ') into unknown
    from unnest(new.categories) as c
   where not exists (select 1 from news_category k where k.slug = c and k.active);
  if unknown is not null then
    raise exception 'Not a news category: %', unknown using errcode = 'check_violation';
  end if;
  new.categories := array(select distinct c from unnest(new.categories) as c order by c);

  if new.expires_on is null then
    new.expires_on := new.post_on + 14;
  end if;
  return new;
end;
$$;

create trigger news_post_guards
  before insert or update on news_post
  for each row execute function guard_news_post();

-- ---------------------------------------------------------------- policies

alter table news_category enable row level security;
alter table news_post     enable row level security;
alter table news_comment  enable row level security;

-- Categories: read by the staff body; changed by the administrator in SQL.
create policy news_category_read on news_category for select using (is_member_of('staff'));

-- Posts: the whole staff body reads and shares. Editing and removing is the
-- sharer's, or any staff-role account's.
create policy news_post_read   on news_post for select using (is_member_of('staff'));
create policy news_post_insert on news_post for insert with check (is_member_of('staff') and shared_by = current_person_id());
create policy news_post_update on news_post for update
  using (is_member_of('staff') and (shared_by = current_person_id() or is_staff_role()))
  with check (is_member_of('staff') and (shared_by = current_person_id() or is_staff_role()));
create policy news_post_delete on news_post for delete
  using (is_member_of('staff') and (shared_by = current_person_id() or is_staff_role()));

-- Comments: anyone on staff, in their own name; appended only. A post that is
-- removed takes its comments with it (on delete cascade).
create policy news_comment_read   on news_comment for select using (is_member_of('staff'));
create policy news_comment_insert on news_comment for insert with check (is_member_of('staff') and author = current_person_id());
