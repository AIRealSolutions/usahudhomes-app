-- Applied to production 2026-10-03.
-- Enable RLS on public.users and close role-escalation holes.

alter table public.users enable row level security;

-- Inserts only for the signed-in user's own row (the on_auth_user_created
-- trigger creates profiles at signup, bypassing RLS).
alter policy "Allow public insert for signup" on public.users
  to authenticated with check (id = auth.uid());
create policy "Users can create own profile" on public.users
  for insert to authenticated with check (id = auth.uid());

revoke all on public.users from anon;
revoke truncate, references, trigger on public.users from authenticated;

-- These triggers are SECURITY DEFINER, so current_user is the owner, never
-- anon/authenticated. Check the caller's JWT role instead.
create or replace function public.users_protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') in ('anon', 'authenticated')
     and not public.is_admin(auth.uid()) then
    new.role := old.role;
  end if;
  return new;
end $$;

-- Fires before users_before_insert (alphabetical), which has the same
-- current_user bug.
create or replace function public.users_guard_insert_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin(auth.uid()) then
    new.role := coalesce((select u.role from public.users u where lower(u.email) = lower(new.email) limit 1), 'end_user');
  end if;
  return new;
end $$;
create trigger users_a_guard_insert_role before insert on public.users
  for each row execute function public.users_guard_insert_role();
