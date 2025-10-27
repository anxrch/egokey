#!/bin/bash

#######################################
# Misskey Repository Integrity Checker
#######################################
#
# This script runs comprehensive integrity checks on the Misskey repository
# and generates a detailed report for stakeholders.
#
# Usage:
#   ./scripts/run-integrity-checks.sh [--quick] [--skip-tests] [--skip-build]
#
# Options:
#   --quick       Skip E2E tests and optional checks
#   --skip-tests  Skip all test execution
#   --skip-build  Skip build process (use existing build)
#   --help        Show this help message
#

set -e  # Exit on error (but we'll catch specific errors)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/reports/integrity-logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
QUICK_MODE=false
SKIP_TESTS=false
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --quick)
      QUICK_MODE=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --help)
      head -n 20 "$0" | grep "^#" | sed 's/^# //' | sed 's/^#//'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Functions
print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_step() {
  echo -e "${GREEN}▶${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

run_check() {
  local name="$1"
  local log_file="$2"
  local command="$3"
  local allow_failure="${4:-false}"
  
  print_step "$name"
  
  if eval "$command" 2>&1 | tee "$LOG_DIR/$log_file"; then
    print_success "$name completed successfully"
    return 0
  else
    if [ "$allow_failure" = "true" ]; then
      print_warn "$name completed with warnings/errors (non-critical)"
      return 0
    else
      print_error "$name failed"
      return 1
    fi
  fi
}

# Setup
print_header "Misskey Repository Integrity Check"

echo "Configuration:"
echo "  - Project Root: $PROJECT_ROOT"
echo "  - Log Directory: $LOG_DIR"
echo "  - Timestamp: $TIMESTAMP"
echo "  - Quick Mode: $QUICK_MODE"
echo "  - Skip Tests: $SKIP_TESTS"
echo "  - Skip Build: $SKIP_BUILD"
echo ""

# Create log directory
print_step "Creating log directory..."
mkdir -p "$LOG_DIR"
print_success "Log directory ready"

# Change to project root
cd "$PROJECT_ROOT"

# Start timing
START_TIME=$(date +%s)

# ============================================
# 1. ENVIRONMENT & METADATA
# ============================================
print_header "1. Environment & Metadata"

# Capture environment info
cat > "$LOG_DIR/00-environment.log" <<EOF
=== Environment Information ===
Generated: $(date -Iseconds)
Hostname: $(hostname)
OS: $(uname -s) $(uname -r)
Architecture: $(uname -m)
User: $(whoami)
Working Directory: $(pwd)

=== Git Information ===
Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")
Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Commit Short: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
Last Commit: $(git log -1 --format="%s" 2>/dev/null || echo "N/A")
Last Commit Date: $(git log -1 --format="%ci" 2>/dev/null || echo "N/A")
Last Commit Author: $(git log -1 --format="%an" 2>/dev/null || echo "N/A")
Uncommitted Changes: $(git status --porcelain 2>/dev/null | wc -l || echo "N/A")

=== Tool Versions ===
Node: $(node -v 2>/dev/null || echo "N/A")
pnpm: $(pnpm -v 2>/dev/null || echo "N/A")
npm: $(npm -v 2>/dev/null || echo "N/A")
git: $(git --version 2>/dev/null || echo "N/A")

=== Service Versions ===
PostgreSQL: $(docker exec $(docker ps -q -f name=postgres 2>/dev/null | head -1) psql --version 2>/dev/null || echo "N/A")
Redis: $(docker exec $(docker ps -q -f name=redis 2>/dev/null | head -1) redis-cli --version 2>/dev/null || echo "N/A")
ffmpeg: $(ffmpeg -version 2>/dev/null | head -1 || echo "N/A")

=== Docker Containers ===
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not available")
EOF

print_success "Environment metadata captured"

# ============================================
# 2. DEPENDENCY INTEGRITY
# ============================================
print_header "2. Dependency Integrity"

run_check \
  "Installing dependencies (frozen lockfile)" \
  "01-dependency-install.log" \
  "pnpm install --frozen-lockfile" \
  false

run_check \
  "Security audit" \
  "02-pnpm-audit.log" \
  "pnpm audit --json > $LOG_DIR/pnpm-audit.json 2>&1 || true" \
  true

run_check \
  "Environment health check (pnpm doctor)" \
  "03-pnpm-doctor.log" \
  "pnpm doctor" \
  true

# ============================================
# 3. STATIC ANALYSIS
# ============================================
print_header "3. Static Analysis"

if [ -f "$PROJECT_ROOT/tsconfig.json" ] || [ -f "$PROJECT_ROOT/packages/backend/tsconfig.json" ]; then
  run_check \
    "TypeScript type checking" \
    "04-typecheck.log" \
    "pnpm -r typecheck" \
    true
else
  print_warn "TypeScript config not found, skipping type check"
fi

run_check \
  "ESLint linting" \
  "05-lint.log" \
  "pnpm -r lint" \
  true

# ============================================
# 4. BUILD VERIFICATION
# ============================================
print_header "4. Build Verification"

if [ "$SKIP_BUILD" = "true" ]; then
  print_warn "Skipping build (--skip-build flag)"
  echo "Build skipped by user" > "$LOG_DIR/06-build.log"
else
  # Initialize submodules if needed
  if [ -f ".gitmodules" ]; then
    print_step "Initializing git submodules..."
    git submodule update --init --recursive 2>&1 | tee -a "$LOG_DIR/06-build.log" || true
  fi
  
  run_check \
    "Building all packages" \
    "06-build.log" \
    "pnpm build" \
    false
fi

# ============================================
# 5. INFRASTRUCTURE CHECKS
# ============================================
print_header "5. Infrastructure Checks"

print_step "Checking service connectivity..."
{
  echo "=== Service Connectivity Check ==="
  echo "Generated: $(date -Iseconds)"
  echo ""
  
  # Check PostgreSQL
  if docker ps | grep -q postgres; then
    echo "✓ PostgreSQL container is running"
    if docker exec $(docker ps -q -f name=postgres | head -1) pg_isready 2>/dev/null; then
      echo "✓ PostgreSQL is accepting connections"
    else
      echo "✗ PostgreSQL is not ready"
    fi
  else
    echo "⚠ PostgreSQL container not found"
  fi
  
  echo ""
  
  # Check Redis
  if docker ps | grep -q redis; then
    echo "✓ Redis container is running"
    if docker exec $(docker ps -q -f name=redis | head -1) redis-cli ping 2>/dev/null | grep -q PONG; then
      echo "✓ Redis is responding to PING"
    else
      echo "✗ Redis is not responding"
    fi
  else
    echo "⚠ Redis container not found"
  fi
  
} | tee "$LOG_DIR/07-connectivity.log"

# ============================================
# 6. DATABASE MIGRATIONS
# ============================================
print_header "6. Database Migrations"

if [ -d "$PROJECT_ROOT/packages/backend/migration" ]; then
  if docker ps | grep -q postgres; then
    run_check \
      "Running database migrations" \
      "08-migrations.log" \
      "cd packages/backend && pnpm migrate" \
      true
  else
    print_warn "PostgreSQL not available, skipping migrations"
    echo "PostgreSQL container not running" > "$LOG_DIR/08-migrations.log"
  fi
else
  print_warn "No migration directory found, skipping"
  echo "No migrations found" > "$LOG_DIR/08-migrations.log"
fi

# ============================================
# 7. TESTING
# ============================================
print_header "7. Testing"

if [ "$SKIP_TESTS" = "true" ]; then
  print_warn "Skipping tests (--skip-tests flag)"
  echo "Tests skipped by user" > "$LOG_DIR/09-tests.log"
else
  
  # Backend unit tests
  if [ -d "$PROJECT_ROOT/packages/backend/test" ]; then
    run_check \
      "Backend unit tests" \
      "09-backend-unit-tests.log" \
      "cd packages/backend && pnpm test" \
      true
  fi
  
  # Frontend tests
  if [ -d "$PROJECT_ROOT/packages/frontend/test" ]; then
    run_check \
      "Frontend tests" \
      "10-frontend-tests.log" \
      "cd packages/frontend && pnpm test" \
      true
  fi
  
  # SDK tests
  if [ -d "$PROJECT_ROOT/packages/misskey-js/test" ]; then
    run_check \
      "misskey-js SDK tests" \
      "11-sdk-tests.log" \
      "cd packages/misskey-js && pnpm test" \
      true
  fi
  
  # Backend E2E tests (if not in quick mode)
  if [ "$QUICK_MODE" = "false" ] && [ -d "$PROJECT_ROOT/packages/backend/test/e2e" ]; then
    run_check \
      "Backend E2E tests" \
      "12-backend-e2e-tests.log" \
      "cd packages/backend && pnpm test:e2e" \
      true
  fi
  
  # Cypress E2E tests (if not in quick mode)
  if [ "$QUICK_MODE" = "false" ] && [ -f "$PROJECT_ROOT/cypress.config.ts" ]; then
    run_check \
      "Cypress E2E tests" \
      "13-cypress-tests.log" \
      "pnpm cy:run" \
      true
  fi
  
fi

# ============================================
# 8. REPORT GENERATION
# ============================================
print_header "8. Report Generation"

print_step "Generating comprehensive integrity report..."
if node "$PROJECT_ROOT/scripts/generate-integrity-report.mjs"; then
  print_success "Integrity report generated"
  
  # Display report location
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ Integrity Check Complete!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "📄 Report Location:"
  echo "   - Latest: reports/INTEGRITY_REPORT_LATEST.md"
  echo "   - Timestamped: reports/integrity-report-$(date +%Y-%m-%d).md"
  echo ""
  echo "📁 Detailed Logs:"
  echo "   - Directory: reports/integrity-logs/"
  echo ""
  
  # Calculate duration
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  MINUTES=$((DURATION / 60))
  SECONDS=$((DURATION % 60))
  
  echo "⏱  Total Duration: ${MINUTES}m ${SECONDS}s"
  echo ""
  
  # Quick summary
  echo "Quick Summary:"
  if [ -f "$PROJECT_ROOT/reports/INTEGRITY_REPORT_LATEST.md" ]; then
    grep -A 5 "^## Overview" "$PROJECT_ROOT/reports/INTEGRITY_REPORT_LATEST.md" | tail -n +2 || true
  fi
  
else
  print_error "Failed to generate integrity report"
  exit 1
fi

# ============================================
# 9. NEXT STEPS
# ============================================
echo ""
echo "Next Steps:"
echo "  1. Review the report: less reports/INTEGRITY_REPORT_LATEST.md"
echo "  2. Address any failed checks or high-priority issues"
echo "  3. Share the report with stakeholders"
echo "  4. Update documentation based on findings"
echo ""
