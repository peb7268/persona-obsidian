#!/usr/bin/env bash
# uninstall-schedules.sh - Remove launchd plists for agent schedules
#
# Usage: ./uninstall-schedules.sh <business>
# Example: ./uninstall-schedules.sh MHM
#
# This script:
# 1. Finds all Persona launchd plists for the business
# 2. Unloads them from launchctl
# 3. Removes the plist files

set -e

# Configuration
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PREFIX="com.persona"

# Arguments
BUSINESS="${1:?Usage: $0 <business>}"

log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

# Main execution
log "=========================================="
log "Uninstalling schedules for: $BUSINESS"
log "=========================================="

# Find all plists for this business
PATTERN="${PLIST_PREFIX}.${BUSINESS,,}."
removed_count=0

for plist_file in "$LAUNCH_AGENTS_DIR"/${PATTERN}*.plist; do
    # Check if file exists (handle case where glob matches nothing)
    [ -f "$plist_file" ] || continue

    plist_name=$(basename "$plist_file")
    log "Removing: $plist_name"

    # Unload from launchctl
    if launchctl unload "$plist_file" 2>/dev/null; then
        log "  Unloaded from launchctl"
    else
        log "  Was not loaded (already stopped)"
    fi

    # Remove the file
    rm -f "$plist_file"
    log "  Removed plist file"

    ((removed_count++))
done

log "=========================================="
if [ "$removed_count" -eq 0 ]; then
    log "No schedules found for $BUSINESS"
else
    log "Removed $removed_count scheduled jobs"
fi
log "=========================================="
