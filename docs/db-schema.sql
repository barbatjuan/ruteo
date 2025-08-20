-- Supabase SQL: esquema completo para Ruteo (snake_case)
-- Ejecutar en el SQL Editor de Supabase

-- Extensions necesarias (uuid/crypto)
create extension if not exists pgcrypto;

-- =========================================
-- Tablas
-- =========================================

create table if not exists tenants (
  uuid_id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  plan text not null default 'Free',
  created_at timestamptz default now()
);

-- RELACIÓN usuario↔tenant con rol (usa auth.users)
create table if not exists tenant_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_uuid uuid not null references tenants(uuid_id) on delete cascade,
  role text not null check (role in ('Owner','Admin','Dispatcher','Driver')),
  created_at timestamptz default now(),
  primary key (user_id, tenant_uuid)
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  tenant_uuid uuid references tenants(uuid_id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists client_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_uuid uuid references tenants(uuid_id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  label text,
  address text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  tenant_uuid uuid references tenants(uuid_id) on delete cascade,
  name text not null,
  date date,
  notes text,
  status text not null default 'draft', -- ('draft','planned','in_progress','done')
  assigned_to uuid, -- user_id del driver asignado
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- Idempotent migrations in case routes existed previously without new columns
alter table routes add column if not exists assigned_to uuid;
alter table routes add column if not exists status text not null default 'draft';
alter table routes add column if not exists started_at timestamptz;
alter table routes add column if not exists finished_at timestamptz;

create table if not exists route_stops (
  id uuid primary key default gen_random_uuid(),
  tenant_uuid uuid references tenants(uuid_id) on delete cascade,
  route_id uuid references routes(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_address_id uuid references client_addresses(id) on delete set null,
  sequence integer not null,
  address text,
  lat double precision,
  lng double precision,
  status text not null default 'pending', -- ('pending','completed','skipped')
  arrived_at timestamptz,
  completed_at timestamptz,
  eta timestamptz,
  etc timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Idempotent migrations in case route_stops existed previously without new columns
alter table route_stops add column if not exists tenant_uuid uuid;
alter table route_stops add column if not exists client_address_id uuid;
alter table route_stops add column if not exists address text;
alter table route_stops add column if not exists lat double precision;
alter table route_stops add column if not exists lng double precision;
alter table route_stops add column if not exists status text not null default 'pending';
alter table route_stops add column if not exists arrived_at timestamptz;
alter table route_stops add column if not exists completed_at timestamptz;
alter table route_stops add column if not exists eta timestamptz;
alter table route_stops add column if not exists etc timestamptz;
alter table route_stops add column if not exists notes text;

create table if not exists audit_log (
  id bigserial primary key,
  tenant_uuid uuid,
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

create index if not exists idx_tenant_memberships_tenant on tenant_memberships(tenant_uuid);
create index if not exists idx_tenant_memberships_user on tenant_memberships(user_id);
create index if not exists idx_tenant_memberships_role on tenant_memberships(tenant_uuid, role);

create index if not exists idx_clients_tenant on clients(tenant_uuid);
create index if not exists idx_clients_name on clients(tenant_uuid, name);

create index if not exists idx_client_addresses_client on client_addresses(client_id);
create index if not exists idx_client_addresses_geo on client_addresses(lat, lng);
create index if not exists idx_client_addresses_tenant on client_addresses(tenant_uuid);

create index if not exists idx_routes_tenant on routes(tenant_uuid);
create index if not exists idx_routes_date on routes(tenant_uuid, date);
create index if not exists idx_routes_assigned_to on routes(tenant_uuid, assigned_to);

create index if not exists idx_route_stops_tenant on route_stops(tenant_uuid);
create index if not exists idx_route_stops_route on route_stops(route_id);
create index if not exists idx_route_stops_sequence on route_stops(route_id, sequence);
create index if not exists idx_route_stops_status on route_stops(route_id, status);

create index if not exists idx_audit_tenant on audit_log(tenant_uuid, created_at desc);

-- =========================================
-- Row-Level Security (RLS)
-- Política por cabecera X-Tenant-Id (encaja con VITE_TENANT_MODE=header)
-- Supabase/PostgREST expone cabeceras como GUCs: current_setting('request.headers.<nombre>', true)
-- =========================================

alter table tenants enable row level security;
alter table clients enable row level security;
alter table client_addresses enable row level security;
alter table routes enable row level security;
alter table route_stops enable row level security;
alter table tenant_memberships enable row level security;
-- tracking en vivo por conductor
create table if not exists driver_positions (
  id bigserial primary key,
  tenant_uuid uuid references tenants(uuid_id) on delete cascade,
  driver_id uuid not null,
  route_id uuid references routes(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  heading double precision,
  speed double precision,
  created_at timestamptz default now()
);
alter table driver_positions enable row level security;
create index if not exists idx_driver_positions_tenant on driver_positions(tenant_uuid, created_at desc);
create index if not exists idx_driver_positions_route on driver_positions(route_id, created_at desc);

-- helper: obtener tenant UUID desde cabecera x-tenant-uuid
-- si existe versión previa con distinto tipo de retorno, eliminarla primero
drop function if exists public.current_tenant();
create or replace function current_tenant() returns uuid language sql stable as $$
  select nullif(current_setting('request.headers.x-tenant-uuid', true), '')::uuid
$$;

-- tenants: permite leer solo tu tenant; inserciones/updates vía servicio/owner
drop policy if exists tenants_select on tenants;
create policy tenants_select on tenants
  for select using (uuid_id = current_tenant());

-- tenant_memberships: lectura por tenant (solo admin/owner)
create policy tenant_memberships_select on tenant_memberships
  for select using (
    tenant_uuid = current_tenant() and exists (
      select 1 from tenant_memberships m2 where m2.user_id = auth.uid() and m2.tenant_uuid = tenant_memberships.tenant_uuid and m2.role in ('Owner','Admin')
    )
  );

-- clients
create policy clients_select on clients
  for select using (tenant_uuid::uuid = current_tenant());
create policy clients_insert on clients
  for insert with check (tenant_uuid::uuid = current_tenant());
create policy clients_update on clients
  for update using (tenant_uuid::uuid = current_tenant()) with check (tenant_uuid::uuid = current_tenant());
create policy clients_delete on clients
  for delete using (tenant_uuid::uuid = current_tenant());

-- client_addresses
create policy client_addresses_select on client_addresses
  for select using (
    tenant_uuid::uuid = current_tenant()
  );
create policy client_addresses_insert on client_addresses
  for insert with check (
    tenant_uuid::uuid = current_tenant()
  );
create policy client_addresses_update on client_addresses
  for update using (
    tenant_uuid::uuid = current_tenant()
  ) with check (
    tenant_uuid::uuid = current_tenant()
  );
create policy client_addresses_delete on client_addresses
  for delete using (
    tenant_uuid::uuid = current_tenant()
  );

-- routes
-- routes: separar políticas para admin vs driver usando tenant_memberships
create policy routes_select_admin on routes
  for select using (
    tenant_uuid::uuid = current_tenant()
    and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = routes.tenant_uuid and m.role in ('Owner','Admin')
    )
  );
create policy routes_select_driver on routes
  for select using (
    tenant_uuid::uuid = current_tenant()
    and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = routes.tenant_uuid and m.role = 'Driver'
    )
    and assigned_to = auth.uid()
  );
create policy routes_insert on routes
  for insert with check (
    tenant_uuid::uuid = current_tenant()
    and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = routes.tenant_uuid and m.role in ('Owner','Admin')
    )
  );
create policy routes_update on routes
  for update using (
    tenant_uuid::uuid = current_tenant()
    and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = routes.tenant_uuid and m.role in ('Owner','Admin')
    )
  ) with check (
    tenant_uuid::uuid = current_tenant()
    and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = routes.tenant_uuid and m.role in ('Owner','Admin')
    )
  );
create policy routes_delete on routes
  for delete using (
    tenant_uuid::uuid = current_tenant()
    and exists (
      select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = routes.tenant_uuid and m.role in ('Owner','Admin')
    )
  );

-- route_stops
-- route_stops: admin ve todo su tenant; driver solo sus rutas asignadas
create policy route_stops_select_admin on route_stops
  for select using (
    exists (
      select 1 from routes r
      where r.id = route_stops.route_id and r.tenant_uuid::uuid = current_tenant()
        and exists (
          select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = r.tenant_uuid and m.role in ('Owner','Admin')
        )
    )
  );
create policy route_stops_select_driver on route_stops
  for select using (
    exists (
      select 1 from routes r
      where r.id = route_stops.route_id and r.tenant_uuid::uuid = current_tenant() and r.assigned_to = auth.uid()
        and exists (
          select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = r.tenant_uuid and m.role = 'Driver'
        )
    )
  );
create policy route_stops_insert on route_stops
  for insert with check (
    exists (
      select 1 from routes r
      where r.id = route_stops.route_id and r.tenant_uuid = current_tenant()
        and exists (
          select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = r.tenant_uuid and m.role in ('Owner','Admin')
        )
    )
  );
create policy route_stops_update_admin on route_stops
  for update using (
    exists (
      select 1 from routes r
      where r.id = route_stops.route_id and r.tenant_uuid = current_tenant()
        and exists (
          select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = r.tenant_uuid and m.role in ('Owner','Admin')
        )
    )
  ) with check (
    exists (
      select 1 from routes r
      where r.id = route_stops.route_id and r.tenant_uuid = current_tenant()
        and exists (
          select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = r.tenant_uuid and m.role in ('Owner','Admin')
        )
    )
  );
-- driver puede marcar sus propias paradas como completed/skipped
create policy route_stops_update_driver on route_stops
  for update using (
    exists (
      select 1 from routes r
      where r.id = route_stops.route_id and r.tenant_uuid = current_tenant() and r.assigned_to = auth.uid()
        and exists (
          select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = r.tenant_uuid and m.role = 'Driver'
        )
    )
  ) with check (
    exists (
      select 1 from routes r
      where r.id = route_stops.route_id and r.tenant_uuid = current_tenant() and r.assigned_to = auth.uid()
        and exists (
          select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = r.tenant_uuid and m.role = 'Driver'
        )
    )
  );
create policy route_stops_delete on route_stops
  for delete using (
    exists (
      select 1 from routes r
      where r.id = route_stops.route_id and r.tenant_uuid = current_tenant()
        and exists (
          select 1 from tenant_memberships m where m.user_id = auth.uid() and m.tenant_uuid = r.tenant_uuid and m.role in ('Owner','Admin')
        )
    )
  );

-- driver_positions
create policy driver_positions_select on driver_positions
  for select using (tenant_uuid::uuid = current_tenant());
create policy driver_positions_insert on driver_positions
  for insert with check (
    tenant_uuid::uuid = current_tenant()
    and (
      -- conductor autenticado insertando su propia posición
      driver_id = auth.uid()
      or
      -- o inserciones de servicio (admin/edge) usando service role
      current_setting('request.jwt.claims', true) is null
    )
  );

-- =========================================
-- Semillas opcionales
-- =========================================
-- insert into tenants(id, name) values ('acme', 'ACME Inc.') on conflict do nothing;
