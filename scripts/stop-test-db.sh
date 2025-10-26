#!/bin/bash
# Stop PostgreSQL and Redis containers for e2e tests

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_DIR/packages/backend/test"

echo "Stopping test databases..."
docker compose -f compose.yml down

echo "✓ Test databases stopped"
