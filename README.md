# Ruteo — PWA React (Vite)

SaaS multi-tenant de planificador de rutas. Landing moderna y dashboard con mapa, CSV y exportaciones (mock). PWA con Workbox.

## Scripts
- npm i
- npm run dev
- npm run build
- npm run preview
- npm run test

## Variables de entorno (Vercel + Supabase)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_GOOGLE_MAPS_API_KEY
- VITE_GOOGLE_MAPS_LANG=es
- VITE_GOOGLE_MAPS_REGION=UY
- VITE_ENABLE_SW=true|false (opcional)
- VITE_TENANT_MODE=header (opcional)

Notas:
- En producción, el frontend funciona sin backend propio (toda la data via Supabase). `VITE_API_URL` es opcional y no se requiere.
- Multi-tenant via header `x-tenant-uuid` (ver `src/lib/supabase.ts`).

## Flujo de Signup (SaaS)
- Ruta pública: `/signup` para crear empresa (tenant) + usuario Owner.
- El slug se resuelve a UUID con la RPC `get_tenant_uuid` (ver `docs/sql/get_tenant_uuid.sql`).
- Tras crear, redirige a `/:tenantUuid/app`.

## Notas
- Los iconos PWA en `public/icons/` son placeholders. Reemplace por PNG 192/512.
