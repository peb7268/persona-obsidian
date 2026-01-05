# Persona

Persona is an agentic workflow and agent factory that analyzes your business and creates a system of markdown-driven agents to run it. Each agent has specific responsibilities, communicates through file-based message passing, and executes via Claude Code.

## Architecture

```
Persona/
├── templates/          # Reusable agent templates
├── config/             # Business profiles and registries
├── core/               # Meta-agents (factory, analyzer, orchestrator)
├── scripts/            # Instance generation and scheduling
└── instances/          # Business-specific agent deployments
    └── [BusinessName]/
        ├── agents/     # Instantiated agents
        ├── config/     # Business-specific configuration
        ├── state/      # Runtime state and messages
        └── logs/       # Execution logs
```

## Agent Hierarchy

Persona supports a full organizational hierarchy:

| Tier | Roles | Responsibility |
|------|-------|----------------|
| Executive | CEO, CRO, CTO | Vision, strategy, high-level decisions |
| Management | Director, Project Manager, Product Owner | Coordination, planning, resource allocation |
| Specialist | Architect, Developer, Researcher, QA | Domain expertise, execution, analysis |
| Support | Assistant | Daily operations, communication, scheduling |

### Example: Technology Firm

- **CEO** - Develops Vision.md, delegates to direct reports, maximizes revenue while minimizing cost
- **CTO** - Manages team of directors
- **CRO** - Manages BDRs, develops sales-strategy.md
- **Product Owner** - Works with researcher, creates Roadmap.md
- **Project Manager** - Plans tasks from Roadmap.md in sequential order
- **Architect** - Develops implementation plans from Roadmap
- **Director** - Manages developers, enables parallel execution
- **Developer** - Executes tasks from architect, coordinates with Director/PM
- **Researcher** - Answers questions from daily notes, researches Roadmap tasks
- **QA** - Writes test plans, generates automated test suites, manages QA team
- **Assistant** - Manages daily notes, reads emails, delegates tasks to PM

## Creating a Business Instance

```bash
./scripts/generate-instance.sh "BusinessName" "business-type"
```

This will:
1. Create `instances/BusinessName/` folder structure
2. Copy and customize agent templates based on business profile
3. Initialize state files and message queues
4. Generate schedule configuration

## Agent Definition Format

Each agent is a markdown file with YAML frontmatter:

```yaml
---
name: ceo
role: Chief Executive Officer
tier: executive
model: opus
priority: critical

schedule:
  type: cron
  cron: "0 9 * * 0"  # Weekly Sunday 9 AM

reports_to: null
direct_reports: [cro, product-owner, assistant]

tools:
  - Read:Projects/Azienda/{{business}}/**/*
  - Write:Projects/Azienda/{{business}}/Vision.md

state:
  file: instances/{{business}}/state/ceo.json

communication:
  inbox: instances/{{business}}/state/messages/inbox/ceo/
  outbox: instances/{{business}}/state/messages/outbox/ceo/
---

# CEO: Chief Executive Officer

[Agent personality, responsibilities, workflows...]
```

## Inter-Agent Communication

Agents communicate via file-based message queues:

```json
{
  "id": "msg-2025-12-22-090000-cro-to-ceo",
  "from": "cro",
  "to": "ceo",
  "type": "report",
  "priority": "high",
  "subject": "Weekly Sales Report",
  "body": "...",
  "requires_response": false
}
```

## Execution Model

Agents run on-demand with no persistent processes:

1. **Scheduled** - via macOS launchd or cron
2. **Event-driven** - via file watchers
3. **Manual** - via Claude Code slash commands

## Business Profiles

Pre-configured profiles in `config/business-profiles/`:

- `marketing-agency.yaml` - Digital marketing agencies (MHM)
- `technology-firm.yaml` - Software development companies
- `consulting-firm.yaml` - Professional services

## First Instance: Mile High Marketing (MHM)

The first Persona deployment is for Mile High Marketing, a digital marketing agency with:

- 5 agents: CEO, CRO, Director, Researcher, Assistant
- Integration with existing sales automation
- Daily notes integration for reporting
- Quarterly OKR tracking

See `instances/MHM/` for the live implementation.
