-- The chairman's editor follows the same confidentiality boundary as direct
-- membership reads. A confidential committee can be managed through the
-- editor only when the chairman is himself a current member of that room.

create or replace function chairman_roster()
returns table (
  person_id uuid,
  person_name text,
  person_role text,
  person_email text,
  person_access text,
  seats jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_chair_of('deacon-board') then
    raise exception 'Only the Board chairman may manage seats' using errcode = '42501';
  end if;

  return query
  select p.id,
         p.name,
         p.role,
         coalesce(p.email::text, ''),
         p.access::text,
         coalesce(
           jsonb_agg(
             jsonb_build_object(
               'slug', b.slug,
               'name', b.name,
               'role', m.role_in_body::text,
               'termStart', m.term_start,
               'termEnd', m.term_end
             ) order by b.slug
           ) filter (where b.id is not null),
           '[]'::jsonb
         )
    from person p
    left join membership m
      on m.person_id = p.id
     and m.active
    left join body b
      on b.id = m.body_id
     and (
       b.slug = 'deacon-board'
       or (
         b.parent_body_id = (select id from body where slug = 'deacon-board')
         and (not b.confidential or is_member_of(b.slug))
       )
     )
   where p.active
   group by p.id, p.name, p.role, p.email, p.access
   order by p.name;
end;
$$;

create or replace function set_managed_membership(
  target_person_id uuid,
  target_body_slug text,
  target_role body_role,
  target_term_start date,
  target_term_end date,
  target_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_body_id uuid;
  existing_membership_id uuid;
begin
  if not is_chair_of('deacon-board') then
    raise exception 'Only the Board chairman may manage seats' using errcode = '42501';
  end if;

  if target_term_end is not null
     and target_term_start is not null
     and target_term_end < target_term_start then
    raise exception 'The term end must not be before the term start' using errcode = '22007';
  end if;

  select b.id into target_body_id
    from body b
   where b.slug = target_body_slug
     and b.active
     and (
       b.slug = 'deacon-board'
       or (
         b.parent_body_id = (select id from body where slug = 'deacon-board')
         and (not b.confidential or is_member_of(b.slug))
       )
     );

  if target_body_id is null then
    raise exception 'That body is not managed by the Board chairman' using errcode = '22023';
  end if;

  if not exists (select 1 from person where id = target_person_id and active) then
    raise exception 'That person is not active on the roster' using errcode = '22023';
  end if;

  if target_person_id = current_person_id()
     and target_body_slug = 'deacon-board'
     and (not target_active or target_role <> 'chair') then
    raise exception 'The chairman cannot remove or demote his own active chair seat' using errcode = '42501';
  end if;

  select m.id into existing_membership_id
    from membership m
   where m.person_id = target_person_id
     and m.body_id = target_body_id
     and m.active
   limit 1;

  if target_active then
    if existing_membership_id is null then
      insert into membership (person_id, body_id, role_in_body, term_start, term_end)
      values (target_person_id, target_body_id, target_role, target_term_start, target_term_end);
    else
      update membership
         set role_in_body = target_role,
             term_start = target_term_start,
             term_end = target_term_end
       where id = existing_membership_id;
    end if;
  elsif existing_membership_id is not null then
    update membership
       set active = false,
           term_end = case
             when term_start is not null and term_start > current_date then term_end
             when term_end is null or term_end > current_date then current_date
             else term_end
           end
     where id = existing_membership_id;
  end if;
end;
$$;

revoke all on function chairman_roster() from public;
revoke all on function set_managed_membership(uuid, text, body_role, date, date, boolean) from public;
grant execute on function chairman_roster() to authenticated;
grant execute on function set_managed_membership(uuid, text, body_role, date, date, boolean) to authenticated;
