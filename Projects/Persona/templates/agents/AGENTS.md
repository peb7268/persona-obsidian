# AGENTS.md - Agent Template Guide

## Template Structure

Templates are organized by tier:
- `executive/` - CEO, CRO, CTO
- `management/` - Director, PM, PO
- `specialist/` - Researcher, Developer, Architect
- `support/` - Assistant

## Creating New Agents

1. Copy appropriate template from this directory
2. Customize frontmatter (name, schedule, tools)
3. Update markdown body with specific workflows
4. Place in `instances/{Business}/agents/`

## Frontmatter Schema

```yaml
---
name: string              # Unique identifier (lowercase, hyphenated)
role: string              # Human-readable title
tier: enum                # executive|management|specialist|support
model: opus               # AI model
provider: claude          # Optional: claude|gemini|jules
priority: enum            # critical|high|medium|low

schedule:
  type: cron
  patterns:
    - name: string        # Action identifier
      cron: string        # Cron expression (minute hour day month weekday)

triggers:                 # Event-based activation
  - type: file_change
    path: string          # Glob pattern
    operations: [create, update, delete]

reports_to: string        # Parent agent or null
direct_reports: []        # Child agents

tools:                    # Permitted operations
  - Read:path/pattern     # File reading permissions
  - Write:path/pattern    # File writing permissions
  - Edit:path/pattern     # File editing permissions
  - WebSearch             # Web search capability
  - WebFetch              # URL fetching capability

state:
  file: path              # Agent state JSON

communication:
  inbox: path             # Message inbox directory
  outbox: path            # Message outbox directory
---
```

## Template Variables

Use these placeholders for instance customization:
- `{{business}}` - Instance name (e.g., MHM, PersonalMCO)
- `{{business_name}}` - Display name
- `{{business_type}}` - From profile (e.g., marketing-agency)

## Agent Body Structure

```markdown
# Agent: {Role Title}

## Personality & Approach
[How the agent should behave, communicate, and think]

## Responsibilities
[Primary duties and scope]

## Actions

### {action-name}
**Trigger**: [When this action runs]
**Workflow**:
1. Step one
2. Step two
3. Step three
**Output**: [Expected deliverables]

## Relationships
- Reports to: {parent}
- Coordinates with: {peers}
- Directs: {reports}
```

## Example: Researcher Template

```yaml
---
name: researcher
role: Research & Analysis Agent
tier: specialist
model: opus
priority: medium

schedule:
  type: cron
  patterns:
    - name: process-research-queue
      cron: "30 6 * * *"

triggers:
  - type: file_change
    path: "Resources/Agenda/Daily/*.md"
    operations: [create, update]

reports_to: director
direct_reports: []

tools:
  - Read:Resources/**/*
  - Read:Projects/**/*
  - Write:Resources/Zettlekasten/**/*
  - WebSearch
  - WebFetch
---

# Agent: Research & Analysis

## Personality
Curious, thorough, and methodical...
```

## Tier Guidelines

### Executive (CEO, CRO, CTO)
- Strategic focus, high-level decisions
- Weekly/monthly schedules
- Highest priority
- Sets direction for organization

### Management (Director, PM, PO)
- Coordination and planning
- Daily/hourly schedules
- Medium-high priority
- Translates strategy to execution

### Specialist (Researcher, Developer)
- Domain expertise
- Event-driven + scheduled
- Medium priority
- Deep work in specific area

### Support (Assistant)
- Daily operations
- Frequent schedules (AM/PM)
- Responsive priority
- Handles routine tasks
