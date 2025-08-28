-- Eliminar ruta de forma segura (RLS-safe) solo para Owner/Admin/Dispatcher
-- y solo cuando la ruta está en estado permitido ('draft','planned','pending')
-- Borra paradas en cascada. SECURITY DEFINER para evitar bloqueos RLS legítimos.
create or replace function public.delete_route_secure(
  p_tenant uuid,
  p_route uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validar que el usuario pertenece al tenant y tiene rol permitido
  if not exists (
    select 1 from tenant_memberships tm
    where tm.user_id = auth.uid()
      and tm.tenant_uuid = p_tenant
      and tm.role in ('Owner','Admin','Dispatcher')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Validar que la ruta pertenece al tenant y está en estado permitido
  if not exists (
    select 1 from routes r
    where r.id = p_route and r.tenant_uuid = p_tenant
      and lower(coalesce(r.status,'draft')) in ('draft','planned','pending')
  ) then
    raise exception 'Route not found or status not eligible for deletion' using errcode = 'P0002';
  end if;

  -- Borrar paradas primero (por compatibilidad si ON DELETE no está en todas las columnas)
  delete from route_stops where route_id = p_route and tenant_uuid = p_tenant;
  -- Borrar ruta
  delete from routes where id = p_route and tenant_uuid = p_tenant;
end;
$$;
