#!/bin/bash
# test-all.sh - Unified test runner for Persona project
# Usage: ./test-all.sh [--save]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VAULT_ROOT="$(dirname "$(dirname "$PROJECT_ROOT")")"
TEST_RUNS_DIR="$VAULT_ROOT/test-runs"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
SAVE_RUN=false
for arg in "$@"; do
  case $arg in
    --save) SAVE_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [--save]"
      echo "  --save  Save artifacts to test-runs/ directory"
      exit 0
      ;;
  esac
done

# Create timestamped run directory
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%S")
if $SAVE_RUN; then
  RUN_DIR="$TEST_RUNS_DIR/$TIMESTAMP"
  mkdir -p "$RUN_DIR/typescript/coverage"
  mkdir -p "$RUN_DIR/python/coverage"
  echo -e "${BLUE}Saving artifacts to: test-runs/$TIMESTAMP/${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Persona Test Suite${NC}"
echo -e "${BLUE}  $(date -u +"%Y-%m-%d %H:%M:%S UTC")${NC}"
echo -e "${BLUE}========================================${NC}"

# Track results
TS_RESULT=0
PY_RESULT=0
MANIFEST_VALID=0

# 1. Validate manifest
echo -e "\n${YELLOW}[1/3] Validating test manifest...${NC}"
if "$SCRIPT_DIR/validate-manifest.sh"; then
  MANIFEST_VALID=0
else
  MANIFEST_VALID=1
  echo -e "${RED}Manifest validation failed!${NC}"
fi

# 2. Run TypeScript tests
echo -e "\n${YELLOW}[2/3] Running TypeScript tests...${NC}"
cd "$VAULT_ROOT/.obsidian/plugins/persona"

if $SAVE_RUN; then
  npm test -- --ci --coverage --json --outputFile="$RUN_DIR/typescript/results.json" \
    --coverageDirectory="$RUN_DIR/typescript/coverage" 2>&1 | tee "$RUN_DIR/typescript/output.txt" || TS_RESULT=1
  TS_RESULT=${PIPESTATUS[0]}
else
  npm test -- --ci --coverage || TS_RESULT=$?
fi

# 3. Run Python tests
echo -e "\n${YELLOW}[3/3] Running Python tests...${NC}"
cd "$PROJECT_ROOT/python"

# Use Python 3.12 explicitly
PYTHON="/Library/Frameworks/Python.framework/Versions/3.12/bin/python3"
if [ ! -x "$PYTHON" ]; then
  PYTHON="python3"
fi

# Check if pytest is available
if ! $PYTHON -m pytest --version &>/dev/null; then
  echo -e "${RED}pytest not found. Install with: pip install pytest pytest-cov pytest-json-report${NC}"
  PY_RESULT=1
else
  if $SAVE_RUN; then
    $PYTHON -m pytest tests/ -v --tb=short \
      --cov=persona \
      --cov-report=json:"$RUN_DIR/python/coverage/coverage.json" \
      --cov-report=xml:"$RUN_DIR/python/coverage/coverage.xml" \
      --cov-report=html:"$RUN_DIR/python/coverage/html" \
      --json-report --json-report-file="$RUN_DIR/python/results.json" \
      2>&1 | tee "$RUN_DIR/python/output.txt" || PY_RESULT=1
    PY_RESULT=${PIPESTATUS[0]}
  else
    $PYTHON -m pytest tests/ -v --tb=short --cov=persona --cov-report=term || PY_RESULT=$?
  fi
fi

# Determine overall status
if [ $TS_RESULT -eq 0 ] && [ $PY_RESULT -eq 0 ]; then
  STATUS="passed"
else
  STATUS="failed"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Results${NC}"
echo -e "${BLUE}========================================${NC}"
[ $MANIFEST_VALID -eq 0 ] && echo -e "Manifest:   ${GREEN}VALID${NC}" || echo -e "Manifest:   ${RED}INVALID${NC}"
[ $TS_RESULT -eq 0 ] && echo -e "TypeScript: ${GREEN}PASSED${NC}" || echo -e "TypeScript: ${RED}FAILED${NC}"
[ $PY_RESULT -eq 0 ] && echo -e "Python:     ${GREEN}PASSED${NC}" || echo -e "Python:     ${RED}FAILED${NC}"

# Create run.json and update latest symlink
if $SAVE_RUN; then
  # Extract coverage from reports
  TS_COV=$(jq '.total.lines.pct // 0' "$RUN_DIR/typescript/coverage/coverage-summary.json" 2>/dev/null || echo "0")
  PY_COV=$(jq '.totals.percent_covered // 0' "$RUN_DIR/python/coverage/coverage.json" 2>/dev/null || echo "0")

  # Extract test counts from results
  TS_TOTAL=$(jq '.numTotalTests // 0' "$RUN_DIR/typescript/results.json" 2>/dev/null || echo "0")
  TS_PASSED=$(jq '.numPassedTests // 0' "$RUN_DIR/typescript/results.json" 2>/dev/null || echo "0")
  TS_FAILED=$(jq '.numFailedTests // 0' "$RUN_DIR/typescript/results.json" 2>/dev/null || echo "0")

  # Get git info
  BRANCH=$(git branch --show-current 2>/dev/null || echo 'unknown')
  COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')

  cat > "$RUN_DIR/run.json" << EOF
{
  "runId": "$TIMESTAMP",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "trigger": "local",
  "branch": "$BRANCH",
  "commit": "$COMMIT",
  "manifestValid": $([ $MANIFEST_VALID -eq 0 ] && echo "true" || echo "false"),
  "status": "$STATUS",
  "suites": {
    "typescript": {
      "total": $TS_TOTAL,
      "passed": $TS_PASSED,
      "failed": $TS_FAILED,
      "coverage": $TS_COV
    },
    "python": {
      "coverage": $PY_COV
    }
  }
}
EOF

  # Update latest symlink
  rm -f "$TEST_RUNS_DIR/latest"
  ln -s "$TIMESTAMP" "$TEST_RUNS_DIR/latest"

  echo ""
  echo -e "${GREEN}Run saved to: test-runs/$TIMESTAMP/${NC}"
  echo "View TypeScript coverage: open test-runs/$TIMESTAMP/typescript/coverage/lcov-report/index.html"
  echo "View Python coverage:     open test-runs/$TIMESTAMP/python/coverage/html/index.html"
fi

echo ""

# Exit with appropriate code
if [ $TS_RESULT -eq 0 ] && [ $PY_RESULT -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
