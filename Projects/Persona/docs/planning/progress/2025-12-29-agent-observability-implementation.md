# 2025-12-29: Agent Observability Implementation

## Summary

Implemented comprehensive observability for the Persona agent system to fix false success reporting and provide transparency into agent execution.

## Problem Solved

- Agents were reporting "success" even when Claude CLI wasn't found
- `executions.json` showed all executions as "completed" with 0-1 second duration
- No way to verify if Claude actually ran or produced output
- Toast notifications in Obsidian were misleading

## Changes Made

### 1. Environment Configuration (`config/env.md`)
- Added `claude_path` variable pointing to nvm-installed Claude CLI
- Script now reads path dynamically instead of assuming `claude` is in PATH

### 2. Embed File Support (`scripts/run-agent.sh`)
- Added `MHM_EMBED` and `PERSONAL_MCO_EMBED` path variables
- Updated `mhm_section_exists()` to check embed file instead of daily note
- Added `personal_mco_section_exists()` function
- Agent prompt now references embed files for output locations

### 3. Proper Exit Code Capture (`scripts/run-agent.sh`)
- Added pre-execution check: `[ ! -x "$CLAUDE_PATH" ]`
- Enabled `set -o pipefail` to capture Claude's exit code through pipe
- Uses `${PIPESTATUS[0]}` to get actual Claude exit code
- Measures output size with `wc -c`

### 4. Enhanced Status Tracking (`scripts/run-agent.sh`)
- New `update_execution_status()` function with fields:
  - `status`: success, failed, completed
  - `reason`: full_output, minimal_output, claude_not_found, claude_error
  - `exit_code`: actual exit code
  - `output_bytes`: output size in bytes
  - `duration_seconds`: actual execution time

### 5. Agent Configuration (`instances/MHM/agents/researcher.md`)
- Added read permission for embed files
- Added write permission for specific embed files
- Updated documentation to reference embed output locations

## Verification

The system now proves each run by logging:
- Claude CLI path and existence
- Embed file existence
- Actual exit code from Claude
- Output size in bytes
- Duration in seconds

False successes are no longer possible because:
- Missing Claude CLI causes immediate exit with code 1
- Failed Claude execution propagates real exit code
- Minimal output (<100 bytes) gets "completed" not "success"
- All metrics are recorded in `executions.json`

## Files Modified

| File | Type |
|------|------|
| `config/env.md` | Configuration |
| `scripts/run-agent.sh` | Script |
| `instances/MHM/agents/researcher.md` | Agent Config |

## Next Steps

1. Test by running researcher agent from Obsidian
2. Verify log shows new detailed output format
3. Check `executions.json` for enhanced status fields
4. Consider adding similar observability to other agents
