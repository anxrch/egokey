#!/bin/bash
# Stop and remove test database containers and volumes

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_DIR/packages/backend/test"

echo "Stopping and removing test databases (including volumes)..."
docker compose -f compose.yml down -v

echo "✓ Test databases stopped and volumes removed"
