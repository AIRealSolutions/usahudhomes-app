-- Applied to production 2026-10-26.
-- Nationwide Agent Referral Program: licensed agents anywhere in the U.S. refer a
-- buyer to Lightkeeper Realty for a North Carolina HUD home purchase, and their
-- brokerage is paid 15% of the buyer-side commission Lightkeeper actually receives,
-- capped at $2,500, only when the sale closes.
--
-- This is the INBOUND direction. It is separate from the existing public.referrals /
-- public.referral_agreements tables, which send USAHUDhomes leads OUT to partner
-- agents in `agents`. Referring agents are NOT added to `agents`, so they never enter
-- lead routing. They link to their existing login through referral_agents.user_id.
--
-- A referral is open: it covers any NC HUD home the buyer goes under contract on
-- within the 1-year protection period that starts when Lightkeeper accepts it.
--
-- Writes by referring agents go only through the security-definer functions below
-- (register, submit, sign/attach agreement). Status, commission and payment fields
-- are admin-only. Every change is recorded in buyer_referral_events.

-- ── Brokerages and referring agents ──────────────────────────────────────────
create table if not exists public.referral_brokerages (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  state                   char(2) not null,
  firm_license_number     text,
  broker_in_charge_name   text,
  email                   text,
  phone                   text,
  address                 text,
  verification_status     text not null default 'pending'
                          check (verification_status in ('pending', 'verified', 'rejected', 'suspended')),
  verified_by             uuid references auth.users(id) on delete set null,
  verified_at             timestamptz,
  license_expires_on      date,
  verification_notes      text,                 -- admin only (agents cannot read this table's notes via the UI)
  w9_status               text not null default 'not_received' check (w9_status in ('not_received', 'received')),
  payment_setup_status    text not null default 'not_started' check (payment_setup_status in ('not_started', 'on_file')),
  created_by              uuid references auth.users(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
comment on table public.referral_brokerages is 'Out-of-state (or NC) brokerages that refer NC HUD buyers to Lightkeeper Realty and receive the referral fee. No bank details are stored.';

create table if not exists public.referral_agents (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  brokerage_id            uuid not null references public.referral_brokerages(id) on delete restrict,
  first_name              text not null,
  last_name               text not null,
  email                   text not null,
  phone                   text,
  license_number          text not null,
  license_state           char(2) not null,
  status                  text not null default 'pending'
                          check (status in ('pending', 'verified', 'rejected', 'suspended')),
  verified_by             uuid references auth.users(id) on delete set null,
  verified_at             timestamptz,
  rejection_reason        text,
  program_terms_version   text not null,
  program_terms_agreed_at timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists referral_agents_brokerage_idx on public.referral_agents (brokerage_id);
comment on table public.referral_agents is 'Licensed agents who refer buyers into the Lightkeeper NC HUD referral program; one per login.';

-- ── Referrals ────────────────────────────────────────────────────────────────
create table if not exists public.buyer_referrals (
  id                        uuid primary key default gen_random_uuid(),
  referral_agent_id         uuid not null references public.referral_agents(id) on delete restrict,
  brokerage_id              uuid not null references public.referral_brokerages(id) on delete restrict,
  buyer_first_name          text not null,
  buyer_last_name           text not null,
  buyer_email               text,
  buyer_phone               text,
  nc_area                   text,              -- city, county, or "anywhere in NC"
  relationship              text,              -- family, friend, past client...
  notes                     text,
  other_agency_status       text not null default 'none'
                            check (other_agency_status in ('none', 'yes', 'unknown')),
  consent_given             boolean not null check (consent_given),
  consent_text              text not null,
  consent_at                timestamptz not null default now(),
  status                    text not null default 'submitted'
                            check (status in ('submitted', 'needs_review', 'accepted', 'declined', 'represented',
                                              'under_contract', 'closed', 'canceled', 'expired')),
  possible_duplicate        boolean not null default false,
  decline_reason            text,              -- shown to the referring agent
  accepted_at               timestamptz,
  protection_ends_at        timestamptz,       -- accepted_at + 1 year
  declined_at               timestamptz,
  other_agency_reviewed_at  timestamptz,       -- admin confirmed any existing buyer agency was reviewed
  represented_at            timestamptz,
  under_contract_at         timestamptz,
  contract_property_id      uuid references public.properties(id) on delete set null,
  contract_case_number      text,
  contract_price            numeric(12,2),
  closed_at                 timestamptz,
  canceled_at               timestamptz,
  lead_id                   uuid references public.leads(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint buyer_referrals_contact_required check (coalesce(buyer_email, '') <> '' or coalesce(buyer_phone, '') <> '')
);
create index if not exists buyer_referrals_agent_idx on public.buyer_referrals (referral_agent_id, created_at desc);
create index if not exists buyer_referrals_status_idx on public.buyer_referrals (status, created_at desc);
create index if not exists buyer_referrals_email_idx on public.buyer_referrals (lower(buyer_email));
comment on table public.buyer_referrals is 'Open buyer referrals from referring agents to Lightkeeper Realty for NC HUD purchases; covers any home under contract within the 1-year protection period.';

-- ── Agreements ───────────────────────────────────────────────────────────────
-- One per accepted referral. Executed by e-signature on both sides, or by a signed
-- PDF upload (from either side) that Lightkeeper confirms.
create table if not exists public.buyer_referral_agreements (
  id                          uuid primary key default gen_random_uuid(),
  referral_id                 uuid not null unique references public.buyer_referrals(id) on delete cascade,
  brokerage_id                uuid not null references public.referral_brokerages(id) on delete restrict,
  referral_pct                numeric(5,4) not null default 0.15 check (referral_pct > 0 and referral_pct <= 1),
  fee_cap                     numeric(10,2) not null default 2500 check (fee_cap >= 0),
  protection_months           integer not null default 12 check (protection_months > 0),
  effective_at                timestamptz not null,
  protection_ends_at          timestamptz not null,
  agreement_version           text not null,
  agreement_text              text not null,
  status                      text not null default 'awaiting_referring'
                              check (status in ('awaiting_referring', 'awaiting_lightkeeper', 'executed', 'void')),
  method                      text check (method in ('esign', 'pdf')),
  -- Referring brokerage attestations (section 5 legal requirements)
  attest_buyer_disclosure     boolean not null default false,
  attest_no_nc_activity       boolean not null default false,
  attest_firm_eligible        boolean not null default false,
  referring_signer_name       text,
  referring_signer_title      text,
  referring_signed_at         timestamptz,
  referring_signed_by         uuid references auth.users(id) on delete set null,
  lightkeeper_signer_name     text,
  lightkeeper_signed_at       timestamptz,
  lightkeeper_signed_by       uuid references auth.users(id) on delete set null,
  document_path               text,            -- referral-agreements bucket: {brokerage_id}/{agreement_id}/file.pdf
  document_uploaded_by        uuid references auth.users(id) on delete set null,
  document_uploaded_at        timestamptz,
  executed_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- ── Payments ─────────────────────────────────────────────────────────────────
create table if not exists public.buyer_referral_payments (
  id                    uuid primary key default gen_random_uuid(),
  referral_id           uuid not null references public.buyer_referrals(id) on delete restrict,
  agreement_id          uuid not null references public.buyer_referral_agreements(id) on delete restrict,
  brokerage_id          uuid not null references public.referral_brokerages(id) on delete restrict,
  property_id           uuid references public.properties(id) on delete set null,
  case_number           text,
  sale_price            numeric(12,2) not null check (sale_price > 0),
  closing_date          date not null,
  commission_received   numeric(12,2) not null check (commission_received >= 0),
  referral_pct          numeric(5,4) not null,   -- copied from the agreement
  fee_cap               numeric(10,2) not null,  -- copied from the agreement
  fee_amount            numeric(10,2) generated always as (least(round(commission_received * referral_pct, 2), fee_cap)) stored,
  status                text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'void')),
  approved_by           uuid references auth.users(id) on delete set null,
  approved_at           timestamptz,
  paid_at               timestamptz,
  payment_method        text,
  payment_reference     text,                    -- check number / confirmation
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists buyer_referral_payments_referral_idx on public.buyer_referral_payments (referral_id);

-- ── Audit history (admin only) ───────────────────────────────────────────────
create table if not exists public.buyer_referral_events (
  id            uuid primary key default gen_random_uuid(),
  referral_id   uuid references public.buyer_referrals(id) on delete cascade,
  brokerage_id  uuid references public.referral_brokerages(id) on delete cascade,
  entity        text not null,     -- brokerage | agent | referral | agreement | payment | note
  entity_id     uuid,
  event_type    text not null,
  from_value    text,
  to_value      text,
  details       jsonb,
  actor_id      uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists buyer_referral_events_referral_idx on public.buyer_referral_events (referral_id, created_at desc);
create index if not exists buyer_referral_events_brokerage_idx on public.buyer_referral_events (brokerage_id, created_at desc);
comment on table public.buyer_referral_events is 'Audit history for the agent buyer referral program, including duplicate matches and admin notes.';

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.my_referral_agent_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.referral_agents where user_id = auth.uid()
$$;

create or replace function public.my_referral_brokerage_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select brokerage_id from public.referral_agents where user_id = auth.uid()
$$;

create or replace function public.referral_digits(p text)
returns text language sql immutable as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10), '')
$$;

create or replace function public.touch_buyer_referral_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger referral_brokerages_touch before update on public.referral_brokerages
  for each row execute function public.touch_buyer_referral_updated_at();
create trigger referral_agents_touch before update on public.referral_agents
  for each row execute function public.touch_buyer_referral_updated_at();
create trigger buyer_referrals_touch before update on public.buyer_referrals
  for each row execute function public.touch_buyer_referral_updated_at();
create trigger buyer_referral_agreements_touch before update on public.buyer_referral_agreements
  for each row execute function public.touch_buyer_referral_updated_at();
create trigger buyer_referral_payments_touch before update on public.buyer_referral_payments
  for each row execute function public.touch_buyer_referral_updated_at();

-- ── Business rules on referrals ──────────────────────────────────────────────
create or replace function public.buyer_referral_status_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'accepted' then
        new.accepted_at := coalesce(new.accepted_at, now());
        new.protection_ends_at := coalesce(new.protection_ends_at, new.accepted_at + interval '1 year');
      when 'declined' then
        new.declined_at := coalesce(new.declined_at, now());
      when 'represented' then
        if not exists (select 1 from public.buyer_referral_agreements a
                       where a.referral_id = new.id and a.status = 'executed') then
          raise exception 'The referral agreement must be executed before representation begins';
        end if;
        if new.other_agency_status <> 'none' and new.other_agency_reviewed_at is null then
          raise exception 'Review the buyer''s existing agency agreement before representation begins';
        end if;
        new.represented_at := coalesce(new.represented_at, now());
      when 'under_contract' then
        new.under_contract_at := coalesce(new.under_contract_at, now());
        if new.protection_ends_at is not null and new.under_contract_at > new.protection_ends_at then
          raise exception 'This contract falls after the protection period ended on %', new.protection_ends_at::date;
        end if;
      when 'closed' then
        new.closed_at := coalesce(new.closed_at, now());
      when 'canceled' then
        new.canceled_at := coalesce(new.canceled_at, now());
      else null;
    end case;
  end if;
  return new;
end $$;

create trigger buyer_referrals_status_rules before update on public.buyer_referrals
  for each row execute function public.buyer_referral_status_rules();

-- Agreement becomes executed once both sides have signed (or a signed PDF is on file
-- and Lightkeeper confirmed it) and the referring brokerage attestations are made.
create or replace function public.buyer_referral_agreement_rules()
returns trigger language plpgsql as $$
begin
  if new.status <> 'void' then
    if new.lightkeeper_signed_at is not null
       and (new.referring_signed_at is not null or new.document_path is not null)
       and new.attest_buyer_disclosure and new.attest_no_nc_activity and new.attest_firm_eligible then
      new.status := 'executed';
      new.executed_at := coalesce(new.executed_at, now());
    elsif new.referring_signed_at is not null or new.document_path is not null then
      new.status := 'awaiting_lightkeeper';
    else
      new.status := 'awaiting_referring';
    end if;
  end if;
  return new;
end $$;

create trigger buyer_referral_agreements_rules before insert or update on public.buyer_referral_agreements
  for each row execute function public.buyer_referral_agreement_rules();

-- Payments: copy terms from the agreement; fee is owed only on a closed, covered
-- transaction to a verified brokerage.
create or replace function public.buyer_referral_payment_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a public.buyer_referral_agreements;
  r public.buyer_referrals;
  b public.referral_brokerages;
begin
  select * into a from public.buyer_referral_agreements where id = new.agreement_id;
  select * into r from public.buyer_referrals where id = new.referral_id;
  if a.referral_id is distinct from new.referral_id then
    raise exception 'Agreement does not belong to this referral';
  end if;
  new.brokerage_id := r.brokerage_id;
  if tg_op = 'INSERT' then
    new.referral_pct := a.referral_pct;
    new.fee_cap := a.fee_cap;
  end if;

  if new.status in ('approved', 'paid') then
    select * into b from public.referral_brokerages where id = r.brokerage_id;
    if a.status <> 'executed' then
      raise exception 'No fee is payable without an executed referral agreement';
    end if;
    if r.status <> 'closed' then
      raise exception 'No fee is payable until the transaction is closed';
    end if;
    if b.verification_status <> 'verified' then
      raise exception 'Only a verified brokerage can receive a referral fee';
    end if;
    if r.under_contract_at is null or r.under_contract_at > a.protection_ends_at then
      raise exception 'The contract is not within the agreement''s protection period';
    end if;
    new.approved_at := coalesce(new.approved_at, now());
    new.approved_by := coalesce(new.approved_by, auth.uid());
  end if;
  if new.status = 'paid' then
    new.paid_at := coalesce(new.paid_at, now());
  end if;
  return new;
end $$;

create trigger buyer_referral_payments_rules before insert or update on public.buyer_referral_payments
  for each row execute function public.buyer_referral_payment_rules();

-- ── Audit triggers ───────────────────────────────────────────────────────────
create or replace function public.log_buyer_referral_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'buyer_referrals' then
    if tg_op = 'INSERT' then
      insert into public.buyer_referral_events (referral_id, brokerage_id, entity, entity_id, event_type, to_value)
      values (new.id, new.brokerage_id, 'referral', new.id, 'submitted', new.status);
    elsif new.status is distinct from old.status then
      insert into public.buyer_referral_events (referral_id, brokerage_id, entity, entity_id, event_type, from_value, to_value, details)
      values (new.id, new.brokerage_id, 'referral', new.id, 'status', old.status, new.status,
              jsonb_strip_nulls(jsonb_build_object('decline_reason', new.decline_reason,
                'contract_case_number', new.contract_case_number, 'contract_price', new.contract_price)));
    end if;
  elsif tg_table_name = 'buyer_referral_agreements' then
    if tg_op = 'INSERT' or new.status is distinct from old.status or new.document_path is distinct from old.document_path then
      insert into public.buyer_referral_events (referral_id, brokerage_id, entity, entity_id, event_type, from_value, to_value, details)
      values (new.referral_id, new.brokerage_id, 'agreement', new.id,
              case when tg_op = 'INSERT' then 'created' else 'status' end,
              case when tg_op = 'UPDATE' then old.status end, new.status,
              jsonb_strip_nulls(jsonb_build_object('method', new.method, 'document_path', new.document_path)));
    end if;
  elsif tg_table_name = 'buyer_referral_payments' then
    if tg_op = 'INSERT' or new.status is distinct from old.status
       or new.commission_received is distinct from old.commission_received or new.sale_price is distinct from old.sale_price then
      insert into public.buyer_referral_events (referral_id, brokerage_id, entity, entity_id, event_type, from_value, to_value, details)
      values (new.referral_id, new.brokerage_id, 'payment', new.id,
              case when tg_op = 'INSERT' then 'created' else 'updated' end,
              case when tg_op = 'UPDATE' then old.status end, new.status,
              jsonb_build_object('sale_price', new.sale_price, 'commission_received', new.commission_received,
                                 'fee_amount', new.fee_amount, 'payment_reference', new.payment_reference));
    end if;
  elsif tg_table_name = 'referral_brokerages' then
    if tg_op = 'UPDATE' and new.verification_status is distinct from old.verification_status then
      insert into public.buyer_referral_events (brokerage_id, entity, entity_id, event_type, from_value, to_value)
      values (new.id, 'brokerage', new.id, 'verification', old.verification_status, new.verification_status);
    end if;
  elsif tg_table_name = 'referral_agents' then
    if tg_op = 'INSERT' then
      insert into public.buyer_referral_events (brokerage_id, entity, entity_id, event_type, to_value)
      values (new.brokerage_id, 'agent', new.id, 'registered', new.status);
    elsif new.status is distinct from old.status then
      insert into public.buyer_referral_events (brokerage_id, entity, entity_id, event_type, from_value, to_value)
      values (new.brokerage_id, 'agent', new.id, 'verification', old.status, new.status);
    end if;
  end if;
  return null;
end $$;

create trigger buyer_referrals_audit after insert or update on public.buyer_referrals
  for each row execute function public.log_buyer_referral_change();
create trigger buyer_referral_agreements_audit after insert or update on public.buyer_referral_agreements
  for each row execute function public.log_buyer_referral_change();
create trigger buyer_referral_payments_audit after insert or update on public.buyer_referral_payments
  for each row execute function public.log_buyer_referral_change();
create trigger referral_brokerages_audit after update on public.referral_brokerages
  for each row execute function public.log_buyer_referral_change();
create trigger referral_agents_audit after insert or update on public.referral_agents
  for each row execute function public.log_buyer_referral_change();

-- ── Agent-facing functions ───────────────────────────────────────────────────
create or replace function public.register_referral_agent(
  p_first_name text, p_last_name text, p_phone text,
  p_license_number text, p_license_state text,
  p_brokerage_name text, p_brokerage_state text, p_firm_license_number text,
  p_broker_in_charge_name text, p_brokerage_email text, p_brokerage_phone text, p_brokerage_address text,
  p_terms_version text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_brokerage uuid;
  v_agent uuid;
  v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.referral_agents where user_id = auth.uid()) then
    raise exception 'You are already registered for the referral program';
  end if;
  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = ''
     or coalesce(trim(p_license_number), '') = '' or coalesce(trim(p_brokerage_name), '') = '' then
    raise exception 'Name, license number and brokerage are required';
  end if;

  insert into public.referral_brokerages (name, state, firm_license_number, broker_in_charge_name, email, phone, address, created_by)
  values (trim(p_brokerage_name), upper(p_brokerage_state), nullif(trim(p_firm_license_number), ''),
          nullif(trim(p_broker_in_charge_name), ''), nullif(trim(p_brokerage_email), ''),
          nullif(trim(p_brokerage_phone), ''), nullif(trim(p_brokerage_address), ''), auth.uid())
  returning id into v_brokerage;

  insert into public.referral_agents (user_id, brokerage_id, first_name, last_name, email, phone,
                                      license_number, license_state, program_terms_version)
  values (auth.uid(), v_brokerage, trim(p_first_name), trim(p_last_name), v_email, nullif(trim(p_phone), ''),
          trim(p_license_number), upper(p_license_state), p_terms_version)
  returning id into v_agent;

  insert into public.notifications (user_id, type, title, message, link)
  select u.id, 'referral_agent_registered', 'New referral agent registration',
         trim(p_first_name) || ' ' || trim(p_last_name) || ' (' || upper(p_license_state) || ') — ' || trim(p_brokerage_name),
         '/admin'
  from public.users u where u.role = 'admin';

  return v_agent;
end $$;

create or replace function public.submit_buyer_referral(
  p_first_name text, p_last_name text, p_email text, p_phone text,
  p_nc_area text, p_relationship text, p_notes text, p_other_agency_status text,
  p_consent_given boolean, p_consent_text text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  ag public.referral_agents;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := public.referral_digits(p_phone);
  v_matches jsonb;
  v_id uuid;
begin
  select * into ag from public.referral_agents where user_id = auth.uid();
  if ag.id is null then raise exception 'Register for the referral program first'; end if;
  if ag.status <> 'verified'
     or (select verification_status from public.referral_brokerages where id = ag.brokerage_id) <> 'verified' then
    raise exception 'Your license and brokerage must be verified before you can refer buyers';
  end if;
  if not coalesce(p_consent_given, false) then
    raise exception 'The buyer must agree to be contacted before you submit a referral';
  end if;

  -- Possible duplicates / existing Lightkeeper clients. Stored only in the admin audit log.
  select coalesce(jsonb_agg(m), '[]'::jsonb) into v_matches from (
    select 'user' as source, id::text as id from public.users
      where (v_email is not null and lower(email) = v_email) or (v_phone is not null and public.referral_digits(phone) = v_phone)
    union all
    select 'lead', id::text from public.leads
      where (v_email is not null and lower(email) = v_email) or (v_phone is not null and public.referral_digits(phone) = v_phone)
    union all
    select 'consultation', id::text from public.consultations
      where coalesce(is_deleted, false) = false and (
            (v_email is not null and (lower(customer_email) = v_email or lower(email) = v_email))
         or (v_phone is not null and (public.referral_digits(customer_phone) = v_phone or public.referral_digits(phone) = v_phone)))
    union all
    select 'customer', id::text from public.customers
      where (v_email is not null and lower(email) = v_email) or (v_phone is not null and public.referral_digits(phone) = v_phone)
    union all
    select 'buyer_referral', id::text from public.buyer_referrals
      where status not in ('declined', 'canceled', 'expired') and (
            (v_email is not null and lower(buyer_email) = v_email)
         or (v_phone is not null and public.referral_digits(buyer_phone) = v_phone))
    limit 25
  ) m;

  insert into public.buyer_referrals (referral_agent_id, brokerage_id, buyer_first_name, buyer_last_name,
      buyer_email, buyer_phone, nc_area, relationship, notes, other_agency_status,
      consent_given, consent_text, status, possible_duplicate)
  values (ag.id, ag.brokerage_id, trim(p_first_name), trim(p_last_name), v_email, nullif(trim(p_phone), ''),
          nullif(trim(p_nc_area), ''), nullif(trim(p_relationship), ''), nullif(trim(p_notes), ''),
          coalesce(p_other_agency_status, 'unknown'), true, p_consent_text,
          case when jsonb_array_length(v_matches) > 0 then 'needs_review' else 'submitted' end,
          jsonb_array_length(v_matches) > 0)
  returning id into v_id;

  if jsonb_array_length(v_matches) > 0 then
    insert into public.buyer_referral_events (referral_id, brokerage_id, entity, entity_id, event_type, details)
    values (v_id, ag.brokerage_id, 'referral', v_id, 'possible_duplicate', jsonb_build_object('matches', v_matches));
  end if;

  insert into public.notifications (user_id, type, title, message, link)
  select u.id, 'buyer_referral_submitted', 'New agent buyer referral',
         ag.first_name || ' ' || ag.last_name || ' referred ' || trim(p_first_name) || ' ' || trim(p_last_name)
           || case when jsonb_array_length(v_matches) > 0 then ' (possible duplicate)' else '' end,
         '/admin'
  from public.users u where u.role = 'admin';

  return v_id;
end $$;

-- Referring broker e-signs (p_document_path null) or attaches a signed PDF already
-- uploaded to the referral-agreements bucket under {brokerage_id}/{agreement_id}/.
create or replace function public.sign_buyer_referral_agreement(
  p_agreement_id uuid, p_signer_name text, p_signer_title text,
  p_attest_buyer_disclosure boolean, p_attest_no_nc_activity boolean, p_attest_firm_eligible boolean,
  p_document_path text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  a public.buyer_referral_agreements;
begin
  select a2.* into a from public.buyer_referral_agreements a2
    join public.buyer_referrals r on r.id = a2.referral_id
   where a2.id = p_agreement_id and r.referral_agent_id in (select public.my_referral_agent_ids());
  if a.id is null then raise exception 'Agreement not found'; end if;
  if a.status not in ('awaiting_referring', 'awaiting_lightkeeper') then
    raise exception 'This agreement can no longer be signed';
  end if;
  if not (coalesce(p_attest_buyer_disclosure, false) and coalesce(p_attest_no_nc_activity, false)
          and coalesce(p_attest_firm_eligible, false)) then
    raise exception 'All three confirmations are required';
  end if;

  if p_document_path is not null then
    if split_part(p_document_path, '/', 1) <> a.brokerage_id::text or split_part(p_document_path, '/', 2) <> a.id::text then
      raise exception 'Invalid document location';
    end if;
    update public.buyer_referral_agreements set
      method = 'pdf', document_path = p_document_path, document_uploaded_by = auth.uid(), document_uploaded_at = now(),
      referring_signer_name = nullif(trim(p_signer_name), ''), referring_signer_title = nullif(trim(p_signer_title), ''),
      attest_buyer_disclosure = true, attest_no_nc_activity = true, attest_firm_eligible = true
    where id = a.id;
  else
    if coalesce(trim(p_signer_name), '') = '' then raise exception 'Type your full legal name to sign'; end if;
    update public.buyer_referral_agreements set
      method = coalesce(method, 'esign'),
      referring_signer_name = trim(p_signer_name), referring_signer_title = nullif(trim(p_signer_title), ''),
      referring_signed_at = now(), referring_signed_by = auth.uid(),
      attest_buyer_disclosure = true, attest_no_nc_activity = true, attest_firm_eligible = true
    where id = a.id;
  end if;

  insert into public.notifications (user_id, type, title, message, link)
  select u.id, 'buyer_referral_agreement_signed', 'Referral agreement ready to countersign',
         coalesce(nullif(trim(p_signer_name), ''), 'The referring broker') || ' signed a buyer referral agreement', '/admin'
  from public.users u where u.role = 'admin';
end $$;

-- ── Admin functions ──────────────────────────────────────────────────────────
-- Accept a referral: start the protection period, create the agreement for signing,
-- and file the buyer as a lead in Lightkeeper's existing pipeline.
create or replace function public.accept_buyer_referral(
  p_referral_id uuid, p_agreement_version text, p_agreement_text text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  r public.buyer_referrals;
  v_lead uuid;
  v_agreement uuid;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admins only'; end if;
  select * into r from public.buyer_referrals where id = p_referral_id for update;
  if r.id is null then raise exception 'Referral not found'; end if;
  if r.status not in ('submitted', 'needs_review') then
    raise exception 'Only a new referral can be accepted';
  end if;

  update public.buyer_referrals set status = 'accepted' where id = r.id
    returning * into r;

  insert into public.buyer_referral_agreements (referral_id, brokerage_id, effective_at, protection_ends_at,
      agreement_version, agreement_text)
  values (r.id, r.brokerage_id, r.accepted_at, r.protection_ends_at, p_agreement_version, p_agreement_text)
  returning id into v_agreement;

  if r.lead_id is null then
    insert into public.leads (first_name, last_name, email, phone, state, preferred_location, source, status,
                              message, source_details)
    values (r.buyer_first_name, r.buyer_last_name, coalesce(r.buyer_email, ''), r.buyer_phone, 'NC', r.nc_area,
            'agent_referral', 'new_lead', r.notes,
            jsonb_build_object('buyer_referral_id', r.id,
              'referred_by', (select first_name || ' ' || last_name from public.referral_agents where id = r.referral_agent_id),
              'brokerage', (select name || ' (' || state || ')' from public.referral_brokerages where id = r.brokerage_id)))
    returning id into v_lead;
    update public.buyer_referrals set lead_id = v_lead where id = r.id;
  end if;

  insert into public.notifications (user_id, type, title, message, link)
  select ag.user_id, 'buyer_referral_accepted', 'Referral accepted',
         'Lightkeeper Realty accepted your referral of ' || r.buyer_first_name || ' ' || r.buyer_last_name
           || '. Please sign the referral agreement.', '/agent-referrals'
  from public.referral_agents ag where ag.id = r.referral_agent_id;

  return v_agreement;
end $$;

-- Notify the referring agent of status changes made by admins.
create or replace function public.notify_buyer_referral_agent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('declined', 'represented', 'under_contract', 'closed', 'canceled') then
    insert into public.notifications (user_id, type, title, message, link)
    select ag.user_id, 'buyer_referral_status', 'Referral update',
           new.buyer_first_name || ' ' || new.buyer_last_name || ': ' || replace(new.status, '_', ' '), '/agent-referrals'
    from public.referral_agents ag where ag.id = new.referral_agent_id;
  end if;
  return null;
end $$;

create trigger buyer_referrals_notify after update on public.buyer_referrals
  for each row execute function public.notify_buyer_referral_agent();

-- ── Row level security ───────────────────────────────────────────────────────
alter table public.referral_brokerages       enable row level security;
alter table public.referral_agents           enable row level security;
alter table public.buyer_referrals           enable row level security;
alter table public.buyer_referral_agreements enable row level security;
alter table public.buyer_referral_payments   enable row level security;
alter table public.buyer_referral_events     enable row level security;

create policy "Admins manage referral brokerages" on public.referral_brokerages
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Agents read their brokerage" on public.referral_brokerages
  for select to authenticated using (id in (select public.my_referral_brokerage_ids()));

create policy "Admins manage referral agents" on public.referral_agents
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Agents read their own registration" on public.referral_agents
  for select to authenticated using (user_id = auth.uid());

create policy "Admins manage buyer referrals" on public.buyer_referrals
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Agents read their own referrals" on public.buyer_referrals
  for select to authenticated using (referral_agent_id in (select public.my_referral_agent_ids()));

create policy "Admins manage referral agreements" on public.buyer_referral_agreements
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Agents read their referral agreements" on public.buyer_referral_agreements
  for select to authenticated using (referral_id in (
    select id from public.buyer_referrals where referral_agent_id in (select public.my_referral_agent_ids())));

create policy "Admins manage referral payments" on public.buyer_referral_payments
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Agents read their referral payments" on public.buyer_referral_payments
  for select to authenticated using (referral_id in (
    select id from public.buyer_referrals where referral_agent_id in (select public.my_referral_agent_ids())));

create policy "Admins read referral events" on public.buyer_referral_events
  for select to authenticated using (public.is_admin(auth.uid()));
create policy "Admins add referral notes" on public.buyer_referral_events
  for insert to authenticated with check (public.is_admin(auth.uid()));

revoke all on public.referral_brokerages, public.referral_agents, public.buyer_referrals,
              public.buyer_referral_agreements, public.buyer_referral_payments, public.buyer_referral_events from anon;
grant select, insert, update, delete on public.referral_brokerages, public.referral_agents, public.buyer_referrals,
              public.buyer_referral_agreements, public.buyer_referral_payments to authenticated;
grant select, insert on public.buyer_referral_events to authenticated;

revoke execute on function public.register_referral_agent(text, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.submit_buyer_referral(text, text, text, text, text, text, text, text, boolean, text) from public, anon;
revoke execute on function public.sign_buyer_referral_agreement(uuid, text, text, boolean, boolean, boolean, text) from public, anon;
revoke execute on function public.accept_buyer_referral(uuid, text, text) from public, anon;
grant execute on function public.register_referral_agent(text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_buyer_referral(text, text, text, text, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.sign_buyer_referral_agreement(uuid, text, text, boolean, boolean, boolean, text) to authenticated;
grant execute on function public.accept_buyer_referral(uuid, text, text) to authenticated;

-- ── Private storage for agreements ───────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('referral-agreements', 'referral-agreements', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "admins manage referral agreement files" on storage.objects
  for all to authenticated
  using (bucket_id = 'referral-agreements' and public.is_admin(auth.uid()))
  with check (bucket_id = 'referral-agreements' and public.is_admin(auth.uid()));

create policy "agents read own brokerage referral agreement files" on storage.objects
  for select to authenticated
  using (bucket_id = 'referral-agreements'
         and (storage.foldername(name))[1] in (select id::text from public.my_referral_brokerage_ids() as id));

create policy "agents upload signed referral agreements" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'referral-agreements'
    and exists (select 1 from public.buyer_referral_agreements a
                join public.buyer_referrals r on r.id = a.referral_id
                where a.brokerage_id::text = (storage.foldername(objects.name))[1]
                  and a.id::text = (storage.foldername(objects.name))[2]
                  and a.status in ('awaiting_referring', 'awaiting_lightkeeper')
                  and r.referral_agent_id in (select public.my_referral_agent_ids())));
