-- Role-based page access and automatic membership provisioning for whitelisted users

alter table public.discord_login_allowlist
  add column access_role public.app_role not null default 'viewer',
  add column kingdom_id uuid references public.kingdoms(id) on delete cascade,
  add column alliance_id uuid references public.alliances(id) on delete set null;

-- Preserve the roles and alliance scope of users who already have memberships.
update public.discord_login_allowlist allowlist
set
  access_role = existing.role,
  kingdom_id = existing.kingdom_id,
  alliance_id = case when existing.role = 'alliance_lead' then existing.alliance_id else null end
from (
  select distinct on (profile.discord_user_id)
    profile.discord_user_id,
    membership.role,
    membership.kingdom_id,
    membership.alliance_id
  from public.profiles profile
  join public.memberships membership on membership.user_id = profile.id
  where profile.discord_user_id is not null
    and membership.is_active
  order by
    profile.discord_user_id,
    case membership.role
      when 'event_director' then 1
      when 'council' then 2
      when 'alliance_lead' then 3
      else 4
    end
) existing
where allowlist.discord_user_id = existing.discord_user_id;

-- Legacy entries created before roles were stored inherit their creator's kingdom.
update public.discord_login_allowlist allowlist
set kingdom_id = membership.kingdom_id
from public.memberships membership
where allowlist.kingdom_id is null
  and membership.user_id = allowlist.created_by
  and membership.is_active;

alter table public.discord_login_allowlist
  add constraint discord_allowlist_alliance_role_check check (
    (access_role = 'alliance_lead' and alliance_id is not null)
    or (access_role <> 'alliance_lead' and alliance_id is null)
  );

create or replace function public.provision_current_user_access()
returns public.app_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_entry record;
  existing_membership record;
  resolved_role public.app_role;
begin
  -- Preserve the original first-director bootstrap while the allowlist is empty.
  if not exists (select 1 from public.discord_login_allowlist where is_active) then
    select role into resolved_role
    from public.memberships
    where user_id = auth.uid()
      and is_active
    order by case role
      when 'event_director' then 1
      when 'council' then 2
      when 'alliance_lead' then 3
      else 4
    end
    limit 1;
    return resolved_role;
  end if;

  select access_role, kingdom_id, alliance_id
  into access_entry
  from public.discord_login_allowlist
  where discord_user_id = public.current_discord_user_id()
    and is_active;

  if not found or access_entry.kingdom_id is null then
    return null;
  end if;

  select role, alliance_id, is_active
  into existing_membership
  from public.memberships
  where user_id = auth.uid()
    and kingdom_id = access_entry.kingdom_id;

  -- Never allow a stale whitelist value to downgrade an Event Director.
  if found and existing_membership.role = 'event_director' then
    return existing_membership.role;
  end if;

  if found
    and existing_membership.role = access_entry.access_role
    and existing_membership.alliance_id is not distinct from access_entry.alliance_id
    and existing_membership.is_active
  then
    return existing_membership.role;
  end if;

  insert into public.memberships (
    user_id,
    kingdom_id,
    alliance_id,
    role,
    is_active
  )
  values (
    auth.uid(),
    access_entry.kingdom_id,
    case when access_entry.access_role = 'alliance_lead' then access_entry.alliance_id else null end,
    access_entry.access_role,
    true
  )
  on conflict (user_id, kingdom_id) do update
  set
    alliance_id = excluded.alliance_id,
    role = excluded.role,
    is_active = true
  returning role into resolved_role;

  return resolved_role;
end;
$$;

revoke all on function public.provision_current_user_access() from public;
grant execute on function public.provision_current_user_access() to authenticated;

-- Only Event Directors may import or replace activity data. Leadership retains read access.
drop policy if exists "leadership manages activity imports" on public.activity_imports;
create policy "directors manage activity imports"
on public.activity_imports for all
using (
  public.has_kingdom_role(kingdom_id, array['event_director']::public.app_role[])
)
with check (
  created_by = auth.uid()
  and public.has_kingdom_role(kingdom_id, array['event_director']::public.app_role[])
);

drop policy if exists "leadership manages activity member scores" on public.activity_member_scores;
create policy "directors manage activity member scores"
on public.activity_member_scores for all
using (
  exists (
    select 1 from public.activity_imports activity_import
    where activity_import.id = activity_member_scores.import_id
      and public.has_kingdom_role(activity_import.kingdom_id, array['event_director']::public.app_role[])
  )
)
with check (
  exists (
    select 1 from public.activity_imports activity_import
    where activity_import.id = activity_member_scores.import_id
      and public.has_kingdom_role(activity_import.kingdom_id, array['event_director']::public.app_role[])
  )
);
