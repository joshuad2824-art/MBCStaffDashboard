# MBC Dashboard — expansion brief

*The third brief at the repo root. Written 15 September 2026. It assumes
`mbc-staff-dashboard-brief.md`, `mbc-deacons-dashboard-brief.md` and `CLAUDE.md` have been
read, and it does not repeat them.*

Four pieces of work, in the order they should be built:

| | | |
|---|---|---|
| **A** | The manual, on both sides | Bylaws, policies and procedures reachable and genuinely searchable by staff and deacons alike, on a surface built for someone opening it twice a year |
| **B** | Ministries, classes and groups | Who teaches what, who serves where — on the staff side, edited by staff |
| **C** | View as | An administrator sees the application the way a given seat sees it, for checking access and for presenting in a meeting |
| **D** | mbctulsa.team | The domain, and what has to move with it |

A and C are small: both sit on seams the application already has. B is the largest piece of new
ground in the system since Care pipelines. D is an afternoon, with one step that breaks sign-in
for everybody if it is missed.

---

## 0. What is already true

Worth stating plainly, because two of the three features are partly built and the brief below is
mostly about *finishing and reshaping* rather than starting.

**The governance corpus is already in the database.** `governance_document` and
`governance_finding` (`supabase/migrations/0009_year_and_reference.sql`), loaded by
`supabase/governance/build-seed.mjs` from the transcription, with the document kinds widened to
five in `0013`. `src/screens/Reference.tsx` renders it with a sidebar, substring search and the
discrepancy docket attached. It lives in the database rather than the bundle precisely so that
*who may read it* is a policy and not an accident of hosting — which is the reason workstream A
is a small change rather than a large one.

**The corpus is deacon-only.** Both read policies are `is_on_deacon_side()`. No staff member
who is not also a deacon can read a line of it today.

**Three documents are deliberately absent** and stay absent. `build-seed.mjs` refuses every file
marked `sensitivity: restricted` — the salary plan, the performance standards, and Policy E006 —
and names each one on stderr. `CLAUDE.md` lists them among the things that never enter the system
in any form, behind any gate. Nothing in this brief changes that, and workstream A must not be
the thing that quietly does.

**There is no concept of a group anywhere in the application.** `person` has a free-text `role`
string. `Ministry` is a hard-coded union of seven strings in `src/data/types.ts`. Workstream B is
new ground.

**`viewAs` exists but is one bit wide** — staff or limited — and `context` is one bit wide, staff
side or deacon side. Present mode exists and deliberately omits Care pipelines and the discussion
board. Workstream C widens the first of those two and leaves everything else alone.

**Migrations run to `0013`.** The next is `0014`.

---

## A. The manual, on both sides

### A.1 What changes, in one sentence

The corpus gains an audience so the staff can read the part of it that concerns them, a section
index so search can point at a paragraph instead of a document, and a front door built for
someone who opens it twice a year.

### A.2 Reach — who reads what

One corpus, not two. A second shelf of staff documents would drift from the first within a year,
and then the question "what does the manual say" would have two answers.

Add `audience text[]` to `governance_document`, on the same pattern `0008` established for `event`
and `thread`: the policy is `in_audience(audience)`, the array is never empty, and widening is
allowed where narrowing is not. Most of the manual goes to `{staff,deacon}` — the constitution,
the bylaws, the building and property policies, the procedures and forms that office staff
actually execute. A smaller set stays `{deacon}`: the documents about how the Board governs
itself, which a staff member has no occasion to read and some occasion to misread.

Three rules on this, and the third is the one that matters:

1. **Default `{deacon}` in the migration, then widen document by document.** A migration that
   defaults to `{staff,deacon}` publishes the whole manual to the staff in one statement, in the
   dark, and nobody reviews it. Defaulting the other way means the surface is empty for staff on
   the day it ships and fills as Joshua marks documents — visibly, one at a time. This is slower
   and it is correct.
2. **Audience is data, not code.** It belongs in the transcription's front matter
   (`audience: [staff, deacon]`) so `build-seed.mjs` carries it, and a re-load does not undo a
   decision made in SQL.
3. **The restricted three are not an audience question.** They are not in the database and this
   migration must not create a path for them. If the Personnel committee ever needs the salary
   plan in-app, that is a separate conversation with a different answer, and the honest default
   is that it stays on paper.

The docket (`governance_finding`) stays deacon-only. It is a record of where the Board's own
governing documents disagree with themselves, it is working material for the chairman, and a
staff member reading finding 12 out of context learns nothing useful and several wrong things.

### A.3 Search — sections, not documents

The present search counts substring matches in a whole document body and puts a number beside a
title. For a corpus of sixty-five files that is a list of places to go look. What a person wants
is the paragraph.

**New table `governance_section`.** The loader already parses the transcription; have it emit
sections as well as documents:

```
governance_section
  id            uuid pk
  document_id   uuid → governance_document
  heading_path  text[]   -- ['Article II', 'B. The Deacon Board', '§3 Officers']
  anchor        text     -- stable slug, the URL fragment
  citation      text     -- 'Art. II.B §3 ¶4' — as the docket writes them
  body          text     -- markdown, as transcribed
  position      integer
  search        tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(citation,'')), 'A') ||
                  setweight(to_tsvector('english', array_to_string(heading_path,' ')), 'B') ||
                  setweight(to_tsvector('english', body), 'C')
                ) stored
```

GIN index on `search`. Read policy inherits the parent document's audience — one `exists` against
`governance_document`, so a single audience decision governs both tables and they cannot drift.

**One RPC, `search_manual(q text)`**, security invoker so RLS does the filtering:
`websearch_to_tsquery('english', q)` against `search`, `ts_rank_cd` for order, `ts_headline` for
the snippet. `websearch_to_tsquery` is the right parser because it takes what people actually
type — `"church clerk"` in quotes, `budget -audit` — without teaching anybody an operator.

Two things it must also do, because the manual is a legal document and not prose:

- **Citations are searchable as strings.** Somebody types `A009` or `Art. II.B`. Full-text
  tokenisation mangles both. Add a trigram index (`pg_trgm`) on `citation` and `code`, and have
  the RPC union an exact/prefix citation match into the results at the top, above the ranked
  text hits. A man who types a citation wants that paragraph, not the eleven places it is
  mentioned.
- **A result is a section, with its document named.** `Bylaws · Art. II.B §3 — Officers of the
  Board` over two lines of snippet with the matched words marked. Never a bare document title.

**Keep the client-side fallback.** `LocalRepository` and seed data are what let somebody work on
this screen with no secrets, and that is worth preserving: a plain substring pass over the seeded
sections, same result shape, no ranking. The screen must not know which one answered.

### A.4 The screen — a front door, then the text

This is the part Joshua asked for specifically, and it is a design change more than a technical
one. Today `/reference` opens with everything face-up: a sidebar of every document in five groups,
and the first document's full text beside it. That is a good surface for someone who already knows
where he is going and a poor one for everyone else.

Three states, in order:

**1 · The landing.** Nothing but a search field and the categories.

- The search field is the first thing on the page and the first tab stop — full width of the
  measure, 56px tall, 18px type, labelled `Search the bylaws, policies and procedures`. Do not
  autofocus it; a focused field on load steals the screen reader's opening and jumps the page on
  a phone.
- Under it, the categories as cards, not as a list: **Constitution · Bylaws · Policies ·
  Procedures and forms · Derived reference**, and for the deacon side a sixth, **Where the manual
  disagrees with itself**. Each card carries its count and one plain line saying what is inside
  it — *"How the church is organised and governed"*, *"Numbered policies, A through E — property,
  finance, personnel, safety"*. The count is a number, not a badge, in tabular figures.
- Policies are the one category too large to open flat. Its card opens to the letter series with
  a line each, and the documents under the series.
- Below the categories, `Recently opened` — the last five this person opened, per person, local
  to their browser. An infrequent user is usually going back to the thing he looked at last time.

**2 · Results.** The categories give way to the list; the search field stays where it is, so the
page does not reorganise itself under someone's hands. Grouped by document, section hits beneath.
Empty state says `Nothing in the manual says that` — which the current screen already gets right.

**3 · The document.** The section, not the top of the file. A contents rail down the left built
from `heading_path`, the body at 17px on a 72-character measure, and the section arrived at
marked for a beat. The docket block that already exists stays, on the deacon side. A **Print**
button that prints the document clean — deacons will print, and a page that prints the navigation
is a page that gets photographed on a phone instead.

**The older-reader rules**, from the repo's own `Adult Learning/13_Clarity_and_Accessibility.md`:

- Body type on this surface is 17px, not the 16px the rest of the application uses, and no
  12px meta anywhere on it. The manual is read, not scanned.
- Every control keeps the 44px minimum the design system already sets.
- Nothing is carried by colour alone — the match count is a number, the marked text is marked
  *and* underlined.
- Breadcrumb on every document page: `Reference › Policies › A009`. Someone who followed a
  citation four levels deep needs to know where he is.
- One idea per screen. No accordions inside accordions.

Everything else the design system already decides: Lora and Lato, the tokens, no icons, no
gradients, no status reds.

### A.5 What must not change

`CLAUDE.md`'s invariant stands: **nothing writes the corpus through the API.** No insert, update
or delete policy on `governance_document`, `governance_finding`, `governance_section` or
`obligation`. The bylaws are amended in a church conference, transcribed, and loaded by the
administrator. The day a form on this site can edit them is the day the transcription stops being
a transcription.

### A.6 Migrations

- `0014_governance_reach.sql` — `audience text[]` on `governance_document`, defaulting `{deacon}`,
  non-empty check, read policy rewritten to `in_audience(audience)`. Docket unchanged.
- `0015_governance_search.sql` — `governance_section`, its generated tsvector, the GIN and trigram
  indexes, the inherited read policy, and `search_manual()`.

---

## B. Ministries, classes and groups

### B.1 Scope, and what this is not

**It is:** the ministries of the church, the groups inside them — Sunday school classes, community
groups, ministry teams — and who serves in each one, in what role, for what term. All of it
editable by staff, from the application.

**It is not a directory of members, and it is not Breeze.** No attendee rosters. No children's or
students' names. A group record says *this class meets here at this hour and these three adults
lead it*; it never says who sits in the chairs. The moment it does, this becomes a system holding
minors' names on a Netlify-hosted site, and that is a different project with a different
conversation about consent and retention in front of it.

Write that sentence into `CLAUDE.md` as an invariant when this lands, in the same voice as
*pointers, not content*: **groups hold who serves, never who attends.**

### B.2 The shape

```
ministry
  id, slug, name, description, position, active
  -- Children, Students, Men, Women, Music, Preschool, Missions, Adults …

serving_group
  id, ministry_id → ministry
  kind          text  check in ('class','community-group','team')
  name          text        -- '5th & 6th Grade', 'Tuesday Night — Davis', 'Sound & Media'
  meets         text        -- 'Sundays 10:00 AM' — a sentence, not a schedule engine
  location      text        -- 'Student Building, Room 4'
  audience_note text        -- 'Grades 5–6' — free text, never a roster
  notes         text
  active        boolean
  archived_at   timestamptz

serving_role      -- a small enumerated table, not free text
  slug, name, position
  -- teacher, co-teacher, apprentice, leader, co-leader, host, volunteer, coordinator

serving_assignment
  id, group_id → serving_group, person_id → person, role_slug → serving_role
  started_on date, ended_on date null
  primary boolean       -- the one to call
```

**`ended_on`, not deletion.** A teacher who stepped down in March is a fact about last spring, and
the person who asks "who had that class before Sarah" is asking a real question. The list shows
current assignments; ended ones are behind a toggle. This also means the September turnover is a
date entered, not a row destroyed.

**Roles are enumerated.** Free-text roles become eleven spellings of "volunteer" inside a year,
and then nothing can be counted.

**Access.** Everything here reads to the whole `staff` body — a limited account may read the
directory, which is the point of having one. Writing is `is_staff_role()`. Nothing here is on the
deacon side in v1; a deacon who is also staff sees it from the staff side.

### B.3 The `Ministry` union — read this before writing any code

`src/data/types.ts` declares:

```ts
export type Ministry = 'All' | 'Children' | 'Students' | 'Men' | 'Women' | 'Music' | 'All groups'
```

and `cadence`, `event`, `notice` and `goal` all carry it. That union is the single biggest source
of breakage in this workstream, and it is why the migration is split in two.

**Do not convert those four columns to foreign keys onto `ministry.id`.** That is four table
rewrites, four repository mappings, four screens' filters and a data migration, all to gain
referential integrity the application does not presently need.

**Do this instead.** `ministry.name` is unique. The four existing text columns get a foreign key
*on the name*, not the id. The seed rows are exactly the seven strings already in use, so the
constraint is satisfied on the day it is added and no data moves. In TypeScript, `Ministry`
becomes `string` and `MINISTRIES` becomes a list loaded from the table instead of a constant in
`src/data/seed.ts`. The chips in Cadence and the Notice log, and the select in the Calendar, then
render whatever the table holds.

The cost is honest and worth naming: `Ministry` stops being a union, so TypeScript stops catching
a misspelled ministry at compile time. Postgres catches it instead, at write time, which is where
it actually matters — and the application gains the ability to add a ministry without a deploy,
which is the whole point.

`'All'` and `'All groups'` are filter sentinels, not ministries. Keep them out of the table and
handle them in the filter, where they belong.

### B.4 The screens

**`/ministries`** — the index. One card per ministry: its name, how many groups, how many people
serving, and — the number that earns the surface — **how many positions are open.** The
application already has this instinct; the Cadence ledger's unclaimed filter is the same idea. A
class with no teacher named is the church's version of an unclaimed commitment.

**`/ministries/:slug`** — the ministry. Its groups as rows: name, when and where it meets, and
the people serving with their roles, the primary contact first. Inline editing throughout, on the
pattern the People page already sets — no modal, no separate edit mode, and *Add someone…* creating
a roster entry at `access: 'none'` and assigning it in one motion, exactly as `OwnerSelect` does
today. Leaving a page to create a record first is how a class ends up with no teacher on file.

**Archived groups** behind a toggle, never deleted.

**Where it shows up elsewhere**, and this is what makes it more than a list:

- Today at Memorial gains one line in the overview cards: `3 groups without a leader named`,
  linking through. It follows the existing counter pattern and it is the only number here worth
  putting on the landing screen.
- The Cadence ledger's ministry filter reads the table.
- The Communicator's *Coming Up* can pull a group's meeting line, so the bulletin stops being
  retyped — which was gap 3 in the original staff brief.
- Present mode can draw the open-positions count. It is logistics, not pastoral care, so it is
  safe on a wall.

### B.5 One decision to make deliberately, not by default

A serving directory invites a "cleared to serve" or "background check current through" field.
**Leave it out of v1**, and decide it on purpose rather than by someone adding a column.

The reasoning: screening lives adjacent to Policy E006, which `CLAUDE.md` says never enters this
system in any form, behind any gate. Even a bare date is a record about a named person's fitness
to be near children, sitting in a web application with a growing number of accounts. The office
file and Breeze are where that belongs today, and they are not obviously the wrong place.

If the Personnel committee later wants it in-app, it is its own brief, and the questions it has to
answer first are who may read it, who may set it, what happens when it lapses, and what the
application does — nothing, one hopes — when it does.

### B.6 Migrations

- `0016_ministries.sql` — the four tables, RLS, seed of the seven existing ministry names and the
  serving roles.
- `0017_ministry_reference.sql` — the four foreign keys onto `ministry.name`, separately, so that
  if one of them fights it can be reverted without taking the directory with it.

---

## C. View as

### C.1 What it is, precisely

An administrator chooses a **seat** — not a person's data — and the application redraws as that
seat: the sidebar it would have, the routes it would allow, the controls it would offer. The rows
on screen remain the administrator's own.

That distinction is the whole feature, and it is worth being blunt about why, because the obvious
version is the wrong one. True impersonation — seeing Gary's screens with Gary's data — would let
an administrator who does not sit on Family Assistance read that committee's room, and would put
members' care records in front of whoever holds the toggle. The confidentiality of that room is
not a UI convention; `body.confidential` is a column and the policies are written around it.

And the honest thing is that impersonation is not what the question needs. *"What can the Building
& Grounds men open, and what can they not?"* is a question about the shape of access, and the
shape is exactly what a seat-shaped preview shows.

### C.2 The rules

1. **It narrows, never widens.** Same invariant the context toggle already lives under. Selecting
   a seat can only ever remove surfaces relative to what the administrator's own membership
   allows, plus the labelled stubs in rule 3.
2. **RLS does not move.** Not one policy changes for this feature. If a future change to view-as
   requires a policy change, the feature has been misunderstood — say so and stop. The nav and the
   router are the two layers being previewed; the third layer is not in play.
3. **A surface the administrator does not hold renders as a stub.** In view-as, and only in
   view-as, a surface belonging to a body he is not in appears in the sidebar and opens to a
   labelled panel: *"Family Assistance committee room. This seat has this surface. Its contents
   are not shown here — you are not a member of this committee."* This is the one place the
   application deliberately shows someone a door they cannot open, and it earns the exception:
   the question being asked is about somebody else's access, and a truthful answer requires
   naming the room. Outside view-as, *absence, not greyed-out* stands unchanged.
4. **Read-only while active.** No writes of any kind. Every composer, button and form is gone —
   not disabled. An administrator checking what the Personnel men can see must not be able to
   post to their discussion board by accident while wearing their seat.
5. **It is loud.** A persistent bar across the top, in the dark band the design system already
   uses: `Viewing as — Deacon, Board seat, no committee · Read only · Exit`. It does not survive a
   reload, and it does not survive sign-out.
6. **Who holds it.** Not `is_staff_role()` — that is seven people. A new `person.admin` boolean,
   Joshua today, the Senior Pastor if he wants it. It gates nothing in the database; it decides
   who is offered the control.

### C.3 The seats

A fixed list, composed from real bodies, each a set of `(body, role)` pairs:

| Seat | Bodies |
|---|---|
| Staff · staff role | `staff`, access `staff` |
| Staff · limited account | `staff`, access `limited` |
| Deacon · Board seat only | `deacon-board` |
| Deacon · Board + Finance | `deacon-board`, `committee:finance` |
| Deacon · Board + Personnel | `deacon-board`, `committee:personnel` |
| Deacon · Board + Building & Grounds | `deacon-board`, `committee:building-grounds` |
| Deacon · Board + Family Assistance | `deacon-board`, `committee:family-assistance` |
| Committee chair | any of the above, with `is_chair_of` true |
| Both sides | `staff` + `deacon-board` — Jacob's seat, and Joshua's |

Offer a person's name as a *shortcut that resolves to their seat set* — "View as Wes Watkins'
seat" filling in Board + Secretary — with the label continuing to read as a seat. The shortcut is
convenience; the frame stays honest about what is being previewed.

### C.4 Presenting

The second use, and it needs almost nothing extra. View-as sets the frame; present mode
projects it. Compose them: an administrator picks the Board seat, enters present mode, and the
room sees the deacon side at projection type.

Two constraints carry over unchanged. Care pipelines and the discussion board are never drawn in
present mode, on either side, whatever seat is selected — that rule exists because the screen is
pointed at a wall, and a seat selection does not change what is on the wall. And the care list on
the deacon side is pointers only by construction, so it is already safe to project; nothing needs
special handling.

One addition worth having: present mode should carry the seat name in its footer. A projected
screen that does not say whose view it is invites the room to assume it is everyone's.

### C.5 Implementation

Genuinely small, which is the sign the model was right.

- `src/screens/surfaces.ts` — `Viewer` already carries `bodies`, `viewAs`, `sides` and `context`,
  and `canOpen()` already answers the question. Add `previewSeat?: Seat` and have `surfacesFor()`
  compose it. The existing `canOpen` logic does not change; a preview seat narrows the viewer
  before it is asked.
- `src/session/session.tsx` — preview state beside `viewAs` and `presentMode`, both of which
  already work this way. The existing "viewing as limited" toggle becomes one entry in the new
  list rather than a separate control.
- `src/components/shell/` — the bar, and a `<Stub>` for rule 3.
- **No migration**, except `person.admin`, which can ride along in `0016`.

The one piece of care: rule 4 has to be real. A write blocked by hiding a button is the failure
mode `CLAUDE.md` names by name. Put the guard in the store — `mutate()` refuses while a preview
seat is set, and says so — so that a composer someone forgot to hide cannot write anyway.

---

## D. mbctulsa.team

### D.1 The shape

Apex, one application, both sides. `mbctulsa.team` is the dashboard; `www` redirects to it; the
existing `*.netlify.app` URL keeps working through the transition. Sign-in is one door and the
existing *Which side today?* screen routes the two men who hold both.

No subdomain per side. The application's whole architecture is *one app, one database, one
sign-in, assembled from membership* — two hostnames would be the first place that stops being
true, and the first thing someone would ask to make different.

### D.2 The step that breaks everything if it is missed

**Supabase Auth has an allow-list of redirect URLs, and magic links are minted against it.** Set
Site URL to `https://mbctulsa.team` and add every URL that must keep working —
`https://mbctulsa.team/**`, `https://www.mbctulsa.team/**`, the `.netlify.app` origin, and
`http://localhost:5173/**` — **before** the DNS cuts over. Miss it and every emailed link lands on
an error, for everyone, at once, with no obvious cause. It is the single most likely way this
goes wrong.

### D.3 The rest

**DNS.** Netlify DNS is simplest if the registrar allows delegation — apex and `www` are then two
records Netlify manages and the certificate is automatic. Otherwise: `ALIAS`/`ANAME` at the apex
to the Netlify load balancer (a `CNAME` at an apex is not valid and some registrars will let you
try anyway), `CNAME` for `www`. Verify the certificate covers both names before announcing it.

**Keep the people out.** This is a private application on a public, memorable domain, so it will
be found. `netlify.toml` gains headers — and the SPA redirect already there means every path
returns the app, so these apply everywhere:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow, noarchive"
    X-Frame-Options = "DENY"
    Referrer-Policy = "strict-origin-when-cross-origin"
    X-Content-Type-Options = "nosniff"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

Plus a `public/robots.txt` disallowing everything. Neither is a security control — there is no
sign-up and RLS is the gate — but a church staff dashboard turning up in a search for the church's
name is the kind of surprise that costs trust with the very people who need to use it.

**Two things to look at while the domain is being set up**, both of which belong to this
workstream because this is when the application becomes findable:

- **The repository is public.** That is defensible — the anon key is public by design and the
  corpus lives in the database, not the bundle, so the manual does not ship in the JavaScript.
  But `src/data/seed.ts` carries real staff names and real `@memorialbaptist.com` addresses, and
  those are in the built bundle as well as on GitHub. The staff page publishes most of them
  already, so this is a judgement call rather than a problem — but make it deliberately. Fictional
  seed names cost nothing and remove the question.
- **The passcode in the `mbcsite` README** flagged in an earlier session is a different repository
  and still wants dealing with.

### D.4 Order

DNS and certificate → Supabase redirect URLs → headers and robots → announce. Not the other way
round.

---

## E. Build order and handoff

**To Claude Code, in this order:**

1. **A — reach** (`0014`). One column, one policy. Ships in a day and lets Joshua start marking
   documents while everything else is being built. Nothing is visible to staff until he does,
   which is the safe direction.
2. **D — the domain.** Independent of everything, and better done while the user base is still
   small enough that a sign-in outage is a phone call rather than a Sunday.
3. **C — view as.** Small, self-contained, and it is the instrument for verifying that A landed
   correctly. Build it before B, not after, and the first thing it can be pointed at is the
   question *"can a limited account read the manual, and should it?"*
4. **A — search and screen** (`0015`). The larger half.
5. **B — ministries** (`0016`, `0017`). Last, and on its own branch. It is the only workstream
   that touches surfaces that already work.

One PR per numbered item, per the repo's convention. `0017` is its own PR even though it is four
statements, because it is the one that can break the Cadence ledger.

**To Claude Design first — two screens, and only two:**

1. **The reference landing.** The search field, the category cards, recently opened. This is the
   surface Joshua is asking to be more welcoming, it is the one an infrequent user meets first,
   and it is the only genuinely new *visual* problem in this brief. Worth seeing at the three
   states in §A.4 before it is coded.
2. **The ministry page** (`/ministries/:slug`) — one ministry with its groups and its serving
   teams, as the pattern the index and the group detail follow. Inline editing of a list of
   people inside a list of groups is a layout problem worth solving once, on paper.

Everything else goes straight to code. View-as is a bar and a stub panel; the domain is
configuration; the ministry index is cards the design system already describes. Mocking those up
would be redrawing decisions already made.

The design note from the deacons' brief still applies and applies hardest to §A.4: **this is for
men who open it monthly, some of whom are in their seventies.** More labelling, more obvious
affordances, less cleverness than a daily user needs.

---

## F. What the policy test owes

`supabase/tests/policies.sql` is the file that actually proves any of this. Every migration here
adds its negative case, and none of them merge without one:

- `0014` — a `limited` staff account reads zero rows of any `{deacon}` document; a staff account
  reads zero rows of `governance_finding`; a signed-out session reads nothing from either.
- `0015` — `search_manual()` called as a staff account returns zero sections belonging to a
  `{deacon}` document. Run the search as each kind of account, not just the read.
- `0016` — a signed-out session gets nothing; a `limited` account can read `serving_group` and
  write nothing to it.
- `0017` — a ministry name not in `ministry` is refused on `cadence`.
- **A standing assertion, added once and kept**: `governance_document`, `governance_finding`,
  `governance_section` and `obligation` have no insert, update or delete policy. The existing test
  already checks this for three of them; the fourth joins it.

View-as adds no case, because it adds no policy. That is the proof it was built right.

---

## G. Open, for Joshua

1. **Which documents go to `{staff,deacon}`?** A pass through the sixty-five transcription files,
   marking front matter. Probably an evening, and it is the gating task for A — the migration is
   useless until it is done. Worth doing with the index open and the discrepancy docket beside it.
2. **Does a `limited` account read the manual at all?** A limited account today is a deacon
   without a staff role. Under §A.2 he reads what his bodies allow — but if volunteers ever hold
   limited accounts, "the church's policies are readable by anyone with a login" becomes a
   sentence worth having decided rather than discovered.
3. **Screening status in the ministry directory** — §B.5 recommends out. Confirm, so nobody adds
   the column later thinking it was an oversight.
4. **Seed names.** Real or fictional, now that the bundle gets a memorable address.
5. **Still open from the deacons' brief**, unchanged and both still worth settling before the
   first minutes are published: whether the dashboard's minutes or the Church Clerk's copy is the
   record of file, and what happens to a deacon's memberships when his term ends each September.

---

*Nothing in this brief changes the invariants in `CLAUDE.md`. Two are extended: groups hold who
serves and never who attends (§B.1), and view-as narrows and never widens and moves no policy
(§C.2). Both belong in that file when the work lands.*
