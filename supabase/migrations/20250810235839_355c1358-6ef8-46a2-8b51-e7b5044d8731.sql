-- Create children table storing only tokenized info
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  info_token text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.children enable row level security;

-- Recreate policies idempotently
drop policy if exists "select_own_children" on public.children;
create policy "select_own_children"
  on public.children for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "insert_own_children" on public.children;
create policy "insert_own_children"
  on public.children for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "update_own_children" on public.children;
create policy "update_own_children"
  on public.children for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "delete_own_children" on public.children;
create policy "delete_own_children"
  on public.children for delete
  to authenticated
  using (auth.uid() = user_id);

-- Helpful index
create index if not exists idx_children_user_id on public.children(user_id);
