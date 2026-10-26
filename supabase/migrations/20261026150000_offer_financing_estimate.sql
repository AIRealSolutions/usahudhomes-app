-- Payment estimate (loan scenarios at the offer price) saved with each buyer offer.
alter table public.buyer_bid_drafts add column if not exists financing_estimate jsonb;

comment on column public.buyer_bid_drafts.financing_estimate is
  'Payment breakdown at the offer price when saved: assumptions plus one entry per loan scenario (owner: HUD $100 down, FHA, conventional; investor: 10/20/25% down).';
