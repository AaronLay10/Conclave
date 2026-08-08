drop policy if exists "leadership manages ark cycles" on public.ark_cycles;

create policy "leadership manages ark cycles"
on public.ark_cycles for all
using (
  public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
  or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.kingdom_id = ark_cycles.kingdom_id
      and m.alliance_id = ark_cycles.alliance_id
      and m.role in ('alliance_lead','alliance_r4','alliance_r5')
      and m.is_active
  )
)
with check (
  public.has_kingdom_role(kingdom_id, array['event_director','council']::public.app_role[])
  or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.kingdom_id = ark_cycles.kingdom_id
      and m.alliance_id = ark_cycles.alliance_id
      and m.role in ('alliance_lead','alliance_r4','alliance_r5')
      and m.is_active
  )
);
