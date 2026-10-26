-- Homes nearing HUD's usual price cut: HUD cuts the price about 10% after 30 days at the
-- same price. A home enters the watch on day 25 of each 30-day cycle at its current price.
-- price_since is the latest price change, or the listing date if the price never changed.
create or replace view public.price_cut_watch
with (security_invoker = true) as
with last_change as (
  select case_number, max(occurred_at) as changed_at
  from public.property_activity
  where event = 'price_change'
  group by case_number
), at_price as (
  select p.case_number, p.state, p.address, p.city, p.main_image, p.price, p.bidder_types,
         greatest(p.listing_date::date, coalesce(c.changed_at::date, p.listing_date::date)) as price_since
  from public.properties p
  left join last_change c using (case_number)
  where p.is_active and coalesce(p.status, '') not ilike 'under contract'
    and p.listing_date is not null and p.price > 0
)
select a.*,
       current_date - a.price_since as days_at_price,
       a.price_since + (((current_date - a.price_since) / 30) * 30 + 25) as alert_on,
       a.price_since + (((current_date - a.price_since) / 30) + 1) * 30 as cut_due_on,
       round(a.price * 0.9) as est_new_price
from at_price a
where (current_date - a.price_since) % 30 >= 25;

grant select on public.price_cut_watch to anon, authenticated;
