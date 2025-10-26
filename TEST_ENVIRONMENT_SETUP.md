# Test Environment Setup

## Overview

This document describes how the frontend test environment is configured to run tests in isolation without requiring external services or network connectivity.

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
