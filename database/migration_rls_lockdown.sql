-- Applied to production 2026-10-03.
-- Enable RLS on every remaining USAHUDhomes table. legislative_events
-- (NC Issues) and the cemetery tables are intentionally untouched.
-- Server code in api/ uses SUPABASE_SERVICE_KEY and bypasses RLS.

create or replace function public.my_agent_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.agents where lower(email) = lower(auth.jwt() ->> 'email')
$$;
revoke execute on function public.my_agent_ids() from anon;

do $$
declare t text;
begin
  foreach t in array array['leads','lead_events','agent_applications','agent_verification_logs','bid_results','brokers',
    'video_jobs','video_templates','broker_states','onboarding_consents','customer_events','referral_agreements','referrals','notifications'] loop
    execute format('create policy "Admins manage %1$s" on public.%1$I for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))', t);
  end loop;
  foreach t in array array['email_templates','consultation_events'] loop
    execute format('create policy "Brokers and admins manage %1$s" on public.%1$I for all to authenticated using (public.is_broker_or_admin(auth.uid())) with check (public.is_broker_or_admin(auth.uid()))', t);
  end loop;
  -- Public forms: contact, buyer alerts, property inquiry, broker application.
  foreach t in array array['leads','agent_applications','agent_verification_logs'] loop
    execute format('create policy "Public can submit %1$s" on public.%1$I for insert to anon, authenticated with check (true)', t);
  end loop;
end $$;

create policy "Public can submit lead_events" on public.lead_events for insert to anon, authenticated with check (lead_id is not null);
create policy "Public can read bid_results" on public.bid_results for select to anon, authenticated using (true);
create policy "Brokers see assigned referrals" on public.referrals for select to authenticated using (assigned_agent_id in (select public.my_agent_ids()));
create policy "Brokers update assigned referrals" on public.referrals for update to authenticated using (assigned_agent_id in (select public.my_agent_ids())) with check (assigned_agent_id in (select public.my_agent_ids()));
create policy "Users manage own notifications" on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter policy "Authenticated users can manage activities" on public.activities using (public.is_broker_or_admin(auth.uid())) with check (public.is_broker_or_admin(auth.uid()));

do $$ declare t text; begin
  foreach t in array array['activities','leads','customer_events','referral_agreements','agent_applications','agent_verification_logs','consultation_events','notifications','referrals','broker_states','lead_events','email_templates','onboarding_consents','bid_results','brokers','video_jobs','video_templates'] loop
    execute format('alter table public.%I enable row level security', t);
    -- TRUNCATE bypasses RLS.
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- SECURITY DEFINER functions bypass RLS; nothing signed-out should call them.
-- Trigger functions still fire (EXECUTE isn't checked when a trigger fires).
alter policy "Authenticated users can manage activities" on public.activities to authenticated;
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef
    and p.proname in ('accept_referral','assign_consultation_to_broker','decline_referral','expire_referrals','get_lead_statistics','get_user_role','handle_new_auth_user','is_admin','is_broker','is_broker_or_admin','log_communication','my_agent_ids','restore_consultation','restore_customer','users_before_insert','users_guard_insert_role','users_protect_role')
  loop
    execute format('revoke execute on function %s from public, anon', f);
  end loop;
  for f in select p.oid::regprocedure from pg_proc p where p.pronamespace='public'::regnamespace
    and p.proname in ('handle_new_auth_user','users_before_insert','users_guard_insert_role','users_protect_role')
  loop
    execute format('revoke execute on function %s from authenticated', f);
  end loop;
end $$;
