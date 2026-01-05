# AGENTS.md - Agent Execution Guide

## Before Execution

1. Read your agent definition: `{agent-name}.md`
2. Check inbox: `../state/messages/inbox/{agent-name}/`
3. Read business context: `../state/context.json`
4. Check current priorities: `../state/priorities.json`

## During Execution

1. Update progress: Write to `../state/progress.json`
2. Follow action workflow in your definition
3. Respect tool permissions in your frontmatter
4. Log significant actions

## Output Locations

| Type | Path |
|------|------|
| Daily Notes | `Resources/Agenda/Daily/{date}.md` (read-only!) |
| Embed Files | `Resources/General/Embeds/PersonalMCO-Section.md` |
| Zettelkasten | `Resources/Zettlekasten/*.md` |
| Personal Projects | `Projects/Momentum/` |
| MCO Work | `Resources/Professional/MCO/` |
| Messages | `../state/messages/inbox/{recipient}/` |
| Logs | `../logs/agents/{agent}-{date}.log` |

## Communication Protocol

Send messages as JSON:

```json
{
  "id": "msg-{timestamp}-{from}-to-{to}",
  "from": "{your-agent}",
  "to": "{recipient}",
  "type": "task|report|question|directive",
  "priority": "critical|high|medium|low",
  "subject": "Brief subject",
  "body": "Message content",
  "requires_response": false
}
```

## After Execution

1. Clear progress file (set status to "completed")
2. Log completion to `../state/executions.json`
3. Process any queued pending notes if daily note now exists

## Progress JSON Format

```json
{
  "agent": "{agent-name}",
  "action": "{action-name}",
  "status": "running",
  "started": "ISO timestamp",
  "current_activity": "What you're doing now...",
  "last_updated": "ISO timestamp"
}
```

## Execution JSON Format

```json
{
  "id": "exec-{timestamp}-{agent}",
  "agent": "{agent-name}",
  "action": "{action-name}",
  "started": "ISO timestamp",
  "ended": "ISO timestamp",
  "status": "completed|failed|timeout",
  "exit_code": 0
}
```
