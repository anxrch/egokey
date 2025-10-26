# Scripts Directory

This directory contains helper scripts for development, testing, and maintenance of the Misskey project.

## Test Database Management

### `start-test-db.sh`

Starts PostgreSQL and Redis containers for running e2e tests.

**Usage:**
```bash
./scripts/start-test-db.sh
# or via package.json
pnpm test-db:start
```

**What it does:**
- Starts Docker containers defined in `packages/backend/test/compose.yml`
- PostgreSQL 15 on port 54312 (database: test-misskey)
- Redis 7 on port 56312
- Waits for both services to be ready before returning
- Health checks ensure services are accepting connections

### `stop-test-db.sh`

Stops the test database containers.

**Usage:**
```bash
./scripts/stop-test-db.sh
# or via package.json
pnpm test-db:stop
```

**What it does:**
- Stops PostgreSQL and Redis test containers
- Preserves data volumes (containers can be restarted)

### `clean-test-db.sh`

Stops test database containers and removes all data.

**Usage:**
```bash
./scripts/clean-test-db.sh
# or via package.json
pnpm test-db:clean
```

**What it does:**
- Stops PostgreSQL and Redis test containers
- Removes all volumes and data
- Use this for a completely fresh start

## Build Scripts

### `build-pre.js`

Prepares metadata files required before building packages.

### `build-assets.mjs`

Builds static assets, locales, and backend web resources.

## Development Scripts

### `dev.mjs`

Starts the development server with hot reloading.

### `clean.js` / `clean-all.js`

Remove build artifacts and generated files.

## Maintenance Scripts

### `generate-integrity-report.mjs`

Generates comprehensive repository health and integrity reports.

See [README-INTEGRITY-REPORT.md](./README-INTEGRITY-REPORT.md) for detailed documentation.

### `run-integrity-checks.sh`

Runs a suite of integrity checks on the repository.

## Package Management

### `tarball.mjs`

Creates distribution tarballs for deployment.
