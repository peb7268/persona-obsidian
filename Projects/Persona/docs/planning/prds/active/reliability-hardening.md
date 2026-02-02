# PRD: Queue/Agent System Reliability Hardening

**Status:** In Progress
**Priority:** Critical
**Created:** 2026-02-01
**Last Updated:** 2026-02-01

## Overview

The Persona queue, assistant, and researcher system has identified reliability issues that can cause unpredictable behavior. This PRD tracks the hardening work needed to ensure the system behaves predictably.

## Problem Statement

The current implementation has several critical reliability issues:
- Duplicate agent execution after plugin reload
- Agents can hang forever without timeout
- Orphaned Python processes accumulate
- Race conditions in job updates
- False "hung" detection due to missing heartbeats

## Goals

- [ ] Eliminate duplicate agent executions
- [ ] Ensure agents terminate within configured timeout
- [ ] Clean up orphaned processes on startup
- [ ] Atomic job updates without race conditions
- [ ] Accurate hung job detection via heartbeats

---

## Critical Issues (Must Fix)

### 1. Duplicate Prevention - Race Condition on Reload
**File:** `ExecutionService.ts:98-99`
**Impact:** Duplicate agent execution
**Root Cause:** In-memory `runningExecutions` map lost on plugin reload

#### Implementation Checklist
- [x] Create `running-agents.json` state file schema
- [x] Add file read on plugin startup
- [x] Query Supabase for running jobs on startup
- [x] Sync local state with Supabase state
- [x] Check both local file AND Supabase before spawning
- [x] Update local file when agent starts
- [x] Update local file when agent completes
- [ ] Add tests for duplicate prevention

---

### 2. Process Timeout Enforcement
**File:** `ExecutionService.ts:130-140`
**Impact:** Plugin freezes, agents hang forever
**Root Cause:** No actual timeout on spawned process

#### Implementation Checklist
- [x] Add timeout parameter to runAgent options
- [x] Implement setTimeout wrapper around spawn
- [x] Kill process tree on timeout (not just parent)
- [x] Update job status to "failed" with timeout error message
- [x] Log timeout events for debugging
- [x] Add configurable timeout setting
- [ ] Add tests for timeout behavior

---

### 3. Orphaned Process Cleanup
**File:** `ExecutionService.ts:initialize()`
**Impact:** Resource leak, zombie processes
**Root Cause:** No cleanup if plugin crashes mid-execution

#### Implementation Checklist
- [x] Track spawned PIDs in state file with timestamps
- [x] On plugin load: read PID file
- [x] Check if PIDs are still running
- [x] Kill orphaned PIDs from previous session
- [x] Update Supabase job status for orphaned jobs
- [x] Clean up PID file after processing
- [x] Use process groups for cleaner cleanup (optional)
- [ ] Add tests for orphan cleanup

---

### 4. TOCTOU Race Condition Fix
**File:** `job_store.py:update_job()`
**Impact:** Data corruption, lost updates
**Root Cause:** Get-then-update pattern without locking

#### Implementation Checklist
- [x] Add `updated_at` field to Job dataclass
- [x] Modify `update_job()` to include WHERE clause with expected `updated_at`
- [x] Return affected row count from update (via result.data check)
- [x] If 0 rows affected, refresh and retry
- [x] Add max retry limit (3 attempts)
- [x] Raise specific exception on conflict exhaustion (`UpdateConflictError`)
- [x] TypeScript bridge already handles errors gracefully
- [ ] Add tests for concurrent update scenarios

---

### 5. Heartbeat Implementation
**File:** `ExecutionService.ts` (missing)
**Impact:** False "hung" detection
**Root Cause:** Heartbeat method exists but never called

#### Implementation Checklist
- [x] Add heartbeat interval constant (30 seconds)
- [x] Start heartbeat timer when agent spawns
- [x] Call `jobQueueService.heartbeat(jobId)` periodically
- [x] Clear heartbeat interval on completion
- [x] Clear heartbeat interval on error
- [x] Clear heartbeat interval on timeout
- [x] Handle heartbeat failures gracefully (log, don't crash)
- [ ] Add tests for heartbeat behavior

---

## High Priority Issues (Should Fix)

### 6. Buffer Overflow on Large Output
**File:** `JobQueueService.ts:108-114`
**Impact:** Memory crash
**Status:** Pending

- [ ] Add buffer size limit (e.g., 10MB)
- [ ] Truncate with warning when exceeded
- [ ] Log truncation events

---

### 7. Silent Failures on Retry Exhaustion
**File:** `ExecutionService.ts:54-74`
**Impact:** Jobs stuck "running" forever
**Status:** Pending

- [ ] Mark job as "failed" after retry exhaustion
- [ ] Include specific error: "Status update failed after retries"
- [ ] Add alert mechanism for manual intervention

---

### 8. No Supabase Retry/Backoff
**File:** `JobQueueService.ts:95-141`
**Impact:** Transient failures are fatal
**Status:** Pending

- [ ] Add exponential backoff for bridge calls
- [ ] Implement retry with jitter
- [ ] Distinguish network errors from application errors

---

### 9. New Connection Per Bridge Call
**File:** `bridge.py:32,62,93`
**Impact:** Rate limits, connection overhead
**Status:** Pending

- [ ] Implement connection pooling or singleton pattern
- [ ] Reuse Supabase client across calls
- [ ] Add connection health check

---

### 10. Interval Leaks on Settings Change
**File:** `main.ts:446-450`
**Impact:** Multiple polling timers
**Status:** Pending

- [ ] Clear existing intervals before creating new ones
- [ ] Track all active intervals
- [ ] Clean up on plugin unload

---

## Medium Priority Issues (Nice to Have)

### 11. No Distributed Locking
**File:** `worker.py:61-79`
**Status:** Pending

- [ ] Implement job claiming with atomic update
- [ ] Add `claimed_by` field with hostname

### 12. Progress.json Read/Write Races
**File:** `ExecutionService.ts:377-418`
**Status:** Pending

- [ ] Use atomic file write (write to temp, rename)
- [ ] Add file locking or mutex

### 13. Modal Auto-Refresh Overlapping
**File:** `JobQueueModal.ts:502-509`
**Status:** Pending

- [ ] Add debounce to refresh calls
- [ ] Track in-flight refresh requests

### 14. Clock Skew Affects Hung Detection
**File:** `job_store.py`, `bridge.py`
**Status:** Pending

- [ ] Use server time for comparisons
- [ ] Add clock skew tolerance

---

## Testing Requirements

- [ ] Unit tests for each fix
- [ ] Integration tests for end-to-end scenarios
- [ ] Manual testing checklist:
  - [ ] Reload plugin during agent execution
  - [ ] Kill Obsidian during agent execution
  - [ ] Run two agents simultaneously
  - [ ] Disconnect network during job update
  - [ ] Let agent run past timeout

---

## Rollback Plan

Each fix should be independently revertable. If issues arise:
1. Revert specific commit
2. Redeploy plugin
3. Clear state files if needed

---

## Progress Tracking

| Issue | Status | Assignee | Completed |
|-------|--------|----------|-----------|
| 1. Duplicate Prevention | 🟢 Done | Claude | 2026-02-01 |
| 2. Process Timeout | 🟢 Done | Claude | 2026-02-01 |
| 3. Orphan Cleanup | 🟢 Done | Claude | 2026-02-01 |
| 4. TOCTOU Fix | 🟢 Done | Claude | 2026-02-01 |
| 5. Heartbeat | 🟢 Done | Claude | 2026-02-01 |
| 6. Buffer Overflow | 🔴 Not Started | - | - |
| 7. Silent Failures | 🔴 Not Started | - | - |
| 8. Supabase Retry | 🔴 Not Started | - | - |
| 9. Connection Pool | 🔴 Not Started | - | - |
| 10. Interval Leaks | 🔴 Not Started | - | - |
