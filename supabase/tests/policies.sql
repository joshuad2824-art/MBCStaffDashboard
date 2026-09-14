-- Policy tests.
--
-- CI proves the build compiles. This file proves the policies hold. It runs
-- after the stub and the migrations on an empty database (see run.sh), seeds a
-- roster and a few records as the superuser, then signs in as each kind of
-- account and asserts what comes back — most importantly what does *not*.
--
-- Every assertion is a negative case first: a limited account reads zero care
-- entries, a signed-out session reads nothing, a stranger's token claims no
-- row. A typecheck cannot say any of that. This can.
--
-- Signing in is what PostgREST does with a verified token: set the role and
-- the claims. Nothing else is faked.

\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

-- ------------------------------------------------------------ test helpers

create schema test;

create function test.assert(ok boolean, why text) returns text
language plpgsql as $$
begin
  if ok is distinct from true then
    raise exception 'ASSERTION FAILED: %', why;
  end if;
  return 'ok  ' || why;
end;
$$;

-- Runs a statement expecting Postgres to refuse it with a given SQLSTATE.
-- 42501 is the row-level-security refusal (and permission denied);
-- P0001 is a trigger's raise exception; 23505 is a unique violation.
create function test.refused(stmt text, code text, why text) returns text
language plpgsql as $$
declare
  refused boolean := false;
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = code then
      refused := true;
    else
      raise;
    end if;
  end;
  if not refused then
    raise exception 'ASSERTION FAILED: % — expected SQLSTATE % but the statement went through', why, code;
  end if;
  return 'ok  ' || why || ' (refused, ' || code || ')';
end;
$$;

-- What PostgREST does with a verified token, and nothing more: the claims.
-- Called as the superuser, before `set role authenticated`.
create function test.sign_in(sub uuid, addr text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', sub, 'email', addr, 'role', 'authenticated')::text, false);
  return '-- signed in as ' || addr;
end;
$$;

create function test.sign_out() returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  return '-- signed out';
end;
$$;

grant usage on schema test to anon, authenticated;
grant execute on all functions in schema test to anon, authenticated;

-- ------------------------------------------------------------------- seed
--
-- Fixed ids so the file reads. Applied as the superuser, which bypasses RLS,
-- exactly as `supabase db push` and the dashboard admin do.

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test'),
  ('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test'),
  ('a0000000-0000-0000-0000-000000000003', 'other@memorial.test'),
  ('a0000000-0000-0000-0000-000000000004', 'Invited@Memorial.test'),  -- roster has it lower-case
  ('a0000000-0000-0000-0000-000000000005', 'deacon@memorial.test'),   -- on the roster at 'none'
  ('a0000000-0000-0000-0000-000000000006', 'former@memorial.test'),   -- on the roster, inactive
  ('a0000000-0000-0000-0000-000000000007', 'nobody@memorial.test'),   -- on no row at all
  ('a0000000-0000-0000-0000-000000000008', 'staff@memorial.test');    -- a second token for a claimed address

insert into person (id, auth_id, name, role, email, access, active) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Staff Member',   'Pastor',     'staff@memorial.test',   'staff',   true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Limited Member', 'Office',     'limited@memorial.test', 'limited', true),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Other Staff',    'Minister',   'other@memorial.test',   'staff',   true),
  ('b0000000-0000-0000-0000-000000000004', null,                                   'Invited Staff',  'Minister',   'invited@memorial.test', 'staff',   true),
  ('b0000000-0000-0000-0000-000000000005', null,                                   'A Deacon',       'Deacon',     'deacon@memorial.test',  'none',    true),
  ('b0000000-0000-0000-0000-000000000006', null,                                   'Former Staff',   'Minister',   'former@memorial.test',  'staff',   false);

insert into notice_category (name, standard_days) values ('Schedule change', 14);
insert into care_type (name, window_days, window_label) values ('Hospital', 2, 'two days');
insert into church_settings (id) values (true);

insert into cadence_item (id, name, ministry, interval_count, interval_label, notice_days) values
  ('c0000000-0000-0000-0000-000000000001', 'Quarterly business meeting', 'Administration', 3, 'Quarterly', 21);

insert into notice_entry (id, subject, ministry, category, decided_on) values
  ('d0000000-0000-0000-0000-000000000001', 'Service time moves to 10:30', 'Worship', 'Schedule change', current_date);

insert into care_entry (id, person_name, type, opened_on, owner_id, sensitive, notes) values
  ('e0000000-0000-0000-0000-000000000001', 'A Member', 'Hospital', current_date,
   'b0000000-0000-0000-0000-000000000001', true, 'The circumstance. Never leaves the staff role.');

-- A live thread, deliberately thirteen days quiet so a new post is visible as a
-- bump, and an expired one for the purge.
insert into thread (id, subject, created_by, last_activity_at) values
  ('f0000000-0000-0000-0000-000000000001', 'Live thread',    'b0000000-0000-0000-0000-000000000001', now() - interval '13 days'),
  ('f0000000-0000-0000-0000-000000000002', 'Expired thread', 'b0000000-0000-0000-0000-000000000001', now() - interval '20 days');

insert into post (id, thread_id, body, author_id) values
  ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Written by Staff Member', 'b0000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'Written by Other Staff',  'b0000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'On the expired thread',   'b0000000-0000-0000-0000-000000000001');

-- Seeding a post fires the activity trigger; put the clocks back where the
-- scenarios below expect them.
update thread set last_activity_at = now() - interval '13 days' where id = 'f0000000-0000-0000-0000-000000000001';
update thread set last_activity_at = now() - interval '20 days' where id = 'f0000000-0000-0000-0000-000000000002';

insert into mention (id, post_id, person_id) values
  ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
  ('f2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003');

-- ------------------------------------------------- 1. signed out: nothing
--
-- A visitor with no token is the anon role and no claims.

set role anon;

select test.assert((select count(*) from person)       = 0, 'signed out: the roster is not readable');
select test.assert((select count(*) from cadence_item) = 0, 'signed out: the cadence ledger is not readable');
select test.assert((select count(*) from notice_entry) = 0, 'signed out: the notice log is not readable');
select test.assert((select count(*) from care_entry)   = 0, 'signed out: care entries are not readable');
select test.assert((select count(*) from thread)       = 0, 'signed out: threads are not readable');
select test.assert((select count(*) from church_settings) = 0, 'signed out: settings are not readable');

select test.refused(
  $q$ insert into cadence_item (name, ministry, interval_count, interval_label, notice_days)
      values ('Drive-by', 'Nothing', 1, 'Monthly', 0) $q$,
  '42501', 'signed out: cannot write to the ledger');

select test.refused(
  $q$ select * from claim_account() $q$,
  '42501', 'signed out: anon may not call claim_account() at all');

reset role;

-- --------------------------------------------- 2. limited: the gate itself
--
-- This is the case CLAUDE.md names as unproven. A limited account reads and
-- writes the logistics surfaces and gets *no rows* from care or discussion.

select test.sign_in('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test');
set role authenticated;

select test.assert(is_signed_in(),      'limited: is signed in');
select test.assert(not is_staff_role(), 'limited: is not the staff role');
select test.assert(current_person_id() = 'b0000000-0000-0000-0000-000000000002', 'limited: resolves to their own roster row');

select test.assert((select count(*) from care_entry) = 0, 'limited: reads ZERO rows from care_entry');
select test.assert((select count(*) from care_type)  = 0, 'limited: reads zero rows from care_type');
select test.assert((select count(*) from thread)     = 0, 'limited: reads zero rows from thread');
select test.assert((select count(*) from post)       = 0, 'limited: reads zero rows from post');
select test.assert((select count(*) from mention)    = 0, 'limited: reads zero rows from mention');

select test.refused(
  $q$ insert into care_entry (person_name, type, opened_on) values ('Someone', 'Hospital', current_date) $q$,
  '42501', 'limited: an insert into care_entry is refused by the policy, not the interface');

select test.refused(
  $q$ insert into thread (subject, created_by) values ('Mine', 'b0000000-0000-0000-0000-000000000002') $q$,
  '42501', 'limited: cannot start a thread');

-- Silently filtered is as good as refused: an update of a row you cannot see
-- touches nothing.
update care_entry set notes = 'overwritten' where id = 'e0000000-0000-0000-0000-000000000001';
reset role;
select test.assert(
  (select notes from care_entry where id = 'e0000000-0000-0000-0000-000000000001') like 'The circumstance%',
  'limited: an update aimed at a care entry changed nothing');
set role authenticated;

-- What limited *can* do.
select test.assert((select count(*) from person)       = 6, 'limited: reads the whole roster (owner pickers are built from it)');
select test.assert((select count(*) from cadence_item) = 1, 'limited: reads the cadence ledger');
select test.assert((select count(*) from notice_entry) = 1, 'limited: reads the notice log');
select test.assert((select count(*) from church_settings) = 1, 'limited: reads settings');

update cadence_item set owner_id = current_person_id() where id = 'c0000000-0000-0000-0000-000000000001';
select test.assert(
  (select owner_id from cadence_item where id = 'c0000000-0000-0000-0000-000000000001') = current_person_id(),
  'limited: claims a cadence commitment');

insert into cadence_occurrence (cadence_item_id, held_on) values ('c0000000-0000-0000-0000-000000000001', current_date);
select test.assert((select count(*) from cadence_occurrence) = 1, 'limited: records that a commitment was held');

-- Nobody widens their own reach.
select test.refused(
  $q$ update person set access = 'staff' where id = 'b0000000-0000-0000-0000-000000000002' $q$,
  'P0001', 'limited: cannot promote themselves');

-- And cannot widen anyone else's either — the row is readable, the update is
-- filtered to nothing.
update person set access = 'staff' where id = 'b0000000-0000-0000-0000-000000000005';
reset role;
select test.assert(
  (select access from person where id = 'b0000000-0000-0000-0000-000000000005') = 'none',
  'limited: cannot hand out access to anyone');

-- ------------------------------------------------------- 3. staff role

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;

select test.assert(is_staff_role(), 'staff: is the staff role');
select test.assert((select count(*) from care_entry) = 1, 'staff: reads care entries, the sensitive one included');
select test.assert((select count(*) from thread) = 2,     'staff: reads threads');
select test.assert((select count(*) from post) = 3,       'staff: reads posts');

-- Ownership of a post is enforced on author_id, not by hiding a button.
delete from post where id = 'f1000000-0000-0000-0000-000000000002';
select test.assert(
  (select count(*) from post where id = 'f1000000-0000-0000-0000-000000000002') = 1,
  'staff: cannot delete another member''s post');

delete from post where id = 'f1000000-0000-0000-0000-000000000001';
select test.assert(
  (select count(*) from post where id = 'f1000000-0000-0000-0000-000000000001') = 0,
  'staff: can delete their own post');

select test.refused(
  $q$ insert into post (thread_id, body, author_id)
      values ('f0000000-0000-0000-0000-000000000001', 'As somebody else', 'b0000000-0000-0000-0000-000000000003') $q$,
  '42501', 'staff: cannot post under another member''s name');

-- Posting keeps a thread alive: the trigger moves last_activity_at.
insert into post (thread_id, body, author_id)
  values ('f0000000-0000-0000-0000-000000000001', 'Still talking', current_person_id());
select test.assert(
  (select last_activity_at from thread where id = 'f0000000-0000-0000-0000-000000000001') > now() - interval '1 minute',
  'staff: a new post moves the thread''s last_activity_at');

-- Access is staff-role business, but never your own.
select test.refused(
  $q$ update person set access = 'limited' where id = 'b0000000-0000-0000-0000-000000000001' $q$,
  'P0001', 'staff: cannot change their own access, even downward');

update person set access = 'staff' where id = 'b0000000-0000-0000-0000-000000000002';
select test.assert(
  (select access from person where id = 'b0000000-0000-0000-0000-000000000002') = 'staff',
  'staff: can widen a colleague''s access');
update person set access = 'limited' where id = 'b0000000-0000-0000-0000-000000000002';

-- A new roster row never arrives with a key attached.
select test.refused(
  $q$ insert into person (name, email, access) values ('New Hire', 'new@memorial.test', 'staff') $q$,
  '42501', 'staff: cannot add a person with access already granted');
insert into person (name, role) values ('A Volunteer', 'Volunteer');
select test.assert((select count(*) from person where name = 'A Volunteer') = 1,
  'staff: can add a roster-only person at access none');

reset role;

-- ------------------------------------------------------------ 4. purge
--
-- The scheduled job: a real delete that cascades. Run as the job would.

select test.assert(purge_expired_threads() = 1, 'purge: removes exactly the expired thread');
select test.assert((select count(*) from thread where id = 'f0000000-0000-0000-0000-000000000002') = 0, 'purge: the expired thread is gone');
select test.assert((select count(*) from post   where thread_id = 'f0000000-0000-0000-0000-000000000002') = 0, 'purge: its posts went with it');
select test.assert((select count(*) from mention where id = 'f2000000-0000-0000-0000-000000000002') = 0, 'purge: and its mentions');
select test.assert((select count(*) from thread where id = 'f0000000-0000-0000-0000-000000000001') = 1, 'purge: the live thread stays');

-- ------------------------------------------------- 5. claiming an account
--
-- The first sign-in links a roster row to the verified address on the token.
-- Every other kind of token gets nothing and stays unable to read a row.

-- An invited person, whose token spells the address differently from the roster.
select test.sign_in('a0000000-0000-0000-0000-000000000004', 'Invited@Memorial.test');
set role authenticated;

select test.assert((select count(*) from person) = 0, 'invited: before claiming, reads nothing');
select test.assert((select count(*) from claim_account()) = 1, 'invited: the first claim links the row and returns it');
select test.assert((select count(*) from person) > 0, 'invited: after claiming, reads the roster');
select test.assert((select count(*) from claim_account()) = 1, 'invited: a second claim is a no-op that still returns the row');
reset role;
select test.assert(
  (select auth_id from person where id = 'b0000000-0000-0000-0000-000000000004') = 'a0000000-0000-0000-0000-000000000004',
  'invited: the roster row now carries their auth id, matched case-insensitively');

-- On the roster at 'none' — a deacon named as an owner. Not a way in.
select test.sign_in('a0000000-0000-0000-0000-000000000005', 'deacon@memorial.test');
set role authenticated;
select test.assert((select count(*) from claim_account()) = 0, 'access none: claims nothing');
select test.assert((select count(*) from person) = 0,          'access none: reads nothing');
select test.assert((select count(*) from care_entry) = 0,      'access none: reads no care entries');
reset role;
select test.assert((select auth_id from person where id = 'b0000000-0000-0000-0000-000000000005') is null,
  'access none: the row stays unlinked');

-- Marked inactive.
select test.sign_in('a0000000-0000-0000-0000-000000000006', 'former@memorial.test');
set role authenticated;
select test.assert((select count(*) from claim_account()) = 0, 'inactive: claims nothing');
select test.assert((select count(*) from person) = 0,          'inactive: reads nothing');
reset role;

-- Authenticated perfectly well, on no row at all.
select test.sign_in('a0000000-0000-0000-0000-000000000007', 'nobody@memorial.test');
set role authenticated;
select test.assert((select count(*) from claim_account()) = 0, 'stranger: claims nothing');
select test.assert((select count(*) from person) = 0,          'stranger: reads nothing');
select test.assert((select count(*) from cadence_item) = 0,    'stranger: reads no ledger either');
reset role;

-- A second token carrying an address somebody already holds.
select test.sign_in('a0000000-0000-0000-0000-000000000008', 'staff@memorial.test');
set role authenticated;
select test.assert((select count(*) from claim_account()) = 0, 'takeover: a claimed row cannot be taken');
select test.assert((select count(*) from person) = 0,          'takeover: and the second token reads nothing');
reset role;
select test.assert(
  (select auth_id from person where id = 'b0000000-0000-0000-0000-000000000001') = 'a0000000-0000-0000-0000-000000000001',
  'takeover: the original holder still holds the row');

-- One account, one row — even an administrator cannot attach an auth id twice.
select test.refused(
  $q$ update person set auth_id = 'a0000000-0000-0000-0000-000000000001' where id = 'b0000000-0000-0000-0000-000000000002' $q$,
  '23505', 'one row per account: the unique constraint refuses a second link');

select test.sign_out();
