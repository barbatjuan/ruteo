-- Lista rutas del conductor (v2) para una fecha, excluyendo paradas que coinciden con la ubicación de la empresa (~50m)
-- Devuelve totales ya filtrados para mostrarlos correctamente en la vista del Driver
create or replace function public.list_driver_routes_v2(
  p_tenant uuid,
  p_date date
) returns table (
  id uuid,
  date date,
  name text,
  status text,
  created_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  assigned_to uuid,
  total_stops int,
  completed_stops int
)
language sql
security definer
set search_path = public
as $$
  with company as (
    select company_lat, company_lng from tenants t where t.uuid_id = p_tenant
  ), stops_agg as (
    select s.route_id,
      count(*) filter (
        where not (
          (select company_lat from company) is not null
          and (select company_lng from company) is not null
          and abs(s.lat - (select company_lat from company)) < 0.0005
          and abs(s.lng - (select company_lng from company)) < 0.0005
        )
      ) as total_filtered,
      count(*) filter (
        where s.status = 'completed' and not (
          (select company_lat from company) is not null
          and (select company_lng from company) is not null
          and abs(s.lat - (select company_lat from company)) < 0.0005
          and abs(s.lng - (select company_lng from company)) < 0.0005
        )
      ) as completed_filtered
    from route_stops s
    where s.tenant_uuid = p_tenant
    group by s.route_id
  )
  select r.id, r.date, r.name, r.status, r.created_at, r.started_at, r.finished_at, r.assigned_to,
         coalesce(sa.total_filtered, 0) as total_stops,
         coalesce(sa.completed_filtered, 0) as completed_stops
  from routes r
  left join stops_agg sa on sa.route_id = r.id
  where r.tenant_uuid = p_tenant
    and r.date = p_date
    and (r.assigned_to = auth.uid())
  order by r.created_at desc;
$$;
