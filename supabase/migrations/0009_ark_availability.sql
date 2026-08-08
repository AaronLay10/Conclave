-- Player availability for each Ark team time
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

create index ark_availability_cycle_idx on public.ark_availability (cycle_id);

alter table public.ark_availability enable row level security;

create policy "leadership views ark availability"
on public.ark_availability for select
using (exists (
  select 1 from public.ark_cycles c where c.id = ark_availability.cycle_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m where m.user_id = auth.uid()
        and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
));

create policy "leadership manages ark availability"
on public.ark_availability for all
using (exists (
  select 1 from public.ark_cycles c where c.id = ark_availability.cycle_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m where m.user_id = auth.uid()
        and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
))
with check (exists (
  select 1 from public.ark_cycles c where c.id = ark_availability.cycle_id and (
    public.has_kingdom_role(c.kingdom_id, array['event_director','council']::public.app_role[])
    or exists (
      select 1 from public.memberships m where m.user_id = auth.uid()
        and m.kingdom_id = c.kingdom_id and m.alliance_id = c.alliance_id
        and m.role in ('alliance_lead','alliance_r4','alliance_r5') and m.is_active
    )
  )
));