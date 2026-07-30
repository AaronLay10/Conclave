insert into public.kingdoms (
  id,
  kingdom_number,
  name,
  timezone
)
values (
  '41260000-0000-0000-0000-000000000001',
  4126,
  'Kingdom 4126',
  'UTC'
)
on conflict (kingdom_number) do update
set name = excluded.name,
    timezone = excluded.timezone;

insert into public.alliances (
  id,
  kingdom_id,
  tag,
  name
)
values (
  '12600000-0000-0000-0000-000000000001',
  (
    select id
    from public.kingdoms
    where kingdom_number = 4126
  ),
  '126V',
  'Valkania Syndicate'
)
on conflict (kingdom_id, tag) do update
set name = excluded.name,
    is_active = true;
