create table if not exists public.buyer_bid_drafts (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references auth.users(id) on delete cascade,
 case_number text not null,
 asking_price numeric(12,2),
 offer_price numeric(12,2) not null check (offer_price > 0),
 occupancy text not null check (occupancy in ('owner','investor','other')),
 financing text not null check (financing in ('fha','conventional','cash','203k')),
 closing_cost_percent numeric(4,2) not null default 0 check (closing_cost_percent between 0 and 3),
 earnest_money numeric(12,2) not null default 0 check (earnest_money >= 0),
 notes text,
 status text not null default 'draft' check (status in ('draft','submitted','changes_requested','reviewed','withdrawn')),
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists buyer_bid_drafts_buyer_idx on public.buyer_bid_drafts(buyer_id,created_at desc);
alter table public.buyer_bid_drafts enable row level security;
create policy "buyers read own bids" on public.buyer_bid_drafts for select to authenticated using (buyer_id=auth.uid());
create policy "buyers create own bids" on public.buyer_bid_drafts for insert to authenticated with check (buyer_id=auth.uid() and status in ('draft','submitted'));
create policy "buyers edit drafts" on public.buyer_bid_drafts for update to authenticated using (buyer_id=auth.uid() and status in ('draft','changes_requested')) with check (buyer_id=auth.uid() and status in ('draft','submitted'));
-- Broker access must be implemented through verified assignment relationships, not broad RLS.

grant select, insert, update on public.buyer_bid_drafts to authenticated;
