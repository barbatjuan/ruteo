-- Supabase SQL: esquema completo para Ruteo (snake_case)
-- Ejecutar en el SQL Editor de Supabase

-- Extensions necesarias (uuid/crypto)
create extension if not exists pgcrypto;

-- =========================================
-- Tablas
-- =========================================

create table if not exists tenants (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key,
  tenant_id text references tenants(id) on delete cascade,
  email text unique not null,
  role text not null default 'user', -- ('owner','admin','user')
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id text references tenants(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists client_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  label text,
  address text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text references tenants(id) on delete cascade,
  name text not null,
  date date,
  notes text,
  status text not null default 'draft', -- ('draft','planned','in_progress','done')
  created_at timestamptz default now()
);

create table if not exists route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_address_id uuid references client_addresses(id) on delete set null,
  sequence integer not null,
  eta timestamptz,
  etc timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  tenant_id text,
  actor text,
  action text,
  entity text,
  entity_id text,
  payload jsonb,
  created_at timestamptz default now()
);

-- =========================================
-- Índices
-- =========================================

create index if not exists idx_users_tenant on users(tenant_id);
create unique index if not exists uniq_users_email on users(email);

create index if not exists idx_clients_tenant on clients(tenant_id);
create index if not exists idx_clients_name on clients(tenant_id, name);

create index if not exists idx_client_addresses_client on client_addresses(client_id);
create index if not exists idx_client_addresses_geo on client_addresses(lat, lng);

create index if not exists idx_routes_tenant on routes(tenant_id);
create index if not exists idx_routes_date on routes(tenant_id, date);

create index if not exists idx_route_stops_route on route_stops(route_id);
create index if not exists idx_route_stops_sequence on route_stops(route_id, sequence);

create index if not exists idx_audit_tenant on audit_log(tenant_id, created_at desc);

-- =========================================
-- Row-Level Security (RLS)
-- Política por cabecera X-Tenant-Id (encaja con VITE_TENANT_MODE=header)
-- Supabase/PostgREST expone cabeceras como GUCs: current_setting('request.headers.<nombre>', true)
-- =========================================

alter table tenants enable row level security;
alter table users enable row level security;
alter table clients enable row level security;
alter table client_addresses enable row level security;
alter table routes enable row level security;
alter table route_stops enable row level security;

-- helper: obtener tenant desde cabecera X-Tenant-Id (en minúsculas en GUC)
create or replace function current_tenant() returns text language sql stable as $$
  select nullif(current_setting('request.headers.x-tenant-id', true), '')
$$;

-- tenants: permite leer solo tu tenant; inserciones/updates vía servicio/owner
create policy tenants_select on tenants
  for select using (id = current_tenant());

-- users: lectura por tenant (inserción/updates/admin vía backend service role)
create policy users_select on users
  for select using (tenant_id = current_tenant());

-- clients
create policy clients_select on clients
  for select using (tenant_id = current_tenant());
create policy clients_insert on clients
  for insert with check (tenant_id = current_tenant());
create policy clients_update on clients
  for update using (tenant_id = current_tenant()) with check (tenant_id = current_tenant());
create policy clients_delete on clients
  for delete using (tenant_id = current_tenant());

-- client_addresses
create policy client_addresses_select on client_addresses
  for select using (
    client_id in (select id from clients where tenant_id = current_tenant())
  );
create policy client_addresses_insert on client_addresses
  for insert with check (
    client_id in (select id from clients where tenant_id = current_tenant())
  );
create policy client_addresses_update on client_addresses
  for update using (
    client_id in (select id from clients where tenant_id = current_tenant())
  ) with check (
    client_id in (select id from clients where tenant_id = current_tenant())
  );
create policy client_addresses_delete on client_addresses
  for delete using (
    client_id in (select id from clients where tenant_id = current_tenant())
  );

-- routes
create policy routes_select on routes
  for select using (tenant_id = current_tenant());
create policy routes_insert on routes
  for insert with check (tenant_id = current_tenant());
create policy routes_update on routes
  for update using (tenant_id = current_tenant()) with check (tenant_id = current_tenant());
create policy routes_delete on routes
  for delete using (tenant_id = current_tenant());

-- route_stops
create policy route_stops_select on route_stops
  for select using (
    route_id in (select id from routes where tenant_id = current_tenant())
  );
create policy route_stops_insert on route_stops
  for insert with check (
    route_id in (select id from routes where tenant_id = current_tenant())
  );
create policy route_stops_update on route_stops
  for update using (
    route_id in (select id from routes where tenant_id = current_tenant())
  ) with check (
    route_id in (select id from routes where tenant_id = current_tenant())
  );
create policy route_stops_delete on route_stops
  for delete using (
    route_id in (select id from routes where tenant_id = current_tenant())
  );

-- =========================================
-- Semillas opcionales
-- =========================================
-- insert into tenants(id, name) values ('acme', 'ACME Inc.') on conflict do nothing;
