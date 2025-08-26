-- Tabla para nombres visibles por tenant/usuario
create table if not exists team_member_profiles (
  tenant_uuid uuid not null references tenants(uuid_id) on delete cascade,
  user_id uuid not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (tenant_uuid, user_id)
);

alter table team_member_profiles enable row level security;

-- RLS: sólo admins/owners del tenant pueden ver/editar
create policy tmp_select on team_member_profiles
  for select using (
    tenant_uuid::uuid = current_tenant() and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = team_member_profiles.tenant_uuid and m.role in ('Owner','Admin')
    )
  );
create policy tmp_insert on team_member_profiles
  for insert with check (
    tenant_uuid::uuid = current_tenant() and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = team_member_profiles.tenant_uuid and m.role in ('Owner','Admin')
    )
  );
create policy tmp_update on team_member_profiles
  for update using (
    tenant_uuid::uuid = current_tenant() and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = team_member_profiles.tenant_uuid and m.role in ('Owner','Admin')
    )
  ) with check (
    tenant_uuid::uuid = current_tenant() and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = team_member_profiles.tenant_uuid and m.role in ('Owner','Admin')
    )
  );

-- Trigger updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;
create trigger team_member_profiles_set_updated
  before update on team_member_profiles
  for each row execute function set_updated_at();

-- RPC: upsert display name
create or replace function public.upsert_team_member_name(
  p_tenant uuid,
  p_user uuid,
  p_name text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into team_member_profiles(tenant_uuid, user_id, display_name)
  values (p_tenant, p_user, nullif(trim(p_name), ''))
  on conflict (tenant_uuid, user_id)
  do update set display_name = excluded.display_name, updated_at = now();
end; $$;

-- RPC: list team with profiles
create or replace function public.list_team_members_with_profiles(
  p_tenant uuid
) returns table (
  user_id uuid,
  role text,
  created_at timestamptz,
  display_name text
) language sql
security definer
set search_path = public
as $$
  select m.user_id, m.role, m.created_at, p.display_name
  from tenant_memberships m
  left join team_member_profiles p
    on p.tenant_uuid = m.tenant_uuid and p.user_id = m.user_id
  where m.tenant_uuid = p_tenant
  order by m.created_at asc;
$$;
