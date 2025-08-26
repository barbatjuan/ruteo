-- Función RPC para obtener una ruta por ID
-- Esta función permite obtener una ruta específica por ID, evitando problemas con RLS
-- Útil para verificar que una ruta se ha creado correctamente
CREATE OR REPLACE FUNCTION get_route_by_id(
  p_tenant UUID,
  p_route_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con los privilegios del creador de la función
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_route JSONB;
BEGIN
  -- Obtener el ID del usuario actual
  v_user_id := auth.uid();
  
  -- Verificar que el usuario esté autenticado
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Verificar que el usuario tenga acceso al tenant
  SELECT role INTO v_user_role
  FROM tenant_memberships
  WHERE tenant_uuid = p_tenant AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obtener la ruta
  SELECT jsonb_build_object(
    'id', r.id,
    'tenant_uuid', r.tenant_uuid,
    'name', r.name,
    'date', r.date,
    'status', r.status,
    'assigned_to', r.assigned_to,
    'created_at', r.created_at
  ) INTO v_route
  FROM routes r
  WHERE r.id = p_route_id AND r.tenant_uuid = p_tenant;
  
  RETURN v_route;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
