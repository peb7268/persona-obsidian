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

## Environment Setup

### Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18.x+ | For plugin build |
| Python | 3.10+ | For bridge/job store |
| Supabase CLI | Latest | Local database |
| Obsidian | 1.4+ | Desktop app |

### First-Time Setup

```bash
# 1. Clone and install
cd .obsidian/plugins/persona
npm install

# 2. Set up Python environment
cd Projects/Persona/python
pip install -r requirements.txt
pip install -r requirements-dev.txt  # for testing

# 3. Start local Supabase
supabase start
supabase status  # Note the anon key

# 4. Configure plugin settings (in Obsidian)
# - Persona Root: /path/to/Projects/Persona
# - Python Path: /path/to/python3 (e.g., /usr/bin/python3)
# - Supabase URL: http://127.0.0.1:54321
# - Supabase Key: <anon key from supabase status>
```

### Platform-Specific Python Paths

| Platform | Typical Python Path |
|----------|---------------------|
| macOS (Homebrew) | `/opt/homebrew/bin/python3` |
| macOS (Framework) | `/Library/Frameworks/Python.framework/Versions/3.12/bin/python3` |
| Linux | `/usr/bin/python3` |
| Windows | `C:\Python312\python.exe` |

### Environment Variables

The plugin sets these automatically when calling the bridge:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service/anon key |
| `PYTHONPATH` | Python module search path |
| `PYTHONUNBUFFERED` | Disable output buffering |

For manual bridge testing:
```bash
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_KEY="your-key"
cd Projects/Persona/python
python persona/bridge.py get_job_summary
```

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
| `state/queue.json` | Task queue (Primary/Secondary/DLQ) |
| `state/running-agents.json` | Active agent PIDs (reliability tracking) |
| `state/messages/inbox/{agent}/` | Inter-agent messages |
| `state/context.json` | Business context |
| `state/priorities.json` | Active priorities |

## Reliability System

The execution service includes several hardening mechanisms to ensure predictable behavior:

### Duplicate Prevention

Before spawning an agent, the system checks:
1. Local `running-agents.json` state file
2. Supabase `jobs` table for running jobs

This dual-check prevents duplicate execution even after plugin reload.

### Process Timeout

All agent executions have a configurable timeout (default 5 minutes):
- Timeout triggers process tree kill (SIGTERM → SIGKILL)
- Job status updated to "failed" with timeout error
- Settings: `agentTimeoutMinutes` in plugin settings

### Orphan Cleanup

On plugin initialization:
1. Load `running-agents.json` from previous session
2. Check if tracked PIDs are still running
3. Kill stale processes (running > 2x timeout)
4. Mark orphaned jobs as "failed" in Supabase
5. Clean up state file

### Heartbeat

Running jobs send heartbeats every 30 seconds:
- Updates `last_heartbeat` in Supabase
- Allows accurate "hung" job detection
- Continues through transient errors (log, don't crash)

### Optimistic Locking

Job updates use optimistic concurrency control:
- `updated_at` field prevents TOCTOU races
- Automatic retry (up to 3 attempts) on conflict
- Raises `UpdateConflictError` if retries exhausted

For detailed technical documentation, see `docs/system/reliability-architecture.md`.

### Task Queue Structure

`state/queue.json` manages task retry semantics:

- **Primary**: First attempt tasks
- **Secondary**: Retry queue (failed once)
- **DLQ**: Dead letter queue (failed twice, needs manual intervention)

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

## Task Markers

In daily notes, use markers to trigger agent processing:

| Marker | Type | Trigger | Description |
|--------|------|---------|-------------|
| `[ ]` | Personal | Never | Standard checkbox, not processed by agents |
| `[?]` | Research | Auto | Queued for researcher agent |
| `[A]` | Agent Task | Auto | Delegated to assistant, limited concurrency |
| `[Q]` | Queued Task | Manual | Explicitly deferred, processed on command |

### Examples

```markdown
## MHM
- [?] What are best practices for B2B outreach?
- [A] Draft follow-up email to Acme Corp
- [Q] Review competitor pricing (defer to weekend)
- [ ] Personal reminder (not processed)
```

### Concurrency Control

`[A]` tasks respect `max_concurrent_tasks` setting (default: 2). When limit reached, overflow tasks auto-queue to `state/queue.json` and process when slots open.

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

## Header-Based Routing

In daily notes, H2 headers automatically route tasks to the appropriate instance:

| Header | Instance |
|--------|----------|
| `## MHM` | MHM |
| `## Personal` | PersonalMCO |
| `## MCO` | PersonalMCO |
| `## Sales` | MHM |
| `## Business` | MHM |

### Configuration

In `config/env.md`:

```markdown
routing_enabled: true
default_instance: PersonalMCO
max_concurrent_tasks: 2

header_mhm: MHM
header_personal: PersonalMCO
header_mco: PersonalMCO
```

Tasks under `## MHM` are processed by MHM agents; tasks under `## Personal` use PersonalMCO agents.

## Test Harness

All tests must pass before merging. The test harness runs both TypeScript and Python tests.

### Running Tests

```bash
cd .obsidian/plugins/persona

# Run all tests (TypeScript + Python)
npm run test:all

# Run all tests and save artifacts
npm run test:all:save
# Creates: test-runs/{timestamp}/
#   ├── run.json
#   ├── typescript/results.json, output.txt, coverage/
#   └── python/results.json, output.txt, coverage/

# Validate test manifest
npm run test:manifest

# TypeScript only
npm test

# View latest coverage report
open test-runs/latest/typescript/coverage/lcov-report/index.html
```

### Test Manifest

All test files must be registered in `test-manifest.json` at the vault root:

```json
{
  "typescript": {
    "files": [
      "src/services/__tests__/SyntaxParser.test.ts",
      "src/services/__tests__/ExecutionService.test.ts",
      ...
    ]
  },
  "python": {
    "files": [
      "tests/test_job_store.py",
      "tests/test_bridge.py"
    ]
  }
}
```

**When adding a new test file:**
1. Add the file path to `test-manifest.json`
2. Run `npm run test:manifest` to validate
3. CI will fail if manifest doesn't match discovered tests

### Pre-commit Hooks

Husky pre-commit hooks run related tests automatically:
- TypeScript changes → Jest runs related tests
- Python changes → pytest runs full suite

Bypass with: `git commit --no-verify -m "message"`

### CI/CD

GitHub Actions runs on push/PR to main/develop:
1. Manifest validation (must pass first)
2. TypeScript tests (Node 18.x, 20.x)
3. Python tests (Python 3.10, 3.11, 3.12)
4. Build (after tests pass)

### Test Run Artifacts

Test runs are saved to `test-runs/{timestamp}/`:

```
test-runs/
├── latest -> 2026-02-01T10-30-00/
├── 2026-02-01T10-30-00/
│   ├── run.json              # Summary metadata
│   ├── typescript/
│   │   ├── results.json      # Jest results
│   │   ├── output.txt        # Console output
│   │   └── coverage/         # Coverage reports
│   └── python/
│       ├── results.json      # pytest results
│       ├── output.txt        # Console output
│       └── coverage/         # Coverage reports
```
