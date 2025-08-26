-- Función RPC para listar todas las rutas de un tenant
-- Esta función permite obtener todas las rutas de un tenant, evitando problemas con RLS
CREATE OR REPLACE FUNCTION list_routes(
  p_tenant UUID
) RETURNS SETOF routes
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con los privilegios del creador de la función
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- Obtener el ID del usuario actual
  v_user_id := auth.uid();
  
  -- Verificar que el usuario esté autenticado
  IF v_user_id IS NULL THEN
    RAISE LOG 'list_routes: Usuario no autenticado';
    RETURN;
  END IF;
  
  -- Verificar que el usuario tenga acceso al tenant
  SELECT role INTO v_user_role
  FROM tenant_memberships
  WHERE tenant_uuid = p_tenant AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE LOG 'list_routes: Usuario % no tiene acceso al tenant %', v_user_id, p_tenant;
    RETURN;
  END IF;
  
  -- Devolver directamente las rutas como un conjunto de resultados
  RETURN QUERY
  SELECT r.*
  FROM routes r
  WHERE r.tenant_uuid = p_tenant
  ORDER BY r.created_at DESC;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'list_routes: Error - %', SQLERRM;
    RETURN;
END;
$$;
