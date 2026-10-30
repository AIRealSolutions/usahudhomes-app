-- Already applied to production on 2026-10-30; recorded here as it ran.

-- Broker access now also covers any broker tied to the client's consultation.
create or replace function public.can_access_offer_docs(p_kind text, p_offer_id text)
returns boolean language sql stable security definer set search_path = public as $$
  with me as (select array(select my_agent_ids()) ids)
  select case p_kind
    when 'bid' then exists (
      select 1 from buyer_bid_drafts d
      left join consultations c on c.id = d.consultation_id
      cross join me
      where d.id::text = p_offer_id
        and ( d.buyer_id = auth.uid()
              or is_admin(auth.uid())
              or d.assigned_broker_id = any(me.ids)
              or c.agent_id = any(me.ids)
              or c.assigned_agent_id = any(me.ids)
              or c.assigned_broker_id = any(me.ids)))
    when 'proposal' then exists (
      select 1 from broker_offer_proposals p
      left join consultations c on c.id = p.consultation_id
      cross join me
      where p.id::text = p_offer_id
        and ( (p.user_id = auth.uid() and p.status <> 'draft')
              or is_admin(auth.uid())
              or p.agent_id = any(me.ids)
              or c.agent_id = any(me.ids)
              or c.assigned_agent_id = any(me.ids)
              or c.assigned_broker_id = any(me.ids)))
    else false end
$$;

-- One call for the details page: offer + property + client + broker, gated by the same check.
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
    'can_manage', is_admin(auth.uid()) or v_agent = any(array(select my_agent_ids()))
  );
end $$;
revoke all on function public.get_offer_details(text, uuid) from public, anon;
grant execute on function public.get_offer_details(text, uuid) to authenticated;
