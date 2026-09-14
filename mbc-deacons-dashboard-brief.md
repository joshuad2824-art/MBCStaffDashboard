# MBC Deacons' Dashboard — Build Brief

Prepared for Joshua Davis · Memorial Baptist Church
Extension of `mbc-staff-dashboard-brief.md` · Handoff document for Claude Code / Cowork
Drafted 14 September 2026, against the 2-11-2025 Bylaws, Policies & Procedures Manual

---

## 1. What this is

A deacons' side of the existing staff dashboard: same application, same database, same
sign-in. What a person sees is assembled from which bodies they belong to, not from a rank.

It exists because the deacon year has real obligations with real dates — a monthly Treasurer's
report, committee reports, an attendance rule that removes men automatically, a budget calendar
that starts on 10 October — and right now those live in people's heads, in email, and in a
`.pub` file on a server nobody off the church network can reach.

**Design posture, inherited from the staff brief and worth restating:** the dashboard
*facilitates*. It surfaces dates, owners, and gaps. It does not assign work, rank people, grade
performance, or issue verdicts. On the deacon side that posture carries more weight than it does
on the staff side, because several of the things this board does — attendance, discipline,
family assistance — could very easily become a system that judges men rather than one that helps
them serve.

### The organizing idea

The staff dashboard is organized around a week. **This one is organized around the monthly Board
meeting**, because that is what the bylaws organize the office around: the Board "will convene
monthly" (Art. II.B §3 ¶5), the Treasurer reports "at each regular monthly meeting" (Art. II.C
¶2), and attendance is counted per deacon year against that meeting (¶12).

Everything on this dashboard flows toward or away from one recurring event.

- **Before:** committee reports come due and get submitted; the agenda assembles itself from
  recurring obligations plus whatever was tabled last month.
- **During:** attendance is recorded; motions are captured with their disposition.
- **After:** the secretary assembles minutes from what is already there rather than retyping it;
  anything tabled becomes next month's old business automatically.

Build it as a pile of features and it will be a pile of features. Build it around the meeting and
it coheres.

---

## 2. Four decisions that shape everything else

### 2.1 Membership, not a ladder

The current model is `none < limited < staff`, gated by `is_staff_role()`. A deacon does not sit
anywhere on that ladder. He needs *more* than limited in some rooms, *less* than staff in others,
and there are rooms staff should not be in at all.

It breaks on MBC's actual people immediately. The Senior Pastor is staff *and* sits with the
deacons. The chairman is a deacon *and* runs student ministry. The Finance chair is a deacon
*and* Treasurer of the church. One enum cannot say any of that.

**Replace the axis.** Instead of *how much access*, ask *which bodies do you belong to*.

```
body
  id, slug, kind ('staff' | 'board' | 'committee'), name,
  parent_body_id (nullable), confidential (bool), active

membership
  id, person_id, body_id, role_in_body ('chair' | 'member' | 'ex_officio'),
  term_start, term_end (nullable), active
```

The bodies at MBC on day one:

| slug | kind | who |
|---|---|---|
| `staff` | staff | the existing staff roster |
| `deacon-board` | board | the twelve elected deacons, plus the Senior Pastor ex officio |
| `deacon-body` | board | all ordained deacons — wider than the Board |
| `committee:finance` | committee | seven members; chair is Treasurer |
| `committee:personnel` | committee | five members |
| `committee:building-grounds` | committee | |
| `committee:family-assistance` | committee | **confidential** |

The Senior Pastor sits on the Board and in every committee meeting, so he holds an `ex_officio`
membership in each body. That is a membership row, not a special case in code — which is the
point of the model.

Church standing committees under Article III — Nominating, Audit, Missions, Member Care, Meal
Hospitality, Safety & Emergency Response and the rest — fit the same table when they are wanted.
They are deliberately out of scope for v1.

RLS helpers replace `is_staff_role()`:

```sql
my_bodies()            returns setof text     -- slugs, security definer
is_member_of(slug)     returns boolean
is_chair_of(slug)      returns boolean
```

`is_staff_role()` stays, implemented as `is_member_of('staff')`, so nothing already written has
to be rewritten to keep working.

### 2.2 Absence, not greyed-out

**If you do not have access to a surface, you do not see that it exists.**

This is not cosmetic. A disabled `Family Assistance` tab visible to every deacon announces that a
confidential committee exists and has content in it, and invites exactly the question the
confidentiality was meant to prevent. The same is true in the other direction: staff do not need
to see that the Board has a room they are not in.

Three layers, because hiding a link is not security:

1. **Navigation** is assembled from `my_bodies()`. Surfaces you have no membership for are not
   rendered — not disabled, not dimmed, not there.
2. **Routes** refuse rather than render empty. Typing the path gets you the same answer as not
   knowing it existed.
3. **RLS** returns no rows regardless. This is the only one of the three that is actually a
   security control; the other two are so the interface tells the truth.

`src/screens/surfaces.ts` becomes a function of membership rather than a static record, and
`staffOnly?: boolean` becomes `bodies: string[]`.

### 2.3 Pointers, not content

**The deacon side records that care is happening, who owns it, and when it last happened. It
never records the circumstance.**

This is the constraint that keeps the whole system safe to build, and it is a deliberate choice
rather than a limitation to work around later.

| Recorded | Not recorded |
|---|---|
| A household is assigned to a deacon | Why they need care |
| Date of last contact | What was said |
| Assistance approved, amount, date, approving members | The family's situation |
| A motion's text and disposition | Discussion that preceded it |
| That a committee reported | Confidential detail inside the report |

Three things stay out of the system entirely, with no partial version:

- **Church discipline.** Article II.B §3 ¶6 and §2 ¶5 point toward the quietest faithful
  resolution. A database row is the opposite of that.
- **Anything under E006.** The abuse-response policy holds confidentiality inside three named
  people. It does not belong in a system twelve men can sign into, and no access rule makes that
  untrue.
- **Contribution records.** Policy A002: "Contributions by any individual is confidential and not
  to be shared with others." Giving data never touches this application.

Family Assistance is the sharpest test of the pointers rule, and it passes: the committee needs
to track approvals, amounts, and the third-party invoice requirement in D002 §6. It does not need
to write down why a family is struggling. Those are separable, and separating them is the whole
design.

### 2.4 Two people hold both sides

Of the staff, only the Senior Pastor needs the deacon side. The chairman needs both because he is
the chairman and because he built the thing. Everyone else belongs to one side or the other.

Both of them get memberships in both sets of bodies — no new concept — and a **context toggle** in
the header: *Staff view* / *Deacon view*.

Three rules make the toggle safe rather than convenient:

1. **It narrows, never widens.** The toggle filters which surfaces are rendered. It changes
   nothing about RLS, which is still the only thing deciding what rows come back. A person who
   flips it has not gained anything.
2. **The current context is always on screen**, and it is the loudest thing in the header. Someone
   who has been in Deacon view for twenty minutes should never have to wonder before they type.
3. **Composing inherits the context.** A thread started in Deacon view defaults to
   `audience = {deacon-board}`. Widening it to staff is a deliberate second act with the body
   badge changing to say so.

The reason this is worth three rules rather than a dropdown: the failure it prevents is a person
with access to both rooms saying something in the wrong one. That is not a permissions bug — no
policy would stop it — so the interface has to.

A landing page that asks "which side today?" is a reasonable alternative to a header toggle, and
worth trying in the mockup. The header is the safer default because the answer stays visible after
the choice is made.

---

## 3. The surfaces

### 3.1 Shared — one record, two audiences

The point of one application is that a shared surface is *literally the same row*, not two copies
kept in sync. Every shareable record carries an audience:

```
audience text[]    -- body slugs; empty is invalid
```

```sql
-- the shape of every shared-surface policy
using (audience && array(select my_bodies()))
```

**Calendar.** One table, audience-scoped, with a draft state. A staff working draft carries
`audience = {staff}` and `published_at = null`; publishing widens the audience and stamps the
date. Deacons see it when it is ready and not before — which is what the staff side asked for,
and it comes free from the audience model rather than needing a second calendar.

Publishing should write `notified_on` back to the existing Notice Log the same way the
Communicator already does. One instrument, not two.

**Announcements.** Short-lived, audience-scoped, authored by either side. A deacon announcement
to staff and a staff announcement to deacons are the same feature.

**Discussion.** Threads carry an audience. `{staff}` is today's staff board, unchanged.
`{deacon-board}` is the Board's own. `{staff, deacon-board}` is how the two sides actually talk —
and that third case is the one Joshua asked for.

The staff board's fourteen-day purge and its §6 constraints apply to all of it. A deacon thread
will accumulate named members' circumstances faster than the staff one does, so it inherits the
same rule and the same warning: **anything that becomes a commitment gets promoted before it
disappears.**

**People.** Already exists. Gains the membership editor.

### 3.2 Deacon board

**The meeting.** The spine. A `board_meeting` record per month with three phases — agenda,
in-session, minutes. The agenda assembles from recurring obligations, submitted committee
reports, and anything tabled at the last meeting. Present mode, already built for staff, applies
here with the same exclusions.

**Attendance.** Recorded per meeting, counted per deacon year, shown against the ¾ requirement.

> **This one needs care.** Art. II.B §3 ¶12 makes failure to attend three-fourths of meetings
> "without just cause" an *automatic* removal. A system that computes that number is computing
> something consequential.
>
> It must **flag and notify, never conclude.** Show the count, show the threshold, raise a
> private flag to the chairman at the second absence — early enough that the conversation is
> pastoral rather than procedural. "Just cause" is a judgment a man makes about another man, and
> the field for it is a note written by a person, not a checkbox.

**Motions and votes.** Text moved, who moved and seconded, disposition (approved, tabled,
withdrawn, failed), the count if one was taken, and — where it amends the bylaws — **the
quoted text before and after.**

That last field exists because of something already documented: two of MBC's recorded bylaw
amendments cite paragraph numbers that no longer resolve, precisely because the record captured a
location rather than the language. See `DISCREPANCY-DOCKET.md`, findings 8 and 9. A ledger that
quotes the sentence cannot drift the way a ledger that cites a paragraph does.

**Care assignments — pointers only.** The deacon family ministry plan: households assigned to
deacons, with date of last contact and nothing else.

Deliberately a **separate table** from the staff `care_entry`, not a view over it. A view would
make the deacon side a projection of staff pastoral records, one schema change away from leaking
what it was built to withhold. Two tables with no foreign key between them is the safer shape,
and it is also the more honest one: the staff care pipeline tracks episodic need, the deacon plan
tracks ongoing responsibility for every member. They are different things.

**Deacon of the Week.** A rotation and a visit log. Already an MBC practice — the DIT schedule
names "Deacon-of-the-Week calls."

### 3.3 The care handoff — staff to deacons

Staff see a need. Sometimes the right response is a deacon, not a staff member. The staff Care
surface gets a **Ask a deacon** action that puts a request on the deacon care list.

**This is the one place where something crosses the sensitivity boundary, so the shape of it
matters more than anything else in this brief.**

> **The push composes a request. It never forwards a record.**
>
> There is no button that copies a care entry across. The staff member writes, in a form, what
> they are asking a deacon to *do* — and the fields available are the only things that travel:

| Travels | Stays on the staff side |
|---|---|
| Household or member name | The care entry itself |
| Kind of help asked for — visit, call, meal, ride, home repair | The reason it is needed |
| By when, if it matters | Any note, condition, or circumstance |
| Who asked | The `sensitive` flag and everything it protects |

"Visit the Hendersons this week" travels. "Mrs. Henderson's cancer is back" does not, and there is
no field it could be typed into.

That translation — from a circumstance to an action — is the whole safety mechanism, and it is
done by a person who already knows the situation rather than by a rule. Build a convenience that
copies the notes across and the pointers-only model is gone in one commit.

The request carries a `care_entry_id` so staff can see their own thread, but the column is
invisible to the deacon side and the join is never exposed there.

**The round trip.** A deacon marks the request done with a date. That completion is visible to the
staff member who asked, which is what closes the loop — and it is still a pointer: *done, on this
date, by this man*. Nothing about what happened.

```
care_request
  id, household_label, help_kind, needed_by, requested_by,
  assigned_to, status ('open'|'accepted'|'done'), completed_on,
  care_entry_id          -- staff-side only, never selected on the deacon side
  -- no notes column, by design
```

**The year.** Every dated obligation the bylaws and policies create, derived rather than typed,
reusing the `lib/derive.ts` pattern the cadence ledger already uses. Seeded from the governance
corpus: the A009 budget calendar's five dates, the October committee filing, the Treasurer's
annual report and audit window, the July nomination clocks, the August election, the September
officer election.

**Governance reference.** The transcribed bylaws and policies, searchable, with the discrepancy
docket attached. Already built and verified; this surface only has to read it.

### 3.4 Committee rooms

One per committee, visible only to its members. Finance, Personnel, Building & Grounds, Family
Assistance. Each holds that committee's report history, its roster and terms, and its own
working notes.

Family Assistance is marked `confidential` on the body record, which does two things: its room is
invisible to non-members like every other committee room, **and** its membership is excluded from
the October roster published to the church — which is what Art. II.B §3 already requires and what
no other committee needs.

---

## 4. The report builders

Three structured builders. Each produces a stored, dated, versioned report that lands on the
meeting agenda automatically.

### 4.1 Committee report

One form per committee, shaped to what that committee actually reports, not a generic text box.

- **Finance** — budget position, notable variances, actions taken, items for the Board
- **Building & Grounds** — projects open and closed, maintenance completed, spend against line,
  anything needing a vote
- **Personnel** — reviews completed, staffing actions, items requiring Board action. **No
  compensation figures.** The Board evaluates the Senior Pastor's review (Art. II.B §3); it does
  not need salary detail in a database to do it.
- **Family Assistance** — requests received, approved, declined, amounts, and confirmation that
  D002's third-party-invoice rule was followed. **No circumstances.**

Submitting renders the report into the standard template and files it. The chair can save a draft
and come back.

### 4.2 Treasurer's monthly report

Its own builder, because the bylaws give it its own requirement: "an itemized report of receipts
and disbursements for the preceding month" at every regular monthly meeting (Art. II.C ¶2).

Structured lines, prior month carried forward so it is an edit rather than a re-entry, and a
derived comparison against the same month last year. The report feeds both the meeting packet and
the church business meeting, since Art. II.C ¶2 requires it to be presented there too.

### 4.3 Secretary's minutes assembler

The secretary does not retype. The minutes template pulls in what already exists — attendance,
submitted committee reports, motions with their dispositions, old business carried forward — and
leaves the secretary writing only the parts that are actually narrative.

Output is a draft; the Board approves it at the following meeting; tabled motions roll to the next
agenda automatically.

### 4.4 What happens to a report after it is written

Every report — committee, Treasurer, minutes — moves through the same four states, and the
Reports page is where they all live.

```
draft  →  submitted  →  published  →  archived
```

**Publish** is the button that matters. Publishing makes a report official: it appears on the
Reports page, it is included in the meeting packet, and it becomes printable.

**Print.** The Reports page prints — one report, a whole meeting's packet, or a date range — in the
MBC print styling rather than whatever the browser does by default. Minutes live in the dashboard
*and* on paper, which is the ask.

**Edit after publish, always.** A published report is never frozen. But an edit after publication
creates a **new version** rather than overwriting:

- prior versions stay readable,
- the record shows *revised [date] by [person]*,
- and the published version anyone printed is still there to compare against.

This is not bureaucracy for its own sake. Minutes approved by the Board are a governance record,
and a record that can be silently changed after approval is not a record. Versioning is what lets
the edit button exist at all — it protects whoever makes the correction as much as it protects the
minute.

**Archive.** When a new period's report is published for the same body, the one it replaces moves
to `archived`. Archived is a state, not a separate system: the report stays readable, printable
and editable, it just stops appearing on the current Reports page and moves to Archive.

Nothing is ever deleted. The staff board's fourteen-day purge applies to the discussion board,
which is a conversation. Reports are records, and records keep.

```
report_version
  id, report_id, report_kind ('committee'|'treasurer'|'minutes'),
  version_no, payload jsonb, rendered,
  created_by, created_at, published_at, supersedes_version_id
```

> **One thing to settle with the Board, not in code.** Art. II.E makes the **Church Clerk** the
> keeper of the church's records, not the Board Secretary. So the minutes here are the Board's
> working record and its printed output; whether the dashboard copy or the Clerk's copy is the
> record of file is a decision for the Board. Worth asking before the first set is published, not
> after.

---

## 5. Data model — new tables

```
body
  id, slug, kind, name, parent_body_id, confidential, active

membership
  id, person_id, body_id, role_in_body, term_start, term_end, active

board_meeting
  id, meets_on, kind ('regular'|'special'), status,
  agenda_locked_at, minutes_status ('none'|'draft'|'approved'), approved_at

agenda_item
  id, meeting_id, position, title,
  source ('recurring'|'report'|'old_business'|'new_business'|'manual'),
  source_ref, notes

meeting_attendance
  id, meeting_id, person_id, status ('present'|'absent'|'excused'),
  just_cause_note, recorded_by

motion
  id, meeting_id, text, moved_by, seconded_by,
  disposition ('approved'|'tabled'|'withdrawn'|'failed'),
  tabled_to_meeting_id, vote_for, vote_against,
  bylaw_reference, text_before, text_after

committee_report
  id, meeting_id, body_id, submitted_by, submitted_at,
  status ('draft'|'submitted'), payload jsonb, rendered

treasurer_report
  id, meeting_id, period_start, period_end,
  receipts jsonb, disbursements jsonb, submitted_by, submitted_at

care_assignment
  id, household_label, assigned_to, last_contact_on, active
  -- no notes column, by design

care_request                       -- staff asks a deacon; see §3.3
  id, household_label, help_kind, needed_by, requested_by,
  assigned_to, status ('open'|'accepted'|'done'), completed_on,
  care_entry_id                    -- staff-side only, never selected on the deacon side
  -- no notes column, by design

report_version
  id, report_id, report_kind ('committee'|'treasurer'|'minutes'),
  version_no, payload jsonb, rendered,
  created_by, created_at, published_at, supersedes_version_id

deacon_week
  id, week_of, person_id, backup_person_id

obligation
  id, slug, title, rule_source, cadence, anchor,
  notice_days, owner_body_slug
  -- next_due and due_soon are derived, never stored
```

Existing tables gain `audience text[]` where they become shareable: `event`, `thread`,
and a new `announcement`.

---

## 6. Required constraints

Inherits every constraint in §6 of the staff brief. These are additional.

- **No circumstance text anywhere on the deacon side.** `care_assignment` has no notes column and
  must not grow one. If a future need seems to require it, that need belongs in the staff care
  pipeline, not here.
- **No discipline records. No E006 records. No contribution records.** Not gated — absent.
- **No compensation figures in Personnel reports.**
- **Attendance flags, never removes.** No automated status change follows from the count.
- **A confidential body's membership is excluded from any published roster**, including the
  October filing to the church.
- **Present mode excludes every committee room, the care assignments, and any deacon-audience
  thread.** The staff rule about what may be pointed at a wall applies with more force here: a
  deacon meeting happens in a room where members' families are the subject.
- **Audience is never empty.** A record with no audience is a bug, not a private record.
- **The staff→deacon care push composes, never forwards.** `care_request` has no notes column and
  must not grow one, and no feature may copy a `care_entry` body across. `care_entry_id` exists so
  staff can follow their own thread and is never selected on the deacon side.
- **The context toggle narrows and never widens.** It is a view filter. If it ever becomes the
  thing deciding what a person may read, the model has been broken.
- **Published reports are versioned, not overwritten.** An edit after publication creates a new
  version and leaves the prior one readable. Minutes approved by the Board are a governance
  record; a record that changes silently is not one.
- **Nothing on the deacon side is deleted.** The fourteen-day purge belongs to the discussion
  board, which is a conversation. Reports are records, and records keep.

---

## 7. Build order

**Phase 0 — the blocker.** Replace `LocalRepository` with `SupabaseRepository`. The seam in
`src/data/repository.ts` was built for this and its two methods are the whole interface. Nothing
collaborative works until this lands, and every surface below is collaborative by definition.
Auth is already real; only the data is local.

**Phase 1 — the access model.** `body` and `membership` tables, the RLS helpers, `is_staff_role()`
reimplemented on top of them, navigation assembled from membership, routes that refuse. No new
surfaces. When this phase is done the staff dashboard behaves exactly as it does today and the
foundation is different.

**Phase 2 — the meeting.** `board_meeting`, agenda assembly, attendance, motions. This is the
smallest thing that changes a monthly Board meeting, and like the staff Phase 1 it should be in
real use before anything else is built on it.

**Phase 3 — the builders.** Committee reports, then the Treasurer's report, then the minutes
assembler. In that order: the assembler has nothing to assemble until the first two exist. The
report lifecycle in §4.4 — publish, print, version, archive — lands with the first builder, not
after all three, because the first published report is the one that proves the versioning works.

**Phase 4 — shared surfaces.** Calendar with audience and draft state, announcements, discussion
audiences. This is the phase that makes the two sides able to talk, and the phase that makes the
dashboard worth opening between meetings.

**Phase 5 — the year and the reference.** Derived obligations, the governance corpus, the
discrepancy docket.

**Phase 6 — committee rooms, care assignments, the staff→deacon handoff, Deacon of the Week.**
Last deliberately. These are the surfaces closest to members' lives, and they should not be built
until the men using the system have a year of habit with the parts that are only about logistics.
The handoff in §3.3 in particular should be built once the deacon care list already exists and has
a rhythm — a bridge is easier to get right when both banks are already standing.

---

## 8. Design system

Unchanged. Lora and Lato, the tokens in `src/styles/tokens.css`, the components in
`src/components/ui`. The deacon side is not a different product and should not look like one.

One addition: a body badge. When a record is visible to more than one body, say so on the record
— a small `Staff · Deacons` marker. People need to know who else is reading before they type,
and that is a design problem more than a permissions one.

---

## 9. Decisions on record

Settled 14 September 2026.

| | |
|---|---|
| **Who administers membership** | Joshua, for now. Revisited after a year of both dashboards in use. |
| **Does the Senior Pastor sit in committee rooms** | Yes — he attends all deacon meetings and all committee meetings. `ex_officio` membership in every body. |
| **What happens to old records** | Archived, not deleted. A new period's report moves the one it replaces to Archive, where it stays readable, printable and editable. |
| **Church standing committees** | Out of scope. The `body` table takes them later without a schema change. |
| **Minutes** | In the dashboard *and* printed. Publish makes them official; the Reports page prints; every report stays editable after publication, with versioning. |
| **Who sees both sides** | The Senior Pastor and the chairman. Header toggle between Staff view and Deacon view. |
| **Staff → deacon care** | A composed request, never a forwarded record. See §3.3. |

Still genuinely open:

1. **Is the dashboard copy of the minutes the record of file, or the Church Clerk's copy?**
   Art. II.E points at the Clerk. A Board decision, not a build decision — but it should be made
   before the first minutes are published.
2. **What happens to a deacon's memberships when his term ends?** Three-year terms with a
   mandatory year off means memberships expire annually in a batch every September. They need to
   expire without erasing what the man wrote or owned.

---

## 10. Handing this off

Two tools, and the honest answer is that they want different parts of this.

**Send Phases 0 and 1 straight to Claude Code.** The repository swap and the access model are
plumbing — migrations, RLS policies, helper functions, navigation assembled from membership.
There is nothing to look at and nothing to decide visually, and Phase 0 blocks everything else.
Starting it now means it is underway while the design work happens.

**Take three screens to Claude Design first**, because these are the ones where getting it wrong
costs something:

1. **The meeting** — the spine, with its three phases. If this screen does not cohere, nothing
   downstream will.
2. **The context toggle and landing** — the failure it prevents is a person with both sides open
   saying something in the wrong room. Worth seeing before it is built.
3. **A report builder** — one of them, as the pattern the other two follow.

**Everything else goes straight to code.** Most of this system is forms, tables and lists, and the
design system already exists — Lora and Lato, the tokens, the components in `src/components/ui`.
Mocking up a committee report form would be redrawing something already decided.

> **One design note worth carrying into the mockups.** The staff dashboard is for people who open
> it daily. This one is for men who will open it monthly, some of whom are in their seventies. An
> infrequent user needs more labelling, more obvious affordances, and less cleverness than a daily
> one — a surface that is elegant to someone who has seen it thirty times can be opaque to someone
> seeing it for the fourth. That is a different design problem than the staff side solved, and it
> is worth naming out loud before anyone draws a screen.

---

*Grounded in the transcribed bylaws and policies at
`MBC_Bylaws:Policies:Procedures/`. Every citation above resolves to that corpus; where the manual
is unclear, `DISCREPANCY-DOCKET.md` says so.*
