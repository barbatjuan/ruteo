-- Routes in progress for given tenant and date with next pending stop and ETAs
-- Returns one row per route in status 'in_progress' (or 'planned' with pending stops),
-- including next pending stop (by lowest sequence) and ETA fields.
create or replace function public.routes_in_progress_with_next_stop(
  p_tenant uuid,
  p_date date
)
returns table (
  route_id uuid,
  route_name text,
  assigned_to uuid,
  status text,
  next_stop_id uuid,
  next_stop_sequence integer,
  next_stop_address text,
  next_stop_eta timestamptz,
  estimated_return timestamptz
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select r.id as route_id,
           r.name as route_name,
           r.assigned_to,
           r.status
    from public.routes r
    where r.tenant_uuid = p_tenant
      and r.date = p_date
      and r.status in ('planned','in_progress')
  ), next_pending as (
    select rs.route_id,
           rs.id as next_stop_id,
           rs.sequence as next_stop_sequence,
           coalesce(rs.address, '') as next_stop_address,
           rs.eta as next_stop_eta
    from public.route_stops rs
    join base b on b.route_id = rs.route_id
    where rs.status = 'pending'
      and rs.tenant_uuid = p_tenant
      and (rs.sequence) in (
        select min(rs2.sequence) from public.route_stops rs2 where rs2.route_id = rs.route_id and rs2.status = 'pending'
      )
  ), last_eta as (
    -- take the latest etc (estimated time complete/return) among stops of the route, if any
    select rs.route_id,
           max(rs.etc) as estimated_return
    from public.route_stops rs
    join base b on b.route_id = rs.route_id
    group by rs.route_id
  )
  select b.route_id,
         b.route_name,
         b.assigned_to,
         b.status,
         np.next_stop_id,
         np.next_stop_sequence,
         np.next_stop_address,
         np.next_stop_eta,
         le.estimated_return
  from base b
  left join next_pending np on np.route_id = b.route_id
  left join last_eta le on le.route_id = b.route_id
  order by b.status desc, np.next_stop_sequence nulls last, b.route_name asc;
$$;

revoke all on function public.routes_in_progress_with_next_stop(uuid, date) from public;
grant execute on function public.routes_in_progress_with_next_stop(uuid, date) to authenticated;
