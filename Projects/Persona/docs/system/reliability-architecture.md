# Reliability Architecture

This document describes the reliability hardening mechanisms in the Persona job queue and agent execution system.

## Overview

The Persona system executes AI agents as spawned processes, with job tracking persisted to Supabase. Without proper safeguards, several failure modes can occur:

| Failure Mode | Impact | Mitigation |
|--------------|--------|------------|
| Duplicate execution | Wasted resources, conflicting outputs | Dual-storage state tracking |
| Hung processes | Plugin freeze, resource leak | Process timeout enforcement |
| Orphaned processes | Zombie PIDs, "running forever" jobs | Startup cleanup |
| Race conditions | Data corruption, lost updates | Optimistic locking |
| False hung detection | Premature job termination | Heartbeat protocol |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Obsidian Plugin                              │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │ ExecutionService │───▶│ JobQueueService  │───▶│ Python Bridge  │  │
│  │                 │    │                  │    │                │  │
│  │ • runAgent()    │    │ • createJob()    │    │ • create_job   │  │
│  │ • initialize()  │    │ • updateStatus() │    │ • heartbeat    │  │
│  │ • heartbeat     │    │ • heartbeat()    │    │ • update_job   │  │
│  └────────┬────────┘    └──────────────────┘    └───────┬────────┘  │
│           │                                              │           │
│           ▼                                              ▼           │
│  ┌─────────────────┐                           ┌────────────────┐   │
│  │ running-agents  │                           │   Supabase     │   │
│  │    .json        │◀──────sync on startup────▶│   jobs table   │   │
│  │ (local state)   │                           │                │   │
│  └─────────────────┘                           └────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Duplicate Prevention

### Problem

When the Obsidian plugin reloads (settings change, manual reload, app restart), the in-memory `runningExecutions` Map is lost. Without external state, the system cannot know if an agent is already running, leading to duplicate spawns.

### Solution: Dual-Storage State Tracking

**Files Modified:**
- `ExecutionService.ts` - Added state file management and Supabase sync

**Implementation:**

1. **Local State File** (`state/running-agents.json`)
   ```json
   {
     "version": 1,
     "agents": {
       "researcher-1706800000000": {
         "agent": "researcher",
         "action": "process-research-queue",
         "startTime": "2026-02-01T10:00:00.000Z",
         "jobId": "abc12345",
         "pid": 12345
       }
     },
     "lastUpdated": "2026-02-01T10:00:00.000Z"
   }
   ```

2. **Startup Sync** (`initialize()`)
   - Load local state file
   - Query Supabase for running jobs
   - Cross-reference: if job still running in Supabase, restore to memory
   - If job completed in Supabase, don't restore

3. **Pre-Spawn Check** (`isAgentRunningAsync()`)
   - Check in-memory Map
   - Query Supabase running jobs
   - Block spawn if either shows agent running

4. **State Updates**
   - On spawn: write to local file immediately
   - On complete/error/timeout: remove from local file

### Code Location

```typescript
// ExecutionService.ts:45-74
async initialize(): Promise<void> {
  const localState = this.loadRunningAgentsFile();
  await this.syncWithSupabase(localState);
}

// ExecutionService.ts:215-233
async isAgentRunningAsync(agent: string): Promise<boolean> {
  if (this.isAgentRunning(agent)) return true;
  if (this.jobQueueService) {
    const runningJobs = await this.jobQueueService.getRunningJobs();
    return runningJobs.some(j => j.assignedTo === agent);
  }
  return false;
}
```

---

## 2. Process Timeout Enforcement

### Problem

Spawned agent processes can hang indefinitely due to:
- AI provider timeouts
- Network failures
- Infinite loops in prompts
- Resource exhaustion

Without timeout, the plugin appears frozen and "running" jobs accumulate.

### Solution: Configurable Timeout with Process Tree Kill

**Files Modified:**
- `ExecutionService.ts` - Added timeout wrapper
- `types.ts` - Added `agentTimeoutMinutes` setting

**Implementation:**

1. **Configurable Setting**
   ```typescript
   // types.ts
   agentTimeoutMinutes: number; // default: 5
   ```

2. **Timeout Handler**
   ```typescript
   const timeoutMs = (this.settings.agentTimeoutMinutes || 5) * 60 * 1000;

   const timeoutHandle = setTimeout(async () => {
     // Stop heartbeat
     this.stopHeartbeat(executionId);

     // Kill process tree (children too)
     process.kill(-pid, 'SIGTERM');
     setTimeout(() => process.kill(-pid, 'SIGKILL'), 5000);

     // Update job status
     await this.updateJobStatusWithRetry(jobId, 'failed',
       `Timeout: Agent exceeded ${timeoutMs/1000}s limit`);
   }, timeoutMs);
   ```

3. **Cleanup on Normal Exit**
   - `clearTimeout(timeoutHandle)` in close/error handlers

### Process Tree Kill

Using negative PID (`-pid`) sends signal to entire process group:
- Parent shell process
- Claude/Gemini CLI child
- Any subprocesses spawned by agent

Fallback to direct PID kill if process group fails.

---

## 3. Orphaned Process Cleanup

### Problem

If Obsidian crashes or is force-quit while an agent is running:
- The spawned process may continue running
- The local state file still shows the agent as "running"
- Supabase job stays in "running" status forever

### Solution: Startup Cleanup Routine

**Files Modified:**
- `ExecutionService.ts` - Added `cleanupOrphanedProcesses()`

**Implementation:**

1. **On Plugin Load** (in `initialize()`)
   ```typescript
   await this.cleanupOrphanedProcesses(localState);
   ```

2. **Detection Logic**
   - For each entry in `running-agents.json`:
     - Check if PID is still alive (`process.kill(pid, 0)`)
     - If dead: orphaned job
     - If alive but running > 2x timeout: stale job

3. **Cleanup Actions**
   - Kill stale processes (SIGTERM → SIGKILL)
   - Update Supabase job status to "failed"
   - Error message: "Orphaned: Process terminated unexpectedly"
   - Remove from local state file

### Code Location

```typescript
// ExecutionService.ts:76-143
private async cleanupOrphanedProcesses(localState: RunningAgentsFile): Promise<void> {
  for (const [id, state] of Object.entries(localState.agents)) {
    if (!state.pid) continue;

    const isRunning = this.isProcessRunning(state.pid);
    if (!isRunning) {
      // Process is dead - orphaned job
      orphanedJobs.push({ id, state });
    } else {
      // Check if stale (running too long)
      const runningMinutes = (now - startTime) / 60000;
      if (runningMinutes > maxMinutes) {
        process.kill(-pid, 'SIGTERM');
        orphanedJobs.push({ id, state });
      }
    }
  }

  // Update Supabase and clean state
  for (const { state } of orphanedJobs) {
    await jobQueueService.updateJobStatus(state.jobId, 'failed',
      'Orphaned: Process terminated unexpectedly');
  }
}
```

---

## 4. TOCTOU Race Condition Fix

### Problem

The original `update_job()` in `job_store.py` used a get-then-update pattern:

```python
# VULNERABLE CODE (before fix)
job = self.get_job(job_id)  # Read
# ... another process modifies job here ...
self.client.table("jobs").update(updates).eq("id", job.id).execute()  # Write
```

If two processes update the same job simultaneously, one update is lost.

### Solution: Optimistic Locking with `updated_at`

**Files Modified:**
- `job_store.py` - Added optimistic locking to `update_job()`

**Implementation:**

1. **Version Field**
   - `updated_at` timestamp acts as version
   - Every update sets new `updated_at`

2. **Conditional Update**
   ```python
   query = self.client.table("jobs").update(updates).eq("id", job.id)
   if job.updated_at:
     query = query.eq("updated_at", job.updated_at)  # Optimistic lock
   result = query.execute()
   ```

3. **Conflict Detection**
   - If `result.data` is empty, another process updated first
   - Retry with fresh data (up to 3 attempts)
   - Raise `UpdateConflictError` if retries exhausted

4. **Custom Exception**
   ```python
   class UpdateConflictError(Exception):
       """Raised when optimistic locking conflict occurs."""
       pass
   ```

### Retry Logic

```python
for attempt in range(max_retries):
    job = self.get_job(job_id)  # Fresh read
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()

    query = self.client.table("jobs").update(updates).eq("id", job.id)
    if job.updated_at:
        query = query.eq("updated_at", job.updated_at)

    result = query.execute()
    if result.data:
        return self._row_to_job(result.data[0])

    time.sleep(0.1 * (attempt + 1))  # Backoff

raise UpdateConflictError(f"Update conflict after {max_retries} retries")
```

---

## 5. Heartbeat Implementation

### Problem

The existing "hung job detection" relied solely on `started_at` timestamp:
- Job started > X minutes ago = hung

This causes false positives for legitimately long-running jobs.

### Solution: Active Heartbeat Protocol

**Files Modified:**
- `ExecutionService.ts` - Heartbeat interval management
- `JobQueueService.ts` - `heartbeat()` method
- `bridge.py` - `heartbeat` command
- `job_store.py` - `heartbeat()` method (already existed)

**Implementation:**

1. **Constants**
   ```typescript
   private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
   ```

2. **Start Heartbeat** (after job marked "running")
   ```typescript
   private startHeartbeat(executionId: string, jobId: string): void {
     const interval = setInterval(async () => {
       const result = await this.jobQueueService.heartbeat(jobId);
       if (!result.success) {
         console.warn(`Heartbeat failed: ${result.error}`);
         // Don't stop - job might still be running
       }
     }, this.HEARTBEAT_INTERVAL_MS);

     this.heartbeatIntervals.set(executionId, interval);
   }
   ```

3. **Stop Heartbeat** (on completion/error/timeout)
   ```typescript
   private stopHeartbeat(executionId: string): void {
     const interval = this.heartbeatIntervals.get(executionId);
     if (interval) {
       clearInterval(interval);
       this.heartbeatIntervals.delete(executionId);
     }
   }
   ```

4. **Database Update**
   ```python
   def heartbeat(self, job_id: str) -> None:
       job = self.get_job(job_id)
       if job:
           self.client.table("jobs").update({
               "last_heartbeat": datetime.now(timezone.utc).isoformat()
           }).eq("id", job.id).execute()
   ```

### Hung Detection (Improved)

With heartbeats, hung detection now checks `last_heartbeat`:
- Job is hung if `last_heartbeat` > X minutes ago
- Not just `started_at`

---

## Configuration

### Plugin Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `agentTimeoutMinutes` | 5 | Max execution time before kill |
| `hungThresholdMinutes` | 5 | Heartbeat timeout for hung detection |

### State Files

| File | Location | Purpose |
|------|----------|---------|
| `running-agents.json` | `instances/{business}/state/` | Active agent PIDs |

---

## Testing

See `docs/system/job-queue-testing.md` for test strategies.

### Manual Verification

1. **Duplicate Prevention**: Reload plugin while agent running → should not spawn duplicate
2. **Timeout**: Run agent past timeout → should be killed
3. **Orphan Cleanup**: Kill Obsidian mid-execution, restart → orphan should be cleaned up
4. **Heartbeat**: Check `last_heartbeat` in Supabase during execution → should update every 30s

---

## Related Documentation

- [PRD: Reliability Hardening](../planning/prds/active/reliability-hardening.md)
- [Job Queue Testing](./job-queue-testing.md)
- [AGENTS.md](../../AGENTS.md)
