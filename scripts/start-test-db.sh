#!/bin/bash
# Start PostgreSQL and Redis containers for e2e tests

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_DIR/packages/backend/test"

echo "Starting test databases (PostgreSQL and Redis)..."
docker compose -f compose.yml up -d

echo "Waiting for databases to be ready..."

# Wait for PostgreSQL
MAX_ATTEMPTS=30
ATTEMPT=0
until docker compose -f compose.yml exec -T dbtest pg_isready -U misskey_test -d misskey_test 2>/dev/null || [ $ATTEMPT -eq $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT+1))
    echo "Waiting for PostgreSQL... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "ERROR: PostgreSQL failed to start"
    exit 1
fi

# Wait for Redis
ATTEMPT=0
until docker compose -f compose.yml exec -T redistest redis-cli -a misskey-test-redis ping 2>/dev/null | grep -q PONG || [ $ATTEMPT -eq $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT+1))
    echo "Waiting for Redis... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "ERROR: Redis failed to start"
    exit 1
fi

echo "✓ Test databases are ready!"
echo "  PostgreSQL: localhost:54312 (database: misskey_test, user: misskey_test)"
echo "  Redis: localhost:56312 (password protected)"
