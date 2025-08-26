-- Nueva versión: acepta p_stops como JSONB para evitar ambigüedades y casteos
CREATE OR REPLACE FUNCTION public.create_route_with_stops_v2(
  p_tenant UUID,
  p_route_id UUID,
  p_name TEXT,
  p_date DATE,
  p_status TEXT DEFAULT 'planned',
  p_assigned_to UUID DEFAULT NULL,
  p_stops JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_param_len int := 0;
  v_inserted int := 0;
BEGIN
  -- Auth obligatoria
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- Autorización: Owner/Admin del tenant
  SELECT role INTO v_user_role
  FROM tenant_memberships
  WHERE tenant_uuid = p_tenant AND user_id = v_user_id
  LIMIT 1;

  IF v_user_role NOT IN ('Owner','Admin','Dispatcher') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permisos insuficientes');
  END IF;

  -- Crear ruta
  INSERT INTO routes (
    id, tenant_uuid, name, date, status, assigned_to
  ) VALUES (
    p_route_id, p_tenant, p_name, p_date, COALESCE(p_status, 'planned'), p_assigned_to
  );

  -- Insertar paradas (jsonb)
  v_param_len := COALESCE(jsonb_array_length(p_stops), 0);
  IF v_param_len > 0 THEN
    FOR i IN 0..jsonb_array_length(p_stops) - 1 LOOP
      INSERT INTO route_stops (
        tenant_uuid, route_id, sequence, address, lat, lng, status
      ) VALUES (
        p_tenant,
        p_route_id,
        (p_stops->i->>'sequence')::INTEGER,
        p_stops->i->>'address',
        (p_stops->i->>'lat')::double precision,
        (p_stops->i->>'lng')::double precision,
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

-- Exponer en la API (si usas pgrst db schema: public por defecto)
-- grant execute ya suele venir por defecto; si no:
-- GRANT EXECUTE ON FUNCTION public.create_route_with_stops_v2(UUID, UUID, TEXT, DATE, TEXT, UUID, JSONB) TO anon, authenticated, service_role;
