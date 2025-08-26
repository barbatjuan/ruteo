-- Limpieza de sobrecargas anteriores (evita ambigüedad PGRST203)
DROP FUNCTION IF EXISTS create_route_with_stops(
  UUID, UUID, TEXT, DATE, TEXT, UUID, JSONB
);
DROP FUNCTION IF EXISTS create_route_with_stops(
  UUID, UUID, TEXT, DATE, TEXT, UUID, TEXT
);

-- Función RPC para crear una ruta con sus paradas
-- Esta función permite crear una ruta y sus paradas en una sola transacción
-- Evita problemas con RLS al usar SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_route_with_stops(
  p_tenant UUID,
  p_route_id UUID,
  p_name TEXT,
  p_date DATE,
  p_status TEXT DEFAULT 'planned',
  p_assigned_to UUID DEFAULT NULL,
  p_stops TEXT DEFAULT '[]'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con los privilegios del creador de la función
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_result JSONB;
  v_param_len int := 0;
  v_inserted int := 0;
BEGIN
  -- Obtener el ID del usuario actual
  v_user_id := auth.uid();
  
  -- Verificar que el usuario esté autenticado
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;
  
  -- Verificar que el usuario tenga rol Owner o Admin en el tenant
  SELECT role INTO v_user_role
  FROM tenant_memberships
  WHERE tenant_uuid = p_tenant AND user_id = v_user_id;
  
  IF v_user_role IS NULL OR (v_user_role != 'Owner' AND v_user_role != 'Admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permisos insuficientes. Se requiere rol Owner o Admin');
  END IF;
  
  -- Crear la ruta
  INSERT INTO routes (
    id,
    tenant_uuid,
    name,
    date,
    status,
    assigned_to
  ) VALUES (
    p_route_id,
    p_tenant,
    p_name,
    p_date,
    p_status,
    p_assigned_to
  );
  
  -- Crear las paradas si existen
  v_param_len := coalesce(jsonb_array_length(p_stops::jsonb), 0);
  IF v_param_len > 0 THEN
    -- Insertar cada parada del array JSON
    FOR i IN 0..jsonb_array_length(p_stops::jsonb) - 1 LOOP
      INSERT INTO route_stops (
        tenant_uuid,
        route_id,
        sequence,
        address,
        lat,
        lng,
        status
      ) VALUES (
        p_tenant,
        p_route_id,
        ((p_stops::jsonb)->i->>'sequence')::INTEGER,
        (p_stops::jsonb)->i->>'address',
        ((p_stops::jsonb)->i->>'lat')::double precision,
        ((p_stops::jsonb)->i->>'lng')::double precision,
        'pending'
      );
      v_inserted := v_inserted + 1;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'route_id', p_route_id,
    'stops_param_len', v_param_len,
    'stops_inserted', v_inserted
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
