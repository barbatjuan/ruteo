-- Assign route to driver (SECURITY DEFINER) to safely bypass RLS
-- Params: p_tenant uuid, p_route uuid, p_user uuid (nullable)
-- Updates routes.assigned_to where tenant matches
create or replace function public.assign_route_to_driver(
  p_tenant uuid,
  p_route uuid,
  p_user uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Basic validation
  if p_tenant is null then
    raise exception 'p_tenant is required';
  end if;
  if p_route is null then
    raise exception 'p_route is required';
  end if;

  update public.routes r
     set assigned_to = p_user
   where r.id = p_route
     and r.tenant_uuid = p_tenant;

  if not found then
    raise exception 'Route % not found for tenant %', p_route, p_tenant;
  end if;
end;
$$;

revoke all on function public.assign_route_to_driver(uuid, uuid, uuid) from public;
-- Allow authenticated clients to execute
grant execute on function public.assign_route_to_driver(uuid, uuid, uuid) to authenticated;
