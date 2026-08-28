# Handoff: Memorial Baptist Church — Staff Dashboard (internal web app)

## Overview

An internal, invite-only web app for the eight-person staff of Memorial Baptist Church
(2800 S. Yale Ave., Tulsa, OK). It exists to close four gaps the staff live with today:

1. **Recurring commitments happen only when someone remembers.** → *Cadence ledger*
2. **People hear about decisions after the decision affects them.** → *Notice log*
3. **The Sunday bulletin is retyped and reformatted by hand every week.** → *Communicator*
4. **Pastoral follow-up has no response window and no named owner.** → *Care pipelines*

Around those sit a Monday-huddle board, a self-forgetting discussion board, annual goals,
and — newest, and the intended default landing screen — **Today at Memorial**, a leave-it-up
dashboard with a real month calendar, a seven-day forecast, and a derived notification rail.

There is no sign-up: staff request a magic link, sessions last thirty days, and two surfaces
(Care pipelines, Discussion board) are gated by role.

## About the design files

The files in `prototypes/` are **design references written in HTML** — high-fidelity,
fully interactive prototypes of the intended look and behaviour. They are **not production
code to lift**. The task is to **recreate these designs in the target codebase's own
environment** (React/Next, Rails + Hotwire, SwiftUI, whatever the team already runs) using
its established patterns, router, data layer and component conventions. If no codebase
exists yet, pick the framework that fits the team and implement the designs there.

Two specific things not to carry over:

- The prototypes hold **seed data in component state**. Production needs a real database
  (schema sketch below) and real auth.
- The prototypes are written as single-file "design components" with inline styles because
  that is how the design workspace streams a preview. In production, use the codebase's
  normal styling approach, driven by the tokens in `design-tokens.css`.

## Fidelity

**High-fidelity.** Colours, type, spacing, radii, copy and interaction states are final and
should be matched closely. Every value comes from the bound Memorial Baptist Church design
system (`design-tokens.css`, `design-system-guide.md`). Where a measurement is given below
in px, it is the measurement to hit.

Notable brand rules that are easy to violate by accident:

- **No gradients, no shadows on screen, no animation.** Depth comes from the ground colour
  changing (cream → panel → dark), never elevation. Transitions are limited to colour and
  filter on hover, ~150ms.
- **No icon set.** There is no icon font, no SVG sprite, no Lucide. Structure is carried by
  type, hairline rules and whitespace. The only glyphs allowed are `←` `→` `·` `×` `✓` `✗`
  and the one logo mark. Do not add icons.
- **No emoji**, anywhere.
- **One Lamplight (`#A8613F`) button per view.** Everything else is an outline or a text link.
- **No pure black or white.** Warm versions only.
- Minimum control height **44px**; minimum on-screen type **12px** for meta, 14–16px body.

---

## Application shell

```
┌───────────────────────────────────────────────────────────────────┐
│ prototype banner (dark, dismissible — remove in production)       │
├──────────────┬────────────────────────────────────────────────────┤
│ sidebar      │ sticky header: eyebrow + H1, right-side actions     │
│ 244px        ├────────────────────────────────────────────────────┤
│ sticky,      │ surface lead paragraph (66ch max)                  │
│ 100vh        │                                                    │
│              │ surface body, max-width 1380px                     │
└──────────────┴────────────────────────────────────────────────────┘
```

- **Grid:** `grid-template-columns: minmax(0,244px) minmax(0,1fr)`.
- **Sidebar:** `background: var(--surface-card)` (`#FFFDF9`), `border-right: 1px solid var(--border-section)` (`#E4D8C4`), padding `24px 16px`, `position: sticky; top: 0; height: 100vh`.
  - Brand block: the logo mark at 38×38 (`object-fit: contain`), then a two-line type lockup —
    "Memorial" in Lora 600/18px, `letter-spacing: -.015em`; "STAFF DASHBOARD" in Lato 700/8px,
    `letter-spacing: .26em`, `color: var(--text-muted)`.
  - Nav items: 44px min height, radius 10px, padding `12px 14px`, Lato 14px.
    Active = `background: var(--surface-panel)` + `1px solid var(--border-section)` + weight 700.
    Inactive = transparent, weight 400, hover fills `var(--surface-panel)`.
    Badge (unread count) = pill, `background: var(--action-dark)`, `color: var(--text-on-dark)`,
    11px/700, tabular numerals. Locked items show a tracked "LOCKED" label instead.
  - Order: **Today** · divider · Huddle, Cadence ledger, Notice log, Discussion (badge) ·
    divider · Communicator, Care pipelines, Goals · divider · Phone preview.
  - Footer: "SIGNED IN AS" eyebrow, name (14px/700), `role · role staff|limited`, "Sign out" link.
- **Header:** `position: sticky; top: 0; z-index: 5`, `background: rgba(248,243,235,.94)`,
  `backdrop-filter: blur(12px)`, `border-bottom: 1px solid var(--border-section)`,
  padding `20px clamp(20px,3vw,40px)`. Left: Lamplight eyebrow + H1 in Lora 600
  `clamp(24px,2.4vw,32px)`, `letter-spacing: -.02em`. Right: today's date, then small outline
  buttons — Undo (only when there is history), Recent changes, Viewing as staff/limited,
  and one dark button, Present mode.
- **Content:** padding `clamp(24px,3vw,40px) clamp(20px,3vw,40px) 90px`, `max-width: 1380px`.
  Each surface opens with a 16px/1.7 lead paragraph in `var(--text-meta)`, `max-width: 66ch`.

### Global mechanics (implement once, use everywhere)

| Mechanic | Behaviour |
| --- | --- |
| **Toast** | Fixed bottom-centre pill, `var(--surface-dark)`, radius 999px, `box-shadow: var(--mbc-shadow-print)`. Auto-dismisses after 3s; carries an "UNDO" outline button when the action was undoable. |
| **Undo / history** | Every mutating action commits `{label, snapshot, timestamp}` to a session stack (cap 24). Undo restores the newest snapshot, one step at a time. "Recent changes" opens a 420px right drawer listing them; only the newest row is undoable ("undo the ones above first"). |
| **Role gate** | "Viewing as limited" toggle swaps the session role. Limited users get a panel — "The board is staff-role only." — instead of Discussion and Care. In production this is enforced server-side/in the database, not in the client. |
| **Present mode** | Full-screen overlay for the Monday meeting: wins, tensions, due-in-30-days, and the cadence ledger at projection type sizes (19–24px body, 34–54px display). Care pipelines and the discussion board are deliberately hidden. |
| **Sensitivity** | Care entries flagged `sensitive` render **first name + owner only** in any list, roll-up or projected view. Full detail requires opening the record. |

---

## Screens

### 1. Sign-in

- Centred column, `max-width: 430px`, page ground.
- Logo mark 44px, "Staff dashboard" (Lora 600/30px), "Memorial Baptist Church · Tulsa" (15px meta).
- Card: `var(--surface-card)`, radius `var(--mbc-radius-panel)` (20px), padding 34px.
  - Eyebrow "INVITE ONLY" (Lamplight). Body: "There is no sign-up. If you are on staff, enter
    your church email and we will send a link that signs you in for thirty days."
  - Email input, then a full-width primary button "Email me a sign-in link".
    **Form buttons take the 10px input radius, not the pill** — they line up with the fields.
  - Fine print above a hairline: "Care pipelines and the discussion board hold named members'
    circumstances. Access is by role, enforced in the database."
- Sent state: sage "LINK SENT" eyebrow, "Check your inbox.", the address echoed, "It expires in
  fifteen minutes and can be used once.", a dark "Open the link" button (prototype shortcut),
  and a "Use a different email" text link.
- Footer line, centred, 12px muted: "for the glory of God and the good of all people".

### 2. Today at Memorial — the landing screen

Eyebrow "LEAVE THIS ONE UP" · H1 "Today at Memorial". Lead: "The whole week on one screen: the
calendar, the forecast, and whatever is waiting on somebody. Every number here comes from
another surface — clicking it takes you there."

Vertical stack, `display: grid; gap: 20px`:

**a. Right-now band** — `var(--surface-dark)` (`#3A322B`), radius 20px, padding `30px clamp(24px,2.4vw,34px)`,
`grid-template-columns: repeat(auto-fit, minmax(250px,1fr))`, gap `28px 34px`. Three blocks, each
a brass tracked label (10px/700/.2em) + a value + a muted meta line:

| Label | Value | Meta |
| --- | --- | --- |
| RIGHT NOW | live clock, Lora 600 `clamp(34px,3.4vw,46px)`, tabular | full date ("Friday, August 28, 2026") |
| NEXT ON THE CALENDAR | next service/event name, 19–23px sans | weekday, date, time, relative ("in 2 days") |
| SUNDAY'S BULLETIN | "Still a draft" / "Published" | sermon title · scripture · service date |

The clock ticks every 20s off the client's real time (`toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'})`).

**b. Counter strip** — four clickable cells in a 1px-gap grid over `var(--border-hairline)`, wrapped in
`1px solid var(--border-card)` + radius 16px, so the dividers are shared hairlines.
Each cell: `min-height: 118px`, padding `20px 22px`, hover fills `var(--surface-panel)`; content is
a Lamplight tracked label, a Lora 600/34px tabular value, and a 13px meta line. Clicking navigates.

1. UNCLAIMED COMMITMENTS — count of ledger rows with no owner → Cadence ledger
2. OPEN CARE ENTRIES — count not closed; meta "N past its response window" → Care pipelines
3. DECISIONS NOT ANNOUNCED — notices with no `notified_on` → Notice log
4. SUNDAY BULLETIN — "Draft"/"Sent"; meta "Aug 30 · four panels" → Communicator

**c. Seven-day forecast** — card (`var(--surface-card)`, `1px solid var(--border-card)`, radius 16px,
padding `22px 24px 24px`). Header row: "TULSA · SEVEN DAYS" tracked label, right-aligned source note
("Live · Tulsa, OK" / "Seed forecast — live data unavailable" / "Loading the forecast…"), hairline beneath.
Body: `grid-template-columns: repeat(7, minmax(0,1fr))`, 1px gap over hairline; each column centred —
day (11px/700/.14em caps, "TODAY" for the current day), date (11px muted, `M/D`), **high** (Lora 600/30px,
tabular), low (13px meta), condition in words (12px — no icons), and a Lamplight tracked precip label
only when the chance is ≥25%. If any day in the window is ≥40%, a 14px meta line below a hairline
names it and says to check anything outdoors.

*Data:* Open-Meteo daily forecast, no API key —
`https://api.open-meteo.com/v1/forecast?latitude=36.1539&longitude=-95.9928&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America/Chicago&forecast_days=7`.
Fetch on mount; on any failure fall back to a seeded week and label it as seed. WMO weather codes are
mapped to words (0 Clear, 1 Mostly clear, 2 Partly cloudy, 3 Overcast, 45/48 Fog, 51–55 Drizzle,
61–65 Rain, 71–75 Snow, 80–82 Showers, 95–99 Thunderstorms). In production, cache server-side
(~30 min) rather than fetching per client, and keep the seed fallback — this screen is always on.

**d. Calendar + notification rail** — `display: flex; flex-wrap: wrap; gap: 20px`, children
`flex: 3 1 640px` (calendar) and `flex: 1 1 288px` (rail), so the rail drops **below** the calendar
rather than squeezing it. A day cell must never fall under ~90px wide.

*Calendar card:* month title (Lora 600/24px) + count of non-standing items; right side, three
pill controls — `←`, "TODAY", `→` (44×44 / 44px tall, `1px solid var(--border-control)`).
Grid: 7 columns, 1px gap over hairline, with a header row of tracked day abbreviations on
`var(--surface-panel)`. Day cells are buttons, `min-height: 116px`, padding `9px 10px`,
`overflow: hidden`:

- number in Lora 600/17px tabular; today also shows a Lamplight "TODAY" tracked tag
- backgrounds: today `var(--mbc-lamplight-tint)` (`#F6E3D2`), selected `var(--surface-panel)`,
  in-month `var(--surface-card)`, out-of-month `var(--surface-page)` at `opacity: .5`
- selected cell adds `box-shadow: inset 0 0 0 2px var(--mbc-border-control)`
- up to **two** 11px item lines (nowrap + ellipsis), then "+N more"
- item colour encodes the source: standing services `var(--mbc-yale-sage)`, events
  `var(--text-heading)`, cadence due/announce `var(--mbc-lamplight)`, care windows `var(--mbc-bark)`

Day cells aggregate four sources: standing services (Sunday Bible study 9:15 + worship 10:30;
Wednesday study 6:00 + dinner 7:00), calendar events, cadence **due** and **announce-by** dates
(derived, see below), and care **response-window** deadlines (first name only when sensitive).

*Selected-day detail* sits under a hairline inside the same card: title ("Friday, August 28 · today"),
that day's forecast on the right, then rows in a 1px-gap list — `grid-template-columns: 92px 1fr`,
time (or "Due" / "Notice" / "Care") on the left, label + meta on the right. Empty state explains
that anything logged elsewhere shows up here automatically.

*Notification rail:* header "NOTIFICATIONS" + "N waiting". Cards, radius 14px, `1px solid var(--border-hairline)`,
padding `14px 15px`, tone-coded:

| Tone | Ground | Tag colour | Used for |
| --- | --- | --- | --- |
| alert | `var(--mbc-lamplight-tint)` | `var(--mbc-lamplight-deep)` | notice window already passed, decision never announced, care past its window |
| attention | `var(--surface-panel)` | `var(--text-eyebrow)` | unclaimed commitments, announce-by approaching, care due within 2 days, bulletin still a draft |
| info | `var(--surface-card)` | `var(--mbc-yale-sage)` | board activity, latest FYI, wet day in the forecast |

Each card: tracked tag, `×` dismiss (top right), body sentence (14px), then a text-link action
("Open the notice log") and a timestamp. Sorted alert → attention → info, capped (default 8).
Dismissal is undoable and a "Show N dismissed" link restores them. **Notifications are derived,
never authored** — no notifications table; recompute from the same records the other surfaces show.

**e. Five overview cards** — `repeat(auto-fit, minmax(298px,1fr))`, gap 20px, each with a tracked
header + hairline, a rule-separated list, and one outline pill to that surface:

1. **Due in 30 days** (the page's second dark band) — cadence due dates and care windows merged,
   sorted by date, "N unclaimed" at top right, brass labels on dark.
2. **Notice log** — median-gap bar chart by month (bars 34px max width, radius `6px 6px 0 0`,
   `#4F7A5A` when the median is ≤7 days, `#A8613F` when it is over), plus a sentence naming this
   month's median and how many decisions have not been announced.
3. **Care pipelines** — one row per care type with open count and response window.
4. **Discussion board** — thread subjects with "forgets in N days".
5. **Huddle** (panel ground) — the three newest open tensions, plus a count of wins and FYIs.

### 3. Huddle

Four columns, `repeat(auto-fit, minmax(268px,1fr))`, gap 20px: **Wins**, **Tensions**, **FYIs**
(cards) and **Due next** (dark card, read-only roll-up). Each column: tracked title + count over a
hairline, then entries as `var(--surface-panel)` blocks (radius 14px, padding `15px 16px`) with body,
author, relative timestamp, and per-entry actions. A textarea + outline "Post" button sits at the
column foot. Rules: any staff member may post to any column; wins and FYIs archive after 14 days;
tensions stay until cleared; Due next is derived. Eyebrow reads "MONDAY · 9:00 AM".

### 4. Cadence ledger

A summary bar (panel ground, radius 16px) with the unclaimed count in Lora 40px, then filter pills
(Unclaimed · N, then ministries). Table in a card, `min-width: 1180px` inside `overflow-x: auto`,
columns `2.2fr .85fr 1.1fr .8fr .95fr 1fr 1fr 1.2fr`, header on a section rule, rows on hairlines:
name + notes, ministry, owner (inline `<select>` to claim), interval, last held, next due, announce by,
actions ("Held today" pill, a date input to re-select, "Clear record"). Sortable columns show `↑/↓`.

**Derivation, not entry** (this is the point of the surface):
`next_due = last_held + interval_months`; `announce_by = next_due − notice_days`. With no
`last_held`, next due reads "—" and the meta says "derived once it is held".

### 5. Notice log

Two cards up top: a median-gap bar chart by month (bars `10 + (m/max)*82` px tall, sage ≤7 days,
lamplight above), and a dark "THE STANDARD" card listing the per-category maximum tolerable delay —
Family evening 7, Leader training 7, Room or schedule change 2, Internal 10, Calendar 14,
Cancellation 1 (days). Ministry filter pills, an "Record an entry" panel (subject, category,
ministry, decided on, notified on, channel) with a live preview line of the gap it will produce,
then the log table (`2fr .8fr 1fr .95fr .95fr .55fr 1.7fr`): subject, ministry, category, decided,
notified, gap, verdict ("Met with 3 days to spare" / "Missed by 6 days" / "Not yet communicated").

### 6. Discussion board

Left rail of threads (`max-width: 340px`) with subject, meta and "forgets in N days"; right pane of
posts with reply threading (quoted parent line), inline edit for your own posts, tombstones for
removed posts ("message removed"), `@mention` autocomplete, and a **Promote** action that moves a
post to a Huddle tension, opens a pre-filled notice entry, or jumps to the ledger — the escape hatch
before the thread forgets. Expiry runs 14 days from a thread's **last activity**.

### 7. Communicator

Editor + live preview of the printed bulletin: one letter sheet, landscape, double-sided, folded in
half into four panels (cover, welcome, coming up, order of worship). Five forms — week details
(service date, series, sermon title, scripture, art caption), order of worship (reorderable rows
typed song/spoken/sermon), coming-up events (with "Pull from calendar"), giving lines, stewardship
figures — plus standing content (welcome, families, address) behind "Edit standing content".

A **fit guard** estimates each panel's height against 8.5in and disables printing while any panel is
over ("A panel is over its 8.5 inches. Fix it above and the print button comes back"). **Publishing
writes notice-log entries**: `notified_on = today` for every event the issue carries that had no
notification logged, because the bulletin is a real channel. Unpublishing removes exactly the entries
it wrote. `prototypes/MBC Communicator Sheet.dc.html` is the print artefact on its own.

### 8. Care pipelines

Filter pills (All / Open / Touched / Unclaimed / Closed), a summary row of the five care types with
open counts and windows — Guest follow-up 72 hours, New member follow-up 30 days, Baptism follow-up
14 days, Member care need 7 days, Prayer request 48 hours — then per-person rows with type, opened,
owner, last touch, status, and the derived response deadline. Sensitive rows are redacted in list
view; a detail panel shows full notes.

### 9. Goals

Five annual goals, each with ministry, owner, target, a status the user cycles
(Not started → In progress → On track → Behind → Done) and four quarterly note fields. One sentence
per quarter, deliberately not a metric.

### 10. Phone preview

Three 390 × 844 frames showing that nothing is authored twice for mobile: Huddle columns stack, the
ledger becomes a list, tables drop their middle columns. Home-screen icon is 96px at radius 22px
(`assets/icon-192.png`), captioned "Added to the home screen from the browser. No app store."

---

## Data model sketch

```
staff(id, name, role, email, role_level)              -- 8 rows today
cadence_item(id, name, ministry, owner_id?, interval_months, interval_label,
             notice_days, last_held?, notes)          -- next_due / announce_by are DERIVED
huddle_post(id, column['win'|'tension'|'fyi'], author_id, body, created_at, resolved_at?)
notice(id, subject, ministry, category, decided_on, notified_on?, audience, channel,
       event_id?)                                     -- gap = notified_on - decided_on
care_entry(id, person, type, opened_on, owner_id?, status['open'|'touched'|'closed'],
           last_touch_on?, sensitive, notes)          -- due_by = opened_on + type.days
goal(id, title, ministry, owner_id, target, status, q1..q4)
thread(id, subject, created_by, last_activity)        -- expires last_activity + 14d
post(id, thread_id, reply_to?, author_id, body, created_at, edited_at?, removed)
event(id, name, ministry, starts_at, time, location, cadence_item_id?)
week(id, service_date, series, sermon_title, scripture, status['draft'|'published'],
     updated_by, updated_at, order[], bulletin_events[], give[], stewardship[])
settings(welcome, families, address)
```

Reference tables: care types (name, days, window, note) and notice categories (name, standard days).
Roles: `staff` sees everything; `limited` loses Care pipelines and the Discussion board — enforce in
the query layer, not the UI.

---

## Design tokens

Full set in `design-tokens.css` (concatenated from the design system). The values used most here:

**Colour** — Steeple Brown `#3A322B` · Bulletin Cream `#F8F3EB` · Lamplight `#A8613F`
(deep `#8A4C2E`, tint `#F6E3D2`) · Yale Sage `#4F7A5A` · Brass `#DBAE84` · Parchment `#FFFDF9`
· Panel `#F1E9DB` · Field `#FBF7EF` · ink `#3A322B` / body `#6B6058` / meta `#8A7C6C` /
muted `#9A8B7B` · rules `#E4D8C4` (section), `#E7DCC9` (card), `#EDE3D3` (hairline) ·
control border `#CFC1AB` · on-dark `#F4EDE2` / strong `#E4D9C8` / soft `#C8BAA8` / muted `#B8A48C`
· dark rule `#55493F` / dark border `#6B5E52`. Proportion target ≈ 62 cream / 24 brown /
9 lamplight / 5 sage; at most two dark bands per page (this dashboard uses two on Today).

**Type** — Lora (`--mbc-font-serif`) for headings, times, big numbers, scripture; Lato
(`--mbc-font-sans`) for everything else. Display tracking −2% to −2.5%; label tracking +14% to +22%;
body untracked. Sizes in use: 34–46px hero numerals, 30px card numerals, 24px card titles,
15–17px body, 13–14px meta, 10–11px tracked labels.

**Spacing** — 4px-derived scale; 20px grid gap, 22–30px card padding, `clamp(24px,3vw,40px)` page
padding, 44px minimum control height, 1320–1380px content max.

**Radii** — 8px small controls, 10px inputs and form buttons, 14px inner blocks, 16px cards,
20–22px panels, 999px pills. **Shadows** — none on screen except `0 18px 40px -24px rgba(58,50,43,.35)`
under printed mockups and the toast.

**Hover** — fills darken via `filter: brightness(.92)`; outlines darken their border to Steeple Brown
and pick up the Panel fill; dark-ground ghosts brighten their border to cream; links
`#A8613F → #8A4C2E`; list rows fill Panel cream. **Press states are intentionally unstyled.**

## Assets

In `prototypes/assets/`:

- `mbc-mark.png` — the real logo mark (line-art steeple, cross, two lamps). Used at 38px in the
  sidebar, 44px on sign-in, 54px on the bulletin cover. The only illustration in the brand.
- `icon-192.png` — home-screen/PWA icon, regenerated from `mbc-mark.png`: Steeple Brown mark,
  30px padding, on Bulletin Cream. Ship larger sizes (512, maskable) from the same source.
- `favicon.svg` — simplified house-and-cross glyph, kept for sizes under ~48px where the line-art
  mark turns to mush. **Do not use it as the app logo** — earlier drafts did, and it reads as a
  different brand.
- Fonts (self-hosted woff2, latin + latin-ext): `prototypes/_ds/…/assets/fonts/`.

## Files in this bundle

| File | What it is |
| --- | --- |
| `README.md` | This document — self-sufficient implementation spec. |
| `design-tokens.css` | Every token (colour, type, spacing, radii, shadow, semantic aliases). |
| `design-system-guide.md` | The full MBC design-system guide: voice, colour proportion, photography, sub-brands, iconography findings. Read the "Content fundamentals" section before writing any new copy. |
| `prototypes/MBC Staff Dashboard.dc.html` | The whole app — sign-in, all nine surfaces, present mode, undo/history. Open in a browser. |
| `prototypes/MBC Communicator Sheet.dc.html` | The printed bulletin artefact on its own. |
| `prototypes/support.js` | Runtime the two prototype files need in order to open locally. |
| `prototypes/assets/`, `prototypes/_ds/…` | Logo, icon, fonts, tokens and the design-system component bundle the prototypes load. |

## Copy rules for anything new

Plain, warm, specific, short. Sentence case; headlines are complete sentences ending in a period.
"We" for the church, "you" for the reader. Real times and real rooms. En dashes in ranges, `·` to
separate facts, curly quotes. No exclamation points in headlines, no hype, no emoji. Admissions are
allowed and preferred over dressing something up: "Full — waitlist.", "Sermon titles are placeholders."
