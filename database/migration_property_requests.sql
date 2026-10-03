-- Applied to production 2026-10-03.
-- The signed-in "Request this property" form and Saved Properties read/write this
-- table, but it never existed, so every request failed.
create table if not exists public.property_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_number text not null,
  address text,
  city text,
  state text,
  list_price numeric,
  status text not null default 'new',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, case_number)
);
create index if not exists property_requests_user_idx on public.property_requests (user_id, requested_at desc);
alter table public.property_requests enable row level security;
revoke all on public.property_requests from anon;
revoke truncate, references, trigger on public.property_requests from authenticated;
create policy "Users manage own property requests" on public.property_requests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Brokers and admins view property requests" on public.property_requests for select to authenticated
  using (public.is_broker_or_admin(auth.uid()));
create policy "Admins manage property requests" on public.property_requests for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- The public agent-request form logs a consultation_created event.
create policy "Public can log customer_events" on public.customer_events for insert to anon, authenticated with check (true);
