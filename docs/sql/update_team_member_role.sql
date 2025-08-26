-- Update team member role (SECURITY DEFINER) to safely bypass RLS
-- Params: p_tenant uuid, p_user uuid, p_role text
create or replace function public.update_team_member_role(
  p_tenant uuid,
  p_user uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tenant is null then
    raise exception 'p_tenant is required';
  end if;
  if p_user is null then
    raise exception 'p_user is required';
  end if;
  if p_role is null then
    raise exception 'p_role is required';
  end if;

  update public.tenant_memberships tm
     set role = p_role
   where tm.tenant_uuid = p_tenant
     and tm.user_id = p_user;

  if not found then
    raise exception 'Membership not found for tenant % and user %', p_tenant, p_user;
  end if;
end;
$$;

revoke all on function public.update_team_member_role(uuid, uuid, text) from public;
-- Allow authenticated clients to execute
grant execute on function public.update_team_member_role(uuid, uuid, text) to authenticated;
