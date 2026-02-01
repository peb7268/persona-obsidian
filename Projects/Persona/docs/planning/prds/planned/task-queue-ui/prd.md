# PRD: Task Queue UI Enhancements

**Status**: Planned
**Priority**: Medium
**Phase**: Phase 3 - Plugin Features
**Depends On**: Task Queue System (completed)

---

## Overview

Extend the Task Queue System with user interface components for queue visibility, manual control, and dead letter queue management.

---

## Motivation

The Task Queue System backend is complete, but users need:
- Visibility into what tasks are queued and their status
- Manual control to trigger `[Q]` deferred tasks
- Tools to review and retry failed tasks in the DLQ
- At-a-glance queue status in the status bar

---

## Scope

### In Scope

1. **Status Bar Queue Display** - Show running/queued counts
2. **Queue Status Modal** - Visual list of all queued tasks
3. **`[Q]` Manual Trigger Command** - Process all deferred tasks
4. **DLQ Retry UI** - Review and retry failed tasks

### Out of Scope

- Queue priority adjustment
- Task reordering
- Cross-instance queue management
- Queue persistence migration

---

## Feature Specifications

### 1. Status Bar Queue Display

**Description**: Show queue status in the existing Persona status bar.

**Format**:
```
Persona: MHM | Running: 1/2 | Queued: 3
```

**Behavior**:
- Updates in real-time as tasks start/complete
- Only shows queue info when tasks are queued (> 0)
- Click opens Queue Status Modal

**Files to Modify**:
- `src/ui/StatusBar.ts`
- `src/main.ts`

---

### 2. Queue Status Modal

**Description**: Modal showing all queued tasks with status.

**UI Layout**:
```
┌─────────────────────────────────────────────┐
│ Task Queue Status                       [X] │
├─────────────────────────────────────────────┤
│ Running: 1/2                                │
│                                             │
│ PRIMARY (2 tasks)                           │
│ ├─ [A] Draft email to Acme    MHM    0:32  │
│ └─ [A] Research pricing       MHM    queued │
│                                             │
│ SECONDARY (1 task)                          │
│ └─ [A] Update timeline    PersonalMCO retry │
│                                             │
│ DLQ (1 task)                                │
│ └─ [A] Failed task        MHM    [Retry]   │
│                                             │
│ [Clear DLQ]              [Process [Q] Tasks]│
└─────────────────────────────────────────────┘
```

**Features**:
- Shows Primary, Secondary, DLQ sections
- Displays task content, instance, and status
- DLQ tasks have "Retry" button
- Actions: Clear DLQ, Process [Q] Tasks

**Files to Create/Modify**:
- `src/ui/QueueStatusModal.ts` (new)
- `src/main.ts`

---

### 3. Process [Q] Tasks Command

**Description**: Obsidian command to manually trigger all `[Q]` queued tasks.

**Command**: `Persona: Process queued tasks [Q]`

**Behavior**:
1. Scan current file (or daily note) for `[Q]` markers
2. Add all to queue
3. Begin processing (respects concurrency limits)
4. Show notice: "Processing 5 queued tasks..."

**Files to Modify**:
- `src/main.ts` (add command registration)

---

### 4. DLQ Retry Command

**Description**: Commands to manage dead letter queue.

**Commands**:
- `Persona: View DLQ tasks` - Opens Queue Status Modal filtered to DLQ
- `Persona: Retry all DLQ tasks` - Moves all DLQ tasks back to Primary
- `Persona: Clear DLQ` - Removes all DLQ tasks

**Files to Modify**:
- `src/main.ts` (add command registrations)
- `src/services/TaskQueueService.ts` (already has `retryFromDlq`, `retryAllFromDlq`, `clearDlq`)

---

## Technical Notes

### Existing Infrastructure

The `TaskQueueService` already provides:
- `getStats()` - Returns queue counts
- `getStatusString(runningCount)` - Formatted status string
- `getPrimary()`, `getSecondary()`, `getDlq()` - Get task lists
- `retryFromDlq(taskId)` - Retry single task
- `retryAllFromDlq()` - Retry all DLQ tasks
- `clearDlq()` - Clear DLQ

### State Persistence

Queue state is already persisted to `state/queue.json`. UI reads from this via `TaskQueueService`.

---

## Implementation Order

1. **Status Bar Queue Display** (simplest, most visible impact)
2. **Process [Q] Tasks Command** (enables deferred task workflow)
3. **DLQ Commands** (enables recovery from failures)
4. **Queue Status Modal** (full visibility, most complex)

---

## Acceptance Criteria

- [ ] Status bar shows running/queued counts when applicable
- [ ] Queue Status Modal displays all queue tiers
- [ ] "Process [Q] tasks" command processes deferred tasks
- [ ] DLQ tasks can be retried individually or all at once
- [ ] DLQ can be cleared
- [ ] All commands registered and accessible via command palette

---

## Estimated Effort

| Feature | Complexity | Estimate |
|---------|------------|----------|
| Status Bar Display | Low | Small |
| Process [Q] Command | Low | Small |
| DLQ Commands | Low | Small |
| Queue Status Modal | Medium | Medium |

---

## Related Work

- **Predecessor**: Task Queue System (completed)
- **Related**: Status Bar Manager, Agent Modal patterns
