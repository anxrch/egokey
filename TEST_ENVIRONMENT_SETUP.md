# Test Environment Setup

## Overview

This document describes how to set up and run all types of tests in Misskey, including frontend unit tests, backend unit tests, backend e2e tests, and Cypress e2e tests.

## Quick Start - Running E2E Tests

### Prerequisites

- Docker and Docker Compose installed
- Node.js 22.15.0 or later
- pnpm 10.18.2 (will be used automatically via packageManager field)

### One-Command E2E Test Setup

To run the complete e2e test suite:

```bash
# 1. Start test databases (PostgreSQL and Redis)
./scripts/start-test-db.sh

# 2. Run backend e2e tests
pnpm --filter backend test:e2e

# 3. Run Cypress e2e tests (starts backend server automatically)
pnpm e2e

# 4. Clean up test databases when done
./scripts/stop-test-db.sh
```

### Test Database Management Scripts

Three helper scripts are provided to manage test databases:

- **`./scripts/start-test-db.sh`**: Starts PostgreSQL (port 54312) and Redis (port 56312) containers, waits until they're ready
- **`./scripts/stop-test-db.sh`**: Stops the test database containers
- **`./scripts/clean-test-db.sh`**: Stops containers and removes all volumes (complete cleanup)

## Backend E2E Tests

### Configuration

Backend e2e tests use the configuration file at `.config/test.yml`, which is committed to the repository. This configuration specifies:

- Test server port: 61812
- PostgreSQL: localhost:54312, database `test-misskey`
- Redis: localhost:56312
- Test ID algorithm: `aidx`

### Running Backend E2E Tests

```bash
# Start test databases
./scripts/start-test-db.sh

# Build and run backend e2e tests
pnpm --filter backend test:e2e

# Stop test databases when done
./scripts/stop-test-db.sh
```

The `test:e2e` script automatically:
1. Builds the backend (`pnpm build`)
2. Builds the test server (`pnpm build:test`)
3. Runs Jest with the e2e configuration

### Test Database Details

The test databases run in Docker containers defined in `packages/backend/test/compose.yml`:

- **PostgreSQL 15**: 
  - Port mapping: 127.0.0.1:54312 → container:5432
  - Database: test-misskey
  - Auth: trust method (no password required)
  
- **Redis 7**:
  - Port mapping: 127.0.0.1:56312 → container:6379

## Cypress E2E Tests

Cypress tests verify the full application stack, including the frontend UI.

### Running Cypress Tests

```bash
# Start test databases
./scripts/start-test-db.sh

# Run Cypress tests (headless)
pnpm e2e

# Or open Cypress UI for interactive testing
pnpm cy:open

# Stop test databases when done
./scripts/stop-test-db.sh
```

The `pnpm e2e` command uses `start-server-and-test` to:
1. Copy `.config/test.yml` to the correct location (if needed)
2. Start the backend server in test mode on port 61812
3. Wait for the server to respond at http://localhost:61812
4. Run Cypress tests against the server
5. Shut down the server after tests complete

### Cypress Configuration

- Base URL: http://localhost:61812 (configured in `cypress.config.ts`)
- Test files: Located in `cypress/` directory
- Screenshots and videos: Saved to `cypress/screenshots` and `cypress/videos` (gitignored)

### Browser Requirements

Cypress requires a browser to be installed. If running in a headless environment (e.g., CI), ensure Chromium or Firefox is available:

```bash
# Ubuntu/Debian
sudo apt-get install -y libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev \
  libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb

# Or use the Cypress Docker image
docker run -it -v $PWD:/e2e -w /e2e cypress/included:15.4.0
```

## Package.json Scripts

The root `package.json` provides convenience scripts for managing test databases:

```bash
# Start test databases
pnpm test-db:start

# Stop test databases
pnpm test-db:stop

# Clean test databases (stop and remove volumes)
pnpm test-db:clean
```

## Troubleshooting E2E Tests

### Connection Errors

**Issue**: Tests fail with "ECONNREFUSED" or connection timeout errors.

**Solutions**:
1. Ensure test databases are running: `pnpm test-db:start`
2. Check Docker is running: `docker ps`
3. Verify ports are not in use: `lsof -i :54312` and `lsof -i :56312`
4. Check database logs: `cd packages/backend/test && docker compose logs`

### Missing Configuration

**Issue**: Tests fail with "Cannot find configuration" errors.

**Solution**: The `.config/test.yml` file should be committed to the repository. If it's missing, copy it from `.github/misskey/test.yml`:
```bash
cp .github/misskey/test.yml .config/test.yml
```

### Build Errors

**Issue**: Tests fail with missing module errors (e.g., `Cannot find module 'misskey-js'`).

**Solution**: Build all required packages:
```bash
pnpm build-pre
pnpm --filter misskey-js build
pnpm --filter misskey-reversi build
pnpm --filter misskey-bubble-game build
pnpm --filter backend build
pnpm --filter backend build:test
```

Or use the full build command:
```bash
pnpm build
```

### Database Migration Issues

**Issue**: Tests fail with database schema errors.

**Solution**: The test database schema is automatically managed by the test server. If you encounter persistent issues:
```bash
# Clean the database completely
pnpm test-db:clean

# Start fresh
pnpm test-db:start
```

### Port Conflicts

**Issue**: Tests fail because ports 54312, 56312, or 61812 are already in use.

**Solution**:
1. Find what's using the port: `lsof -i :54312`
2. Either stop the conflicting process or update port numbers in:
   - `.config/test.yml`
   - `packages/backend/test/compose.yml`
   - `cypress.config.ts` (if applicable)

## Frontend Unit Tests (Vitest)

Frontend unit tests run in isolation without requiring external services or network connectivity.

## Network Request Mocking

All HTTP requests made during frontend tests are intercepted and mocked using `vitest-fetch-mock`. This prevents tests from attempting to connect to real servers (like `localhost:3000`) and ensures tests run reliably in any environment.

### Implementation

The mocking behavior is configured in `packages/frontend/test/init.ts`, which is automatically loaded before all tests run.

### Mocked Endpoints

The following request patterns are intercepted and handled:

1. **API Endpoints** (`/api/*`)
   - All Misskey API requests return empty successful responses by default
   - Individual tests can override this behavior using `fetchMock.mockOnceIf()` or similar methods

2. **URL Preview Endpoint** (`/url`)
   - Returns a minimal valid summaly response structure
   - Includes fields: `url`, `title`, `description`, `thumbnail`, `icon`, `sitename`, `player`
   - The `url` field echoes back the requested URL

3. **Static Assets** (`/client-assets/*`, `/assets/*`)
   - Return empty successful responses to prevent 404 errors

4. **All Other Requests**
   - Return a 404 response to identify unexpected network calls during development

### Global Test Stubs

The test environment also provides the following global stubs:

- **window.location**: Stubbed to `http://localhost:3000/` with all standard location properties
- **WebSocket**: A minimal mock to prevent misskey-js from throwing errors
- **AudioContext**: Mocked to support components that use the Web Audio API
- **Meta tags**: A mock `instance_url` meta tag is injected if it doesn't exist

## Writing Tests

### Using the Default Mocks

Most tests will work automatically with the default mocks. Simply import your component and render it:

```typescript
import { render } from '@testing-library/vue';
import './init';
import MyComponent from '@/components/MyComponent.vue';

test('my test', () => {
  const { getByText } = render(MyComponent);
  // ... assertions
});
```

### Overriding Mocks for Specific Tests

If a test needs custom API responses, you can override the default mock behavior:

```typescript
import { fetchMock } from './init';

test('with custom API response', async () => {
  fetchMock.mockOnceIf((req) => {
    const url = new URL(req.url);
    return url.pathname === '/api/my-endpoint';
  }, () => {
    return {
      status: 200,
      body: JSON.stringify({ custom: 'data' }),
    };
  });

  // ... render component and test
});
```

### Resetting Mocks

Always reset mocks in `afterEach` hooks to prevent test pollution:

```typescript
import { afterEach } from 'vitest';
import { fetchMock } from './init';

afterEach(() => {
  fetchMock.resetMocks();
});
```

## Troubleshooting

### Connection Refused Errors

If you see `ECONNREFUSED` errors during tests, it means a component is attempting to make a real HTTP request that isn't being caught by the fetch mock. Common causes:

1. **Using native fetch without going through the global mock** - Ensure the fetch is using the global `window.fetch` or `fetch` function
2. **WebSocket connections** - These need separate mocking (see WebSocket stub in init.ts)
3. **Third-party libraries** - May need additional module mocking in vitest.config.ts

### Module Resolution Errors

If tests fail with "Failed to resolve entry for package" errors:

1. Ensure all workspace packages are built: `pnpm -r build`
2. Check that the package's `built/` directory exists
3. Verify package.json exports are correctly configured

## Best Practices

1. **Avoid Live Data**: Never write tests that depend on real network calls or external services
2. **Use Fixtures**: Create deterministic test data rather than fetching it dynamically
3. **Mock Early**: Configure mocks before components mount to prevent race conditions
4. **Clean Up**: Always reset mocks in afterEach hooks
5. **Test Isolation**: Each test should be independent and not rely on state from other tests
