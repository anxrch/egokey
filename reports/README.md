# Integrity Reports

This directory contains comprehensive integrity check reports for the Misskey repository.

## 📋 Overview

Integrity reports provide stakeholders with a consolidated view of repository health, including:

- ✅ Build and test status
- 🔒 Security vulnerability findings
- 📊 Code quality metrics
- 🗄️ Database migration status
- 🔧 Infrastructure health
- 📈 Testing coverage and artifacts

## 📁 Directory Structure

```
reports/
├── README.md                          # This file
├── INTEGRITY_REPORT_LATEST.md        # Most recent report (always current)
├── integrity-report-YYYY-MM-DD.md    # Timestamped reports
└── integrity-logs/                    # Detailed check logs
    ├── pnpm-audit.json               # Security audit data
    ├── 01-dependency-install.log     # Dependency installation
    ├── 02-pnpm-audit.log             # Security audit output
    ├── 03-pnpm-doctor.log            # Environment health
    ├── 04-typecheck.log              # Type checking results
    ├── 05-lint.log                   # Linting results
    ├── 06-build.log                  # Build process
    ├── 07-connectivity.log           # Service connectivity
    ├── 08-migrations.log             # Database migrations
    └── XX-*-tests.log                # Various test outputs
```

## 🚀 Quick Start

### Viewing the Latest Report

```bash
# View in terminal
less reports/INTEGRITY_REPORT_LATEST.md

# Open in default editor
$EDITOR reports/INTEGRITY_REPORT_LATEST.md

# View in browser (if using VS Code)
code reports/INTEGRITY_REPORT_LATEST.md
```

### Generating a New Report

```bash
# From existing logs
pnpm integrity-report

# Run full integrity check and generate report
./scripts/run-integrity-checks.sh

# Quick check (skip E2E tests)
./scripts/run-integrity-checks.sh --quick
```

## 📊 Report Sections

### 1. Overview
High-level summary with check counts and pass/fail status.

**What to look for:**
- Failed check count (should be 0)
- Passed vs. total checks ratio
- Quick health snapshot

### 2. Environment
System metadata including git status, tool versions, and service information.

**What to look for:**
- Correct branch and commit
- Expected Node.js and pnpm versions
- Service availability (PostgreSQL, Redis)

### 3. Check Results Summary
Consolidated table of all checks with status indicators:
- ✅ Passed
- ❌ Failed
- ⚠️ Partial (warnings)
- ⏭️ Skipped

**What to look for:**
- Any ❌ failed checks (requires immediate attention)
- ⚠️ warnings (should be reviewed)
- Links to detailed logs for failed checks

### 4. Detailed Results by Category

#### Dependency Integrity
- Package installation success
- Lockfile consistency
- Environment health

#### Static Analysis
- TypeScript type checking
- ESLint linting
- Code quality metrics

#### Build Verification
- Successful compilation
- Asset generation
- Build artifacts

#### Infrastructure
- Database connectivity
- Redis availability
- Service health

#### Database Migrations
- Migration execution
- Schema consistency
- Migration logs

#### Tests
- Unit test results (backend, frontend, SDK)
- E2E test results
- Coverage reports

### 5. Security Audit
Vulnerability findings from `pnpm audit`:

**Severity Levels:**
- 🔴 **Critical**: Fix immediately
- 🟠 **High**: Fix as soon as possible
- 🟡 **Moderate**: Fix in next sprint
- 🟢 **Low**: Fix when convenient

**What to look for:**
- Critical or high severity vulnerabilities
- Affected packages and dependency paths
- Recommended patches/updates

### 6. Testing Artifacts
References to coverage reports and test assets.

**What to look for:**
- Coverage report locations
- Cypress video/screenshot paths
- Test result summaries

### 7. Issues & Recommendations
Prioritized action items based on findings.

**Priority 1 - Critical Issues:**
- Security vulnerabilities (critical/high)
- Failed checks blocking deployment
- Broken functionality

**Priority 2 - Partial Failures:**
- Test failures (non-blocking)
- Build warnings
- Minor issues

**Priority 3 - Maintenance:**
- Dependency updates
- Code style improvements
- Documentation updates

### 8. Conclusion
Overall status and deployment readiness assessment.

**Status Types:**
- ✅ **PASS**: All checks passed, ready for deployment
- ⚠️ **PASS WITH WARNINGS**: Functional but has minor issues
- ❌ **FAIL**: Critical issues, not ready for deployment

## 🔍 Understanding Results

### Interpreting Check Status

#### ✅ PASSED
```markdown
### ✅ Build Process
- **Status**: PASSED
- **Duration**: 45.2s
- **Log**: [build.log](integrity-logs/build.log) (1.2 MB)
```
**Action**: None required. Check completed successfully.

#### ❌ FAILED
```markdown
### ❌ Backend Unit Tests
- **Status**: FAILED
- **Duration**: 12.5s
- **Log**: [backend-test.log](integrity-logs/backend-test.log)

**Errors/Warnings**:
```
Error: Test suite failed to run
TypeError: Cannot read property 'mock' of undefined
```
```
**Action**: Review detailed log, fix issues, re-run tests.

#### ⚠️ PARTIAL
```markdown
### ⚠️ Type Checking
- **Status**: PARTIAL
- **Duration**: 8.3s
- **Log**: [typecheck.log](integrity-logs/typecheck.log)
```
**Action**: Review warnings, address if critical.

#### ⏭️ SKIPPED
```markdown
### ⏭️ Cypress Tests
- **Status**: SKIPPED
- **Duration**: N/A
- **Log**: N/A
```
**Action**: Run manually if needed, or check prerequisites.

### Security Vulnerability Remediation

For each vulnerability:

1. **Identify the package**: Check the "Module" field
2. **Review severity**: Critical/High require immediate action
3. **Check affected paths**: Understand dependency chain
4. **Apply fix**: Use recommended version or workaround
5. **Re-audit**: Run `pnpm audit` after fixes

Example workflow:
```bash
# Update specific package
pnpm update axios@latest --recursive

# Update all dependencies (careful!)
pnpm update --latest

# Re-run audit
pnpm audit --json > reports/integrity-logs/pnpm-audit.json

# Regenerate report
pnpm integrity-report
```

## 🛠️ Troubleshooting

### Issue: No Report Generated

**Symptoms**: Script runs but no report file created

**Solutions**:
1. Check if `reports/` directory exists: `mkdir -p reports`
2. Verify script permissions: `chmod +x scripts/generate-integrity-report.mjs`
3. Check for script errors: `node scripts/generate-integrity-report.mjs`

### Issue: Empty Check Results

**Symptoms**: Report shows "Total Checks: 0"

**Solutions**:
1. Verify log files exist: `ls reports/integrity-logs/*.log`
2. Run full integrity check: `./scripts/run-integrity-checks.sh`
3. Check log file format and content

### Issue: Service Versions Show N/A

**Symptoms**: PostgreSQL/Redis versions display "N/A"

**Solutions**:
1. Start Docker containers: `docker-compose up -d`
2. Verify containers running: `docker ps`
3. Re-run report generation

### Issue: Security Audit Parse Errors

**Symptoms**: Security section shows errors or 0 vulnerabilities

**Solutions**:
1. Regenerate audit: `pnpm audit --json > reports/integrity-logs/pnpm-audit.json`
2. Verify JSON format: `cat reports/integrity-logs/pnpm-audit.json | jq .`
3. Check file permissions

## 📈 Best Practices

### For Developers

1. **Run checks before committing**:
   ```bash
   ./scripts/run-integrity-checks.sh --quick
   ```

2. **Review report after major changes**:
   - New dependencies
   - Database migrations
   - Build configuration changes

3. **Address failures promptly**:
   - Fix ❌ failed checks immediately
   - Review ⚠️ warnings regularly
   - Plan fixes for 🔒 security issues

4. **Keep logs clean**:
   - Clean old reports periodically
   - Archive important reports
   - Document manual interventions

### For Reviewers/QA

1. **Check report before code review**:
   - All tests should pass
   - No new security vulnerabilities
   - Build must succeed

2. **Verify environment matches**:
   - Node/pnpm versions
   - Service versions
   - Git branch/commit

3. **Document exceptions**:
   - Known issues
   - Temporary failures
   - Planned fixes

### For Stakeholders

1. **Focus on key metrics**:
   - Overall status (Pass/Fail)
   - Security vulnerability count
   - Test coverage trends

2. **Monitor trends**:
   - Compare reports over time
   - Track improvement in metrics
   - Identify recurring issues

3. **Prioritize issues**:
   - Critical/High security issues first
   - Failed checks blocking deployment
   - Maintenance items for sprints

## 🔄 CI/CD Integration

### GitHub Actions

Reports can be automatically generated in CI/CD pipelines:

```yaml
- name: Generate Integrity Report
  run: pnpm integrity-report

- name: Upload Report
  uses: actions/upload-artifact@v4
  with:
    name: integrity-report
    path: reports/
```

### Automated Notifications

Configure notifications for stakeholders:

```bash
# Send report via email
cat reports/INTEGRITY_REPORT_LATEST.md | mail -s "Integrity Report" team@example.com

# Post to Slack
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"New integrity report available"}' \
  $SLACK_WEBHOOK_URL
```

## 📚 Additional Resources

- **Script Documentation**: [scripts/README-INTEGRITY-REPORT.md](../scripts/README-INTEGRITY-REPORT.md)
- **Test Environment Setup**: [TEST_ENVIRONMENT_SETUP.md](../TEST_ENVIRONMENT_SETUP.md)
- **Contributing Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)

## 🤝 Support

For questions or issues:

1. Check this README for solutions
2. Review script documentation
3. Consult detailed logs in `integrity-logs/`
4. Contact the development team

---

*Last Updated: 2025-10-26*
*Generated by: Misskey Integrity Check System*
