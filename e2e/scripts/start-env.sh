#!/usr/bin/env bash
# Start E2E test environment — PostgreSQL via Docker
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
E2E_DIR="$SCRIPT_DIR/.."

echo "==> Starting PostgreSQL test instance..."
docker compose -f "$E2E_DIR/docker-compose.e2e.yml" up -d postgres

echo "==> Waiting for PostgreSQL to be healthy..."
until docker compose -f "$E2E_DIR/docker-compose.e2e.yml" exec -T postgres pg_isready -U remedial_test >/dev/null 2>&1; do
  sleep 1
done

echo "==> PostgreSQL is ready on port 5433"
echo ""
echo "Now you can run tests:"
echo "  cd e2e && npm test"
echo ""
echo "Or start the services manually and then run tests with:"
echo "  cd e2e && npx playwright test"
