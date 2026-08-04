-- Discord login allowlist with a safe first-user bootstrap

create table public.discord_login_allowlist (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null unique check (discord_user_id ~ '^[0-9]{5,30}$'),
  display_name text,
  note text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger discord_login_allowlist_set_updated_at
before update on public.discord_login_allowlist
for each row execute function public.set_updated_at();

create or replace function public.current_discord_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.discord_user_id from public.profiles p where p.id = auth.uid()),
    auth.jwt() -> 'user_metadata' ->> 'provider_id',
    auth.jwt() -> 'user_metadata' ->> 'sub'
  );
$$;

create or replace function public.is_discord_login_allowed(candidate_discord_user_id text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1 from public.discord_login_allowlist where is_active
    )
    or exists (
      select 1
      from public.discord_login_allowlist
      where is_active
        and discord_user_id = coalesce(candidate_discord_user_id, public.current_discord_user_id())
    );
$$;

create or replace function public.current_user_is_event_director()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_discord_login_allowed()
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'event_director'
        and m.is_active
    );
$$;

-- Require an active allowlist entry anywhere role-based access is evaluated.
create or replace function public.has_kingdom_role(
  target_kingdom uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_discord_login_allowed()
    and exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.kingdom_id = target_kingdom
        and m.is_active
        and m.role = any(allowed_roles)
    );
$$;

create or replace function public.can_view_event(target public.events)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_discord_login_allowed()
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.kingdom_id = target.kingdom_id
        and m.is_active
        and (
          m.role in ('event_director', 'council')
          or target.status in ('approved', 'published', 'active', 'completed', 'archived')
          or (target.scope = 'alliance' and m.alliance_id = target.alliance_id)
        )
    );
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
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.kingdom_id = target.kingdom_id
        and m.is_active
        and (
          m.role = 'event_director'
          or (m.role = 'council' and target.scope = 'kingdom')
          or (m.role = 'alliance_lead' and target.scope = 'alliance' and m.alliance_id = target.alliance_id)
        )
    );
$$;

alter table public.discord_login_allowlist enable row level security;

create policy "directors view Discord login allowlist"
on public.discord_login_allowlist for select
using (public.current_user_is_event_director());

create policy "directors insert Discord login allowlist"
on public.discord_login_allowlist for insert
with check (public.current_user_is_event_director() and created_by = auth.uid());

create policy "directors update Discord login allowlist"
on public.discord_login_allowlist for update
using (public.current_user_is_event_director())
with check (public.current_user_is_event_director());

create policy "directors delete Discord login allowlist"
on public.discord_login_allowlist for delete
using (public.current_user_is_event_director());

revoke all on function public.current_discord_user_id() from public;
revoke all on function public.is_discord_login_allowed(text) from public;
revoke all on function public.current_user_is_event_director() from public;
grant execute on function public.current_discord_user_id() to authenticated;
grant execute on function public.is_discord_login_allowed(text) to authenticated;
grant execute on function public.current_user_is_event_director() to authenticated;
grant select, insert, update, delete on public.discord_login_allowlist to authenticated;
