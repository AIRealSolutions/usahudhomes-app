-- Offers a broker builds for a client (lead) and sends to them to accept, revise,
-- decline or save to their favorites. The reverse of buyer_bid_drafts, where the
-- buyer proposes and the broker reviews. Terms use the same columns and checks as
-- buyer_bid_drafts so both kinds of offer read alike.
--
-- All writes go through the server (/api/leads?action=offer-proposals for brokers,
-- ?action=offer-respond for buyers) with the service key, after it checks the
-- broker owns the lead or the buyer holds the offer's share token. RLS here only
-- grants reads.
create table if not exists public.broker_offer_proposals (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  -- The buyer's website account, when they have one (matched by email)
  user_id uuid references auth.users(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  case_number text not null,
  -- Lets a buyer without an account open the offer from an email or text
  share_token text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'changes_requested', 'accepted', 'submitted', 'declined', 'withdrawn')),

  -- Terms (same rules as buyer_bid_drafts)
  asking_price numeric,
  offer_price numeric not null check (offer_price > 0),
  occupancy text not null check (occupancy in ('owner', 'investor')),
  financing text not null check (financing in ('fha', 'conventional', 'cash', '203k')),
  closing_cost_percent numeric not null default 0 check (closing_cost_percent between 0 and 3),
  earnest_money numeric not null default 0 check (earnest_money >= 0),
  listing_commission_percent numeric not null default 3 check (listing_commission_percent between 0 and 100),
  buyer_commission_percent numeric not null default 3 check (buyer_commission_percent between 0 and 100),
  broker_message text,
  check (occupancy = 'owner' or closing_cost_percent = 0),

  -- Snapshot of the offer builder's analysis when the broker saved it
  est_net_to_hud numeric,
  net_to_list numeric,
  days_on_market integer,
  deal_meter_score integer check (deal_meter_score between 0 and 100),
  deal_meter_sample integer,
  deal_meter_basis text,
  financing_estimate jsonb,
  accept_wait_low_days integer,
  accept_wait_days integer,

  -- Buyer's response
  is_favorite boolean not null default false,
  buyer_note text,
  viewed_at timestamptz,
  responded_at timestamptz,
  accepted_signature text,
  -- Exact terms the buyer agreed to, frozen at acceptance
  accepted_terms jsonb,

  sent_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists broker_offer_proposals_consultation_idx on public.broker_offer_proposals (consultation_id);
create index if not exists broker_offer_proposals_agent_idx on public.broker_offer_proposals (agent_id);
create index if not exists broker_offer_proposals_user_idx on public.broker_offer_proposals (user_id);
comment on table public.broker_offer_proposals is 'Offers a broker built for a client (lead); the buyer accepts, asks for changes, declines or saves them. Written only by /api/leads.';

create table if not exists public.broker_offer_proposal_events (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.broker_offer_proposals(id) on delete cascade,
  actor text not null check (actor in ('broker', 'buyer')),
  event text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists broker_offer_proposal_events_proposal_idx on public.broker_offer_proposal_events (proposal_id);
comment on table public.broker_offer_proposal_events is 'History of each broker offer proposal: sent, viewed, favorited, accepted, revised, submitted.';

alter table public.broker_offer_proposals enable row level security;
alter table public.broker_offer_proposal_events enable row level security;

create policy "Admins read broker offer proposals" on public.broker_offer_proposals
  for select to authenticated using ((select public.is_admin(auth.uid())));
create policy "Brokers read their offer proposals" on public.broker_offer_proposals
  for select to authenticated
  using ((select public.is_broker_or_admin(auth.uid())) and agent_id in (select public.my_agent_ids()));
create policy "Buyers read offers sent to them" on public.broker_offer_proposals
  for select to authenticated using (user_id = (select auth.uid()) and status <> 'draft');

create policy "Admins read offer proposal history" on public.broker_offer_proposal_events
  for select to authenticated using ((select public.is_admin(auth.uid())));
create policy "Brokers read their offer proposal history" on public.broker_offer_proposal_events
  for select to authenticated
  using ((select public.is_broker_or_admin(auth.uid())) and exists (
    select 1 from public.broker_offer_proposals p
    where p.id = proposal_id and p.agent_id in (select public.my_agent_ids())
  ));
