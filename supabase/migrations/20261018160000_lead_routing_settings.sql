-- Single row: when enabled, new website leads in these states are also assigned
-- to agent_id (they still appear in admin Leads). Applied to production 2026-10-18.
create table if not exists public.lead_routing_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  states text[] not null default '{NC}',
  agent_id uuid references public.agents(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
comment on table public.lead_routing_settings is 'Single row: when enabled, new website leads in these states are also assigned to agent_id (they still appear in admin Leads).';

alter table public.lead_routing_settings enable row level security;
create policy "Admins manage lead routing" on public.lead_routing_settings
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.lead_routing_settings (id, enabled, states, agent_id)
select 1, true, '{NC}', (select id from public.agents where is_admin and is_active order by created_at limit 1)
on conflict (id) do nothing;
