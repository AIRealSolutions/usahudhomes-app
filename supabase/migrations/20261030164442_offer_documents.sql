-- Already applied to production on 2026-10-30; recorded here as it ran.

-- Bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('offer-documents','offer-documents', false, 15728640,
  array['application/pdf','image/jpeg','image/png','image/heic','image/webp'])
on conflict (id) do nothing;

-- Access helper: kind = 'bid' (buyer_bid_drafts) or 'proposal' (broker_offer_proposals)
create or replace function public.can_access_offer_docs(p_kind text, p_offer_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'bid' then exists (
      select 1 from buyer_bid_drafts d
      where d.id::text = p_offer_id
        and ( d.buyer_id = auth.uid()
              or is_admin(auth.uid())
              or exists (select 1 from agents a
                         where a.id = d.assigned_broker_id
                           and lower(a.email::text) = lower(auth.jwt() ->> 'email'))))
    when 'proposal' then exists (
      select 1 from broker_offer_proposals p
      where p.id::text = p_offer_id
        and ( (p.user_id = auth.uid() and p.status <> 'draft')
              or is_admin(auth.uid())
              or (is_broker_or_admin(auth.uid()) and p.agent_id in (select my_agent_ids()))))
    else false end
$$;
revoke all on function public.can_access_offer_docs(text, text) from public, anon;
grant execute on function public.can_access_offer_docs(text, text) to authenticated;

-- Table
create table public.offer_documents (
  id uuid primary key default gen_random_uuid(),
  bid_draft_id uuid references public.buyer_bid_drafts(id) on delete cascade,
  proposal_id uuid references public.broker_offer_proposals(id) on delete cascade,
  doc_type text not null check (doc_type in ('bid_confirmation','prequalification','earnest_money')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  notes text,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint offer_documents_one_offer check (num_nonnulls(bid_draft_id, proposal_id) = 1)
);
comment on table public.offer_documents is 'Bid confirmations, pre-qualification letters and earnest money copies attached to a buyer-requested offer (buyer_bid_drafts) or broker-suggested offer (broker_offer_proposals). Files live in the private offer-documents bucket at {bid|proposal}/{offer_id}/{doc_type}/{file}.';
create index offer_documents_bid_idx on public.offer_documents(bid_draft_id);
create index offer_documents_proposal_idx on public.offer_documents(proposal_id);

alter table public.offer_documents enable row level security;

create policy "offer parties read documents" on public.offer_documents for select to authenticated
  using ( can_access_offer_docs(case when bid_draft_id is not null then 'bid' else 'proposal' end,
                                coalesce(bid_draft_id, proposal_id)::text) );

create policy "offer parties add documents" on public.offer_documents for insert to authenticated
  with check ( uploaded_by = auth.uid()
    and can_access_offer_docs(case when bid_draft_id is not null then 'bid' else 'proposal' end,
                              coalesce(bid_draft_id, proposal_id)::text) );

create policy "uploader or admin deletes documents" on public.offer_documents for delete to authenticated
  using ( uploaded_by = auth.uid() or is_admin(auth.uid()) );

-- Storage policies
create policy "offer parties read offer files" on storage.objects for select to authenticated
  using ( bucket_id = 'offer-documents'
          and public.can_access_offer_docs((storage.foldername(name))[1], (storage.foldername(name))[2]) );

create policy "offer parties upload offer files" on storage.objects for insert to authenticated
  with check ( bucket_id = 'offer-documents'
          and (storage.foldername(name))[3] in ('bid_confirmation','prequalification','earnest_money')
          and public.can_access_offer_docs((storage.foldername(name))[1], (storage.foldername(name))[2]) );

create policy "uploader or admin deletes offer files" on storage.objects for delete to authenticated
  using ( bucket_id = 'offer-documents'
          and (owner_id = auth.uid()::text or public.is_admin(auth.uid())) );
