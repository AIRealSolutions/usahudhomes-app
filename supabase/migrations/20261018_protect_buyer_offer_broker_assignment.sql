-- Security guard applied to live Supabase project
create or replace function public.protect_buyer_bid_assignment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_admin(auth.uid()) then
  if tg_op='INSERT' then
   if new.assigned_broker_id is not null or new.consultation_id is not null then raise exception 'Broker assignment is managed by USAHUDhomes'; end if;
  elsif new.assigned_broker_id is distinct from old.assigned_broker_id or new.consultation_id is distinct from old.consultation_id then
   raise exception 'Broker assignment is managed by USAHUDhomes';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.protect_buyer_bid_assignment() from public,anon,authenticated;
drop trigger if exists protect_buyer_bid_assignment_trigger on public.buyer_bid_drafts;
create trigger protect_buyer_bid_assignment_trigger before insert or update on public.buyer_bid_drafts for each row execute function public.protect_buyer_bid_assignment();
