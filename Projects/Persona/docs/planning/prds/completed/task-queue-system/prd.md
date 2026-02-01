# PRD: Task Queue System

**Status**: Completed
**Completed**: 2026-01-06
**Phase**: Phase 3 - Plugin Features

---

## Overview

Implement a task queue system for the Persona Obsidian plugin that enables:
1. Agent task markers (`[A]`) for automatic delegation
2. Queued task markers (`[Q]`) for explicitly deferred tasks
3. Header-based instance routing in daily notes
4. Concurrency control with retry semantics

---

## Motivation

Users needed a way to:
- Delegate tasks to agents directly from daily notes without manual agent selection
- Control the number of concurrent agent executions to protect system resources
- Explicitly defer tasks for later batch processing
- Automatically route tasks to the correct Persona instance based on context

---

## Implementation Status

### Completed

| Feature | Status | Files Modified |
|---------|--------|----------------|
| `[A]` Agent Task Markers | ✅ Done | `SyntaxParser.ts`, `main.ts`, `types.ts` |
| `[Q]` Queued Task Markers | ✅ Done | `SyntaxParser.ts`, `main.ts`, `types.ts` |
| Header-Based Routing | ✅ Done | `RoutingService.ts`, `main.ts` |
| Task Queue Service | ✅ Done | `TaskQueueService.ts` (new) |
| Concurrency Limits | ✅ Done | `TaskQueueService.ts`, `main.ts` |
| Primary/Secondary/DLQ | ✅ Done | `TaskQueueService.ts` |
| env.md Configuration | ✅ Done | `config/env.md` |
| Documentation | ✅ Done | 8 files updated |

### Remaining Work

See: [Task Queue UI Enhancements PRD](../../planned/task-queue-ui/prd.md)

---

## Technical Specification

### Task Markers

| Marker | Type | Trigger | Concurrency |
|--------|------|---------|-------------|
| `[ ]` | Personal | Never | N/A |
| `[?]` | Research | Auto | Unlimited |
| `[A]` | Agent Task | Auto | Limited by `max_concurrent_tasks` |
| `[Q]` | Queued Task | Manual | Processed sequentially |

### Queue Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Primary   │ ──► │  Secondary  │ ──► │     DLQ     │
│ (Attempt 1) │     │ (Attempt 2) │     │  (Manual)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Primary**: First attempt tasks
- **Secondary**: Retry queue (failed once)
- **DLQ**: Dead letter queue (failed twice, needs manual intervention)

Persisted to: `state/queue.json`

### Header-Based Routing

| Header | Instance |
|--------|----------|
| `## MHM` | MHM |
| `## Personal` | PersonalMCO |
| `## MCO` | PersonalMCO |
| `## Sales` | MHM |
| `## Business` | MHM |

### Configuration

```markdown
# In config/env.md
routing_enabled: true
default_instance: PersonalMCO
max_concurrent_tasks: 2

header_mhm: MHM
header_personal: PersonalMCO
```

---

## Files Created/Modified

### New Files
- `src/services/TaskQueueService.ts` - Queue management with retry semantics

### Modified Files
- `src/services/RoutingService.ts` - Added `maxConcurrentTasks` config parsing
- `src/services/SyntaxParser.ts` - Added `[A]` and `[Q]` regex patterns
- `src/types.ts` - Extended `SyntaxMatch` type with `'queued-task'`
- `src/main.ts` - Integrated queue service, concurrency control
- `config/env.md` - Added `max_concurrent_tasks` setting

### Documentation Updated
- `AGENTS.md` - Task Markers, Queue Structure, Routing sections
- `CLAUDE.md` - Task Markers table, routing workflow
- `GEMINI.md` - Mirrored CLAUDE.md updates
- `instances/MHM/AGENTS.md` - Task Routing, Queue sections
- `instances/PersonalMCO/AGENTS.md` - Task Routing, Queue sections
- `instances/MHM/agents/assistant/actions/delegate-tasks.md` - Routing, Concurrency
- `instances/PersonalMCO/agents/assistant/actions/delegate-tasks.md` - Routing, Concurrency
- `docs/user/index.md` - Task Markers, Concurrency, Routing overview

---

## Testing

### Manual Testing Checklist

- [x] `[A]` markers detected and processed
- [x] `[Q]` markers detected and queued
- [x] Header routing works (MHM vs PersonalMCO)
- [x] Concurrency limit enforced (overflow queued)
- [x] Queue persists to `queue.json`
- [x] Tasks auto-process when slots open
- [x] Plugin builds without errors

### Edge Cases

- [x] Multiple `[A]` tasks in same section
- [x] Tasks across multiple H2 sections
- [x] Empty queue behavior
- [x] Plugin restart with existing queue

---

## Usage Examples

### Daily Note with Task Markers

```markdown
## MHM
- [A] Draft follow-up email to Acme Corp
- [A] Research competitor pricing
- [?] What are B2B outreach best practices?

## Personal
- [Q] Review tax documents (defer to weekend)
- [A] Update project timeline
- [ ] Buy groceries (personal, not processed)
```

### Behavior

1. Tasks 1-2 under `## MHM` start immediately (up to concurrency limit)
2. Task 3 processed by researcher agent
3. Task under `## Personal` routes to PersonalMCO instance
4. `[Q]` task queued but not executed until manually triggered
5. `[ ]` task ignored by agents

---

## Related Work

- **Predecessor**: Research Question Processing (`[?]` markers)
- **Successor**: Queue UI enhancements, DLQ management tools
- **Blocked By**: None
- **Blocks**: Advanced agent orchestration features
