-- Deal meter snapshot saved with each buyer offer so brokers see what the buyer saw.
alter table public.buyer_bid_drafts
  add column if not exists est_net_to_hud numeric(12,2),
  add column if not exists net_to_list numeric(6,4),
  add column if not exists days_on_market integer,
  add column if not exists deal_meter_score integer check (deal_meter_score between 0 and 100),
  add column if not exists deal_meter_sample integer,
  add column if not exists deal_meter_basis text;

comment on column public.buyer_bid_drafts.deal_meter_score is
  'Share (0-100) of comparable accepted HUD offers whose net-to-list was at or below this offer''s, when the offer was saved.';
