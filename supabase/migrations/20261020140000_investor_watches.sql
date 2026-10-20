-- Investor watch list: a client (lead) waiting for a property to open to investor
-- bids. Shown on the broker's/admin's calendar and on the client's own calendar
-- (customer dashboard, matched by email). Applied to production 2026-10-20.
create table if not exists public.investor_watches (
  id uuid primary key default gen_random_uuid(),
  case_number text not null,
  property_id uuid references public.properties(id) on delete set null,
  consultation_id uuid references public.consultations(id) on delete cascade,
  client_name text,
  client_email text,
  agent_id uuid references public.agents(id) on delete set null,
  note text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (consultation_id, case_number)
);
create index if not exists investor_watches_created_by_idx on public.investor_watches (created_by);
create index if not exists investor_watches_client_email_idx on public.investor_watches (lower(client_email));
comment on table public.investor_watches is 'Clients waiting for a property to open to investor bids; shown on broker and client calendars.';

alter table public.investor_watches enable row level security;
create policy "Creators and admins manage investor watches" on public.investor_watches
  for all to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.is_admin(auth.uid()));
create policy "Assigned brokers read investor watches" on public.investor_watches
  for select to authenticated using (agent_id in (select public.my_agent_ids()));
create policy "Clients read their investor watches" on public.investor_watches
  for select to authenticated using (lower(client_email) = lower(auth.jwt() ->> 'email'));
