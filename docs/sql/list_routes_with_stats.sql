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
  LEFT JOIN (
    SELECT
      route_id,
      COUNT(*) AS total_stops,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_stops,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_stops
    FROM route_stops
    GROUP BY route_id
  ) rs ON rs.route_id = r.id
  WHERE r.tenant_uuid = p_tenant
  ORDER BY r.created_at DESC;
$$;
