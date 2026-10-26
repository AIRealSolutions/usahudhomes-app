-- Estimated wait (days from saving) until the offer's net clears the low-end and typical
-- accepted net, as HUD cuts the price about 10% every 30 days. Null = not within 6 months.
alter table public.buyer_bid_drafts
  add column if not exists accept_wait_low_days integer,
  add column if not exists accept_wait_days integer;
