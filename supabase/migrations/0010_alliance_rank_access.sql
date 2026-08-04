-- Apply alliance-scoped access to the R4 and R5 roles.

alter table public.discord_login_allowlist
  drop constraint if exists discord_allowlist_alliance_role_check;

alter table public.discord_login_allowlist
  add constraint discord_allowlist_alliance_role_check check (
    (access_role in ('alliance_lead', 'alliance_r4', 'alliance_r5') and alliance_id is not null)
    or (access_role not in ('alliance_lead', 'alliance_r4', 'alliance_r5') and alliance_id is null)
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
  if not exists (select 1 from public.discord_login_allowlist where is_active) then
    select role into resolved_role
    from public.memberships
    where user_id = auth.uid()
      and is_active
    order by case role
      when 'event_director' then 1
      when 'council' then 2
      when 'alliance_r5' then 3
      when 'alliance_r4' then 4
      when 'alliance_lead' then 5
      else 6
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
    case
      when access_entry.access_role in ('alliance_lead', 'alliance_r4', 'alliance_r5')
        then access_entry.alliance_id
      else null
    end,
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

create or replace function public.can_manage_event(target public.events)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_discord_login_allowed()
    and exists (
      select 1 from public.memberships membership
      where membership.user_id = auth.uid()
        and membership.kingdom_id = target.kingdom_id
        and membership.is_active
        and (
          membership.role = 'event_director'
          or (membership.role = 'council' and target.scope = 'kingdom')
          or (
            membership.role in ('alliance_lead', 'alliance_r4', 'alliance_r5')
            and target.scope = 'alliance'
            and membership.alliance_id = target.alliance_id
          )
        )
    );
$$;

drop policy if exists "members view their kingdoms" on public.kingdoms;
create policy "members view their kingdoms"
on public.kingdoms for select
using (
  public.has_kingdom_role(id, array['event_director','council','alliance_lead','alliance_r4','alliance_r5','viewer']::public.app_role[])
);

drop policy if exists "members view alliances in their kingdom" on public.alliances;
create policy "members view alliances in their kingdom"
on public.alliances for select
using (
  public.has_kingdom_role(kingdom_id, array['event_director','council','alliance_lead','alliance_r4','alliance_r5','viewer']::public.app_role[])
);

drop policy if exists "members view templates" on public.event_templates;
create policy "members view templates"
on public.event_templates for select
using (
  kingdom_id is null
  or public.has_kingdom_role(kingdom_id, array['event_director','council','alliance_lead','alliance_r4','alliance_r5','viewer']::public.app_role[])
);

drop policy if exists "event leadership inserts events" on public.events;
create policy "event leadership inserts events"
on public.events for insert
with check (
  created_by = auth.uid()
  and (
    public.has_kingdom_role(kingdom_id, array['event_director']::public.app_role[])
    or (
      scope = 'kingdom'
      and public.has_kingdom_role(kingdom_id, array['council']::public.app_role[])
    )
    or (
      scope = 'alliance'
      and exists (
        select 1 from public.memberships membership
        where membership.user_id = auth.uid()
          and membership.kingdom_id = events.kingdom_id
          and membership.alliance_id = events.alliance_id
          and membership.role in ('alliance_lead', 'alliance_r4', 'alliance_r5')
          and membership.is_active
      )
    )
  )
);

drop policy if exists "alliance leads update own confirmation" on public.alliance_confirmations;
create policy "alliance leads update own confirmation"
on public.alliance_confirmations for update
using (
  exists (
    select 1 from public.memberships membership
    where membership.user_id = auth.uid()
      and membership.alliance_id = alliance_confirmations.alliance_id
      and membership.role in ('event_director', 'alliance_lead', 'alliance_r4', 'alliance_r5')
      and membership.is_active
  )
);

drop policy if exists "leadership views activity imports" on public.activity_imports;
create policy "leadership views activity imports"
on public.activity_imports for select
using (
  public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
  or exists (
    select 1 from public.memberships membership
    where membership.user_id = auth.uid()
      and membership.kingdom_id = activity_imports.kingdom_id
      and membership.alliance_id = activity_imports.alliance_id
      and membership.role in ('alliance_lead', 'alliance_r4', 'alliance_r5')
      and membership.is_active
  )
);

drop policy if exists "leadership views activity member scores" on public.activity_member_scores;
create policy "leadership views activity member scores"
on public.activity_member_scores for select
using (
  exists (
    select 1 from public.activity_imports activity_import
    where activity_import.id = activity_member_scores.import_id
      and (
        public.has_kingdom_role(activity_import.kingdom_id, array['event_director','council']::public.app_role[])
        or exists (
          select 1 from public.memberships membership
          where membership.user_id = auth.uid()
            and membership.kingdom_id = activity_import.kingdom_id
            and membership.alliance_id = activity_import.alliance_id
            and membership.role in ('alliance_lead', 'alliance_r4', 'alliance_r5')
            and membership.is_active
        )
      )
  )
);
