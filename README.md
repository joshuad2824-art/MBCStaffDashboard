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

## Running it

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck, then a production build into dist/
```

Sign in with any address in `src/data/seed.ts` — `joshua@memorialbaptist.com`
is the one the seed data is written around. There is no password: the
magic-link flow is stubbed, so "Open the link" stands in for clicking it in
your inbox.

## Where things are

```
src/
  data/
    types.ts        the shapes every surface reads
    seed.ts         seed records, standing services, care types, notice categories
    repository.ts   THE SEAM — load/persist, plus the 14-day purge
    store.tsx       state, mutations, the undo stack, the toast
  session/session.tsx   who is signed in, the role preview, present mode
  lib/
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
| Sign-in | Built. Magic link stubbed until Supabase Auth. |
| Today at Memorial | Built — clock, counters, forecast, month calendar, notification rail, five overview cards. |
| Huddle | Built — four columns, posting, clearing tensions, 14-day archive, derived Due next. |
| Cadence ledger | Built — unclaimed filter, sortable table, claim an owner, record when it was held. |
| Discussion board | Built — threads, replies by reference, edit, delete, mentions, promote, 14-day purge. |
| Notice log | Phase two. Records exist and Today counts them; the surface is not built. |
| Care pipelines | Phase three. Records exist and drive the calendar and rail; the surface is not built. |
| Communicator | Phase four. |
| Goals | Phase five. |

The four unbuilt surfaces render a short page saying where they stand, so
nothing on Today links into a dead end.

## Data, and the Supabase seam

The app runs on seed data held in `localStorage`. Everything above
`src/data/repository.ts` reads and writes `DashboardData` and knows nothing
about where it lives, so swapping in Postgres is one file:

```ts
export class SupabaseRepository implements Repository {
  load(): Promise<DashboardData>
  persist(data: DashboardData): Promise<void>
}
```

Two things move to the server at that point, and they are the two that cannot
be trusted to a client:

- **The role gate becomes Row Level Security.** `staff` sees everything;
  `limited` loses Care pipelines and the Discussion board. The "Viewing as
  limited" toggle in the header is a preview of that, nothing more.
- **The purge becomes a scheduled job.** `DELETE FROM thread WHERE
  last_activity_at < now() - interval '14 days'`, cascading to posts and
  mentions. It runs on load here so the behaviour is real in development, but a
  board that says it forgets has to actually forget.

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
