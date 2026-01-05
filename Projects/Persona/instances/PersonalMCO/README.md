# PersonalMCO Instance

Personal projects and MCO (VP of Engineering) work management instance.

**Created**: 2025-12-22
**Instance Type**: Personal & Professional (Separate from MHM)

## Overview

This instance manages both personal work and your MCO VP of Engineering responsibilities with 3 specialized agents:

1. **Assistant**: Daily briefings and coordination
2. **Researcher**: Answers questions from daily notes and analyzes codebases
3. **Project Manager**: Tracks personal and MCO projects

## Key Differences from MHM

- ✅ **No sales agents** (CEO, CRO, Director removed)
- ✅ **Researcher behavior**: Answers `[?]` and `[CB?]` questions instead of market research
- ✅ **Time offsets**: All schedules offset 15 minutes from MHM to prevent conflicts
- ✅ **Separate daily note section**: Uses `## 💼 Personal & MCO` (MHM uses `## 🚀 MHM Business`)

## Agents

### Assistant
- **Morning Briefing**: 5:15 AM (weekdays)
- **Evening Summary**: 5:15 PM (weekdays)
- Coordinates Researcher and Project Manager
- Creates/maintains daily note section

### Researcher
- **Daily Scan**: 6:30 AM (daily)
- **Event Trigger**: When daily notes are created/updated
- Looks for research questions:
  - `[?]` General questions
  - `[CB?]` Codebase analysis questions
- Delivers brief answers inline or creates detailed Zettelkasten notes
- Uses codebases from `.env` file

### Project Manager
- **Daily Review**: 7:15 AM (weekdays)
- **Weekly Report**: Monday 11:15 AM
- **Event Triggers**: When projects in `Projects/Momentum/` or `Resources/Professional/MCO/` are created/updated
- Tracks progress, milestones, blockers
- Balances personal vs MCO time allocation

## Configuration

### 1. Set Up Codebase Paths

Edit `instances/PersonalMCO/.env` and add your codebases:

```bash
CODEBASES=/Users/pbarrick/projects/mco-platform,/Users/pbarrick/projects/personal-site
```

The Researcher will use these paths when analyzing `[CB?]` questions.

### 2. Schedule Configuration

Schedules are in `config/schedules.yaml`. All times are offset 15 minutes from MHM:

| Agent | Schedule | Time | Action |
|-------|----------|------|--------|
| Assistant | Morning | 5:15 AM | Briefing |
| Assistant | Evening | 5:15 PM | Summary |
| Researcher | Daily | 6:30 AM | Scan questions |
| Project Manager | Daily | 7:15 AM | Review projects |
| Project Manager | Weekly | Mon 11:15 AM | Status report |

### 3. Hierarchy

```
assistant (top)
├── researcher
└── project-manager
```

No CEO - Assistant is the top-level coordinator.

## Using the Researcher

### General Questions

In your daily note, add:

```markdown
[?] What are the best practices for API rate limiting in Node.js?
```

Researcher will:
- Find the question during scheduled scan or event trigger
- Research the answer
- Add response inline (brief) or create Zettelkasten note (detailed)

### Codebase Questions

**With default codebase** (first in `.env`):
```markdown
[CB?] How does authentication work in our platform?
```

**With specific codebase**:
```markdown
[CB?] /Users/pbarrick/projects/mco-platform - Where are user permissions defined?
```

Researcher will:
- Explore the codebase using Glob, Grep, Read tools
- Analyze code structure and patterns
- Deliver brief answer (inline) or detailed answer (Zettelkasten note with file references)

## Daily Note Integration

Agents write to `## 💼 Personal & MCO` section:

```markdown
## 💼 Personal & MCO

### Morning Briefing
[Assistant creates this at 5:15 AM]

### Project Status
[Project Manager updates this at 7:15 AM]

### Research Queue
[Researcher tracks questions here]

### Evening Summary
[Assistant creates this at 5:15 PM]
```

## File Locations

### Agent Definitions
- `agents/assistant.md`
- `agents/researcher.md`
- `agents/project-manager.md`

### Configuration
- `config/hierarchy.yaml` - Agent structure
- `config/schedules.yaml` - Timing and triggers
- `.env` - Codebase paths for Researcher

### State Files
- `state/context.json` - Business context and goals
- `state/priorities.json` - Current priorities
- `state/projects.json` - Project tracking
- `state/assistant.json` - Assistant state
- `state/researcher.json` - Research queue and history
- `state/executions.json` - Execution history
- `state/pending-notes.json` - Queued daily note updates

### Communication
- `state/messages/inbox/[agent]/` - Incoming messages per agent
- `state/messages/outbox/[agent]/` - Outgoing messages per agent

### Logs
- `logs/agents/` - Per-agent execution logs

## Running Agents

### Manual Execution
```bash
# From Persona root directory
./scripts/run-agent.sh PersonalMCO assistant
./scripts/run-agent.sh PersonalMCO researcher
./scripts/run-agent.sh PersonalMCO project-manager
```

### Check Agent Status
```bash
./scripts/check-agents.sh PersonalMCO
```

### View Logs
```bash
# Latest execution logs
ls -lt instances/PersonalMCO/logs/agents/

# View specific agent log
cat instances/PersonalMCO/logs/agents/researcher-[timestamp].log
```

## Conflict Safety

### Daily Note Conflicts
- ✅ **Safe**: MHM writes to `## 🚀 MHM Business`, PersonalMCO writes to `## 💼 Personal & MCO`
- ✅ **Safe**: 15-minute time offsets reduce concurrent write probability
- ⚠️ **Monitor initially**: Check logs for any unexpected errors

### Lock Files
- Each instance has separate locks in `state/locks/`
- MHM locks: `instances/MHM/state/locks/`
- PersonalMCO locks: `instances/PersonalMCO/state/locks/`
- No cross-instance lock conflicts

## Example Workflows

### Morning Routine
1. **5:15 AM**: Assistant creates morning briefing
2. **6:30 AM**: Researcher scans daily note for new questions
3. **7:15 AM**: Project Manager reviews active projects
4. **Result**: Comprehensive daily note section ready by ~7:30 AM

### Question Answering
1. Add `[?] Question here` to daily note
2. Researcher finds it on next scan (6:30 AM or event trigger)
3. Brief answer appears inline OR detailed Zettelkasten note is linked
4. Research Queue shows status

### Project Tracking
1. Create/update project in `Projects/Momentum/` or `Resources/Professional/MCO/`
2. Project Manager triggers on file change
3. Updates `state/projects.json`
4. Adds status to daily note section
5. Alerts if project at risk or blocked

## Next Steps

1. **Configure codebases**: Edit `.env` with your repository paths
2. **Test manually**: Run each agent once to verify setup
3. **Set up scheduling**: Configure launchd or cron for automated execution
4. **Monitor for conflicts**: Check first few days for any daily note issues with MHM
5. **Add projects**: Create project files in `Projects/Momentum/` or `Resources/Professional/MCO/`

## Troubleshooting

### Researcher not finding questions
- Check daily note has `[?]` or `[CB?]` markers
- Verify Researcher ran: check `logs/agents/researcher-*.log`
- Check `state/researcher.json` for queue status

### Codebase analysis not working
- Verify `.env` has valid paths
- Check paths are absolute (not relative)
- Ensure Researcher has read access to codebases

### Conflicts with MHM
- Check logs: `logs/agents/*.log`
- Verify section headings are different
- Confirm time offsets in `config/schedules.yaml`

### No daily note updates
- Check `state/pending-notes.json` - updates may be queued
- Verify daily note exists in `Resources/Agenda/Daily/`
- Check agent execution logs for errors

## Support

For issues or questions:
- Check agent logs in `logs/agents/`
- Review state files in `state/`
- Consult Persona main docs in `Projects/Persona/CLAUDE.md`
