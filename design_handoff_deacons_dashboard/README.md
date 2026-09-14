# Handoff: Memorial Baptist Church — Deacons' Dashboard (three screens)

## What this is

Three screens of the deacon side of the existing staff dashboard, plus one new
component. It is the design half of `mbc-deacons-dashboard-brief.md`: the brief
sends Phases 0 and 1 (the repository swap and the access model) straight to
Claude Code, and sends exactly these three screens to design first, because
they are the ones where getting it wrong costs something.

| Screen | Brief section | Why it was drawn rather than coded |
| --- | --- | --- |
| **The meeting**, in three phases | §3.2, §7 Phase 2 | The spine. If this screen does not cohere, nothing downstream will. |
| **The context toggle and landing** | §2.4 | The failure it prevents is a man with both sides open saying something in the wrong room. |
| **The Finance committee report** | §4.1, §4.4 | One builder, as the pattern the Treasurer's report and the minutes assembler follow. |
| **The body badge** | §8 | The one addition to the design system. Specimens live on the landing screen. |

Everything else in the brief — committee rooms, care assignments, the year, the
governance reference, announcements, calendar audiences — goes straight to code.
Most of it is forms, tables and lists against a design system that already
exists, and mocking it up would be redrawing something already decided.

## The file

`prototypes/MBC Deacons Dashboard.dc.html` — open it in a browser. It carries
all three screens behind the sidebar nav, the context toggle in the header, and
the body badge in its three states.

It is a **design reference written in HTML**, not production code to lift. Recreate
it in the target codebase — the existing React/Vite app in this repository, with
`src/components/ui`, `src/styles/tokens.css` and the router it already has.

### Interactions that are real in the prototype

- **Context toggle.** Flips the nav, the lockup line, the header marker and the
  surface set. Nothing else changes, which is the point.
- **Compose inheritance.** The thread composer on the landing screen starts at
  `audience = {deacon-board}`. Adding staff is a second click, and the body badge
  and the warning line both change when you make it.
- **Phase switching.** Agenda → In session → Minutes, each with its own state line.
- **Agenda lock / unlock.**
- **Attendance.** Thirteen men, three states each. Marking a man absent opens a
  just-cause note — a textarea, never a checkbox. Six are pre-recorded and seven
  are blank so both states are visible.
- **Motions.** Capture text, mover, seconder, disposition and the count; recording
  one adds it to the list and to the assembled minutes immediately. A tabled motion
  appears under "carried to October" without anyone retyping it.
- **Minutes assembler.** The four assembled blocks are derived live from the
  attendance and motions above; the secretary's three boxes are the only writing.
- **Report builder.** Every figure is a live field; the budget position, the
  printed preview and the "N items will be added to the agenda" line all derive
  from them. The lifecycle strip advances draft → submitted → published, and the
  version list grows rather than overwriting.

### Three tweakable props (host Tweaks panel)

| Prop | Default | What it decides |
| --- | --- | --- |
| `contextMarker` | `bar` | `bar` is a full dark band above the header — the recommendation. `pill` is the quieter alternative: a dark pill among the header actions. Worth showing the Board both before building. |
| `showLandingChoice` | `true` | Whether the "which side today?" choice cards exist at all, or the header marker carries the whole job. |
| `showPatternNotes` | `true` | The "pattern the other builders follow" rail on the report screen. Handoff scaffolding — turn it off to see the screen as a user would. |

## Fidelity

**High-fidelity, with two deliberate departures from the staff dashboard.**
Colours, type, spacing, radii, copy and interaction states are final and should be
matched closely. Every value comes from the bound Memorial Baptist Church design
system (`design-tokens.css`, `design-system-guide.md`, and the aliases in
`design-tokens-additions.css`).

The two departures both come from the design note at the end of §10 — this side is
opened **monthly**, by men some of whom are in their seventies:

1. **Type floors are raised.** Body is 16–17px rather than 15–16px, meta lines are
   14–15px rather than 12–13px, and no sentence on any screen is under 15px.
   Tracked all-caps labels stay at 10–11px because they are labels, not reading.
2. **Controls are 48px, not 44px**, and they are labelled with words rather than
   glyphs. Phases are named "Phase one of three", not numbered dots; attendance
   is three buttons reading Present / Absent / Excused, not a cycling control.
   A surface that is elegant to someone who has seen it thirty times can be opaque
   to someone seeing it for the fourth.

Brand rules that are easy to violate by accident, restated:

- **No gradients, no shadows on screen, no animation.** Depth comes from the ground
  colour changing. The one shadow in this file is under the printed report preview,
  which is standing in for paper, and the toast.
- **No icon set.** No icon font, no sprite, no Lucide. Structure is type, hairline
  rules and whitespace. Do not add icons.
- **No emoji**, anywhere.
- **One Lamplight (`#A8613F`) button per view.** Lock the agenda / Publish the
  minutes / Submit to the Board are the primary on their screens; everything else
  is an outline, a dark button, or a text link.
- **No pure black or white.** Warm versions only.
- **At most two dark grounds on a page.** The context bar is one of them, which is
  why no screen here adds a second dark band.

## What NOT to carry over

Beyond the two standing items from the staff handoff — seed data in component
state, and inline styles because that is how the design workspace streams a
preview — this file has four of its own:

1. **The names, figures, motions and quoted bylaw text are seed data.** In
   particular the two quoted sentences in the bylaw-amendment motion are
   *invented for the mockup*. Do not seed them into the database and do not treat
   them as the language of Article II.B §3 ¶12. Quote the real manual.
2. **The attendance counts are illustrative.** "6 of 9", "two missed", the
   September meeting being the ninth of twelve — all fabricated to show the panel
   doing its job. The real numbers are derived from `meeting_attendance`, never typed.
3. **The chairman-only attendance panel is drawn client-side here.** In production
   it is a query that returns nothing for anyone who is not `is_chair_of('deacon-board')`.
   Hiding the panel in the client is not the control.
4. **The context toggle is a view filter and nothing else.** It filters which
   surfaces are drawn. If it ever becomes the thing deciding what a man may read,
   the access model has been broken. RLS is the only control; the toggle and the
   hidden nav are so the interface tells the truth.

And one thing that is deliberately absent rather than disabled: **no committee room
the signed-in man does not belong to appears anywhere in this file.** There is no
greyed-out Family Assistance tab, because a disabled tab announces that a
confidential committee exists and has content in it. Navigation is assembled from
`my_bodies()`; routes refuse rather than render empty; RLS returns no rows. Keep
all three.

## The body badge — the one new component

The design-system addition from §8. A small marker on any record saying which
bodies can read it.

```
ground   var(--surface-panel)   (var(--surface-card) when it sits on a panel)
border   1px solid var(--mbc-border-chip)     #D6C9B4
radius   999px
padding  7px 13px
font     700 10px/1 Lato, letter-spacing .16em, text-transform uppercase
ink      one body    → var(--text-meta)        #8A7C6C
         two or more → var(--mbc-yale-sage)    #4F7A5A
separator  ·  (middot, the brand's fact separator)
```

Three rules for it:

- **One body is quiet; two or more is sage.** A badge naming a second body should
  read as a change, not as decoration.
- **It appears wherever the record appears** — in a list, on the record, in the
  composer before the record exists, and in the meeting packet. A badge that only
  shows on the detail view does not prevent anything.
- **A confidential body never appears in a badge on a record it does not own**,
  including the October roster filed with the church (Art. II.B §3 already requires
  that exclusion, and no other committee needs it).

No new colour was invented for it. `design-tokens-additions.css` names the badge
and the context marker in terms of tokens that already existed.

## Data this screen set assumes

From §5 of the brief, the tables these three screens read and write:

```
body(id, slug, kind, name, parent_body_id, confidential, active)
membership(id, person_id, body_id, role_in_body, term_start, term_end, active)
board_meeting(id, meets_on, kind, status, agenda_locked_at, minutes_status, approved_at)
agenda_item(id, meeting_id, position, title, source, source_ref, notes)
meeting_attendance(id, meeting_id, person_id, status, just_cause_note, recorded_by)
motion(id, meeting_id, text, moved_by, seconded_by, disposition,
       tabled_to_meeting_id, vote_for, vote_against,
       bylaw_reference, text_before, text_after)
committee_report(id, meeting_id, body_id, submitted_by, submitted_at, status, payload, rendered)
report_version(id, report_id, report_kind, version_no, payload, rendered,
               created_by, created_at, published_at, supersedes_version_id)
thread(… , audience text[])        -- the composer on the landing screen
```

Derived, never stored: the attendance count against the three-fourths threshold,
the budget position, the agenda's recurring items, and "carried to October".

## Files in this bundle

| File | What it is |
| --- | --- |
| `README.md` | This document — posture, fidelity, what not to carry over, the body-badge spec. |
| `SCREENS.md` | The implementation spec: every layout, measurement, colour, type size, interaction and state variable, screen by screen. A developer who was not in this conversation can build from it alone. |
| `design-tokens.css` | Every existing token, unchanged from the staff bundle. |
| `design-tokens-additions.css` | The body badge, the context marker, and the raised floors for infrequent users. Aliases only — no new values. |
| `design-system-guide.md` | The full MBC design-system guide. Read "Content fundamentals" before writing any new copy. |
| `prototypes/MBC Deacons Dashboard.dc.html` | The three screens. Open in a browser. |
| `prototypes/support.js` | Runtime the prototype needs in order to open locally. |
| `prototypes/assets/`, `prototypes/_ds/…` | Logo, icon, fonts, tokens and the design-system component bundle the prototype loads. |

The staff bundle in `design_handoff_staff_dashboard/` is the companion. Read its
README for the application shell, the global mechanics (toast, undo, present mode,
sensitivity) and the nine staff surfaces — all of which this side inherits rather
than restates.

## Copy rules for anything new

Plain, warm, specific, short. Sentence case; headlines are complete sentences
ending in a period. "We" for the church, "you" for the reader. Real times and real
rooms. En dashes in ranges, `·` to separate facts, curly quotes. No exclamation
points in headlines, no hype, no emoji. Admissions are allowed and preferred over
dressing something up.

One addition for this side. The deacon surfaces touch attendance, assistance and
families, so the copy has a second job: **say what the system does not do.** "The
count, and the threshold. Nothing else." "This flag is a prompt to have a
conversation." "That it reported is the whole record here." Those sentences are not
decoration — they are the posture, and an infrequent user learns it from them.
