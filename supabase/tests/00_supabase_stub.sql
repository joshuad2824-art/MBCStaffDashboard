-- The slice of a Supabase project that the migrations lean on, rebuilt on a
-- plain PostgreSQL so the policies can be exercised in CI.
--
-- Nothing here is invented. Each definition mirrors what Supabase itself
-- installs: the three API roles, the `auth` schema with `users`, and the two
-- functions the policies call — auth.uid() and auth.jwt() — reading the same
-- `request.jwt.claims` setting PostgREST sets from a verified token. The
-- default privileges are the ones Supabase grants on the public schema, which
-- is why a policy is the only thing standing between a role and a row.
--
-- Run before the migrations, once, on an empty database. See run.sh.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- 0001 creates pgcrypto itself. citext it uses without creating: a Supabase
-- project has the extension available and the applied history shows it was
-- enabled there, so the stub enables it here the same way.
create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key,
  email text
);

-- Supabase's own definitions, verbatim in effect: the sub claim, or nothing.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;

-- What Supabase grants on everything created in public. With these in place a
-- table with no policy is wide open, so every table has to earn its gate.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
