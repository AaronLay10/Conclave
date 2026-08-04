-- Hero Scrolls activity scoring and leadership-only reporting

create table public.activity_imports (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  activity_period_start date not null,
  activity_period_end date not null,
  fort_period_start date not null,
  fort_period_end date not null,
  activity_source_name text not null,
  fort_source_name text not null,
  score_config jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint valid_activity_period check (activity_period_end >= activity_period_start),
  constraint valid_fort_period check (fort_period_end >= fort_period_start),
  unique (alliance_id, activity_period_start, activity_period_end, fort_period_start, fort_period_end)
);

create index activity_imports_alliance_created_idx
  on public.activity_imports (alliance_id, created_at desc);

create table public.activity_member_scores (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.activity_imports(id) on delete cascade,
  governor_id text not null,
  governor_name text not null,
  building_points bigint not null default 0,
  tech_donations bigint not null default 0,
  resource_assistance bigint not null default 0,
  helps_given bigint not null default 0,
  fort_points numeric not null default 0,
  fort_points_per_week numeric not null default 0,
  launches integer not null default 0,
  joins integer not null default 0,
  building_score numeric(7,3) not null default 0,
  tech_score numeric(7,3) not null default 0,
  resource_score numeric(7,3) not null default 0,
  helps_score numeric(7,3) not null default 0,
  fort_score numeric(7,3) not null default 0,
  activity_score numeric(7,3) not null,
  tier text not null check (tier in ('Exceptional', 'Strong', 'Active', 'Light', 'At Risk')),
  rank integer not null check (rank > 0),
  data_note text,
  unique (import_id, governor_id)
);

create index activity_member_scores_import_rank_idx
  on public.activity_member_scores (import_id, rank);

alter table public.activity_imports enable row level security;
alter table public.activity_member_scores enable row level security;

create policy "leadership views activity imports"
on public.activity_imports for select
using (
  public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
  or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.kingdom_id = activity_imports.kingdom_id
      and m.alliance_id = activity_imports.alliance_id
      and m.role = 'alliance_lead'
      and m.is_active
  )
);

create policy "leadership manages activity imports"
on public.activity_imports for all
using (
  public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
  or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.kingdom_id = activity_imports.kingdom_id
      and m.alliance_id = activity_imports.alliance_id
      and m.role = 'alliance_lead'
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
        and m.kingdom_id = activity_imports.kingdom_id
        and m.alliance_id = activity_imports.alliance_id
        and m.role = 'alliance_lead'
        and m.is_active
    )
  )
);

create policy "leadership views activity member scores"
on public.activity_member_scores for select
using (
  exists (
    select 1 from public.activity_imports ai
    where ai.id = activity_member_scores.import_id
      and (
        public.has_kingdom_role(ai.kingdom_id, array['event_director','council']::public.app_role[])
        or exists (
          select 1 from public.memberships m
          where m.user_id = auth.uid()
            and m.kingdom_id = ai.kingdom_id
            and m.alliance_id = ai.alliance_id
            and m.role = 'alliance_lead'
            and m.is_active
        )
      )
  )
);

create policy "leadership manages activity member scores"
on public.activity_member_scores for all
using (
  exists (
    select 1 from public.activity_imports ai
    where ai.id = activity_member_scores.import_id
      and (
        public.has_kingdom_role(ai.kingdom_id, array['event_director','council']::public.app_role[])
        or exists (
          select 1 from public.memberships m
          where m.user_id = auth.uid()
            and m.kingdom_id = ai.kingdom_id
            and m.alliance_id = ai.alliance_id
            and m.role = 'alliance_lead'
            and m.is_active
        )
      )
  )
)
with check (
  exists (
    select 1 from public.activity_imports ai
    where ai.id = activity_member_scores.import_id
      and (
        public.has_kingdom_role(ai.kingdom_id, array['event_director','council']::public.app_role[])
        or exists (
          select 1 from public.memberships m
          where m.user_id = auth.uid()
            and m.kingdom_id = ai.kingdom_id
            and m.alliance_id = ai.alliance_id
            and m.role = 'alliance_lead'
            and m.is_active
        )
      )
  )
);
