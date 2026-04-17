#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-file:/data/prod.db}"
export CLIENT_URL="${CLIENT_URL:-http://localhost:3000}"
export SESSION_SECRET="${SESSION_SECRET:-change-me-in-production-please}"
export RUN_DB_SEED="${RUN_DB_SEED:-auto}"
export DB_SEED_MARKER_PATH="${DB_SEED_MARKER_PATH:-/data/.seeded}"
export START_MODE="${START_MODE:-production}"

seed_db() {
  echo "🌱 Seeding database..."
  npx prisma db seed
  mkdir -p "$(dirname "$DB_SEED_MARKER_PATH")"
  touch "$DB_SEED_MARKER_PATH"
}

echo "========================================="
echo "Starting E-Commerce Project"
echo "DATABASE_URL: $DATABASE_URL"
echo "CLIENT_URL: $CLIENT_URL"
echo "RUN_DB_SEED: $RUN_DB_SEED"
echo "START_MODE: $START_MODE"
echo "========================================="

cd /app/apps/api

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🗄️ Running migrations..."
npx prisma migrate deploy

case "$RUN_DB_SEED" in
  true)
    seed_db
    ;;
  auto)
    if [ -f "$DB_SEED_MARKER_PATH" ]; then
      echo "⏭️ Skipping seed because marker exists at $DB_SEED_MARKER_PATH"
    else
      seed_db
    fi
    ;;
  false)
    echo "⏭️ Skipping seed because RUN_DB_SEED=$RUN_DB_SEED"
    ;;
  *)
    echo "❌ Invalid RUN_DB_SEED value: $RUN_DB_SEED (expected: auto|true|false)"
    exit 1
    ;;
esac

cd /app

echo "🚀 Starting application..."
if [ "$START_MODE" = "development" ]; then
  exec npm run dev
fi

exec npx concurrently "npm run start:api --prefix apps/api" "npm run start:web --prefix apps/web"
