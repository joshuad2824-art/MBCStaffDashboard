# Turning on staff login

The application side of this is now built. "Email me a sign-in link" sends a
real link, an opened link signs the person in for thirty days, and the roster in
Postgres decides what they may see. What it needs from you is a Supabase project
to point at, and two values in Netlify.

There is no password anywhere in this, and there is nothing to set. A link in
your inbox is the whole credential. If you are looking for a password field, it
is not hiding — it does not exist.

---

## Already partway through?

If you created the project and invited yourself before this was wired up, that
invite could not have worked: the site had no Supabase in it at all, so the link
came back to a page that was not listening for it, and the sign-in screen said
what it says to a stranger. Nothing is broken and nothing is wasted. Work down
the list below; the parts you have already done will simply be true already.

The two that most often go missing are **step 4** — a row in `person`, which is
a different thing from a user under Authentication — and the **Site URL** in
step 2, which is where every emailed link lands.

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
   You will not be shown it again, and you need it in step 3. This is the
   *database's* password. It is not anybody's login and nobody will ever type it
   into the site.
4. Region: **East US (North Virginia)** is the closest.
5. It takes a couple of minutes to build.

## 2 · Turn off sign-ups, and say where links land

This is the step that makes the whole thing invite-only, and the step that
decides whether an emailed link arrives anywhere useful. Do not skip either half.

1. In the project, go to **Authentication → Sign In / Providers**.
2. **Email** should be on. Turn **Confirm email** on.
3. Turn **Allow new users to sign up** **off**.
4. Under **Authentication → URL Configuration**:
   - **Site URL** — the site's real address, `https://mbcstaff.netlify.app`.
     This is where every emailed link comes back to. Left at its default, a link
     walks the person to `localhost:3000`, which on a phone is nowhere at all.
   - **Redirect URLs** — add `https://mbcstaff.netlify.app/**`, and
     `http://localhost:5173/**` if anyone works on this locally. A link that
     comes back to an address not on this list is refused, and the site will say
     so.

With sign-ups off, a magic link only works for an address that already has an
account — which is to say, for somebody we invited.

### While you are in there: the mail

Out of the box, Supabase sends this mail from its own shared address, and it
caps that at a **handful of messages an hour across the whole project**. It is
meant for testing. Ask for two or three links in a row and the fourth simply
never arrives — no bounce, no warning, just silence. If a link you expected
never turned up, that is very likely why, and waiting an hour is the cure.

Before the eight of you rely on this, put the church's own sender behind it:
**Project Settings → Authentication → SMTP Settings**. Any of the usual services
will do — Resend, Postmark, Mailgun, or the church's Google Workspace account.
It also means the mail arrives from `memorialbaptist.com` rather than from a
stranger, which is the difference between a link people click and a link people
report.

## 3 · Create the tables

The database structure is already written and tested; it just needs running.

On a computer with [the Supabase CLI](https://supabase.com/docs/guides/cli)
installed, from a copy of this repository:

```
supabase login
supabase link --project-ref <the ref from your project's URL>
supabase db push
```

That runs the three files in `supabase/migrations/` and creates everything.

If you would rather not install anything: open **SQL Editor** in the Supabase
dashboard, paste the contents of `supabase/migrations/0001_schema.sql`, run it,
then `0002_rls.sql`, then `0003_claim_account.sql`. Run them in that order.

**All three, including the third.** The first two build the tables and the role
gate; the third is what lets an invited person's first sign-in find their row on
the roster. Without it everyone authenticates perfectly well and then reads
nothing, which looks exactly like being refused.

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
person with an account, using the same address, and choose "Send invite".

**Both halves are needed, and they are easy to confuse.** The user under
Authentication is what lets the mail reach somebody. The row in `person` is what
says they are on staff and what they may see. A user with no roster row
authenticates and is then told, in as many words, that the address is not on the
roster. Match the two addresses exactly — case does not matter, spelling does.

## 5 · Point the site at the project

From **Project Settings → API**, copy two values:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon public** key — a long string starting `eyJ...`

Put them in Netlify under **Site configuration → Environment variables**:

```
VITE_SUPABASE_URL       https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY   eyJ...
```

Then **Deploys → Trigger deploy → Clear cache and deploy site**. These are read
when the site is built, not when it is opened, so nothing changes until a fresh
build goes out.

Both values are safe to publish: every table is protected by the policies from
step 3, not by keeping that key quiet. **The `service_role` key is not.** That
one bypasses every policy, nothing here needs it, and it belongs nowhere near
Netlify.

Until both variables are set, the site keeps running on its own sample data with
the stubbed sign-in, and says so on the sign-in screen. That is also what a
local `npm run dev` runs on, which is why working on a screen needs no secrets.

---

## When something will not let somebody in

The sign-in screen says which of these it is rather than making you guess.

**"That sign-in link is no longer good."** Links last fifteen minutes and work
once. Opening one twice counts as twice, and so does a mail client that follows
links to check them. Ask for a fresh one.

**No email arrives at all.** Almost always the hourly cap on Supabase's built-in
sender — see step 2. Wait an hour, or put real SMTP behind it. Check the junk
folder while you wait, and check **Authentication → Users** to be sure the
address is there at all: with sign-ups off, an address with no user is sent
nothing, and the screen still says "check your inbox" on purpose, because a
sign-in form that confirms who is on staff is a roster anybody can read.

**"Too many sign-in links have been sent from this site recently."** The same
cap, said plainly. An hour.

**"You are signed in, but that address is not on the staff roster."** The mail
reached them, so the Authentication user exists; what is missing is the row in
`person` — or it is there with `access` still `none`, or marked no longer here,
or spelled differently. Step 4.

**"The database has not been prepared yet."** The migrations have not been run
against this project, or `0003_claim_account.sql` was skipped. Step 3.

**"Redirect URL not allowed", or the link opens a page that is not this site.**
The Site URL or the Redirect URLs in step 2.

**The old stub sign-in, with "Open the link" and a note that mail is not
connected.** The build has no Supabase variables in it. Step 5 — and remember
the redeploy.

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
their user under Authentication → Users. Either one alone shuts the door; doing
both is tidy. What they owned goes back to unclaimed on the ledger, which is
where it belongs until somebody takes it.

**What is still to come.** Sign-in is live, but the records themselves still
live in the browser rather than in Postgres — see `supabase/README.md`. Until
that lands, the role gate you are relying on is the one drawn by the interface;
after it lands, it is the one enforced in the database, which is the only kind
that counts.
