#!/usr/bin/env bash
# check-agents.sh - Health check, zombie cleanup, and status report generator
#
# Usage: ./check-agents.sh <business>
# Example: ./check-agents.sh MHM
#
# Run via cron every 15 minutes:
# */15 * * * * /path/to/check-agents.sh MHM

set -e

# Configuration
PERSONA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OBSIDIAN_ROOT="/Users/pbarrick/Documents/Main"

# Arguments
BUSINESS="${1:?Usage: $0 <business>}"

# Paths
INSTANCE_PATH="$PERSONA_ROOT/instances/$BUSINESS"
LOCKS_DIR="$INSTANCE_PATH/state/locks"
EXECUTIONS_FILE="$INSTANCE_PATH/state/executions.json"
STATUS_FILE="$INSTANCE_PATH/state/status.md"
LOG_DIR="$INSTANCE_PATH/logs/agents"
DAILY_NOTES_DIR="$OBSIDIAN_ROOT/Resources/Agenda/Daily"

# Agent timeouts (seconds) - kill threshold is 2x
get_agent_timeout() {
    case "$1" in
        ceo) echo 900 ;;
        cro) echo 600 ;;
        director) echo 300 ;;
        researcher) echo 1200 ;;
        assistant) echo 300 ;;
        *) echo 600 ;;
    esac
}

# Today's date for daily notes
TODAY=$(date +"%Y-%m-%d")
DAILY_NOTE="$DAILY_NOTES_DIR/$TODAY.md"

# Ensure directories exist
mkdir -p "$LOCKS_DIR" "$LOG_DIR"

log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

# Write alert to daily notes
write_alert() {
    local message="$1"
    local timestamp=$(date +"%H:%M")

    # Create alert section if needed
    if [ -f "$DAILY_NOTE" ]; then
        if ! grep -q "## Persona Alerts" "$DAILY_NOTE"; then
            echo -e "\n## Persona Alerts\n" >> "$DAILY_NOTE"
        fi
        echo "- **$timestamp**: $message" >> "$DAILY_NOTE"
    fi

    log "ALERT: $message"
}

# Find zombie processes (running longer than timeout)
find_zombies() {
    local now=$(date +%s)
    local zombies=()

    if [ ! -f "$EXECUTIONS_FILE" ]; then
        return
    fi

    # Get running executions
    local running=$(jq -r '.executions[] | select(.status == "running") | "\(.agent)|\(.pid)|\(.timeout)"' "$EXECUTIONS_FILE" 2>/dev/null)

    while IFS='|' read -r agent pid timeout_str; do
        [ -z "$agent" ] && continue

        # Parse timeout timestamp
        local timeout_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$timeout_str" +%s 2>/dev/null || date -d "$timeout_str" +%s 2>/dev/null)

        if [ -n "$timeout_epoch" ] && [ "$now" -gt "$timeout_epoch" ]; then
            # Check if process is actually running
            if kill -0 "$pid" 2>/dev/null; then
                local overtime=$((now - timeout_epoch))
                local agent_timeout=$(get_agent_timeout "$agent")
                local kill_threshold=$((agent_timeout * 2))

                if [ "$overtime" -gt "$agent_timeout" ]; then
                    # Past 2x timeout - kill it
                    zombies+=("$agent:$pid:kill")
                else
                    # Past 1x timeout - alert only
                    zombies+=("$agent:$pid:alert")
                fi
            fi
        fi
    done <<< "$running"

    echo "${zombies[@]}"
}

# Process zombies with conservative policy
process_zombies() {
    local zombies=($@)

    for zombie in "${zombies[@]}"; do
        IFS=':' read -r agent pid action <<< "$zombie"

        case "$action" in
            alert)
                write_alert "Agent '$agent' (PID: $pid) running past timeout - monitoring"
                ;;
            kill)
                write_alert "Agent '$agent' (PID: $pid) killed - exceeded 2x timeout"
                kill -9 "$pid" 2>/dev/null || true

                # Update execution status
                local temp_file=$(mktemp)
                jq --argjson pid "$pid" \
                   '(.executions[] | select(.pid == $pid and .status == "running")) |= . + {
                       "status": "timeout",
                       "ended": (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
                   }' "$EXECUTIONS_FILE" > "$temp_file" && mv "$temp_file" "$EXECUTIONS_FILE"
                ;;
        esac
    done
}

# Clean up stale locks
cleanup_stale_locks() {
    for lock_file in "$LOCKS_DIR"/*.lock; do
        [ -f "$lock_file" ] || continue

        local pid=$(cat "$lock_file" 2>/dev/null)
        if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
            log "Cleaning stale lock: $(basename "$lock_file")"
            rm -f "$lock_file"
        fi
    done
}

# Prune old executions (keep last 100)
prune_old_executions() {
    if [ -f "$EXECUTIONS_FILE" ]; then
        local temp_file=$(mktemp)
        local now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        jq --arg now "$now" '.executions = (.executions | sort_by(.started) | reverse | .[0:100]) | .last_cleanup = $now' \
            "$EXECUTIONS_FILE" > "$temp_file" && mv "$temp_file" "$EXECUTIONS_FILE"
    fi
}

# Get next scheduled run for agent
get_next_run() {
    local agent="$1"
    local schedules_file="$INSTANCE_PATH/config/schedules.yaml"

    # Simple schedule lookup - in practice would parse cron
    case "$agent" in
        ceo) echo "Sun 09:00" ;;
        cro) echo "Tomorrow 06:00" ;;
        director) echo "Next hour" ;;
        researcher) echo "Tomorrow 06:00" ;;
        assistant) echo "17:00" ;;
        *) echo "-" ;;
    esac
}

# Generate status dashboard
generate_status_report() {
    local now=$(date +"%Y-%m-%d %H:%M:%S")

    cat > "$STATUS_FILE" << EOF
# Agent Status Dashboard
*Last Updated: $now*

## Current Status

| Agent | Status | Last Run | Duration | Next Run |
|-------|--------|----------|----------|----------|
EOF

    # Get status for each agent
    for agent in ceo cro director researcher assistant; do
        local status="Idle"
        local last_run="-"
        local duration="-"
        local next_run=$(get_next_run "$agent")

        # Check if currently running
        if [ -f "$LOCKS_DIR/$agent.lock" ]; then
            local pid=$(cat "$LOCKS_DIR/$agent.lock" 2>/dev/null)
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                status="Running"
            fi
        fi

        # Get last completed execution
        if [ -f "$EXECUTIONS_FILE" ]; then
            local last=$(jq -r --arg agent "$agent" \
                '.executions | map(select(.agent == $agent and .status != "running")) | sort_by(.started) | reverse | .[0] // empty | "\(.started)|\(.ended)"' \
                "$EXECUTIONS_FILE" 2>/dev/null)

            if [ -n "$last" ]; then
                IFS='|' read -r started ended <<< "$last"
                if [ -n "$started" ]; then
                    last_run=$(echo "$started" | sed 's/T/ /; s/Z//' | cut -c1-16)

                    if [ -n "$ended" ] && [ "$ended" != "null" ]; then
                        # Calculate duration
                        local start_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$started" +%s 2>/dev/null || date -d "$started" +%s 2>/dev/null)
                        local end_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$ended" +%s 2>/dev/null || date -d "$ended" +%s 2>/dev/null)
                        if [ -n "$start_epoch" ] && [ -n "$end_epoch" ]; then
                            local dur=$((end_epoch - start_epoch))
                            local mins=$((dur / 60))
                            local secs=$((dur % 60))
                            duration="${mins}m ${secs}s"
                        fi
                    fi
                fi
            fi
        fi

        echo "| $agent | $status | $last_run | $duration | $next_run |" >> "$STATUS_FILE"
    done

    # Add recent executions
    cat >> "$STATUS_FILE" << EOF

## Recent Executions (Last 24h)

EOF

    if [ -f "$EXECUTIONS_FILE" ]; then
        jq -r '.executions | sort_by(.started) | reverse | .[0:10] | .[] |
            "- \(.started | split("T")[1] | split(":")[0:2] | join(":")) \(.agent): \(.action) (\(.status))"' \
            "$EXECUTIONS_FILE" 2>/dev/null >> "$STATUS_FILE" || echo "- No recent executions" >> "$STATUS_FILE"
    else
        echo "- No executions recorded yet" >> "$STATUS_FILE"
    fi

    # Add alerts section
    cat >> "$STATUS_FILE" << EOF

## Alerts

EOF

    local has_alerts=false

    # Check for running agents past timeout
    if [ -f "$EXECUTIONS_FILE" ]; then
        local running=$(jq -r '.executions[] | select(.status == "running") | .agent' "$EXECUTIONS_FILE" 2>/dev/null)
        if [ -n "$running" ]; then
            echo "- **Running**: $running" >> "$STATUS_FILE"
            has_alerts=true
        fi
    fi

    if [ "$has_alerts" = false ]; then
        echo "- None" >> "$STATUS_FILE"
    fi

    log "Status report generated: $STATUS_FILE"
}

# Main execution
log "=========================================="
log "Health check for: $BUSINESS"
log "=========================================="

# Find and process zombies
zombies=$(find_zombies)
if [ -n "$zombies" ]; then
    log "Found potential zombies: $zombies"
    process_zombies $zombies
fi

# Clean up stale locks
cleanup_stale_locks

# Prune old executions
prune_old_executions

# Generate status report
generate_status_report

log "Health check complete"
