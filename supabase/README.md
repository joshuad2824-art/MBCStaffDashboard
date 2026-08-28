# Supabase

Two migrations, ready to run against a fresh project. Nothing in the application
reads them yet — `src/data/repository.ts` is still `LocalRepository` — but the
schema and the policies are what that swap lands on.

```
0001_schema.sql   tables, the thread-activity trigger, the retention functions
0002_rls.sql      row level security: the real role gate
```

## Verified

Both files were applied to a clean PostgreSQL 16 and the policies exercised
against three sessions — a `staff` account, a `limited` account, and no account:

- `limited` reads **no rows** from `care_entry`, `thread`, `post` or `mention`,
  and an insert into `care_entry` is refused by the policy, not by the interface
- `limited` reads and claims cadence commitments and reads the notice log
- a signed-out session reads nothing at all
- one staff member cannot delete another's post; the author can delete their own
- posting on a thread moves `last_activity_at`, which takes an already-expired
  thread back out of range of the purge
- `purge_expired_threads()` removes the thread and cascades to its posts and
  mentions

The harness stubbed the two things Supabase supplies — `auth.users` and
`auth.uid()`. Nothing else was changed.

## Running them

```
supabase link --project-ref <ref>
supabase db push
```

Then seed `notice_category`, `care_type` and `church_settings` from
`src/data/seed.ts`, and insert one `staff` row per person. There is no
self-registration: **a row in `staff` is the invitation**, and `auth_id` is
filled in the first time that person signs in.

## What has to be true before this is wired up

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

## Then, in the application

Add a `SupabaseRepository implements Repository` beside `LocalRepository` and
change the one export at the bottom of `src/data/repository.ts`. At that point
delete `purgeExpired` from the client path — the scheduled job owns it — and
drop the `viewAs` preview's ability to be mistaken for the gate.

Environment: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is
public by design; every table above is protected by RLS, not by that key.
