#!/bin/sh
set -e

echo "[entrypoint] preparing database..."
node scripts/prepare-db.mjs
npx prisma db push --skip-generate

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "[entrypoint] seeding database..."
  npm run db:seed
fi

echo "[entrypoint] starting app on ${HOSTNAME:-0.0.0.0}:${PORT:-3021}"
exec npm run start -- --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3021}"
