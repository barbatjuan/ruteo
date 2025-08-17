# Ruteo Backend (NestJS + Fastify)

Minimal scaffold to run a Fastify-backed NestJS server for API proxying and route calculation.

## Prerequisites
- Node 18+
- npm or pnpm

## Setup
1. Copy `.env.example` to `.env` and set values.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in dev mode:
   ```bash
   npm run start:dev
   ```
4. Health check:
   - GET http://localhost:8080/healthz

## Env Vars
See `.env.example` for all variables. Important:
- `PORT`: default 8080
- `CORS_ORIGINS`: comma-separated origins, default `http://localhost:5173`
- `GOOGLE_MAPS_API_KEY`: required for Google REST proxies (to be added with endpoints)

## Next steps
- Add modules for `/places`, `/geocode`, `/calculate-route`.
- Implement Redis caching and rate limiting.
- Deploy to Render and set `VITE_API_URL` on the frontend.
