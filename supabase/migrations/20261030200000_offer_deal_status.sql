-- Where an offer stands with HUD once it's been bid: accepted by HUD, under contract,
-- closed, not accepted or fell through. Separate from status, which tracks the offer
-- between buyer and broker (a proposal's 'accepted' means the buyer accepted it).
--
-- Brokers working the client and admins set it through set_offer_deal_status();
-- buyers see it but can't change it. The change-log trigger records each change.

alter table public.buyer_bid_drafts
  add column if not exists deal_status text check (deal_status in ('hud_accepted', 'under_contract', 'closed', 'not_accepted', 'fell_through')),
  add column if not exists deal_status_date date,
  add column if not exists closing_date date,
  add column if not exists deal_note text;
alter table public.broker_offer_proposals
  add column if not exists deal_status text check (deal_status in ('hud_accepted', 'under_contract', 'closed', 'not_accepted', 'fell_through')),
  add column if not exists deal_status_date date,
  add column if not exists closing_date date,
  add column if not exists deal_note text;

-- Brokers tied to the offer or the client's lead, and admins. Not the buyer.
create or replace function public.can_manage_offer(p_kind text, p_offer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with me as (select array(select my_agent_ids()) ids)
  select is_admin(auth.uid()) or case p_kind
    when 'bid' then exists (
      select 1 from buyer_bid_drafts d
      left join consultations c on c.id = d.consultation_id
      cross join me
      where d.id = p_offer_id
        and (d.assigned_broker_id = any(me.ids) or c.agent_id = any(me.ids)
             or c.assigned_agent_id = any(me.ids) or c.assigned_broker_id = any(me.ids)))
    when 'proposal' then exists (
      select 1 from broker_offer_proposals p
      left join consultations c on c.id = p.consultation_id
      cross join me
      where p.id = p_offer_id
        and (p.agent_id = any(me.ids) or c.agent_id = any(me.ids)
             or c.assigned_agent_id = any(me.ids) or c.assigned_broker_id = any(me.ids)))
    else false end
$$;
revoke all on function public.can_manage_offer(text, uuid) from public, anon;
grant execute on function public.can_manage_offer(text, uuid) to authenticated;

-- p_status null clears it (back to waiting on HUD). Returns the offer's deal fields.
create or replace function public.set_offer_deal_status(
  p_kind text, p_offer_id uuid, p_status text, p_date date default current_date,
  p_closing_date date default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not can_manage_offer(p_kind, p_offer_id) then
    raise exception 'Only the broker on this offer or an admin can change its deal status.' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('hud_accepted', 'under_contract', 'closed', 'not_accepted', 'fell_through') then
    raise exception 'Unknown deal status: %', p_status using errcode = '22023';
  end if;

  if p_kind = 'bid' then
    update buyer_bid_drafts set deal_status = p_status,
        deal_status_date = case when p_status is null then null else coalesce(p_date, current_date) end,
        closing_date = p_closing_date, deal_note = nullif(trim(p_note), ''), updated_at = now()
      where id = p_offer_id
      returning jsonb_build_object('deal_status', deal_status, 'deal_status_date', deal_status_date,
                                   'closing_date', closing_date, 'deal_note', deal_note) into v;
  else
    update broker_offer_proposals set deal_status = p_status,
        deal_status_date = case when p_status is null then null else coalesce(p_date, current_date) end,
        closing_date = p_closing_date, deal_note = nullif(trim(p_note), ''), updated_at = now()
      where id = p_offer_id
      returning jsonb_build_object('deal_status', deal_status, 'deal_status_date', deal_status_date,
                                   'closing_date', closing_date, 'deal_note', deal_note) into v;
  end if;
  return v;
end $$;
revoke all on function public.set_offer_deal_status(text, uuid, text, date, date, text) from public, anon;
grant execute on function public.set_offer_deal_status(text, uuid, text, date, date, text) to authenticated;

-- The change log now records deal status changes too
create or replace function public.track_offer_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_bid boolean := tg_table_name = 'buyer_bid_drafts';
  fields text[] := case when tg_table_name = 'buyer_bid_drafts'
    then array['status', 'offer_price', 'occupancy', 'financing', 'closing_cost_percent', 'earnest_money', 'notes', 'closing_agent_id',
               'deal_status', 'deal_status_date', 'closing_date', 'deal_note']
    else array['offer_price', 'occupancy', 'financing', 'closing_cost_percent', 'earnest_money',
               'listing_commission_percent', 'buyer_commission_percent', 'broker_message',
               'deal_status', 'deal_status_date', 'closing_date', 'deal_note'] end;
  n jsonb := to_jsonb(new);
  o jsonb;
  diff jsonb := '{}'::jsonb;
  f text;
begin
  if tg_op = 'INSERT' then
    foreach f in array fields loop
      if jsonb_typeof(n -> f) is distinct from 'null' and n ? f then
        diff := diff || jsonb_build_object(f, jsonb_build_object('to', n -> f));
      end if;
    end loop;
  else
    o := to_jsonb(old);
    foreach f in array fields loop
      if (n -> f) is distinct from (o -> f) then
        diff := diff || jsonb_build_object(f, jsonb_build_object('from', o -> f, 'to', n -> f));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;
  end if;
  insert into offer_changes (bid_draft_id, proposal_id, event, changes, changed_by)
  values (case when is_bid then new.id end, case when not is_bid then new.id end,
          case when tg_op = 'INSERT' then 'created' else 'updated' end, diff, auth.uid());
  return new;
end $$;

-- The details page's can_manage now matches who can set the deal status
create or replace function public.get_offer_details(p_kind text, p_offer_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_prop uuid; v_case text; v_cons uuid; v_agent uuid;
begin
  if not can_access_offer_docs(p_kind, p_offer_id::text) then
    return null;
  end if;

  if p_kind = 'bid' then
    select to_jsonb(d) - 'financing_estimate', null, d.case_number, d.consultation_id, d.assigned_broker_id
      into v, v_prop, v_case, v_cons, v_agent
      from buyer_bid_drafts d where d.id = p_offer_id;
  else
    select to_jsonb(p) - 'share_token' - 'financing_estimate', p.property_id, p.case_number, p.consultation_id, p.agent_id
      into v, v_prop, v_case, v_cons, v_agent
      from broker_offer_proposals p where p.id = p_offer_id;
  end if;

  return jsonb_build_object(
    'kind', p_kind,
    'offer', v,
    'property', (select jsonb_build_object('id', pr.id, 'case_number', pr.case_number, 'address', pr.address,
                   'city', pr.city, 'state', pr.state, 'zip_code', pr.zip_code, 'county', pr.county,
                   'price', pr.price, 'beds', pr.beds, 'baths', pr.baths, 'sq_ft', pr.sq_ft,
                   'status', pr.status, 'bid_deadline', pr.bid_deadline, 'hud_url', pr.hud_url,
                   'image', coalesce(pr.main_image, pr.image_url))
                 from properties pr
                 where (v_prop is not null and pr.id = v_prop) or (v_prop is null and pr.case_number = v_case)
                 limit 1),
    'client', (select jsonb_build_object('name', trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, ''))
                   , 'fallback_name', c.customer_name, 'email', coalesce(c.email, c.customer_email),
                   'phone', coalesce(c.phone, c.customer_phone))
               from consultations c where c.id = v_cons),
    'broker', (select jsonb_build_object('name', trim(a.first_name || ' ' || a.last_name), 'email', a.email,
                   'phone', a.phone, 'company', a.company)
               from agents a where a.id = coalesce(v_agent,
                 (select coalesce(c.assigned_agent_id, c.agent_id) from consultations c where c.id = v_cons))),
    'can_manage', can_manage_offer(p_kind, p_offer_id)
  );
end $$;
