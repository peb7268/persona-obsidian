#!/usr/bin/env bash
# watch-events.sh - File watcher for event-driven agent triggers
#
# Usage: ./watch-events.sh <business> [--daemon]
# Example: ./watch-events.sh MHM
#         ./watch-events.sh MHM --daemon
#
# This script:
# 1. Reads event_triggers from schedules.yaml
# 2. Uses fswatch to monitor specified paths
# 3. Triggers appropriate agents on file create/modify events
# 4. Debounces rapid changes to prevent duplicate triggers
#
# Requirements: fswatch (brew install fswatch)

set -e

# Configuration
PERSONA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OBSIDIAN_ROOT="/Users/pbarrick/Documents/Main"

# Arguments
BUSINESS="${1:?Usage: $0 <business> [--daemon]}"
DAEMON_MODE="${2:-}"

# Paths
INSTANCE_PATH="$PERSONA_ROOT/instances/$BUSINESS"
SCHEDULES_FILE="$INSTANCE_PATH/config/schedules.yaml"
LOG_DIR="$INSTANCE_PATH/logs"
LOG_FILE="$LOG_DIR/watch-events.log"
PID_FILE="$INSTANCE_PATH/state/watch-events.pid"
RUN_AGENT_SCRIPT="$PERSONA_ROOT/scripts/run-agent.sh"

# Debounce configuration (seconds)
DEBOUNCE_INTERVAL=5

# Track last trigger times to debounce
declare -A LAST_TRIGGERED

# Ensure directories exist
mkdir -p "$LOG_DIR"

log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"
}

# Check if fswatch is available
check_dependencies() {
    if ! command -v fswatch &> /dev/null; then
        log "ERROR: fswatch not found. Install with: brew install fswatch"
        exit 1
    fi
}

# Parse event triggers from schedules.yaml
# Returns: trigger_name|path|operation|agents (one per line)
parse_event_triggers() {
    local in_triggers=false
    local current_trigger=""
    local trigger_path=""
    local trigger_operation=""
    local trigger_agents=""

    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue

        # Detect event_triggers section
        if [[ "$line" == "event_triggers:" ]]; then
            in_triggers=true
            continue
        fi

        # Stop at next top-level section
        if [ "$in_triggers" = true ] && [[ "$line" =~ ^[a-z] && ! "$line" =~ ^[[:space:]] ]]; then
            in_triggers=false
            continue
        fi

        if [ "$in_triggers" = true ]; then
            # Trigger name (e.g., "  prospect_created:")
            if [[ "$line" =~ ^[[:space:]]{2}([a-z_]+):[[:space:]]*$ ]]; then
                # Output previous trigger if complete
                if [ -n "$current_trigger" ] && [ -n "$trigger_path" ]; then
                    echo "${current_trigger}|${trigger_path}|${trigger_operation:-modify}|${trigger_agents}"
                fi
                current_trigger="${BASH_REMATCH[1]}"
                trigger_path=""
                trigger_operation=""
                trigger_agents=""
                continue
            fi

            # Agents line (e.g., "    agents: [cro, researcher]")
            if [[ "$line" =~ ^[[:space:]]{4}agents:[[:space:]]*\[(.+)\] ]]; then
                trigger_agents="${BASH_REMATCH[1]}"
                trigger_agents="${trigger_agents// /}"  # Remove spaces
                continue
            fi

            # Path line (e.g., "    path: \"Projects/Azienda/MHM/Sales/Prospects/**/*.md\"")
            if [[ "$line" =~ ^[[:space:]]{4}path:[[:space:]]*\"(.+)\" ]]; then
                trigger_path="${BASH_REMATCH[1]}"
                continue
            fi

            # Operation line (e.g., "    operation: create")
            if [[ "$line" =~ ^[[:space:]]{4}operation:[[:space:]]*(.+)$ ]]; then
                trigger_operation="${BASH_REMATCH[1]}"
                continue
            fi
        fi
    done < "$SCHEDULES_FILE"

    # Output last trigger if complete
    if [ -n "$current_trigger" ] && [ -n "$trigger_path" ]; then
        echo "${current_trigger}|${trigger_path}|${trigger_operation:-modify}|${trigger_agents}"
    fi
}

# Convert glob path to full path and fswatch-compatible path
expand_watch_path() {
    local path="$1"
    # Replace ** with actual directory for fswatch
    # fswatch monitors directories, not glob patterns
    local base_path="${path%%\*\**}"
    base_path="${base_path%/}"
    echo "$OBSIDIAN_ROOT/$base_path"
}

# Check if file matches glob pattern
matches_pattern() {
    local file="$1"
    local pattern="$2"

    # Simple glob matching - convert pattern to regex
    local regex="${pattern//\*\*/.*}"
    regex="${regex//\*/[^/]*}"
    regex="^$OBSIDIAN_ROOT/$regex$"

    [[ "$file" =~ $regex ]]
}

# Debounce check - returns 0 if should trigger, 1 if should skip
should_trigger() {
    local key="$1"
    local now=$(date +%s)
    local last="${LAST_TRIGGERED[$key]:-0}"

    if [ $((now - last)) -ge $DEBOUNCE_INTERVAL ]; then
        LAST_TRIGGERED[$key]=$now
        return 0
    fi
    return 1
}

# Handle a file event
handle_event() {
    local file="$1"
    local event_flags="$2"
    local triggers="$3"

    # Determine operation type from flags
    local operation="modify"
    if [[ "$event_flags" == *"Created"* ]]; then
        operation="create"
    elif [[ "$event_flags" == *"Removed"* ]]; then
        operation="delete"
    fi

    log "Event: $operation on $file"

    # Check each trigger
    while IFS='|' read -r trigger_name trigger_path trigger_op trigger_agents; do
        [ -z "$trigger_name" ] && continue

        # Check if operation matches
        if [ "$trigger_op" != "$operation" ] && [ "$trigger_op" != "any" ]; then
            continue
        fi

        # Check if file matches pattern
        if ! matches_pattern "$file" "$trigger_path"; then
            continue
        fi

        # Debounce check
        local debounce_key="${trigger_name}_${file}"
        if ! should_trigger "$debounce_key"; then
            log "  Debounced: $trigger_name (recent trigger)"
            continue
        fi

        log "  Matched trigger: $trigger_name"

        # Trigger each agent
        IFS=',' read -ra agents <<< "$trigger_agents"
        for agent in "${agents[@]}"; do
            agent="${agent// /}"  # Trim whitespace
            log "  Triggering agent: $agent with action: $trigger_name"

            # Run agent in background to not block watcher
            "$RUN_AGENT_SCRIPT" "$BUSINESS" "$agent" "$trigger_name" &
        done
    done <<< "$triggers"
}

# Start watching
start_watching() {
    local triggers=$(parse_event_triggers)

    if [ -z "$triggers" ]; then
        log "No event triggers configured in $SCHEDULES_FILE"
        exit 0
    fi

    # Collect unique watch paths
    declare -A watch_paths
    while IFS='|' read -r trigger_name trigger_path trigger_op trigger_agents; do
        [ -z "$trigger_name" ] && continue
        local watch_path=$(expand_watch_path "$trigger_path")
        watch_paths["$watch_path"]=1
        log "Configured trigger: $trigger_name"
        log "  Path: $trigger_path"
        log "  Operation: $trigger_op"
        log "  Agents: $trigger_agents"
    done <<< "$triggers"

    # Build fswatch command
    local paths=("${!watch_paths[@]}")

    log "=========================================="
    log "Starting file watcher for: $BUSINESS"
    log "Watching ${#paths[@]} paths:"
    for p in "${paths[@]}"; do
        log "  - $p"
    done
    log "=========================================="

    # Save PID if daemon mode
    if [ "$DAEMON_MODE" = "--daemon" ]; then
        echo $$ > "$PID_FILE"
        log "Running in daemon mode (PID: $$)"
    fi

    # Start fswatch
    # -0: Use NUL as separator (handles spaces in paths)
    # -r: Recursive
    # -L: Follow symlinks
    # --event: Filter for relevant events
    fswatch -0 -r -L \
        --event Created \
        --event Updated \
        --event Renamed \
        "${paths[@]}" | while IFS= read -r -d '' file; do
        # Get event details
        local event_flags=$(fswatch -1 --event-flags "$file" 2>/dev/null || echo "Updated")
        handle_event "$file" "$event_flags" "$triggers"
    done
}

# Stop watching (for daemon mode)
stop_watching() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping watcher (PID: $pid)"
            kill "$pid"
            rm -f "$PID_FILE"
        else
            log "Watcher not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        log "No PID file found"
    fi
}

# Cleanup on exit
cleanup() {
    log "Watcher shutting down"
    rm -f "$PID_FILE"
}

trap cleanup EXIT

# Main
check_dependencies

case "$DAEMON_MODE" in
    --daemon)
        start_watching &
        disown
        log "Watcher started in background"
        ;;
    --stop)
        stop_watching
        ;;
    --status)
        if [ -f "$PID_FILE" ]; then
            pid=$(cat "$PID_FILE")
            if kill -0 "$pid" 2>/dev/null; then
                echo "Watcher running (PID: $pid)"
            else
                echo "Watcher not running (stale PID)"
            fi
        else
            echo "Watcher not running"
        fi
        ;;
    *)
        # Foreground mode
        start_watching
        ;;
esac
