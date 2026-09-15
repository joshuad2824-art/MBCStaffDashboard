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
  ('c0000000-0000-0000-0000-000000000001', 'Quarterly business meeting', 'All groups', 3, 'Quarterly', 21);

insert into notice_entry (id, subject, ministry, category, decided_on) values
  ('d0000000-0000-0000-0000-000000000001', 'Service time moves to 10:30', 'Music', 'Schedule change', current_date);

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

-- ------------------------------------------------------- 7. the meeting
--
-- 0005. The Board's room: members read and write it under their own names,
-- nobody deletes from it, and the attendance count answers only the chairman.

-- Seat the Senior Pastor ex officio, and make Deacon A the chairman.
insert into membership (person_id, body_id, role_in_body, term_start)
select 'b0000000-0000-0000-0000-000000000003', id, 'ex_officio', date '2025-09-01' from body where slug = 'deacon-board';
update membership set role_in_body = 'chair'
 where person_id = 'b0000000-0000-0000-0000-000000000009'
   and body_id = (select id from body where slug = 'deacon-board');

-- 7a. A member creates the meeting and records the night.

select test.sign_in('a0000000-0000-0000-0000-000000000010', 'deacon-b@memorial.test');
set role authenticated;

select test.refused(
  $q$ select * from chairman_roster() $q$,
  '42501', 'board member: cannot open the chairman''s seat editor');
select test.refused(
  $q$ select set_managed_membership(
        'b0000000-0000-0000-0000-000000000010', 'deacon-board', 'chair', current_date, null, true
      ) $q$,
  '42501', 'board member: cannot promote himself through the chairman''s seat editor');

select test.assert(
  (select array_agg(slug || ':' || role_in_body order by slug) from my_seats()) = array['committee:family-assistance:chair', 'deacon-board:member'],
  'deacon B: my_seats() names both seats and the role in each');

select test.refused(
  $q$ insert into board_meeting (id, meets_on, created_by)
      values ('c1000000-0000-0000-0000-000000000001', current_date, 'b0000000-0000-0000-0000-000000000009') $q$,
  '42501', 'deacon B: cannot create a meeting under another man''s name');

insert into board_meeting (id, meets_on, created_by)
  values ('c1000000-0000-0000-0000-000000000001', current_date, 'b0000000-0000-0000-0000-000000000010');
select test.assert((select count(*) from board_meeting) = 1, 'deacon B: creates the September meeting');

insert into agenda_item (meeting_id, position, title, source, created_by)
  values ('c1000000-0000-0000-0000-000000000001', 1, 'Treasurer''s report', 'recurring', 'b0000000-0000-0000-0000-000000000010');
select test.refused(
  $q$ insert into agenda_item (meeting_id, title, created_by)
      values ('c1000000-0000-0000-0000-000000000001', 'Not mine', 'b0000000-0000-0000-0000-000000000009') $q$,
  '42501', 'deacon B: cannot add an agenda item under another man''s name');

update board_meeting set status = 'in_session' where id = 'c1000000-0000-0000-0000-000000000001';

insert into meeting_attendance (meeting_id, person_id, status, recorded_by) values
  ('c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'present', 'b0000000-0000-0000-0000-000000000010'),
  ('c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009', 'absent',  'b0000000-0000-0000-0000-000000000010');
select test.assert((select count(*) from meeting_attendance) = 2, 'deacon B: calls the roll — who was present and who was not, for the minutes');

insert into motion (meeting_id, text, moved_by, seconded_by, disposition, recorded_by) values
  ('c1000000-0000-0000-0000-000000000001', 'That the Board approve the resurfacing of the north lot.',
   'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000009', 'tabled', 'b0000000-0000-0000-0000-000000000010');
select test.refused(
  $q$ insert into motion (meeting_id, text, disposition, bylaw_reference, text_before, recorded_by)
      values ('c1000000-0000-0000-0000-000000000001', 'That Article II.B be amended.', 'approved', 'Art. II.B §3 ¶12', 'before', 'b0000000-0000-0000-0000-000000000010') $q$,
  '23514', 'motion: an amendment must quote the sentence before and after, not just cite the paragraph');

-- Nothing is deleted. There is no delete policy, so a delete touches no rows.
delete from motion;
delete from meeting_attendance;
delete from agenda_item;
delete from board_meeting;
select test.assert((select count(*) from motion) = 1,             'deacon B: cannot delete a motion');
select test.assert((select count(*) from meeting_attendance) = 2, 'deacon B: cannot delete attendance');
select test.assert((select count(*) from agenda_item) = 1,        'deacon B: cannot delete an agenda item');
select test.assert((select count(*) from board_meeting) = 1,      'deacon B: cannot delete the meeting');

select test.assert(
  (select count(*) from pg_proc where proname = 'board_attendance_summary') = 0,
  'there is no attendance tracker: nothing computes a count against the three-fourths rule');
reset role;

-- 7b. The chairman is the chairman, and his absence changes nothing.

select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;
select test.assert(is_chair_of('deacon-board'), 'chairman: is the chairman');
select test.assert(
  (select count(*) from chairman_roster()) = (select count(*) from person where active),
  'chairman: the seat editor lists the active roster, including people without a seat');
select test.assert(
  (select count(*) from chairman_roster() r, jsonb_array_elements(r.seats) seat
    where seat->>'slug' = 'committee:family-assistance') = 0,
  'chairman: the confidential Family Assistance roster stays hidden from a non-member');
select test.refused(
  $q$ select set_managed_membership(
        'b0000000-0000-0000-0000-000000000001', 'committee:family-assistance', 'member', current_date, null, true
      ) $q$,
  '22023', 'chairman: cannot manage the confidential Family Assistance roster as a non-member');
select set_managed_membership(
  (select id from person where name = 'A Volunteer'),
  'committee:personnel',
  'member',
  current_date + 30,
  current_date + 395,
  true
);
select test.assert(
  (select count(*) from chairman_roster() r, jsonb_array_elements(r.seats) seat
    where r.person_name = 'A Volunteer' and seat->>'slug' = 'committee:personnel') = 1,
  'chairman: can add a future committee seat from the editor');
select set_managed_membership(
  (select id from person where name = 'A Volunteer'),
  'committee:personnel',
  'member',
  current_date + 30,
  current_date + 395,
  false
);
select test.assert(
  (select count(*) from membership m join person p on p.id = m.person_id join body b on b.id = m.body_id
    where p.name = 'A Volunteer' and b.slug = 'committee:personnel' and m.active) = 0,
  'chairman: can withdraw a future seat without creating an end-before-start term');
select test.refused(
  $q$ select set_managed_membership(
        'b0000000-0000-0000-0000-000000000009', 'deacon-board', 'member', current_date, null, true
      ) $q$,
  '42501', 'chairman: cannot demote his own active chair seat');
select test.assert(
  (select access from person where id = 'b0000000-0000-0000-0000-000000000009') = 'limited'
  and (select active from membership where person_id = 'b0000000-0000-0000-0000-000000000009' and body_id = (select id from body where slug = 'deacon-board')),
  'chairman: an absence on the roll changes nothing about his standing');
reset role;

-- 7c. The Senior Pastor, ex officio, is in the room.

select test.sign_in('a0000000-0000-0000-0000-000000000003', 'other@memorial.test');
set role authenticated;
select test.assert(is_member_of('deacon-board') and is_staff_role(), 'ex officio: sits on the Board and is still staff');
select test.assert((select count(*) from board_meeting) = 1, 'ex officio: reads the meeting');
reset role;

-- 7d. Everyone else gets nothing.

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.assert((select count(*) from board_meeting) = 0,      'staff: reads ZERO meetings — an expired seat is not a seat');
select test.assert((select count(*) from agenda_item) = 0,        'staff: reads zero agenda items');
select test.assert((select count(*) from meeting_attendance) = 0, 'staff: reads ZERO attendance rows');
select test.assert((select count(*) from motion) = 0,             'staff: reads zero motions');
select test.refused(
  $q$ insert into board_meeting (meets_on, created_by) values (current_date + 30, 'b0000000-0000-0000-0000-000000000001') $q$,
  '42501', 'staff: cannot create a Board meeting');
reset role;

select test.sign_in('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test');
set role authenticated;
select test.assert((select count(*) from board_meeting) = 0,      'limited: reads zero meetings');
select test.assert((select count(*) from meeting_attendance) = 0, 'limited: reads zero attendance rows');
reset role;

select test.sign_out();
set role anon;
select test.assert((select count(*) from board_meeting) = 0,      'signed out: no meetings');
select test.assert((select count(*) from meeting_attendance) = 0, 'signed out: no attendance');
select test.assert((select count(*) from motion) = 0,             'signed out: no motions');
reset role;

-- ------------------------------------------------------- 8. the reports
--
-- 0006. Chairs write their committee's report, the Board reads what is not
-- confidential, publishing writes a version nobody can change, and a
-- Personnel report cannot carry a dollar figure.

-- Seats for this section: Deacon A chairs Finance too; Deacon B chairs
-- Personnel; a new man chairs Building & Grounds and sits on no other body.
update membership set role_in_body = 'chair'
 where person_id = 'b0000000-0000-0000-0000-000000000009'
   and body_id = (select id from body where slug = 'committee:finance');
insert into membership (person_id, body_id, role_in_body, term_start)
select 'b0000000-0000-0000-0000-000000000010', id, 'chair', date '2025-09-01' from body where slug = 'committee:personnel';
insert into auth.users (id, email) values ('a0000000-0000-0000-0000-000000000011', 'grounds@memorial.test');
insert into person (id, auth_id, name, role, email, access) values
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000011', 'Grounds Chair', 'Member', 'grounds@memorial.test', 'none');
insert into membership (person_id, body_id, role_in_body, term_start)
select 'b0000000-0000-0000-0000-000000000011', id, 'chair', date '2025-09-01' from body where slug = 'committee:building-grounds';
update person set access = 'limited' where id = 'b0000000-0000-0000-0000-000000000011';

-- 8a. The Finance chair drafts, submits and publishes; the Board reads.

select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;

select test.assert(can_write_report('committee', (select id from body where slug = 'committee:finance'), null), 'finance chair: may write the Finance report');
select test.assert(not can_write_report('committee', (select id from body where slug = 'committee:personnel'), null), 'finance chair: may not write Personnel''s draft');

insert into report (id, kind, body_id, meeting_id, payload, created_by)
  values ('d1000000-0000-0000-0000-000000000001', 'committee', (select id from body where slug = 'committee:finance'),
          'c1000000-0000-0000-0000-000000000001', '{"budgetAdopted": 1284000}', 'b0000000-0000-0000-0000-000000000009');
select test.refused(
  $q$ insert into report (kind, body_id, meeting_id, created_by)
      values ('committee', (select id from body where slug = 'committee:finance'), 'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010') $q$,
  '42501', 'finance chair: cannot file under another man''s name');
select test.refused(
  $q$ insert into report (kind, body_id, created_by) values ('treasurer', (select id from body where slug = 'committee:finance'), 'b0000000-0000-0000-0000-000000000009') $q$,
  '23514', 'treasurer: a report without its period is refused');
insert into report (id, kind, body_id, meeting_id, period_start, period_end, created_by)
  values ('d1000000-0000-0000-0000-000000000002', 'treasurer', (select id from body where slug = 'committee:finance'),
          'c1000000-0000-0000-0000-000000000001', date '2026-08-01', date '2026-08-31', 'b0000000-0000-0000-0000-000000000009');

update report set status = 'submitted', submitted_by = 'b0000000-0000-0000-0000-000000000009', submitted_at = now()
 where id = 'd1000000-0000-0000-0000-000000000001';
update report set status = 'published', published_at = now() where id = 'd1000000-0000-0000-0000-000000000001';
insert into report_version (id, report_id, version_no, payload, rendered, created_by)
  values ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 1, '{"budgetAdopted": 1284000}', 'Finance committee report', 'b0000000-0000-0000-0000-000000000009');
insert into report_version (report_id, version_no, payload, rendered, created_by, supersedes_version_id)
  values ('d1000000-0000-0000-0000-000000000001', 2, '{"budgetAdopted": 1284000, "note": "restated"}', 'Finance committee report, revised', 'b0000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000001');
select test.assert((select count(*) from report_version where report_id = 'd1000000-0000-0000-0000-000000000001') = 2, 'publishing: a second publish is a second version');
select test.refused(
  $q$ insert into report_version (report_id, version_no, payload, created_by)
      values ('d1000000-0000-0000-0000-000000000001', 3, '{}', 'b0000000-0000-0000-0000-000000000010') $q$,
  '42501', 'versions: cannot be written under another man''s name');

-- Versions are records: no update, no delete, for anyone.
update report_version set rendered = 'tampered' where version_no = 1;
delete from report_version;
delete from report;
select test.assert((select rendered from report_version where version_no = 1) = 'Finance committee report', 'versions: cannot be changed after publication');
select test.assert((select count(*) from report_version) = 2, 'versions: cannot be deleted');
select test.assert((select count(*) from report) = 2, 'reports: cannot be deleted');
reset role;

-- The Board reads a non-confidential committee's report; a non-chair member cannot change it.
select test.sign_in('a0000000-0000-0000-0000-000000000010', 'deacon-b@memorial.test');
set role authenticated;
select test.assert((select count(*) from report where kind = 'committee') = 1, 'board member: reads the Finance report');
select test.assert((select count(*) from report_version) = 2, 'board member: reads both versions');
update report set payload = '{"budgetAdopted": 1}' where id = 'd1000000-0000-0000-0000-000000000001';
reset role;
select test.assert((select payload->>'budgetAdopted' from report where id = 'd1000000-0000-0000-0000-000000000001') = '1284000',
  'board member: an update aimed at another committee''s report changed nothing');

-- 8b. A draft is the committee's own; a filed report goes to the Board.

set role authenticated;
insert into report (id, kind, body_id, meeting_id, status, submitted_by, submitted_at, payload, created_by)
  values ('d1000000-0000-0000-0000-000000000003', 'committee', (select id from body where slug = 'committee:family-assistance'),
          'c1000000-0000-0000-0000-000000000001', 'submitted', 'b0000000-0000-0000-0000-000000000010', now(),
          '{"received": 3, "approved": 2, "declined": 1, "totalApproved": 1850, "thirdPartyInvoiceConfirmed": true}',
          'b0000000-0000-0000-0000-000000000010');
reset role;

-- The confidential body's row is invisible to a non-member, so the report is
-- found by the body's id, captured here, not by a subquery on `body`.
select id as fa_body from body where slug = 'committee:family-assistance' \gset
select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;
select test.assert((select count(*) from report where body_id = :'fa_body') = 1,
  'chairman: reads the Family Assistance report once it is filed — counts, amounts and the D002 line, which is all it can hold');
select test.assert((select count(*) from body where id = :'fa_body') = 0,
  'chairman: and still cannot see the confidential body''s own row — the report names itself through reports_filed()');
select test.assert((select count(*) from reports_filed('c1000000-0000-0000-0000-000000000001')) = 2,
  'chairman: reports_filed() lists what was filed against the meeting — the Treasurer''s draft is not filed yet');
reset role;

-- A draft stays in the committee's room until it is filed.
select test.sign_in('a0000000-0000-0000-0000-000000000010', 'deacon-b@memorial.test');
set role authenticated;
select test.assert((select count(*) from report where kind = 'treasurer') = 0,
  'board member: reads ZERO drafts of another committee — a draft is the chair''s own until filed');
reset role;

-- 8c. Personnel carries no compensation figures.

select test.sign_in('a0000000-0000-0000-0000-000000000010', 'deacon-b@memorial.test');
set role authenticated;
select test.refused(
  $q$ insert into report (kind, body_id, meeting_id, payload, created_by)
      values ('committee', (select id from body where slug = 'committee:personnel'), 'c1000000-0000-0000-0000-000000000001',
              '{"staffingActions": ["Raised the associate pastor to $52,000"]}', 'b0000000-0000-0000-0000-000000000010') $q$,
  'P0001', 'personnel: a dollar figure is refused');
insert into report (id, kind, body_id, meeting_id, payload, created_by)
  values ('d1000000-0000-0000-0000-000000000004', 'committee', (select id from body where slug = 'committee:personnel'), 'c1000000-0000-0000-0000-000000000001',
          '{"reviewsCompleted": ["Senior Pastor, annual"], "staffingActions": ["Posted the part-time custodian role"]}', 'b0000000-0000-0000-0000-000000000010');
select test.refused(
  $q$ update report set payload = '{"staffingActions": ["$ 900 stipend"]}' where id = 'd1000000-0000-0000-0000-000000000004' $q$,
  'P0001', 'personnel: a figure cannot be slipped in by update either');

-- Minutes: any Board member writes them; one per meeting.
insert into report (id, kind, body_id, meeting_id, payload, created_by)
  values ('d1000000-0000-0000-0000-000000000005', 'minutes', (select id from body where slug = 'deacon-board'), 'c1000000-0000-0000-0000-000000000001',
          '{"opening": "Opened with prayer."}', 'b0000000-0000-0000-0000-000000000010');
select test.refused(
  $q$ insert into report (kind, body_id, meeting_id, created_by)
      values ('minutes', (select id from body where slug = 'deacon-board'), 'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010') $q$,
  '23505', 'minutes: one record per meeting');
select test.refused(
  $q$ insert into report (kind, body_id, created_by) values ('minutes', (select id from body where slug = 'deacon-board'), 'b0000000-0000-0000-0000-000000000010') $q$,
  '23514', 'minutes: are always of a meeting');
reset role;

-- 8d. Everyone else.

-- The Senior Pastor, ex officio on the Board: reads, does not write.
select test.sign_in('a0000000-0000-0000-0000-000000000003', 'other@memorial.test');
set role authenticated;
select test.assert((select count(*) from report where kind = 'committee' and body_id = (select id from body where slug = 'committee:finance')) = 1, 'ex officio: reads the Finance report');
-- A Board member files a report on a committee's behalf — an upload, their
-- traditional way — and keeps writing the one he created, and no other.
insert into report (id, kind, body_id, meeting_id, status, file_path, file_name, file_type, created_by, submitted_by, submitted_at)
  values ('d1000000-0000-0000-0000-000000000006', 'committee', (select id from body where slug = 'committee:building-grounds'), 'c1000000-0000-0000-0000-000000000001',
          'submitted', 'd1000000-0000-0000-0000-000000000006/1-Building-Grounds-August.pdf', 'Building & Grounds - August.pdf', 'application/pdf',
          'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', now());
select test.assert((select count(*) from report where created_by = 'b0000000-0000-0000-0000-000000000003') = 1, 'ex officio: files a committee''s report on its behalf');
update report set file_name = 'renamed.pdf' where id = 'd1000000-0000-0000-0000-000000000001';
reset role;
select test.assert((select file_name from report where id = 'd1000000-0000-0000-0000-000000000001') is null,
  'ex officio: cannot change a report another man created');

-- The bucket asks the report's own questions.
set role authenticated;
insert into storage.objects (bucket_id, name) values ('reports', 'd1000000-0000-0000-0000-000000000006/1-Building-Grounds-August.pdf');
select test.assert((select count(*) from storage.objects) >= 1, 'bucket: the uploader puts the file under his report');
select test.refused(
  $q$ insert into storage.objects (bucket_id, name) values ('reports', 'd1000000-0000-0000-0000-000000000001/2-not-mine.pdf') $q$,
  '42501', 'bucket: cannot put a file under a report he cannot write');
delete from storage.objects;
select test.assert((select count(*) from storage.objects) >= 1, 'bucket: a filed file cannot be deleted');
reset role;

-- A committee chair who sits on no other body: files, sees the meeting, and nothing of the room.
select test.sign_in('a0000000-0000-0000-0000-000000000011', 'grounds@memorial.test');
set role authenticated;
select test.assert(is_on_deacon_side() and not is_member_of('deacon-board'), 'grounds chair: on the deacon side, not on the Board');
select test.assert((select count(*) from board_meeting) = 1,      'grounds chair: sees that the meeting exists, to file against it');
select test.assert((select count(*) from agenda_item) = 0,        'grounds chair: reads zero agenda items');
select test.assert((select count(*) from meeting_attendance) = 0, 'grounds chair: reads ZERO attendance rows');
select test.assert((select count(*) from motion) = 0,             'grounds chair: reads zero motions');
select test.assert((select count(*) from report) = 1 and (select count(*) from report where body_id <> (select id from body where slug = 'committee:building-grounds')) = 0,
  'grounds chair: reads only his committee''s report — the one filed on its behalf — and zero of any other');
select test.assert((select count(*) from reports_filed('c1000000-0000-0000-0000-000000000001')) = 0, 'grounds chair: reports_filed() answers only the Board');
insert into report (kind, body_id, meeting_id, payload, created_by)
  values ('committee', (select id from body where slug = 'committee:building-grounds'), 'c1000000-0000-0000-0000-000000000001',
          '{"projectsOpen": ["North lot resurfacing"]}', 'b0000000-0000-0000-0000-000000000011');
select test.assert((select count(*) from report) = 2, 'grounds chair: reads his own report and the one filed on his committee''s behalf');
select test.assert((select count(*) from storage.objects) = 1, 'bucket: the chair reads the file filed for his committee');
update report set file_name = 'chair-renamed.pdf' where id = 'd1000000-0000-0000-0000-000000000006';
reset role;
select test.assert((select file_name from report where id = 'd1000000-0000-0000-0000-000000000006') = 'chair-renamed.pdf',
  'grounds chair: may write a report filed for his committee by someone else');

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.assert((select count(*) from report) = 0,         'staff: reads ZERO reports');
select test.assert((select count(*) from report_version) = 0, 'staff: reads zero versions');
select test.assert((select count(*) from storage.objects) = 0, 'staff: reads ZERO files from the reports bucket');
reset role;

select test.sign_in('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test');
set role authenticated;
select test.assert((select count(*) from report) = 0, 'limited: reads zero reports');
reset role;

select test.sign_out();
set role anon;
select test.assert((select count(*) from report) = 0,         'signed out: no reports');
select test.assert((select count(*) from report_version) = 0, 'signed out: no versions');
select test.assert((select count(*) from storage.objects) = 0,  'signed out: no files');
reset role;

-- ------------------------------------------------- 9. shared surfaces (0008)
--
-- One record, two audiences. The shape of every shared-surface policy is
-- `audience && array(select my_bodies())`, with one twist for the discussion:
-- there `staff` means the staff role, so a limited account still reads
-- nothing from the board. Every case below is the negative one first.

reset role;

-- Rooms: a Board thread, a joint thread, and the staff thread from section 2.
insert into thread (id, subject, created_by, audience) values
  ('f0000000-0000-0000-0000-000000000003', 'Board thread', 'b0000000-0000-0000-0000-000000000009', '{deacon-board}'),
  ('f0000000-0000-0000-0000-000000000004', 'Joint thread', 'b0000000-0000-0000-0000-000000000001', '{staff,deacon-board}');

insert into post (id, thread_id, body, author_id) values
  ('f1000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', 'For the Board only',     'b0000000-0000-0000-0000-000000000009'),
  ('f1000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000004', 'For both rooms @Deacon A', 'b0000000-0000-0000-0000-000000000001');

insert into mention (id, post_id, person_id) values
  ('f2000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000009');

-- Calendar: a staff working draft, a published event, and one the Board keeps to itself.
insert into event (id, name, ministry, starts_at, audience, published_at) values
  ('e1000000-0000-0000-0000-000000000001', 'Staff draft',  'All', current_date + 7,  '{staff}',              null),
  ('e1000000-0000-0000-0000-000000000002', 'Shared event', 'All', current_date + 14, '{staff,deacon-board}', now()),
  ('e1000000-0000-0000-0000-000000000003', 'Board only',   'All', current_date + 21, '{deacon-board}',       null);

insert into announcement (id, body, audience, author_id, expires_on) values
  ('e2000000-0000-0000-0000-000000000001', 'Staff only',        '{staff}',              'b0000000-0000-0000-0000-000000000001', current_date + 7),
  ('e2000000-0000-0000-0000-000000000002', 'To both sides',     '{staff,deacon-board}', 'b0000000-0000-0000-0000-000000000009', current_date + 7),
  ('e2000000-0000-0000-0000-000000000003', 'Board only',        '{deacon-board}',       'b0000000-0000-0000-0000-000000000010', current_date + 7),
  ('e2000000-0000-0000-0000-000000000004', 'Long expired',      '{staff}',              'b0000000-0000-0000-0000-000000000001', current_date - 20),
  ('e2000000-0000-0000-0000-000000000005', 'Recently expired',  '{staff}',              'b0000000-0000-0000-0000-000000000001', current_date - 5);

-- 9a. Audience is never empty, and it names bodies.

select test.refused(
  $q$ insert into thread (subject, created_by, audience) values ('Nobody', 'b0000000-0000-0000-0000-000000000001', '{}') $q$,
  '23514', 'audience: an empty thread audience is refused');
select test.refused(
  $q$ insert into event (name, ministry, starts_at, audience) values ('Nobody', 'All', current_date, '{}') $q$,
  '23514', 'audience: an empty event audience is refused');
select test.refused(
  $q$ insert into announcement (body, audience, author_id) values ('Nobody', '{}', 'b0000000-0000-0000-0000-000000000001') $q$,
  '23514', 'audience: an empty announcement audience is refused');
select test.refused(
  $q$ insert into thread (subject, created_by, audience) values ('Nowhere', 'b0000000-0000-0000-0000-000000000001', '{staff,elders}') $q$,
  'P0001', 'audience: a slug that names no body is refused');
select test.refused(
  $q$ update event set published_at = now() where id = 'e1000000-0000-0000-0000-000000000001' $q$,
  '23514', 'calendar: a staff-only event cannot be stamped published — publishing is widening');

-- 9b. A deacon: the Board's rooms and the joint ones, nothing of the staff's.

select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;

select test.assert((select count(*) from thread) = 2,                                  'deacon A: reads the Board thread and the joint thread');
select test.assert((select count(*) from thread where audience = '{staff}') = 0,       'deacon A: reads ZERO staff-only threads');
select test.assert((select count(*) from post where thread_id = 'f0000000-0000-0000-0000-000000000001') = 0, 'deacon A: reads zero posts on the staff thread');
select test.assert((select count(*) from post) = 2,                                    'deacon A: reads the posts in his rooms');
select test.assert((select count(*) from mention) = 1,                                 'deacon A: reads the mention on the joint thread and none from the staff thread');
select test.assert((select count(*) from care_entry) = 0,                              'deacon A: still reads ZERO rows from care_entry');
select test.assert((select count(*) from event) = 2,                                   'deacon A: reads the published event and the Board''s own');
select test.assert((select count(*) from event where id = 'e1000000-0000-0000-0000-000000000001') = 0, 'deacon A: reads ZERO staff drafts');
select test.assert((select count(*) from announcement) = 2,                            'deacon A: reads the joint and Board announcements');
select test.assert((select count(*) from announcement where audience = '{staff}') = 0, 'deacon A: reads zero staff-only announcements');

select test.refused(
  $q$ insert into thread (subject, created_by, audience) values ('Into the staff room', 'b0000000-0000-0000-0000-000000000009', '{staff}') $q$,
  '42501', 'deacon A: cannot start a thread addressed to staff only');
select test.refused(
  $q$ insert into post (thread_id, body, author_id) values ('f0000000-0000-0000-0000-000000000001', 'Hello staff', 'b0000000-0000-0000-0000-000000000009') $q$,
  '42501', 'deacon A: cannot post to the staff thread');
select test.refused(
  $q$ insert into post (thread_id, body, author_id) values ('f0000000-0000-0000-0000-000000000004', 'As someone else', 'b0000000-0000-0000-0000-000000000001') $q$,
  '42501', 'deacon A: cannot post as someone else');
select test.refused(
  $q$ insert into announcement (body, audience, author_id) values ('Staff only', '{staff}', 'b0000000-0000-0000-0000-000000000009') $q$,
  '42501', 'deacon A: cannot announce to staff only');
select test.refused(
  $q$ insert into event (name, ministry, starts_at, audience) values ('Staff only', 'All', current_date, '{staff}') $q$,
  '42501', 'deacon A: cannot put an event on the staff calendar alone');

insert into thread (subject, created_by, audience) values ('Board only', 'b0000000-0000-0000-0000-000000000009', '{deacon-board}');
insert into thread (subject, created_by, audience) values ('Both rooms', 'b0000000-0000-0000-0000-000000000009', '{deacon-board,staff}');
insert into post (thread_id, body, author_id) values ('f0000000-0000-0000-0000-000000000004', 'A reply from the Board', 'b0000000-0000-0000-0000-000000000009');
insert into announcement (body, audience, author_id) values ('From the Board to both', '{staff,deacon-board}', 'b0000000-0000-0000-0000-000000000009');
insert into event (name, ministry, starts_at, audience) values ('Board retreat', 'All', current_date + 30, '{deacon-board}');
select test.assert((select count(*) from thread) = 4, 'deacon A: may start a thread for the Board, and one addressed to both rooms');

update announcement set body = 'Rewritten' where id = 'e2000000-0000-0000-0000-000000000003';
reset role;
select test.assert((select body from announcement where id = 'e2000000-0000-0000-0000-000000000003') = 'Board only',
  'deacon A: cannot edit another author''s announcement');

-- 9c. A committee chair who is not on the Board: nothing addressed to the Board reaches him.

select test.sign_in('a0000000-0000-0000-0000-000000000011', 'grounds@memorial.test');
set role authenticated;
select test.assert((select count(*) from thread) = 0,       'grounds chair: reads zero threads — none is addressed to his committee');
select test.assert((select count(*) from event) = 0,        'grounds chair: reads zero events');
select test.assert((select count(*) from announcement) = 0, 'grounds chair: reads zero announcements');
reset role;

-- 9d. A limited account: the calendar and the announcements, as before, and still nothing from the board.

select test.sign_in('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test');
set role authenticated;
select test.assert((select count(*) from thread) = 0,       'limited: reads ZERO threads — the joint thread included; staff means the staff role');
select test.assert((select count(*) from post) = 0,         'limited: reads zero posts');
select test.assert((select count(*) from event) = 2,        'limited: reads the staff calendar, drafts and published alike, and nothing the Board keeps');
select test.assert((select count(*) from event where audience = '{deacon-board}') = 0, 'limited: reads zero Board-only events');
select test.assert((select count(*) from announcement where expires_on >= current_date) = 3, 'limited: reads staff and joint announcements');
select test.refused(
  $q$ insert into thread (subject, created_by, audience) values ('Mine', 'b0000000-0000-0000-0000-000000000002', '{staff,deacon-board}') $q$,
  '42501', 'limited: cannot start a thread, joint or otherwise');
reset role;

-- 9e. Staff: the staff room and the joint one, nothing the Board keeps to itself; publishing widens.

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.assert((select count(*) from thread) = 3,                                    'staff: reads the staff thread and the two joint threads');
select test.assert((select count(*) from thread where audience = '{deacon-board}') = 0, 'staff: reads ZERO Board-only threads');
select test.assert((select count(*) from post where thread_id = 'f0000000-0000-0000-0000-000000000003') = 0, 'staff: reads zero posts on the Board thread');
select test.assert((select count(*) from event) = 2,                                     'staff: reads the staff calendar and the shared event');
select test.assert((select count(*) from event where audience = '{deacon-board}') = 0,  'staff: reads ZERO Board-only events');
select test.assert((select count(*) from announcement where audience = '{deacon-board}') = 0, 'staff: reads zero Board-only announcements');

select test.refused(
  $q$ insert into thread (subject, created_by, audience) values ('Into the Board room', 'b0000000-0000-0000-0000-000000000001', '{deacon-board}') $q$,
  '42501', 'staff: cannot start a thread addressed to the Board only');
select test.refused(
  $q$ update thread set audience = '{deacon-board}' where id = 'f0000000-0000-0000-0000-000000000004' $q$,
  '42501', 'staff: cannot narrow a joint thread to a room they are not in');
select test.refused(
  $q$ update event set audience = '{deacon-board}' where id = 'e1000000-0000-0000-0000-000000000001' $q$,
  '42501', 'staff: cannot hand an event to the Board and lose it');

-- Publishing: widen the audience and stamp the date, in one statement.
update event set audience = '{staff,deacon-board}', published_at = now() where id = 'e1000000-0000-0000-0000-000000000001';
select test.assert((select published_at is not null from event where id = 'e1000000-0000-0000-0000-000000000001'), 'staff: publishes the draft to the Board');
insert into thread (subject, created_by, audience) values ('From staff to both', 'b0000000-0000-0000-0000-000000000001', '{staff,deacon-board}');
insert into announcement (body, audience, author_id) values ('From staff to both', '{staff,deacon-board}', 'b0000000-0000-0000-0000-000000000001');
reset role;

select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;
select test.assert((select count(*) from event where id = 'e1000000-0000-0000-0000-000000000001') = 1, 'deacon A: sees the event once it is published, and not before');
select test.assert((select count(*) from thread) = 5, 'deacon A: reads the thread staff addressed to both rooms');
reset role;

-- 9f. Announcements are purged fourteen days after they expire, like the board.

select test.assert(purge_expired_announcements() = 1, 'purge: removes exactly the long-expired announcement');
select test.assert((select count(*) from announcement where id = 'e2000000-0000-0000-0000-000000000005') = 1, 'purge: a recently expired announcement waits its fourteen days');

-- 9g. Signed out: nothing.

select test.sign_out();
set role anon;
select test.assert((select count(*) from event) = 0,        'signed out: no events');
select test.assert((select count(*) from announcement) = 0, 'signed out: no announcements');
select test.assert((select count(*) from thread) = 0,       'signed out: still no threads');
select test.refused($q$ select purge_expired_announcements() $q$, '42501', 'signed out: cannot call the purge');
reset role;

-- ------------------------------------------------- 10. the year and the reference (0009, 0014)
--
-- Governance content: readable across the deacon side, written by nobody
-- through the API. The obligations are seeded by the migration itself.
--
-- 0014 gives each document an audience. Four documents below take the
-- default — the deacon side and nobody else — and one is marked for the staff
-- in the way the loader marks a file whose front matter says so. The docket
-- has no audience: it stays the deacon side's.

reset role;

insert into governance_document (slug, kind, code, title, body, position) values
  ('article-ii', 'bylaws', 'Art. II', 'Article II — Officers and Boards', 'Transcribed text.', 1),
  ('a009',       'policy', 'A009',    'A009 — Building & Property Use Income', 'Transcribed text.', 2),
  ('constitution', 'constitution', 'Constitution', 'Constitution', 'Transcribed text.', 0),
  ('quick-reference', 'reference', '', 'Quick reference', 'Derived.', 3);
insert into governance_document (slug, kind, code, title, body, position, audience) values
  ('a001', 'policy', 'A001', 'A001 — A policy marked for the staff', 'Transcribed text.', 4, '{staff,deacon-board}');
insert into governance_finding (number, title, body, cites) values
  (8, 'An amendment cites a paragraph that no longer resolves', 'The record captured a location, not the language.', '{"Art. II.B §3 ¶12"}');

-- 10a. The audience is never empty, names bodies, and defaults to the deacon side.

select test.assert(
  (select audience from governance_document where slug = 'a009')
    = '{deacon-board,deacon-body,committee:finance,committee:personnel,committee:building-grounds,committee:family-assistance}',
  'reference: a document with no audience is addressed to the deacon side — every body but staff — and not to the staff');
select test.refused(
  $q$ insert into governance_document (slug, kind, code, title, audience) values ('nobody', 'policy', 'X000', 'Nobody', '{}') $q$,
  '23514', 'reference: an empty audience is refused');
select test.refused(
  $q$ insert into governance_document (slug, kind, code, title, audience) values ('nowhere', 'policy', 'X000', 'Nowhere', '{deacon}') $q$,
  'P0001', 'reference: an audience naming no body — there is no body called deacon — is refused');
select test.assert(
  (select count(*) from pg_policies where tablename in ('governance_document', 'governance_finding') and cmd <> 'SELECT') = 0,
  'reference: neither table has an insert, update or delete policy');

-- 10b. The deacon side reads the manual and the docket, as before.

select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;
select test.assert((select count(*) from obligation) = 15,          'deacon A: reads the year''s obligations, as 0013 seeds them from the manual');
select test.assert((select count(*) from governance_document) = 5, 'deacon A: reads the reference — constitution, bylaws, policy and derived material alike, and the document marked for the staff and the Board');
select test.assert((select count(*) from governance_finding) = 1,  'deacon A: reads the docket');
select test.refused(
  $q$ insert into obligation (slug, title, rule_source, cadence, anchor, owner_body_slug) values ('made-up', 'Made up', 'Nowhere', 'annual', '01-01', 'deacon-board') $q$,
  '42501', 'deacon A: cannot add an obligation — the year is not typed');
-- No update or delete policy: the statements touch no rows and raise nothing.
update governance_document set body = 'Rewritten' where slug = 'article-ii';
delete from governance_finding where number = 8;
reset role;
select test.assert((select body from governance_document where slug = 'article-ii') = 'Transcribed text.', 'deacon A: cannot edit the bylaws');
select test.assert((select count(*) from governance_finding where number = 8) = 1, 'deacon A: cannot strike a finding from the docket');

select test.sign_in('a0000000-0000-0000-0000-000000000011', 'grounds@memorial.test');
set role authenticated;
select test.assert((select count(*) from obligation) = 15,          'grounds chair: on the deacon side, reads the year');
select test.assert((select count(*) from governance_document) = 4, 'grounds chair: reads the reference — a committee seat is on the deacon side');
select test.assert((select count(*) from governance_document where slug = 'a001') = 0,
  'grounds chair: reads ZERO rows of a document addressed to the staff and the Board — an audience is bodies, not a side');
reset role;

-- 10c. The staff: only what the corpus marked for them, and never the docket.

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.assert((select count(*) from obligation) = 0,           'staff: reads ZERO obligations — the year is the Board''s');
select test.assert((select count(*) from governance_document where slug <> 'a001') = 0, 'staff: reads ZERO rows of a document addressed to the deacon side');
select test.assert((select count(*) from governance_document) = 1, 'staff: reads exactly the document the corpus marked for the staff');
select test.assert((select count(*) from governance_finding) = 0,  'staff: reads ZERO findings — the docket stays the deacon side''s');
select test.refused(
  $q$ insert into governance_document (slug, kind, code, title, audience) values ('mine', 'policy', 'X000', 'Mine', '{staff}') $q$,
  '42501', 'staff: cannot add a document to the manual');
update governance_document set audience = '{staff,deacon-board}' where slug = 'a009';
reset role;
select test.assert((select 'staff' = any(audience) from governance_document where slug = 'a009') = false,
  'staff: an update aimed at widening a document''s audience changed nothing');

-- A limited account sits in the staff body, so in_audience() reads `staff`
-- as the roster, exactly as it does for the calendar and announcements. Whether
-- a limited account should read the manual at all is an open question the
-- kickoff leaves to Joshua; this is what the policy does today, and the line
-- to change if the answer is no.
select test.sign_in('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test');
set role authenticated;
select test.assert((select count(*) from obligation) = 0, 'limited: reads zero obligations');
select test.assert((select count(*) from governance_document where slug <> 'a001') = 0, 'limited: reads ZERO rows of a document addressed to the deacon side');
select test.assert((select count(*) from governance_document) = 1, 'limited: reads the document marked for the staff body — staff here is the roster, as on the calendar');
select test.assert((select count(*) from governance_finding) = 0,  'limited: reads zero findings');
reset role;

-- 10d. A re-load applies the corpus session's decisions: the loader's upsert
-- sets audience = excluded.audience, so marking a file reaches the staff on
-- the next load and unmarking it takes the document back.

insert into governance_document (slug, kind, code, title, body, position, audience)
  values ('a009', 'policy', 'A009', 'A009 — Building & Property Use Income', 'Transcribed text.', 2, '{staff,deacon-board}')
  on conflict (slug) do update set audience = excluded.audience, updated_at = now();
select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.assert((select count(*) from governance_document) = 2, 'staff: reads a document once the corpus marks it for the staff and it is re-loaded');
reset role;
insert into governance_document (slug, kind, code, title, body, position)
  values ('a009', 'policy', 'A009', 'A009 — Building & Property Use Income', 'Transcribed text.', 2)
  on conflict (slug) do update set audience = excluded.audience, updated_at = now();
select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.assert((select count(*) from governance_document) = 1, 'staff: and loses it again when the mark is removed and the corpus re-loaded');
reset role;

select test.sign_out();
set role anon;
select test.assert((select count(*) from obligation) = 0,           'signed out: no obligations');
select test.assert((select count(*) from governance_document) = 0, 'signed out: no reference');
select test.assert((select count(*) from governance_finding) = 0,  'signed out: no docket');
reset role;

-- ------------------------------------------------- 11. care: pointers, not content (0010)
--
-- The one place something crosses the sensitivity boundary. The staff
-- compose a request; the deacons act on it; the circumstance stays behind.

reset role;

-- The structural rule first: no notes column on the deacon side's care tables.
select test.assert(
  not exists (select 1 from information_schema.columns
               where table_schema = 'public'
                 and table_name in ('care_assignment', 'care_request', 'deacon_week', 'deacon_visit')
                 and (column_name ilike '%note%' or column_name ilike '%detail%' or column_name ilike '%reason%' or column_name ilike '%circumstance%')),
  'pointers: none of the deacon side''s care tables has a notes column');

-- 11a. Staff compose a request, in their own name, and keep their own thread.

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
insert into care_request (id, household_label, help_kind, needed_by, requested_by) values
  ('a1000000-0000-0000-0000-000000000001', 'The Hendersons', 'visit', current_date + 7, 'b0000000-0000-0000-0000-000000000001');
insert into care_request_link (care_request_id, care_entry_id) values
  ('a1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001');
select test.assert((select count(*) from care_request) = 1,      'staff: composes a request and reads it back');
select test.assert((select count(*) from care_request_link) = 1, 'staff: keeps the thread to their own care entry');
select test.refused(
  $q$ insert into care_request (household_label, help_kind, requested_by) values ('Someone', 'call', 'b0000000-0000-0000-0000-000000000003') $q$,
  '42501', 'staff: cannot compose a request in someone else''s name');
select test.refused(
  $q$ insert into care_request (household_label, help_kind, requested_by, status) values ('Someone', 'call', 'b0000000-0000-0000-0000-000000000001', 'done') $q$,
  '42501', 'staff: cannot compose a request already done — the policy admits only an open, unassigned one');
select test.refused(
  $q$ update care_request set status = 'accepted' where id = 'a1000000-0000-0000-0000-000000000001' $q$,
  'P0001', 'staff: cannot act on a request — only the Board does');
update care_request set needed_by = current_date + 5 where id = 'a1000000-0000-0000-0000-000000000001';
select test.assert((select needed_by from care_request where id = 'a1000000-0000-0000-0000-000000000001') = current_date + 5,
  'staff: may correct what was asked while it is open');
select test.assert((select count(*) from care_assignment) = 0, 'staff: reads ZERO care assignments — the deacon plan is the Board''s');
select test.assert((select count(*) from deacon_visit) = 0,    'staff: reads zero visits');
reset role;

-- 11b. A deacon: sees the request, not the thread; acts on it; cannot rewrite it.

select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;
select test.assert((select count(*) from care_request) = 1,      'deacon A: reads the request');
select test.assert((select count(*) from care_request_link) = 0, 'deacon A: reads ZERO rows of the link to the staff care entry');
select test.assert((select count(*) from care_entry) = 0,        'deacon A: still reads ZERO care entries');
select test.refused(
  $q$ insert into care_request (household_label, help_kind, requested_by) values ('Someone', 'call', 'b0000000-0000-0000-0000-000000000009') $q$,
  '42501', 'deacon A: cannot compose a request — the push runs one way');
select test.refused(
  $q$ insert into care_request_link (care_request_id, care_entry_id) values ('a1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001') $q$,
  '42501', 'deacon A: cannot write a link to a care entry');
select test.refused(
  $q$ update care_request set household_label = 'Rewritten' where id = 'a1000000-0000-0000-0000-000000000001' $q$,
  'P0001', 'deacon A: cannot rewrite what was asked');
select test.refused(
  $q$ update care_request set requested_by = 'b0000000-0000-0000-0000-000000000009' where id = 'a1000000-0000-0000-0000-000000000001' $q$,
  'P0001', 'deacon A: cannot rewrite who asked');
update care_request set status = 'accepted', assigned_to = 'b0000000-0000-0000-0000-000000000009' where id = 'a1000000-0000-0000-0000-000000000001';
select test.assert((select status from care_request where id = 'a1000000-0000-0000-0000-000000000001') = 'accepted', 'deacon A: takes the request up');
select test.refused(
  $q$ update care_request set status = 'done' where id = 'a1000000-0000-0000-0000-000000000001' $q$,
  '23514', 'deacon A: done without a date is refused');
update care_request set status = 'done', completed_on = current_date where id = 'a1000000-0000-0000-0000-000000000001';
select test.refused(
  $q$ update care_request set status = 'open', completed_on = null where id = 'a1000000-0000-0000-0000-000000000001' $q$,
  'P0001', 'deacon A: a request marked done stays done');

insert into care_assignment (id, household_label, assigned_to, created_by) values
  ('a2000000-0000-0000-0000-000000000001', 'The Whitfields', 'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000009');
update care_assignment set last_contact_on = current_date where id = 'a2000000-0000-0000-0000-000000000001';
select test.assert((select last_contact_on from care_assignment where id = 'a2000000-0000-0000-0000-000000000001') = current_date, 'deacon A: records a contact as a date');
select test.refused(
  $q$ insert into care_assignment (household_label, assigned_to, created_by) values ('Someone', 'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010') $q$,
  '42501', 'deacon A: cannot assign in another man''s name');

insert into deacon_week (id, week_of, person_id, backup_person_id, created_by) values
  ('a3000000-0000-0000-0000-000000000001', date_trunc('week', current_date)::date - 1, 'b0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000009');
select test.refused(
  $q$ insert into deacon_week (week_of, person_id, created_by) values (date_trunc('week', current_date)::date, 'b0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000009') $q$,
  '23514', 'deacon A: a week is named by its Sunday');
insert into deacon_visit (deacon_week_id, household_label, kind, person_id) values
  ('a3000000-0000-0000-0000-000000000001', 'The Whitfields', 'call', 'b0000000-0000-0000-0000-000000000009');
select test.refused(
  $q$ insert into deacon_visit (deacon_week_id, household_label, person_id) values ('a3000000-0000-0000-0000-000000000001', 'Someone', 'b0000000-0000-0000-0000-000000000010') $q$,
  '42501', 'deacon A: cannot log a visit as another man');
select test.assert((select count(*) from deacon_visit) = 1, 'deacon A: reads the visit log');
-- No delete policies: the statements touch nothing.
delete from care_request; delete from care_assignment; delete from deacon_week; delete from deacon_visit;
reset role;
select test.assert((select count(*) from care_request) + (select count(*) from care_assignment) + (select count(*) from deacon_week) + (select count(*) from deacon_visit) = 4,
  'deacon A: deletes nothing — nothing on the deacon side is deleted');

-- 11c. The loop closes for the staff member who asked: done, on this date, by this man.

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.assert(
  (select status = 'done' and completed_on = current_date and assigned_to = 'b0000000-0000-0000-0000-000000000009' from care_request where id = 'a1000000-0000-0000-0000-000000000001'),
  'staff: sees the request done, dated, and by whom — and nothing else');
select test.assert((select count(*) from deacon_week) = 1, 'staff: reads who the Deacon of the Week is');
reset role;

-- 11d. Everyone else: nothing.

select test.sign_in('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test');
set role authenticated;
select test.assert((select count(*) from care_request) = 0,      'limited: reads ZERO care requests');
select test.assert((select count(*) from care_request_link) = 0, 'limited: reads zero links');
select test.assert((select count(*) from care_assignment) = 0,   'limited: reads zero assignments');
select test.assert((select count(*) from deacon_week) = 1,       'limited: may read who is on call');
reset role;

select test.sign_in('a0000000-0000-0000-0000-000000000011', 'grounds@memorial.test');
set role authenticated;
select test.assert((select count(*) from care_request) = 0,    'grounds chair: reads ZERO care requests — a committee seat is not the Board');
select test.assert((select count(*) from care_assignment) = 0, 'grounds chair: reads zero assignments');
select test.assert((select count(*) from deacon_visit) = 0,    'grounds chair: reads zero visits');
reset role;

select test.sign_out();
set role anon;
select test.assert((select count(*) from care_request) = 0,    'signed out: no requests');
select test.assert((select count(*) from care_assignment) = 0, 'signed out: no assignments');
select test.assert((select count(*) from deacon_week) = 0,     'signed out: no rotation');
reset role;

-- ------------------------------------------- 12. ministries and serving groups (0017, 0018)
--
-- Who serves, never who attends. The whole staff body reads the directory,
-- the staff role writes it, nobody deletes from it, and no table in it has a
-- column that could hold an attendee. 0018 makes a ministry name that is not
-- in the table a refused write on the four columns that carry one.

reset role;

-- The structural rule first: no attendee, roster, enrolment, member or
-- headcount column, on the pattern 0010's test uses for a notes column.
select test.assert(
  not exists (select 1 from information_schema.columns
               where table_schema = 'public'
                 and table_name in ('ministry', 'serving_role', 'serving_group', 'serving_assignment')
                 and (column_name ilike '%attend%' or column_name ilike '%roster%' or column_name ilike '%enrol%'
                      or column_name ilike '%member%' or column_name ilike '%headcount%' or column_name ilike '%student%')),
  'groups: no table in the directory has an attendee, roster, enrolment, member or headcount column');
select test.assert(
  not exists (select 1 from information_schema.tables where table_schema = 'public' and (table_name ilike '%attend%' and table_name <> 'meeting_attendance')),
  'groups: there is no attendance table for a group — the one attendance table is the Board''s roll');
select test.assert(
  (select count(*) from pg_policies where tablename in ('ministry', 'serving_role', 'serving_group', 'serving_assignment') and cmd = 'DELETE') = 0,
  'groups: no delete policy on any of the four tables');
select test.assert(
  (select count(*) from pg_policies where tablename = 'serving_role' and cmd <> 'SELECT') = 0,
  'groups: the roles are enumerated by migration, not written through the API');
select test.assert((select count(*) from ministry where name in ('All', 'Children', 'Students', 'Men', 'Women', 'Music', 'All groups')) = 7,
  'ministries: every string the ledger already used is seeded, so 0018 holds and no data moves');
select test.assert((select count(*) from ministry where directory) = 7 and (select count(*) from ministry where not directory) = 2,
  'ministries: All and All groups exist for the foreign key and are not listed in the directory');

-- 12a. Signed out: nothing.

set role anon;
select test.assert((select count(*) from ministry) = 0,           'signed out: no ministries');
select test.assert((select count(*) from serving_group) = 0,      'signed out: no groups');
select test.assert((select count(*) from serving_assignment) = 0, 'signed out: no assignments');
reset role;

-- 12b. The staff role: writes a group and an assignment, in its own name or anyone's.

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.assert((select count(*) from ministry) = 9, 'staff: reads the ministries');
select test.assert((select count(*) from serving_role) = 8, 'staff: reads the eight roles');
insert into serving_group (id, ministry_id, kind, name, meets, location, audience_note)
  values ('a4000000-0000-0000-0000-000000000001', (select id from ministry where slug = 'children'), 'class', 'Sunday Morning · Grades 1–6', 'Sundays 9:15 AM', 'Hall A', 'Grades 1–6');
insert into serving_assignment (id, group_id, person_id, role_slug, is_primary)
  values ('a5000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'teacher', true);
select test.assert((select count(*) from serving_group) = 1 and (select count(*) from serving_assignment) = 1, 'staff: adds a class and names its teacher');
select test.refused(
  $q$ insert into serving_assignment (group_id, person_id, role_slug) values ('a4000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'discussion-leader') $q$,
  '23503', 'staff: a role outside the enumerated list is refused');
select test.refused(
  $q$ insert into serving_group (ministry_id, kind, name) values ((select id from ministry where slug = 'children'), 'club', 'A club') $q$,
  '23514', 'staff: a kind outside class, community group and team is refused');
update serving_assignment set ended_on = current_date where id = 'a5000000-0000-0000-0000-000000000001';
select test.assert((select ended_on from serving_assignment where id = 'a5000000-0000-0000-0000-000000000001') = current_date, 'staff: ends an assignment with a date');
delete from serving_assignment;
delete from serving_group;
select test.assert((select count(*) from serving_assignment) = 1 and (select count(*) from serving_group) = 1, 'staff: deletes nothing — an ended assignment is a fact about last spring');
update ministry set description = 'Rewritten' where slug = 'children';
select test.assert((select description from ministry where slug = 'children') = 'Rewritten', 'staff: edits what a ministry says about itself');
select test.refused(
  $q$ update person set admin = true where id = 'b0000000-0000-0000-0000-000000000001' $q$,
  'P0001', 'staff: cannot make themselves an administrator through the site');
select test.refused(
  $q$ update person set admin = true where id = 'b0000000-0000-0000-0000-000000000003' $q$,
  'P0001', 'staff: cannot make a colleague an administrator through the site either — the flag is the administrator''s, by SQL');
reset role;

-- 12c. A limited account reads the directory and writes nothing to it.

select test.sign_in('a0000000-0000-0000-0000-000000000002', 'limited@memorial.test');
set role authenticated;
select test.assert((select count(*) from serving_group) = 1,      'limited: reads the directory');
select test.assert((select count(*) from serving_assignment) = 1, 'limited: reads who serves');
select test.refused(
  $q$ insert into serving_group (ministry_id, kind, name) values ((select id from ministry where slug = 'children'), 'team', 'Mine') $q$,
  '42501', 'limited: cannot add a group');
update serving_group set name = 'Renamed' where id = 'a4000000-0000-0000-0000-000000000001';
reset role;
select test.assert((select name from serving_group where id = 'a4000000-0000-0000-0000-000000000001') like 'Sunday Morning%', 'limited: an update aimed at a group changed nothing');

-- 12d. A deacon: nothing of the directory — it is the staff side's in v1.

select test.sign_in('a0000000-0000-0000-0000-000000000009', 'deacon-a@memorial.test');
set role authenticated;
select test.assert((select count(*) from ministry) = 0,           'deacon A: reads zero ministries');
select test.assert((select count(*) from serving_group) = 0,      'deacon A: reads ZERO groups');
select test.assert((select count(*) from serving_assignment) = 0, 'deacon A: reads zero assignments');
reset role;

-- 12e. 0018: a ministry name not in the table is refused on the four columns.

select test.sign_in('a0000000-0000-0000-0000-000000000001', 'staff@memorial.test');
set role authenticated;
select test.refused(
  $q$ insert into cadence_item (name, ministry, interval_count, interval_label, notice_days) values ('Made up', 'Recreation', 1, 'Monthly', 0) $q$,
  '23503', 'ledger: a ministry name not in ministry is refused on cadence');
select test.refused(
  $q$ insert into event (name, ministry, starts_at, audience) values ('Made up', 'Recreation', current_date, '{staff}') $q$,
  '23503', 'calendar: a ministry name not in ministry is refused on event');
select test.refused(
  $q$ insert into notice_entry (subject, ministry, category, decided_on) values ('Made up', 'Recreation', 'Schedule change', current_date) $q$,
  '23503', 'notice log: a ministry name not in ministry is refused on notice_entry');
select test.refused(
  $q$ insert into goal (title, ministry, target, status, year) values ('Made up', 'Recreation', '', 'on track', 2026) $q$,
  '23503', 'goals: a ministry name not in ministry is refused on goal');
insert into cadence_item (name, ministry, interval_count, interval_label, notice_days) values ('Preschool teacher training', 'Preschool', 12, 'Annually', 21);
select test.assert((select count(*) from cadence_item where ministry = 'Preschool') = 1, 'ledger: a ministry added to the table is usable without a deploy');
reset role;

-- A rename cascades: the rows follow the name.
update ministry set name = 'Pre-school' where slug = 'preschool';
select test.assert((select count(*) from cadence_item where ministry = 'Pre-school') = 1, 'ministries: renaming a ministry moves the rows that carry its name');
update ministry set name = 'Preschool' where slug = 'preschool';
