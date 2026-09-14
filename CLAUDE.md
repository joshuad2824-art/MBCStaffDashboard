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

**Attendance flags, never removes.** The ¾ rule in Art. II.B §3 ¶12 carries automatic removal. The
system shows the count and raises a private flag to the chairman; no automated status change ever
follows from it. "Just cause" is a note written by a person.

---

## Conventions

| | |
|---|---|
| Branches | `claude/<short-description>` — matches existing history |
| PRs | One per phase. Never fold Phase 0 and Phase 1 into one PR. |
| CI | `npm run build` on every PR — that is `tsc -b && vite build`, so it is the typecheck too |
| Migrations | Continue the sequence: next is `supabase/migrations/0004_…` |
| Local dev | No secrets needed. Without `.env.local` the app runs on seed data with stubbed sign-in. |
| Design system | Lora (editorial) + Lato (interface), tokens in `src/styles/tokens.css`, components in `src/components/ui`. The deacon side is not a different product and must not look like one. |

## Where the seams are

- **`src/data/repository.ts`** — the persistence seam. `Repository` is two methods. Configured
  builds use `SupabaseRepository`; unconfigured local builds keep `LocalRepository` and seed data.
- **`src/screens/surfaces.ts`** — currently a static record with `staffOnly?: boolean`. Becomes a
  function of membership with `bodies: string[]`.
- **`src/session/`** — `claim_account()` establishes who the signed-in person is. Membership
  lookup joins here.
- **`supabase/migrations/0002_rls.sql`** — the role gate. `is_staff_role()` gets reimplemented as
  `is_member_of('staff')` so nothing already written has to change.

## Known gap worth closing

**CI proves the build compiles. Nothing proves the policies hold.** There is no test that a
`limited` account gets zero rows from `care_entry`, and after Phase 1 there will be nothing
proving a deacon gets zero rows from a committee room he is not in.

Phase 1 rewrites the gate that currently protects members' pastoral records. It should not merge
without either a migration test that asserts the negative cases, or — at minimum — a written
verification run against a real project with a throwaway account per body. A typecheck is not a
security test.
