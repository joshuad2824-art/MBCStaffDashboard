# MBC Dashboard — working notes for Claude Code

One application, two sides. The staff dashboard and the deacons' dashboard are the same app,
the same database, and the same sign-in. What a person sees is assembled from which bodies they
belong to.

Read `mbc-staff-dashboard-brief.md` and `mbc-deacons-dashboard-brief.md` before changing anything
structural. The invariants below are the ones that are easy to break by accident and expensive to
discover later.

---

## Invariants — do not violate these without being asked to

**RLS is the gate. The interface is a preview of it.** If a policy and a screen disagree, the
policy is right and the screen is wrong. Never fix a visibility bug by hiding a button.

**Pointers, not content, on the deacon side.** `care_assignment` and `care_request` have **no
notes column** and must not grow one. No feature may copy a `care_entry` body across to the
deacon side. The staff→deacon care push *composes a request* — household, kind of help, by when —
it never forwards a record. This is the single rule most likely to be broken by a well-meant
convenience.

**Absence, not greyed-out.** A surface a person has no membership for is not rendered, not
disabled and not dimmed. Three layers: navigation omits it, the route refuses it, RLS returns no
rows. Only the third is a security control; the other two exist so the interface tells the truth.

**The context toggle narrows, never widens.** It is a view filter for the two people who hold both
sides. It changes nothing about RLS. If it ever becomes the thing deciding what someone may read,
the model has been broken.

**Audience is never empty.** `audience text[]` with no entries is a bug, not a private record.

**Published reports are versioned, not overwritten.** An edit after publication creates a new
version and leaves the prior one readable. Minutes approved by the Board are a governance record.

**Nothing on the deacon side is deleted.** The fourteen-day purge belongs to the discussion board,
which is a conversation. Reports are records, and records keep.

**These never enter the system at all**, in any form, behind any gate: church discipline records,
anything under policy E006 (abuse response), individual contribution records, staff compensation
figures.

**There is no attendance tracker.** The Board decided it does not want one. The roll is called so
the minutes can say who was present and who was not — the two lines the Board's minutes have always
carried — and nothing computes a count against the ¾ rule in Art. II.B §3 ¶12. No function, no
panel, no flag. If one is ever asked for again, it flags and never removes.

---

## Conventions

| | |
|---|---|
| Branches | `claude/<short-description>` — matches existing history |
| PRs | One per phase. Never fold Phase 0 and Phase 1 into one PR. |
| CI | Two jobs on every PR. `build` is `npm run build` — `tsc -b && vite build`, so it is the typecheck too. `policies` applies the migrations to a throwaway Postgres and runs `supabase/tests/policies.sql`. |
| Migrations | Continue the sequence: next is `supabase/migrations/0009_…` |
| Local dev | No secrets needed. Without `.env.local` the app runs on seed data with stubbed sign-in. |
| Design system | Lora (editorial) + Lato (interface), tokens in `src/styles/tokens.css`, components in `src/components/ui`. The deacon side is not a different product and must not look like one. |

## Where the seams are

- **`src/data/repository.ts`** — the staff side's persistence seam. `Repository` is two methods.
  Configured builds use `SupabaseRepository`; unconfigured local builds keep `LocalRepository` and
  seed data.
- **`src/data/meetings/repository.ts`** — the deacon side's seam, deliberately separate: a handful
  of named operations rather than one blob, because what it writes are records. No undo, no
  delete. `MeetingsProvider` loads it only for a person seated on the Board.
- **`src/screens/surfaces.ts`** — every surface names its `bodies`; `surfacesFor(bodies, viewAs)`
  is what the sidebar and the router are assembled from. `staffOnly` survives inside the staff
  body: it is the staff role versus a limited account, as before.
- **`src/session/`** — `claim_account()` establishes who the signed-in person is and `my_seats()`
  which bodies they sit in and in what role. Both are read in `account.ts`; `session.tsx` exposes
  `seats`, `bodies`, `isChairOf()`, `sides` and the `context` — the side the interface is drawn
  for, a view filter that narrows and never reaches a query.
- **`supabase/migrations/0004_bodies.sql`** — `body`, `membership`, `my_bodies()`, `is_member_of()`,
  `is_chair_of()`, and `is_staff_role()` reimplemented on top of them. It is membership in `staff`
  *and* `access = 'staff'`, not membership alone: the staff body is the whole staff roster, limited
  accounts included, and a bare `is_member_of('staff')` would have opened care records to them.
- **`supabase/migrations/0005_meeting.sql`** — `board_meeting`, `agenda_item`, `meeting_attendance`,
  `motion`; `my_seats()`. No delete policy on any of the four. (0007 dropped the attendance count
  and the just-cause note: the roll is present or not present, for the minutes.)
- **`supabase/migrations/0006_reports.sql`** — `report` (one table, `kind` committee / treasurer /
  minutes, the four-state lifecycle) and `report_version` (written on publish, never updated or
  deleted). A draft is its committee's own; a filed report goes to the whole Board, as the
  appendices to the Board's minutes always have. What keeps that safe is the shape of each report:
  Family Assistance has no field for a circumstance; a dollar figure in a Personnel report is
  refused by a trigger. `src/data/meetings/reports.ts` holds the shapes and the standard template —
  the Brotherhood of Deacons minutes and their appendices A–D, as the Board has filed them for years.
- **`supabase/migrations/0007_reports_revised.sql`** — a report may be a file instead of a form:
  `file_path` on `report` and `report_version`, the private `reports` bucket whose policies ask the
  report's own questions, and `can_write_report(kind, body, created_by)`: the chair, any Board
  member for the minutes, and any Board member for a report he created on a committee's behalf.
- **`supabase/migrations/0008_audience.sql`** — the shared surfaces. `event` and `thread` carry
  `audience text[]` and `announcement` is new; every policy on them is `in_audience(audience)`,
  the brief's `audience && array(select my_bodies())`, with one twist for the discussion:
  `in_discussion_audience()` reads the `staff` slug as the staff *role*, so a limited account still
  gets nothing from the board. Writing is by overlap too — you may widen a record to a room you
  are not in but never narrow it to one. `published_at` on `event` is the calendar's draft state:
  null is a staff working draft, and the check refuses a stamp on a `{staff}` audience, because
  publishing *is* widening. `src/lib/audience.ts` is the client's half: which room a row is shown
  in and what a composer proposes. It decides nothing about what anyone may read.
- **Seating.** Memberships change by SQL, by one administrator. The one automatic seat: an active
  person granted access who sits in no body yet is put in `staff`, so the People page keeps
  working. Seat a deacon first, grant access second, and the trigger adds nothing.

## The policy test, and what Phase 1 owes it

**CI proves the build compiles. `supabase/tests/policies.sql` proves the policies hold.** It signs
in as each kind of account and asserts the negative cases: a `limited` account gets zero rows from
`care_entry`, a signed-out session reads nothing, a stranger's token claims no row. Loosening a
policy fails the run. `npm run test:policies` runs it locally.

Phase 1 rewrites the gate that currently protects members' pastoral records. It must not merge
without extending that file: a deacon gets zero rows from a committee room he is not in, a
confidential body's membership is unreadable to non-members, and `is_staff_role()` still gives a
`limited` account nothing from `care_entry` after it is reimplemented as `is_member_of('staff')`.
Every later migration that adds a table adds its negative case there. A typecheck is not a
security test.
