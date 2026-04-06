# e-commerce-project

EECS 4413 e-store starter with:
- clear front-end/back-end separation,
- MVC + DAO backend layering,
- customer/admin flows aligned with the course PDF,
- starter catalog data focused on computer accessories (mice, keyboards, gamepads, headsets, cables).

## Spec Alignment Snapshot
Detailed checklist: `docs/spec-alignment.md`.

Current state:
- core architecture requirements: implemented,
- core shopping/admin flows: mostly implemented,
- important remaining gaps (guest checkout account flow, persisted default billing/shipping payment profile): tracked in checklist.

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
