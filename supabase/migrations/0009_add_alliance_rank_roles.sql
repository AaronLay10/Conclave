-- Add distinct Rise of Kingdoms alliance leadership ranks.
-- Enum values are committed separately before policies reference them.

alter type public.app_role add value if not exists 'alliance_r4';
alter type public.app_role add value if not exists 'alliance_r5';
