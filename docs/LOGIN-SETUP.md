# Turning on staff login

Right now anyone who opens the site can type any staff address and get in. That
is a stand-in, and it has to be replaced before the site holds anything real.
This page is the whole job, in order. It takes about half an hour, and most of
it is waiting for pages to load.

You do steps 1 to 5. Step 6 is mine.

---

## What we are building

Two separate things, and the difference matters:

**A roster entry** means somebody can be named as the owner of a commitment. A
deacon, a Sunday school teacher, a volunteer who runs the men's breakfast — all
of them belong on the roster, and none of them needs a login for the ledger to
say who is responsible. Any staff member can add someone from the People page,
or straight from an owner dropdown.

**An account** means somebody can open the site and read what is on it —
including, at the staff role, named members' health, family and spiritual
circumstances. That is why adding someone and inviting them are two separate
acts, and why only staff-role accounts can hand out access.

There is no sign-up page. Nobody can create an account for themselves. A person
gets in because somebody on staff invited them, and for no other reason.

---

## 1 · Create the Supabase project

Supabase is the database and the login service. The free tier is more than
enough for eight people.

1. Go to **supabase.com** and sign up — use a church address, not a personal
   one, so the account outlives whoever set it up.
2. **New project.** Name it `mbc-staff-dashboard`.
3. Choose a database password and **put it in the church password manager now.**
   You will not be shown it again, and you need it in step 3.
4. Region: **East US (North Virginia)** is the closest.
5. It takes a couple of minutes to build.

## 2 · Turn off sign-ups

This is the step that makes the whole thing invite-only. Do not skip it.

1. In the project, go to **Authentication → Sign In / Providers**.
2. **Email** should be on. Turn **Confirm email** on.
3. Turn **Allow new users to sign up** **off**.
4. Under **Authentication → URL Configuration**, set the **Site URL** to the
   site's real address, and add the Netlify preview address to **Redirect URLs**
   as well.

With sign-ups off, a magic link only works for an address that already has an
account — which is to say, for somebody we invited.

## 3 · Create the tables

The database structure is already written and tested; it just needs running.

On a computer with [the Supabase CLI](https://supabase.com/docs/guides/cli)
installed, from a copy of this repository:

```
supabase login
supabase link --project-ref <the ref from your project's URL>
supabase db push
```

That runs the two files in `supabase/migrations/` and creates everything.

If you would rather not install anything: open **SQL Editor** in the Supabase
dashboard, paste the contents of `supabase/migrations/0001_schema.sql`, run it,
then do the same with `0002_rls.sql`. Run them in that order.

## 4 · Put the staff on the roster

In the Supabase dashboard, open **Table Editor → person** and add one row per
staff member:

| Column | What to put |
| --- | --- |
| `name` | Their full name |
| `role` | Their title — "Senior Pastor", "Office Administrator" |
| `email` | Their church address |
| `access` | `staff` for the eight of you |
| `active` | true |

Leave `auth_id` empty. It fills itself in the first time that person signs in.

**A note on `access`.** `staff` sees everything. `limited` sees everything
except care pipelines and the discussion board — that is the right level for a
volunteer coordinator or an intern. `none` means roster-only: they can own
things, they cannot sign in. Deacons and volunteers added from the People page
land on `none` automatically, which is the safe default.

Then, still in the dashboard, **Authentication → Users → Add user** for each
person with an account, using the same email address. Choose "Send invite".

## 5 · Give me two values

From **Project Settings → API**:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon public** key — a long string starting `eyJ...`

Send me both. They are safe to share with me and safe to put in the site's
build settings: every table is protected by the policies from step 3, not by
keeping that key secret. **Do not send the `service_role` key.** That one
bypasses every policy, and nothing we are building needs it.

You will also add them in Netlify under **Site configuration → Environment
variables** as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — I will tell
you exactly when, so the site does not switch over mid-week.

## 6 · My part

With those two values I will:

- wire the app to Supabase Auth so "Email me a sign-in link" sends a real link
- move the data layer from the browser to Postgres, which is one file
- schedule the nightly job that actually deletes expired discussion threads
- test the whole thing against your project — signing in, the role gate, a
  limited account being refused a care record — and show you the results before
  it goes live

Until that is done the site keeps running exactly as it does now, on its own
sample data. Nothing breaks while you work through the steps above.

---

## After it is on

**Adding a deacon or a volunteer as an owner.** People page → Add someone, or
pick "Add someone…" straight from any owner dropdown. They can own things
immediately and cannot sign in.

**Giving somebody a way in.** Add their email on the People page, then set their
access to `limited` or `staff`. Then add them under Authentication → Users in
Supabase so a link can reach them. Both steps are needed: the roster says who
they are, Supabase is what sends the email.

**Somebody leaves.** Mark them "No longer here" on the People page, and delete
their user under Authentication → Users. What they owned goes back to unclaimed
on the ledger, which is where it belongs until somebody takes it.

**Somebody cannot get in.** Almost always one of: they are not in
Authentication → Users; their address on the roster does not match the one
there; or their access is still `none`.
