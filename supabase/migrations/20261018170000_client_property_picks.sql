-- Homes a broker picked for a client from Find Properties. Written by the server
-- (/api/leads?action=property-picks) after checking the broker owns the lead.
-- Applied to production 2026-10-18.
create table if not exists public.client_property_picks (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  case_number text not null,
  note text,
  status text not null default 'picked' check (status in ('picked', 'sent', 'interested', 'not_interested')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (consultation_id, case_number)
);
create index if not exists client_property_picks_user_idx on public.client_property_picks (user_id);
comment on table public.client_property_picks is 'Homes a broker picked for a client (lead) to use in emails/texts; mirrored into the buyer''s saved_properties when they have an account.';

alter table public.client_property_picks enable row level security;
create policy "Admins manage property picks" on public.client_property_picks
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Buyers read their own picks" on public.client_property_picks
  for select to authenticated using (user_id = auth.uid());

-- Saved homes added by an agent for the buyer
alter table public.saved_properties add column if not exists recommended_by_agent_id uuid references public.agents(id) on delete set null;
