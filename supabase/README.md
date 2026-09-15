# Supabase

Migrations for a fresh project. Configured builds use them through
`SupabaseRepository` (the staff side) and `SupabaseMeetingRepository` (the
deacon side); unconfigured local builds keep the seed-data repositories.

```
0001_schema.sql        tables, the thread-activity trigger, the retention functions
0002_rls.sql           row level security: the real role gate
0003_claim_account.sql how an invited person's first sign-in finds their roster row
0004_bodies.sql        body and membership; my_bodies(), is_member_of(), is_chair_of();
                       is_staff_role() reimplemented on top of them
0005_meeting.sql       board_meeting, agenda_item, meeting_attendance, motion; my_seats();
                       board_attendance_summary(), chairman-only; no deletes
0006_reports.sql       report and report_version: the four-state lifecycle, versions on
                       publish, reports_filed(); no compensation figures in Personnel
0007_reports_revised   no attendance tracker; reports may be uploaded files; the private
                       `reports` storage bucket and its policies; Board members may file
                       a report on a committee's behalf
0008_audience.sql      shared surfaces: audience text[] on event and thread, the new
                       announcement table, in_audience() and in_discussion_audience();
                       the calendar's draft state (published_at); purge_expired_announcements()
0009_year_and_reference obligation (the year's dated rules, seeded), governance_document and
                       governance_finding (the transcribed corpus and the discrepancy docket);
                       readable across the deacon side, writable by nobody through the API
0010_care_pointers     care_assignment, care_request, care_request_link (staff-only),
                       deacon_week, deacon_visit — pointers only, no notes column anywhere,
                       the staff → deacon handoff composed and never forwarded; no deletes
0011_chairman_membership_admin
                       chairman-only roster and seat-management functions
0012_preserve_confidential_membership
                       keeps confidential committee membership inside that committee
```

## Loading the governance corpus

The reference reads `governance_document` and `governance_finding`. They are
filled from the transcription the brief cites — one Markdown file per bylaw
article, policy or procedure, with `DISCREPANCY-DOCKET.md` beside them — by a
loader that writes upserts keyed on slug and on finding number:

```
node supabase/governance/build-seed.mjs "/path/to/MBC_Bylaws:Policies:Procedures" > supabase/governance/seed.sql
```

Run the SQL it prints in the project's SQL editor (or with `psql`). Re-run both
steps whenever the transcription changes; the script's header says how it reads
a file's code, kind and title, and how it splits the docket into findings. The
generated `seed.sql` is not committed — the corpus is church content and lives
in the database, behind the policy, not in the repository or the bundle.

The eight obligations 0009 seeds carry the citations the brief gives. Two are
anchored provisionally until the corpus is read — the Treasurer's annual report
and audit (anchored to the January meeting) and the A009 budget calendar, of
whose five dates only 10 October is seeded. Correcting one is an `update
obligation set anchor = … where slug = …`; everything derived moves with it.

The application reads `my_seats()` at sign-in and the report tables in the
Board's room, so a build carrying 0006's client must run against a project
that has 0006 applied — push the migration first, then deploy.

**The deacon year.** Attendance is counted per deacon year (Art. II.B §3 ¶12)
and the manual does not say which month it begins. `church_settings.
deacon_year_start_month` says; it defaults to 1, the calendar year. Change it
with one `update` when the Board says otherwise.

**Reports.** A committee's chair writes its report (`is_chair_of`); the
Treasurer's itemised report belongs to `committee:finance`, whose chair is the
Treasurer; any Board member writes the minutes; and any Board member may
create a report for a committee on its behalf — an upload, typically — and keep
writing the one he created. Uploaded files live in the private `reports`
bucket under the report's id; the bucket's policies call the same
`can_read_report` / `can_write_report` the table's do, and nothing in the
bucket can be updated or deleted. 0007 creates the bucket; if the project's
Storage was set up by hand, confirm a bucket named `reports` exists and is
not public. A draft is readable in its
committee's room only; once submitted it is readable by the whole Board. A
Personnel report that contains a dollar figure is refused by a trigger, in the
draft and in any version. Publishing inserts a `report_version`; versions have
no update or delete policy, and neither table has a delete policy.

**Seating the Board.** A meeting is visible only to seats on `deacon-board`.
The Board chairman can maintain Board and non-confidential committee seats in
the People page. Save the membership first, then grant `access = 'limited'`
there if the person should sign in. Those remain two deliberate actions, and
neither sends an email. Family Assistance stays outside the general editor;
its confidential roster changes by SQL unless the chairman is himself seated
in that room. SQL setup uses `role_in_body = 'chair'` for the chairman and
`'ex_officio'` for the Senior Pastor.

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
- a deacon reads the Board's threads, events and announcements and the ones
  addressed to both rooms, and zero of the staff's; staff read zero of what the
  Board keeps to itself; a limited account still reads zero threads, the joint
  ones included; a committee chair off the Board reads none of it
- nobody starts a thread, an event or an announcement in a room they are not
  in, or narrows a joint one to a room they are not in; an empty audience and
  a slug that names no body are refused; a staff-only event cannot be stamped
  published, because publishing is widening
- the year's obligations, the reference and the docket are readable across the
  deacon side and by nobody else; a deacon cannot add an obligation, edit the
  bylaws or strike a finding
- none of the deacon side's care tables has a notes column; staff compose a
  request in their own name and cannot act on it; a deacon reads the request
  and zero rows of its link to the care entry, cannot compose one, cannot
  rewrite what or who asked, cannot mark it done without a date, and cannot
  reopen it; the staff member who asked sees it done, dated and by whom; a
  limited account and a committee-only chair read zero requests and zero
  assignments; nothing on the deacon side is deleted

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
- **Bodies, and two roles inside the staff one.** What a person sees is
  assembled from which bodies they sit in (`membership`, seeded by 0004 for
  everyone who can sign in today). Inside the `staff` body, `access` still
  separates the staff role from a limited account: `limited` loses Care
  pipelines and the Discussion board — and loses them as *no rows returned*,
  not as a hidden button. The header's "viewing as limited" toggle is a preview
  of that and never the thing itself.
- **Seating is chairman-managed.** The Board chairman can maintain Board and
  non-confidential committee memberships from the People page. Family
  Assistance remains visible and manageable only inside its confidential
  room. Seat a deacon first, then set his `access` to `limited` if he should
  sign in. Granting access first puts a person with no seat into `staff`, which
  is what inviting a colleague from the People page relies on.
- **Schedule the retention job.** `purge_expired_threads()` nightly, via pg_cron:

  ```sql
  select cron.schedule('purge-threads', '0 3 * * *', $$select purge_expired_threads()$$);
  select cron.schedule('archive-care', '20 3 * * *', $$select archive_closed_care()$$);
  select cron.schedule('purge-announcements', '10 3 * * *', $$select purge_expired_announcements()$$);
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
