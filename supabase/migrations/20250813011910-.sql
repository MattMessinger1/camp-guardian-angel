-- Fix ambiguous reference to session_id inside allocate_registrations by qualifying column names
CREATE OR REPLACE FUNCTION public.allocate_registrations(p_max_sessions integer DEFAULT 5)
RETURNS TABLE(session_id uuid, accepted uuid[], rejected uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_session_id uuid;
  v_capacity int;
  v_allocated int;
  v_available int;
  v_pending_ids uuid[];
  v_accept_ids uuid[];
  v_reject_ids uuid[];
begin
  for i in 1..coalesce(p_max_sessions, 5) loop
    v_session_id := null;
    -- Lock one session with pending registrations and open time reached
    select s.id, s.capacity
    into v_session_id, v_capacity
    from public.sessions s
    where s.registration_open_at is not null
      and s.registration_open_at <= now()
      and exists (
        select 1 from public.registrations r
        where r.session_id = s.id and r.status = 'pending'
      )
    order by s.registration_open_at asc
    for update skip locked
    limit 1;

    if v_session_id is null then
      exit; -- nothing to process
    end if;

    select count(*) into v_allocated
    from public.registrations r
    where r.session_id = v_session_id and r.status = 'accepted';

    if v_capacity is null then
      v_available := 2147483647; -- effectively unlimited
    else
      v_available := greatest(v_capacity - v_allocated, 0);
    end if;

    select array_agg(r.id order by r.priority_opt_in desc, r.requested_at asc)
    into v_pending_ids
    from public.registrations r
    where r.session_id = v_session_id and r.status = 'pending';

    if v_pending_ids is null or array_length(v_pending_ids, 1) is null then
      continue; -- no pending (race), move on
    end if;

    if v_available <= 0 then
      v_accept_ids := array[]::uuid[];
      v_reject_ids := v_pending_ids;
      update public.registrations r
        set status = 'failed', processed_at = now()
      where r.id = any(v_reject_ids);
    else
      -- Accept up to available capacity
      v_accept_ids := (
        select coalesce(array_agg(t.id), array[]::uuid[])
        from (
          select r.id from public.registrations r
          where r.session_id = v_session_id and r.status = 'pending'
          order by r.priority_opt_in desc, r.requested_at asc
          limit v_available
        ) t
      );

      update public.registrations r
        set status = 'accepted', processed_at = now()
      where r.id = any(v_accept_ids);

      -- Fail the rest of the pending ones for this session
      v_reject_ids := (
        select coalesce(array_agg(r.id), array[]::uuid[])
        from public.registrations r
        where r.session_id = v_session_id and r.status = 'pending'
          and not (r.id = any(v_accept_ids))
      );

      if array_length(v_reject_ids, 1) is not null then
        update public.registrations r
          set status = 'failed', processed_at = now()
        where r.id = any(v_reject_ids);
      end if;
    end if;

    session_id := v_session_id;
    accepted := coalesce(v_accept_ids, array[]::uuid[]);
    rejected := coalesce(v_reject_ids, array[]::uuid[]);
    return next;
  end loop;
  return;
end;
$function$;