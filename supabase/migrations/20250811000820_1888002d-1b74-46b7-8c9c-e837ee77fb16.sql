-- Providers table
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text,
  site_url text,
  stripe_connect_id text,
  created_at timestamptz not null default now()
);
alter table public.providers enable row level security;
-- Public readable
drop policy if exists "providers are viewable by everyone (anon)" on public.providers;
create policy "providers are viewable by everyone (anon)" on public.providers for select to anon using (true);
drop policy if exists "providers are viewable by everyone (auth)" on public.providers;
create policy "providers are viewable by everyone (auth)" on public.providers for select to authenticated using (true);

-- Sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.providers(id) on delete cascade,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  location text,
  capacity int,
  upfront_fee_cents int,
  registration_open_at timestamptz,
  high_demand bool not null default false,
  created_at timestamptz not null default now()
);
alter table public.sessions enable row level security;
-- Public readable
drop policy if exists "sessions are viewable by everyone (anon)" on public.sessions;
create policy "sessions are viewable by everyone (anon)" on public.sessions for select to anon using (true);
drop policy if exists "sessions are viewable by everyone (auth)" on public.sessions;
create policy "sessions are viewable by everyone (auth)" on public.sessions for select to authenticated using (true);

-- Registrations table
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  priority_opt_in bool not null default false,
  status text not null check (status in ('pending','confirmed','failed')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  provider_confirmation_id text,
  device_fingerprint text,
  client_ip text,
  unique(child_id, session_id)
);
alter table public.registrations enable row level security;
-- RLS policies for owner-only access
-- SELECT own
drop policy if exists "select_own_registrations" on public.registrations;
create policy "select_own_registrations" on public.registrations for select to authenticated using (auth.uid() = user_id);
-- INSERT own
drop policy if exists "insert_own_registrations" on public.registrations;
create policy "insert_own_registrations" on public.registrations for insert to authenticated with check (auth.uid() = user_id);
-- UPDATE own
drop policy if exists "update_own_registrations" on public.registrations;
create policy "update_own_registrations" on public.registrations for update to authenticated using (auth.uid() = user_id);
-- DELETE own
drop policy if exists "delete_own_registrations" on public.registrations;
create policy "delete_own_registrations" on public.registrations for delete to authenticated using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_sessions_provider_id on public.sessions(provider_id);
create index if not exists idx_registrations_user_id on public.registrations(user_id);
create index if not exists idx_registrations_child_session on public.registrations(child_id, session_id);
