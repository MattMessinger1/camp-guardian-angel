-- Update function to set search_path for security hygiene
create or replace function public.get_attempts_count_week(p_child_id uuid, p_tz text default 'America/Chicago')
returns integer
language plpgsql
stable
set search_path = 'public'
as $$
declare
  tz_now timestamp without time zone;
  week_start_local timestamp without time zone;
  week_start_utc timestamptz;
  week_end_utc timestamptz;
  cnt int;
begin
  tz_now := (now() at time zone p_tz);
  week_start_local := date_trunc('week', tz_now);
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