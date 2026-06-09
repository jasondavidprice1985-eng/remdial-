#!/usr/bin/env bash
# Stop E2E test environment
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
E2E_DIR="$SCRIPT_DIR/.."

echo "==> Stopping PostgreSQL test instance..."
docker compose -f "$E2E_DIR/docker-compose.e2e.yml" down -v

echo "==> Test environment stopped."
