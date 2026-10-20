-- Personal reminders shown in the dashboard Market News feed and on the calendar
-- (admin Control Panel and broker Overview). Each user sees only their own.
-- Applied to production 2026-10-20.
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  notes text,
  due_date date not null default current_date,
  case_number text,
  consultation_id uuid references public.consultations(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reminders_user_open_idx on public.reminders (user_id, due_date) where completed_at is null;
comment on table public.reminders is 'Personal to-do reminders for the dashboard feed and calendar; Done sets completed_at, Tomorrow moves due_date.';

alter table public.reminders enable row level security;
create policy "Users manage their own reminders" on public.reminders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
