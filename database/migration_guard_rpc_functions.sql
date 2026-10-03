-- Applied to production 2026-10-03.
-- These SECURITY DEFINER functions bypass RLS and were callable by any signed-in
-- user (buyers included) with no caller check. Originals are renamed *_unchecked
-- (no client access) and same-named wrappers enforce who may call them.
-- Server code (service role) keeps full access.

create or replace function public.caller_is_server() returns boolean language sql stable set search_path = public as $$ select coalesce(auth.role(), '') not in ('anon', 'authenticated') $$;
create or replace function public.caller_can_act_for_broker(p_broker_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.caller_is_server() or public.is_admin(auth.uid())
      or (public.is_broker_or_admin(auth.uid()) and (p_broker_id = auth.uid() or p_broker_id in (select public.my_agent_ids())))
$$;
revoke execute on function public.caller_can_act_for_broker(uuid) from public, anon;

alter function public.assign_consultation_to_broker(uuid, uuid, integer) rename to assign_consultation_to_broker_unchecked;
alter function public.accept_referral(uuid, uuid, text) rename to accept_referral_unchecked;
alter function public.decline_referral(uuid, uuid, text, text) rename to decline_referral_unchecked;
alter function public.log_communication(uuid, uuid, text, jsonb) rename to log_communication_unchecked;
alter function public.expire_referrals() rename to expire_referrals_unchecked;
alter function public.get_lead_statistics(uuid) rename to get_lead_statistics_unchecked;
alter function public.restore_consultation(uuid) rename to restore_consultation_unchecked;
alter function public.restore_customer(uuid) rename to restore_customer_unchecked;
revoke execute on function public.assign_consultation_to_broker_unchecked(uuid, uuid, integer), public.accept_referral_unchecked(uuid, uuid, text), public.decline_referral_unchecked(uuid, uuid, text, text), public.log_communication_unchecked(uuid, uuid, text, jsonb), public.expire_referrals_unchecked(), public.get_lead_statistics_unchecked(uuid), public.restore_consultation_unchecked(uuid), public.restore_customer_unchecked(uuid) from public, anon, authenticated;

-- Admin only: assign_consultation_to_broker, expire_referrals, restore_consultation, restore_customer
-- Own broker id (or admin): accept_referral, decline_referral, log_communication
-- Any broker/admin: get_lead_statistics
-- (wrapper bodies: see production; each raises 42501 when the check fails, then calls *_unchecked)

create or replace function public.is_broker(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$ select exists(select 1 from public.users where id = p_user_id and role = 'broker') $$;
-- Also pinned search_path = public on the remaining USAHUDhomes functions.
