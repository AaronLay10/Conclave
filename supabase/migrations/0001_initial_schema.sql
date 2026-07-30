-- RoK Events Command — initial database and security model

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'event_director',
  'council',
  'alliance_lead',
  'viewer'
);

create type public.event_scope as enum ('kingdom', 'alliance');

create type public.event_status as enum (
  'draft',
  'review',
  'approved',
  'published',
  'active',
  'completed',
  'archived'
);

create type public.event_certainty as enum (
  'confirmed',
  'predicted',
  'leadership_scheduled',
  'tbd'
);

create type public.announcement_channel as enum (
  'discord',
  'ingame_mail',
  'leadership'
);

create type public.delivery_status as enum (
  'draft',
  'approved',
  'scheduled',
  'processing',
  'published',
  'failed',
  'cancelled'
);

create table public.kingdoms (
  id uuid primary key default gen_random_uuid(),
  kingdom_number integer not null unique check (kingdom_number > 0),
  name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.alliances (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  tag text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kingdom_id, tag)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  discord_user_id text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  alliance_id uuid references public.alliances(id) on delete set null,
  role public.app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, kingdom_id)
);

create table public.event_templates (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid references public.kingdoms(id) on delete cascade,
  name text not null,
  category text not null,
  default_scope public.event_scope not null default 'kingdom',
  description text,
  preparation text,
  default_rules text,
  reminder_offsets_minutes integer[] not null default '{1440,60}',
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms(id) on delete cascade,
  alliance_id uuid references public.alliances(id) on delete cascade,
  template_id uuid references public.event_templates(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  category text not null,
  scope public.event_scope not null,
  status public.event_status not null default 'draft',
  certainty public.event_certainty not null default 'tbd',
  start_at timestamptz not null,
  end_at timestamptz not null,
  preparation_deadline timestamptz,
  registration_deadline timestamptz,
  announcement_deadline timestamptz,
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text,
  alliance_name text,
  location text,
  preparation text,
  rules text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_event_window check (end_at > start_at),
  constraint alliance_scope_requires_alliance check (
    (scope = 'kingdom' and alliance_id is null)
    or
    (scope = 'alliance' and alliance_id is not null)
  )
);

create index events_kingdom_start_idx on public.events (kingdom_id, start_at);
create index events_alliance_start_idx on public.events (alliance_id, start_at);
create index events_status_idx on public.events (status);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  channel public.announcement_channel not null,
  title text not null,
  body text not null,
  status public.delivery_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_message_id text,
  last_error text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  channel public.announcement_channel not null default 'discord',
  scheduled_at timestamptz not null,
  status public.delivery_status not null default 'scheduled',
  attempt_count integer not null default 0,
  processing_started_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index reminders_due_idx
  on public.reminders (scheduled_at)
  where status = 'scheduled';

create table public.alliance_confirmations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  note text,
  unique (event_id, alliance_id)
);

create table public.event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  participation_count integer,
  score numeric,
  placement integer,
  summary text,
  lessons_learned text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  kingdom_id uuid references public.kingdoms(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger templates_set_updated_at before update on public.event_templates
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger announcements_set_updated_at before update on public.announcements
for each row execute function public.set_updated_at();
create trigger results_set_updated_at before update on public.event_results
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, discord_user_id, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'provider_id', new.raw_user_meta_data ->> 'sub'),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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
  select exists (
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
  select exists (
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
  select exists (
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

alter table public.kingdoms enable row level security;
alter table public.alliances enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.event_templates enable row level security;
alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.reminders enable row level security;
alter table public.alliance_confirmations enable row level security;
alter table public.event_results enable row level security;
alter table public.audit_logs enable row level security;

create policy "members view their kingdoms"
on public.kingdoms for select
using (public.has_kingdom_role(id, array['event_director','council','alliance_lead','viewer']::public.app_role[]));

create policy "members view alliances in their kingdom"
on public.alliances for select
using (public.has_kingdom_role(kingdom_id, array['event_director','council','alliance_lead','viewer']::public.app_role[]));

create policy "users view own profile"
on public.profiles for select using (id = auth.uid());

create policy "users update own profile"
on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "users view memberships in their kingdom"
on public.memberships for select
using (
  user_id = auth.uid()
  or public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
);

create policy "directors manage memberships"
on public.memberships for all
using (public.has_kingdom_role(kingdom_id, array['event_director']::public.app_role[]))
with check (public.has_kingdom_role(kingdom_id, array['event_director']::public.app_role[]));

create policy "members view templates"
on public.event_templates for select
using (
  kingdom_id is null
  or public.has_kingdom_role(kingdom_id, array['event_director','council','alliance_lead','viewer']::public.app_role[])
);

create policy "event leadership manages templates"
on public.event_templates for all
using (
  kingdom_id is not null
  and public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
)
with check (
  kingdom_id is not null
  and public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
);

create policy "members view allowed events"
on public.events for select using (public.can_view_event(events));

create policy "event leadership inserts events"
on public.events for insert
with check (
  created_by = auth.uid()
  and (
    public.has_kingdom_role(
      kingdom_id,
      array['event_director']::public.app_role[]
    )
    or (
      scope = 'kingdom'
      and public.has_kingdom_role(
        kingdom_id,
        array['council']::public.app_role[]
      )
    )
    or (
      scope = 'alliance'
      and exists (
        select 1
        from public.memberships m
        where m.user_id = auth.uid()
          and m.kingdom_id = events.kingdom_id
          and m.alliance_id = events.alliance_id
          and m.role = 'alliance_lead'
          and m.is_active
      )
    )
  )
);

create policy "event leadership updates events"
on public.events for update
using (public.can_manage_event(events))
with check (public.can_manage_event(events));

create policy "directors delete events"
on public.events for delete
using (public.has_kingdom_role(kingdom_id, array['event_director']::public.app_role[]));

create policy "view announcements for visible events"
on public.announcements for select
using (
  exists (
    select 1 from public.events e
    where e.id = announcements.event_id
      and public.can_view_event(e)
  )
);

create policy "event leadership manages announcements"
on public.announcements for all
using (
  exists (
    select 1 from public.events e
    where e.id = announcements.event_id
      and public.can_manage_event(e)
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = announcements.event_id
      and public.can_manage_event(e)
  )
);

create policy "event leadership views reminders"
on public.reminders for select
using (
  exists (
    select 1 from public.events e
    where e.id = reminders.event_id
      and public.can_manage_event(e)
  )
);

create policy "event leadership manages reminders"
on public.reminders for all
using (
  exists (
    select 1 from public.events e
    where e.id = reminders.event_id
      and public.can_manage_event(e)
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = reminders.event_id
      and public.can_manage_event(e)
  )
);

create policy "members view confirmations in kingdom"
on public.alliance_confirmations for select
using (
  exists (
    select 1 from public.events e
    where e.id = alliance_confirmations.event_id
      and public.can_view_event(e)
  )
);

create policy "alliance leads update own confirmation"
on public.alliance_confirmations for update
using (
  exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.alliance_id = alliance_confirmations.alliance_id
      and m.role in ('event_director','alliance_lead')
      and m.is_active
  )
);

create policy "members view event results"
on public.event_results for select
using (
  exists (
    select 1 from public.events e
    where e.id = event_results.event_id
      and public.can_view_event(e)
  )
);

create policy "event leadership manages results"
on public.event_results for all
using (
  exists (
    select 1 from public.events e
    where e.id = event_results.event_id
      and public.can_manage_event(e)
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = event_results.event_id
      and public.can_manage_event(e)
  )
);

create policy "directors view audit logs"
on public.audit_logs for select
using (public.has_kingdom_role(kingdom_id, array['event_director']::public.app_role[]));
