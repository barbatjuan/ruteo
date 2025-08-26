-- Dashboard aggregated stats for a given tenant and date (SECURITY DEFINER)
-- Params: p_tenant uuid, p_date date (YYYY-MM-DD)
-- Returns: routes_today int, in_progress int, stops_total_today int, stops_pending_today int, drivers_active_today int
create or replace function public.dashboard_stats(
  p_tenant uuid,
  p_date date
)
returns table (
  routes_today int,
  in_progress int,
  stops_total_today int,
  stops_pending_today int,
  drivers_active_today int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- routes today by route.date
  select count(*) into routes_today
    from public.routes r
   where r.tenant_uuid = p_tenant
     and r.date = p_date;

  -- in progress (planned or in_progress) on p_date
  select count(*) into in_progress
    from public.routes r
   where r.tenant_uuid = p_tenant
     and r.date = p_date
     and r.status in ('planned', 'in_progress');

  -- stops today using route.date instead of created_at to avoid TZ issues
  select count(rs.id) into stops_total_today
    from public.route_stops rs
    join public.routes r on r.id = rs.route_id and r.tenant_uuid = p_tenant
   where r.date = p_date;

  -- pending stops today
  select count(rs.id) into stops_pending_today
    from public.route_stops rs
    join public.routes r on r.id = rs.route_id and r.tenant_uuid = p_tenant
   where r.date = p_date
     and rs.status = 'pending';

  -- distinct drivers assigned to routes of the day
  select count(distinct r.assigned_to) into drivers_active_today
    from public.routes r
   where r.tenant_uuid = p_tenant
     and r.date = p_date
     and r.assigned_to is not null;

  return next;
end;
$$;

revoke all on function public.dashboard_stats(uuid, date) from public;
-- Allow authenticated clients to execute
grant execute on function public.dashboard_stats(uuid, date) to authenticated;
