# Repository Integrity Checks

This document describes the integrity check system for the Misskey repository, which provides comprehensive health monitoring and automated reporting for stakeholders.

## Overview

The integrity check system helps maintain repository health by:

- ✅ Validating dependencies and lockfile consistency
- 🔒 Identifying security vulnerabilities
- 📊 Running type checks and linting
- 🔨 Verifying builds succeed
- 🗄️ Testing database migrations
- 🧪 Executing test suites
- 📋 Generating consolidated reports

## Quick Start

### Run Full Integrity Check

```bash
# Complete integrity check with report generation
./scripts/run-integrity-checks.sh

# Quick check (skip E2E tests)
./scripts/run-integrity-checks.sh --quick

# Skip tests entirely
./scripts/run-integrity-checks.sh --skip-tests

# Skip build (use existing)
./scripts/run-integrity-checks.sh --skip-build
```

### Generate Report from Existing Logs

```bash
# Generate report without re-running checks
pnpm integrity-report

# Or run directly
node scripts/generate-integrity-report.mjs
```

### View Latest Report

```bash
# View in terminal
less reports/INTEGRITY_REPORT_LATEST.md

# Open in editor
$EDITOR reports/INTEGRITY_REPORT_LATEST.md
```

## System Components

### 1. Check Execution Script

**Location**: `scripts/run-integrity-checks.sh`

Comprehensive bash script that:
- Sets up logging infrastructure
- Executes all integrity checks in order
- Captures detailed output for each check
- Handles failures gracefully
- Generates final report

**Usage**:
```bash
./scripts/run-integrity-checks.sh [OPTIONS]

OPTIONS:
  --quick       Skip E2E tests and optional checks
  --skip-tests  Skip all test execution
  --skip-build  Skip build process
  --help        Show help message
```

### 2. Report Generator

**Location**: `scripts/generate-integrity-report.mjs`

Node.js script that:
- Gathers environment metadata (git, system, versions)
- Parses check logs to extract outcomes
- Analyzes security audit data
- Generates comprehensive Markdown reports
- Creates timestamped and "latest" report versions

**Usage**:
```bash
pnpm integrity-report
# or
node scripts/generate-integrity-report.mjs
```

### 3. Reports Directory

**Location**: `reports/`

Contains:
- `INTEGRITY_REPORT_LATEST.md` - Most recent report
- `integrity-report-YYYY-MM-DD.md` - Timestamped reports
- `integrity-logs/` - Detailed check logs
- `README.md` - Report documentation for stakeholders

## Check Categories

### 1. Dependency Integrity

**Checks**:
- `pnpm install --frozen-lockfile` - Ensures lockfile is consistent
- `pnpm audit` - Identifies security vulnerabilities
- `pnpm doctor` - Validates environment health

**Log Files**:
- `01-dependency-install.log`
- `02-pnpm-audit.log`
- `03-pnpm-doctor.log`
- `pnpm-audit.json` (machine-readable)

**Pass Criteria**:
- Installation succeeds without errors
- Lockfile matches package.json
- No critical/high security vulnerabilities

### 2. Static Analysis

**Checks**:
- `pnpm -r typecheck` - TypeScript type checking across all packages
- `pnpm -r lint` - ESLint linting for code quality

**Log Files**:
- `04-typecheck.log`
- `05-lint.log`

**Pass Criteria**:
- No type errors in production code
- Linting passes (warnings acceptable)

### 3. Build Verification

**Checks**:
- Git submodule initialization
- `pnpm build` - Full workspace build
- Asset generation verification

**Log Files**:
- `06-build.log`

**Pass Criteria**:
- All packages build successfully
- Assets generated correctly
- No build errors

### 4. Infrastructure

**Checks**:
- PostgreSQL connectivity
- Redis connectivity
- Service health verification

**Log Files**:
- `07-connectivity.log`

**Pass Criteria**:
- PostgreSQL accepting connections
- Redis responding to PING
- All required services available

### 5. Database Migrations

**Checks**:
- Migration execution
- Schema consistency validation

**Log Files**:
- `08-migrations.log`

**Pass Criteria**:
- All migrations execute successfully
- No schema drift errors

### 6. Testing

**Checks**:
- Backend unit tests
- Frontend tests
- SDK tests (misskey-js)
- Backend E2E tests (optional)
- Cypress E2E tests (optional)

**Log Files**:
- `09-backend-unit-tests.log`
- `10-frontend-tests.log`
- `11-sdk-tests.log`
- `12-backend-e2e-tests.log`
- `13-cypress-tests.log`

**Pass Criteria**:
- All tests pass
- Coverage thresholds met
- No test failures

## Report Structure

Generated reports include:

### 1. Overview
- Total checks run
- Pass/fail/partial/skip counts
- Quick health snapshot

### 2. Environment
- Git branch, commit, author
- System information (OS, architecture)
- Tool versions (Node.js, pnpm)
- Service versions (PostgreSQL, Redis, ffmpeg)

### 3. Check Results Summary
- Consolidated status table
- Links to detailed logs
- Pass ✅, Fail ❌, Partial ⚠️, Skip ⏭️ indicators

### 4. Detailed Results by Category
- Dependency Integrity
- Static Analysis
- Build Verification
- Infrastructure
- Database Migrations
- Tests

### 5. Security Audit
- Vulnerabilities by severity (critical/high/moderate/low)
- Affected packages and paths
- CVE references
- Recommended patches

### 6. Testing Artifacts
- Coverage report locations
- Cypress assets (videos/screenshots)

### 7. Issues & Recommendations
- Priority 1: Critical issues
- Priority 2: Partial failures
- Priority 3: Maintenance tasks

### 8. Conclusion
- Overall status (Pass/Pass with Warnings/Fail)
- Deployment readiness assessment

## Integration with Development Workflow

### Pre-Commit Checks

Run quick checks before committing:

```bash
./scripts/run-integrity-checks.sh --quick --skip-build
```

### Pre-Push Checks

Run comprehensive checks before pushing:

```bash
./scripts/run-integrity-checks.sh
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run Integrity Checks
  run: ./scripts/run-integrity-checks.sh --quick

- name: Generate Report
  run: pnpm integrity-report

- name: Upload Reports
  uses: actions/upload-artifact@v4
  with:
    name: integrity-reports
    path: reports/
```

### Code Review Process

1. Reviewer checks latest integrity report
2. Ensures all checks pass
3. Reviews security vulnerabilities
4. Verifies test coverage

## Stakeholder Communication

### For Developers

**Focus**:
- Failed checks requiring fixes
- Security vulnerabilities to address
- Test failures to debug

**Actions**:
- Fix ❌ failed checks immediately
- Review ⚠️ warnings
- Address 🔒 security issues

### For QA/Reviewers

**Focus**:
- Test pass rates
- Build success
- Environment consistency

**Actions**:
- Verify all tests pass
- Check for new failures
- Validate environment matches requirements

### For Project Managers/Stakeholders

**Focus**:
- Overall status (Pass/Fail)
- Security vulnerability count
- Deployment readiness

**Actions**:
- Review high-level summary
- Track metrics over time
- Plan remediation work

### For Security Teams

**Focus**:
- Security audit section
- CVE identifiers
- Patch recommendations

**Actions**:
- Prioritize critical/high vulnerabilities
- Plan dependency updates
- Review affected systems

## Troubleshooting

### Common Issues

#### Reports Not Generated

**Problem**: Script completes but no report file

**Solution**:
```bash
# Ensure reports directory exists
mkdir -p reports/integrity-logs

# Check script permissions
chmod +x scripts/generate-integrity-report.mjs

# Run with debugging
node scripts/generate-integrity-report.mjs
```

#### Empty Check Results

**Problem**: Report shows "Total Checks: 0"

**Solution**:
```bash
# Verify log files exist
ls reports/integrity-logs/*.log

# Run full integrity check
./scripts/run-integrity-checks.sh
```

#### Service Connectivity Failures

**Problem**: PostgreSQL/Redis show as unavailable

**Solution**:
```bash
# Start services
docker-compose up -d postgres redis

# Verify containers running
docker ps | grep -E 'postgres|redis'

# Test connectivity
docker exec $(docker ps -q -f name=postgres) pg_isready
docker exec $(docker ps -q -f name=redis) redis-cli ping
```

#### Security Audit Errors

**Problem**: Security section parsing fails

**Solution**:
```bash
# Regenerate audit data
pnpm audit --json > reports/integrity-logs/pnpm-audit.json 2>&1

# Verify JSON is valid
cat reports/integrity-logs/pnpm-audit.json | jq .

# Regenerate report
pnpm integrity-report
```

## Maintenance

### Cleaning Old Reports

```bash
# Keep last 10 reports
ls -t reports/integrity-report-*.md | tail -n +11 | xargs rm -f

# Clean all logs (use with caution)
rm -rf reports/integrity-logs/*.log
```

### Updating the System

When updating checks or report format:

1. Update `run-integrity-checks.sh` for new checks
2. Update `generate-integrity-report.mjs` for new parsing/formatting
3. Update documentation (this file, README files)
4. Test with sample data
5. Document breaking changes

### Adding Custom Checks

1. Create check script/command
2. Add to `run-integrity-checks.sh`:
   ```bash
   run_check \
     "Your Check Name" \
     "XX-your-check.log" \
     "your-command" \
     true  # allow_failure
   ```
3. Update `generate-integrity-report.mjs` check mapping if needed
4. Document in this file

## Best Practices

### For Check Scripts

- ✅ Use descriptive log filenames
- ✅ Include timestamps in logs
- ✅ Capture both stdout and stderr
- ✅ Use clear success/failure indicators
- ✅ Include duration information

### For Reports

- ✅ Review reports regularly
- ✅ Archive important reports
- ✅ Track trends over time
- ✅ Share with stakeholders
- ✅ Document exceptions/known issues

### For CI/CD

- ✅ Run checks on every PR
- ✅ Block merges on critical failures
- ✅ Upload reports as artifacts
- ✅ Notify teams of failures
- ✅ Track metrics over time

## Additional Resources

- **Report Documentation**: [reports/README.md](reports/README.md)
- **Script Documentation**: [scripts/README-INTEGRITY-REPORT.md](scripts/README-INTEGRITY-REPORT.md)
- **Test Environment Setup**: [TEST_ENVIRONMENT_SETUP.md](TEST_ENVIRONMENT_SETUP.md)
- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)

## Support

For questions or issues:

1. Check this documentation
2. Review report and log files
3. Check troubleshooting section
4. Contact the development team

---

**Last Updated**: 2025-10-26
**Maintained By**: Misskey Development Team
