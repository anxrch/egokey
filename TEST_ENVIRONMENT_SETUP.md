# Misskey Test Environment Setup

This document describes the test environment setup completed for the Misskey monorepo.

## ✅ Completed Setup Steps

### 1. Tooling Versions
- **Node.js**: v22.15.0 (as specified in `.node-version`)
- **pnpm**: 10.18.2 (as specified in `packageManager` in package.json)
- **Docker**: 28.5.1

### 2. System Packages Installed
All required native dependencies have been installed:
- `build-essential` (gcc 13.3.0, GNU Make 4.3)
- `python3` (3.12.3)
- `pkg-config` (1.8.1)
- `libcairo2-dev` (1.18.0)
- `libpango1.0-dev` (1.52.1)
- `libjpeg-dev`
- `libgif-dev`
- `librsvg2-2` (2.58.0)
- `ffmpeg` (6.1.1)

### 3. Git Submodules
- `fluent-emojis` submodule initialized and checked out
- Commit: `cae981eb4c5189ea9ea3230e83b876a5068df7d1`

### 4. Configuration Files
- ✅ `.config/test.yml` created from `.github/misskey/test.yml`
- ✅ `/etc/hosts` updated with `127.0.0.1 misskey.local`

### 5. Data Services (Docker Containers)

#### PostgreSQL 15
- **Container name**: `misskey-test-postgres`
- **Image**: `postgres:15` (15.14)
- **Port**: 54312 (host) → 5432 (container)
- **Database**: `test-misskey`
- **User**: `postgres`
- **Auth**: trust method (no password required)
- **Status**: ✅ Running and accepting connections

#### Redis 7
- **Container name**: `misskey-test-redis`
- **Image**: `redis:7` (7.4.6)
- **Port**: 56312 (host) → 6379 (container)
- **Status**: ✅ Running and responding to PING

### 6. Dependencies & Binaries
- ✅ All pnpm workspace dependencies installed
- ✅ pnpm store populated via `pnpm fetch`
- ✅ Cypress binary 15.4.0 cached at `/home/engine/.cache/Cypress/15.4.0`

## 🔍 Verification

All acceptance criteria have been met:

1. ✅ Required Node/pnpm versions are active
2. ✅ Git submodules synced
3. ✅ Native tools (ffmpeg, build toolchain, graphics libs) installed
4. ✅ `.config/test.yml` exists and references correct ports
5. ✅ Postgres on port 54312 is healthy and reachable
6. ✅ Redis on port 56312 is healthy and reachable
7. ✅ Cypress binary cached and ready

## 🚀 Running Tests

Now that the environment is prepared, you can run:

```bash
# Run all tests
pnpm test

# Run backend Jest tests
pnpm jest

# Run Jest with coverage
pnpm jest-and-coverage

# Run E2E tests (starts test server and runs Cypress)
pnpm e2e

# Open Cypress interactively
pnpm cy:open

# Run specific Cypress tests
pnpm cy:run
```

## 📝 Environment Variables

When running backend CLI utilities, you may need:
```bash
export MISSKEY_CONFIG_YML=test.yml
export NODE_ENV=test
```

## 🐳 Managing Docker Containers

```bash
# View running containers
docker ps

# Stop containers
docker stop misskey-test-postgres misskey-test-redis

# Start containers
docker start misskey-test-postgres misskey-test-redis

# Remove containers (to recreate from scratch)
docker rm -f misskey-test-postgres misskey-test-redis
```

## 📋 Test Configuration

The test configuration (`.config/test.yml`) includes:
- **URL**: http://misskey.local
- **Port**: 61812 (Misskey test server)
- **Database**: PostgreSQL on 127.0.0.1:54312
- **Redis**: 127.0.0.1:56312
- **ID Generation**: aidx
- **Proxy Remote Files**: enabled

---

**Setup Date**: 2025-01-XX  
**Branch**: `chore/test-env-misskey-node22-pnpm10-postgres15-redis7-ffmpeg-cypress`
