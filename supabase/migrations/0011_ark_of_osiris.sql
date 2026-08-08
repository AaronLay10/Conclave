-- Ark of Osiris planning, team assignment, availability, and Hero Scrolls provenance

create table public.ark_cycles (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  source_import_id uuid references public.activity_imports(id) on delete set null,
  ark_date date not null,
  title text not null default 'Ark of Osiris',
  status text not null default 'planning' check (status in ('planning','locked','completed','archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alliance_id, ark_date)
);

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
  role text not null default 'field' check (role in ('captain','rally','garrison','field','ark_runner','flex')),
  battlefield_group text not null default 'flex' check (battlefield_group in ('top','bottom','center','flex')),
  confirmed boolean not null default false,
  notes text,
  unique (team_id, governor_id)
);

create table public.ark_availability (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.ark_cycles(id) on delete cascade,
  governor_id text not null,
  governor_name text not null,
  team_1_available boolean,
  team_2_available boolean,
  team_3_available boolean,
  notes text,
  updated_at timestamptz not null default now(),
  unique (cycle_id, governor_id)
);

create index ark_cycles_alliance_date_idx on public.ark_cycles (alliance_id, ark_date desc);
create index ark_assignments_team_idx on public.ark_assignments (team_id);
create index ark_assignments_governor_idx on public.ark_assignments (governor_id);
create index ark_availability_cycle_idx on public.ark_availability (cycle_id);

create or replace function public.can_manage_ark(p_kingdom_id uuid, p_alliance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_kingdom_role(p_kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.kingdom_id = p_kingdom_id
        and m.alliance_id = p_alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5')
        and m.is_active
    );
$$;

alter table public.ark_cycles enable row level security;
alter table public.ark_teams enable row level security;
alter table public.ark_assignments enable row level security;
alter table public.ark_availability enable row level security;

create policy "leadership views ark cycles" on public.ark_cycles for select
using (public.can_manage_ark(kingdom_id, alliance_id));
create policy "leadership manages ark cycles" on public.ark_cycles for all
using (public.can_manage_ark(kingdom_id, alliance_id))
with check (public.can_manage_ark(kingdom_id, alliance_id));

create policy "leadership views ark teams" on public.ark_teams for select
using (exists (select 1 from public.ark_cycles c where c.id = ark_teams.cycle_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)));
create policy "leadership manages ark teams" on public.ark_teams for all
using (exists (select 1 from public.ark_cycles c where c.id = ark_teams.cycle_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)))
with check (exists (select 1 from public.ark_cycles c where c.id = ark_teams.cycle_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)));

create policy "leadership views ark assignments" on public.ark_assignments for select
using (exists (select 1 from public.ark_teams t join public.ark_cycles c on c.id=t.cycle_id where t.id=ark_assignments.team_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)));
create policy "leadership manages ark assignments" on public.ark_assignments for all
using (exists (select 1 from public.ark_teams t join public.ark_cycles c on c.id=t.cycle_id where t.id=ark_assignments.team_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)))
with check (exists (select 1 from public.ark_teams t join public.ark_cycles c on c.id=t.cycle_id where t.id=ark_assignments.team_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)));

create policy "leadership views ark availability" on public.ark_availability for select
using (exists (select 1 from public.ark_cycles c where c.id=ark_availability.cycle_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)));
create policy "leadership manages ark availability" on public.ark_availability for all
using (exists (select 1 from public.ark_cycles c where c.id=ark_availability.cycle_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)))
with check (exists (select 1 from public.ark_cycles c where c.id=ark_availability.cycle_id and public.can_manage_ark(c.kingdom_id,c.alliance_id)));
