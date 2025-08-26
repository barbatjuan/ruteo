-- Devuelve el conteo de paradas de una ruta (evita RLS mediante SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.count_stops_for_route(
  p_tenant uuid,
  p_route uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Contar paradas por route_id. Las RLS de route_stops validan que el route pertenezca al tenant actual
  -- mediante la política que consulta la tabla routes y current_tenant().
  SELECT count(*) INTO v_count
  FROM route_stops rs
  WHERE rs.route_id = p_route;

  RETURN v_count;
END;
$$;

-- Opcional: permisos
-- GRANT EXECUTE ON FUNCTION public.count_stops_for_route(uuid, uuid) TO anon, authenticated, service_role;
