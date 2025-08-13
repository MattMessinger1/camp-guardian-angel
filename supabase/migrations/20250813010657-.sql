-- Overlap detection helper
create or replace function public.child_session_overlap_exists(
  p_child_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns boolean
language plpgsql
stable
set search_path = 'public'
as $$
begin
  if p_start is null or p_end is null then
    return false;
  end if;

  return exists (
    select 1
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    where r.child_id = p_child_id
      and r.status = 'accepted'
      and s.start_at is not null
      and s.end_at is not null
      and p_start < s.end_at
      and p_end > s.start_at
  );
end;
$$;