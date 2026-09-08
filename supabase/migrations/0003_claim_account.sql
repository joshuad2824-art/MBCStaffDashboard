-- Claiming an account.
--
-- 0002 has a chicken and an egg in it, and it is the reason an invited person
-- can open their link, authenticate perfectly well, and still be shown the door.
--
-- Every read of `person` goes through is_signed_in(), which asks whether some
-- row already carries this auth.uid(). On somebody's first sign-in none does,
-- so they read nothing. They cannot write the link themselves either:
-- person_update_self looks for the same auth_id that is not there yet, and
-- person_no_self_escalation refuses the change besides. The roster says who
-- they are and the policies cannot be told.
--
-- This file is the missing half. One security definer function matches the
-- address Supabase verified on the token against the address on the roster and
-- writes the link. It is the only way a row is ever claimed, and it hands out
-- nothing: `access` is whatever staff already set, an inactive row is refused,
-- and a roster-only person — a deacon, a volunteer, anyone at 'none' — stays
-- shut out exactly as before. Being on the roster is still not a way in.

create or replace function claim_account()
returns table (id uuid, name text, role text, email text, access access_level)
language plpgsql
security definer
set search_path = public
as $$
declare
  addr citext;
begin
  if auth.uid() is null then
    return;
  end if;

  -- The address Supabase verified when the link was opened, off the token.
  -- Nobody typed this into a form on the way here.
  addr := nullif(auth.jwt() ->> 'email', '');

  -- First sign-in writes the link. Later ones match nothing and cost a no-op.
  -- An address that is not on the roster matches nothing either, which is the
  -- whole gate: authenticating is not the same as being on staff.
  update person p
     set auth_id = auth.uid()
   where p.auth_id is null
     and p.email = addr
     and p.active
     and p.access <> 'none';

  return query
    select p.id, p.name, p.role, p.email::text, p.access
      from person p
     where p.auth_id = auth.uid()
       and p.active
       and p.access <> 'none';
end;
$$;

-- Signed in and nothing else. A visitor with no token gets no chance to probe
-- the roster one address at a time.
revoke execute on function claim_account() from public;
revoke execute on function claim_account() from anon;
grant execute on function claim_account() to authenticated;

-- The self-escalation guard from 0002, with the claim allowed through.
--
-- Claiming an unclaimed row is not escalation: the address on it had to match
-- the address on the verified token, and `access` does not move. Everything
-- else the guard refused, it still refuses — you cannot widen your own reach,
-- and you cannot move your auth_id onto a row that somebody already holds.
create or replace function guard_own_access() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.auth_id is null
     and new.auth_id = auth.uid()
     and new.access is not distinct from old.access
  then
    return new;
  end if;

  if new.auth_id is not distinct from auth.uid()
     and (new.access is distinct from old.access or new.auth_id is distinct from old.auth_id)
  then
    raise exception 'You cannot change your own access.';
  end if;

  return new;
end;
$$;
