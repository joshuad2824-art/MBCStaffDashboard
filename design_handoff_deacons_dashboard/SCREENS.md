# Screen specification — MBC Deacons' Dashboard

Implementation detail for the three screens in
`prototypes/MBC Deacons Dashboard.dc.html`. Read `README.md` first for fidelity,
what not to carry over, and the body-badge spec. Every measurement below is the
measurement to hit. Every colour is a token from `design-tokens.css`; the aliases
added for this side are in `design-tokens-additions.css`.

Target codebase: the existing React + Vite app in this repository —
`src/components/ui`, `src/styles/tokens.css`, `src/screens/`, and the router and
repository seam already there. Recreate these designs in those patterns; do not
ship the prototype HTML.

---

## 0. The shell

Inherited from the staff dashboard (`../design_handoff_staff_dashboard/README.md`
→ "Application shell") with three changes.

```
┌────────────────────────────────────────────────────────────────────┐
│ prototype banner (dark, remove in production)                      │
├──────────────┬─────────────────────────────────────────────────────┤
│ sidebar      │ CONTEXT BAR — dark, sticky, above the header        │
│ 258px        ├─────────────────────────────────────────────────────┤
│ sticky       │ sticky header: eyebrow + H1, right-side actions     │
│ 100vh        ├─────────────────────────────────────────────────────┤
│              │ surface lead paragraph (64ch)                       │
│              │ surface body, max-width 1380px                      │
└──────────────┴─────────────────────────────────────────────────────┘
```

**Grid:** `grid-template-columns: minmax(0,258px) minmax(0,1fr)` — 258px, not the
staff side's 244px, because the nav labels are 15px here rather than 14px.

**Sidebar.** `background: var(--surface-card)`, `border-right: 1px solid
var(--border-section)`, padding `24px 16px`, sticky, `height: 100vh`,
`display: flex; flex-direction: column; gap: 24px`.

- Brand block: `assets/mbc-mark.png` at 38×38 `object-fit: contain`, then
  "Memorial" in Lora 600/18px `letter-spacing: -.015em`, and the second line in
  Lato 700/8px `letter-spacing: .26em` `color: var(--text-muted)`. **The second
  line is the context:** `DEACONS' DASHBOARD` in deacon view, `STAFF DASHBOARD`
  in staff view.
- Nav items: **min-height 48px** (staff side is 44), radius 10px, padding
  `13px 14px`, Lato **15px**. Active = `background: var(--surface-panel)` +
  `1px solid var(--border-section)` + weight 700. Inactive = transparent, weight
  400, `hover: background: var(--surface-panel)`. Right-side tag (e.g. "Tonight")
  is Lato 700/9px `.16em` caps in `var(--text-eyebrow)` — a tag, never a count
  badge; there is no unread number on this side.
- Deacon nav order: **Which side today** · divider · **The meeting** (tag
  "Tonight") · **Finance committee**. Assembled from `my_bodies()`.
  No other committee room appears, in any state.
- Under the nav, above the signed-in block: a mono footnote, Lato→mono 12px/1.6
  `var(--text-muted)`, over a `1px solid var(--border-card)` rule, naming the
  surfaces that go straight to code. **Handoff scaffolding — delete in
  production.**
- Footer: "SIGNED IN AS" eyebrow (stone, sm), name Lato 700/15px, then the bodies
  line Lato 400/13px `var(--text-meta)` — `Deacon Board · Finance committee ·
  chair`. This replaces the staff side's `role · role staff|limited`: on this
  side a man is described by what he belongs to, not where he sits on a ladder.

**Context bar** (`--context-*` tokens). `position: sticky; top: 0; z-index: 6`,
`background: var(--surface-dark)`, padding `14px clamp(20px,3vw,40px)`,
`display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center;
justify-content: space-between`.

- Left: context name in **Lora 700/20px** `letter-spacing: -.01em`
  `color: var(--text-on-dark-strong)`, then the explain line in Lato 400/14px
  `var(--text-on-dark-label)`: "Anything you write here goes to the Board unless
  you widen it."
- Right: a dark-ground ghost button — `1px solid var(--mbc-dark-border)`, radius
  999px, padding `0 20px`, min-height 44px, Lato 700/14px
  `var(--text-on-dark)`; hover brightens the border to `var(--mbc-on-dark)`.
  Label "Switch to staff view" / "Switch to deacon view".
- It sits **above** the sticky header and stays visible. It is one of the page's
  two permitted dark grounds, which is why no screen below adds a second dark band.
- Alternative treatment, behind the `contextMarker: 'pill'` prop: no bar; a dark
  pill (`background: var(--action-dark)`, `color: var(--text-on-dark)`, radius
  999px, `0 18px`, 44px, Lato 700/14px) plus an outline Switch button, both in the
  header's right-side action row. Quieter, and the recommendation is `bar`.

**Header.** Unchanged from the staff side except the date is 13px rather than
12px, and the only action is an outline "Print the packet" / "Print this report"
(meeting and report screens only). `position: sticky; top: 0; z-index: 5`,
`background: rgba(248,243,235,.94)`, `backdrop-filter: blur(12px)`,
`border-bottom: 1px solid var(--border-section)`, padding
`20px clamp(20px,3vw,40px)`. Eyebrow (lamplight, sm) + H1 Lora 600
`clamp(24px,2.4vw,32px)` `letter-spacing: -.02em`.

**Content.** padding `clamp(24px,3vw,40px) clamp(20px,3vw,40px) 96px`,
`max-width: 1380px`. Each surface opens with a lead paragraph, **Lato 400/17px,
line-height 1.7**, `color: var(--text-meta)`, `max-width: 64ch`,
`text-wrap: pretty`, margin-bottom 30px.

**Toast.** Same mechanic as the staff side: fixed bottom-centre pill,
`var(--surface-dark)`, radius 999px, `box-shadow: var(--mbc-shadow-print)`,
padding `14px 24px`, message Lato 400/15px `var(--text-on-dark)`, plus a
dark-ground ghost "CLOSE" (Lato 700/10px `.16em` caps). Auto-dismiss 3.4s.
Undo/history, present mode and the sensitivity rule all carry over from the staff
bundle unchanged.

---

## 1. Which side today?

**Purpose.** The two men who hold both sides choose one, and then never have to
wonder which one they are in. Eyebrow "YOU HOLD BOTH SIDES" · H1 "Which side
today?"

Vertical stack, `display: grid; gap: 20px`.

### a. Two choice cards

`repeat(auto-fit, minmax(330px,1fr))`, gap 20px. Both cards: radius
`var(--mbc-radius-panel)` (20px), padding `30px clamp(24px,2vw,32px)`,
`display: flex; flex-direction: column; gap: 20px`.

| | Deacon view | Staff view |
| --- | --- | --- |
| ground | `var(--surface-card)` | `var(--surface-panel)` |
| border | `1px solid var(--border-card)` | `1px solid var(--border-section)` |
| eyebrow | sage, sm — "Two bodies · twelve men" | stone, sm — "Eight on staff" |
| title | Lora 600/30px, `-.02em` | same |
| body | Lato 400/16px/1.65, `var(--text-body)`, 42ch | same |
| list rule | `var(--border-hairline)` | `var(--border-section)` |
| action | **primary** (Lamplight) "Open the deacon view" | **outline** "Open the staff view" |

The waiting list inside each card is a 1px-gap grid over the rule colour, rows
padded `13px 2px`, label Lato 400/16px `var(--text-heading)` left, meta Lato
400/14px `var(--text-meta)` right. Three rows each, real counts in production
(reports not filed, minutes awaiting the Board / unclaimed commitments, bulletin
state, decisions not announced).

One Lamplight button per view: it is the deacon card's, because this is the
deacon side. The action row sits in `margin-top: auto` so both cards' buttons
align regardless of list length.

Behind `showLandingChoice: false` this whole section is absent and the context bar
carries the job alone.

### b. The three rules card

`var(--surface-card)`, `1px solid var(--border-card)`, radius
`var(--mbc-radius-card)` (16px), padding `26px clamp(22px,2vw,30px)`.
Header: lamplight sm eyebrow "WHY THE TOGGLE HAS THREE RULES" + Lora 600/24px
sentence, over `padding-bottom: 16px; border-bottom: 1px solid
var(--border-hairline)`.

Rows in a 1px-gap grid over hairline, each `grid-template-columns: 34px minmax(0,1fr)`,
gap 16px, padding `18px 2px`: the numeral in **Lora 600/22px
`var(--text-eyebrow)`**, then title Lato 700/16px `var(--text-heading)` and body
Lato 400/15px/1.65 `var(--text-body)` at 72ch. Copy verbatim from §2.4 — narrows
never widens, stays the loudest thing on screen, composing inherits the side.

### c. Composer + badge specimens

`display: flex; flex-wrap: wrap; gap: 20px`; composer `flex: 3 1 520px`,
specimen rail `flex: 1 1 320px`.

**Composer** (`var(--surface-card)` card, same 16px radius and padding as above):

- Subject `<input>` and first-post `<textarea rows=3>`: `background:
  var(--surface-field)`, `1px solid var(--mbc-border-input)`, **radius 10px**,
  min-height 48px (input) / padding `13px 14px` (textarea), Lato 400/16px,
  `color: var(--text-heading)`. Field labels are Lato 700/13px `.04em`
  `var(--text-heading)` above the field, gap 8px.
- Audience row: "Deacon Board" is a **static** pill — `var(--surface-panel)`,
  `1px solid var(--mbc-border-control)`, 999px, `0 18px`, 44px, Lato 700/15px,
  with the word "inherited" beside it in Lato 400/13px `var(--text-meta)`. It
  cannot be removed; audience is never empty.
- "Add staff" is a toggle pill: off = transparent + `1px solid
  var(--border-control)` + weight 400; on = `var(--surface-panel)` + `1px solid
  var(--text-heading)` + weight 700, label becomes "Staff · added".
- When staff is added, a warning block appears: `background:
  var(--mbc-lamplight-tint)` (#F6E3D2), radius 14px, padding `15px 17px`, Lato
  400/15px/1.65 `var(--text-heading)`, 62ch — "Widening is a second act, and it is
  deliberate. Eight staff members will be able to read this thread…". Full-opacity
  ink on the tint; do not mute it.
- Footer over a hairline: "This record will carry" + the **live body badge**, and a
  **dark** "Post the thread" button (sm). The badge is the same component as the
  specimens and changes with the toggle.

**Specimen rail** (`var(--surface-panel)`, `1px solid var(--border-section)`):
header eyebrow "THE ONE NEW COMPONENT" + Lora 600/22px "The body badge.", then
three rows in a 1px-gap grid over `var(--border-section)`. Each row is the badge
(on `var(--surface-card)` ground, since the rail is panel) plus a lowercase mono
caption in 12px/1.5 `var(--text-muted)`. Closing line over a rule: a confidential
body never appears in a badge on a record it does not own.

Badge geometry, all three states, is in `README.md` → "The body badge".

---

## 2. The September meeting

Eyebrow "THE SPINE OF THE DEACON YEAR" · H1 "The September meeting".
`display: grid; gap: 20px`.

### a. Meeting card + phase strip

Card (`var(--surface-card)`, 16px radius, `26px clamp(22px,2vw,30px)`,
`display: grid; gap: 22px`).

- Title line: Lora 600/26px `-.015em` — "Monday, September 14, 2026 · 7:00 PM ·
  fellowship hall". Meta Lato 400/15px `var(--text-meta)` — kind, which meeting of
  twelve, deacon year, who is on the roll. Right: the **body badge** reading
  "Deacons" (single-body, stone).
- **Phase strip.** `display: flex; flex-wrap: wrap; gap: 1px`, `background:
  var(--border-hairline)`, `1px solid var(--border-card)`, radius 16px,
  `overflow: hidden`. Cells `flex: 1 1 230px`, `min-height: 116px`, padding
  `20px 22px`, `display: grid; gap: 9px`. **Flex, not `auto-fit` grid** — a
  wrapped row must not leave a filled ghost cell.
  Each cell: step label Lato 700/10px `.18em` caps `var(--text-eyebrow)`
  ("Phase one of three" — words, not a numeral), name **Lora 600/24px**, state
  line Lato 400/14px `var(--text-meta)` (derived: locked/open, N of 13 recorded,
  draft saved). Selected cell = `background: var(--surface-panel)` +
  `box-shadow: inset 0 0 0 2px var(--mbc-border-control)`; others
  `var(--surface-card)`.

### b. Phase one — Agenda

`display: flex; flex-wrap: wrap; gap: 20px`; list `flex: 3 1 560px`, rail
`flex: 1 1 320px`.

**Agenda list card.** Header row: tracked label "THE AGENDA ASSEMBLES ITSELF"
(Lato 700/11px `.18em`, lamplight) left, derived meta right, over a hairline.
Rows in a 1px-gap grid over hairline, `grid-template-columns: 34px minmax(0,1fr)
auto`, gap `8px 16px`, padding `16px 2px`:

- position: Lora 600/17px `var(--text-meta)`, tabular
- title: Lato 400/17px `var(--text-heading)`, `text-wrap: pretty`
- meta: Lato 400/14px `var(--text-meta)` — owner, filing date, rule citation
- source tag, right, Lato 700/10px `.16em` caps, `white-space: nowrap`:
  `recurring` → `var(--text-muted)`, `report` → `var(--mbc-yale-sage)`,
  `old business` → `var(--text-eyebrow)`, `manual` → `var(--text-muted)`

Eleven seeded items covering all four sources, including the October roster filing
and the 10 October budget-calendar start (derived obligations, never typed) and
**"Family Assistance committee reported"** whose meta line is the point: *that it
reported is the whole record here.*

Footer over a hairline: a sentence about what locking does + the screen's one
Lamplight button, "Lock the agenda" → becomes an outline "Unlock it". Locking
toasts "Agenda locked. The packet went to thirteen men."

**Right rail**, two cards stacked, gap 20px:

1. "COMMITTEE REPORTS DUE" (`var(--surface-panel)`): one row per committee,
   name Lato 400/16px, state Lato 700/10px `.16em` caps —
   `Filed` in `var(--mbc-yale-sage)`, `Not filed` in `var(--text-eyebrow)` — and a
   meta line. Family Assistance shows **Filed** with the meta "You are not on this
   committee. That it filed is all you can see."
2. "CARRIED FROM 11 AUGUST" (`var(--surface-card)`): tabled motions, Lato
   400/15px/1.6, derived from last month's dispositions.

### c. Phase two — In session

Three stacked cards, gap 20px.

**Attendance roll.** Header: "ATTENDANCE · CALL THE ROLL" + live counts (Lato
400/15px, tabular) over a hairline. One row per man in a 1px-gap grid over
hairline, padding `14px 2px`, `display: grid; gap: 12px`:

- Left (min-width 190px): name Lato 400/17px `var(--text-heading)`, role Lato
  400/14px `var(--text-meta)` — "chairman · student ministry", "treasurer ·
  Finance chair", "senior pastor · ex officio".
- Right: three pills, **min-height 48px**, radius 999px, padding `0 20px`,
  labelled **Present / Absent / Excused** in words. Unselected = transparent +
  `1px solid var(--border-control)` + Lato 400/15px; selected =
  `var(--surface-panel)` + `1px solid var(--text-heading)` + weight 700.
  **No colour encodes a state** — this is a record, not a verdict.
- Marking a man **absent** reveals a just-cause `<textarea rows=2>` (74ch max)
  under a Lato 400/14px `var(--text-meta)` explainer: "Just cause — a note written
  by a person, in his own words. Optional, and never a checkbox."
  `just_cause_note` is free text. There is no "just cause?" boolean anywhere.

**The three-fourths panel** (`var(--surface-panel)`, `1px solid
var(--border-section)`). Eyebrow, lamplight sm: "CHAIRMAN ONLY · THIS PANEL IS NOT
ON ANYONE ELSE'S SCREEN". Lora 600/24px: "The count, and the threshold. Nothing
else." Body Lato 400/16px/1.7 at 70ch states the arithmetic (¾ of twelve is nine;
a man may miss three), that the flag is raised at a second absence, and that
nothing acts on the number.

Rows, 1px-gap over `var(--border-section)`, `grid-template-columns: minmax(0,1fr)
auto`: name Lato 400/17px, note Lato 400/14px/1.55 at 64ch, count **Lora 600/20px
tabular** right ("6 of 9"). Only men with at least one absence appear; a closing
line names how many have missed none, and restates the present-mode exclusions.

**In production this panel is a query**, not a hidden div —
`is_chair_of('deacon-board')` or it returns nothing.

**Motions.** Header + derived meta ("N captured tonight · N tabled to October").
Each motion, 1px-gap over hairline, padding `18px 2px`, gap 10px:

- text Lato 400/17px/1.6 `var(--text-heading)`, 84ch
- disposition Lato 700/10px `.16em` caps — `approved` sage, everything else
  lamplight — then meta Lato 400/14px (mover, seconder, count)
- if it amends the bylaws: an inset block, `var(--surface-panel)`, radius 14px,
  padding `16px 18px`, holding the citation and **the sentence quoted before and
  after**, each prefixed by a bold "Before. " / "After. " run, plus the reason the
  field exists (a ledger that quotes the sentence cannot drift the way one that
  cites a paragraph number does — see `DISCREPANCY-DOCKET.md` findings 8 and 9).

Capture form under a hairline: Lora 600/22px "Capture a motion", then the text
area, a `repeat(auto-fit, minmax(230px,1fr))` row of Moved by / Seconded by
`<select>`s (48px, radius 10px, `var(--surface-field)`) and a two-field For /
Against pair, then disposition as four 48px pills (approved · tabled · withdrawn ·
failed) using the same selected treatment as attendance. Footer: the amendment
hint + a **dark** "Record this motion". Validation: text and a disposition are
required; the toast says so rather than an inline error.

### d. Phase three — Minutes

`flex` row; assembled `flex: 3 1 540px`, secretary's column `flex: 2 1 380px`.

**Assembled card.** Eyebrow "ALREADY IN THE RECORD — NOBODY RETYPES THIS", Lora
600/24px "Assembled from tonight." Four blocks in a 1px-gap grid over hairline,
each: title Lato 700/11px `.18em` caps `var(--text-heading)` left, **mono
provenance** 13px `var(--text-muted)` right ("from phase two", "from the report
builders", "derived from dispositions"), then lines Lato 400/16px/1.65 at 80ch.
All four are **derived live** from the attendance map and the motions list — edit
either and these change. Blocks: attendance summary · committee reports received ·
motions with dispositions · carried to October.

**Secretary's column.** Panel card: eyebrow "WHAT ONLY YOU CAN WRITE", Lora
600/22px, then three `<textarea rows=3>` on `var(--surface-card)` ground (radius
10px, Lato 400/16px/1.65) labelled opening and prayer · the pastor's word to the
Board · closing. Footer over a rule: the state line, then **outline** "Save the
draft" + **primary** "Publish the minutes" → "Publish a new version" once
published.

Below it, a card carrying the §4.4 note for the Board: Art. II.E makes the Church
Clerk the keeper of the church's records, so whether this copy or the Clerk's is
the record of file is a Board decision, and it should be made before the first set
is published.

---

## 3. Finance committee report

Eyebrow "FINANCE · CURTIS NOLEN, CHAIR" · H1 "Committee report".
`display: grid; gap: 20px`.

### a. Lifecycle strip

Same construction as the phase strip — `flex; wrap; gap: 1px` over
`var(--border-hairline)`, `1px solid var(--border-card)`, radius 16px, cells
`flex: 1 1 190px`, `min-height: 104px`, padding `18px 22px`. Four cells: draft ·
submitted · published · archived. Current cell = `var(--surface-panel)` with its
step label in `var(--text-eyebrow)`; the rest `var(--surface-card)` with the label
in `var(--text-muted)`. Each carries a plain sentence about what that state means
("Only the chair sees it", "Official, printable, and in the meeting packet").

### b. The form — four numbered sections

`flex: 3 1 560px` column, `gap: 20px`. Each section is a `var(--surface-card)` /
16px / `26px clamp(22px,2vw,30px)` card with a tracked header over a hairline:
**"One · budget position", "Two · notable variances", "Three · actions the
committee took", "Four · items for the Board"**. Numbered words, because an
infrequent user needs to know how much is left.

1. **Budget position.** Three fields in `repeat(auto-fit, minmax(210px,1fr))`:
   annual budget adopted, received year to date, spent year to date. Inputs 48px,
   radius 10px, `var(--surface-field)`, Lato 400/17px, tabular. Under a hairline:
   a derived sentence (Lato 400/16px/1.65, 56ch) and the derived position in
   **Lora 600/30px tabular** right. Input strips non-digits; the sentence and the
   printed preview recompute on every keystroke. **Derivation, not entry** — the
   position, the percentage of budget and the percentage of year are never typed.
2. **Notable variances.** Repeatable rows: an inset `var(--surface-panel)` block,
   radius 14px, padding `16px 18px`, holding a two-up line/amount row on
   `var(--surface-card)` fields and a one-sentence `<textarea rows=2>`. Under
   them, an outline 48px "Add a variance" pill (`1px solid
   var(--mbc-border-control)`, hover fills panel and darkens the border to ink).
   One line, one figure, one sentence — never a paragraph.
3. **Actions taken.** A stack of single-line 48px inputs plus "Add an action".
4. **Items for the Board.** Repeatable inset blocks: the item text, then a toggle
   pill — "Needs a vote · goes on as new business" (selected) / "No vote needed".
   The header's right-hand meta counts them: *"One item will be added to the agenda
   as new business."* Footer over a hairline: the state hint + **outline** "Save
   the draft" + **primary** whose label follows the lifecycle — Submit to the Board
   → Publish the report → Save as a new version.

### c. Right column — `flex: 2 1 360px`

1. **"As it will be filed and printed."** The printed artefact:
   `background: var(--surface-print)` (#FDFBF7), `1px solid
   var(--mbc-border-photo)`, **radius 4px**, `box-shadow:
   var(--mbc-shadow-print)`, padding `30px 32px` — the one on-screen shadow in the
   file, because it stands in for paper. Inside: tracked 10px `.2em` label, Lora
   600/24px title, a Lato 400/14px byline (period · chair · which meeting), then
   the four rendered sections in a 1px-gap list, each with a tracked 10px title and
   Lato 400/15px/1.65 lines. Every line is generated from the form state —
   the preview is the `rendered` column, not a mock.
2. **"Versions · nothing overwrites."** Rows: label Lato 400/16px, meta Lato
   400/14px `var(--text-meta)`. Publishing prepends a row rather than replacing
   one. Closing line: an edit after publication creates a new version and leaves
   the prior one readable — that is what lets the edit button exist at all.
3. **"The pattern the other builders follow"** (`var(--surface-panel)`), behind
   `showPatternNotes`. Five rules, Lato 400/15px/1.65, 1px-gap over
   `var(--border-section)`: one form per committee shaped to that committee ·
   figures are fields and narrative is one sentence per row · Personnel carries no
   compensation figures and Family Assistance no circumstances · submitting files
   it and puts it on the agenda · publishing versions rather than overwrites.
   **Handoff scaffolding — not a user-facing panel.**

---

## 4. State

Prototype state, and what replaces it in production.

| Prototype state | Production |
| --- | --- |
| `context: 'deacon' \| 'staff'` | Session/UI state. A **view filter only** — it must never enter a query. |
| `screen`, `phase` | Router. Phase belongs in the URL so a man can be sent to the roll. |
| `attendance: {person_id: status}`, `cause: {person_id: note}` | `meeting_attendance` rows, written as the roll is called. |
| `agendaLocked` | `board_meeting.agenda_locked_at` (a timestamp, not a boolean — who locked it and when is part of the record). |
| `motions[]` | `motion` rows. `tabled` sets `tabled_to_meeting_id` on next month's meeting, which is what makes old business assemble itself. |
| `narrative{}`, `minutesStatus` | `report_version` with `report_kind = 'minutes'`; `board_meeting.minutes_status`. |
| `report{}`, `reportStatus` | `committee_report.payload` (jsonb) + `report_version`. Publishing writes a version; it never updates in place. |
| `audienceStaff` | `thread.audience text[]`, seeded from the context. Empty audience is a bug, not a private record. |
| `toast` | The staff side's existing toast/undo mechanic. |

Derived, and never stored: attendance counts against the threshold, `next_due` on
every obligation, the budget position, the agenda's recurring items, "carried to
October", and the "N items will be added to the agenda" count. Reuse
`lib/derive.ts`, the pattern the cadence ledger already uses.

## 5. Responsive behaviour

Desktop-first; the men use this on a laptop in the fellowship hall, and the
chairman on an iPad. Everything reflows by flex/grid basis — no fixed widths on
anything holding text.

- Two-column screens are `flex-wrap: wrap` with a `3 1 …` main column and a
  `1 1 320px` or `2 1 360px` rail, so the rail drops **below** rather than
  squeezing the content.
- Strips are `flex: 1 1 190–230px` so a wrapped row fills, leaving no ghost cell.
- Field rows are `repeat(auto-fit, minmax(180–230px,1fr))`.
- The attendance pills wrap under the name rather than shrinking below 48px.
- Below ~1040px the sidebar should collapse to a menu button, as it does on the
  staff side. **Not drawn here** — inherit that behaviour.

## 6. Assets

- `prototypes/assets/mbc-mark.png` — the real logo mark, at 38px in the sidebar.
- `prototypes/assets/icon-192.png`, `favicon.svg` — unchanged from the staff
  bundle. The favicon is **not** the app logo.
- Fonts: self-hosted Lora + Lato woff2 under
  `prototypes/_ds/…/assets/fonts/` — the exact binaries the live site serves.
- No icons, no illustrations, no photography. The only glyphs in this file are
  `·` and `—`.
