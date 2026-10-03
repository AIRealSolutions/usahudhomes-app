-- Applied to production 2026-10-03.
-- customers and consultations had RLS on but policies let anyone read every
-- row and any signed-in user edit/delete them. Buyers' agent requests now go
-- through api/notifications?action=consultation-request (service key).

alter policy "Authenticated users can manage consultations" on public.consultations to authenticated using (public.is_broker_or_admin(auth.uid())) with check (public.is_broker_or_admin(auth.uid()));
alter policy "Authenticated users can delete consultations" on public.consultations using (public.is_admin(auth.uid()));
alter policy "Public can insert consultations" on public.consultations to authenticated with check (public.is_broker_or_admin(auth.uid()));
alter policy "Authenticated users can view all consultations" on public.consultations using (is_deleted = false and lower(customer_email) = lower(auth.jwt() ->> 'email'));
alter policy "Public can read consultations" on public.consultations to authenticated using (is_deleted = false and public.is_broker_or_admin(auth.uid()));
alter policy "Authenticated users can update consultations" on public.consultations using (public.is_broker_or_admin(auth.uid())) with check (public.is_broker_or_admin(auth.uid()));
alter policy "Authenticated users can manage customers" on public.customers to authenticated using (public.is_broker_or_admin(auth.uid())) with check (public.is_broker_or_admin(auth.uid()));
alter policy "Authenticated users can delete customers" on public.customers using (public.is_admin(auth.uid()));
alter policy "Public can insert customers" on public.customers to authenticated with check (public.is_broker_or_admin(auth.uid()));
alter policy "Authenticated users can view all customers" on public.customers using (is_deleted = false and lower(email) = lower(auth.jwt() ->> 'email'));
alter policy "Public can read customers by email" on public.customers to authenticated using (is_deleted = false and public.is_broker_or_admin(auth.uid()));
alter policy "Authenticated users can update customers" on public.customers using (public.is_broker_or_admin(auth.uid())) with check (public.is_broker_or_admin(auth.uid()));
alter policy "Public can log customer_events" on public.customer_events to authenticated with check (public.is_broker_or_admin(auth.uid()));

alter policy "Authenticated users can manage consultations" on public.consultations rename to "Staff manage consultations";
alter policy "Authenticated users can delete consultations" on public.consultations rename to "Admins delete consultations";
alter policy "Public can insert consultations" on public.consultations rename to "Staff create consultations";
alter policy "Authenticated users can view all consultations" on public.consultations rename to "Buyers view own consultations";
alter policy "Public can read consultations" on public.consultations rename to "Staff view consultations";
alter policy "Authenticated users can update consultations" on public.consultations rename to "Staff update consultations";
alter policy "Authenticated users can manage customers" on public.customers rename to "Staff manage customers";
alter policy "Authenticated users can delete customers" on public.customers rename to "Admins delete customers";
alter policy "Public can insert customers" on public.customers rename to "Staff create customers";
alter policy "Authenticated users can view all customers" on public.customers rename to "Buyers view own customer record";
alter policy "Public can read customers by email" on public.customers rename to "Staff view customers";
alter policy "Authenticated users can update customers" on public.customers rename to "Staff update customers";
alter policy "Public can log customer_events" on public.customer_events rename to "Staff log customer_events";

revoke all on public.consultations, public.customers from anon;
revoke truncate, references, trigger on public.consultations, public.customers from authenticated;

-- These views ran as their owner, bypassing RLS for anyone with the anon key.
alter view public.deleted_consultations set (security_invoker = true);
alter view public.deleted_customers set (security_invoker = true);
alter view public.broker_performance set (security_invoker = true);
alter view public.pending_bid_results set (security_invoker = true);
alter view public.recent_bid_results set (security_invoker = true);
revoke all on public.deleted_consultations, public.deleted_customers, public.broker_performance, public.pending_bid_results, public.recent_bid_results from anon;

-- /deals is public; only expose the columns that page shows (not broker contact info or notes).
revoke select on public.successful_deals from anon, authenticated;
grant select (id,case_number,address,city,state,zip_code,estimated_sale_price,actual_sale_price,original_list_price,purchaser_type,date_closed,days_to_close,discount_percentage) on public.successful_deals to anon, authenticated;
