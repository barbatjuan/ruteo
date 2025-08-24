-- Resolve tenant UUID from a legacy slug
-- Usage: select get_tenant_uuid('acme');
-- Create as SECURITY DEFINER to allow public to resolve mapping without exposing table details

create or replace function public.get_tenant_uuid(slug_in text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select t.uuid_id::text
  from public.tenants t
  where t.slug = slug_in
  limit 1;
$$;

-- Grant execute to anon/authenticated
revoke all on function public.get_tenant_uuid(text) from public;
grant execute on function public.get_tenant_uuid(text) to anon, authenticated;
