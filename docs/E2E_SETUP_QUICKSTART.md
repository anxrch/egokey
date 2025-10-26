# E2E Testing Quick Start Guide

This guide provides a quick reference for running end-to-end (e2e) tests in Misskey.

## Prerequisites

- Docker and Docker Compose
- Node.js 22.15.0 or later
- pnpm (managed via corepack)

## First-Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm build
```

## Running Backend E2E Tests

Backend e2e tests verify the API and core backend functionality using Jest.

```bash
# 1. Start test databases (PostgreSQL + Redis)
pnpm test-db:start

# 2. Build and run backend e2e tests
pnpm --filter backend test:e2e

# 3. Stop test databases when done
pnpm test-db:stop
```

### Running Specific Backend Tests

```bash
# Run a specific test file
pnpm --filter backend jest:e2e -- test/e2e/api.ts

# Run tests matching a pattern
pnpm --filter backend jest:e2e -- --testPathPattern=timeline
```

## Running Cypress E2E Tests

Cypress tests verify the full application stack including the UI.

```bash
# 1. Start test databases
pnpm test-db:start

# 2. Run Cypress tests (starts backend server automatically)
pnpm e2e

# 3. Stop test databases when done
pnpm test-db:stop
```

### Interactive Cypress Testing

```bash
# 1. Start test databases
pnpm test-db:start

# 2. In one terminal: Start the test server
pnpm start:test

# 3. In another terminal: Open Cypress UI
pnpm cy:open

# 4. Select a test to run interactively
```

## Test Database Commands

```bash
# Start databases
pnpm test-db:start

# Stop databases (preserves data)
pnpm test-db:stop

# Clean databases (removes all data)
pnpm test-db:clean
```

## Configuration Files

- **`.config/test.yml`**: Main test configuration (committed to repository)
  - Test server base URL: http://127.0.0.1:61812 (port 61812)
  - PostgreSQL: 127.0.0.1:54312 (database `misskey_test`, user `misskey_test`, password `misskey-test-password`)
  - Redis: 127.0.0.1:56312 (requirepass `misskey-test-redis`, database `1`)

- **`packages/backend/test/compose.yml`**: Docker Compose file for test databases

- **`cypress.config.ts`**: Cypress configuration

## Troubleshooting

### "ECONNREFUSED" errors
```bash
# Verify databases are running
docker ps | grep -E "dbtest|redistest"

# Check database health
cd packages/backend/test && docker compose logs
```

### "Cannot find module" errors
```bash
# Rebuild dependencies
pnpm build-pre
pnpm build
```

### Port conflicts
```bash
# Check what's using the ports
lsof -i :54312  # PostgreSQL
lsof -i :56312  # Redis
lsof -i :61812  # Test server
```

### Database schema issues
```bash
# Fresh start
pnpm test-db:clean
pnpm test-db:start
```

## CI/CD Integration

For continuous integration, use the following workflow:

```bash
# Start databases in background
pnpm test-db:start

# Run backend tests
pnpm --filter backend test:e2e

# Run Cypress tests
pnpm e2e

# Clean up
pnpm test-db:stop
```

## Additional Resources

- Full documentation: [TEST_ENVIRONMENT_SETUP.md](../TEST_ENVIRONMENT_SETUP.md)
- Backend tests: `packages/backend/test/e2e/`
- Cypress tests: `cypress/e2e/`
- Test utilities: `packages/backend/test/utils.ts`
