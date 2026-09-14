# Memorial Baptist Church — Design System

Memorial Baptist Church (MBC) is a Southern Baptist congregation at 2800 S. Yale Ave. in midtown
Tulsa, Oklahoma, gathering since 1948. Sunday Bible study at 9:15, worship at 10:30; Wednesday study
at 6:00 and dinner at 7:00. Its stated vision — "for the glory of God and the good of all people" —
is also the line that closes every page of its website.

There is **one product**: the church's public website, which includes a members-only area
(the Member Hub). Everything else the brand produces is print and social collateral — the Sunday
bulletin, wayfinding signage, name tags, and three fixed social templates.

## Where this came from

| Source | What it gave us |
| --- | --- |
| `github.com/joshuad2824-art/mbcsite` (branch `main`) | The ground truth. `source/Memorial Baptist Church.dc.html` is the full site (ten screens) with every literal colour, size and string; `source/MBC Brand Guide.dc.html` is the written brand guide; `assets/` holds the logo files. |
| `uploads/Memorial Baptist Church - Brand Guide.html` | The published, self-contained build of the same brand guide. Its bundle carried the **actual Lora and Lato woff2 subsets**, which were extracted into `assets/fonts/` — so the webfonts here are the exact binaries the live site serves, not re-downloads. |

Explore those repositories directly if you have access — the site source is the most complete record
of how these pieces are actually assembled, and reading it will make anything you build here better.

Nothing in this system was invented for novelty. Where the brand guide and the site disagreed, the
site's shipped values won.

---

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | The entry point. Nothing but `@import` lines — link this one file. |
| `tokens/` | `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radii.css`, `shadows.css`, `semantic.css`, plus `ministries.css` + `semantic-ministries.css` for the two sub-brands. |
| `assets/` | `mbc-mark.png`, `mbc-primary-lockup.png`, favicons, `og-image.png`, and `fonts/` (Lora + Lato woff2). |
| `components/core/` | Button, Chip, Input, RadioOption, Card, Eyebrow. |
| `components/content/` | SectionHeading, ArchPhoto, VerseBlock, EventCard, SermonRow, GroupCard, StatBlock, ServiceTimes. |
| `components/navigation/` | Logo, PreviewBanner, SiteHeader, SiteFooter, FilterBar. |
| `components/ministries/` | DoorwayPhoto, DoorwayBand, ArchOutline — the three shapes the theme scopes can't express. |
| `guidelines/` | The foundation specimen cards shown on the Design System tab. |
| `ui_kits/website/` | Click-through recreation of the public site. Start at `index.html`. |
| `source/` | The imported site source, kept for reference. |
| `SKILL.md` | Agent-skill wrapper so this folder works inside Claude Code. |
| `github.md` | Upstream association and sync record. |

### Components

Every component is `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md` in its directory, with one
`@dsCard` HTML per directory.

**Core** — `Button`, `Chip`, `Input`, `RadioOption`, `Card`, `Eyebrow`
**Content** — `SectionHeading`, `ArchPhoto`, `VerseBlock`, `EventCard`, `SermonRow`, `GroupCard`, `StatBlock`, `ServiceTimes`
**Navigation** — `Logo`, `PreviewBanner`, `SiteHeader`, `SiteFooter`, `FilterBar`
**Ministries** — `DoorwayPhoto`, `DoorwayBand`, `ArchOutline`

The site source is a single hand-written page with inline styles, not a component library, so this
inventory was derived by finding the patterns it repeats. Every one of the eighteen corresponds to
something that appears at least twice on the live site. Nothing speculative was added — there is no
Toast, no Avatar, no Tabs, because MBC has none.

**Intentional additions:** `FilterBar` (the site repeats a bare chip row three times and a framed one
once; wrapping it keeps the count and label consistent) and `Logo` (the header/footer lockup is
assembled from the same mark + two type lines in four places).

---

## Content fundamentals

**The voice, in one paragraph** (verbatim from the brand guide): plain, warm, specific, and short.
Say the actual time and the actual room. Answer the question a nervous first-time visitor is really
asking. Never use hype, never use exclamation points in headlines, and never promise an experience —
promise a Bible, a seat, and a person who will talk to you.

**Person.** "We" for the church, "you" for the reader. Never "I". The church speaks as a body:
"We'll meet you at the door." "Someone will call you — an actual person, within a week."

**Casing.** Sentence case everywhere. Headlines are complete sentences ending in a period —
"Five habits that shape everything we do." "The bulletin is the brand most people actually hold."
ALL CAPS only for tracked labels, applied with `text-transform`.

**Length.** Headlines run 4–10 words. Body paragraphs are two to four sentences and stop. Card copy
is one sentence. Nothing is padded to fill a box.

**Specificity over enthusiasm.** Real times, real rooms, real names: "Dinner in the fellowship hall,
then study by age group. Bring a friend; no sign-up needed." — not "an amazing night of community."
The FAQ page is literally titled "Honest answers," and answers what people actually worry about:
"What should I wear?" → "Whatever you own. You will see suits and you will see jeans in the same pew,
and nobody is keeping score."

**Admissions are allowed.** "Full — waitlist." "Photo needed." "Sermon titles are placeholders."
The brand would rather say a thing is unfinished than dress it up.

**Punctuation.** Curly quotes and apostrophes. En dashes in ranges (`Mark 10:35–45`, `8 AM – noon`).
The middot `·` separates facts on one line (`Mark 10:45 · Jacob Bice · 38 min`). Em dashes for asides.
One space after a period. **No exclamation points in headlines** — the one exception on the whole
site is "You are welcome here!" on the I'm New page, and it is deliberate.

**Scripture** is quoted with curly quotes, set in Lora italic, with the reference beneath as a tracked
all-caps label. It is never paraphrased and never set in Lato.

**Emoji: never.** Not in copy, not in UI, not in social templates. There are none anywhere in the
source.

---

## Visual foundations

**The idea.** A steeple, a cross, and two lamps on Yale Avenue. Warm paper, brown ink, one lamplit
accent. The system is meant to look like a well-set Sunday bulletin that happens to be on a screen.

**Colour.** Steeple Brown `#3A322B` is the ownable colour and does most of the work. Bulletin Cream
`#F8F3EB` is the default ground — in print it is literally the paper. Lamplight `#A8613F` is the only
colour allowed on a button or a link. Yale Sage `#4F7A5A` labels and categorises and never becomes a
large field. Brass `#DBAE84` appears only as small type and rules on dark grounds. Proportion is
roughly **62 / 24 / 9 / 5** — cream, brown, lamplight, sage; if a layout feels loud, the accents have
crept past 15% together. No pure black, no pure white, ever — the warm versions only
(`#FFFDF9` Parchment, `#FDFBF7` print paper).

**No gradients.** The mark is a line drawing and gradients fight it. There are exactly zero gradients
in the source, apart from the 135° repeating stripe used as a photo placeholder.

**Type.** Lora (transitional serif) for what we say; Lato (humanist sans) for how we say it. Lora
carries headlines, times, big numbers and all Scripture; Lato carries body, labels, forms and fine
print. 16px base, major-third (1.25) steps for interface sizes, wider jumps for display. Display
tracking is negative (−2% to −2.5%); label tracking is positive (+14% to +22%); body is untracked.
Measure 60–68 characters. Body leading 1.6–1.7, display 1.02–1.12. Floor: 16px on screen, 12pt in
print, 14pt for senior-adult material — this congregation has a lot of readers over sixty.

**Backgrounds.** Flat colour fields only. Three grounds alternate down a page: Cream (default),
Panel `#F1E9DB` (the warm inset band), and Steeple Brown (the dark band, used two or three times per
page for times, member content, and stewardship). Full-bleed dark sections run edge to edge; content
inside them stays in the 1320px column. No textures, no patterns, no background images, no parallax.

**Photography.** Real members, real rooms — no stock, ever. Natural light, warm white balance, no
filters and no heavy vignette. People mid-action and mid-conversation, not lined up smiling at the
lens. Photograph the ordinary: coffee in the foyer, a hand on a shoulder, an open Bible, kids in the
hall. The signature device is the **arch crop** — `border-radius: 260px 260px 20px 20px`, taken from
the steeple in the mark — used on portraits and features. Standard crops: 4:5 portraits, 1:1 features,
16:9 events, 3:2 ministries. Until real photography exists, slots stay as the striped placeholder
(`repeating-linear-gradient(135deg,#EFE6D6 0 9px,#E7DCC8 9px 18px)`) with a lowercase mono caption
naming the shot.

**Cards.** Parchment fill, 1px warm rule (`#E7DCC9`), 16–22px radius, generous padding (26–30px in a
grid, up to 48px for a feature), **no shadow**. Grids of cards are frequently drawn as a 1px-gap grid
over a rule-coloured background so the "borders" are shared hairlines rather than per-card outlines.
No coloured left borders. No hover lift.

**Borders and rules.** Hairlines carry almost all the structure: `#E4D8C4` for section rules,
`#E7DCC9` on cards, `#EDE3D3` and `#F0E7D8` inside cards. Lists (sermons, events, FAQs, order of
service) are rows separated by rules, never boxes.

**Shadows.** Effectively none on screen. The only shadows in the entire system stand in for physical
paper: `0 18px 40px -24px rgba(58,50,43,.35)` under a bulletin or sign mockup, and
`0 -10px 34px rgba(43,37,33,.26)` above the fixed admin bar. Depth otherwise comes from the ground
colour changing, not from elevation.

**Transparency and blur.** Exactly two uses: the sticky header (`rgba(248,243,235,.94)` +
`backdrop-filter: blur(12px)`) and the admin modal scrim (`rgba(43,37,33,.58)` + `blur(3px)`).
Nothing else is translucent. No protection gradients — text never sits on a photo, so none are needed.

**Corner radii.** 4px on printed mockups, 6–8px on small chips and signs, 10px on inputs and square
buttons, 14–16px on tight grids, 18–20px on cards, 22px on feature panels, 999px on every pill
control, and the arch on photography.

**Buttons and controls.** All pill-shaped except form buttons inside a card, which take the 10px
input radius so they line up with the fields above them. Minimum 44px tall. One Lamplight button per
view; everything beside it is an outline.

**Hover.** Fills darken by filter (`brightness(.92)`); outlines darken their border to Steeple Brown
and pick up the Panel fill; dark-ground ghosts brighten their border to cream; text links go
`#A8613F → #8A4C2E`; list rows fill Panel cream. **Press states are not styled** — the source defines
none, so don't invent a shrink or a shadow.

**Animation.** There is none. No entrance animations, no scroll effects, no bounces. Transitions are
limited to colour/filter changes on hover, ~150ms, plain ease. If you need motion, the honest answer
for this brand is: don't.

**Layout.** 1320px content column (880–960px for prose pages, 1180px in the brand guide), gutters
`clamp(20px, 4vw, 56px)`, section rhythm `clamp(56px, 6vw, 92px)`. The header is the only fixed
element: 96px, sticky, translucent. Grids are `repeat(auto-fit, minmax(…, 1fr))` with a 20px gap.
Below 1040px the nav collapses to a menu button.

---

## Ministry sub-brands — MBC Kids and MBC Students

Two ministries need to look like themselves without leaving the family: **MBC Kids** (birth – 6th
grade) and **MBC Students** (7th – 12th). They are extensions of the parent system, not siblings to
it. **Nothing in the parent palette, type or spacing changed value** — the whole addition is two
token files, three components, and eleven specimen cards in a **Ministries** group.

**How they work: theme scopes, not forks.** `tokens/semantic-ministries.css` defines `.mbc-kids` and
`.mbc-students`, which remap the *semantic* layer only. Wrap a page body — or one section of it — in
a scope class and `Button`, `Card`, `Eyebrow`, `Input` and `ArchPhoto` follow with no new props and
no new variants. There is deliberately no ministry Button or Card; forking them would be the mistake.

**Which system for which piece.** Memorial is the default and the tiebreaker. Sub-brands begin at the
hallway: the bulletin, main-hall and foyer signage, and all site chrome (header, footer, Give) stay
parent-brand even on a ministry page. Kids owns Hall B check-in, room signs, club fliers and take-home
cards. Students owns upstairs and youth-house signage, retreat posters, shirts and forms. Two systems
never appear on one piece.

**MBC Kids.** Ground is Chalk `#FDF6E7`, one step brighter than Bulletin Cream. Doorway Blue
`#2F6C8C` takes every action and field; Sunbeam `#E8A33D` and Meadow `#6F9E63` are **shape colours
that carry no type** (2.7:1 and 2.9:1); Yale Sage is borrowed back from the parent as the label green
because it is the only one that passes AA on Chalk. Proportion 55 / 18 / 12 / 9 / 6. Display face is
**Nunito** at 800–900, 20px floor, never a paragraph. The shape is the **doorway** —
`999px 999px 24px 24px`, one unbroken sweep with no shoulders, on photography and on the three-doorway
band, never on cards.

**MBC Students.** The parent dark band promoted to a full ground: Night `#221E1B`, with Chalk
`#EDE4D6` type at 13.1:1. Brass is promoted from small accent to primary label; Lamplight is lifted to
Ember `#D2703C` for pill fills and one tracked line — **never a ground behind copy**. Signal Sage
`#8FBE86` categorises on dark only. Proportion 60 / 18 / 12 / 10 — the parent ratio with cream and
brown swapped, which is why a retreat poster and a bulletin still read as related. Display face is
**Anton**: one weight, caps via `text-transform`, tracking −2%, 24px floor. The arch is **drawn**
here — a 2px Brass outline, `260px 260px 4px 4px` — never filled; photography sits beside it in a hard
4px crop, and rules are 2px rather than hairlines.

**What does not change in either.** Lato sets every sentence. Scripture is Lora italic with a tracked
all-caps reference — `--mbc-font-serif` is *not* remapped, so `VerseBlock` is identical in all three
systems. Spacing, layout column, hover behaviour and the no-animation rule are the parent's. There is
still no icon set, and no mascots, characters or illustrated animals — the ministry name is type beside
the one mark, never a second logo.

**Sub-brand caveats.**

- **Nunito and Anton load from Google Fonts as an interim** (`@import` at the top of
  `tokens/ministries.css`), where Lora and Lato are self-hosted woff2. Both new faces are SIL OFL, the
  same licence — free for print, web and merchandise. Drop woff2 subsets into `assets/fonts/` and swap
  the import for `@font-face` blocks when you want them self-hosted.
- **No Pantone is assigned** to any of the new colours, and their CMYK would be converted from RGB.
  Proof before a press run.
- **Confirm 6th grade sits with Kids.** The live site jumps from 5th to 7th.
- Unrelated but adjacent: the parent Lamplight story template measures 3.8:1 — worth fixing upstream.

---

## Iconography

**There is no icon system, and that is the finding, not a gap.** The site source contains no icon
font, no SVG sprite, no icon library, and no per-icon PNGs. Structure is carried by type, rules, and
whitespace instead. If you are building for MBC, resist adding an icon set — it would be the most
visible non-brand element on the page.

What actually appears:

- **The logo mark** (`assets/mbc-mark.png`) — a line-art steeple with a cross and two lamps. It is
  the only illustration in the brand. It appears at 50px in the header, 62px in the footer (knocked
  out to white at 90% opacity), 44px in the sign-in card, 40px in the admin modal, and as small
  ghosted marks on print collateral. Also supplied: `assets/mbc-primary-lockup.png` (full horizontal
  lockup) and `assets/favicon.svg` — a hand-maintained simplified house-and-cross glyph, the only
  vector in the repository, drawn because the full line-art mark turns to mush below ~48px.
- **A handful of unicode characters used as glyphs**, and nothing more: `▶` on the Watch button,
  `←` `→` in the calendar month stepper, `·` as a fact separator, `✓` and `✗` in the contrast table,
  and `·` as a bullet in rule lists. All of them inherit type colour and size.
- **No emoji**, anywhere.
- Custom radio "dots" and the hamburger menu are drawn with bordered `<span>` elements, not icons.

If a future surface genuinely needs an icon set, match the mark: 1.5–2px uniform stroke, round caps,
no fill, Steeple Brown. Lucide at `stroke-width: 1.5` is the closest CDN family — but flag it as a
substitution, because the church has never used one.

---

## Caveats

- **Fonts are the real thing.** Lora and Lato were extracted from the published bundle as woff2
  (latin + latin-ext subsets, Lora as a variable font with its 400–700 / 400–600i ranges intact). No
  Google Fonts substitution was needed. Other subsets (cyrillic, greek, vietnamese) were dropped.
- **No photography exists.** Every image slot on the live site is a placeholder, so every image slot
  here is too. The striped slot is a genuine brand state, not a design-system shortcut.
- **Sermon, event and staff content is placeholder copy** in the upstream repo, and is reproduced here
  as-is for realism. Do not treat any date, title or bio as fact.
- **Print and social templates** (bulletin, order of service, lobby sign, name tag, verse square,
  event card, story) are specified in the brand guide but are not built as components here — they are
  print artefacts, not UI. Their exact specs are in `source/MBC Brand Guide.dc.html`.
