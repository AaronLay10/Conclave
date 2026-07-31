-- Record every event edit with the authenticated editor and before/after values.

create or replace function public.audit_event_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (
    kingdom_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  values (
    new.kingdom_id,
    auth.uid(),
    'event',
    new.id,
    'updated',
    jsonb_build_object(
      'before', to_jsonb(old),
      'after', to_jsonb(new)
    )
  );

  return new;
end;
$$;

drop trigger if exists events_audit_update on public.events;

create trigger events_audit_update
after update on public.events
for each row execute function public.audit_event_update();
