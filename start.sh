#!/bin/sh
set -e

export DATABASE_URL="file:/app/apps/api/prod.db"

echo "========================================="
echo "Starting E-Commerce Project"
echo "DATABASE_URL: $DATABASE_URL"
echo "========================================="

cd /app/apps/api

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🗄️ Running migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npx prisma db seed || echo "Seeding skipped or already done"

cd /app

echo "🚀 Starting application..."
exec npx concurrently "npm run start:api --prefix apps/api" "npm run start:web --prefix apps/web"