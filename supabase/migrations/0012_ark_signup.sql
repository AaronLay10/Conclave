-- Tokenized member-facing Ark availability signup
alter table public.ark_cycles
  add column signup_token uuid not null default gen_random_uuid(),
  add column signup_open boolean not null default false,
  add column signup_published_at timestamptz,
  add column signup_message_id text;

create unique index ark_cycles_signup_token_idx on public.ark_cycles (signup_token);

create or replace function public.get_ark_signup(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'cycle_id', c.id,
    'ark_date', c.ark_date,
    'alliance_name', a.name,
    'alliance_tag', a.tag,
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'team_number', t.team_number,
        'battle_time', t.battle_time,
        'check_in_minutes', t.check_in_minutes
      ) order by t.team_number)
      from public.ark_teams t
      where t.cycle_id = c.id
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'governor_id', s.governor_id,
        'governor_name', s.governor_name
      ) order by lower(s.governor_name))
      from public.activity_member_scores s
      where s.import_id = c.source_import_id
    ), '[]'::jsonb)
  ) into result
  from public.ark_cycles c
  join public.alliances a on a.id = c.alliance_id
  where c.signup_token = p_token
    and c.signup_open = true
    and c.source_import_id is not null;

  return result;
end;
$$;

create or replace function public.submit_ark_signup(
  p_token uuid,
  p_governor_id text,
  p_team_1_available boolean,
  p_team_2_available boolean,
  p_team_3_available boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_cycle public.ark_cycles%rowtype;
  target_member public.activity_member_scores%rowtype;
begin
  select * into target_cycle
  from public.ark_cycles
  where signup_token = p_token and signup_open = true;

  if target_cycle.id is null then
    raise exception 'Ark signup is closed or invalid.';
  end if;

  select * into target_member
  from public.activity_member_scores
  where import_id = target_cycle.source_import_id
    and governor_id = p_governor_id;

  if target_member.governor_id is null then
    raise exception 'Governor is not part of this Hero Scrolls roster.';
  end if;

  insert into public.ark_availability (
    cycle_id, governor_id, governor_name,
    team_1_available, team_2_available, team_3_available, updated_at
  ) values (
    target_cycle.id, target_member.governor_id, target_member.governor_name,
    p_team_1_available, p_team_2_available, p_team_3_available, now()
  )
  on conflict (cycle_id, governor_id) do update set
    governor_name = excluded.governor_name,
    team_1_available = excluded.team_1_available,
    team_2_available = excluded.team_2_available,
    team_3_available = excluded.team_3_available,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'governor_id', target_member.governor_id,
    'governor_name', target_member.governor_name
  );
end;
$$;

revoke all on function public.get_ark_signup(uuid) from public;
revoke all on function public.submit_ark_signup(uuid,text,boolean,boolean,boolean) from public;
grant execute on function public.get_ark_signup(uuid) to anon, authenticated;
grant execute on function public.submit_ark_signup(uuid,text,boolean,boolean,boolean) to anon, authenticated;
