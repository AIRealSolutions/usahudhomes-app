-- Applied to production 2026-10-26.
-- Agent buyer referral program: security advisor follow-ups. Trigger functions and
-- the RLS helpers are not API endpoints, and every function gets a fixed search_path.
revoke execute on function public.buyer_referral_status_rules() from public, anon, authenticated;
revoke execute on function public.buyer_referral_payment_rules() from public, anon, authenticated;
revoke execute on function public.buyer_referral_agreement_rules() from public, anon, authenticated;
revoke execute on function public.log_buyer_referral_change() from public, anon, authenticated;
revoke execute on function public.notify_buyer_referral_agent() from public, anon, authenticated;
revoke execute on function public.touch_buyer_referral_updated_at() from public, anon, authenticated;
revoke execute on function public.my_referral_agent_ids() from public, anon;
revoke execute on function public.my_referral_brokerage_ids() from public, anon;
grant execute on function public.my_referral_agent_ids() to authenticated;
grant execute on function public.my_referral_brokerage_ids() to authenticated;

alter function public.referral_digits(text) set search_path = public;
alter function public.touch_buyer_referral_updated_at() set search_path = public;
alter function public.buyer_referral_agreement_rules() set search_path = public;
