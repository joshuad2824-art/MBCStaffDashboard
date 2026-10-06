-- Activation request counters contain keyed hashes, not email addresses or IPs.
-- Only the server function may consume them. Existing person/membership policies stay intact.
create table public.activation_request_limit (
  key text primary key,
  window_start timestamptz not null default now(),
  last_request timestamptz not null default now(),
  requests integer not null default 1 check (requests > 0)
);
alter table public.activation_request_limit enable row level security;
revoke all on public.activation_request_limit from public, anon, authenticated;
grant select, insert, update, delete on public.activation_request_limit to service_role;

create function public.consume_activation_request(email_key text, network_key text) returns boolean
language plpgsql security invoker set search_path = public as $$
declare
  k text;
  allowed integer;
  row public.activation_request_limit;
  stamp timestamptz := now();
begin
  if email_key is null or network_key is null or email_key !~ '^[0-9a-f]{64}$' or network_key !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  -- Global first serializes the small approval roster and avoids lock ordering races.
  perform pg_advisory_xact_lock(hashtextextended('mbc.activation.global', 0));
  delete from public.activation_request_limit where window_start < stamp - interval '1 day';
  foreach k in array array['global', 'network:' || network_key, 'email:' || email_key] loop
    allowed := case when k = 'global' then 120 when k like 'network:%' then 30 else 5 end;
    select * into row from public.activation_request_limit where key = k;
    if found and row.window_start > stamp - interval '1 hour' then
      if row.requests >= allowed or (k like 'email:%' and row.last_request > stamp - interval '60 seconds') then
        return false;
      end if;
    end if;
  end loop;
  foreach k in array array['global', 'network:' || network_key, 'email:' || email_key] loop
    insert into public.activation_request_limit as existing (key, window_start, last_request, requests)
    values (k, stamp, stamp, 1)
    on conflict (key) do update set
      requests = case when existing.window_start <= stamp - interval '1 hour' then 1 else existing.requests + 1 end,
      window_start = case when existing.window_start <= stamp - interval '1 hour' then stamp else existing.window_start end,
      last_request = stamp;
  end loop;
  return true;
end;
$$;
revoke execute on function public.consume_activation_request(text, text) from public, anon, authenticated;
grant execute on function public.consume_activation_request(text, text) to service_role;
