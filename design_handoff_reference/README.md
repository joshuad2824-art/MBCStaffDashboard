# Handoff: Memorial Baptist Church — the governance reference (three states)

## What this is

One surface of the existing staff-and-deacon application, drawn in the three states
it actually has. It is the design half of screen one in `CLAUDE-DESIGN-BRIEF.md`:
categories a man can choose from, a search that finds anything in the corpus, and
the document he lands on.

| State | What it holds | Why it was drawn |
| --- | --- | --- |
| **A — the landing** | The search field, the categories as cards, `Recently opened` | Today the surface opens with everything face-up. This is the state that change is about. |
| **B — results** | Sections grouped by document, snippets with the match marked, the empty answer | A result that is only a document title makes an infrequent user open five documents to find one sentence. |
| **C — the document** | A section, a contents rail, a breadcrumb, the docket, Print | Arriving at a section rather than the top of a long file is the whole point of citing one. |

Everything else in this body of work — forms, tables, the bars — is settled by the
design system already and is not mocked here.

## The file

`prototypes/MBC Governance Reference.dc.html` — open it in a browser.

The states are not artboards pinned side by side: they are the real states of one
screen, and the search drives them. Type two characters and you are in results;
open a result and you are in the document; clear the field and you are back on the
landing. The chip row at the top (`Three states`) is handoff scaffolding for
reviewing them out of order — turn it off with the `showStateRail` prop.

### Interactions that are real in the prototype

- **Search** runs against a seeded corpus of four fully-written documents plus the
  findings list. Matching is substring, case-insensitive, and the snippet window is
  built around the first match in the section.
- **The match count is a number and a sentence** — `14 matches for "chairman", in 6
  sections of 4 documents. Matched words are bold and underlined.` Nothing here is
  carried by colour.
- **Matched words** are bold, underlined at 2px, and sit on the Lamplight tint.
  Three signals, none of them a status colour.
- **The empty answer.** Search `columbarium`. The copy is the brief's and is kept
  verbatim: *Nothing in the manual says that.*
- **Policies opens to its letter series** — A, B, D, E, F, M, V, each with a line
  and a count, documents nested under the open letter. Second level, as asked.
- **`Recently opened`** is live: it reorders as you open sections, newest first,
  capped at five.
- **The document** carries the contents rail built from the section headings, the
  breadcrumb, the section marked for a beat on arrival (four seconds, then it
  returns to the page ground), and the Print inset.
- **Print** says what it sends. It does not print the rail, the nav or the field.

### Three tweakable props (host Tweaks panel)

| Prop | Default | What it decides |
| --- | --- | --- |
| `side` | `deacon` | Draws the surface as the deacon side or the staff side. As of Joshua's 15 September note the two are **identical in content** — the flag now only changes the nav, the lockup line and the context band. Keep it: the moment a deacon-only block returns, this is where it hangs. |
| `showStateRail` | `true` | The `For review only · never built` chip row. Scaffolding for reviewing the three states out of order — **do not build it**; flip it off to see the screen exactly as a user gets it. |
| `showPrintInset` | `true` | The small paper preview under a document. |

## Fidelity

**High-fidelity.** Colours, type, spacing, radii, copy and interaction states are
final and should be matched closely. Every value comes from the bound design system
(`design-tokens.css`, `design-system-guide.md`).

The accessibility floors from §2 of the brief are applied and are not negotiable
downstream:

1. **Body type is 17px** on every sentence of this surface, and the document body
   sits on a 72-character measure.
2. **Nothing is 12px.** Meta lines are 14–15px; the mono footnote in the sidebar is
   13px. Tracked all-caps labels stay at 10–11px because they are labels, not
   reading.
3. **The search field is 56px tall at 18px**, labelled in 17px sentence case rather
   than a tracked micro-label — it is the most important element on the page and
   reads that way.
4. **It is the first tab stop and is never autofocused.** A focused field on load
   steals a screen reader's opening and jumps the page on a phone.
5. **A breadcrumb on every document page**, and one idea per screen: no accordion
   inside an accordion anywhere in this file.
6. **Controls are 48px** where they carry a decision, 44px for chips.

Brand rules restated, because they are the first things a fresh eye wants to break:
no gradients, no shadows on screen (the two exceptions in this file are the paper
preview and the toast), no animation, **no icon set**, no emoji, one Lamplight
button per view, no pure black or white, **no status reds**, at most two dark bands
per page (the prototype band and the context band are the two — do not add one).

## Removed at Joshua's ask — the findings surface

The brief's sixth category (*Where the manual disagrees with itself*, 17 findings,
deacon-side only) and the `On the docket` block at the foot of a document are
**gone from this screen**: "This will not be helpful for all of the deacons to be
able to see." Findings are also out of the search index, so no query surfaces one.

Three consequences to carry into the build:

1. **The reference surface is now identical on both sides.** Nothing on it is
   deacon-only. The `side` prop still flips the nav, the lockup and the context
   band, because the surface sits inside a shell that has two sides — but the page
   itself does not branch.
2. **Nothing here says the findings exist.** If they are kept anywhere in the
   product, they are a separate surface with its own audience, not a category on a
   manual every deacon and staff member opens.
3. **`doc_section` needs no citation graph for this screen.** The `finding` and
   `finding_citation` tables are still in the data list below because the deacon
   handoff assumes them; this screen reads neither.

## The one design-system addition

**The match mark.** Everything else on this screen is existing components and
existing tokens; search results needed one treatment that did not exist.

```
ground          var(--mbc-lamplight-tint)   #F6E3D2
ink             var(--text-heading)         #3A322B
weight          700
underline       2px solid, offset 3px, inherits ink
```

Three rules for it:

- **Three signals, not one.** Weight, underline and ground together, so the mark
  survives greyscale, a projector and a colour-blind reader. Never the ground alone.
- **It marks the query, not the sentence.** Only the matched characters take it.
- **It never appears outside a search result.** A document opened from a category
  has nothing marked; the section arrived at is marked with the panel ground and a
  label, which is a different signal for a different fact.

No new colour was invented. `--mbc-lamplight-tint` already existed and carried no
other job on screen.

## What NOT to carry over

1. **Every sentence of quoted bylaw and policy text in this file is written for the
   mockup.** Policy A009, Bylaws Article II, F003 and M001 are *plausible*, not
   real. Do not seed them, do not quote them in a meeting, and do not treat any
   citation, adoption date or dollar amount as fact. Load the real manual.
2. **The counts are the brief's** (1, 7, 29, 7, 6) and the letter-series counts
   under Policies are made up to fill the level. Derive all of them.
3. **Search is substring matching over an in-memory array.** Production wants
   Postgres full-text search with the citation and heading path indexed alongside
   the body, stemming, and a phrase mode. The *interface* to it — two characters to
   fire, grouped by document, snippet around the first match — is the design.
4. **`Recently opened` is component state.** It is per-person and server-side.
5. **The side flag is a view filter and nothing else.** As on the deacon dashboard:
   RLS decides what comes back. The flag now decides only which nav and which
   context band are drawn, and it must never be the thing deciding what a man may
   read.

## Data this screen assumes

```
doc(id, category, series, number, title, adopted_on, revised_on, body_kind)
doc_section(id, doc_id, position, citation, heading, heading_path, body)
doc_category(slug, name, blurb, deacon_only)
recent_open(person_id, doc_section_id, opened_at)
```

Derived, never stored: the category counts, the letter-series counts, the match
counts, and the contents rail (it is the section list, not a second table).

## Files in this bundle

| File | What it is |
| --- | --- |
| `README.md` | This document. |
| `prototypes/MBC Governance Reference.dc.html` | The three states. Open in a browser. |
| `prototypes/support.js` | Runtime the prototype needs in order to open locally. |
| `prototypes/assets/`, `prototypes/_ds/…` | Logo, fonts, tokens and the design-system bundle the prototype loads. |
| `design-tokens.css` | Every existing token, unchanged from the staff bundle. |
| `design-system-guide.md` | The full design-system guide. Read "Content fundamentals" before writing new copy. |

`design_handoff_staff_dashboard/` and `design_handoff_deacons_dashboard/` are the
companions: the application shell, the global mechanics and the eleven surfaces this
one sits among.

## Copy rules for anything new

Plain, warm, specific, short. Sentence case; headlines are complete sentences ending
in a period. Real times and real rooms. En dashes in ranges, `·` between facts,
curly quotes. No exclamation points, no hype, no emoji.

And the reference surface's own job, inherited from the deacon side: **say what the
system does not do.** *Nothing in the manual says that* is an answer, and the screen
should never dress up a miss as a suggestion.
