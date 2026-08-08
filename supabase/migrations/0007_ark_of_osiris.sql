-- Ark of Osiris planning, team assignment, and Hero Scrolls roster provenance

create table public.ark_cycles (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  source_import_id uuid references public.activity_imports(id) on delete set null,
  ark_date date not null,
  title text not null default 'Ark of Osiris',
  status text not null default 'planning' check (status in ('planning', 'locked', 'completed', 'archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alliance_id, ark_date)
);

create index ark_cycles_alliance_date_idx on public.ark_cycles (alliance_id, ark_date desc);

create table public.ark_teams (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.ark_cycles(id) on delete cascade,
  team_number smallint not null check (team_number between 1 and 3),
  battle_time timestamptz,
  check_in_minutes smallint not null default 30 check (check_in_minutes between 0 and 120),
  captain_governor_id text,
  notes text,
  unique (cycle_id, team_number)
);

create table public.ark_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.ark_teams(id) on delete cascade,
  governor_id text not null,
  governor_name text not null,
  activity_rank integer,
  activity_score numeric(7,3),
  role text not null default 'field' check (role in ('captain', 'rally', 'garrison', 'field', 'ark_runner', 'flex')),
  battlefield_group text not null default 'flex' check (battlefield_group in ('top', 'bottom', 'center', 'flex')),
  confirmed boolean not null default false,
  notes text,
  unique (team_id, governor_id)
);

create index ark_assignments_team_idx on public.ark_assignments (team_id);
create index ark_assignments_governor_idx on public.ark_assignments (governor_id);

alter table public.ark_cycles enable row level security;
alter table public.ark_teams enable row level security;
alter table public.ark_assignments enable row level security;

create policy "leadership views ark cycles"
on public.ark_cycles for select
using (
  public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
  or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.kingdom_id = ark_cycles.kingdom_id
      and m.alliance_id = ark_cycles.alliance_id
      and m.role in ('alliance_lead','alliance_r4','alliance_r5')
      and m.is_active
  )
);

create policy "leadership manages ark cycles"
on public.ark_cycles for all
using (
  public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
  or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.kingdom_id = ark_cycles.kingdom_id
      and m.alliance_id = ark_cycles.alliance_id
      and m.role in ('alliance_lead','alliance_r4','alliance_r5')
      and m.is_active
  )
)
with check (
  created_by = auth.uid()
  and (
    public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.kingdom_id = ark_cycles.kingdom_id
        and m.alliance_id = ark_cycles.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5')
        and m.is_active
    )
  )
);

create policy "leadership views ark teams"
on public.ark_teams for select
using (exists (
  select 1 from public.ark_cycles c where c.id = ark_teams.cycle_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
));

create policy "leadership manages ark teams"
on public.ark_teams for all
using (exists (
  select 1 from public.ark_cycles c where c.id = ark_teams.cycle_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
))
with check (exists (
  select 1 from public.ark_cycles c where c.id = ark_teams.cycle_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
));

create policy "leadership views ark assignments"
on public.ark_assignments for select
using (exists (
  select 1 from public.ark_teams t
  join public.ark_cycles c on c.id = t.cycle_id
  where t.id = ark_assignments.team_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
));

create policy "leadership manages ark assignments"
on public.ark_assignments for all
using (exists (
  select 1 from public.ark_teams t
  join public.ark_cycles c on c.id = t.cycle_id
  where t.id = ark_assignments.team_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
))
with check (exists (
  select 1 from public.ark_teams t
  join public.ark_cycles c on c.id = t.cycle_id
  where t.id = ark_assignments.team_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
));
