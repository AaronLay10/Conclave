-- Add stable import identities and source provenance for calendar batches.
-- A nullable unique key keeps manual events unrestricted while making imports
-- idempotent within each kingdom.

alter table public.events
  add column import_key text,
  add column source_kind text not null default 'manual',
  add column source_ref text,
  add column source_details jsonb not null default '{}'::jsonb,
  add column imported_at timestamptz;

alter table public.events
  add constraint events_source_kind_check
  check (source_kind in ('manual', 'ingame_screenshot', 'official', 'prediction'));

alter table public.events
  add constraint events_kingdom_import_key_unique
  unique (kingdom_id, import_key);

comment on column public.events.import_key is
  'Stable caller-supplied identity used to make calendar imports idempotent.';

comment on column public.events.source_ref is
  'Human-readable source reference, such as an in-game screenshot filename.';

comment on column public.events.source_details is
  'Structured import provenance; never treated as confirmation by itself.';
