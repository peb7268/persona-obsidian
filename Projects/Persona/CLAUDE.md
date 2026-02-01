# CLAUDE.md - Claude Code Enforcement

> For cross-platform documentation, see [AGENTS.md](./AGENTS.md).

## Required Reading

Before any operation, read these files in order:
1. `AGENTS.md` - System architecture and commands
2. `instances/{business}/AGENTS.md` - Business context
3. `instances/{business}/agents/AGENTS.md` - Execution guide
4. `instances/{business}/agents/{agent}.md` - Agent definition (when executing)

## Model Configuration

All Persona agents use **Opus** model for maximum quality.

## CRITICAL: Daily Note Safety

- **NEVER** create daily notes (`Resources/Agenda/Daily/*.md`)
- **NEVER** overwrite daily notes directly
- **ALWAYS** write to embed files: `Resources/General/Embeds/{Business}-Section.md`
- Check `PERSONA_DAILY_NOTE_EXISTS` environment variable before operations
- If daily note doesn't exist, queue to `state/pending-notes.json`

## CRITICAL: Agent Execution

1. Read agent definition file FIRST before any action
2. Check inbox for messages at `state/messages/inbox/{agent}/`
3. Follow the action-specific workflow in agent definition
4. Update `state/progress.json` during execution
5. Respect tool permissions in agent frontmatter
6. Log completion to `state/executions.json`

## CRITICAL: Inter-Agent Communication

- Use JSON message format in `state/messages/inbox/{recipient}/`
- Never modify another agent's state files directly
- Check inbox before starting scheduled actions

## Environment Variables

When executing, these environment variables are set:
- `PERSONA_DAILY_NOTE` - Path to today's daily note
- `PERSONA_DAILY_NOTE_EXISTS` - "true" or "false"
- `PERSONA_MHM_SECTION_EXISTS` - MHM embed file exists
- `PERSONA_PERSONAL_MCO_EXISTS` - Personal embed file exists
- `PERSONA_PENDING_NOTES_FILE` - Path to pending notes queue
- `PERSONA_TODAY` - Today's date (YYYY-MM-DD)
- `PERSONA_MHM_EMBED` - MHM embed file path
- `PERSONA_PERSONAL_MCO_EMBED` - Personal embed file path

## Output Patterns

### Task Markers

| Marker | Type | Trigger | Handler |
|--------|------|---------|---------|
| `[?]` | Research | Auto | Researcher agent |
| `[A]` | Agent Task | Auto | Assistant → delegates |
| `[Q]` | Queued Task | Manual | Queue for later processing |

### Research Questions `[?]`
When processing `[?]` markers:
1. Create Zettelkasten note: `Resources/Zettlekasten/Q-{slug}.md`
2. Update daily note with inline answer + link
3. Log to embed file research queue

### Agent Tasks `[A]`
When processing `[A]` markers:
1. Assistant analyzes task context
2. Delegates to appropriate specialist (researcher, project-manager, cro)
3. Updates marker: `[A]` → `[x]` (done), `[>]` (delegated), `[!]` (needs input)
4. Respects `max_concurrent_tasks` limit; overflow queued to `state/queue.json`

### Queued Tasks `[Q]`
Explicitly deferred tasks. Added to queue but not processed until triggered manually.

### Header-Based Routing
Tasks are routed to instances based on their H2 section:
- `## MHM` → MHM instance
- `## Personal` / `## MCO` → PersonalMCO instance

### Agent Reports
Write to business embed file with structured markdown:
```markdown
## {Business} - {Agent} Update
### Section
- Detail 1
- Detail 2
```

## Error Handling

On error:
1. Log to `logs/agents/{agent}-{date}.log`
2. Update `state/executions.json` with failure status
3. Do NOT retry automatically
4. Queue pending updates to `state/pending-notes.json`

## Validation Checklist

Before completing any agent action:
- [ ] Read agent definition file
- [ ] Checked inbox for messages
- [ ] Used correct output paths (embed files, not daily notes)
- [ ] Updated progress.json
- [ ] Logged execution status

## Plugin Integration

The Obsidian plugin (`.obsidian/plugins/persona/`) provides:
- Agent runner modal
- Status bar progress display
- Research question processing
- Extract to Zettelkasten note

### Plugin Commands
| Command | Description |
|---------|-------------|
| Open agent runner | Modal to select and run agents |
| Process research questions | Trigger researcher on current file |
| Process agent tasks [A] | Trigger assistant on current file |
| Run morning briefing | Execute assistant morning routine |
| Run evening summary | Execute assistant evening routine |
| View agent log | Show today's agent execution log |

## Development

```bash
# Build the plugin
cd .obsidian/plugins/persona
npm install
npm run build

# Test an agent
./scripts/run-agent.sh MHM researcher process-research-queue 60

# View logs
tail -f instances/MHM/logs/agents/researcher-$(date +%Y-%m-%d).log
```
