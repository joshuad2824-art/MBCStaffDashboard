# MBC account activation

Updated October 6, 2026. This is the starting point for this release.

## Approved behavior

Joshua approved an emailed activation code, choosing a personal password,
and an option to stay signed in on the same device. The sender is
`Memorial Baptist Church <mbcstudents@memorialbaptist.com>` through the existing
Brevo account. A shared church-wide code does not confer access.

1. Choose **First time here? Activate your account** and enter the approved address.
2. Enter the newest six-digit code from the email.
3. Choose and confirm a personal password. Optionally select **Stay signed in on this device**.
4. Later visits can use the password. **Forgot your password?** uses another email code.

The existing password and emailed-link routes remain available. Admin invitations
and password-recovery callbacks open the password setup screen.

## Current sources and boundaries

- Production frontend: Netlify `mbcstaff`, GitHub `joshuad2824-art/MBCStaffDashboard`.
- Auth and database: Supabase `mbc-staff-dashboard`, ref `gqymfdmzmezzmppkmkvv`.
- `person.active`, `person.access`, memberships, and existing RLS determine access.
- The server function checks approval before creating a missing passwordless auth
  account. Provisioning issues no session, sets no password, and copies no role
  metadata from a visitor. Mailbox possession must be proved through Supabase OTP.
- Accounts use admin provisioning with `email_confirm: true` because public
  signups remain disabled. This provisioning flag is not evidence that a visitor
  has verified their address; only successfully verifying the mailed code grants
  a session. Existing passwords are not overwritten.
- `claim_account()` links the authenticated identity to its existing roster row.
  This release changes no person, membership, approval, or care-data policy.
- The activation endpoint contains the server credential only in Supabase's
  built-in environment. It never enters the frontend or Netlify configuration.

## Remembered devices

Supabase session tokens, never passwords, use tab storage by default. Opting in
moves them to local storage; opting out moves them back to the current tab.
Existing persistent sessions survive the upgrade. Token refresh remains enabled.
Signing out revokes this device's session and clears both stores. Other signed-in
devices remain signed in. Blocked storage produces an actionable message.
Temporary network errors do not erase a remembered device. Server-side roster
approval is checked again when a session is restored.

## Release sequence and status

Local build, eight automated activation/storage checks, and browser tests of
invalid code, password setup, reload, new-tab restoration, and cross-tab sign-out
have passed using synthetic accounts. Production email delivery is pending.
The Brevo sender is verified. SMTP connection still needs the user's sending key.

1. Run `npm ci`, `npm run build`, and `npm run test:auth`.
2. Open a PR and require CI **build** and **policies** to pass. The latter applies
   every migration to disposable Postgres and verifies access boundaries.
3. Apply `0020_account_activation.sql`, then deploy `request-activation-code`
   with JWT verification enabled. Browser requests use the existing public anon
   token before sign-in; the endpoint itself checks the roster.
4. Configure Supabase custom SMTP: host `smtp-relay.brevo.com`, port `587`,
   sender above, name `Memorial Baptist Church`. The user must generate and enter
   the dedicated Brevo key directly in Password and save the form.
5. Check Brevo's authorized sending IPs for this Supabase project's outbound
   mail. Preserve existing entries and IP enforcement. Check domain authentication
   before relying on production delivery.
6. The **Magic link or OTP** template must contain `{{ .Token }}`; retain
   `{{ .ConfirmationURL }}` for link compatibility. This template was updated in
   preparation. Keep signup disabled and the canonical Site URL
   `https://mbctulsa.team` with its redirect allowlist.
7. After email delivery works, merge and verify the Netlify production build,
   anonymous data denial, and one real activation with the owner's address.
   The user enters their own new password; never use a real member as a test fixture.

## Request limits and support

The endpoint returns the same successful response for approved and unapproved
addresses. Only approved addresses receive mail. It limits each address to one
request per minute and five per hour, each network to thirty per hour, and all
requests to 120 per hour. Supabase/Brevo may apply additional limits.
Counters contain keyed hashes of addresses and networks; only the service role
can read or consume them. Used or expired codes require a fresh code.

If no mail arrives, check the approval row, then Supabase auth logs and Brevo
transactional logs, key expiry, sender verification, domain authentication, and
authorized outbound IPs. Do not weaken IP enforcement to solve delivery.

## Rollback

Republish the preceding Netlify deploy and disable the activation edge function.
Keep migration 0020 and existing accounts: it adds private request counters and
does not alter application records. Do not delete real auth accounts created
during activation. Existing passwords and permissions continue to work.
