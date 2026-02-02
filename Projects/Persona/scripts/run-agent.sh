#!/usr/bin/env bash
# run-agent.sh - Agent execution wrapper with timeout, locking, and registry
#
# Usage: ./run-agent.sh <business> <agent> <action> [timeout]
# Example: ./run-agent.sh MHM cro daily-pipeline-review 600
#
# SAFETY: This script enforces safe daily note handling:
# - Never overwrites existing daily notes
# - Never creates daily notes (Journals plugin must create them first)
# - Queues updates in pending-notes.json if daily note doesn't exist

set -e

# Initialize nvm for non-interactive shells (cron, launchd)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Configuration
PERSONA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OBSIDIAN_ROOT="/Users/pbarrick/Documents/Main"
DAILY_NOTES_DIR="$OBSIDIAN_ROOT/Resources/Agenda/Daily"

# Read configuration from env.md
ENV_FILE="$PERSONA_ROOT/config/env.md"

# Source provider abstraction library
source "$PERSONA_ROOT/scripts/providers.sh"

# Provider configuration will be determined after AGENT_DEF is set
# Legacy fallback for backward compatibility
CLAUDE_PATH=$(grep "^claude_path:" "$ENV_FILE" 2>/dev/null | cut -d: -f2- | xargs)
CLAUDE_PATH="${CLAUDE_PATH:-claude}"  # Fallback to 'claude' if not found

# Embed file paths (agents write here, not directly to daily note)
MHM_EMBED="$OBSIDIAN_ROOT/Resources/General/Embeds/MHM-Business-Section.md"
PERSONAL_MCO_EMBED="$OBSIDIAN_ROOT/Resources/General/Embeds/PersonalMCO-Section.md"

# Arguments
BUSINESS="${1:?Usage: $0 <business> <agent> <action> [timeout]}"
AGENT="${2:?Usage: $0 <business> <agent> <action> [timeout]}"
ACTION="${3:?Usage: $0 <business> <agent> <action> [timeout]}"

# Agent-specific timeouts (seconds)
get_agent_timeout() {
    case "$1" in
        ceo) echo 900 ;;       # 15 min
        cro) echo 600 ;;       # 10 min
        director) echo 300 ;;  # 5 min
        researcher) echo 1200 ;; # 20 min
        assistant) echo 300 ;; # 5 min
        *) echo 600 ;;
    esac
}

DEFAULT_TIMEOUT=$(get_agent_timeout "$AGENT")
TIMEOUT="${4:-$DEFAULT_TIMEOUT}"

# Paths
INSTANCE_PATH="$PERSONA_ROOT/instances/$BUSINESS"
LOCKS_DIR="$INSTANCE_PATH/state/locks"
EXECUTIONS_FILE="$INSTANCE_PATH/state/executions.json"
PENDING_NOTES_FILE="$INSTANCE_PATH/state/pending-notes.json"
PROGRESS_FILE="$INSTANCE_PATH/state/progress.json"
LOG_DIR="$INSTANCE_PATH/logs/agents"
AGENT_DEF="$INSTANCE_PATH/agents/$AGENT.md"
TODAY=$(date +"%Y-%m-%d")

# Use PERSONA_PLAN_DATE if set (from plugin for date-aware Plan Day), otherwise use today
if [ -n "$PERSONA_PLAN_DATE" ]; then
    TARGET_DATE="$PERSONA_PLAN_DATE"
else
    TARGET_DATE="$TODAY"
fi

# Use TARGET_DATE for daily note (may differ from TODAY when planning other days)
DAILY_NOTE="$DAILY_NOTES_DIR/$TARGET_DATE.md"

# Ensure directories exist
mkdir -p "$LOCKS_DIR" "$LOG_DIR"

# Initialize pending-notes.json if needed
if [ ! -f "$PENDING_NOTES_FILE" ]; then
    echo '{"pending": []}' > "$PENDING_NOTES_FILE"
fi

# Initialize executions.json if needed
if [ ! -f "$EXECUTIONS_FILE" ]; then
    echo '{"executions": [], "last_cleanup": null}' > "$EXECUTIONS_FILE"
fi

# Lock file path
LOCK_FILE="$LOCKS_DIR/$AGENT.lock"

# ============================================================================
# STALE PROCESS CLEANUP
# ============================================================================
# Kill any stale processes from previous runs of this agent
cleanup_stale_processes() {
    local stale_pids=$(pgrep -f "run-agent.sh.*$BUSINESS.*$AGENT" 2>/dev/null | grep -v $$ || true)
    if [ -n "$stale_pids" ]; then
        echo "[$(date +"%Y-%m-%d %H:%M:%S")] WARNING: Found stale processes, killing: $stale_pids" >> "$LOG_FILE" 2>/dev/null || true
        echo "$stale_pids" | xargs kill -9 2>/dev/null || true
    fi
}

# Run cleanup before anything else
cleanup_stale_processes

# Execution ID
EXEC_ID="exec-$(date -u +"%Y-%m-%dT%H-%M-%S")-$AGENT"
STARTED=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TIMEOUT_AT=$(date -u -v+${TIMEOUT}S +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+${TIMEOUT} seconds" +"%Y-%m-%dT%H:%M:%SZ")

# Log file
LOG_FILE="$LOG_DIR/$AGENT-$(date +"%Y-%m-%d").log"

log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"
}

# ============================================================================
# DAILY NOTE SAFETY FUNCTIONS
# ============================================================================
# CRITICAL: Never create daily notes - Journals plugin must create them first
# CRITICAL: Never overwrite - always edit/append within existing sections
# ============================================================================

# Check if today's daily note exists
daily_note_exists() {
    [ -f "$DAILY_NOTE" ]
}

# Check if the MHM embed file exists (agents write here, not daily note)
mhm_section_exists() {
    [ -f "$MHM_EMBED" ]
}

# Check if the Personal/MCO embed file exists
personal_mco_section_exists() {
    [ -f "$PERSONAL_MCO_EMBED" ]
}

# Queue a pending update for later (when daily note doesn't exist)
queue_pending_update() {
    local content="$1"
    local temp_file=$(mktemp)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    jq --arg date "$TODAY" \
       --arg agent "$AGENT" \
       --arg action "$ACTION" \
       --arg content "$content" \
       --arg queued "$timestamp" \
       '.pending += [{
           "date": $date,
           "agent": $agent,
           "action": $action,
           "content": $content,
           "queued_at": $queued
       }]' "$PENDING_NOTES_FILE" > "$temp_file" && mv "$temp_file" "$PENDING_NOTES_FILE"

    log "WARNING: Daily note doesn't exist. Update queued to pending-notes.json"
    log "  Run assistant agent or create daily note via Journals plugin first"
}

# Process any pending updates for today
process_pending_updates() {
    if ! daily_note_exists; then
        return 1
    fi

    # Get pending updates for today
    local pending_count=$(jq --arg date "$TODAY" '[.pending[] | select(.date == $date)] | length' "$PENDING_NOTES_FILE" 2>/dev/null || echo "0")

    if [ "$pending_count" -gt 0 ]; then
        log "Found $pending_count pending updates for $TODAY"

        # Extract pending updates
        local updates=$(jq -r --arg date "$TODAY" '.pending[] | select(.date == $date) | "\(.agent): \(.content)"' "$PENDING_NOTES_FILE" 2>/dev/null)

        # Remove processed pending updates
        local temp_file=$(mktemp)
        jq --arg date "$TODAY" '.pending = [.pending[] | select(.date != $date)]' "$PENDING_NOTES_FILE" > "$temp_file" && mv "$temp_file" "$PENDING_NOTES_FILE"

        log "Processed and cleared pending updates"
    fi
}

# Export environment variables for Claude to use
export_daily_note_context() {
    export PERSONA_DAILY_NOTE="$DAILY_NOTE"
    export PERSONA_DAILY_NOTE_EXISTS=$(daily_note_exists && echo "true" || echo "false")
    export PERSONA_MHM_SECTION_EXISTS=$(mhm_section_exists && echo "true" || echo "false")
    export PERSONA_PERSONAL_MCO_EXISTS=$(personal_mco_section_exists && echo "true" || echo "false")
    export PERSONA_PENDING_NOTES_FILE="$PENDING_NOTES_FILE"
    export PERSONA_TODAY="$TODAY"
    # Target date for plan-day action (may differ from TODAY when planning other days)
    export PERSONA_TARGET_DATE="$TARGET_DATE"
    # Embed file paths for agent output
    export PERSONA_MHM_EMBED="$MHM_EMBED"
    export PERSONA_PERSONAL_MCO_EMBED="$PERSONAL_MCO_EMBED"
}

# ============================================================================
# PROGRESS TRACKING
# ============================================================================
# Write progress state for Obsidian plugin to poll

# Count research questions in daily note
count_research_questions() {
    if [ -f "$DAILY_NOTE" ]; then
        # Count [?] and [CB?] markers that aren't already answered
        grep -c '\[?\]' "$DAILY_NOTE" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Initialize progress tracking
init_progress() {
    local question_count=$(count_research_questions)
    local temp_file=$(mktemp)
    cat > "$temp_file" << EOF
{
  "agent": "$AGENT",
  "action": "$ACTION",
  "status": "running",
  "started": "$STARTED",
  "questions_total": $question_count,
  "questions_completed": 0,
  "current_activity": "Starting $AGENT agent...",
  "last_updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    mv "$temp_file" "$PROGRESS_FILE"
    log "Progress initialized: $question_count questions found"
}

# Update progress status
update_progress() {
    local status="$1"
    local activity="$2"
    local questions_done="${3:-0}"
    local temp_file=$(mktemp)
    local questions_total=$(jq -r '.questions_total // 0' "$PROGRESS_FILE" 2>/dev/null || echo "0")

    cat > "$temp_file" << EOF
{
  "agent": "$AGENT",
  "action": "$ACTION",
  "status": "$status",
  "started": "$STARTED",
  "questions_total": $questions_total,
  "questions_completed": $questions_done,
  "current_activity": "$activity",
  "last_updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    mv "$temp_file" "$PROGRESS_FILE"
}

# Clear progress after completion
clear_progress() {
    local final_status="$1"
    local questions_total=$(jq -r '.questions_total // 0' "$PROGRESS_FILE" 2>/dev/null || echo "0")
    local temp_file=$(mktemp)
    cat > "$temp_file" << EOF
{
  "agent": "$AGENT",
  "action": "$ACTION",
  "status": "$final_status",
  "started": "$STARTED",
  "ended": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "questions_total": $questions_total,
  "questions_completed": $questions_total,
  "current_activity": "Completed",
  "last_updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    mv "$temp_file" "$PROGRESS_FILE"
    log "Progress cleared: $final_status"
}

# ============================================================================
# ATOMIC LOCKING WITH MKDIR
# ============================================================================
# Use mkdir for atomic lock acquisition (works on all Unix systems including macOS)
# mkdir is atomic - it either succeeds or fails, no race condition

LOCK_DIR="${LOCK_FILE}.d"

# Check and acquire lock atomically using mkdir
check_and_acquire_lock() {
    if mkdir "$LOCK_DIR" 2>/dev/null; then
        # Lock acquired successfully
        echo $$ > "$LOCK_FILE"
        log "Lock acquired (PID: $$)"
    else
        # Lock exists - check if process is still running
        local existing_pid=$(cat "$LOCK_FILE" 2>/dev/null)
        if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
            log "ERROR: Agent $AGENT already running (PID: $existing_pid)"
            exit 1
        else
            # Stale lock - clean up and retry
            log "WARNING: Stale lock found, cleaning up"
            rm -rf "$LOCK_DIR" "$LOCK_FILE"
            if mkdir "$LOCK_DIR" 2>/dev/null; then
                echo $$ > "$LOCK_FILE"
                log "Lock acquired after cleanup (PID: $$)"
            else
                log "ERROR: Failed to acquire lock after cleanup"
                exit 1
            fi
        fi
    fi
}

# Legacy function aliases for compatibility
check_lock() {
    : # No-op, handled by check_and_acquire_lock
}

acquire_lock() {
    check_and_acquire_lock
}

# Release lock
release_lock() {
    rm -rf "$LOCK_DIR" "$LOCK_FILE"
    log "Lock released"
}

# Register execution start
register_start() {
    local temp_file=$(mktemp)
    jq --arg id "$EXEC_ID" \
       --arg agent "$AGENT" \
       --arg action "$ACTION" \
       --arg started "$STARTED" \
       --arg timeout "$TIMEOUT_AT" \
       --argjson pid $$ \
       '.executions += [{
           "id": $id,
           "agent": $agent,
           "action": $action,
           "started": $started,
           "timeout": $timeout,
           "pid": $pid,
           "status": "running",
           "ended": null
       }]' "$EXECUTIONS_FILE" > "$temp_file" && mv "$temp_file" "$EXECUTIONS_FILE"
    log "Execution registered: $EXEC_ID"
}

# Register execution end (basic - used by cleanup trap)
register_end() {
    local status="$1"
    local ended=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local temp_file=$(mktemp)
    jq --arg id "$EXEC_ID" \
       --arg status "$status" \
       --arg ended "$ended" \
       '(.executions[] | select(.id == $id)) |= . + {
           "status": $status,
           "ended": $ended
       }' "$EXECUTIONS_FILE" > "$temp_file" && mv "$temp_file" "$EXECUTIONS_FILE"
    log "Execution completed: $status"
}

# Enhanced execution status update with full observability
update_execution_status() {
    local status="$1"
    local reason="$2"
    local exit_code="${3:-0}"
    local output_size="${4:-0}"
    local ended=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local started_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$STARTED" "+%s" 2>/dev/null || echo 0)
    local ended_epoch=$(date "+%s")
    local duration=$((ended_epoch - started_epoch))

    local temp_file=$(mktemp)
    jq --arg id "$EXEC_ID" \
       --arg status "$status" \
       --arg reason "$reason" \
       --arg ended "$ended" \
       --argjson exit_code "$exit_code" \
       --argjson output_size "$output_size" \
       --argjson duration "$duration" \
       '(.executions[] | select(.id == $id)) |= . + {
           status: $status,
           reason: $reason,
           exit_code: $exit_code,
           output_bytes: $output_size,
           duration_seconds: $duration,
           ended: $ended
       }' "$EXECUTIONS_FILE" > "$temp_file" && mv "$temp_file" "$EXECUTIONS_FILE"
}

# Cleanup on exit
cleanup() {
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        register_end "completed"
    elif [ $exit_code -eq 124 ]; then
        register_end "timeout"
        log "ERROR: Agent timed out after ${TIMEOUT}s"
    else
        register_end "failed"
        log "ERROR: Agent failed with exit code $exit_code"
    fi
    release_lock
}

trap cleanup EXIT

# Main execution
log "=========================================="
log "Starting agent: $AGENT"
log "Action: $ACTION"
log "Business: $BUSINESS"
log "Timeout: ${TIMEOUT}s"
if [ "$TARGET_DATE" != "$TODAY" ]; then
    log "Target Date: $TARGET_DATE (planning for different day)"
else
    log "Target Date: $TARGET_DATE"
fi
log "=========================================="

# Verify agent definition exists
if [ ! -f "$AGENT_DEF" ]; then
    log "ERROR: Agent definition not found: $AGENT_DEF"
    exit 1
fi

# Check and acquire lock
check_lock
acquire_lock

# Register start
register_start

# ============================================================================
# EVENT PUBLISHING (Unified Eventing System)
# ============================================================================
# Publish events to Supabase via bridge.py's publish_event function
# Events are:
# 1. Sent to pgmq queue (guaranteed delivery)
# 2. Logged to events table (observability/audit trail)
# 3. Update jobs table status (triggers Realtime for UI)
#
# Environment variables:
# - PERSONA_JOB_ID: Job short ID (from ExecutionService.ts)
# - PERSONA_SUPABASE_URL: Supabase URL
# - PERSONA_SUPABASE_KEY: Supabase service role key
# - EXEC_ID: Execution trace ID for correlating events

publish_event() {
    local event_type="$1"
    local data="$2"

    # Skip if no job ID (not launched via queue consumer)
    if [ -z "$PERSONA_JOB_ID" ]; then
        return 0
    fi

    # Skip if no Supabase config
    if [ -z "$PERSONA_SUPABASE_URL" ] || [ -z "$PERSONA_SUPABASE_KEY" ]; then
        log "WARNING: Supabase not configured, skipping event publish"
        return 0
    fi

    log "Publishing event: $event_type for job $PERSONA_JOB_ID"

    # Call bridge.py to publish event (fire-and-forget, don't fail the script)
    PYTHONPATH="$PERSONA_ROOT/python" \
    SUPABASE_URL="$PERSONA_SUPABASE_URL" \
    SUPABASE_KEY="$PERSONA_SUPABASE_KEY" \
    PERSONA_EXEC_ID="$EXEC_ID" \
    python3 "$PERSONA_ROOT/python/persona/bridge.py" \
        publish_event "$event_type" "$PERSONA_JOB_ID" "$data" "bash" 2>/dev/null || {
        log "WARNING: Failed to publish event (bridge.py error)"
        return 0  # Don't fail the script
    }

    log "Event published successfully: $event_type"
}

# Publish job.started event now that we have the lock
publish_event "job.started" "{\"pid\":$$}"

# Initialize progress tracking
init_progress

# ============================================================================
# EARLY EXIT: Skip researcher if no questions to process
# ============================================================================
# This saves ~15-40 seconds of Claude Code startup time when there's nothing to do
if [ "$AGENT" = "researcher" ] && [ "$ACTION" = "process-research-queue" ]; then
    QUESTION_COUNT=$(count_research_questions)
    if [ "$QUESTION_COUNT" -eq 0 ]; then
        log "No research questions found, skipping agent invocation"
        update_progress "completed" "No questions to process" 0
        clear_progress "completed"
        update_execution_status "success" "no_questions" 0 0
        # Publish job.completed event (no work needed)
        publish_event "job.completed" "{\"output_size\":0,\"skipped\":true,\"reason\":\"no_questions\"}"
        exit 0
    fi
fi

# Export daily note context for Claude
export_daily_note_context

# Log daily note and embed file status
if daily_note_exists; then
    log "Daily note exists: $DAILY_NOTE"
else
    log "WARNING: Daily note does not exist yet"
    log "  Agent should NOT create it - use Journals plugin first"
fi

if mhm_section_exists; then
    log "MHM embed file exists: $MHM_EMBED"
else
    log "WARNING: MHM embed file not found: $MHM_EMBED"
fi

if personal_mco_section_exists; then
    log "Personal/MCO embed file exists: $PERSONAL_MCO_EMBED"
else
    log "WARNING: Personal/MCO embed file not found: $PERSONAL_MCO_EMBED"
fi

# Process any pending updates from previous runs
process_pending_updates

# Build the agent prompt
AGENT_PROMPT=$(cat << 'PROMPT_EOF'
You are executing as the AGENT_NAME agent for BUSINESS_NAME.
Action: ACTION_NAME

CRITICAL DAILY NOTE RULES:
1. NEVER create daily notes - they must be created via Journals plugin first
2. NEVER overwrite daily notes - always use Edit tool to modify existing content
3. Write MHM updates to the embed file: MHM_EMBED_PATH
4. Write Personal/MCO updates to the embed file: PERSONAL_MCO_EMBED_PATH
5. If daily note does not exist, queue updates via the pending-notes.json file

Environment Context:
- Daily Note: DAILY_NOTE_PATH
- Daily Note Exists: DAILY_NOTE_EXISTS_VAL
- MHM Embed File: MHM_EMBED_PATH
- Personal/MCO Embed File: PERSONAL_MCO_EMBED_PATH
- Today: TODAY_DATE
- Target Date: TARGET_DATE_VAL (the date to plan for - may differ from today)

Read your agent definition at: AGENT_DEF_PATH
Follow the instructions for action: ACTION_NAME

Business files location: BUSINESS_FILES_PATH
State files location: STATE_FILES_PATH
PROMPT_EOF
)

# Substitute variables into the prompt
AGENT_PROMPT="${AGENT_PROMPT//AGENT_NAME/$AGENT}"
AGENT_PROMPT="${AGENT_PROMPT//BUSINESS_NAME/$BUSINESS}"
AGENT_PROMPT="${AGENT_PROMPT//ACTION_NAME/$ACTION}"
AGENT_PROMPT="${AGENT_PROMPT//DAILY_NOTE_PATH/$DAILY_NOTE}"
AGENT_PROMPT="${AGENT_PROMPT//DAILY_NOTE_EXISTS_VAL/$PERSONA_DAILY_NOTE_EXISTS}"
AGENT_PROMPT="${AGENT_PROMPT//MHM_EMBED_PATH/$MHM_EMBED}"
AGENT_PROMPT="${AGENT_PROMPT//PERSONAL_MCO_EMBED_PATH/$PERSONAL_MCO_EMBED}"
AGENT_PROMPT="${AGENT_PROMPT//TODAY_DATE/$TODAY}"
AGENT_PROMPT="${AGENT_PROMPT//TARGET_DATE_VAL/$TARGET_DATE}"
AGENT_PROMPT="${AGENT_PROMPT//AGENT_DEF_PATH/$AGENT_DEF}"
AGENT_PROMPT="${AGENT_PROMPT//BUSINESS_FILES_PATH/$OBSIDIAN_ROOT/Projects/Azienda/$BUSINESS/}"
AGENT_PROMPT="${AGENT_PROMPT//STATE_FILES_PATH/$INSTANCE_PATH/state/}"

# Determine provider from agent definition or default
PROVIDER=$(get_provider "$AGENT_DEF")
PROVIDER_PATH=$(get_provider_path "$PROVIDER")
PROVIDER_MODEL=$(get_provider_model "$PROVIDER" "$AGENT_DEF")
PROVIDER_NAME=$(get_provider_name "$PROVIDER")

log "Executing agent with $PROVIDER_NAME..."
log "Provider: $PROVIDER"
log "Provider path: $PROVIDER_PATH"
log "Model: $PROVIDER_MODEL"

# Verify provider CLI exists before running
if ! check_provider_available "$PROVIDER" "$PROVIDER_PATH"; then
    log "ERROR: Provider CLI not found or not executable at $PROVIDER_PATH"
    update_execution_status "failed" "provider_not_found" 127 0
    exit 1
fi

# ============================================================================
# PROVIDER INVOCATION WITH TIMEOUT AND NON-INTERACTIVE MODE
# ============================================================================
# Set environment variables to ensure non-interactive operation
export CI=true
export TERM=dumb
export CLAUDE_CODE_ENTRY_POINT=cli  # Helps identify headless invocation
export PERSONA_INSTANCE_PATH="$INSTANCE_PATH"  # For Jules provider

# Run provider with proper exit code capture
set -o pipefail  # Make pipe return first non-zero exit code

PROVIDER_OUTPUT_FILE="$LOG_DIR/$AGENT-$(date +"%Y-%m-%d")-output.txt"
# Legacy alias for backward compatibility
CLAUDE_OUTPUT_FILE="$PROVIDER_OUTPUT_FILE"

# Clear previous output file for this run
> "$CLAUDE_OUTPUT_FILE"

log "Starting $PROVIDER_NAME with ${TIMEOUT}s timeout..."

# Update progress to show Claude is executing
update_progress "running" "Processing research questions..." 0

# macOS-compatible timeout implementation using background process
# Store the current shell's PID for the watchdog
PARENT_PID=$$

# Start watchdog timer in background
(
    sleep "$TIMEOUT"
    # Find and kill the provider process started by this script
    PROVIDER_PID=$(pgrep -P $PARENT_PID -f "$PROVIDER_PATH" 2>/dev/null | head -1)
    if [ -n "$PROVIDER_PID" ]; then
        kill -TERM "$PROVIDER_PID" 2>/dev/null
        sleep 5
        kill -9 "$PROVIDER_PID" 2>/dev/null
    fi
    # Also kill any tee processes from this script
    pkill -P $PARENT_PID -f "tee" 2>/dev/null || true
) &
WATCHDOG_PID=$!

# Run provider with prompt via stdin (more reliable for long prompts)
invoke_provider "$PROVIDER" "$PROVIDER_PATH" "$PROVIDER_MODEL" \
    "$AGENT_PROMPT" "$LOG_FILE" "$PROVIDER_OUTPUT_FILE" &
PROVIDER_PIPE_PID=$!
# Legacy alias
CLAUDE_PIPE_PID=$PROVIDER_PIPE_PID

# Wait for the pipe to complete
wait $CLAUDE_PIPE_PID 2>/dev/null
CLAUDE_EXIT_CODE=$?

# Kill the watchdog if it's still running (Claude finished in time)
kill $WATCHDOG_PID 2>/dev/null || true
wait $WATCHDOG_PID 2>/dev/null || true

# Check if provider was killed by timeout (SIGTERM = 143, SIGKILL = 137)
if [ $CLAUDE_EXIT_CODE -eq 143 ] || [ $CLAUDE_EXIT_CODE -eq 137 ]; then
    log "ERROR: $PROVIDER_NAME execution timed out after ${TIMEOUT}s"
    update_execution_status "failed" "timeout" 124 0
    clear_progress "timeout"
    # Publish job.failed event (timeout)
    publish_event "job.failed" "{\"error\":\"Timeout: exceeded ${TIMEOUT}s limit\",\"timeout\":true,\"exit_code\":124}"
    exit 124
fi
PROVIDER_OUTPUT_SIZE=$(wc -c < "$PROVIDER_OUTPUT_FILE" 2>/dev/null | xargs || echo 0)
# Legacy alias
CLAUDE_OUTPUT_SIZE=$PROVIDER_OUTPUT_SIZE

# Log actual results
log "$PROVIDER_NAME exit code: $CLAUDE_EXIT_CODE"
log "$PROVIDER_NAME output size: $PROVIDER_OUTPUT_SIZE bytes"

# Determine actual status based on exit code and output
if [ $CLAUDE_EXIT_CODE -ne 0 ]; then
    log "ERROR: $PROVIDER_NAME execution failed with exit code $CLAUDE_EXIT_CODE"
    update_execution_status "failed" "provider_error" $CLAUDE_EXIT_CODE $PROVIDER_OUTPUT_SIZE
    clear_progress "failed"
    # Publish job.failed event
    publish_event "job.failed" "{\"error\":\"Provider error: exit code $CLAUDE_EXIT_CODE\",\"exit_code\":$CLAUDE_EXIT_CODE,\"output_size\":$PROVIDER_OUTPUT_SIZE}"
    exit $CLAUDE_EXIT_CODE
elif [ "$PROVIDER_OUTPUT_SIZE" -lt 100 ]; then
    log "WARNING: $PROVIDER_NAME produced minimal output ($PROVIDER_OUTPUT_SIZE bytes) - possible issue"
    update_execution_status "completed" "minimal_output" 0 $PROVIDER_OUTPUT_SIZE
    clear_progress "completed"
    # Publish job.completed event (minimal output is still success)
    publish_event "job.completed" "{\"output_size\":$PROVIDER_OUTPUT_SIZE,\"minimal_output\":true}"
else
    log "SUCCESS: Agent execution completed with $PROVIDER_OUTPUT_SIZE bytes output"
    update_execution_status "success" "full_output" 0 $PROVIDER_OUTPUT_SIZE
    clear_progress "success"
    # Publish job.completed event
    publish_event "job.completed" "{\"output_size\":$PROVIDER_OUTPUT_SIZE}"
fi
