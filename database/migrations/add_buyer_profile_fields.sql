-- Buyer profile: every detail the site's forms ask for lives on the user's profile,
-- so registered buyers get forms pre-filled and can edit it all at /profile.
-- Sign-up details (name, phone, address, state) are copied from the auth metadata,
-- so they are kept even when the account is created before email confirmation.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name           TEXT,
  ADD COLUMN IF NOT EXISTS last_name            TEXT,
  ADD COLUMN IF NOT EXISTS address              TEXT,
  ADD COLUMN IF NOT EXISTS city                 TEXT,
  ADD COLUMN IF NOT EXISTS state                VARCHAR(2),
  ADD COLUMN IF NOT EXISTS zip_code             VARCHAR(10),
  ADD COLUMN IF NOT EXISTS preferred_contact    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS buyer_type           VARCHAR(30),
  ADD COLUMN IF NOT EXISTS experience_level     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS timeline             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS financing_type       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pre_approved         BOOLEAN,
  ADD COLUMN IF NOT EXISTS down_payment         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS credit_score_range   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS price_range_min      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS price_range_max      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS bedrooms             SMALLINT,
  ADD COLUMN IF NOT EXISTS location_preferences TEXT,
  ADD COLUMN IF NOT EXISTS property_condition   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hear_about_us        VARCHAR(30);

-- Split existing full names
UPDATE users SET
  first_name = split_part(trim(name), ' ', 1),
  last_name  = nullif(trim(substr(trim(name), length(split_part(trim(name), ' ', 1)) + 1)), '')
WHERE first_name IS NULL AND coalesce(trim(name), '') <> '';

-- New accounts: keep everything entered at sign-up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fname text := nullif(trim(m->>'first_name'), '');
  lname text := nullif(trim(m->>'last_name'), '');
  full_name text := coalesce(nullif(trim(m->>'full_name'), ''), nullif(trim(coalesce(fname, '') || ' ' || coalesce(lname, '')), ''));
begin
  if fname is null and full_name is not null then
    fname := split_part(full_name, ' ', 1);
    lname := nullif(trim(substr(full_name, length(fname) + 1)), '');
  end if;
  insert into public.users (id, email, name, first_name, last_name, phone, address, state, role)
  values (new.id, new.email, full_name, fname, lname,
          nullif(trim(m->>'phone'), ''),
          nullif(trim(m->>'address'), ''),
          nullif(upper(left(trim(m->>'state'), 2)), ''),
          'end_user')
  on conflict (email) do update set id = excluded.id,
    name       = coalesce(public.users.name, excluded.name),
    first_name = coalesce(public.users.first_name, excluded.first_name),
    last_name  = coalesce(public.users.last_name, excluded.last_name),
    phone      = coalesce(public.users.phone, excluded.phone),
    address    = coalesce(public.users.address, excluded.address),
    state      = coalesce(public.users.state, excluded.state);
  return new;
exception when others then
  return new; -- never block signup
end $$;
