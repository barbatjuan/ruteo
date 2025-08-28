-- Reemplaza las paradas de una ruta de forma segura (RLS-safe)
-- Solo Owner/Admin/Dispatcher y cuando la ruta está en estado ('draft','planned','pending')
-- Espera jsonb array en p_stops con: sequence(int), address(text opcional), lat(float), lng(float), client_id(uuid opcional), notes(text opcional)
create or replace function public.update_route_stops_secure(
  p_tenant uuid,
  p_route uuid,
  p_stops jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _status text;
  _rec jsonb;
  _seq int;
  _lat double precision;
  _lng double precision;
  _addr text;
  _client uuid;
  _notes text;
begin
  -- Validación de rol
  if not exists (
    select 1 from tenant_memberships tm
    where tm.user_id = auth.uid()
      and tm.tenant_uuid = p_tenant
      and tm.role in ('Owner','Admin','Dispatcher')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Validación ruta
  select lower(coalesce(status,'draft')) into _status
  from routes r where r.id = p_route and r.tenant_uuid = p_tenant;
  if _status is null then
    raise exception 'Route not found' using errcode = 'P0002';
  end if;
  if _status not in ('draft','planned','pending') then
    raise exception 'Route status not editable' using errcode = 'P0001';
  end if;

  -- Validación básica de estructura
  if jsonb_typeof(p_stops) is distinct from 'array' then
    raise exception 'p_stops must be a JSON array' using errcode = '22P02';
  end if;

  -- Reemplazar: borrar paradas actuales
  delete from route_stops where route_id = p_route and tenant_uuid = p_tenant;

  -- Insertar nuevas paradas
  for _rec in select * from jsonb_array_elements(p_stops) loop
    _seq := coalesce((_rec->>'sequence')::int, null);
    _lat := (_rec->>'lat')::double precision;
    _lng := (_rec->>'lng')::double precision;
    _addr := _rec->>'address';
    _client := nullif(_rec->>'client_id','')::uuid;
    _notes := _rec->>'notes';

    if _seq is null then
      raise exception 'Each stop must have sequence' using errcode = '22P02';
    end if;
    if _lat is null or _lng is null then
      raise exception 'Each stop must have lat/lng' using errcode = '22P02';
    end if;

    insert into route_stops(
      tenant_uuid, route_id, sequence, address, lat, lng, client_id, notes, status
    ) values (
      p_tenant, p_route, _seq, _addr, _lat, _lng, _client, _notes, 'pending'
    );
  end loop;
end;
$$;
