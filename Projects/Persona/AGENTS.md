# AGENTS.md - Persona Agent System

Persona is an agent factory that creates markdown-driven agents to run businesses. Agents are defined as markdown files with YAML frontmatter specifying role, schedule, and capabilities.

## Architecture

```
Persona/
├── templates/agents/           # Reusable agent templates
├── config/                     # Business profiles, env vars
├── scripts/                    # Execution scripts
├── instances/{Business}/       # Deployed agent instances
│   ├── agents/                # Active agent definitions
│   ├── config/                # Business-specific config
│   ├── state/                 # Runtime state + messages
│   └── logs/                  # Execution logs
└── docs/planning/prds/        # Feature planning
```

## Commands

```bash
# Execute an agent action
./scripts/run-agent.sh <business> <agent> <action> [timeout]

# Examples
./scripts/run-agent.sh MHM researcher process-research-queue 300
./scripts/run-agent.sh PersonalMCO assistant morning-briefing

# Instance management
./scripts/generate-instance.sh "BusinessName" "business-type"
./scripts/install-schedules.sh
./scripts/uninstall-schedules.sh
```

## Agent Definition Format

Agent files use YAML frontmatter with markdown body:

```yaml
---
name: agent-name
role: Role Title
tier: executive|management|specialist|support
model: opus
provider: claude  # Optional: claude, gemini, jules

schedule:
  type: cron
  patterns:
    - name: action-name
      cron: "0 9 * * *"

triggers:
  - type: file_change
    path: "path/pattern"
    operations: [create, update]

reports_to: parent-agent
direct_reports: [agent1, agent2]

tools:
  - Read:path/pattern
  - Write:path/pattern
  - WebSearch
  - WebFetch

state:
  file: instances/{{business}}/state/agent.json

communication:
  inbox: instances/{{business}}/state/messages/inbox/agent/
  outbox: instances/{{business}}/state/messages/outbox/agent/
---

# Agent: Role Title

[Agent personality, responsibilities, action workflows...]
```

## Agent Tiers

| Tier | Examples | Responsibility |
|------|----------|----------------|
| Executive | CEO, CRO, CTO | Strategic decisions, vision |
| Management | Director, PM, PO | Coordination, planning |
| Specialist | Researcher, Developer | Domain expertise |
| Support | Assistant | Daily operations |

## Active Instances

### MHM (Mile High Marketing) - 6 Agents
CEO, CRO, Director, Researcher, Assistant, Project-Manager

### PersonalMCO - 3 Agents
Assistant, Researcher, Project-Manager

## Safety Rules

1. **Daily Notes**: Never create or overwrite directly; use embed files
2. **Process Locking**: Lock files prevent concurrent execution
3. **Timeout**: All executions have configurable timeout (default 5min)
4. **Embed Pattern**: Write to `Resources/General/Embeds/{Business}-Section.md`

## State Files

| File | Purpose |
|------|---------|
| `state/progress.json` | Real-time execution progress |
| `state/executions.json` | Execution history |
| `state/pending-notes.json` | Queued updates |
| `state/messages/inbox/{agent}/` | Inter-agent messages |
| `state/context.json` | Business context |
| `state/priorities.json` | Active priorities |

## Message Protocol

Inter-agent messages use JSON format:

```json
{
  "id": "msg-[timestamp]-[from]-to-[to]",
  "from": "[agent]",
  "to": "[agent]",
  "type": "task|report|question|decision",
  "priority": "critical|high|medium|low",
  "subject": "[brief subject]",
  "body": "[message content]",
  "requires_response": true|false
}
```

## Research Question Syntax

In daily notes, use `[?]` markers for research questions:

```markdown
### MHM
* Working on pipeline [?] What are best practices for B2B outreach?
* [?] How does competitor X handle pricing?
```

## Output Locations

| Output Type | Location |
|-------------|----------|
| Daily Notes | `Resources/Agenda/Daily/{date}.md` (read-only) |
| Embed Sections | `Resources/General/Embeds/{Business}-Section.md` |
| Business Docs | `Projects/Azienda/{Business}/` |
| Execution Logs | `instances/{Business}/logs/agents/` |
| Zettelkasten | `Resources/Zettlekasten/*.md` |

## Provider Support

Persona supports multiple AI providers:

| Provider | CLI | Flags |
|----------|-----|-------|
| Claude Code | `claude` | `--print --dangerously-skip-permissions --model` |
| Gemini CLI | `gemini` | `--sandbox false` |
| Jules | `jules` | `task create --description` |

Configure default provider in `config/env.md`.
