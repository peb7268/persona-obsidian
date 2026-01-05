#!/bin/bash
# generate-instance.sh - Create a new Persona business instance
#
# Usage: ./generate-instance.sh <business-name> <business-profile>
# Example: ./generate-instance.sh MHM marketing-agency

set -e

# Configuration
PERSONA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OBSIDIAN_ROOT="/Users/pbarrick/Documents/Main"

# Arguments
BUSINESS_NAME="${1:?Usage: $0 <business-name> <business-profile>}"
BUSINESS_PROFILE="${2:-marketing-agency}"

# Paths
INSTANCE_PATH="$PERSONA_ROOT/instances/$BUSINESS_NAME"
PROFILE_PATH="$PERSONA_ROOT/config/business-profiles/$BUSINESS_PROFILE.yaml"
TEMPLATES_PATH="$PERSONA_ROOT/templates/agents"
BUSINESS_FOLDER="$OBSIDIAN_ROOT/Projects/Azienda/$BUSINESS_NAME"

echo "========================================"
echo "Persona Instance Generator"
echo "========================================"
echo "Business: $BUSINESS_NAME"
echo "Profile: $BUSINESS_PROFILE"
echo "Instance Path: $INSTANCE_PATH"
echo "Business Folder: $BUSINESS_FOLDER"
echo "========================================"

# Verify profile exists
if [ ! -f "$PROFILE_PATH" ]; then
    echo "Error: Business profile not found: $PROFILE_PATH"
    exit 1
fi

# Create instance directory structure
echo "Creating instance directory structure..."
mkdir -p "$INSTANCE_PATH/config"
mkdir -p "$INSTANCE_PATH/agents"
mkdir -p "$INSTANCE_PATH/state/messages/inbox"
mkdir -p "$INSTANCE_PATH/state/messages/outbox"
mkdir -p "$INSTANCE_PATH/logs/agents"

# Create message inbox folders for each agent
for agent in ceo cro project-manager director researcher assistant; do
    mkdir -p "$INSTANCE_PATH/state/messages/inbox/$agent"
    mkdir -p "$INSTANCE_PATH/state/messages/outbox/$agent"
done

# Copy and customize agent templates
echo "Generating agent definitions..."

# CEO
if [ -f "$TEMPLATES_PATH/executive/ceo.md" ]; then
    sed "s/{{business}}/$BUSINESS_NAME/g; s/{{business_name}}/Mile High Marketing/g" \
        "$TEMPLATES_PATH/executive/ceo.md" > "$INSTANCE_PATH/agents/ceo.md"
    echo "  Created: ceo.md"
fi

# CRO
if [ -f "$TEMPLATES_PATH/executive/cro.md" ]; then
    sed "s/{{business}}/$BUSINESS_NAME/g; s/{{business_name}}/Mile High Marketing/g" \
        "$TEMPLATES_PATH/executive/cro.md" > "$INSTANCE_PATH/agents/cro.md"
    echo "  Created: cro.md"
fi

# Director
if [ -f "$TEMPLATES_PATH/management/director.md" ]; then
    sed "s/{{business}}/$BUSINESS_NAME/g; s/{{business_name}}/Mile High Marketing/g" \
        "$TEMPLATES_PATH/management/director.md" > "$INSTANCE_PATH/agents/director.md"
    echo "  Created: director.md"
fi

# Project Manager
if [ -f "$TEMPLATES_PATH/management/project-manager.md" ]; then
    sed "s/{{business}}/$BUSINESS_NAME/g; s/{{business_name}}/Mile High Marketing/g" \
        "$TEMPLATES_PATH/management/project-manager.md" > "$INSTANCE_PATH/agents/project-manager.md"
    echo "  Created: project-manager.md"
fi

# Researcher
if [ -f "$TEMPLATES_PATH/support/researcher.md" ]; then
    sed "s/{{business}}/$BUSINESS_NAME/g; s/{{business_name}}/Mile High Marketing/g" \
        "$TEMPLATES_PATH/support/researcher.md" > "$INSTANCE_PATH/agents/researcher.md"
    echo "  Created: researcher.md"
fi

# Assistant
if [ -f "$TEMPLATES_PATH/support/assistant.md" ]; then
    sed "s/{{business}}/$BUSINESS_NAME/g; s/{{business_name}}/Mile High Marketing/g" \
        "$TEMPLATES_PATH/support/assistant.md" > "$INSTANCE_PATH/agents/assistant.md"
    echo "  Created: assistant.md"
fi

# Create hierarchy configuration
echo "Creating configuration files..."
cat > "$INSTANCE_PATH/config/hierarchy.yaml" << EOF
# Agent Hierarchy for $BUSINESS_NAME
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

business_name: $BUSINESS_NAME
business_profile: $BUSINESS_PROFILE

hierarchy:
  ceo:
    reports_to: null
    direct_reports: [cro, project-manager, assistant]

  cro:
    reports_to: ceo
    direct_reports: [director]

  project-manager:
    reports_to: ceo
    direct_reports: []
    coordinates_with: [cro, director]

  director:
    reports_to: cro
    direct_reports: []

  researcher:
    reports_to: director
    direct_reports: []

  assistant:
    reports_to: ceo
    direct_reports: []

model_assignments:
  ceo: opus
  cro: opus
  project-manager: opus
  director: opus
  researcher: opus
  assistant: opus
EOF
echo "  Created: hierarchy.yaml"

# Create schedules configuration
cat > "$INSTANCE_PATH/config/schedules.yaml" << EOF
# Agent Schedules for $BUSINESS_NAME
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

schedules:
  ceo:
    - name: weekly-planning
      cron: "0 9 * * 0"
      action: weekly-review
    - name: monthly-review
      cron: "0 9 1 * *"
      action: monthly-review

  cro:
    - name: daily-pipeline
      cron: "0 6 * * 1-5"
      action: daily-pipeline-review
    - name: weekly-forecast
      cron: "0 10 * * 1"
      action: weekly-forecast

  director:
    - name: hourly-coordination
      cron: "0 9-17 * * 1-5"
      action: coordinate-tasks

  researcher:
    - name: daily-research
      cron: "0 6 * * *"
      action: process-research-queue

  assistant:
    - name: morning-briefing
      cron: "0 5 * * 1-5"
      action: morning-briefing
    - name: evening-summary
      cron: "0 17 * * 1-5"
      action: evening-summary

  project-manager:
    - name: daily-project-review
      cron: "0 7 * * 1-5"
      action: daily-project-review
    - name: weekly-status-report
      cron: "0 11 * * 1"
      action: weekly-status-report

event_triggers:
  prospect_created:
    agents: [cro, researcher]
    path: "Projects/Azienda/$BUSINESS_NAME/Sales/Prospects/**/*.md"
    operation: create

  prospect_updated:
    agents: [cro, director]
    path: "Projects/Azienda/$BUSINESS_NAME/Sales/Prospects/**/*.md"
    operation: update

  daily_note_created:
    agents: [assistant]
    path: "Resources/Agenda/Daily/*.md"
    operation: create

  project_created:
    agents: [project-manager]
    path: "Projects/Azienda/$BUSINESS_NAME/Projects/active/**/*.md"
    operation: create

  project_updated:
    agents: [project-manager]
    path: "Projects/Azienda/$BUSINESS_NAME/Projects/active/**/*.md"
    operation: update
EOF
echo "  Created: schedules.yaml"

# Initialize state files
echo "Initializing state files..."

cat > "$INSTANCE_PATH/state/context.json" << EOF
{
  "business_name": "$BUSINESS_NAME",
  "business_profile": "$BUSINESS_PROFILE",
  "initialized": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "quarterly_goals": {
    "q1_2025": { "mrr_target": 15000, "clients_target": 3 },
    "q2_2025": { "mrr_target": 25000, "clients_target": 5 },
    "q3_2025": { "mrr_target": 40000, "clients_target": 8 },
    "q4_2025": { "mrr_target": 60000, "clients_target": 12 }
  },
  "current_quarter": "Q4 2025"
}
EOF
echo "  Created: context.json"

cat > "$INSTANCE_PATH/state/priorities.json" << EOF
{
  "last_updated": null,
  "updated_by": null,
  "priorities": []
}
EOF
echo "  Created: priorities.json"

cat > "$INSTANCE_PATH/state/projects.json" << EOF
{
  "projects": [],
  "summary": {
    "total": 0,
    "by_type": {
      "sales_campaign": 0,
      "client_delivery": 0,
      "internal": 0
    },
    "by_status": {
      "planning": 0,
      "active": 0,
      "on_hold": 0,
      "completed": 0,
      "cancelled": 0
    },
    "at_risk": 0
  },
  "last_review": null
}
EOF
echo "  Created: projects.json"

# Generate quick-start.md
echo "Generating quick-start guide..."
cat > "$INSTANCE_PATH/quick-start.md" << 'QUICKSTART_EOF'
# BUSINESS_PLACEHOLDER Quick Start Guide

Quick reference for managing BUSINESS_PLACEHOLDER's Persona agents.

## Prerequisites

- Claude Code CLI installed and configured
- fswatch installed (for event triggers): `brew install fswatch`
- Opus model access configured

## Commands

### Install & Start

```bash
# Navigate to Persona root
cd PERSONA_ROOT_PLACEHOLDER

# Install all scheduled agents (launchd plists)
./scripts/install-schedules.sh BUSINESS_PLACEHOLDER

# Verify schedules are loaded
launchctl list | grep com.persona

# Start file watcher for event triggers (optional)
./scripts/watch-events.sh BUSINESS_PLACEHOLDER --daemon
```

### Manual Agent Execution

```bash
# Run any agent manually
./scripts/run-agent.sh BUSINESS_PLACEHOLDER <agent> <action>

# Examples:
./scripts/run-agent.sh BUSINESS_PLACEHOLDER assistant morning-briefing
./scripts/run-agent.sh BUSINESS_PLACEHOLDER cro daily-pipeline-review
./scripts/run-agent.sh BUSINESS_PLACEHOLDER ceo weekly-review
./scripts/run-agent.sh BUSINESS_PLACEHOLDER director coordinate-tasks
./scripts/run-agent.sh BUSINESS_PLACEHOLDER researcher process-research-queue
```

### Monitoring

```bash
# View agent status dashboard
cat instances/BUSINESS_PLACEHOLDER/state/status.md

# Check executions history
cat instances/BUSINESS_PLACEHOLDER/state/executions.json | jq '.executions[-5:]'

# View agent logs
tail -f instances/BUSINESS_PLACEHOLDER/logs/agents/cro-$(date +%Y-%m-%d).log

# Check for pending daily note updates
cat instances/BUSINESS_PLACEHOLDER/state/pending-notes.json

# Run health check manually
./scripts/check-agents.sh BUSINESS_PLACEHOLDER
```

### File Watcher Status

```bash
# Check if watcher is running
./scripts/watch-events.sh BUSINESS_PLACEHOLDER --status

# Stop watcher
./scripts/watch-events.sh BUSINESS_PLACEHOLDER --stop

# View watcher logs
tail -f instances/BUSINESS_PLACEHOLDER/logs/watch-events.log
```

### Stop & Uninstall

```bash
# Stop file watcher
./scripts/watch-events.sh BUSINESS_PLACEHOLDER --stop

# Uninstall all scheduled agents
./scripts/uninstall-schedules.sh BUSINESS_PLACEHOLDER

# Verify removal
launchctl list | grep com.persona
```

## Agent Schedule Summary

| Agent | Schedule | Action |
|-------|----------|--------|
| CEO | Sun 09:00, 1st of month 09:00 | weekly-review, monthly-review |
| CRO | Mon-Fri 06:00, Mon 10:00 | daily-pipeline-review, weekly-forecast |
| Director | Mon-Fri 09:00-17:00 (hourly) | coordinate-tasks |
| Researcher | Daily 06:00 | process-research-queue |
| Assistant | Mon-Fri 05:00, 17:00 | morning-briefing, evening-summary |

## Event Triggers

| Event | Path Pattern | Agents Triggered |
|-------|--------------|------------------|
| prospect_created | `Projects/Azienda/BUSINESS_PLACEHOLDER/Sales/Prospects/**/*.md` | CRO, Researcher |
| prospect_updated | `Projects/Azienda/BUSINESS_PLACEHOLDER/Sales/Prospects/**/*.md` | CRO, Director |
| daily_note_created | `Resources/Agenda/Daily/*.md` | Assistant |

## Key File Locations

```
instances/BUSINESS_PLACEHOLDER/
├── agents/                    # Agent definitions
│   ├── ceo.md
│   ├── cro.md
│   ├── director.md
│   ├── researcher.md
│   └── assistant.md
├── config/
│   ├── hierarchy.yaml         # Agent hierarchy
│   └── schedules.yaml         # Schedules & triggers
├── state/
│   ├── context.json           # Business context
│   ├── priorities.json        # Active priorities
│   ├── executions.json        # Execution history
│   ├── status.md              # Status dashboard
│   ├── pending-notes.json     # Queued daily note updates
│   ├── locks/                 # Agent lock files
│   └── messages/
│       ├── inbox/[agent]/     # Incoming messages
│       └── outbox/[agent]/    # Outgoing messages
└── logs/
    └── agents/                # Per-agent logs

Projects/Azienda/BUSINESS_PLACEHOLDER/
├── Vision.md                  # CEO maintains
├── Sales-Strategy.md          # CRO maintains
├── OKRs.md                    # Quarterly objectives
└── Sales/Prospects/           # Prospect files
```

## Troubleshooting

### Agent won't start
```bash
# Check for existing lock
ls instances/BUSINESS_PLACEHOLDER/state/locks/

# Remove stale lock (verify process not running first)
rm instances/BUSINESS_PLACEHOLDER/state/locks/<agent>.lock
```

### Agent running too long
```bash
# Find running processes
ps aux | grep claude

# Check status dashboard for alerts
cat instances/BUSINESS_PLACEHOLDER/state/status.md

# Run health check to clean zombies
./scripts/check-agents.sh BUSINESS_PLACEHOLDER
```

### Daily note not updated
```bash
# Check if daily note exists
ls ~/Documents/Main/Resources/Agenda/Daily/$(date +%Y-%m-%d).md

# Check for queued updates
cat instances/BUSINESS_PLACEHOLDER/state/pending-notes.json

# Create daily note first via Obsidian Journals plugin, then re-run agent
```

### Event triggers not firing
```bash
# Check watcher status
./scripts/watch-events.sh BUSINESS_PLACEHOLDER --status

# Check watcher logs for errors
tail -50 instances/BUSINESS_PLACEHOLDER/logs/watch-events.log

# Ensure fswatch is installed
which fswatch || brew install fswatch
```

## Inter-Agent Communication

Agents communicate via JSON message files:

```bash
# View messages for an agent
ls instances/BUSINESS_PLACEHOLDER/state/messages/inbox/director/

# Read a specific message
cat instances/BUSINESS_PLACEHOLDER/state/messages/inbox/director/<message-file>.json | jq

# Create a manual message (for testing)
cat > instances/BUSINESS_PLACEHOLDER/state/messages/inbox/<agent>/msg-manual.json << 'EOF'
{
  "id": "msg-manual-test",
  "from": "human",
  "to": "<agent>",
  "type": "task",
  "priority": "high",
  "subject": "Manual task assignment",
  "body": "Your task description here",
  "requires_response": false
}
EOF
```

---

*Generated by Persona for BUSINESS_PLACEHOLDER*
QUICKSTART_EOF

# Replace placeholders in quick-start.md
sed -i '' "s|BUSINESS_PLACEHOLDER|$BUSINESS_NAME|g" "$INSTANCE_PATH/quick-start.md"
sed -i '' "s|PERSONA_ROOT_PLACEHOLDER|$PERSONA_ROOT|g" "$INSTANCE_PATH/quick-start.md"
echo "  Created: quick-start.md"

# Create agent index
cat > "$INSTANCE_PATH/agents/index.md" << EOF
# $BUSINESS_NAME Agent Registry

Generated: $(date +"%Y-%m-%d")

## Active Agents

| Agent | Role | Status | Last Run |
|-------|------|--------|----------|
| [[ceo]] | Chief Executive Officer | Active | - |
| [[cro]] | Chief Revenue Officer | Active | - |
| [[director]] | Director of Operations | Active | - |
| [[researcher]] | Research Analyst | Active | - |
| [[assistant]] | Executive Assistant | Active | - |

## Hierarchy

\`\`\`
CEO
├── CRO
│   └── Director
│       └── (Execution Agents)
├── Assistant
└── Researcher (cross-functional)
\`\`\`

## Schedule Overview

- **CEO**: Weekly (Sunday), Monthly (1st)
- **CRO**: Daily (6 AM), Weekly (Monday)
- **Director**: Hourly (business hours)
- **Researcher**: Daily (6 AM) + Events
- **Assistant**: Daily (5 AM, 5 PM)
EOF
echo "  Created: agents/index.md"

echo ""
echo "========================================"
echo "Instance generation complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Review agents in: $INSTANCE_PATH/agents/"
echo "2. Verify configuration in: $INSTANCE_PATH/config/"
echo "3. Create business documents (Vision.md, etc.) in: $BUSINESS_FOLDER"
echo "4. Install schedules with: ./install-schedules.sh $BUSINESS_NAME"
echo ""
