# e-commerce-project

EECS 4413 e-store features:
- clear front-end/back-end separation,
- MVC + DAO backend layering,
- customer/admin flows aligned with the course PDF,
- starter catalog data focused on computer accessories (mice, keyboards, gamepads, headsets, cables).

## Spec Alignment Snapshot
Detailed checklist: `docs/spec-alignment.md`.

Current state:
- core architecture requirements: implemented,
- core shopping/admin flows: mostly implemented,
- important remaining gaps (persisted default billing/shipping payment profile, expanded admin account editing UI): tracked in checklist.

## Prerequisites
1. Node.js 22 LTS (recommended)
2. npm 10+
3. macOS/Linux terminal

If you use `nvm`:
```bash
nvm install 22
nvm use 22
```

## Initial Setup (First Time)
From repo root:

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:generate --workspace @estore/api
```

Create and sync local DB (SQLite):

```bash
cd apps/api
DATABASE_URL="file:./dev.db" npx prisma db push
cd ../..
```

Seed starter data:

```bash
cd apps/api
DATABASE_URL="file:./dev.db" npm run db:seed
cd ../..
```

If you want a fully fresh accessory-only dataset, run `prisma db push --force-reset` before seeding.

## Run Entire Project Locally
From repo root:

```bash
npm run dev
```

Starts:
1. Web app: `http://localhost:3000`
2. API: `http://localhost:4000`

## Run With Docker (Development)
1. Create root env file for compose variable substitution:
```bash
cp .env.example .env
```
2. Build and run:
```bash
docker compose up --build
```
3. Open:
   - Web: `http://localhost:3000`
   - API health: `http://localhost:4000/api/health`

## Run With Docker (Production Profile)
From repo root:

```bash
cp .env.example .env
docker compose -f docker-compose.prod.yml up --build -d
```

Check status/logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

Stop:

```bash
docker compose -f docker-compose.prod.yml down
```

## Where To Set Secrets and Env Values
Local docker compose:
1. Put values in root `.env` (copied from `.env.example`).
2. Compose injects them into the container via `environment`.

Direct `docker run`:
1. Pass them with `-e`, for example:
```bash
docker run -p 3000:3000 -p 4000:4000 \
  -e SESSION_SECRET='replace-this' \
  -e CLIENT_URL='http://localhost:3000' \
  -e NEXT_PUBLIC_API_URL='http://localhost:4000/api' \
  your-image
```

## Database In Docker
1. Database is SQLite by default.
2. It is stored in Docker volume `sqlite_data` at `/data` inside the container.
3. On startup, `start.sh` runs Prisma generate + migrate deploy, then optionally seeds (`RUN_DB_SEED=auto` by default in prod, `RUN_DB_SEED_DEV=auto` in dev).

## Prisma Commands (Inside `apps/api`)
```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
npx prisma db push
npx prisma studio
```

From root, you can also run:

```bash
npm exec --workspace @estore/api prisma -- generate
npm exec --workspace @estore/api prisma -- migrate dev --name init
npm exec --workspace @estore/api prisma -- studio
```

## Build / Typecheck
From repo root:

```bash
npm run typecheck
npm run build
```

## Seed Login Accounts
1. Admin: `admin@estore.local` / `Admin123!`
2. Customer: `customer@estore.local` / `Customer123!`
