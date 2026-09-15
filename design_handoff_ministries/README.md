# Handoff: Memorial Baptist Church — the ministries directory

## What this is

Two routes. `/ministries` — the landing page: five ministries as cards, and nothing
else to decide. `/ministries/:slug` — one ministry, the groups inside it, and who
serves in each one. It is the design half of screen two in
`CLAUDE-DESIGN-BRIEF.md`; the index was added afterwards at Joshua's request, so
that someone who clicks **Ministries** chooses a ministry before he is shown
anybody's groups.

The five are **Adults, Students, Children, Preschool, Music**. Community groups do
not get a directory of their own — they live under the ministry they belong to,
which is why `Tuesday Night · McGuire` is on the Adults page.

### The index page

One card per ministry: its name, its live group count as a plain tabular number, one
line saying what is inside, and beneath a hairline the composition (`two classes ·
one community group · nine people serving`) and the gap line. A ministry with a gap
says so in Lamplight on the card, so the thing worth chasing is visible before you
open anything; the panel band at the foot totals the gaps across all five and names
the ministries they are in. **Nothing on the index edits anything** — it routes.

**Who serves. Never who attends.** There is no attendance field on this screen, no
headcount, no roster, and the audience note is free text on purpose: "Grades 7–12"
describes a group, it does not list children. Nothing downstream should add one.

## The file

`prototypes/MBC Ministries.dc.html` — open it in a browser.

Five ministries are seeded so the page is tested against real variety, and the chip
row at the top switches between them. Each one is a state from the brief:

| Ministry | The state it shows |
| --- | --- |
| **Students** | **Full** — two live groups, four and three people, roles on every one. |
| **Adults** | **Full plus a gap** — a Sunday class, two community groups, and `Thursday Morning · Women` with nobody in its leading role. |
| **Music** | **Two gaps of different kinds** — a team with one coordinator, and `Handbells` with nobody named at all. Handbells also shows the nobody-named-yet row. |
| **Preschool** | **The small case** — one group, one person. The layout has to not look broken. |
| **Children** | **Full, no gaps** — a Sunday class and the Wednesday club, three and two people. |

`Students` and `Adults` each carry an **archived** group behind the toggle.

### Interactions that are real in the prototype

- **Editing in place.** Every value — the group name, Meets, Location, Audience
  note, a person's name, a person's role — is a button at rest and a field when
  clicked. No modal, no edit mode, no Save bar. `Done` closes it. This is the
  People-page and `OwnerSelect` pattern, applied to a list nested in a list.
- **Everything on the page is editable without discovering anything.** At rest, a
  serving row carries its role as a select, `✎` to change the name, and `×` to end
  the assignment. A group carries `✎` on its name, its kind as a select, `✎` in
  every fact cell (Meets, Location, Audience note), `End this group`, and `×` to
  remove it outright. The ministry's own description takes `✎` too. Every icon
  button has a title and aria-label naming the thing and the consequence — *Remove
  Brycen Hollis from Sunday Morning · Grades 7–12. The person record stays.*
- **Adding and removing groups is real.** `Add a group` in the header and `Add a
  class, community group or team…` at the foot of the list both create a group
  with its name field open. `×` on a group asks first (`Remove Handbells and its 0
  serving assignments?` / *Remove it* / *Keep it*), because it is the one
  destructive action on the screen — not hover states, and not hidden behind clicking the
  row. Any staff member who can open the page can change a role, correct a name or
  end an assignment. (Clicking the name still opens the same row for editing; that
  is the shortcut, not the only way in.)
- **Adding a person.** `Add someone…` opens one inline row: a name field (with the
  roster as a datalist), a role select, `Add to this group`. A name that is not
  already on the roster **creates the person and assigns them in one motion** — the
  toast says so. Leaving the page to create a record first is how a class ends up
  with no teacher on file.
- **Naming into a gap.** The gap's own button (`Name a teacher`, `Name a host`,
  `Name a coordinator`) opens the same add row with that role pre-selected.
- **Removing.** `Remove from this group` ends the assignment; the person record
  stays, and the toast says that too.
- **Gaps only** filters to the groups with an unnamed leading role. **Show the
  groups that have ended** reveals the archived ones, on the panel ground, with
  their ended date, read-only until someone reopens them.
- **The counts** in the header, the gap band and the `Who serves` line are all
  derived from the data as you edit it.

### The gap treatment

The state the whole surface exists to expose, and it is legible at a glance with no
red anywhere:

1. **A count in the panel band** — the Cadence ledger's treatment in its own words:
   `2 groups with nobody in their leading role` / *A leading role with nobody in it
   is a state, not a blank.*
2. **A label on the group**, in Lamplight at 700/13px — the ledger's `Unclaimed`
   ink and weight, worded for this surface: `No teacher named.`
3. **One button that fixes it**, beside the label, pre-set to the missing role.
4. **A filter**, so a staff member can see only the gaps.

The leading role is decided by the group's kind: a class needs a **teacher** (or
co-teacher), a community group needs a **host** (or leader), a team needs a
**coordinator** (or leader). That mapping is a product decision worth confirming
before it is coded.

### Three tweakable props (host Tweaks panel)

| Prop | Default | What it decides |
| --- | --- | --- |
| `ministry` | `index` | Which page opens first — `index` for the landing page, or a slug for that ministry. In production this is the route. |
| `showGapBand` | `true` | Whether the count band appears above the groups, or the per-group label carries the whole job. Worth deciding before it is built. |
| `showPatternNotes` | `true` | The four-decision rail at the foot. Handoff scaffolding — turn it off to see the screen as staff would. |

## Fidelity

**High-fidelity, and on the staff side's floors, not the deacon side's.** This
screen is opened weekly by people who will know it well: body 16px, meta 13px,
controls 44px, which is the staff dashboard's scale rather than the deacon
dashboard's raised one. Colours, type, spacing, radii and copy come from the bound
design system unchanged.

Brand rules restated: no gradients, no shadows on screen (the toast is the one
exception in this file), no animation, **no icon set** — the `·` between a name and
a role and the `…` on `Add someone…` are the only glyphs — no emoji, one Lamplight
button per view (`Add a group` in the header), no pure black or white, **no status
reds**, at most two dark bands (the prototype band is the only one; this surface
has no context band).

## One glyph added to the permitted list — decided

The brand's permitted glyphs are `←` `→` `·` `×` `✓` `✗` and the mark. This screen
uses `×` (permitted) and adds **`✎` U+270E as the edit affordance**, at Joshua's
ask for an edit icon rather than the words `Change the name`. It is one character in
the type stack, not an icon set — no font, no sprite, no SVG. **Joshua approved it
over the word `Edit`,** so the system's glyph list is now `←` `→` `·` `×` `✓` `✗`
`✎` and the mark. Use it for edit affordances everywhere else in the application
too, at 15–17px, inheriting type colour, always with a title and aria-label naming
the thing being edited. Nothing else in this file adds a glyph, and nothing adds an
icon font.

## Design-system additions: none

This screen adds nothing to the design system. The gap treatment is the Cadence
ledger's `Unclaimed` pattern, the chips are `Chip`, the buttons are `Button`, the
inline fields are `Input` at the existing 10px radius, and the group cards are the
existing card recipe. The one allowance in the brief was not needed here — the
reference handoff spent it on the match mark.

One dashed border appears twice (the empty-ministry panel and `Add someone…`) and
is the only new *use* of an existing property. It reads as "a thing that is not
there yet" without adding a colour.

## What NOT to carry over

1. **Every name, group, time and room is seed data.** Joshua Davis, Morgan Bice,
   Sarah Williams and the rest are the brief's example content; the McGuire home,
   the Loft, the Bereans and the handbell choir are invented. Do not seed any of it.
2. **`Discussion leader` is not in the fixed role list.** The brief gives the fixed
   list as *teacher, co-teacher, apprentice, leader, co-leader, host, volunteer,
   coordinator* and then shows two people serving as `Discussion leader`. Both are
   in the prototype, and the select offers it last. **Somebody has to decide:** add
   it to the list, or migrate those assignments. Flagged, not resolved.
3. **"Primary contact first" is rendered as list order** here — the first row wears
   the tag. In production that is a column (`is_primary`) or an explicit position,
   not an accident of insertion order.
4. **Who may edit is not modelled here.** Every control is live for anyone who opens
   the prototype. Production scopes editing to staff with the ministry role, and the
   refusal is server-side.
5. **The empty-ministry state is no longer drawn.** It existed on a demo ministry
   (Recreation) that was dropped at Joshua's request, and the five real ministries
   all have groups. The state still has to be built — a ministry with no groups gets
   the dashed invitation panel, the copy for which is in the prototype's markup
   under `isEmpty` — there is simply no ministry in the seed data that shows it.
6. **The edit state is component state and saves nothing.** Production writes on
   blur, with the undo toast the staff dashboard already uses. There is no Save bar
   and there should not be one.
7. **The roster datalist is twelve hard-coded names.** It is a typeahead against
   `person`, scoped to nobody in particular, and creating a person from it is a
   privileged action.
8. **Archived is read-only by assertion, and `Reopen this group` has no permission
   behind it.** In production, ending, reopening and removing a group are three
   separate permissions, and removal should probably be a narrower one than editing.
9. **Removal is immediate here.** It asks once and then drops the group from
   component state. Production wants a soft delete with the staff dashboard's undo
   toast, because the brief's standing rule is that a group that ran last spring is
   a fact about last spring — `End this group` is the action staff should reach for
   nine times out of ten, which is why it sits to the left of the `×`.

## Data this screen assumes

```
ministry(id, slug, name, blurb, position, active)
group(id, ministry_id, name, kind, meets_text, location_text, audience_note,
      started_on, ended_on, archived)
group_service(id, group_id, person_id, role, is_primary, term_start, term_end)
person(id, display_name, …)
```

`kind` is `class | community_group | team`. `role` is the fixed list above. Derived,
never stored: the group count, the people-serving count, whether a group has a gap,
and the gap total. There is deliberately **no** `group_attendance` table and no
place for one.

## Files in this bundle

| File | What it is |
| --- | --- |
| `README.md` | This document. |
| `prototypes/MBC Ministries.dc.html` | The five states. Open in a browser. |
| `prototypes/support.js` | Runtime the prototype needs in order to open locally. |
| `prototypes/assets/`, `prototypes/_ds/…` | Logo, fonts, tokens and the design-system bundle the prototype loads. |
| `design-tokens.css` | Every existing token, unchanged from the staff bundle. |
| `design-system-guide.md` | The full design-system guide. Read "Content fundamentals" before writing new copy. |

## Copy rules for anything new

Plain, warm, specific, short. Sentence case; headlines are complete sentences ending
in a period. Real times and real rooms — `Sundays 10:00 AM`, `Hall B, Room 104`, not
"weekly" and not "TBD". En dashes in ranges, `·` between facts, curly quotes. No
exclamation points, no hype, no emoji.

And this screen's own job: **say what the system does not do.** "Nothing here saves
a list of who attends — only who serves." "The person record stays." Those sentences
are the posture, not decoration.
