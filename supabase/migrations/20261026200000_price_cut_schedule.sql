-- Next expected HUD price cut for every active home (about 10% after each 30 days at the
-- same price), for the bid calendar. price_cut_watch (day 25+ of a cycle) stays as is.
-- Signed-in users only: cut timing is bidding strategy, not for anonymous visitors.
create or replace view public.price_cut_schedule
with (security_invoker = true) as
with last_change as (
  select case_number, max(occurred_at) as changed_at
  from public.property_activity
  where event = 'price_change'
  group by case_number
), at_price as (
  select p.case_number, p.state, p.address, p.city, p.main_image, p.price, p.bidder_types,
         p.beds, p.baths, p.listing_period,
         greatest(p.listing_date::date, coalesce(c.changed_at::date, p.listing_date::date)) as price_since
  from public.properties p
  left join last_change c using (case_number)
  where p.is_active and coalesce(p.status, '') not ilike 'under contract'
    and p.listing_date is not null and p.price > 0
)
select a.*,
       current_date - a.price_since as days_at_price,
       a.price_since + (((current_date - a.price_since) / 30) + 1) * 30 as cut_due_on,
       round(a.price * 0.9) as est_new_price
from at_price a;

revoke all on public.price_cut_schedule, public.price_cut_watch from anon, public;
grant select on public.price_cut_schedule, public.price_cut_watch to authenticated;
