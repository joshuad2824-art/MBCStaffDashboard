# MBC Dashboard — simplify and home brief

*The fourth brief at the repo root. Written 10 November 2026. It assumes `CLAUDE.md` and the three
earlier briefs have been read, and it does not repeat them. Where this brief and an earlier one
disagree, this one is newer and wins — but every invariant in `CLAUDE.md` still stands unless a
section below names it and says what changes.*

The dashboard was built wide before anyone used it. Staff are about to start. This brief makes it
small, immediately useful, and shaped like a home page people will leave open — and adds four
things they asked for: news, a way to ask each other for input, church-family news, and a
directory of who leads.

| | | |
|---|---|---|
| **1** | Simplify | Deacon side off, the instruments off, a short menu |
| **2** | Home | One page: weather, the calendar, what's waiting on you, church family, headlines |
| **3** | Needs | Tag someone when something can't move without them — no approval machinery |
| **4** | Church family | New members, baptisms, births, passings, illness, birthdays, anniversaries |
| **5** | News & Articles | Staff share links with a note and a category |
| **6** | Leadership | Deacons and their offices; church committees and who sits on them |
| **7** | Resources | The links staff actually reach for |
| **8** | Homebound | The staff's own list, built here |

---

## 0. What is already true

Most of this brief is reshaping what exists, so it is worth stating what does.

- **Every surface already has an `off` switch.** `off: true` in `src/screens/surfaces.ts` removes
  the nav entry and the route for everyone, view-as included, and keeps the screen and its data.
  Switching a page back on is one line. Workstream 1 is almost entirely this.
- **The deacon side has moved out.** It now lives in its own application, *MBC Deacon Resource*
  (private repo, Netlify Identity, Netlify Database). That app is for the deacons only. **This
  dashboard is the one and only place staff sign in**, so anything staff need — the homebound list
  included — is built here, even where the Deacon Resource has its own version.
- **Today at Memorial already has a forecast** (`src/lib/weather.ts`, Open-Meteo, no key, seeded
  fallback labelled as seed), **a month tile** (`MonthTile`, built on `monthGrid`), a waiting tile,
  and announcements with an expiry date. The Calendar screen already pages month by month
  (`addMonths`). Home is a rebuild of `Today.tsx`, not a new screen.
- **The ministries directory is built** (`0017_ministries.sql`): `ministry`, `serving_group`,
  `serving_role`, `serving_assignment`, with *groups hold who serves, never who attends* as an
  invariant and a policy test behind it. Workstream 6 extends it rather than starting a parallel
  table.
- **Migrations run to `0020`.** The next is `0021`.

---

## 1. Simplify

### 1.1 The menu

```
Home · Calendar · Needs · News · Discussion
Ministries · Leadership · Homebound
Resources
People            (administrator only)
```

Nine items for everyone, in three groups. That is the whole application on the day staff start.

### 1.2 What goes off

`off: true`, with a dated comment in the house style (*"Off since 10 November 2026, at Joshua's
ask: simplify before staff start. Data kept."*):

- **Every `side: 'deacon'` surface** — the meeting, reports, the year, board care, Deacon of the
  Week, the four committee rooms, the board calendar, the board's room.
- **The side switch in the header.** With no deacon surfaces on, Jacob and Joshua sign in to the
  staff side like everyone else. `context` stays in the session so the deacon side can be switched
  back on without a rewrite; it simply has nothing to switch to.
- **Staff instruments:** Huddle, Cadence ledger, Notice log, Communicator, Care pipelines, Goals.
- **Reference and Robert's Rules** come off the menu. Both reappear as entries on the Resources
  page (§7), linking to their routes — so their routes stay *on*, only their nav entries go. Add a
  `hidden?: boolean` to `Surface` for exactly this: routable, not in the sidebar. Do not abuse
  `off` for it; `off` means the route refuses.

### 1.3 What must come with it

**Home cannot point at a room that is off.** `Today.tsx` currently draws `HuddleTile`,
`BulletinTile` (opens the Communicator), `DeaconWeekTile`, and a `WaitingTile` whose counts come
from Cadence and the Notice log. Each tile that opens an off surface goes. Rule for Claude Code:
any tile, counter or link on Home must resolve through `canOpen()`; if the surface is off, the tile
is not drawn. Put that check in `Tile`, not in each caller, so the next page switched off cannot
leave an orphan.

**No data is deleted and no migration is reverted.** Turning off is a nav-and-route change.
Published minutes and reports in the database are governance records and keep.

**Policy test:** unchanged. Turning a surface off moves no policy, and that is the proof it was
done right.

---

## 2. Home

### 2.1 What it is for

The page that is up on a staff member's monitor all day. Glanceable at a distance, readable up
close, and every section either answers *"what's happening"* or *"what needs me."*

### 2.2 The look — Field Notes as the reference

Joshua's own Field Notes home page is the reference for *how clean*: a dark ground, a handful of
large rounded tiles, each doing one thing, each a different colour, labelled with a short
letterspaced eyebrow and nothing else — no lead paragraphs, no chrome, no menu bar fighting for
attention. The staff dashboard already carries a good deal of this look since the October redesign — the
tile board, room colours, the rounded cards — so this is a refinement of what's there, not a
restyle: fewer tiles, larger, quieter, and the sidebar out of the way. Inspiration, not imitation: MBC's tokens, Lora and Lato, the MBC
palette — Field Notes supplies the composition and the restraint, not the colours or the fonts.

**The board, desktop** (twelve-column grid, two rows plus a bar):

```
┌────────┐┌───────────────────────────┐┌──────────────────┐┌─────────────────────┐
│  TUE   ││ ▌TODAY         COMING UP  ││  NOVEMBER 2026 ‹›││  WEATHER            │
│ 10 NOV ││ ▌ …events      11 WED …   ││  S M T W T F S   ││   60°  Partly cloudy│
├────────┤│ ▌              12 THU …   ││  month grid      ││   H 73° · L 48°     │
│ POST A ││                           ││                  ││  TUE WED THU FRI SAT│
│ NEED   │└───────────────────────────┘└──────────────────┘└─────────────────────┘
└────────┘
┌──────────────────────────────────────────┐┌──────────────────────┐┌──────────┐
│ CHURCH FAMILY                     3 new  ││ WAITING ON YOU       ││ PAGES    │
│ (cream panel, serif — the reading tile)  ││ ○ Flyer — Christmas  ││ Ministries│
│ Baptisms · New members · Births …        ││   Eve  · by Thu      ││ Leadership│
│ Prayer · Passings                        ││ ○ Room for Dec 6 …   ││ Homebound │
│ This week: birthdays · anniversaries     ││   2 others open      ││ Resources │
└──────────────────────────────────────────┘└──────────────────────┘├──────────┤
                                                                     │  NEWS    │
                       ┌───────────────────┐                         │ 3 shared │
 ● Up to date          │  TODAY ˄    (+)   │                         └──────────┘
                       └───────────────────┘
```

**The tiles, and what each one opens:**

| Tile | Field Notes analogue | What it holds | Opens |
|---|---|---|---|
| **Date** | the date block | Day and date, large | — |
| **Post a need** | Quick note | One tap to a new need (§3) | the composer |
| **Today / Coming up** | the same | Today's events beside the next several days, with the vertical date rail | Calendar |
| **Month** | the month tile | Full grid, days of the week across the top, today ringed, days with events marked, **‹ ›** to page months and **Today** to return; select a day to see its events | Calendar at that day |
| **Weather** | the same | Now, high/low, five days | The whole tile is one link to weather.com's Tulsa page (§2.3) |
| **Church family** | the cream reading panel | §4, as a reading surface: serif, dated entries, newest first, grouped by kind; a *This week* foot with birthdays and anniversaries | Church family page |
| **Waiting on you** | Reminders | Needs tagged to you, with a ring to mark done; *"2 others open"* beneath | Needs |
| **Pages** | Notebooks | Ministries · Leadership · Homebound · Resources · Discussion, each with its room colour as a rule on the left | each page |
| **News** | the single-word tile | The word and a count — *3 shared this week* | News |

The cream Church-family panel is the one light surface on a dark board, exactly as Siena's panel is
in Field Notes, and for the same reason: it's the part meant to be *read*, not glanced at.

**The bar.** A floating pill at the foot of every page, as in Field Notes: **TODAY ˄** opens a
short sheet with every page in the menu (§1.1) — that is the menu, on Home and everywhere else —
and **+** offers *Post a need · Share a link · Add church-family news*. Top right, the two
quiet circles: **search** (one field reaching needs, news, church family, resources and the
calendar) and **settings**. Bottom left, the sync dot — *Up to date* — because a page left open
all day should say whether it's current.

**No sidebar on Home.** The *Pages* tile and the bar do the navigating. Recommended for the inner
pages too: retire the sidebar in favour of the same bar, so the whole app has one way to move
around and Home is not a special case. If the sidebar stays on inner pages, it stays slim.

**Severe weather.** When an NWS watch or warning is active for Tulsa County (§2.3), the Weather tile
becomes the warning — the event name and its expiry — and a thin band runs across the top of the
board. Both the tile and the band open the same weather.com Tulsa page as the tile always does. Severity is carried by words, weight and position, not by colour alone;
the design system's no-status-red rule stands. A tornado warning on a Wednesday afternoon decides
whether the evening goes ahead, which is why this is the one interruption Home allows.

**Icons.** The design system says no icons. Field Notes uses small weather glyphs, and they earn
their place there — a cloud reads faster than "partly cloudy" across a room. Recommended: allow
weather glyphs in the Weather tile only, drawn in the same single line weight, and nowhere else.
Joshua's call (§12).

**Phone.** One column in priority order: Date and Weather side by side · Waiting on you · Today /
Coming up · Church family · Month · News · Pages. The bar stays.

**Data rules carry over.** A limited account's Church-family panel simply lacks the restricted
kinds (§4.3); the tile doesn't announce that anything is missing. Any tile whose page is off
(§1.3) is not drawn.

### 2.3 Weather in production

`weather.ts` already says the fetch belongs on the server behind a cache. Do it now, because Home
will be left open in every office: one Netlify function, `weather`, that fetches Open-Meteo and the
NWS alerts, caches thirty minutes for the forecast and **two minutes for alerts**, and returns one
payload. The seeded fallback stays and stays labelled.

**The tile is a link.** The entire Weather tile — not a button inside it — is a single anchor to
`https://weather.com/us/oklahoma/city/tulsa/today`, opening in a new tab
(`target="_blank" rel="noopener noreferrer"`). One focus stop, an accessible name of *"Tulsa
weather — opens weather.com"*, and a hover/focus state matching the other tiles. Nothing inside the
tile is separately clickable, so there's no nested-link problem. The severe-weather band goes to the
same address. Keep the URL in one constant (`WEATHER_URL` in `src/lib/weather.ts`).

### 2.4 Readability

The deacons' rule applies here too — older readers, a monitor across the room: 17px minimum body,
19px in the Church-family panel, 44px controls, tabular figures for every time and temperature,
nothing carried by colour alone. Home is one of the two screens worth sending to Claude Design
first (§10), with the Field Notes screenshot attached as the composition reference.

---

## 3. Needs

### 3.1 What it is, and what it deliberately is not

A staff member can post a short need — *"Flyer for the Christmas Eve service — Spencer, Jacob, can
you look before Thursday?"* — tag the people whose input it needs, and those people see it on Home
under *Waiting on you* until it's done.

It is **not** an approval workflow. No required approver, no statuses to move through, no step the
application insists on. Joshua's reason is the right one: staff haven't used this yet, and a tool
that demands a process they don't actually follow gets abandoned. So the feature is a list with
tags, and the workflow is whatever staff make of it. If, after a few months, a real pattern
emerges, that pattern can be built — on evidence.

It is also the to-do list. A need with no one tagged is simply a to-do.

### 3.2 The shape

```
need
  id            uuid pk
  title         text not null          -- one line
  body          text                   -- optional; markdown
  link          text                   -- optional; a doc, a flyer, a Canva link
  needed_by     date                   -- optional
  created_by    uuid → person
  created_at    timestamptz
  done_at       timestamptz null
  done_by       uuid → person null

need_tag
  need_id → need, person_id → person, primary key (need_id, person_id)
  seen_at       timestamptz null       -- for the Home count, not a gate

need_comment
  id, need_id → need, author → person, body text, created_at
```

**Two states only: open and done.** Anyone on staff can mark a need done or reopen it; the
application records who and when, and that is the whole audit trail. No "approved," no
"rejected," no "changes requested." A tagged person who has input replies in the comments.

**Editing is free.** The author can edit at any time. A comment-thread is the record of what was
said; the need itself is just the current state of the ask.

**Done items stay**, behind a *Show done* toggle, newest first. Nothing in Needs is deleted by the
application.

### 3.3 Where it shows up

- **Home → Waiting on you**: open needs where you are tagged, `needed_by` soonest first, undated
  last.
- **The nav**: a count beside *Needs* when anything is waiting on you — a number, not a coloured
  badge.
- **Email, later and opt-in.** A tag can send one short email (*"Josh tagged you: Flyer for the
  Christmas Eve service — needed by Thu"* with a link). Not in v1. In v1, Home is the notification;
  if staff live in the dashboard, that's enough, and if they don't, email is the next PR. When it
  comes, it is per-person opt-out and never a digest of everything.

### 3.4 Access

Read and write: the whole `staff` body, limited accounts included — a need is logistics, not
pastoral care. Nothing about a member's circumstance belongs in a need; the form's placeholder
says so in plain words (*"For pastoral matters, talk in person"*).

### 3.5 Migration

`0021_needs.sql` — the three tables, RLS, indexes on `(done_at)` and `need_tag(person_id)`.

---

## 4. Church family

### 4.1 What it holds

What the church would announce: what belongs in a bulletin, on a prayer list, or in a word from the
pulpit. Nothing more private than that.

| Kind | What it shows |
|---|---|
| **New members** | Names, date joined, how (letter, statement, baptism) |
| **Baptisms — upcoming** | Name, date |
| **Baptisms — recent** | Name, date |
| **Births** | Parents' names, date, *son* or *daughter* |
| **Expecting** | Parents' names, season due (*"due in spring"*) |
| **Passings** | Name, date, service details, link to the obituary |
| **Illness and hospital** | Name, *in the hospital / recovering at home / ongoing illness*, where cards or visits go |
| **Birthdays** | Name, month and day — next fourteen days |
| **Anniversaries** | Couple, month and day, years when known — next fourteen days |

Worth adding, since the list asks for anything else that belongs here:

- **Weddings and engagements**
- **Graduations** — high school, college, and adults finishing something
- **Membership milestones** — 25, 50 years at Memorial
- **Moved away or transferred letter** — so staff aren't still mailing to someone who has gone
- **Military** — deployments and homecomings

### 4.2 Two rules that keep this a church-news board and not a records system

**Situation, never diagnosis.** Illness entries say *where someone is and how to reach them*, never
what is wrong. The form offers three situations and a free line for *"Saint Francis, room 412 —
cards welcome"*; it has no field for a condition. This is the same instinct as *pointers, not
content* on the care side, applied to the staff side, and it belongs in `CLAUDE.md` in that voice:
**church-family news says where someone is, never what is wrong.**

**Only what has been shared with the church.** An expecting couple, a hospital stay: if the family
hasn't let it be known, it doesn't go on the board. The form says so beside the button. And no
entry is ever copied from Care pipelines — that surface is off, and even when it comes back, a care
record is not an announcement.

### 4.3 Who sees what

- **Illness and hospital, expecting**: staff role only (`staffOnly`), like Care. A limited account
  sees the rest of the board without them.
- **Everything else**: the whole `staff` body.

### 4.4 The shape

Members are not in `person` — `person` is the staff roster. Church-family entries name people in
text, the way a bulletin does.

```
family_news
  id            uuid pk
  kind          text check in ('new-member','baptism','birth','expecting','passing',
                               'illness','wedding','engagement','graduation',
                               'milestone','moved','military')
  names         text not null          -- 'Tom and Linda Rogers'
  on_date       date                   -- the date of the thing itself
  detail        text                   -- one line; no condition field exists
  link          text                   -- obituary, livestream, registry
  restricted    boolean                -- true for illness and expecting; set by kind
  show_until    date not null          -- default by kind: baptism-upcoming = on_date + 1,
                                       -- recent things 30 days, passings 30 days, illness 14
  posted_by     uuid → person
  created_at    timestamptz

member_date      -- birthdays and anniversaries
  id, names text, kind check in ('birthday','anniversary'),
  month smallint, day smallint,
  year smallint null                   -- anniversaries only, for "50 years"
  source text                          -- 'breeze-import' or 'manual'
```

**Birthdays store month and day, never the year.** Home only needs to know the date comes round;
a birth year adds nothing to the board and a good deal to what the database is holding. Add a check
constraint so `year` is null whenever `kind = 'birthday'`.

`restricted` is enforced by RLS (`restricted = false or is_staff_role()`), and set by a trigger from
`kind` so a form can't get it wrong.

### 4.5 Where the data comes from

- **Family news**: entered by staff, from a short form on Home or the Church family page. Anyone on
  staff can post; the author or any staff-role account can edit or remove.
- **Birthdays and anniversaries**: a **CSV import from a Breeze export**, run by the administrator —
  a screen that takes the file, shows what it will add, update and skip, and commits. Rerun it a few
  times a year. A live Breeze API sync is possible later (it would need the API key held server-side
  as a secret), but an import is an afternoon's work and a sync is a project — start with the import.

### 4.6 Minors — a decision, not a default

`CLAUDE.md` says the system does not hold minors' names, and that invariant was written for
attendee rosters. Church-family news brushes against it: children and students are baptized, and
babies are born. Recommended amendment, worded narrowly:

> **Church-family news may name a minor only for a public church milestone already announced to
> the church — a baptism or a birth. Never a birthday, an age, an address or a school.**

And in practice: **birthdays are adults only** — the import skips anyone under 18 — and **births
name the parents**, not the baby. Open for Joshua (§12).

### 4.7 Migration

`0022_church_family.sql` — both tables, the restricted trigger and policy, the birthday-year check.

---

## 5. News & Articles

### 5.1 What it is

A place for staff to share articles with each other. Nothing is gathered automatically, nothing is
copied in, and no article gets a page of its own. A post is a link someone on staff found worth
passing along, the note they wrote with it, and a category so the page stays sorted.

That's the whole feature for now. A scheduled feed, full-text reading and licensed sources were
considered and set aside on 10 November 2026 — staff sharing comes first. If that habit takes hold,
the earlier ideas can be revisited on evidence.

### 5.2 A post

- **The link** — required.
- **Title and source** — filled in for the sharer by a small Netlify function (`unfurl`) that reads
  the page's own preview tags server-side, the way a link pasted into a text message gets its
  title. Editable before posting, in case the page's title is unhelpful. The publisher's preview
  image shows as a thumbnail on the card when the page offers one. No article text is fetched or
  stored.
- **A note** — optional, the sharer's own words: *"Worth reading before Sunday's deacon meeting,"*
  or nothing at all.
- **Category** — required, one of the categories in §5.3.
- **Who shared it and when** — automatic, on every card: *Shared by Spencer · Tue 10 Nov*.
- **Post date and expiry** — post date defaults to today and can be set ahead; expiry defaults to
  two weeks out and can be changed. After it expires a post moves to the archive.

Clicking a card opens the article at its source in a new tab. Any staff member can post; the sharer
or any staff-role account can edit or remove a post.

**Comments.** Others can reply under a post — a short thread, the same pattern as comments on a
need (§3). Optional, quiet, and useful when someone wants to say *"we should talk about this."*

### 5.3 Categories

Data, not code — a small `news_category` table so a category can be added without a deploy:

**Church & Faith · World · Politics · Digital & Tech · Science**, and recommended, **Tulsa &
Oklahoma** (§12).

Politics carries a one-line description on its page — *"News and policy that affect the church —
please share reporting, not opinion pieces"* — which is the only neutrality rule a staff-shared feed
needs, and it's a request, not a gate.

### 5.4 The shape

```
news_category
  slug, name, description, position, active

news_post
  id            uuid pk
  url           text not null
  title         text not null          -- from unfurl, editable
  site_name     text                   -- 'Baptist Press', 'AP News'
  image_url     text                   -- the page's own preview image, if any
  note          text                   -- the sharer's own words, optional
  category      text not null → news_category.slug
  shared_by     uuid not null → person
  post_on       date not null default current_date
  expires_on    date not null          -- default post_on + 14
  created_at    timestamptz
  search        tsvector generated     -- title A, site_name B, note C

news_comment
  id, post_id → news_post, author → person, body text, created_at
```

There is deliberately **no body column**. The invariant for `CLAUDE.md`: **News holds links and our
own notes, never an article's text.**

**Current vs archive** is derived, never moved: current is `post_on <= today <= expires_on`;
archive is everything past `expires_on`. Same table, same search.

### 5.5 The screens

- **`/news`** — category chips across the top (*All* first), a *Share a link* button, a search field
  that reaches current and archive alike (`websearch_to_tsquery`), and the current posts as cards,
  newest first: thumbnail, title, site name, the note in the sharer's voice, *Shared by … · date*,
  category, and a comment count.
- **`/news/:category`** — the same page filtered to one category.
- **`/news/archive`** — expired posts, searchable, filterable by category and month.

The cards carry the design load: a clear headline, the site name small above it, the note set a
little apart in the serif so it reads as a person talking, generous spacing. Good enough that a
link someone took the trouble to share gets read.

### 5.6 Migration

`0023_news.sql` — the three tables, seeded categories, the generated tsvector and GIN index, RLS
(read and write: the `staff` body; update and delete: the sharer or `is_staff_role()`).

---

## 6. Leadership

One page, two sections, because two tabs for two short lists is more menu than content.

**Deacons** — the active deacons serving this year, the officers first with their offices
(Chairman, Vice-Chairman, Secretary, Finance, Building & Grounds, Personnel), then the rest of the
board alphabetically.

**Committees** — the church's committees, each with its chair and members and terms.

**Reuse the serving directory.** Widen `serving_group.kind` to add `'board'` and `'committee'`, add
the offices to `serving_role` (`chairman`, `vice-chairman`, `secretary`, `member`, `ex-officio`,
and the deacon officer titles), and parent both under a `ministry` row named *Church leadership*
that the Ministries index omits. `ended_on` already handles the September turnover: the year's new
officers are dates entered, not rows destroyed, and *"who chaired Finance last year"* stays
answerable.

**This is a directory, not access control.** `body` and its membership tables decide who can read
what; the Leadership page says who serves. Do not derive one from the other and do not let a
change on the Leadership page touch a membership row. They will sometimes disagree for a week in
September, and that is fine.

`0024_leadership.sql` — the check widening and the new roles.

---

## 7. Resources

One list, staff-editable.

```
resource
  id, name, url, description (one line), category, pinned boolean,
  added_by → person, position, active
```

Categories to start: **Ministry tools · Office & admin · Brand & design · Reference · Training**.
Seed it with what staff already reach for — Breeze, BAND, the MBC style guide, Lamplight, Roll
Call, the Communicator — and **Reference** and **Robert's Rules**, pointing at their (now hidden,
still routable) routes in this app.

Pinned items show first and on Home if Joshua wants a row of them later. Files are links in v1
(Drive, Canva); upload storage is a later PR if a link won't do.

`0025_resources.sql`.

---

## 8. Homebound

### 8.1 Built here

The Deacon Resource has a homebound list of its own for the deacons' visit rounds. That app is for
the deacons; **this dashboard is the only place staff log in**, so staff get their own homebound
list here. The two are separate on purpose and are not synced. If they need reconciling, that's a
conversation between staff and the Family Assistance committee, not a database job.

### 8.2 What it holds

One card per household:

- **Names** — *Ruth Ellison*, *Bill and June Carter*
- **Where they live** — at home or at a facility, with the facility's name and room
- **Address and phone** — what a visit or a card needs
- **Visit notes** — logistics only: *"call ahead; mornings are best; daughter Karen usually present"*
- **Last contact** — date, by whom, and how (visit, call, card), with the history behind a toggle
- **Birthday** — optional, month and day only, so homebound members show up in Home's birthdays (§4.4)
- **Active** — a household that is no longer homebound, has moved, or has passed is set inactive,
  never deleted

**The §4.2 rule applies here too: where someone is and how to reach them, never what is wrong.**
There's no health or condition field, and the visit-notes placeholder says so.

### 8.3 The screen

`/homebound` — the households as cards, sorted by *longest since last contact* first by default,
so the list itself shows who's due a visit. A sort toggle for alphabetical. Logging a contact is one
action from the card: *Log a visit / call / card* → date, defaults to today and to you.

A **Print** button for a clean one-page list — name, residence, address, phone — for a staff
member heading out on visits.

### 8.4 Who sees it

Staff role only (`staffOnly`). Addresses and phone numbers of elderly members don't belong in front
of a limited account.

### 8.5 Migration

`0026_homebound.sql` — `homebound_household` and `homebound_contact`, RLS on `is_staff_role()`,
and the catalogue check that neither table has a condition, diagnosis or health column.

---

## 9. Build order

To Claude Code, one PR each:

1. **Simplify** (§1). A day. Ships first so staff can start on the small version this week.
2. **Home, part one** (§2): the shared month component with paging, *Coming up*, the server-side
   weather function with NWS alerts, the pruned tiles.
3. **Needs** (§3, `0021`). The thing that makes Home about *you*.
4. **Church family** (§4, `0022`) and the Breeze import.
5. **News** (§5, `0023`): tables, `unfurl`, the three screens.
6. **Leadership** (§6, `0024`).
7. **Resources** (§7, `0025`).
8. **Homebound** (§8, `0026`). Could move up to third if staff need it sooner — it's
   self-contained.

Why this order: staff get a simple, working dashboard immediately, then a Home page with something
on it that needs them, then the warm content that makes them open it, then the shared links.

## 10. To Claude Design first — two screens

1. **Home** at desktop and phone, with an active weather warning and without — the board in §2.2,
   with the Field Notes screenshot attached as the composition reference and the MBC design system
   as the palette. It's the page that will be up all day.
2. **The News page** — the shared-link card, with and without a thumbnail and a note. It's the one
   new card shape in the brief, and the reason people will or won't read what's shared.

Everything else follows patterns the design system already has.

## 11. What the policy test owes

- `0021` — a signed-out session reads no needs; a limited account can read and write them.
- `0022` — a limited account reads zero `restricted` family-news rows; inserting a `birthday` with a
  year is refused; no table in `0022` has a condition, diagnosis or notes column (catalogue check,
  as the ministries test does).
- `0023` — a signed-out session reads nothing; a staff member who isn't the sharer and isn't
  staff-role cannot edit or delete another's post; `news_post` has no body or article-text column
  (catalogue check).
- `0026` — a limited account reads zero homebound rows; neither homebound table has a condition,
  diagnosis or health column.
- `0024` — the ministries catalogue check still passes with the new kinds: no attendee columns.
- The standing assertion on the governance tables is unchanged.

## 12. Open, for Joshua

1. **Minors in church-family news** (§4.6) — accept the narrow amendment, or keep the invariant
   absolute and leave baptisms of minors off the board.
2. **A sixth news category: Tulsa & Oklahoma** (§5.3) — road closures, city decisions, school
   calendars. Probably the most practically useful category for a church office.
3. **Weather glyphs** (§2.2) — allow them in the Weather tile only, or keep words alone.
4. **The sidebar on inner pages** (§2.2) — retire it for the floating bar everywhere (recommended),
   or keep a slim one.
5. **Who can remove family-news entries** — the author and any staff-role account (recommended), or
   only the author and the administrator.

---

*New invariants for `CLAUDE.md`, in its voice, when the work lands: church-family news and the
homebound list say where someone is, never what is wrong (§4.2, §8.2); news holds links and our own
notes, never an article's text (§5.4); and, if accepted, the narrow minors amendment (§4.6).
Everything else in `CLAUDE.md` stands.*
