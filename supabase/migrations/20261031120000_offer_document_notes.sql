-- Notes on offer documents: anyone who can open the offer (the buyer, their broker,
-- admins) can leave notes on any uploaded file, as a running thread under it.
-- The note typed at upload time stays on offer_documents.notes and shows first.

create table if not exists public.offer_document_notes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.offer_documents(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Filled by the trigger below so the thread reads without joining users
  author_name text,
  created_at timestamptz not null default now()
);
create index if not exists offer_document_notes_document_idx on public.offer_document_notes (document_id, created_at);
comment on table public.offer_document_notes is 'Notes left on an offer document by the buyer, their broker or an admin.';

-- Same gate as the document itself
create or replace function public.can_access_offer_document(p_document_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from offer_documents d
    where d.id = p_document_id
      and can_access_offer_docs(case when d.bid_draft_id is not null then 'bid' else 'proposal' end,
                                coalesce(d.bid_draft_id, d.proposal_id)::text))
$$;
revoke all on function public.can_access_offer_document(uuid) from public, anon;
grant execute on function public.can_access_offer_document(uuid) to authenticated;

create or replace function public.set_offer_document_note_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  new.body := trim(new.body);
  select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), nullif(u.name, ''), u.email)
    into new.author_name from users u where u.id = new.author_id;
  new.author_name := coalesce(new.author_name, auth.jwt() ->> 'email');
  return new;
end $$;
revoke all on function public.set_offer_document_note_author() from public, anon, authenticated;

drop trigger if exists set_offer_document_note_author_trigger on public.offer_document_notes;
create trigger set_offer_document_note_author_trigger before insert on public.offer_document_notes
  for each row execute function public.set_offer_document_note_author();

alter table public.offer_document_notes enable row level security;

drop policy if exists "offer parties read document notes" on public.offer_document_notes;
create policy "offer parties read document notes" on public.offer_document_notes for select to authenticated
  using ( public.can_access_offer_document(document_id) );

drop policy if exists "offer parties add document notes" on public.offer_document_notes;
create policy "offer parties add document notes" on public.offer_document_notes for insert to authenticated
  with check ( author_id = auth.uid() and public.can_access_offer_document(document_id) );

drop policy if exists "author or admin deletes document notes" on public.offer_document_notes;
create policy "author or admin deletes document notes" on public.offer_document_notes for delete to authenticated
  using ( author_id = auth.uid() or public.is_admin(auth.uid()) );

grant select, insert, delete on public.offer_document_notes to authenticated;
