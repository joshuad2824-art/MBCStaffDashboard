# Governance corpus — preparing it for the dashboard

*Its own session. Everything here happens in the corpus folder and in the loader script; nothing
here touches the application's screens.*

**Corpus:** `Claude_Files/Projects/MBC_Projects/MBC_Bylaws:Policies:Procedures/`
**Loader:** `supabase/governance/build-seed.mjs` in `joshuad2824-art/MBCStaffDashboard`
**Why:** `mbc-dashboard-expansion-brief.md` §A, and the two migrations it specifies —
`0014_governance_reach.sql` (audience) and `0015_governance_search.sql` (sections and search).

---

## 1. Where things stand

The transcription is finished and verified. Seventy Markdown files with YAML front matter, one
document per file, in the manual's own order. The loader turns them into SQL for
`governance_document` and `governance_finding`, and the discrepancy docket becomes seventeen
numbered findings rather than a document.

Of the seventy, **eighteen are refused** — every file whose front matter says `sensitivity:
restricted`: the salary plan, the fourteen individual performance standards and their
introduction, Policy E006, and the master index (which links to all of them). One more,
`VERIFICATION.md`, is skipped as a build artefact, and the docket becomes findings. **Fifty
documents load.**

| Kind | Count |
|---|---|
| Constitution | 1 |
| Bylaws — articles I–VII | 7 |
| Policies — A, B, D, E, F, M, V series | 29 |
| Procedures and forms | 7 |
| Derived reference | 6 |
| **Total documents** | **50** |
| Findings, from the docket | 17 |

Three things must still be true when this session ends, and they are worth reading twice before
starting:

1. **The restricted eighteen never enter the database.** Not under an audience, not behind a
   gate, not in a section table. The loader refuses them by front matter and names each on stderr.
   Nothing in this work makes that refusal quieter or conditional.
2. **Nothing writes the corpus through the application.** The tables have no insert, update or
   delete policy. The bylaws are amended in a church conference, transcribed here, and loaded by
   SQL.
3. **The transcription stays verbatim.** No rewording, no correcting, no modernising — where the
   source is internally inconsistent, the inconsistency is preserved and the docket records it.
   This session adds metadata *around* the text and splits it into addressable pieces. It does not
   edit a sentence of it.

---

## 2. Task one — mark every document's audience

The gating task. Until it is done, the manual is invisible to staff, which is the intended
behaviour of `0014` and not a bug.

**Add an `audience:` key to the front matter of every loading file.** Two values, in the form the
loader will read:

```yaml
audience: [staff, deacon]
```

**A missing key means `{deacon}`.** Fail closed, always.

### The proposed classification

A starting proposal, not a decision. Joshua amends it; the reasoning for each grouping is given
so that amending one is a judgement rather than a coin toss.

**`[staff, deacon]` — forty-one documents.**

| Group | Files | Why |
|---|---|---|
| Constitution | `01_constitution/constitution.md` | The church's own charter. A staff member who cannot read it cannot understand anything above him. |
| Bylaws, Articles I–VII | all 7 in `02_bylaws/` | Membership, leadership, committees, meetings, amendments. Every staff member benefits from knowing how the church is structured, and none of it is sensitive. |
| Accounting policies | A001 Benevolence Fund, A002 Contributions, A003 Teller, A004 Petty Cash, A005 Church Purchases, A006 Offering Deposits, A007 Employee Business Expenses, A009 Building & Property Use Income | Staff execute all eight. A007 in particular is the one a staff member needs at the moment he is filling in a reimbursement form. |
| Balloting | B001 Absentee Balloting | Administered from the office. |
| Designated funds | D001 Designated Funds | Staff receive and route designated gifts. |
| Education | E001 Scholarships, E002 Curriculum Materials, E003 Preschool Policy, E004 Professional Development | All four are staff-facing by subject. E003 is Michelle's daily work. |
| Facilities | F001 through F012 — calendar and equipment requests, library, kitchen, weddings, Wednesday meal, equipment loans, tack boards, outside organisations, secretarial help, decorating, mission home, funerals | Twelve policies staff apply constantly and members ask about weekly. If anything in the manual belongs on the staff side, it is this series. |
| Memorials, vehicles | M001 Bereavement Flowers, V001 Church Vehicles | Same. |
| Forms | the three in `06_policies/forms/` — auto mileage, ministry reimbursement, absentee ballot control log | A form is only useful where the person filling it in can reach it. |
| Index | `06_policies/_index-as-printed.md` | The manual's own policy index. |
| Acknowledgements | `00_acknowledgements.md` | Harmless and part of the document. |

**`[deacon]` — nine documents.**

| File | Why |
|---|---|
| D002 Family Assistance Fund | The confidential committee's governing policy. It is printed in the manual and is not itself a secret, so this is the one line in the table most worth a second opinion — but the committee's confidentiality is a real structure in this system, and putting its policy on the staff side invites questions the committee cannot answer. |
| `03_deacon-in-training/` — the program, the schedule, and both nomination forms (4 files) | The Board's own pipeline for training and nominating deacons. |
| `07_appendix/appendix-and-version-history.md` | Rationale for bylaw changes. Working material for the Board. |
| `08_chairman-guide/deacon-chairman-guide-2026-2027.md` | A role guide for one office, for one year. |
| `AMENDMENT-HISTORY.md` | The unified amendment history — Board working material. |
| `QUICK-REFERENCE.md` | Derived for the Board specifically. |

**The discrepancy docket is neither.** It becomes `governance_finding`, whose read policy stays
`is_on_deacon_side()` and is not touched by `0014`. A record of where the church's governing
documents disagree with themselves is working material for the chairman; a staff member reading
finding 12 out of context learns nothing useful and several wrong things.

### While you are in the front matter

**Five files have no `sensitivity` key at all** — `00_INDEX.md`, `AMENDMENT-HISTORY.md`,
`DISCREPANCY-DOCKET.md`, `QUICK-REFERENCE.md`, `VERIFICATION.md`. All five are handled correctly
today by other means, but a corpus where the absence of a key is meaningful is a corpus with a
quiet failure mode in it. **Add `sensitivity: normal` to each**, and then harden the loader:

> A file with no `sensitivity` key is refused, and named on stderr as unmarked.

That turns "somebody added a file and forgot the key" from an accidental publication into a
build error. It is four lines in `build-seed.mjs` and it is the single best safety change
available in this session.

---

## 3. Task two — sections

`0015` needs the manual addressable at the paragraph, not the document. The loader learns to emit
`governance_section` rows alongside `governance_document`.

### What a section is

**The deepest heading and the text under it**, up to the next heading of any level. The
transcription's heading structure is the manual's own — the loader already relies on this to
split the docket, and the same approach works here.

Each section carries:

- `heading_path text[]` — the headings above it, outermost first:
  `['ARTICLE II. CHURCH LEADERSHIP', 'B. The Deacon Board', 'Section 3. Officers']`
- `citation text` — the form the docket writes: `Art. II.B §3`, `A009 §4`
- `anchor text` — a stable slug, the URL fragment
- `body text` — the markdown, verbatim
- `position integer` — document order

### Citation rules

The loader already has both halves of this: the `CITE` regular expression and `normaliseCite()`,
written to collect citations out of the docket's prose. **Reuse them; do not write a second
dialect.** The rules they implement:

- Bylaw articles: `Art.` + roman numeral + optional letter + optional `§n` + optional `¶n`. The
  article comes from the file's `article:` front-matter key — all seven have one — and the letter
  and section from the heading path.
- Policies: the policy code from `id:` (`A009`), plus `§n` where the policy's headings are
  numbered.
- Everything else — forms, the appendix, the quick reference, the acknowledgements — gets an
  empty citation and is found by text alone. That is correct; nobody cites the acknowledgements.

**Paragraph numbers stay in the body rather than becoming their own rows.** The manual's
paragraphs are numbered within a section, so `Art. II.B §3 ¶12` resolves to the section and the
reader finds the paragraph on the page. Splitting to the paragraph would multiply the row count
several times over and make every snippet too short to be worth reading.

### Anchors

Slug of the citation where there is one (`art-ii-b-3`, `a009-4`), otherwise slug of the heading
path joined (`appendix-version-history-2024-amendments`). They must be **stable across re-loads** —
they end up in URLs that people paste into emails and agendas — so derive them from the
citation and the heading text, never from a row number or a position.

### The losslessness check

**The concatenated section bodies, in position order, must reconstruct the document body
exactly.** Write it as an assertion in the loader and fail the build when it does not hold. A
section splitter that silently drops the text between two headings is the kind of bug that is
invisible until a deacon cannot find a paragraph he knows is there.

---

## 4. Task three — the loader

`supabase/governance/build-seed.mjs`, in the same pull request as `0015`. Five changes:

1. Read `audience:` from front matter, in both `[a, b]` and `a, b` forms. Default `{deacon}`.
   Emit it, and include it in the `on conflict … do update set` so a re-load applies decisions.
2. Refuse and name a file with no `sensitivity` key (task two above).
3. Emit `governance_section` rows, with the anchor, citation, heading path, body and position
   rules above. Delete-and-reinsert sections per document inside the transaction — they have no
   natural stable key beyond the anchor, and a re-load should not leave orphans behind.
4. Assert losslessness; fail loudly.
5. Extend the stderr summary. Today it prints document and finding counts and names what it
   refused. Add: section count, and a line for each audience value with its count — `41
   {staff,deacon} · 9 {deacon}`. The whole point of the audience work is that the split is
   reviewable at a glance, and stderr is where somebody will actually see it.

---

## 5. Verification before any of this loads

The corpus folder already has `_build/verify.py` and `_build/verify_guide.py`, the latter
machine-checking sixty-eight bylaw and policy citations in the chairman's guide. Extend that habit
rather than inventing a new one.

- [ ] Every loading file has an explicit `audience` and an explicit `sensitivity`.
- [ ] Re-run the loader. Confirm it names all eighteen restricted files on stderr, by name.
- [ ] Confirm the counts: 50 documents, 17 findings, and a section count that is plausible for a
      manual this size — if it comes back at 50, the splitter is not splitting.
- [ ] Every citation in `DISCREPANCY-DOCKET.md` resolves to a **section**, not merely to a
      document. This is the real test of the citation rules, and it is the one most likely to
      find a gap.
- [ ] Re-run `verify_guide.py`. All sixty-eight chairman's-guide citations still resolve.
- [ ] Losslessness assertion passes on all fifty documents.
- [ ] Grep the generated SQL for the words `salary`, `performance standard`, and `E006`. Expect
      nothing outside the docket's own references to them. Do this by hand, once, even though the
      loader refuses them — it costs a minute and it is the check that would catch a mistake
      nobody anticipated.

---

## 6. What this session produces

1. The corpus folder, with `audience` and `sensitivity` on every file. Committed to
   `Claude_Files`, uncommitted first so Joshua reviews the classification before it is final.
2. A patched `build-seed.mjs`, ready to travel with `0015`.
3. `supabase/governance/seed.sql`, regenerated.
4. A short note — six or eight lines — listing every document classified `[deacon]` and why, so
   that the decision is reviewable a year from now without re-reading fifty files.

## 7. What this session does not do

It does not write the migrations (`0014` and `0015` belong to Claude Code, in the repository), does
not touch `src/screens/Reference.tsx`, does not edit a sentence of the transcription, and does not
add, remove or reclassify a restricted file.

---

*One judgement call worth surfacing to Joshua rather than settling in the session: **D002 Family
Assistance Fund**. It is proposed deacon-only above, on the reasoning that the committee's
confidentiality is a real structure in this system. The argument the other way is that the policy
is printed in the manual for the whole church and only the committee's **membership and its
cases** are confidential. Either is defensible; it should be decided rather than defaulted.*
