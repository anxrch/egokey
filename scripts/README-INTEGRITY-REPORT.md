# Integrity Report Generator

A comprehensive tool for generating repository health reports after executing integrity checks.

## Overview

The integrity report generator (`generate-integrity-report.mjs`) creates detailed Markdown reports that summarize:

- System and environment metadata
- Git repository status
- Tool and service versions
- Check outcomes from log files
- Security audit findings
- Testing artifacts and coverage
- Actionable recommendations

## Usage

### Quick Start

```bash
# Generate a report from existing logs
pnpm integrity-report

# Or run directly
node scripts/generate-integrity-report.mjs
```

### Output

The script generates two files:

1. **Timestamped Report**: `reports/integrity-report-YYYY-MM-DD.md`
2. **Latest Report**: `reports/INTEGRITY_REPORT_LATEST.md`

## Report Structure

### 1. Overview
- Total checks executed
- Pass/fail/partial/skip counts
- Quick health snapshot

### 2. Environment
- **Git Information**: branch, commit SHA, author, uncommitted changes
- **System Information**: OS, architecture, hostname
- **Tool Versions**: Node.js, pnpm
- **Service Versions**: PostgreSQL, Redis, ffmpeg

### 3. Check Results Summary
- Consolidated status table with links to detailed logs
- Pass (✅), Fail (❌), Partial (⚠️), Skip (⏭️) indicators

### 4. Detailed Results by Category
Results grouped by:
- **Dependency Integrity**: install, audit, doctor
- **Static Analysis**: typecheck, lint
- **Build Verification**: build process
- **Infrastructure**: connectivity checks
- **Database Migrations**: migration execution
- **Tests**: unit, E2E, Cypress

### 5. Security Audit
- Total vulnerabilities by severity (critical, high, moderate, low)
- Detailed information for critical and high severity issues
- CVE references and patched versions
- Affected dependency paths

### 6. Testing Artifacts
- Coverage report locations
- Cypress videos/screenshots
- Test result summaries

### 7. Issues & Recommendations
Prioritized action items:
- **Priority 1**: Critical issues (security, failed checks)
- **Priority 2**: Partial failures and warnings
- **Priority 3**: Maintenance tasks

### 8. Generated Artifacts
- Links to all log files with sizes
- Easy navigation to detailed outputs

### 9. Conclusion
- Overall status determination
- Summary of repository health

## Log File Requirements

The script scans `reports/integrity-logs/` for log files. Log files should follow these patterns:

### File Naming Convention

Use descriptive names that match check types:
- `*-install*.log` → Dependency Installation
- `*-audit*.log` → Security Audit
- `*-typecheck*.log` → Type Checking
- `*-lint*.log` → Linting
- `*-build*.log` → Build Process
- `*-migration*.log` → Database Migrations
- `*-backend-test*.log` → Backend Unit Tests
- `*-frontend-test*.log` → Frontend Tests
- `*-sdk-test*.log` → SDK Tests
- `*-e2e*.log` → E2E Tests
- `*-cypress*.log` → Cypress Tests

### Log File Format

The parser looks for:

**Success Indicators**:
- Keywords: success, passed, OK, PASS
- Symbols: ✓, ✔, ✅

**Failure Indicators**:
- Keywords: error, failed, failing, FAIL, ERROR
- Symbols: ✗, ✖, ❌
- TypeScript errors: TS1234:

**Duration**:
- Patterns: `time: 1.5s`, `duration: 500ms`, `took: 2m`

**Errors**:
- First 5 error lines are extracted for summary

## Security Audit

The script parses `reports/integrity-logs/pnpm-audit.json` for security findings.

### Generating Audit Data

```bash
# Run security audit
pnpm audit --json > reports/integrity-logs/pnpm-audit.json 2>&1
```

### Audit Report Contents

- Vulnerability count by severity
- Module names and versions
- CVE identifiers
- Patch recommendations
- Affected dependency paths

## Example Workflow

### Complete Integrity Check Pipeline

```bash
#!/bin/bash
# Full integrity check with report generation

# Setup
mkdir -p reports/integrity-logs
export LOG_DIR="reports/integrity-logs"

# 1. Dependencies
pnpm install --frozen-lockfile 2>&1 | tee "$LOG_DIR/01-install.log"
pnpm audit --json > "$LOG_DIR/pnpm-audit.json" 2>&1
pnpm doctor 2>&1 | tee "$LOG_DIR/02-doctor.log"

# 2. Static Analysis
pnpm typecheck 2>&1 | tee "$LOG_DIR/03-typecheck.log"
pnpm lint 2>&1 | tee "$LOG_DIR/04-lint.log"

# 3. Build
pnpm build 2>&1 | tee "$LOG_DIR/05-build.log"

# 4. Tests
pnpm test 2>&1 | tee "$LOG_DIR/06-tests.log"
pnpm test-and-coverage 2>&1 | tee "$LOG_DIR/07-coverage.log"

# 5. Database (if applicable)
pnpm migrate 2>&1 | tee "$LOG_DIR/08-migrations.log"

# 6. E2E Tests (if applicable)
pnpm e2e 2>&1 | tee "$LOG_DIR/09-e2e.log"

# 7. Generate Report
pnpm integrity-report

echo "✅ Integrity check complete!"
echo "📄 Report: reports/INTEGRITY_REPORT_LATEST.md"
```

## Customization

### Adding Custom Checks

To add custom checks to the report:

1. Run your check and save output to a log file in `reports/integrity-logs/`
2. Use a descriptive filename (e.g., `10-security-scan.log`)
3. Include success/failure indicators in the output
4. The report generator will automatically include it

### Custom Check Categories

Edit `generate-integrity-report.mjs` to add new categories:

```javascript
const checkMapping = {
  'your-check': { 
    name: 'Your Check Name', 
    category: 'your-category' 
  },
  // ... existing mappings
};
```

Then add the category display name:

```javascript
const categories = {
  'your-category': 'Your Category Name',
  // ... existing categories
};
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integrity Check

on: [push, pull_request]

jobs:
  integrity:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
      
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      
      - name: Create log directory
        run: mkdir -p reports/integrity-logs
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile 2>&1 | tee reports/integrity-logs/install.log
      
      - name: Run audit
        run: pnpm audit --json > reports/integrity-logs/pnpm-audit.json 2>&1 || true
      
      - name: Type check
        run: pnpm typecheck 2>&1 | tee reports/integrity-logs/typecheck.log || true
      
      - name: Lint
        run: pnpm lint 2>&1 | tee reports/integrity-logs/lint.log || true
      
      - name: Build
        run: pnpm build 2>&1 | tee reports/integrity-logs/build.log
      
      - name: Test
        run: pnpm test 2>&1 | tee reports/integrity-logs/test.log || true
      
      - name: Generate Integrity Report
        run: pnpm integrity-report
      
      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: integrity-report
          path: |
            reports/integrity-report-*.md
            reports/integrity-logs/
```

## Best Practices

### 1. Consistent Naming
Use numbered prefixes for logs to maintain order:
- `01-install.log`
- `02-audit.log`
- `03-typecheck.log`

### 2. Capture All Output
Use `tee` to capture output while displaying it:
```bash
command 2>&1 | tee logfile.log
```

### 3. Handle Failures
Use `|| true` for non-critical checks in scripts:
```bash
pnpm lint 2>&1 | tee lint.log || true
```

### 4. Timestamp Logs
Add timestamps to log entries:
```bash
echo "[$(date -Iseconds)] Starting check..." | tee -a logfile.log
command 2>&1 | tee -a logfile.log
echo "[$(date -Iseconds)] Check complete" | tee -a logfile.log
```

### 5. Clean Old Reports
Periodically clean old reports:
```bash
# Keep last 10 reports
ls -t reports/integrity-report-*.md | tail -n +11 | xargs rm -f
```

## Troubleshooting

### No Checks Found

**Problem**: Report shows "Total Checks: 0"

**Solution**: Ensure log files exist in `reports/integrity-logs/` with `.log` extension

### Service Versions Show N/A

**Problem**: PostgreSQL/Redis versions show "N/A"

**Solution**: Ensure Docker containers are running:
```bash
docker ps | grep -E 'postgres|redis'
```

### Security Vulnerabilities Not Parsed

**Problem**: Security section shows 0 vulnerabilities but audit found issues

**Solution**: Ensure `pnpm-audit.json` exists and is valid JSON:
```bash
pnpm audit --json > reports/integrity-logs/pnpm-audit.json 2>&1
cat reports/integrity-logs/pnpm-audit.json | jq .
```

### Parse Errors

**Problem**: Script fails with parsing errors

**Solution**: Check log file encoding and content:
```bash
file reports/integrity-logs/*.log
```

## Output Examples

### Successful Build
```markdown
### ✅ Build Process

- **Status**: PASSED
- **Duration**: 45.2s
- **Log**: [build.log](integrity-logs/build.log) (1.2 MB)
```

### Failed Test
```markdown
### ❌ Backend Unit Tests

- **Status**: FAILED
- **Duration**: 12.5s
- **Log**: [backend-test.log](integrity-logs/backend-test.log) (500 KB)

**Errors/Warnings**:
```
Error: Test suite failed to run
TypeError: Cannot read property 'mock' of undefined
  at Object.<anonymous> (test/unit/service.spec.ts:15:20)
```
```

## Maintenance

### Updating the Generator

When adding new features:

1. Update the parser logic in `parseLogFile()`
2. Add new categories to `checkMapping` and `categories`
3. Update report sections in `generateReport()`
4. Update this README with new features

### Version History

- **v1.0.0**: Initial release with core functionality
  - Metadata gathering
  - Log parsing
  - Security audit parsing
  - Markdown report generation

## Support

For issues or questions:
1. Check this README for common solutions
2. Review existing log files for proper formatting
3. Ensure all dependencies are installed (`pnpm install`)
4. Check script permissions (`chmod +x scripts/generate-integrity-report.mjs`)

## Contributing

Contributions welcome! Please:
1. Test changes thoroughly
2. Update documentation
3. Follow existing code style
4. Add examples for new features
