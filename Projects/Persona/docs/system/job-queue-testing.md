# Job Queue Testing Strategy

## Overview

This document outlines the testing strategy for the Persona Job Queue system, which spans:
- **TypeScript** - Obsidian plugin (`src/services/JobQueueService.ts`, `src/ui/JobQueueModal.ts`)
- **Python** - Bridge script (`python/persona/bridge.py`, `python/persona/core/job_store.py`)
- **Database** - Supabase tables (`jobs`, `job_logs`)

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Obsidian Plugin (UI)                     │
│  JobQueueModal.ts  →  JobQueueService.ts                    │
├─────────────────────────────────────────────────────────────┤
│                    Python Bridge                            │
│  bridge.py  →  job_store.py                                 │
├─────────────────────────────────────────────────────────────┤
│                    Supabase                                 │
│  jobs table  │  job_logs table  │  views                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Categories

### 1. Unit Tests

#### TypeScript (JobQueueService)

| Test | Description | Priority |
|------|-------------|----------|
| `updateJobStatus returns success` | Verify success response format | High |
| `updateJobStatus returns failure on error` | Verify error handling | High |
| `getAgentDailyPerformance parses response` | Verify metrics parsing | Medium |
| `buildPythonEnv constructs correct paths` | Verify environment setup | Medium |

**Mock Requirements**:
- Mock `spawn` to simulate Python bridge responses
- Mock file system for environment paths

#### Python (job_store.py)

| Test | Description | Priority |
|------|-------------|----------|
| `create_job generates short_id` | Verify 8-char UUID prefix | High |
| `start_job sets started_at` | Verify timestamp population | High |
| `complete_job sets completed_at` | Verify timestamp population | High |
| `fail_job sets error_message` | Verify error storage | High |
| `get_job by short_id` | Verify lookup works | High |

**Mock Requirements**:
- Mock Supabase client responses

#### Python (bridge.py)

| Test | Description | Priority |
|------|-------------|----------|
| `get_pending_jobs includes status` | Verify status field present | High |
| `get_running_jobs includes status` | Verify status field present | High |
| `get_agent_daily_performance aggregates correctly` | Verify metrics calculation | Medium |
| `update_job_status handles cancelled` | Verify cancelled status | Medium |

---

### 2. Integration Tests

#### Bridge Communication

| Test | Description | Setup |
|------|-------------|-------|
| `Plugin calls bridge successfully` | End-to-end bridge invocation | Local Supabase |
| `Bridge returns JSON on success` | Verify JSON parsing | Local Supabase |
| `Bridge returns error on failure` | Verify error propagation | Local Supabase |

**Test Command**:
```bash
cd python
SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_KEY="test-key" \
python persona/bridge.py get_job_summary
```

#### Database Operations

| Test | Description | Verification |
|------|-------------|--------------|
| `Job creation persists` | Create job, verify in DB | Query jobs table |
| `Status transitions work` | pending→running→completed | Check timestamps |
| `Logs are stored` | Log event, verify in DB | Query job_logs table |

---

### 3. UI Tests (Manual)

#### Job Queue Modal

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Modal opens | Command palette → Open Job Queue | Modal appears with stats |
| Filter works | Click "Pending" card | Only pending jobs shown |
| Copy ID | Click clipboard icon | ID copied, toast appears |
| Mark complete | Click ✓ on pending job | Job moves to completed |
| Cancel job | Click ✗ on pending job | Job moves to cancelled |
| View logs | Click Logs button | Logs modal opens |
| Auto-refresh | Wait 5 seconds | Stats update without flicker |
| Pause/resume | Click Pause, then Resume | Auto-refresh toggles |

#### Edge Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Empty state | Filter to status with 0 jobs | Empty state message shown |
| Long job ID | Job with long type name | UI doesn't break |
| Error state | Disconnect Supabase | Error message shown |
| Rapid refresh | Click refresh repeatedly | No race conditions |

---

### 4. Error Handling Tests

#### Retry Logic

| Test | Simulation | Expected |
|------|------------|----------|
| First attempt succeeds | Normal operation | Status updated immediately |
| Second attempt succeeds | Fail first, succeed second | 1s delay, then success |
| All attempts fail | Fail all 3 attempts | Notice shown, system.log written |

**Test Approach**:
```typescript
// Mock bridge to fail N times
let failCount = 2;
jest.mock('./callBridge', () => ({
  callBridge: async () => {
    if (failCount > 0) {
      failCount--;
      throw new Error('Simulated failure');
    }
    return { success: true };
  }
}));
```

#### System Logging

| Test | Trigger | Verification |
|------|---------|--------------|
| Error logged on failure | All retries fail | Check `logs/system.log` |
| Log format correct | Any error | Timestamp, ERROR prefix |
| Log directory created | First error, no dir | Directory created |

---

## Test Data

### Sample Job Records

```json
{
  "pending_job": {
    "id": "uuid-1",
    "short_id": "abc12345",
    "job_type": "agent_action",
    "status": "pending",
    "assigned_to": "researcher",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "running_job": {
    "id": "uuid-2",
    "short_id": "def67890",
    "job_type": "research",
    "status": "running",
    "assigned_to": "researcher",
    "created_at": "2025-01-15T10:00:00Z",
    "started_at": "2025-01-15T10:01:00Z",
    "pid": 12345
  },
  "completed_job": {
    "id": "uuid-3",
    "short_id": "ghi11223",
    "job_type": "agent_action",
    "status": "completed",
    "assigned_to": "assistant",
    "created_at": "2025-01-15T10:00:00Z",
    "started_at": "2025-01-15T10:01:00Z",
    "completed_at": "2025-01-15T10:05:00Z"
  }
}
```

### Performance Metrics Test Data

```json
{
  "metrics": [
    {
      "date": "2025-01-15",
      "agent": "researcher",
      "jobsCompleted": 5,
      "successful": 4,
      "failed": 1,
      "avgDurationSeconds": 120.5,
      "minDurationSeconds": 45,
      "maxDurationSeconds": 300
    }
  ]
}
```

---

## Test Environment Setup

### Local Supabase

```bash
# Start local Supabase
cd python
supabase start

# Get local credentials
supabase status
# Use URL: http://127.0.0.1:54321
# Use anon key for testing
```

### Environment Variables

```bash
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_KEY="your-local-anon-key"
export PYTHONPATH="$PWD/python"
```

### Reset Test Data

```bash
# Clear all jobs (local only!)
psql -h localhost -p 54322 -U postgres -d postgres \
  -c "TRUNCATE jobs, job_logs CASCADE;"
```

---

## Test Execution

### Manual Test Checklist

Before each release:

- [ ] Job Queue modal opens
- [ ] All 5 filter cards work
- [ ] Copy to clipboard works
- [ ] Mark complete works (pending → completed)
- [ ] Cancel job works (pending → cancelled)
- [ ] Logs modal shows content
- [ ] Auto-refresh updates stats
- [ ] New job shows correct status progression
- [ ] Performance metrics return data

### Automated Test Commands

```bash
# TypeScript type check
cd .obsidian/plugins/persona
npm run build

# Python bridge smoke test
cd python
python -c "from persona.bridge import get_job_summary; print(get_job_summary())"
```

---

## Known Limitations

### Current Testing Gaps

1. **No automated UI tests** - Modal testing requires Obsidian runtime
2. **No load testing** - Performance under high job volume untested
3. **No network failure simulation** - Supabase disconnect scenarios manual only

### Recommended Future Work

1. Add Jest tests for TypeScript services
2. Add pytest tests for Python bridge
3. Add Playwright tests for modal interactions (if Obsidian supports)
4. Add chaos testing for network failures

---

## Regression Tests

After any Job Queue changes, verify:

| Area | Test | Command/Steps |
|------|------|---------------|
| Build | Plugin compiles | `npm run build` |
| Bridge | Python runs | `python bridge.py get_job_summary` |
| UI | Modal opens | Open Job Queue command |
| Lifecycle | Status transitions | Run agent, check status changes |
| Logs | Logs appear | Check job logs after run |

---

## Related Documentation

- [Job Queue User Guide](../user/job-queue-guide.md)
- [Task Queue PRD](../planning/prds/completed/task-queue-system/prd.md)
