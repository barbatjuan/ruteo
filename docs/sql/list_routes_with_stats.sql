-- Devuelve rutas con totales de paradas por estado (evita RLS con SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.list_routes_with_stats(
  p_tenant uuid
) RETURNS TABLE (
  id uuid,
  tenant_uuid uuid,
  name text,
  date date,
  status text,
  assigned_to uuid,
  created_at timestamptz,
  total_stops integer,
  pending_stops integer,
  completed_stops integer
) LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.tenant_uuid,
    r.name,
    r.date,
    r.status,
    r.assigned_to,
    r.created_at,
    COALESCE(rs.total_stops, 0) AS total_stops,
    COALESCE(rs.pending_stops, 0) AS pending_stops,
    COALESCE(rs.completed_stops, 0) AS completed_stops
  FROM routes r
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (
        WHERE NOT (
          t.company_lat IS NOT NULL AND t.company_lng IS NOT NULL AND
          abs(rs.lat - t.company_lat) < 0.0005 AND abs(rs.lng - t.company_lng) < 0.0005
        )
      ) AS total_stops,
      COUNT(*) FILTER (
        WHERE rs.status = 'pending' AND NOT (
          t.company_lat IS NOT NULL AND t.company_lng IS NOT NULL AND
          abs(rs.lat - t.company_lat) < 0.0005 AND abs(rs.lng - t.company_lng) < 0.0005
        )
      ) AS pending_stops,
      COUNT(*) FILTER (
        WHERE rs.status = 'completed' AND NOT (
          t.company_lat IS NOT NULL AND t.company_lng IS NOT NULL AND
          abs(rs.lat - t.company_lat) < 0.0005 AND abs(rs.lng - t.company_lng) < 0.0005
        )
      ) AS completed_stops
    FROM route_stops rs
    JOIN tenants t ON t.uuid_id = r.tenant_uuid
    WHERE rs.route_id = r.id
  ) rs ON TRUE
  WHERE r.tenant_uuid = p_tenant
  ORDER BY r.created_at DESC;
$$;
