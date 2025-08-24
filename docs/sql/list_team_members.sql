-- RPC segura para listar miembros del equipo con email/nombre desde auth.users
-- Ejecutar en el SQL Editor de Supabase

create or replace function public.list_team_members(p_tenant uuid)
returns table (
  user_id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo Owner/Admin del tenant pueden listar
  if not exists (
    select 1
    from tenant_memberships m2
    where m2.user_id = auth.uid()
      and m2.tenant_uuid = p_tenant
      and m2.role in ('Owner','Admin')
  ) then
    raise exception 'not authorized';
  end if;

  return query
    select
      m.user_id,
      u.email,
      coalesce((u.raw_user_meta_data->>'name'), u.email) as name,
      m.role,
      m.created_at,
      'active'::text as status
    from tenant_memberships m
    left join auth.users u on u.id = m.user_id
    where m.tenant_uuid = p_tenant
    order by m.created_at asc;
end;
$$;

grant execute on function public.list_team_members(uuid) to anon, authenticated;
