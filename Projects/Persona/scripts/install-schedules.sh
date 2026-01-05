#!/usr/bin/env bash
# install-schedules.sh - Generate and install launchd plists for agent schedules
#
# Usage: ./install-schedules.sh <business>
# Example: ./install-schedules.sh MHM
#
# This script:
# 1. Parses schedules.yaml for the business instance
# 2. Generates launchd plist files for each scheduled agent action
# 3. Installs them to ~/Library/LaunchAgents/
# 4. Loads them with launchctl

set -e

# Configuration
PERSONA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PREFIX="com.persona"

# Arguments
BUSINESS="${1:?Usage: $0 <business>}"

# Paths
INSTANCE_PATH="$PERSONA_ROOT/instances/$BUSINESS"
SCHEDULES_FILE="$INSTANCE_PATH/config/schedules.yaml"
RUN_AGENT_SCRIPT="$PERSONA_ROOT/scripts/run-agent.sh"

# Ensure LaunchAgents directory exists
mkdir -p "$LAUNCH_AGENTS_DIR"

log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

# Verify schedules file exists
if [ ! -f "$SCHEDULES_FILE" ]; then
    log "ERROR: Schedules file not found: $SCHEDULES_FILE"
    exit 1
fi

# Convert cron expression to launchd StartCalendarInterval
# Cron format: minute hour day-of-month month day-of-week
# Returns XML snippet for plist
cron_to_launchd() {
    local cron="$1"
    local minute hour day month weekday

    # Parse cron fields
    read -r minute hour day month weekday <<< "$cron"

    local xml="<key>StartCalendarInterval</key>\n"

    # Check if we need an array (for multiple weekdays or hours)
    if [[ "$weekday" == *"-"* ]] || [[ "$hour" == *"-"* ]]; then
        xml+="<array>\n"

        # Handle hour ranges (e.g., 9-17)
        local hour_start hour_end
        if [[ "$hour" == *"-"* ]]; then
            hour_start="${hour%-*}"
            hour_end="${hour#*-}"
        else
            hour_start="$hour"
            hour_end="$hour"
        fi

        # Handle weekday ranges (e.g., 1-5)
        local weekday_start weekday_end
        if [[ "$weekday" == *"-"* ]]; then
            weekday_start="${weekday%-*}"
            weekday_end="${weekday#*-}"
        else
            weekday_start="$weekday"
            weekday_end="$weekday"
        fi

        # Generate entries for each combination
        for ((h=hour_start; h<=hour_end; h++)); do
            for ((w=weekday_start; w<=weekday_end; w++)); do
                xml+="    <dict>\n"
                [ "$minute" != "*" ] && xml+="        <key>Minute</key><integer>$minute</integer>\n"
                xml+="        <key>Hour</key><integer>$h</integer>\n"
                [ "$day" != "*" ] && xml+="        <key>Day</key><integer>$day</integer>\n"
                [ "$month" != "*" ] && xml+="        <key>Month</key><integer>$month</integer>\n"
                xml+="        <key>Weekday</key><integer>$w</integer>\n"
                xml+="    </dict>\n"
            done
        done

        xml+="</array>"
    else
        # Single schedule entry
        xml+="<dict>\n"
        [ "$minute" != "*" ] && xml+="    <key>Minute</key><integer>$minute</integer>\n"
        [ "$hour" != "*" ] && xml+="    <key>Hour</key><integer>$hour</integer>\n"
        [ "$day" != "*" ] && xml+="    <key>Day</key><integer>$day</integer>\n"
        [ "$month" != "*" ] && xml+="    <key>Month</key><integer>$month</integer>\n"
        [ "$weekday" != "*" ] && xml+="    <key>Weekday</key><integer>$weekday</integer>\n"
        xml+="</dict>"
    fi

    echo -e "$xml"
}

# Generate plist content
generate_plist() {
    local business="$1"
    local agent="$2"
    local action="$3"
    local cron="$4"

    local label="${PLIST_PREFIX}.${business,,}.${agent}.${action}"
    local log_file="$INSTANCE_PATH/logs/agents/${agent}-launchd.log"

    local calendar_interval
    calendar_interval=$(cron_to_launchd "$cron")

    cat << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$label</string>

    <key>ProgramArguments</key>
    <array>
        <string>$RUN_AGENT_SCRIPT</string>
        <string>$business</string>
        <string>$agent</string>
        <string>$action</string>
    </array>

    $calendar_interval

    <key>StandardOutPath</key>
    <string>$log_file</string>

    <key>StandardErrorPath</key>
    <string>$log_file</string>

    <key>WorkingDirectory</key>
    <string>$PERSONA_ROOT</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
</dict>
</plist>
EOF
}

# Parse schedules.yaml and generate plists
# Using a simple parser since we can't rely on yq being installed
parse_and_install() {
    local current_agent=""
    local in_schedules=false
    local schedule_name=""
    local schedule_cron=""
    local schedule_action=""
    local installed_count=0

    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue

        # Detect schedules section
        if [[ "$line" == "schedules:" ]]; then
            in_schedules=true
            continue
        fi

        # Detect event_triggers section (stop parsing schedules)
        if [[ "$line" == "event_triggers:" ]]; then
            in_schedules=false
            continue
        fi

        if [ "$in_schedules" = true ]; then
            # Agent line (e.g., "  ceo:")
            if [[ "$line" =~ ^[[:space:]]{2}([a-z_]+):[[:space:]]*$ ]]; then
                current_agent="${BASH_REMATCH[1]}"
                continue
            fi

            # Schedule entry start (e.g., "    - name: weekly-planning")
            if [[ "$line" =~ ^[[:space:]]{4}-[[:space:]]*name:[[:space:]]*(.+)$ ]]; then
                schedule_name="${BASH_REMATCH[1]}"
                schedule_cron=""
                schedule_action=""
                continue
            fi

            # Cron line (e.g., "      cron: \"0 9 * * 0\"")
            if [[ "$line" =~ ^[[:space:]]{6}cron:[[:space:]]*\"(.+)\"$ ]]; then
                schedule_cron="${BASH_REMATCH[1]}"
                continue
            fi

            # Action line (e.g., "      action: weekly-review")
            if [[ "$line" =~ ^[[:space:]]{6}action:[[:space:]]*(.+)$ ]]; then
                schedule_action="${BASH_REMATCH[1]}"

                # We have all the info, generate and install plist
                if [ -n "$current_agent" ] && [ -n "$schedule_cron" ] && [ -n "$schedule_action" ]; then
                    local plist_name="${PLIST_PREFIX}.${BUSINESS,,}.${current_agent}.${schedule_action}.plist"
                    local plist_path="$LAUNCH_AGENTS_DIR/$plist_name"

                    log "Installing: $plist_name"
                    log "  Agent: $current_agent, Action: $schedule_action"
                    log "  Cron: $schedule_cron"

                    # Unload if already loaded
                    launchctl unload "$plist_path" 2>/dev/null || true

                    # Generate and write plist
                    generate_plist "$BUSINESS" "$current_agent" "$schedule_action" "$schedule_cron" > "$plist_path"

                    # Load the plist
                    launchctl load "$plist_path"

                    ((installed_count++))
                fi
                continue
            fi
        fi
    done < "$SCHEDULES_FILE"

    echo "$installed_count"
}

# Also install the health check schedule (runs every 15 minutes)
install_health_check() {
    local label="${PLIST_PREFIX}.${BUSINESS,,}.health-check"
    local plist_path="$LAUNCH_AGENTS_DIR/${label}.plist"
    local log_file="$INSTANCE_PATH/logs/health-check.log"
    local check_script="$PERSONA_ROOT/scripts/check-agents.sh"

    log "Installing health check: $label"

    # Unload if already loaded
    launchctl unload "$plist_path" 2>/dev/null || true

    cat > "$plist_path" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$label</string>

    <key>ProgramArguments</key>
    <array>
        <string>$check_script</string>
        <string>$BUSINESS</string>
    </array>

    <key>StartInterval</key>
    <integer>900</integer>

    <key>StandardOutPath</key>
    <string>$log_file</string>

    <key>StandardErrorPath</key>
    <string>$log_file</string>

    <key>WorkingDirectory</key>
    <string>$PERSONA_ROOT</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
</dict>
</plist>
EOF

    launchctl load "$plist_path"
    log "Health check installed (every 15 minutes)"
}

# Main execution
log "=========================================="
log "Installing schedules for: $BUSINESS"
log "=========================================="

# Ensure log directory exists
mkdir -p "$INSTANCE_PATH/logs/agents"

# Parse and install agent schedules
installed=$(parse_and_install)
log "Installed $installed agent schedules"

# Install health check
install_health_check

log "=========================================="
log "Installation complete!"
log ""
log "To verify installed schedules:"
log "  launchctl list | grep $PLIST_PREFIX"
log ""
log "To uninstall:"
log "  ./scripts/uninstall-schedules.sh $BUSINESS"
log "=========================================="
