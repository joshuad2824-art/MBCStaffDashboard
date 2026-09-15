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
| Migrations | Continue the sequence: next is `supabase/migrations/0017_…` |
| Local dev | No secrets needed. Without `.env.local` the app runs on seed data with stubbed sign-in. |
| Design system | Lora (editorial) + Lato (interface), tokens in `src/styles/tokens.css`, components in `src/components/ui`. The deacon side is not a different product and must not look like one. |

## Where the seams are

- **`src/data/repository.ts`** — the staff side's persistence seam. `Repository` is two methods
  plus `careEntryRef()`, the one place the care seam names a staff row: the database id of a care
  entry, written into `care_request_link` and nowhere else. Configured builds use
  `SupabaseRepository`; unconfigured local builds keep `LocalRepository` and seed data.
- **`src/data/meetings/repository.ts`** — the deacon side's seam, deliberately separate: a handful
  of named operations rather than one blob, because what it writes are records. No undo, no
  delete. `MeetingsProvider` loads it only for a person seated on the Board.
- **`src/data/care/repository.ts`** — the care seam: named operations for the deacon family
  ministry plan, the staff→deacon handoff, and Deacon of the Week. `askDeacon()` takes a
  household, a kind of help, a date and the asker, and nothing else; there is no operation that
  takes a `care_entry` and produces a request from it. `CareProvider` loads it for the Board and
  for the staff role.
- **`src/data/reference/repository.ts`** — the reference's seam, split from the Board's room in 0014
  because the manual is not the Board's alone: documents and sections in, one search out, no writes.
  `search()` is `search_manual()` in a configured build and a substring pass over the seeded sections
  otherwise, in the same shape — the screen does not know which answered. `sections.ts` is the stub's
  copy of the loader's splitter and must only agree with it; the loader decides what production holds.
  `screens/Reference.tsx` is the three states of the expansion brief §A.4, identical on both sides;
  the discrepancy docket is not on it, at Joshua's ask, and no screen reads `governance_finding` today.
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
- **`supabase/migrations/0009_year_and_reference.sql`** — the year and the reference. `obligation`
  stores a rule — citation, cadence, anchor (`meeting`, `meeting:MM` or `MM-DD`), notice days,
  owner body — and nothing derived: next due, announce by and which meeting it lands on are
  computed in `src/data/meetings/year.ts` from the anchor and the Board's real meeting dates, the
  way the cadence ledger works. `governance_document` and `governance_finding` hold the
  transcribed corpus and the discrepancy docket, loaded by `supabase/governance/build-seed.mjs`.
  All three are read across the deacon side and written by nobody through the API: no insert,
  update or delete policy exists, and the test proves it. The corpus lives in the database, not
  in the bundle, so that who may read the bylaws is a policy and not an accident of hosting.
- **`supabase/migrations/0010_care_pointers.sql`** — care on the deacon side, pointers only.
  `care_assignment` (household, deacon, last contact), `care_request` (household, kind of help, by
  when, who asked; the Board takes it up and dates it done, a trigger keeps each side to its own
  columns), `deacon_week` and `deacon_visit`. **None has a notes column and the test checks the
  catalogue for one.** The staff member's thread back to their care entry is `care_request_link`,
  a separate staff-only table rather than a column: the deacon side does not merely avoid selecting
  the join, it reads zero rows of it. No delete policy on any of the five. The committee rooms are
  the existing pieces drawn for a committee's slug: `membership` for the roster, `report` for the
  history, and the discussion board with `audience = {committee:…}` for the working notes.
- **`supabase/migrations/0013_obligations_from_the_corpus.sql`** — the year, verified against the
  manual. Fifteen obligations, each quoting or closely following the 2-11-2025 Bylaws, Policies &
  Procedures Manual with a citation that resolves: the Treasurer's monthly report, A009's seven
  dated budget steps, the annual report and audit (anchored to 1 March, with the fiscal-year
  question named), the Senior Pastor's review, the nomination and election clocks, the officer
  election and the October roster. A009 is *Building & Property Use Income*; its budget calendar
  is a part of it, not its subject. The reference's document kinds gain `constitution` and
  `reference`. The corpus itself: `supabase/governance/build-seed.mjs` reads the transcription's
  front matter and **refuses every file marked `sensitivity: restricted`** — the salary plan, the
  performance standards, E006 — naming each on stderr. They never enter the database.
- **`supabase/migrations/0014_governance_reach.sql`** and **`0015_manual_open_to_all.sql`** — the manual,
  on both sides. 0014 gave `governance_document` an audience on 0008's pattern so the staff could read
  the parts the corpus marked for them; 0015 took the column away again on Joshua's decision of
  15 September 2026: the bylaws, policies and procedures are the church's own documents, available to
  its members as a matter of course, and a gate nobody wants is a switch waiting to be thrown by
  accident. The read policy is `is_signed_in()` — any account on the roster with access, limited
  included. `governance_finding` is untouched and stays the deacon side's: the docket is the Board's
  working record, not the manual. Still no write policy on either table, and the loader ignores an
  `audience:` key if a corpus still carries one, saying so once on stderr.
- **`supabase/migrations/0016_governance_search.sql`** — the manual, searchable. `governance_section` is
  one row per heading of a document — the headings above it, a citation in the docket's dialect, a
  stable anchor, the markdown verbatim — with a stored weighted `tsvector` (citation A, heading path B,
  body C), a GIN index on it and trigram indexes on `citation` and the document `code`. Its read policy
  is inherited, an `exists` against `governance_document`, so one decision governs both tables. No
  write policy. `search_manual(q)` is security invoker: a citation typed as a string lands on the
  paragraph, above the ranked `websearch_to_tsquery` hits, and the snippet carries `<mark>` markers the
  client renders as the match mark and never as HTML. The loader emits the sections, refuses a file with
  no `sensitivity` key (CORPUS-PREP.md §2), and stops if a document's sections do not reconstruct its
  body exactly.
- **`supabase/migrations/0011_chairman_membership_admin.sql`** and **`0012_…`** — the chairman's seat
  editor: `chairman_roster()` and `set_managed_membership()`, both security definer and both refusing
  anyone but the Board chairman. They reach the Board and its committees, and a confidential
  committee only when the chairman himself sits in it. Nothing else in the API writes `membership`;
  the tables still have no insert, update or delete policy.
- **Seating.** The Board chairman maintains Board and non-confidential committee memberships from
  the People page (`src/components/SeatManager.tsx`, which renders nothing without Supabase); the
  confidential Family Assistance roster remains visible and manageable only inside that room. The
  one automatic seat: an active person granted access who sits in no body yet is put in `staff`, so
  the People page keeps working. Seat a deacon first, grant access second, and the trigger adds
  nothing.

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
