# PRD: Unified Eventing System with Supabase

**Status:** Planned
**Created:** 2026-02-02
**Priority:** High

---

## Context

Previously implemented a "belt-and-suspenders" fix where both TypeScript and bash update job status. This works but has limitations:
- Polling-based (30s latency)
- Fire-and-forget semantics
- State scattered across Supabase, local JSON, file system
- Tight coupling between components

## Goals

1. **Real-time status updates** - Replace 30s polling with instant push
2. **Guaranteed delivery** - Never lose events
3. **Decouple components** - Pub/sub pattern
4. **Central observability** - Trace events across all components

## Recommended Approach: Supabase Unified (Queues + Realtime)

Use Supabase's native capabilities to consolidate eventing into a single infrastructure:

| Feature | Supabase Tool | Purpose |
|---------|---------------|---------|
| Message Queue | **pgmq** (Supabase Queues) | Guaranteed delivery, exactly-once |
| Push Notifications | **Realtime** | Instant status updates to UI |
| Event Log | **events table** | Central observability/audit trail |

### Why Supabase-Only?

- ✅ Already using Supabase (no new infrastructure)
- ✅ pgmq runs on any Postgres 14+ (works locally)
- ✅ Realtime uses PostgreSQL LISTEN/NOTIFY (works locally)
- ✅ Single source of truth for all state
- ✅ SQL-based - accessible from TypeScript, Python, and bash (via bridge.py)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    jobs      │  │   events     │  │   pgmq queues        │  │
│  │   (table)    │  │  (audit log) │  │  - job_events        │  │
│  └──────┬───────┘  └──────────────┘  │  - agent_commands    │  │
│         │                             └──────────────────────┘  │
│         │ LISTEN/NOTIFY                                         │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │   Realtime   │◄─── TypeScript subscribes                     │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
    TypeScript            Python              Bash (via
    (Obsidian)           (bridge.py)          bridge.py)
```

### Data Flow

1. **Bash/Python publishes event** → `pgmq.send('job_events', {...})`
2. **Event persisted** → Stored in queue + written to `events` table
3. **TypeScript notified** → Realtime subscription on `jobs` table fires
4. **UI updates instantly** → No polling needed

---

## Event Schema

### Queue: `job_events`

```json
{
  "type": "job.status_changed",
  "job_id": "abc123",
  "timestamp": "2026-02-02T10:30:00Z",
  "data": {
    "old_status": "pending",
    "new_status": "running",
    "pid": 12345
  },
  "source": "bash",
  "trace_id": "exec-2026-02-02T10-30-00-researcher"
}
```

### Event Types

| Type | Source | Description |
|------|--------|-------------|
| `job.created` | TypeScript | New job added to queue |
| `job.started` | Bash | Agent execution began |
| `job.heartbeat` | Bash | Periodic liveness signal |
| `job.progress` | Claude | Task progress update |
| `job.completed` | Bash | Agent finished successfully |
| `job.failed` | Bash | Agent failed with error |
| `job.timeout` | TypeScript | Agent exceeded time limit |
| `job.cancelled` | TypeScript | User cancelled job |

### Events Table (for observability)

```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  job_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL,  -- 'typescript', 'python', 'bash', 'claude'
  trace_id TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_job_id ON events(job_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
```

---

## Implementation Progress

### Phase 1: Database Setup
- [x] Enable pgmq extension in local Supabase
- [x] Create `job_events` queue
- [x] Create `events` audit table
- [x] Add necessary RPC functions
- [x] Test queue operations via SQL

### Phase 2: Python Event Layer
- [x] Add `publish_event()` function to bridge.py
- [x] Add queue interaction methods to job_store.py
- [x] Update `update_job_status()` to publish events
- [x] Add CLI command for `publish_event`
- [x] Test event publishing from Python

### Phase 3: Bash Integration
- [x] Add `publish_event()` bash function to run-agent.sh
- [x] Replace `update_supabase_job_status()` calls with `publish_event`
- [x] Add trace_id propagation via `PERSONA_EXEC_ID` env var
- [x] Test event flow from bash → Python → Supabase

### Phase 4: TypeScript Event-Driven
- [x] Add Supabase client with Realtime support to plugin
- [x] Create EventService for Realtime subscriptions
- [x] Subscribe to `jobs` table changes
- [ ] Remove polling loop from QueueConsumerService (deferred - keep as fallback)
- [x] Update StatusBar to react to Realtime events
- [ ] Remove `updateJobStatusWithRetry()` fire-and-forget calls (deferred - keep as fallback)
- [ ] Test real-time UI updates

### Phase 5: Cleanup & Testing
- [x] Remove deprecated `update_supabase_job_status()` function from run-agent.sh
- [ ] Remove polling code (deferred - keeping as fallback alongside Realtime)
- [ ] Remove redundant local state files (deferred - running-agents.json still useful for debugging)
- [x] Verify existing tests pass (460 tests passing)
- [ ] Add integration tests for event flow
- [ ] Update documentation

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/xxx_add_pgmq.sql` | Enable pgmq, create queue, events table |
| `python/persona/bridge.py` | Add `publish_event()` function |
| `python/persona/core/job_store.py` | Add queue interaction methods |
| `scripts/run-agent.sh` | Replace status updates with `publish_event` |
| `src/services/JobQueueService.ts` | Add Realtime subscription |
| `src/services/QueueConsumerService.ts` | Remove polling, use Realtime |
| `src/services/EventService.ts` | New service for event handling |

---

## Code Examples

### Phase 1: SQL Migration

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create queue
SELECT pgmq.create('job_events');

-- Create audit table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  job_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL,
  trace_id TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_job_id ON events(job_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);

-- Trigger to log all queue messages to events table
CREATE OR REPLACE FUNCTION log_queue_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO events (type, job_id, source, trace_id, data, timestamp)
  SELECT
    NEW.message->>'type',
    NEW.message->>'job_id',
    NEW.message->>'source',
    NEW.message->>'trace_id',
    NEW.message->'data',
    (NEW.message->>'timestamp')::timestamptz;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: Python Event Publisher

```python
def publish_event(event_type: str, job_id: str, data: dict, source: str = "python"):
    """Publish event to queue and update job status."""
    store = get_store()

    event = {
        "type": event_type,
        "job_id": job_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "trace_id": os.environ.get("PERSONA_EXEC_ID", ""),
        "data": data
    }

    # Send to queue (guaranteed delivery)
    store.client.rpc("pgmq_send", {
        "queue_name": "job_events",
        "message": event
    }).execute()

    # Update jobs table (triggers Realtime for UI)
    if event_type == "job.started":
        store.start_job(job_id, data.get("pid"))
    elif event_type == "job.completed":
        store.complete_job(job_id, data.get("result"))
    elif event_type == "job.failed":
        store.fail_job(job_id, data.get("error"))

    return {"success": True, "event": event}
```

### Phase 3: Bash Integration

```bash
publish_event() {
    local event_type="$1"
    local data="$2"

    if [ -z "$PERSONA_JOB_ID" ]; then return 0; fi

    PYTHONPATH="$PERSONA_ROOT/python" \
    SUPABASE_URL="$PERSONA_SUPABASE_URL" \
    SUPABASE_KEY="$PERSONA_SUPABASE_KEY" \
    PERSONA_EXEC_ID="$EXEC_ID" \
    python3 "$PERSONA_ROOT/python/persona/bridge.py" \
        publish_event "$event_type" "$PERSONA_JOB_ID" "$data" "bash" \
        2>/dev/null || true
}

# At execution start
publish_event "job.started" "{\"pid\":$$}"

# At execution end
publish_event "job.completed" "{\"output_size\":$PROVIDER_OUTPUT_SIZE}"

# On failure
publish_event "job.failed" "{\"error\":\"$ERROR_MSG\",\"exit_code\":$EXIT_CODE}"
```

### Phase 4: TypeScript Realtime Subscription

```typescript
// In QueueConsumerService or new EventService
private subscribeToJobChanges(): void {
  const channel = this.supabase
    .channel('job-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'jobs',
      },
      (payload) => {
        this.handleJobChange(payload);
      }
    )
    .subscribe();
}

private handleJobChange(payload: RealtimePostgresChangesPayload<Job>): void {
  const job = payload.new as Job;

  // Update UI immediately
  this.emit('job:updated', job);

  // Handle status transitions
  if (payload.old?.status !== job.status) {
    console.log(`Job ${job.short_id} changed: ${payload.old?.status} → ${job.status}`);

    if (job.status === 'completed' || job.status === 'failed') {
      this.slotManager.releaseSlot(job.short_id);
    }
  }
}
```

---

## Benefits

| Before | After |
|--------|-------|
| 30s polling latency | Instant push via Realtime |
| Fire-and-forget status updates | Guaranteed delivery via pgmq |
| State in 3 places | Single source of truth (Supabase) |
| No event history | Full audit trail in `events` table |
| Tight coupling (spawn subprocess) | Pub/sub decoupling |

---

## Observability Gains

With the `events` table, you can:

```sql
-- Trace a job's full lifecycle
SELECT * FROM events WHERE job_id = 'abc123' ORDER BY timestamp;

-- Find failed jobs in last hour
SELECT * FROM events
WHERE type = 'job.failed'
AND timestamp > NOW() - INTERVAL '1 hour';

-- Average job duration by agent
SELECT
  data->>'agent' as agent,
  AVG(EXTRACT(EPOCH FROM (
    (SELECT timestamp FROM events e2
     WHERE e2.job_id = e1.job_id AND e2.type = 'job.completed')
    - e1.timestamp
  ))) as avg_duration_sec
FROM events e1
WHERE type = 'job.started'
GROUP BY data->>'agent';
```
