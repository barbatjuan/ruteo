-- Extend tenants table with company location fields and provide RPCs to get/update them
-- Run this in Supabase SQL editor. Safe to run multiple times.

-- Add columns if not exist
alter table if exists tenants add column if not exists company_address text;
alter table if exists tenants add column if not exists company_formatted_address text;
alter table if exists tenants add column if not exists company_lat double precision;
alter table if exists tenants add column if not exists company_lng double precision;

-- Helper function: ensure only admins/owners can update tenant details
create or replace function is_admin_for_tenant(p_tenant uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from tenant_memberships m
    where m.user_id = auth.uid()
      and m.tenant_uuid = p_tenant
      and m.role in ('Owner','Admin')
  );
$$;

-- Get company details for a tenant
create or replace function get_tenant_company_details(p_tenant uuid)
returns table (
  tenant_uuid uuid,
  name text,
  company_address text,
  company_formatted_address text,
  company_lat double precision,
  company_lng double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select t.uuid_id as tenant_uuid,
         t.name,
         t.company_address,
         t.company_formatted_address,
         t.company_lat,
         t.company_lng
  from tenants t
  where t.uuid_id = p_tenant
$$;

-- Update company details (and optionally name) for a tenant
create or replace function update_tenant_company_details(
  p_tenant uuid,
  p_name text,
  p_company_address text,
  p_company_formatted_address text,
  p_company_lat double precision,
  p_company_lng double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin_for_tenant(p_tenant) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update tenants set
    name = coalesce(p_name, name),
    company_address = p_company_address,
    company_formatted_address = p_company_formatted_address,
    company_lat = p_company_lat,
    company_lng = p_company_lng
  where uuid_id = p_tenant;
end;
$$;
