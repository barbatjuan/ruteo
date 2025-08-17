# Esquema de Base de Datos (Supabase)

Convención de nombres: snake_case para tablas, columnas, índices y políticas.

Servicios: Supabase (Postgres + RLS). Multi-tenant por `tenant_id`.

## Tablas

- tenants
- users (opcional, según auth que uses)
- clients
- client_addresses
- routes
- route_stops
- audit_log (opcional)

---

## tenants
- id text primary key
- name text not null
- created_at timestamptz default now()

Índices:
- pk: (id)

## users (opcional)
Si vas a usar Supabase Auth, puedes referenciar `auth.users` o mantener esta tabla para metadatos.
- id uuid primary key
- tenant_id text references tenants(id) on delete cascade
- email text unique not null
- role text not null default 'user'  -- ('owner','admin','user')
- created_at timestamptz default now()

Índices:
- idx_users_tenant on users(tenant_id)
- uniq_users_email on users(email)

## clients
- id uuid primary key default gen_random_uuid()
- tenant_id text references tenants(id) on delete cascade
- name text not null
- phone text
- notes text
- created_at timestamptz default now()

Índices:
- idx_clients_tenant on clients(tenant_id)
- idx_clients_name on clients(tenant_id, name)

## client_addresses
- id uuid primary key default gen_random_uuid()
- client_id uuid references clients(id) on delete cascade
- label text
- address text not null
- lat double precision  -- nullable (geocodificado)
- lng double precision  -- nullable (geocodificado)
- created_at timestamptz default now()

Índices:
- idx_client_addresses_client on client_addresses(client_id)
- idx_client_addresses_geo on client_addresses(lat, lng)

## routes
Representa una optimización/recorrido planificado.
- id uuid primary key default gen_random_uuid()
- tenant_id text references tenants(id) on delete cascade
- name text not null
- date date  -- fecha del recorrido
- notes text
- status text not null default 'draft'  -- ('draft','planned','in_progress','done')
- created_at timestamptz default now()

Índices:
- idx_routes_tenant on routes(tenant_id)
- idx_routes_date on routes(tenant_id, date)

## route_stops
Paradas dentro de una ruta, manteniendo el orden.
- id uuid primary key default gen_random_uuid()
- route_id uuid references routes(id) on delete cascade
- client_id uuid references clients(id) on delete set null
- client_address_id uuid references client_addresses(id) on delete set null
- sequence integer not null  -- orden en la ruta
- eta timestamptz  -- tiempo estimado opcional
- etc timestamptz  -- fin estimado opcional
- notes text
- created_at timestamptz default now()

Índices:
- idx_route_stops_route on route_stops(route_id)
- idx_route_stops_sequence on route_stops(route_id, sequence)

## audit_log (opcional)
- id bigserial primary key
- tenant_id text
- actor text  -- usuario/email/servicio
- action text  -- created/updated/deleted
- entity text  -- clients/client_addresses/routes/route_stops
- entity_id text
- payload jsonb
- created_at timestamptz default now()

Índices:
- idx_audit_tenant on audit_log(tenant_id, created_at desc)

---

## Row-Level Security (RLS)
Habilitar RLS por tabla y filtrar por `tenant_id`.

- Cabecera usada en este proyecto: `X-Tenant-Id`.
- Supabase/PostgREST expone cabeceras como GUC en minúsculas (`request.headers.x-tenant-id`).
- El frontend ya envía este header cuando `VITE_TENANT_MODE=header` (ver `src/lib/api.ts`).

Ejemplo (lectura/escritura por tenant) resolviendo el tenant desde la cabecera `X-Tenant-Id`:

```sql
alter table tenants enable row level security;
alter table users enable row level security;
alter table clients enable row level security;
alter table client_addresses enable row level security;
alter table routes enable row level security;
alter table route_stops enable row level security;

-- Helper: asegura que la sesión tiene tenant_id
create or replace function current_tenant() returns text language sql stable as $$
  select nullif(current_setting('request.headers.x-tenant-id', true), '')
$$;

-- tenants: sólo lectura del propio registro
create policy tenants_select on tenants
  for select using (id = current_tenant());

-- users: select limitado por tenant
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
```

Notas:
- Si prefieres usar claims de Supabase (JWT), cambia `current_tenant()` por lectura de `request.jwt.claims.tenant` o `auth.uid()` según tu diseño.
- Para rendimiento, los índices por `tenant_id` y por `(route_id, sequence)` son importantes.

---

## Variables de entorno (Render / Vercel)

Frontend (Render Static / Vercel):
- VITE_API_URL
- VITE_TENANT_MODE = header
- VITE_GOOGLE_MAPS_API_KEY
- VITE_GOOGLE_MAPS_LANG = es
- VITE_GOOGLE_MAPS_REGION = UY
- SUPABASE_URL
- SUPABASE_ANON_KEY

Backend (Render Node):
- PORT (Render lo inyecta)
- CORS_ORIGINS
- GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LANG, GOOGLE_MAPS_REGION
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

---

## Evolución
- Si sumas autenticación, mapea usuarios a tenants.
- Agrega soft-delete (columna deleted_at) si necesitas recuperación.
- Considera `jsonb` para configuraciones de ruta o preferencias por tenant.
