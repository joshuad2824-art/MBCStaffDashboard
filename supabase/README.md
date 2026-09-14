# Supabase

Three migrations for a fresh project. Configured builds use them through
`SupabaseRepository`; unconfigured local builds keep the seed-data repository.

```
0001_schema.sql        tables, the thread-activity trigger, the retention functions
0002_rls.sql           row level security: the real role gate
0003_claim_account.sql how an invited person's first sign-in finds their roster row
```

## Tested

`tests/policies.sql` applies all three to a clean PostgreSQL 16 and exercises
the policies as each kind of session — a `staff` account, a `limited` account,
an invited person on their first sign-in, a roster-only person, somebody marked
inactive, a stranger with a valid token, and no account at all. CI runs it on
every pull request (`.github/workflows/ci.yml`, the `policies` job), and
`npm run test:policies` runs it locally against whatever Postgres the standard
`PG*` variables point at. Each assertion prints its name as it passes; the first
one that does not stops the run. It asserts that:

- `limited` reads **no rows** from `care_entry`, `thread`, `post` or `mention`,
  and an insert into `care_entry` is refused by the policy, not by the interface
- `limited` reads and claims cadence commitments and reads the notice log
- a signed-out session reads nothing at all
- one staff member cannot delete another's post; the author can delete their own
- posting on a thread moves `last_activity_at`, which takes an already-expired
  thread back out of range of the purge
- `purge_expired_threads()` removes the thread and cascades to its posts and
  mentions
- an invited person's first `claim_account()` links their roster row and their
  every call after that is a no-op; a roster-only person at `access = 'none'`,
  somebody marked inactive, and an address that is on no row at all each get
  nothing back and stay unable to read a single row
- the address is matched case-insensitively, a row somebody already holds cannot
  be taken over, and `anon` may not call the function at all
- nobody widens their own access, and nobody attaches their `auth_id` to a
  second row — the unique constraint refuses it

`tests/00_supabase_stub.sql` rebuilds the slice of a Supabase project the
migrations lean on — the `anon`, `authenticated` and `service_role` roles,
`auth.users`, `auth.uid()` and `auth.jwt()` reading the same claims setting
PostgREST fills from a verified token, and the default grants Supabase puts on
`public`. Nothing else is faked: signing in is setting the role and the claims,
which is all PostgREST does either.

Loosening a policy fails the run. That is the point of it, and it is why Phase 1
— which reimplements `is_staff_role()` on top of membership — extends this file
with the deacon cases before it merges rather than after.

## Running them

```
supabase link --project-ref <ref>
supabase db push
```

`0001` uses the `citext` type for addresses and relies on the extension being
enabled already; on a fresh project enable it under Database → Extensions (or
`create extension citext;`) before the first push. The test stub does the same.

Then seed `notice_category`, `care_type` and `church_settings` from
`src/data/seed.ts`, and insert one row per person in `person`. There is no
self-registration: **a row in `person` is half the invitation** — the other half
is a user under Authentication → Users — and `auth_id` is filled in by
`claim_account()` the first time that person signs in.

## What has to be true for sign-in to work

- **Email magic link, invite-only.** Turn off sign-ups in the Auth settings, or
  the roster stops meaning anything.
- **Two roles.** `staff` reads and writes everything. `limited` loses Care
  pipelines and the Discussion board — and loses them as *no rows returned*, not
  as a hidden button. The header's "viewing as limited" toggle is a preview of
  that and never the thing itself.
- **Schedule the retention job.** `purge_expired_threads()` nightly, via pg_cron:

  ```sql
  select cron.schedule('purge-threads', '0 3 * * *', $$select purge_expired_threads()$$);
  select cron.schedule('archive-care', '20 3 * * *', $$select archive_closed_care()$$);
  ```

  Until that is scheduled, the board's fourteen-day promise is only being kept
  by the client, which is not a promise.
- **Care data stays here.** It never syncs to, appears in, or shares a database
  with the member-facing site.

- **Site URL and Redirect URLs.** Under Authentication → URL Configuration, the
  Site URL is where every emailed link lands. Left at its default a link walks
  the person to `localhost:3000`, which on a phone is nowhere at all.

## Where the application stands

Sign-in and shared records are wired. `src/lib/supabase.ts` builds the client,
`claim_account()` links an invited user to the roster, and
`src/data/repository.ts` translates `DashboardData` to the normalized tables.
The client-side purge remains only in the unconfigured local repository; the
configured project relies on the scheduled job.

Environment: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. With neither set
the app falls back to seed data and the stubbed sign-in, which is what a local
checkout runs on. The anon key is public by design; every table above is
protected by RLS, not by that key.
