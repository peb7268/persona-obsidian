#!/bin/bash
# validate-manifest.sh - Validate test manifest against discovered test files
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/../../../test-manifest.json"

# Discover actual test files
TS_ROOT="$SCRIPT_DIR/../../../.obsidian/plugins/persona"
PY_ROOT="$SCRIPT_DIR/../python"

# Check if manifest exists
if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: test-manifest.json not found at $MANIFEST"
  exit 1
fi

# Find TypeScript test files
TS_ACTUAL=$(find "$TS_ROOT/src" -name "*.test.ts" 2>/dev/null | sed "s|$TS_ROOT/||" | sort)

# Find Python test files
PY_ACTUAL=$(find "$PY_ROOT/tests" -name "test_*.py" 2>/dev/null | sed "s|$PY_ROOT/||" | sort)

# Get expected from manifest
TS_EXPECTED=$(jq -r '.typescript.files[]' "$MANIFEST" 2>/dev/null | sort)
PY_EXPECTED=$(jq -r '.python.files[]' "$MANIFEST" 2>/dev/null | sort)

# Compare TypeScript
MISSING_TS=$(comm -23 <(echo "$TS_ACTUAL") <(echo "$TS_EXPECTED") | grep -v '^$' || true)
EXTRA_TS=$(comm -13 <(echo "$TS_ACTUAL") <(echo "$TS_EXPECTED") | grep -v '^$' || true)

# Compare Python
MISSING_PY=$(comm -23 <(echo "$PY_ACTUAL") <(echo "$PY_EXPECTED") | grep -v '^$' || true)
EXTRA_PY=$(comm -13 <(echo "$PY_ACTUAL") <(echo "$PY_EXPECTED") | grep -v '^$' || true)

# Report results
HAS_ERRORS=false

if [ -n "$MISSING_TS" ]; then
  echo "ERROR: TypeScript test files not in manifest:"
  echo "$MISSING_TS" | sed 's/^/  - /'
  HAS_ERRORS=true
fi

if [ -n "$EXTRA_TS" ]; then
  echo "ERROR: TypeScript files in manifest but not found:"
  echo "$EXTRA_TS" | sed 's/^/  - /'
  HAS_ERRORS=true
fi

if [ -n "$MISSING_PY" ]; then
  echo "ERROR: Python test files not in manifest:"
  echo "$MISSING_PY" | sed 's/^/  - /'
  HAS_ERRORS=true
fi

if [ -n "$EXTRA_PY" ]; then
  echo "ERROR: Python files in manifest but not found:"
  echo "$EXTRA_PY" | sed 's/^/  - /'
  HAS_ERRORS=true
fi

if [ "$HAS_ERRORS" = true ]; then
  echo ""
  echo "Test manifest is OUT OF SYNC!"
  echo "Update test-manifest.json to match discovered files."
  exit 1
fi

# Count files
TS_COUNT=$(echo "$TS_EXPECTED" | grep -c '\.ts$' || echo "0")
PY_COUNT=$(echo "$PY_EXPECTED" | grep -c '\.py$' || echo "0")

echo "Test manifest is VALID"
echo "  TypeScript: $TS_COUNT test files"
echo "  Python: $PY_COUNT test files"
exit 0
