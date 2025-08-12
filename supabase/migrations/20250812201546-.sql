-- Create registration_attempts table
create table if not exists public.registration_attempts (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete set null,
  child_id uuid not null references public.children(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  outcome text not null check (outcome in ('success','failed','captcha_assist','skipped_weekly_limit','skipped_overlap','other')),
  meta jsonb
);

alter table public.registration_attempts enable row level security;

-- Allow users to view attempts for their own children
create policy if not exists "select_own_attempts"
  on public.registration_attempts
  for select
  using (
    exists (
      select 1 from public.children c
      where c.id = registration_attempts.child_id
        and c.user_id = auth.uid()
    )
  );

-- No insert/update/delete policies for regular users (edge functions with service role will perform writes)

-- Helpful index for weekly counting
create index if not exists idx_registration_attempts_child_time
  on public.registration_attempts (child_id, attempted_at);

-- App-wide configuration table
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Config is readable by everyone (no sensitive data)
create policy if not exists "app_config_read"
  on public.app_config
  for select
  using (true);

-- Upsert initial weekly limit configuration
insert into public.app_config (key, value)
values (
  'weekly_child_exec_limit',
  '{"count":5,"week_tz":"America/Chicago","week_basis":"MonSun"}'::jsonb
)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- RPC: get current Mon–Sun week attempts count for a child in a given time zone
create or replace function public.get_attempts_count_week(p_child_id uuid, p_tz text default 'America/Chicago')
returns integer
language plpgsql
stable
as $$
declare
  tz_now timestamp without time zone;
  week_start_local timestamp without time zone;
  week_start_utc timestamptz;
  week_end_utc timestamptz;
  cnt int;
begin
  -- Current time in provided timezone (timestamp without time zone representing local time)
  tz_now := (now() at time zone p_tz);
  -- ISO week starts on Monday; date_trunc('week', ...) returns Monday 00:00 in local time
  week_start_local := date_trunc('week', tz_now);
  -- Convert local week start back to UTC timestamptz
  week_start_utc := (week_start_local at time zone p_tz);
  week_end_utc := week_start_utc + interval '7 days';

  select count(*) into cnt
  from public.registration_attempts ra
  where ra.child_id = p_child_id
    and ra.attempted_at >= week_start_utc
    and ra.attempted_at < week_end_utc;

  return coalesce(cnt, 0);
end;
$$;