-- Treat direct in-game and official sources as verified evidence.
-- Certainty describes whether the event occurrence is known, not whether every
-- boundary or instruction detail has been captured.

create or replace function public.normalize_event_certainty_from_source()
returns trigger
language plpgsql
as $$
begin
  if new.source_kind in ('ingame_screenshot', 'official') then
    new.certainty := 'confirmed';
  elsif new.source_kind = 'prediction' then
    new.certainty := 'predicted';
  end if;

  return new;
end;
$$;

drop trigger if exists events_normalize_certainty_from_source on public.events;
create trigger events_normalize_certainty_from_source
before insert or update of source_kind, certainty on public.events
for each row execute function public.normalize_event_certainty_from_source();

-- Correct previously imported screenshot events that were labeled TBD merely
-- because exact UTC boundaries or detail-panel instructions were unavailable.
update public.events
set certainty = 'confirmed'
where source_kind in ('ingame_screenshot', 'official')
  and certainty <> 'confirmed';

-- Keep generated rotation records explicitly predicted.
update public.events
set certainty = 'predicted'
where source_kind = 'prediction'
  and certainty <> 'predicted';

comment on function public.normalize_event_certainty_from_source() is
  'Keeps event certainty aligned with provenance: screenshots and official sources are confirmed; generated rotation records remain predicted.';
