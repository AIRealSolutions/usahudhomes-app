-- Applied to usahudhomes Supabase: route_buyer_bid_to_assigned_lead
alter table public.buyer_bid_drafts add column if not exists consultation_id uuid references public.consultations(id);
alter table public.buyer_bid_drafts add column if not exists assigned_broker_id uuid references public.agents(id);
create index if not exists buyer_bid_drafts_consultation_idx on public.buyer_bid_drafts(consultation_id);
create index if not exists buyer_bid_drafts_broker_status_idx on public.buyer_bid_drafts(assigned_broker_id,status,submitted_at desc);
create or replace function public.route_buyer_bid_to_lead() returns trigger language plpgsql security definer set search_path = '' as $$
declare buyer_email text;
begin
 if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
   select email into buyer_email from auth.users where id = new.buyer_id;
   select c.id,coalesce(c.assigned_broker_id,c.assigned_agent_id,c.agent_id)
     into new.consultation_id,new.assigned_broker_id
   from public.consultations c
   where lower(coalesce(c.customer_email,c.email,''))=lower(buyer_email)
     and coalesce(c.is_deleted,false)=false
   order by (c.case_number=new.case_number) desc,c.created_at desc
   limit 1;
 end if;
 return new;
end $$;
revoke all on function public.route_buyer_bid_to_lead() from public,anon,authenticated;
drop trigger if exists route_buyer_bid_to_lead_trigger on public.buyer_bid_drafts;
create trigger route_buyer_bid_to_lead_trigger before insert or update of status on public.buyer_bid_drafts for each row execute function public.route_buyer_bid_to_lead();
create policy "assigned broker reads submitted offers" on public.buyer_bid_drafts for select to authenticated using (
 status in ('submitted','reviewed','changes_requested') and
 (select public.is_admin(auth.uid()) or exists (
  select 1 from public.agents a where a.id=assigned_broker_id and lower(a.email)=lower(auth.jwt()->>'email')
 ))
);
grant select on public.buyer_bid_drafts to authenticated;
