# Agent Observability PRD

**Status:** Implemented
**Date:** 2025-12-29
**Priority:** Critical

## Problem Statement

The Persona agent system was reporting false success for every execution, even when:
- Claude CLI was not found (`command not found` error)
- Claude failed to execute
- No output was produced

This made debugging impossible and gave users misleading toast notifications.

## Root Cause Analysis

```
Plugin (ExecutionService.ts) → checks code === 0 ✓
                ↓
run-agent.sh → ALWAYS exits 0 (no matter what) ✗
                ↓
claude ... | tee → pipe masks Claude's exit code ✗
                ↓
log "success" → runs unconditionally ✗
```

**Evidence:** All 16 executions in executions.json showed "completed" with 0-1 second duration (impossible if Claude ran).

## Solution Implemented

### 1. Claude CLI Path from env.md

Added to `config/env.md`:
```markdown
claude_path: /Users/pbarrick/.nvm/versions/node/v20.19.2/bin/claude
```

Script reads this dynamically:
```bash
CLAUDE_PATH=$(grep "^claude_path:" "$ENV_FILE" 2>/dev/null | cut -d: -f2- | xargs)
```

### 2. Embed File Paths

Agents now write to embed files instead of looking for sections in daily notes:
```bash
MHM_EMBED="$OBSIDIAN_ROOT/Resources/General/Embeds/MHM-Business-Section.md"
PERSONAL_MCO_EMBED="$OBSIDIAN_ROOT/Resources/General/Embeds/PersonalMCO-Section.md"
```

### 3. Proper Exit Code Capture

```bash
# Verify Claude CLI exists before running
if [ ! -x "$CLAUDE_PATH" ]; then
    log "ERROR: Claude CLI not found or not executable at $CLAUDE_PATH"
    update_execution_status "failed" "claude_not_found" 127 0
    exit 1
fi

# Run with pipefail to capture real exit code
set -o pipefail

"$CLAUDE_PATH" ... 2>&1 | tee -a "$LOG_FILE" "$CLAUDE_OUTPUT_FILE"

CLAUDE_EXIT_CODE=${PIPESTATUS[0]}
CLAUDE_OUTPUT_SIZE=$(wc -c < "$CLAUDE_OUTPUT_FILE" 2>/dev/null | xargs || echo 0)
```

### 4. Enhanced Execution Status

New `update_execution_status()` function tracks:
- `status`: success, failed, completed
- `reason`: full_output, minimal_output, claude_not_found, claude_error
- `exit_code`: actual exit code from Claude
- `output_bytes`: size of output produced
- `duration_seconds`: actual execution time

### 5. Updated executions.json Schema

```json
{
  "id": "exec-2025-12-29T15-27-05-researcher",
  "agent": "researcher",
  "action": "process-research-queue",
  "started": "2025-12-29T15:27:05Z",
  "ended": "2025-12-29T15:29:42Z",
  "timeout": "2025-12-29T15:47:05Z",
  "pid": 34856,
  "status": "success",
  "reason": "full_output",
  "exit_code": 0,
  "output_bytes": 4521,
  "duration_seconds": 157
}
```

## Transparency Verification

| Check | How It's Verified |
|-------|-------------------|
| Claude found | `[ ! -x "$CLAUDE_PATH" ]` check before running |
| Claude ran | `${PIPESTATUS[0]}` captures actual exit code |
| Output produced | `$CLAUDE_OUTPUT_SIZE` measured in bytes |
| Meaningful work | Requires >100 bytes for "success" status |
| Status accurate | `reason` field explains what happened |
| Duration sanity | `duration_seconds` exposes 0-1s fakes |

## New Log Output Format

**Success:**
```
[timestamp] Executing agent with Claude...
[timestamp] Claude CLI path: /Users/pbarrick/.nvm/.../claude
[timestamp] MHM embed file exists: /path/to/MHM-Business-Section.md
[timestamp] Claude exit code: 0
[timestamp] Claude output size: 4521 bytes
[timestamp] SUCCESS: Agent execution completed with 4521 bytes output
```

**Failure:**
```
[timestamp] Executing agent with Claude...
[timestamp] ERROR: Claude CLI not found or not executable at /path/to/claude
```

## Files Modified

1. `config/env.md` - Added claude_path
2. `scripts/run-agent.sh` - Full observability rewrite
3. `instances/MHM/agents/researcher.md` - Updated tools for embed write access

## Testing

Run any agent and check the log:
```bash
cat Projects/Persona/instances/MHM/logs/agents/researcher-$(date +%Y-%m-%d).log
```

The log will now show actual exit codes, output sizes, and accurate status.
