-- Offer documents section and timeline.
--
-- 1. More document types: the HUD sales contract, addenda, inspection reports,
--    closing papers and anything else, alongside bid confirmations,
--    pre-qualification letters and earnest money copies.
-- 2. offer_changes: every change to an offer's terms, status or documents, written
--    by triggers so nothing that edits an offer (the buyer's bid builder, /api/leads,
--    the SQL editor) can skip it. Each row stores the fields that changed as
--    {field: {from, to}}.
-- 3. get_offer_timeline(): the change log plus the broker-offer event history
--    (sent, opened, accepted...), newest first, for anyone who can open the offer.

-- 1. Document types ---------------------------------------------------------
alter table public.offer_documents drop constraint if exists offer_documents_doc_type_check;
alter table public.offer_documents add constraint offer_documents_doc_type_check check (doc_type in (
  'bid_confirmation', 'prequalification', 'earnest_money',
  'sales_contract', 'addendum', 'inspection', 'closing', 'other'));

drop policy if exists "offer parties upload offer files" on storage.objects;
create policy "offer parties upload offer files" on storage.objects for insert to authenticated
  with check ( bucket_id = 'offer-documents'
          and (storage.foldername(name))[3] in ('bid_confirmation', 'prequalification', 'earnest_money',
                'sales_contract', 'addendum', 'inspection', 'closing', 'other')
          and public.can_access_offer_docs((storage.foldername(name))[1], (storage.foldername(name))[2]) );

-- 2. Change log -------------------------------------------------------------
create table if not exists public.offer_changes (
  id bigint generated always as identity primary key,
  bid_draft_id uuid references public.buyer_bid_drafts(id) on delete cascade,
  proposal_id uuid references public.broker_offer_proposals(id) on delete cascade,
  event text not null check (event in ('created', 'updated', 'document_added', 'document_removed')),
  -- {field: {from, to}}; 'created' rows carry only "to"
  changes jsonb not null default '{}'::jsonb,
  -- Documents: {document_id, doc_type, file_name}
  detail jsonb,
  -- Null when the server made the change with the service key (broker offers go through /api/leads)
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint offer_changes_one_offer check (num_nonnulls(bid_draft_id, proposal_id) = 1)
);
create index if not exists offer_changes_bid_idx on public.offer_changes (bid_draft_id, created_at);
create index if not exists offer_changes_proposal_idx on public.offer_changes (proposal_id, created_at);
comment on table public.offer_changes is 'Audit trail for buyer_bid_drafts and broker_offer_proposals: term, status and document changes, written by triggers.';

alter table public.offer_changes enable row level security;
create policy "offer parties read offer changes" on public.offer_changes for select to authenticated
  using ( public.can_access_offer_docs(case when bid_draft_id is not null then 'bid' else 'proposal' end,
                                       coalesce(bid_draft_id, proposal_id)::text) );
grant select on public.offer_changes to authenticated;

-- Broker-offer status changes are already told by broker_offer_proposal_events
-- (with the buyer's notes), so proposals track terms only.
create or replace function public.track_offer_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_bid boolean := tg_table_name = 'buyer_bid_drafts';
  fields text[] := case when tg_table_name = 'buyer_bid_drafts'
    then array['status', 'offer_price', 'occupancy', 'financing', 'closing_cost_percent', 'earnest_money', 'notes', 'closing_agent_id']
    else array['offer_price', 'occupancy', 'financing', 'closing_cost_percent', 'earnest_money',
               'listing_commission_percent', 'buyer_commission_percent', 'broker_message'] end;
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
revoke all on function public.track_offer_change() from public, anon, authenticated;

drop trigger if exists track_offer_change_trigger on public.buyer_bid_drafts;
create trigger track_offer_change_trigger after insert or update on public.buyer_bid_drafts
  for each row execute function public.track_offer_change();
drop trigger if exists track_offer_change_trigger on public.broker_offer_proposals;
create trigger track_offer_change_trigger after insert or update on public.broker_offer_proposals
  for each row execute function public.track_offer_change();

create or replace function public.track_offer_document()
returns trigger language plpgsql security definer set search_path = public as $$
declare d offer_documents;
begin
  if tg_op = 'DELETE' then
    d := old;
    -- Deleting the offer cascades to its documents; there's no offer left to log against
    if d.bid_draft_id is not null and not exists (select 1 from buyer_bid_drafts where id = d.bid_draft_id) then return old; end if;
    if d.proposal_id is not null and not exists (select 1 from broker_offer_proposals where id = d.proposal_id) then return old; end if;
  else
    d := new;
  end if;
  insert into offer_changes (bid_draft_id, proposal_id, event, detail, changed_by)
  values (d.bid_draft_id, d.proposal_id,
          case when tg_op = 'DELETE' then 'document_removed' else 'document_added' end,
          jsonb_build_object('document_id', d.id, 'doc_type', d.doc_type, 'file_name', d.file_name),
          auth.uid());
  return null;
end $$;
revoke all on function public.track_offer_document() from public, anon, authenticated;

drop trigger if exists track_offer_document_trigger on public.offer_documents;
create trigger track_offer_document_trigger after insert or delete on public.offer_documents
  for each row execute function public.track_offer_document();

-- Offers made before this log existed start with a 'created' entry at their creation time
insert into public.offer_changes (bid_draft_id, event, created_at)
select d.id, 'created', d.created_at from public.buyer_bid_drafts d
where not exists (select 1 from public.offer_changes c where c.bid_draft_id = d.id);
insert into public.offer_changes (proposal_id, event, created_at)
select p.id, 'created', p.created_at from public.broker_offer_proposals p
where not exists (select 1 from public.offer_changes c where c.proposal_id = p.id);

-- 3. Timeline ---------------------------------------------------------------
-- Proposal 'created'/'edited' events are left out: the change log tells those with the fields.
create or replace function public.get_offer_timeline(p_kind text, p_offer_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not can_access_offer_docs(p_kind, p_offer_id::text) then null else coalesce((
    select jsonb_agg(item order by at desc, id desc) from (
      select c.created_at at, 'c' || c.id id, jsonb_build_object(
          'id', 'c' || c.id, 'source', 'change', 'event', c.event, 'changes', c.changes, 'detail', c.detail,
          'at', c.created_at,
          'actor', coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), nullif(u.name, ''), u.email)) item
        from offer_changes c left join users u on u.id = c.changed_by
        where (p_kind = 'bid' and c.bid_draft_id = p_offer_id) or (p_kind = 'proposal' and c.proposal_id = p_offer_id)
      union all
      select e.created_at, 'e' || e.id, jsonb_build_object(
          'id', 'e' || e.id, 'source', 'event', 'event', e.event, 'note', e.note, 'actor_role', e.actor, 'at', e.created_at)
        from broker_offer_proposal_events e
        where p_kind = 'proposal' and e.proposal_id = p_offer_id and e.event not in ('created', 'edited')
    ) t), '[]'::jsonb) end
$$;
revoke all on function public.get_offer_timeline(text, uuid) from public, anon;
grant execute on function public.get_offer_timeline(text, uuid) to authenticated;
