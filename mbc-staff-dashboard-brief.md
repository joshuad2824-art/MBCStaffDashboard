# MBC Staff Dashboard — Build Brief

Prepared for Joshua Davis · Memorial Baptist Church
Handoff document for Claude Code / Cowork

---

## 1. What this is

A private, staff-only web application that makes the church's shared commitments visible in one place. It is a companion to the member-facing site, not part of it.

It exists to solve four named problems:

1. **Late communication.** Decisions are made well before the people affected are told.
2. **Unclear ownership.** Many recurring responsibilities have no owner, so they fall through.
3. **Commitments that never get scheduled.** Parent meetings, leader training, and fellowship events go years without happening.
4. **No shared picture.** Staff work in parallel without a common view of what is coming.

**Design posture:** the dashboard *facilitates*. It surfaces dates, owners, and gaps. It does not assign work, rank people, grade performance, or issue verdicts. Every field is factual. The gaps make their own argument.

---

## 2. The four surfaces

### 2.1 Huddle (home)

The default screen. Structured as the staff meeting itself, so that opening the board *is* running the meeting.

Four columns:

| Column | Contents |
|---|---|
| **Wins** | Short entries, any staff member, auto-archive after 14 days |
| **Tensions** | Where something is stuck or at risk; owner optional; stays until cleared |
| **FYIs** | For the good of the group; auto-archive after 14 days |
| **Due next** | Read-only roll-up: cadence items and pipeline items entering their window in the next 30 days |

Any staff member can post to any column. Entries are attributed and timestamped.

### 2.2 Cadence ledger

Recurring commitments that should happen whether or not anyone remembers.

Displayed as a table, sortable, with an **Unclaimed** filter pinned at the top of the page showing a count. Unclaimed is a first-class state, not a blank.

Fields per item: name, ministry, owner (nullable), interval, last held, next due, notice-by window, notes.

Derived and displayed: **next due** = last held + interval (or "never held" if null), and **announce by** = next due − notice-by window.

No red. No "overdue." The board shows dates and lets "Never held" sit in the last-held column on its own.

### 2.3 Notice log

The core instrument. For any scheduled thing that affects people outside the staff, two dates are recorded:

- `decided_on` — when the decision was made
- `notified_on` — when the affected people were told

The display shows the **notice gap** in days, plus whether it met the standard for that category. This is a measurement, not a judgment, and it accumulates into a simple trend (median gap by month, by ministry).

Entries can be created from a cadence item, from a calendar event, or standalone (e.g., a room change, a cancellation, a schedule swap).

### 2.4 Discussion board

A rolling staff conversation with a 14-day memory. Threaded, plain text, no attachments in v1.

**Retention.** A thread is purged 14 days after its **most recent activity**, not 14 days after it was started. Per-message expiry would decapitate live conversations — a question would vanish while its answers remained. Thread-level expiry keeps an active discussion whole and lets a finished one age out cleanly.

**Purge must be real and server-side.** A scheduled job deletes expired rows from the database. Not a soft-delete flag, not a UI filter. If the board says it forgets, it has to actually forget, or the promise is false the first time anyone looks at the table.

**Author controls.** Any staff member may edit or delete their own posts, enforced by Row Level Security on `author_id` rather than by hiding buttons. Deletion is a hard delete. Edits update the body in place and set `edited_at`, which displays as "edited" beside the timestamp; no edit history is retained. A deleted parent post leaves its replies in place under a "message removed" placeholder so the thread stays readable.

**Replying to a specific message.** Posts render as a flat chronological list rather than a nested tree — a staff of seven does not need indentation levels. Instead, a reply carries a reference to the post it answers, displayed as a compact quoted strip above the reply body: author name, timestamp, and the first line or so of the original, clickable to jump to it in place.

The quoted strip is rendered from a **reference**, never a stored copy of the original text. If the original is edited, the quote updates; if it is deleted, the strip becomes "message removed." Denormalizing the quoted text would mean a deleted message survives inside every reply that quoted it, which would quietly break both the author's delete control and the 14-day purge.

**Mentions.** Typing `@` opens a picker of active staff. Mentions are parsed on save into a `mention` table keyed to `staff_id` rather than stored as raw text, so that a name change doesn't orphan the link and so the unread and digest logic has something real to query. The mention renders as a chip and links to that person's items.

A mention is the one thing that may trigger an individual notification, since being named is the actual signal that something needs your attention — everything else stays in the daily digest. Each staff member can turn immediate mention emails on or off for themselves. No `@all` or `@channel` in v1; on a board this small it is only ever noise, and it trains people to skim.

**A mention is not an assignment.** Given that unclear ownership is one of the four problems this application exists to address, tagging someone in a thread must not be mistaken for handing them a responsibility — especially on a surface that erases itself in two weeks. If a mention is meant as a handoff, promote it to a Huddle entry or a cadence owner change, where it persists and has a name attached.

**Promote to durable.** Any post can be promoted to a Huddle entry, a cadence occurrence, or a notice log entry with one action. This is the safety valve: a board that forgets is a good place to think out loud and a terrible place to make a decision. Promotion moves anything that turns into a commitment onto a surface that persists before the thread expires.

**Adoption.** An unread count in the nav and a single daily digest email at a fixed hour. No per-post notifications — that turns it into another inbox and it will be muted within a week.

### 2.5 Communicator

The weekly bulletin builder, already working as a standalone file, ported in as an authenticated page. Four panels at 5.5 × 8.5, imposed onto a landscape letter sheet, printed from the browser.

Porting it changes three things:

**Weeks live in Postgres, not in one person's browser.** Today a saved week exists only on the machine that made it. In the dashboard, any staff member can open last week's issue, duplicate it, and finish it — which is precisely the handoff problem the tool was built for. A week has a `draft` / `published` state and shows who last touched it.

**Events come from the shared table, not retyped.** The communicator's "Coming Up" block reads from the same `event` records that feed the cadence ledger and the notice log. An event is entered once and appears in the bulletin, on the website, and in the ministry emails without anyone rekeying it. This is the single-spine principle the whole application rests on: one entry, many outputs.

**Publishing writes to the notice log.** Marking a week published sets `notified_on` for every event it carries, unless an earlier notification already exists. The bulletin is a real notification channel, so it should count as one — and this makes the notice gap accumulate automatically rather than depending on someone remembering to log it.

Standing content — welcome paragraph, meeting times, address, contacts, families note — moves out of per-browser settings into a `church_settings` table so it is identical for whoever builds the issue.

**Print stays exactly as built:** landscape, double-sided, flip on short edge, 100% scale, with the panel-overflow guard intact. That guard is what makes the tool safe to hand to a staff member who has never opened Canva.

### 2.6 Care pipelines

Per-person, rolling. Each entry has a person, a type, an opened date, a response window, an owner, and a status of open / touched / closed.

**This surface holds sensitive information. See §6.**

---

## 3. Seed data

### Cadence commitments

| Item | Ministry | Interval | Notice by | Last held |
|---|---|---|---|---|
| Parent meeting — Kids | Children | 2×/year | 21 days | *unknown* |
| Parent meeting — Students | Students | 2×/year | 21 days | *last held ad hoc; Joshua* |
| Men's fellowship event | Men | 4×/year | 21 days | — |
| Women's fellowship event | Women | 4×/year | 21 days | — |
| Group leader training | All groups | 2–4×/year | 28 days | *never as designed* |
| Volunteer appreciation | All | 1–2×/year | 14 days | — |
| Semester calendar publication | All | 2×/year | 30 days before semester start | — |

Notice-by rationale: 21 days is the working default for anything asking a family to reserve an evening. 28 days for leader training, since volunteers arrange coverage and childcare. 14 days for appreciation, which is internal. Calendar publication is itself a notice mechanism, so its window is measured against the start of the season it covers.

### Care pipelines

| Type | Response window | Notes |
|---|---|---|
| Guest follow-up | 72 hours | From contact card or first visit |
| New member follow-up | 30 days | Post-membership check-in |
| Baptism follow-up | 14 days | Next-steps conversation after baptism |
| Member care need | 7 days | First pastoral contact |
| Prayer request | 48 hours | Routed to whoever prays and follows up |

### Goals

Annual, entered once, reviewed quarterly. Fields: title, ministry, owner, target, quarterly note, status. Deliberately lightweight — narrative, not metrics.

---

## 4. Data model

```
staff
  id, name, role, email, active

cadence_item
  id, name, ministry, owner_id (nullable), interval_count, interval_unit,
  notice_days, notes, archived

cadence_occurrence
  id, cadence_item_id, held_on, announced_on, notes

notice_entry
  id, subject, ministry, category, decided_on, notified_on,
  audience, channel, cadence_item_id (nullable), created_by

care_entry
  id, person_name, type, opened_on, window_days, owner_id (nullable),
  status, last_touch_on, notes, sensitive (bool)

huddle_post
  id, column ('win'|'tension'|'fyi'), body, author_id, created_at,
  resolved_at (nullable)

goal
  id, title, ministry, owner_id, target, status, q1..q4 notes, year

thread
  id, subject, created_by, created_at, last_activity_at

post
  id, thread_id, reply_to_post_id (nullable), body, author_id,
  created_at, edited_at (nullable), removed (bool)

mention
  id, post_id, staff_id, created_at

event
  id, name, ministry, starts_at, location, detail, audience,
  owner_id (nullable), cadence_item_id (nullable), public (bool)

communicator_week
  id, service_date, series, sermon_title, cover_verse, verse_ref,
  order_json, notes_json, event_ids[], prayer_lines[], giving_json,
  status ('draft'|'published'), updated_by, updated_at

church_settings
  id (singleton), meeting_times, address, welcome_text,
  families_text, contact_lines, ways_to_give
```

`reply_to_post_id` stores a reference only — quoted text is rendered live from the referenced post, never copied, so that deletion and the nightly purge remove it everywhere at once. Mentions cascade-delete with their post.

Retention job: nightly, `DELETE FROM thread WHERE last_activity_at < now() - interval '14 days'`, cascading to posts and mentions. Any insert or edit on a post sets its thread's `last_activity_at`.

Derived, never stored: next_due, announce_by, notice_gap_days, days_open.

---

## 5. Recommended stack

The existing church site is static HTML deployed on Netlify from GitHub. This application needs real accounts and a real database, so it is a different class of thing.

- **Frontend:** Vite + React + TypeScript
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Hosting:** Netlify, separate project from the public site
- **Auth:** email magic link, invite-only, no self-registration
- **Roles:** `staff` (full read/write), `limited` (all surfaces except care pipelines)

Rationale: Supabase gives auth and row-level security without standing up a server, and RLS is what makes the sensitive-data requirement in §6 enforceable at the database rather than in the UI.

---

## 6. Sensitive data — required constraints

Care pipelines and prayer requests contain named individuals' health, family, and spiritual circumstances. This is the part of the build that must not be casual.

- Care entries and prayer requests are readable only by users with the `staff` role, enforced by Row Level Security in Postgres, not by hiding UI elements.
- Care entries never sync to, appear in, or share a database with the member-facing site.
- An entry marked `sensitive` shows only the person's first name and the owner on any shared or projected view. Full detail requires opening the record.
- Closed care entries are archived after 12 months and purged after 24 unless flagged.
- No care or prayer content is ever pulled into the printed communicator, even by copy-paste convenience features.

The discussion board will accumulate named members' circumstances whether or not anyone intends it to. It is staff-role only, subject to the same 14-day purge as everything else on it, and excluded from present mode.

If the dashboard is ever displayed on a screen during a staff meeting, the Huddle and Cadence surfaces are safe to project. **Care pipelines and the discussion board are not.** Build a "present mode" that hides them.

---

## 7. Build order

**Phase 1 — the argument.** Cadence ledger with Unclaimed filter, the Huddle board, and the discussion board. This is the smallest thing that changes a Monday meeting. The discussion board belongs here rather than later — it is the surface that gives staff a reason to open the site between Mondays, which is what keeps the rest of it alive.

**Phase 2 — the instrument.** Notice log with gap calculation and monthly median.

**Phase 3 — the pastoral layer.** Care pipelines with RLS. Do not start this before Phase 1 has been in weekly use.

**Phase 4 — the tools.** Port the communicator builder in as an authenticated page (§2.5), reading events from the shared table and writing `notified_on` back to the notice log on publish. One entry, many outputs. This is also the phase that makes the dashboard *useful to someone who doesn't care about accountability* — it hands the staff a task that gets easier, not just a board that watches. Worth remembering when introducing the whole thing.

**Phase 5 — goals.** Annual, quarterly review.

---

## 8. Design system

Inherit the MBC brand guide tokens exactly:

- Lamplight `#A8613F` · Yale Sage `#4F7A5A` · Bark `#3A322B`
- Cream `#F8F3EB` · Parchment `#FFFDF9` · Rule `#E7DCC9`
- Lora for headings and any scripture; Lato for interface, labels, and data
- Left-aligned, generous rule lines, tabular numerals for all dates and gaps
- No status reds. Neutral type carries every state, including "Never held."

The absence of alarm colors is a deliberate design decision, not an oversight. The board's authority comes from being plainly factual.
