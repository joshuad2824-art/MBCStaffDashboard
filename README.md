# MBC Staff Dashboard

A private, staff-only web application for Memorial Baptist Church, Tulsa. It is a
companion to the member-facing site, not part of it: different accounts,
different database, and two surfaces that are never projected on a wall.

It exists to close four gaps:

1. Recurring commitments happen only when someone remembers → **Cadence ledger**
2. People hear about decisions after those decisions affect them → **Notice log**
3. The Sunday bulletin is retyped by hand every week → **Communicator**
4. Pastoral follow-up has no response window and no named owner → **Care pipelines**

Around those sit **Today at Memorial** (the landing screen), the Monday **Huddle**
board, a self-forgetting **Discussion board**, and annual **Goals**.

## Planning documents

Three files at the repo root say what this application is becoming, and
`CLAUDE.md` asks that they be read before anything structural changes:

- **`CLAUDE.md`** — the invariants that are easy to break by accident, the
  conventions, and where the seams are.
- **`mbc-staff-dashboard-brief.md`** — the brief this application was built from.
- **`mbc-deacons-dashboard-brief.md`** — the deacons' side: same application,
  same database, same sign-in, with what a person sees assembled from which
  bodies they belong to. Its §7 is the build order and its §10 is the handoff
  between design and code.

The design system the deacon side inherits is in `design_handoff_staff_dashboard/`
— the guide, the tokens, and the prototypes the staff surfaces were built from.
`design_handoff_deacons_dashboard/` holds the three deacon screens that were
designed before they were coded — the meeting, the context toggle and landing,
and the Finance committee report — plus the body badge, the one addition to the
design system.

## Running it

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck, then a production build into dist/
```

Sign in with any address in `src/data/seed.ts` — `joshua@memorialbaptist.com`
is the one the seed data is written around. There is no password anywhere in
this application; locally there is not even any mail. With no Supabase
variables set, the magic-link flow is stubbed and "Open the link" stands in for
clicking it in your inbox, which is why working on a screen needs no secrets.

To run against a real project, copy `.env.example` to `.env.local` and fill in
the two values. Sign-in then goes through Supabase Auth for real. See
`docs/LOGIN-SETUP.md` for standing the project up, and `supabase/README.md` for
what the migrations do.

The sample records were written around a Friday in August 2026. On a **first**
load they are slid forward to the current week as one piece — every date moves
by the same whole number of weeks, so every relationship between them survives
and weekdays stay weekdays (`src/data/freshen.ts`). Without it a board opened
months later shows nothing: wins past their archive, threads past their purge,
care windows closed. Once anything is stored, the dates belong to whoever put
them there and are left alone.

## Where things are

```
src/
  data/
    types.ts        the shapes every surface reads
    seed.ts         seed records, standing services, care types, notice categories
    repository.ts   THE SEAM — load/persist, plus the 14-day purge
    store.tsx       state, mutations, the undo stack, the toast
  session/
    session.tsx     who is signed in, the role preview, present mode
    account.ts      the roster row Postgres says the signed-in address belongs to
  lib/
    supabase.ts     THE AUTH SEAM — the client, or nothing and the stub instead
    date.ts         local-midnight date handling; never `new Date('2026-08-28')`
    derive.ts       next due, announce by, notice gap, days open, mentions
    rollups.ts      the roll-ups Today, Huddle and present mode share
    calendar.ts     what lands on a day cell, from four sources
    notifications.ts  the rail, derived — there is no notifications table
    weather.ts      Open-Meteo, with a labelled seed fallback
    unread.ts       per-person read marks behind the nav badge
  components/
    ui/             Button, Card, Chip, Eyebrow, Input, Rule
    shell/          sidebar, header, toast, history drawer, present mode
  screens/          one file per surface
  styles/tokens.css the design system's tokens, verbatim
```

## What is built

| Surface | State |
| --- | --- |
| Sign-in | Built, on Supabase Auth. Falls back to the stub when the build carries no Supabase variables. |
| Today at Memorial | Built — clock, counters, forecast, month calendar, notification rail, five overview cards. |
| Huddle | Built — four columns, posting, clearing tensions, 14-day archive, derived Due next. |
| Cadence ledger | Built — unclaimed filter, sortable table, claim an owner, record when it was held. |
| Discussion board | Built — threads, replies by reference, edit, delete, mentions, promote, 14-day purge. |
| Notice log | Built — median gap by month, the per-category standard, recording an entry with a live gap preview, and a verdict per row. |
| Care pipelines | Phase three. Records exist and drive the calendar and rail; the surface is not built. |
| Communicator | Built — weekly fields, drag-and-drop cover art, a live panel preview, a fit guard that measures the rendered panels, printing, and publishing that writes to the notice log. |
| Goals | Built — five annual goals, a status you cycle, one sentence per quarter. |

Care pipelines is the one surface left. It renders a short page saying where it
stands, so nothing on Today links into a dead end.

## The communicator

The printed piece is one letter sheet, landscape, double-sided, folded in half
into four 5.5 × 8.5in panels — order of worship and cover on the outside,
welcome and coming up on the inside. Nobody touches type, spacing or the fold.

Four things are worth knowing about how it works:

- **Cover art is prepared automatically.** Drop a JPEG, PNG or WebP onto the
  cover-image area, or use its file-picker button on Windows or Mac. Large
  phone photos are resized before the issue is saved so they remain practical
  to preview and print.
- **The fit guard measures, it does not estimate.** A hidden copy of each panel
  is laid out with no height ceiling and its real height compared to 8.5in, so
  the guard checks the same markup the printer receives. While any panel is over,
  the print button is gone and the panel says by how much. That guard is what
  makes the tool safe to hand to a staff member who has never opened Canva.
- **Coming Up reads the shared event table.** "Pull from the calendar" takes an
  event off the same records the calendar and the ledger read, so it is entered
  once. A line typed by hand is marked as such — it notifies nobody.
- **Publishing counts as notice.** The bulletin is a real channel, so marking a
  week published gives every event it carries a notification date in the notice
  log, unless an earlier one already exists. Going back to a draft undoes
  exactly that: entries it created are removed, entries it only stamped go back
  to not-yet-communicated, and nothing anyone else logged is touched.

Printing hides the interface and portals two landscape sheets to the page.
Verified as a real PDF: two pages at 792 × 612pt.

## Continuous integration

`.github/workflows/ci.yml` runs two jobs on every pull request and every push
to `main`:

- **build** — `npm ci && npm run build`. `npm run build` is `tsc -b && vite build`,
  so that one command is the typecheck as well.
- **policies** — applies the migrations to a throwaway PostgreSQL 16 and runs
  `supabase/tests/policies.sql`, which signs in as each kind of account and
  asserts what it cannot read: a `limited` account gets zero rows from
  `care_entry`, a signed-out session gets nothing, a stranger's token claims no
  row. A typecheck cannot say any of that. `npm run test:policies` runs the same
  thing locally against any Postgres the `PG*` variables point at. See
  `supabase/README.md`.

## People, ownership, and access

Two separate ideas, deliberately not the same list:

- **The roster** (`person`) is everyone who can be *named* — staff, deacons,
  volunteers. Anyone on it can own a commitment, a goal or a care entry.
- **An account** is `access` of `staff` or `limited`. `none` means roster-only:
  they can own things and cannot sign in.

Naming a deacon as the owner of the men's fellowship says who is responsible; it
does not hand them a key to members' circumstances. So adding somebody and
inviting them are two acts, and the second is staff-role only. Owner pickers
offer "Add someone…" inline, which creates a roster entry at `none` and assigns
it in the same motion — leaving the page to create a record first is how a
commitment ends up unclaimed.

In Postgres this is enforced, not merely arranged: a new `person` row cannot
arrive with an account attached, inviting requires an email address, and a
trigger refuses to let anyone change their own access — including a staff
member. See `docs/LOGIN-SETUP.md` for turning login on.

Which surfaces a signed-in person gets is assembled from which **bodies** they
belong to (`body` and `membership`, `supabase/migrations/0004_bodies.sql`).
Everyone who signs in on the staff side sits in the `staff` body; inside it,
`access` still separates the staff role from a limited account. A surface a
person cannot open is not in the sidebar and its route refuses — not disabled,
not dimmed, not there. Neither of those is the gate; Row Level Security is.

## Data and the Supabase repository

Everything above `src/data/repository.ts` reads and writes `DashboardData` and
knows nothing about where it lives. A configured build uses
`SupabaseRepository`; a checkout without the two Supabase variables keeps using
`LocalRepository` with movable sample data, so visual work needs no secrets.

```ts
export interface Repository {
  load(): Promise<DashboardData>
  persist(data: DashboardData): Promise<void>
}
```

Two things live on the server because they cannot be trusted to a client:

- **The role gate is Row Level Security.** `staff` sees everything;
  `limited` loses Care pipelines and the Discussion board. The "Viewing as
  limited" toggle in the header is a preview of that, nothing more.
- **The purge is a scheduled job.** `DELETE FROM thread WHERE
  last_activity_at < now() - interval '14 days'`, cascading to posts and
  mentions. Unconfigured local development performs the same purge on load.

The schema, policies and account-claim function are in `supabase/`; see
`supabase/README.md` for project setup and the retention schedule.

Nothing derived is ever stored: `next_due`, `announce_by`, `notice_gap_days` and
`days_open` are computed on read, every time. That is what keeps the ledger
honest when someone edits a date.

## Design rules that are easy to break

Every value comes from `src/styles/tokens.css`, which is the bound Memorial
Baptist Church design system, unmodified.

- **No gradients, no shadows on screen, no animation.** Depth comes from the
  ground colour changing — cream, panel, dark — never elevation. The only
  shadow is under the toast.
- **No icon set.** No icon font, no SVG sprite, no Lucide. Structure is carried
  by type, hairline rules and whitespace. The permitted glyphs are `←` `→` `·`
  `×` `✓` `✗` and the logo mark.
- **No emoji.**
- **One Lamplight button per view.** Everything else is an outline or a text link.
- **No pure black or white**, and **no status reds** — neutral type carries every
  state, including "Never held". The absence of alarm colour is deliberate: the
  board's authority comes from being plainly factual.
- **At most two dark bands per page.** Today uses both.
- **Width is per-surface.** Tables and the calendar run the full width of the
  monitor — they are better at every extra pixel. Surfaces built from columns of
  prose stop at `--mbc-measure-max` (2200px), which puts four Huddle columns at
  roughly seventy characters each, and are centred there so the leftover space
  sits evenly rather than piling up on one side. `Surface.wide` in
  `src/screens/surfaces.ts` is where a surface says which it is. The header
  shares the same block, so the title always sits directly above the first
  thing under it.
- Minimum control height 44px; minimum on-screen type 12px for meta.
- Tabular numerals on every date, count and gap.

## Sensitive data

Care pipelines and the discussion board accumulate named members' health,
family and spiritual circumstances.

- Both are staff-role only, and in production that is enforced in Postgres, not
  by hiding buttons.
- An entry marked `sensitive` shows a first name and its owner in any list,
  roll-up or projected view. Full detail requires opening the record.
- Neither surface appears in present mode. The Huddle and the Cadence ledger are
  safe to project; these two are not.
- No care content is ever pulled into the printed communicator.
