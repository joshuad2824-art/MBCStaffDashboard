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

-- ------------------------------------------------- 6. bodies and membership
--
-- 0004 puts the gate on a new foundation. Everything above ran on it already;
-- this section proves the parts that are new. The seating order below is the
-- documented one for a deacon: memberships first, access second, so the
-- People-page trigger has nothing to add.

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test'),
  ('a0000000-0000-0000-0000-000000000010', 'deacon-b@memorial.test');

insert into person (id, auth_id, name, role, email, access, active) values
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'Deacon A', 'Deacon', 'deacon-a@memorial.test', 'none', true),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000010', 'Deacon B', 'Deacon', 'deacon-b@memorial.test', 'none', true);

insert into membership (person_id, body_id, role_in_body, term_start, term_end)
select p.id, b.id, r.role_in_body::body_role, r.term_start, r.term_end
  from (values
    ('b0000000-0000-0000-0000-000000000009', 'deacon-board',                'member', date '2025-09-01', null),
    ('b0000000-0000-0000-0000-000000000009', 'committee:finance',           'member', date '2025-09-01', null),
    ('b0000000-0000-0000-0000-000000000010', 'deacon-board',                'member', date '2025-09-01', null),
    ('b0000000-0000-0000-0000-000000000010', 'committee:family-assistance', 'chair',  date '2025-09-01', null),
    -- A staff member whose term on the Board ended last year. The row stays;
    -- the seat does not count.
    ('b0000000-0000-0000-0000-000000000001', 'deacon-board',                'member', date '2022-09-01', date '2025-08-31')
  ) as r (person_id, slug, role_in_body, term_start, term_end)
  join person p on p.id = r.person_id::uuid
  join body   b on b.slug = r.slug;

update person set access = 'limited'
 where id in ('b0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000010');

select test.assert(
  (select count(*) from membership m join body b on b.id = m.body_id
    where b.slug = 'staff' and m.person_id in ('b0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000010')) = 0,
  'seating: a deacon seated before being granted access is not put in the staff body');

-- 6a. The staff side, on the new foundation.

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;

select test.assert((select array_agg(slug order by slug) from my_bodies() as slug) = array['staff'],
  'staff: my_bodies() is exactly {staff} — the expired Board term does not count');
select test.assert(is_member_of('staff'),            'staff: is a member of the staff body');
select test.assert(not is_member_of('deacon-board'), 'staff: an expired term is not membership');
select test.assert(is_staff_role(),                  'staff: still the staff role, now via membership and access');
select test.assert((select count(*) from body) = 6,  'staff: reads every body except the confidential one');
select test.assert((select count(*) from body where confidential) = 0, 'staff: the confidential committee does not exist to a non-member');
select test.assert(
  (select count(*) from membership where person_id = 'b0000000-0000-0000-0000-000000000001') = 2,
  'staff: reads their own seats, the expired one included');
select test.assert(
  (select count(*) from membership where person_id = 'b0000000-0000-0000-0000-000000000009') = 0,
  'staff: cannot read a deacon''s seat on a body they are not in');
select test.assert(
  (select count(*) from membership m join body b on b.id = m.body_id where b.slug = 'staff') = 4,
  'staff: reads the whole staff roster''s seats');

select test.refused(
  $q$ insert into membership (person_id, body_id)
      values ('b0000000-0000-0000-0000-000000000001', (select id from body where slug = 'deacon-board')) $q$,
  '42501', 'staff: cannot seat themselves on the Board through the API');
select test.refused(
  $q$ insert into body (slug, kind, name) values ('committee:mine', 'committee', 'Mine') $q$,
  '42501', 'staff: cannot create a body through the API');
update body set confidential = false where slug = 'committee:family-assistance';
update membership set active = false where person_id = 'b0000000-0000-0000-0000-000000000009';
reset role;
select test.assert((select confidential from body where slug = 'committee:family-assistance'),
  'staff: an update aimed at a body changed nothing');
select test.assert((select count(*) from membership where person_id = 'b0000000-0000-0000-0000-000000000009' and active) = 2,
  'staff: an update aimed at another''s seat changed nothing');

-- Inviting a colleague from the People page still works: the seat follows.
set role authenticated;
update person set email = 'volunteer@memorial.test', access = 'limited' where name = 'A Volunteer';
reset role;
select test.assert(
  (select count(*) from membership m join body b on b.id = m.body_id join person p on p.id = m.person_id
    where b.slug = 'staff' and p.name = 'A Volunteer' and m.active) = 1,
  'inviting: a person granted access with no seat anywhere is seated in staff');

select test.sign_in('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test');
set role authenticated;
select test.assert((select array_agg(slug order by slug) from my_bodies() as slug) = array['staff'],
  'limited: is in the staff body');
select test.assert(not is_staff_role(),                  'limited: membership alone is not the staff role');
select test.assert((select count(*) from care_entry) = 0, 'limited: still reads ZERO rows from care_entry on the new gate');
reset role;

-- 6b. A deacon in two rooms, and the room he is not in.

select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;

select test.assert(is_signed_in(), 'deacon A: signs in');
select test.assert((select array_agg(slug order by slug) from my_bodies() as slug) = array['committee:finance', 'deacon-board'],
  'deacon A: my_bodies() is the Board and Finance, nothing else');
select test.assert(is_member_of('deacon-board'),                    'deacon A: sits on the Board');
select test.assert(is_member_of('committee:finance'),               'deacon A: sits on Finance');
select test.assert(not is_member_of('committee:family-assistance'), 'deacon A: is not in Family Assistance');
select test.assert(not is_member_of('staff'),                       'deacon A: is not staff');
select test.assert(not is_staff_role(),                             'deacon A: is not the staff role');
select test.assert(not is_chair_of('deacon-board'),                 'deacon A: is not the chairman');

select test.assert((select count(*) from care_entry) = 0, 'deacon A: reads ZERO rows from care_entry');
select test.assert((select count(*) from care_type)  = 0, 'deacon A: reads zero rows from care_type');
select test.assert((select count(*) from thread)     = 0, 'deacon A: reads zero rows from the staff discussion');
select test.assert((select count(*) from post)       = 0, 'deacon A: reads zero posts');
select test.refused(
  $q$ insert into care_entry (person_name, type, opened_on) values ('Someone', 'Hospital', current_date) $q$,
  '42501', 'deacon A: cannot write a care entry');

select test.assert((select count(*) from body) = 6, 'deacon A: reads six bodies');
select test.assert((select count(*) from body where slug = 'committee:family-assistance') = 0,
  'deacon A: the confidential committee he is not in does not exist to him');
select test.assert((select count(*) from body where slug = 'committee:personnel') = 1,
  'deacon A: a committee he is not in, but which is not confidential, is visible by name');
select test.assert(
  (select count(*) from membership where person_id = 'b0000000-0000-0000-0000-000000000009') = 2,
  'deacon A: reads his own two seats');
select test.assert(
  (select count(*) from membership m join body b on b.id = m.body_id
    where m.person_id = 'b0000000-0000-0000-0000-000000000010' and b.slug = 'deacon-board') = 1,
  'deacon A: reads a fellow Board member''s Board seat');
select test.assert(
  (select count(*) from membership m join body b on b.id = m.body_id
    where m.person_id = 'b0000000-0000-0000-0000-000000000010' and b.slug = 'committee:family-assistance') = 0,
  'deacon A: reads ZERO rows from the confidential committee''s roster');
select test.assert(
  (select count(*) from membership m join body b on b.id = m.body_id where b.slug = 'staff') = 0,
  'deacon A: reads zero staff seats — a room he is not in');

select test.refused(
  $q$ insert into membership (person_id, body_id)
      values ('b0000000-0000-0000-0000-000000000009', (select id from body where slug = 'committee:finance')) $q$,
  '42501', 'deacon A: cannot seat himself anywhere through the API');

reset role;

select test.sign_in('a0000000-0000-0000-0000-000000000010', 'deacon-b@memorial.test');
set role authenticated;

select test.assert(is_chair_of('committee:family-assistance'), 'deacon B: chairs Family Assistance');
select test.assert(not is_chair_of('deacon-board'),            'deacon B: does not chair the Board');
select test.assert((select count(*) from body where slug = 'committee:family-assistance') = 1,
  'deacon B: the confidential committee exists to its member');
select test.assert((select count(*) from body) = 7, 'deacon B: reads all seven bodies');
select test.assert(
  (select count(*) from membership m join body b on b.id = m.body_id where b.slug = 'committee:family-assistance') = 1,
  'deacon B: reads the confidential roster he sits on');
select test.assert((select count(*) from care_entry) = 0, 'deacon B: reads ZERO rows from care_entry');

reset role;

-- Signed out again, now that there are bodies to not see.
select test.sign_out();
set role anon;
select test.assert((select count(*) from body) = 0,        'signed out: no bodies');
select test.assert((select count(*) from membership) = 0,  'signed out: no seats');
select test.assert((select count(*) from my_bodies()) = 0, 'signed out: my_bodies() is empty');
reset role;
