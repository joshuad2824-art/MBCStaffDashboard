# Claude Code — kickoff

*Hand this to Claude Code at the root of `joshuad2824-art/MBCStaffDashboard`. It is the
instruction sheet, not the specification: the specification is
`mbc-dashboard-expansion-brief.md` at the same root, and this file assumes it is there.*

---

## Before you write anything

Read, in this order:

1. `CLAUDE.md` — the invariants. They are not style preferences. Several of them protect
   members' pastoral records and one of them protects a confidential committee.
2. `mbc-dashboard-expansion-brief.md` — the work.
3. `mbc-staff-dashboard-brief.md` and `mbc-deacons-dashboard-brief.md` — only the sections the
   expansion brief cites. Do not read them end to end before starting; they are long and most of
   what is in them is already built.

Then run `npm install && npm run build` and confirm the tree is green before touching it. If it
is not, say so and stop — do not start a feature on a broken build.

---

## Ground rules, repeated because they are the ones that get broken

**RLS is the gate; the interface is a preview of it.** If a policy and a screen disagree, the
policy is right. Never fix a visibility bug by hiding a button.

**Absence, not greyed-out.** A surface a person cannot open is not rendered, not disabled, not
dimmed. There is exactly one exception in this body of work — the view-as stub in PR 3 — and it
is explicit.

**Nothing writes the governance corpus through the API.** No insert, update or delete policy on
`governance_document`, `governance_finding`, `governance_section` or `obligation`. Ever.

**The restricted three never enter the system.** The salary plan, the individual performance
standards, and Policy E006. `supabase/governance/build-seed.mjs` refuses them by front matter and
names them on stderr. Do not make that refusal quieter, softer, or conditional.

**Groups hold who serves, never who attends.** New invariant arriving with PR 5. No table in this
work gets an attendee, roster, enrolment or member column.

**Branches** `claude/<short-description>`. **One PR per numbered item below** — never fold two
together, even when the second is four lines. **Migrations** continue the sequence from `0014`.

**CI runs two jobs.** `build` is `tsc -b && vite build`, which is the typecheck. `policies`
applies the migrations to a throwaway Postgres and runs `supabase/tests/policies.sql`. A
typecheck is not a security test. Every PR below that adds a table also adds its negative case to
that file, and a PR that adds a table without one is not finished.

---

## PR 1 — The manual reaches the staff

`claude/governance-audience` · migration `0014_governance_reach.sql`

**Goal.** A staff member who is not a deacon can read the parts of the manual that concern him.

**Schema.**

- `audience text[] not null default '{deacon}'` on `governance_document`, with a non-empty check
  (`array_length(audience, 1) > 0`) on the pattern `0008_audience.sql` set for `event` and
  `thread`.
- Replace the read policy: `is_on_deacon_side()` becomes `in_audience(audience)`. Reuse the
  existing helper; do not write a second one.
- `governance_finding` is **unchanged** — the discrepancy docket stays deacon-only.
- No write policy is added. The column is set by the loader and by SQL.

**Why the default is `{deacon}`.** Defaulting to `{staff,deacon}` publishes the entire manual to
the staff in one statement that nobody reviews. Defaulting the other way means the surface is
empty for staff on the day this merges and fills as the corpus is re-loaded with audiences marked.
That is the intended behaviour, not a bug.

**Loader.** `build-seed.mjs` reads an `audience:` front-matter key — a comma-separated or
bracketed list — and emits it. A file with no `audience` key emits `{deacon}`. The upsert sets
`audience = excluded.audience` so a re-load applies the corpus session's decisions.

**Client.** `/reference` becomes reachable from the staff side: add `staff` to the surface's
`bodies` in `src/screens/surfaces.ts`. The docket block in `Reference.tsx` renders only when
`findings.length > 0`, which is already how it behaves — verify rather than assume, because a
staff member will get zero findings and the surface must not look broken to him.

**Policy test.**

- A staff-role account reads zero rows of a `{deacon}` document.
- A `limited` account reads zero rows of a `{deacon}` document.
- A staff-role account reads zero rows of `governance_finding`.
- A signed-out session reads nothing from either table.
- `governance_document` still has no insert, update or delete policy.

**Do not:** add a write path, touch the docket's policy, or change what the loader refuses.

---

## PR 2 — mbctulsa.team

`claude/domain-headers` · no migration

Most of this is configuration Joshua does in two dashboards; your part is the repository's.

**In the repo.** Add a `[[headers]]` block to `netlify.toml` for `/*` — `X-Robots-Tag:
noindex, nofollow, noarchive`, `X-Frame-Options: DENY`, `Referrer-Policy:
strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and a `Permissions-Policy`
denying geolocation, microphone and camera. Add `public/robots.txt` disallowing everything. Leave
the existing SPA redirect and font caching alone.

**In `docs/`.** Extend `LOGIN-SETUP.md` with a short section: the Supabase Auth allow-list has to
carry `https://mbctulsa.team/**`, `https://www.mbctulsa.team/**`, the `.netlify.app` origin and
`http://localhost:5173/**`, and Site URL has to be the apex — **set before DNS cuts over**, or
every emailed sign-in link fails at once for everybody. Write it as a checklist someone can follow
in six months.

Neither header nor robots file is a security control. There is no sign-up and RLS is the gate.
They exist so a church staff dashboard does not turn up in a search for the church's name.

---

## PR 3 — View as

`claude/view-as` · no migration except `person.admin`, which rides along in PR 5

**Goal.** An administrator selects a *seat* and the application redraws as that seat would see
it. Rows stay his own. Read-only while active.

**This feature changes no policy.** If you find yourself writing SQL, stop and re-read §C of the
brief — you have misunderstood it. The absence of a migration is the proof the model is right.

**Where it goes.**

- `src/screens/surfaces.ts` — `Viewer` gains `previewSeat?: Seat`. `canOpen()` does **not**
  change; compose the seat into the viewer before asking it. A seat can only narrow.
- `src/session/session.tsx` — preview state beside the existing `viewAs` and `presentMode`, which
  already work exactly this way. The current "viewing as limited" header toggle becomes one entry
  in the new seat list, not a second control beside it.
- `src/components/shell/` — a persistent bar in the dark band the design system already uses:
  `Viewing as — <seat> · Read only · Exit`. It does not survive a reload and does not survive
  sign-out.
- A `<Stub>` panel for the one exception below.

**The one exception to absence-not-greyed-out.** In view-as, and only in view-as, a surface
belonging to a body the administrator is not in appears in the sidebar and opens to a labelled
panel: *"Family Assistance committee room. This seat has this surface. Its contents are not shown
here — you are not a member of this committee."* Outside view-as, nothing changes. Write the
reasoning into `CLAUDE.md` when this merges: the question being asked is about somebody else's
access, and a truthful answer requires naming the room.

**Read-only has to be real.** Put the guard in the store — `mutate()` refuses while a preview
seat is set and says so in the toast — so that a composer somebody forgot to hide cannot write
anyway. Hiding the buttons is necessary and is not sufficient.

**Seats.** The table in §C.3 of the brief, as a constant. Offer a person's name as a shortcut
that resolves to their seat set; keep the label reading as a seat.

**Present mode.** Composes with view-as: seat first, then project. Care pipelines and the
discussion board are still never drawn, on either side, under any seat. Add the seat name to the
present-mode footer.

**Policy test.** None — this PR adds no policy. Say so in the PR description so the omission
reads as deliberate.

---

## PR 4 — The manual, searchable

`claude/governance-search` · migration `0015_governance_search.sql`

**Goal.** Search points at a paragraph, not a document.

**Schema.** `governance_section` as specified in §A.3 of the brief: `document_id`, `heading_path
text[]`, `anchor`, `citation`, `body`, `position`, and a stored generated `tsvector` with
`setweight` A/B/C over citation, heading path and body. GIN index on it. `pg_trgm` trigram index
on `citation`, and on `governance_document.code`.

Read policy **inherits the parent document's audience** — an `exists` against
`governance_document` — so one audience decision governs both tables and they cannot drift. No
write policy.

**`search_manual(q text)`**, security invoker so RLS filters it. `websearch_to_tsquery('english',
q)`, ranked by `ts_rank_cd`, snippet by `ts_headline`. Union in an exact-and-prefix citation match
*above* the ranked text hits: a man who types `A009` or `Art. II.B` wants that paragraph, not the
eleven places it is mentioned, and full-text tokenisation mangles both.

**Loader.** `build-seed.mjs` emits sections as well as documents. The corpus session
(`CORPUS-PREP.md`) defines the anchor and citation rules and hands you a worked spec — do not
invent them here.

**Client.** `src/screens/Reference.tsx` is rebuilt to the three states in §A.4, from the Claude
Design artboards in `design_handoff_reference/`. Keep the existing `Markdown` renderer, the
citation-linking helpers and the docket block — they work. Keep a client-side fallback so an
unconfigured checkout still searches over seeded sections with a plain substring pass, same result
shape. The screen must not know which one answered.

**Policy test.** Call `search_manual()` as each kind of account, not just the table read: a staff
account gets zero sections belonging to a `{deacon}` document. Plus the standing assertion that
`governance_section` has no write policy.

---

## PR 5 — Ministries, classes and groups

`claude/ministries` · migrations `0016_ministries.sql` and `0017_ministry_reference.sql`

The largest piece, and the only one that touches surfaces that already work. Its own branch.

**Schema** as §B.2 of the brief: `ministry`, `serving_group`, `serving_role`,
`serving_assignment`. Read to the whole `staff` body; write `is_staff_role()`. `ended_on` rather
than deletion. `person.admin boolean not null default false` rides along here.

**No attendee column, in any table, under any name.** Add the assertion to the policy test that
checks the catalogue for one, on the pattern `0010`'s test uses to prove `care_assignment` has no
`notes` column.

**`0017` is its own PR-sized risk in a four-statement migration.** `cadence`, `event`, `notice`
and `goal` all carry `ministry text` constrained in TypeScript by a hard-coded union. Add a
foreign key **on `ministry.name`**, not on an id. The seed rows are exactly the seven strings
already in use, so the constraint holds on the day it is added and no data moves. In TypeScript,
`Ministry` becomes `string` and `MINISTRIES` is loaded from the table rather than declared in
`src/data/seed.ts`. `'All'` and `'All groups'` are filter sentinels — keep them out of the table
and handle them in the filters.

Ship `0016` and `0017` as separate commits in the PR, or separate PRs if the first is large, so
that `0017` can be reverted without taking the directory with it.

**Screens.** `/ministries` index with the open-positions count; `/ministries/:slug` from the
Claude Design artboards. Inline editing on the pattern `People.tsx` and `OwnerSelect.tsx` already
set — no modal, no separate edit mode, *Add someone…* creating a roster entry at `access: 'none'`
and assigning it in the same motion.

**Where it surfaces elsewhere**, and nothing beyond this list in v1: one line on Today at
Memorial (`N groups without a leader named`, linking through), the Cadence ledger's ministry
filter reading the table, and the open-positions count available to present mode.

**Do not add a screening, clearance or background-check field.** §B.5 of the brief explains why
and Joshua has confirmed it. If a column for it appears in a later request, treat that as a new
brief, not a small addition.

---

## Definition of done, per PR

- `npm run build` green, `npm run test:policies` green.
- The policy test extended with this PR's negative cases, or an explicit line in the PR
  description saying why there are none.
- `CLAUDE.md` updated when a PR adds or extends an invariant — PR 3 and PR 5 both do.
- The PR description says what it changed about *who can read what*, in one sentence, even when
  the answer is "nothing".

## Ask rather than guess

Three things are Joshua's to decide and are not inferable from the code:

1. **Which documents are `{staff,deacon}`.** Not your call and not a default — it arrives through
   the corpus, marked in front matter. PR 1 ships with the manual empty for staff and that is
   correct.
2. **Whether a `limited` account reads the manual at all.** Today a limited account is a deacon
   without a staff role. If volunteers ever hold limited accounts the answer may change.
3. **Anything that would put a person's name into a group's attendee list.** There is no version
   of that which is a small change.

---

*Attribution lines for commits and PRs are in the repository's existing history; match them.*
