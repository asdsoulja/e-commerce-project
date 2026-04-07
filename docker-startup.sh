#!/bin/sh

# Set DATABASE_URL explicitly
export DATABASE_URL="file:/app/apps/api/dev.db"

echo "========================================="
echo "Starting E-Commerce Project in Docker"
echo "DATABASE_URL: $DATABASE_URL"
echo "========================================="

# Setup API
cd /app/apps/api

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "🗄️  Pushing database schema..."
npx prisma db push

# Seed the database
echo "🌱 Seeding database..."
npm run db:seed || echo "✅ Seeding completed or already done"

# Start API in background
echo "🚀 Starting API server on port 4000..."
npm run dev &

# Start Web
cd /app/apps/web
echo "🌐 Starting Web server on port 3000..."
npm run dev