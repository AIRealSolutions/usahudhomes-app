-- Applied to production 2026-10-26.
-- Client invitations: admins and brokers email buyers a link to join USAHUDhomes.com.
--
-- A broker's invite carries their agent_id, so the client lands in that broker's
-- leads when they join. An admin's invite has no agent_id: the new member is filed
-- as a lead for the admins (and the usual lead routing), then assigned from there.
--
-- Sending, the /join/:token page and accepting all go through
-- /api/notifications (client-invite, invite-lookup, invite-accept, invite-unsubscribe)
-- with the service key. Signed-in staff only read their own history here.
create table if not exists public.client_invitations (
  id                 uuid primary key default gen_random_uuid(),
  token              uuid not null unique default gen_random_uuid(),
  email              text not null,
  first_name         text,
  last_name          text,
  phone              text,
  state              text,
  note               text,                       -- personal note shown in the email
  invited_by_user_id uuid references auth.users(id) on delete set null,
  invited_by_role    text not null check (invited_by_role in ('admin', 'broker')),
  agent_id           uuid references public.agents(id) on delete set null,  -- null = admin pool
  batch_id           uuid,                       -- one bulk send
  status             text not null default 'sent'
                     check (status in ('sent', 'opened', 'registered', 'failed', 'unsubscribed')),
  send_count         integer not null default 0,
  last_error         text,
  sent_at            timestamptz,
  opened_at          timestamptz,
  registered_at      timestamptz,
  registered_user_id uuid references auth.users(id) on delete set null,
  lead_id            uuid references public.leads(id) on delete set null,
  consultation_id    uuid references public.consultations(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists client_invitations_email_idx on public.client_invitations (lower(email));
create index if not exists client_invitations_agent_idx on public.client_invitations (agent_id, created_at desc);
create index if not exists client_invitations_inviter_idx on public.client_invitations (invited_by_user_id, created_at desc);
comment on table public.client_invitations is 'Emailed invitations to join USAHUDhomes.com; broker invites (agent_id set) assign the new member to that broker.';

alter table public.client_invitations enable row level security;

create policy "Admins read all invitations" on public.client_invitations
  for select to authenticated using (public.is_admin(auth.uid()));

create policy "Brokers read their own invitations" on public.client_invitations
  for select to authenticated
  using (invited_by_user_id = auth.uid() or agent_id in (select public.my_agent_ids()));

revoke all on public.client_invitations from anon;
grant select on public.client_invitations to authenticated;
