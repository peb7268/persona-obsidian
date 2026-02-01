# Persona Job Queue Architecture

## Overview

The Persona Job Queue system provides a durable, observable, and reliable job execution framework built on Supabase. It replaces file-based state management with a proper database-backed queue while maintaining backward compatibility with the existing Bash-based execution system.

## Design Principles

### 1. Durability

**Problem**: The original system used JSON files (`progress.json`, `executions.json`) which could be corrupted or lost.

**Solution**: All job state is persisted in Supabase PostgreSQL database with ACID guarantees.

Benefits:
- Crash-resistant job tracking
- Transaction safety for state updates
- Database-level backups and point-in-time recovery
- Multi-instance safety (no file locking issues)

### 2. Observability

**Problem**: Limited visibility into job execution. No structured logging or real-time updates.

**Solution**: Comprehensive logging and real-time subscriptions.

Features:
- Structured log entries with levels (debug, info, warn, error)
- Real-time job status updates via Supabase subscriptions
- Job delegation tree visualization
- Process-level metrics (CPU, memory, PID tracking)
- Heartbeat monitoring for hung job detection

### 3. Determinism

**Problem**: Race conditions in file-based locking. Unclear job lifecycle.

**Solution**: Database-backed job queue with clear state transitions.

State machine:
```
pending → running → completed
                  ↓
                failed
```

Additional states:
- `cancelled`: Manually terminated
- `hung`: No heartbeat (timeout)

### 4. Reliability

**Problem**: Jobs could fail silently. No automatic retry or recovery.

**Solution**: Heartbeat monitoring and hung job detection.

Features:
- Periodic heartbeat (default: every 30s)
- Hung job detection (default: 5min timeout)
- Automatic state transition to `hung` status
- Manual recovery via CLI (`persona hung --kill`)

## Architecture Components

### Database Layer (Supabase)

#### Schema

```
jobs
├── id (uuid, PK)
├── short_id (text, unique)     # Human-friendly 8-char ID
├── job_type (text)             # research, meeting_extract, etc.
├── payload (jsonb)             # Job-specific data
├── status (enum)               # pending/running/completed/failed/cancelled/hung
├── pid (integer)               # Process ID when running
├── hostname (text)             # Worker hostname
├── created_at (timestamptz)
├── started_at (timestamptz)
├── completed_at (timestamptz)
├── last_heartbeat (timestamptz)
├── exit_code (integer)
├── error_message (text)
├── result (jsonb)              # Job output data
├── parent_job_id (uuid, FK)    # For delegation chains
├── delegated_by (text)         # Agent that created this job
├── assigned_to (text)          # Agent that should execute
├── source_file (text)          # File that triggered job
├── source_line (integer)
└── tags (text[])

job_logs
├── id (bigserial, PK)
├── job_id (uuid, FK)
├── timestamp (timestamptz)
├── level (enum)                # debug/info/warn/error
├── message (text)
└── metadata (jsonb)

agents
├── id (text, PK)               # assistant, researcher, etc.
├── display_name (text)
├── description (text)
├── capabilities (text[])
├── prompt_template (text)
├── is_active (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)

daily_note_state
├── note_path (text, PK)
├── content_hash (text)         # SHA-256 for change detection
├── last_scanned (timestamptz)
├── last_content (text)
└── parsed_data (jsonb)         # Cached parse results
```

#### Views

**job_dashboard**: Aggregated job info with parent/child counts and duration calculations.

**job_statistics**: Status-grouped stats with avg/max duration.

**agent_workload**: Job count by agent and status.

#### Functions

**detect_hung_jobs(timeout_seconds)**: Find jobs with stale heartbeats.

**cleanup_old_jobs(days_to_keep)**: Delete old completed jobs.

**get_job_tree(job_uuid)**: Recursive query for delegation chains.

### Python Core Layer

#### JobStore (`persona/core/job_store.py`)

Main interface to Supabase database.

**Responsibilities**:
- CRUD operations on jobs
- Status transitions
- Log management
- Query helpers (pending, running, hung jobs)

**Key Methods**:
```python
create_job(job_type, payload, assigned_to, ...) -> Job
get_job(job_id) -> Job | None
update_job(job_id, **updates) -> Job
start_job(job_id, pid) -> Job
heartbeat(job_id) -> None
complete_job(job_id, result) -> Job
fail_job(job_id, error, exit_code) -> Job
get_pending_jobs(assigned_to, limit) -> list[Job]
get_running_jobs(assigned_to) -> list[Job]
get_hung_jobs(timeout_seconds) -> list[Job]
get_job_tree(job_id) -> list[Job]
log(job_id, level, message, metadata) -> None
get_logs(job_id, limit) -> list[dict]
```

#### ProcessManager (`persona/core/process_manager.py`)

Manages agent subprocess execution.

**Responsibilities**:
- Build command for job type
- Spawn agent process
- Monitor process health
- Send heartbeats
- Detect completion/failure
- Handle delegation

**Job Type Handlers**:

```python
def _build_command(job: Job) -> list[str]:
    if job_type == 'research':
        # Build Claude prompt for research question
        return ['claude', '-p', prompt, '--model', 'opus']

    if job_type == 'meeting_extract':
        # Extract meeting notes from daily note
        return ['claude', '-p', prompt, '--model', 'opus']

    if job_type == 'delegate':
        # Agent-to-agent delegation
        return ['claude', '-p', prompt, '--model', model]

    if job_type == 'agent_action':
        # Legacy bash script execution
        return ['bash', 'run-agent.sh', business, agent, action]
```

**Process Lifecycle**:

1. `start_agent(job)`: Spawn subprocess
   - Build command based on job type
   - Set environment variables (PERSONA_JOB_ID, etc.)
   - Redirect stdout/stderr to log files
   - Start heartbeat thread
   - Update job status to 'running'

2. Heartbeat thread:
   - Loop while process running
   - Send heartbeat every 30s
   - Monitor for completion markers
   - Handle exit codes

3. Process exit handler:
   - Read log files
   - Check for PERSONA_COMPLETE marker
   - Check for PERSONA_ERROR marker
   - Check for PERSONA_DELEGATE marker
   - Update final job status

**Output Markers**:

Agents can signal completion via stdout:

- `PERSONA_COMPLETE`: Job succeeded
- `PERSONA_ERROR: <message>`: Job failed
- `PERSONA_DELEGATE: <agent>: <task>`: Create child job

#### NoteStateStore (`persona/core/note_state.py`)

Tracks daily note changes for diff detection.

**Purpose**: Avoid re-processing unchanged notes.

**How it works**:
1. Hash note content (SHA-256)
2. Store hash + parsed data in database
3. On next scan, compare hashes
4. Only process if changed

### Worker Layer

#### Worker Daemon (`persona/worker.py`)

Background process that executes jobs from the queue.

**Responsibilities**:
- Poll for pending jobs
- Respect concurrency limits
- Start agents via ProcessManager
- Handle graceful shutdown

**Algorithm**:

```python
while running:
    running_count = count_running_jobs(assigned_to=agent_id)

    if running_count < concurrency:
        available_slots = concurrency - running_count
        pending = get_pending_jobs(assigned_to=agent_id, limit=available_slots)

        for job in pending:
            start_agent(job)

    sleep(poll_interval)
```

**Configuration**:
- `--agent`: Filter by agent ID
- `--concurrency`: Max parallel jobs (default: 3)
- `--poll-interval`: Seconds between checks (default: 5)

**Deployment**:
- systemd service (Linux)
- launchd (macOS)
- Docker container
- Manual terminal session

### CLI Layer

#### CLI Tool (`persona/cli.py`)

Command-line interface for job management.

**Commands**:

```bash
# Status and listing
persona status              # Job count summary
persona jobs               # List recent jobs
persona jobs -s running    # Filter by status
persona jobs -a researcher # Filter by agent
persona info <job_id>      # Detailed job info
persona logs <job_id>      # Job logs

# Management
persona create -t research -q "..." -a researcher
persona kill <job_id>
persona kill <job_id> --force
persona hung              # Find hung jobs
persona hung --kill       # Kill hung jobs
persona tree <job_id>     # Show delegation tree

# Maintenance
persona cleanup           # Delete old jobs
persona cleanup -d 7      # Keep only 7 days
persona agents            # List agents
```

#### Monitor (`persona/monitor.py`)

Real-time job monitoring via Supabase subscriptions.

**Features**:
- Live updates on job creation
- Status change notifications
- Completion/failure alerts
- Log streaming

**Usage**:
```bash
persona-monitor
```

Output:
```
📝 Created: abc12345 - research (assigned to: researcher)
🔄 Updated: abc12345 -> running
   [INFO] Starting research on quantum computing
✅ Done: abc12345 (research)
```

#### Migration Tool (`persona/migrate.py`)

Import existing state files into Supabase.

**What it migrates**:
- `executions.json` → jobs table
- `pending-notes.json` → jobs with type='apply_note_updates'
- `agents/*.md` → agents table
- Recent daily notes → daily_note_state table

**Usage**:
```bash
persona-migrate migrate-all --persona-root /path/to/persona
persona-migrate migrate-all --dry-run  # Preview only
```

### Bridge Layer

#### Bridge Script (`persona/bridge.py`)

Python CLI wrapper for TypeScript integration.

**Purpose**: Allow Obsidian plugin (TypeScript) to interact with job queue.

**Interface**:

```bash
python bridge.py create_job '{"type": "research", "payload": {...}}'
python bridge.py get_job_status <job_id>
python bridge.py get_pending_jobs [agent]
python bridge.py get_running_jobs [agent]
python bridge.py get_job_logs <job_id> [limit]
python bridge.py get_job_summary
```

All output is JSON for easy parsing in TypeScript.

#### TypeScript Service (`JobQueueService.ts`)

Wrapper around bridge script for Obsidian plugin.

**Usage**:

```typescript
const jobQueue = new JobQueueService(settings);

// Create job
const job = await jobQueue.createResearchJob(
  "What is quantum computing?",
  "Resources/Agenda/Daily/2024-02-01.md"
);

// Check status
const status = await jobQueue.getJobStatus(job.shortId);

// Get summary
const summary = await jobQueue.getJobSummary();
console.log(`Running: ${summary.running}, Pending: ${summary.pending}`);
```

### Integration Layer

#### Backward Compatibility

The system maintains compatibility with existing bash scripts:

**Option 1: Gradual Migration**

Use feature flag to run both systems in parallel:

```typescript
if (this.useJobQueue) {
  await this.jobQueueService.createResearchJob(question, file);
} else {
  await this.executionService.runAgent('researcher', 'process-question');
}
```

**Option 2: Full Migration**

Replace bash script calls with job creation:

```typescript
// Old
await executionService.runAgent(agent, action);

// New
await jobQueueService.createAgentActionJob(agent, action);
```

The job queue will route to bash script via `agent_action` job type.

#### Daily Note Processing

**Old Flow**:

```
Daily note modified
  ↓
Plugin detects [?] marker
  ↓
Parse questions
  ↓
Call run-agent.sh researcher
  ↓
Wait for completion
  ↓
Poll progress.json
```

**New Flow**:

```
Daily note modified
  ↓
Plugin detects [?] marker
  ↓
Parse questions
  ↓
Create research jobs in queue
  ↓
Worker picks up jobs
  ↓
Real-time status via Supabase
```

Benefits:
- Non-blocking (plugin doesn't wait)
- Multiple questions processed in parallel
- Better error handling
- Full audit trail

## Data Flow Diagrams

### Job Creation

```
User/Plugin
    ↓
JobStore.create_job()
    ↓
Insert into Supabase
    ↓
Job ID returned
    ↓
Real-time notification sent
    ↓
Worker polls queue
    ↓
Worker claims job
    ↓
ProcessManager.start_agent()
```

### Job Execution

```
ProcessManager
    ↓
Build command for job type
    ↓
Spawn subprocess
    ↓
Update job status to 'running'
    ↓
Start heartbeat thread
    ↓
    ├─ Heartbeat loop (every 30s)
    │    ↓
    │  JobStore.heartbeat()
    │    ↓
    │  Update last_heartbeat timestamp
    │
    └─ Process monitor
         ↓
       Wait for exit
         ↓
       Read log files
         ↓
       Check completion markers
         ↓
       Update final status
         ↓
       Real-time notification
```

### Delegation Chain

```
Agent A running
    ↓
Outputs: PERSONA_DELEGATE: agent-b: task description
    ↓
ProcessManager detects delegation
    ↓
Create child job
    ↓
    {
      type: 'delegate',
      assigned_to: 'agent-b',
      parent_job_id: job-a-id,
      delegated_by: 'agent-a',
      payload: { task: '...', context: '...' }
    }
    ↓
Worker picks up child job
    ↓
Agent B executes
    ↓
Result linked to parent
```

Query delegation tree:
```bash
persona tree <parent_job_id>
```

Output:
```
abc12345 [completed] research (researcher)
  def67890 [completed] delegate (assistant)
    ghi11121 [running] delegate (engineer)
```

## Performance Considerations

### Database Indexes

Critical indexes for query performance:

```sql
idx_jobs_status          ON jobs(status)
idx_jobs_type            ON jobs(job_type)
idx_jobs_created         ON jobs(created_at DESC)
idx_jobs_assigned        ON jobs(assigned_to)
idx_jobs_parent          ON jobs(parent_job_id)
idx_logs_job             ON job_logs(job_id, timestamp DESC)
```

### Polling Optimization

Workers poll at configurable intervals (default 5s). For high-throughput:

- Decrease poll interval (min: 1s)
- Increase concurrency
- Run multiple workers
- Use Supabase real-time instead of polling

### Log Retention

Old job logs accumulate over time. Clean up strategy:

**Manual**:
```bash
persona cleanup -d 30  # Keep last 30 days
```

**Automated (cron)**:
```bash
0 2 * * 0 persona cleanup -d 30  # Weekly at 2am Sunday
```

**Database Function**:
```sql
SELECT cleanup_old_jobs(30);  -- In Supabase SQL
```

### Hung Job Detection

Background task (optional):

```python
# In worker or separate daemon
while True:
    hung_jobs = job_store.get_hung_jobs(timeout=300)
    for job in hung_jobs:
        job_store.update_job(job.id, status=JobStatus.HUNG)
        process_manager.kill_job(job.id, force=True)
    sleep(60)  # Check every minute
```

Or manual:
```bash
persona hung --kill
```

## Security Considerations

### Supabase Keys

**Service Role Key**: Required for backend operations. Keep secret.

- Never commit to git
- Store in `.env` file
- Add `.env` to `.gitignore`
- Use environment-specific keys (dev/prod)

**Row Level Security (RLS)**:

For multi-user scenarios, enable RLS:

```sql
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs"
ON jobs FOR SELECT
USING (auth.uid() = (payload->>'user_id')::uuid);
```

### Process Isolation

Jobs run in separate processes with:

- Own process group (via `start_new_session=True`)
- Isolated stdout/stderr (separate log files)
- Configurable timeouts
- Resource limits (via psutil)

### Input Validation

Job payloads are JSON. Validate in ProcessManager:

```python
def _build_command(self, job: Job) -> list[str]:
    question = job.payload.get('question', '')

    # Sanitize input
    if len(question) > 10000:
        raise ValueError("Question too long")

    if '<script>' in question.lower():
        raise ValueError("Invalid characters in question")

    # ... build command
```

## Monitoring and Alerting

### Health Checks

```bash
# Check if worker is running
pgrep -f persona-worker

# Check job queue depth
persona status

# Check for failed jobs
persona jobs -s failed -n 10
```

### Metrics to Track

- Jobs created per hour
- Job completion rate
- Average job duration by type
- Failed job count
- Hung job count
- Worker availability

### Supabase Webhooks

Set up alerts for failures:

1. Go to Database → Webhooks
2. Create webhook for `jobs` table
3. Filter: `status = 'failed'`
4. Send to Slack/Discord/Email

Example webhook payload:
```json
{
  "type": "UPDATE",
  "table": "jobs",
  "record": {
    "id": "...",
    "short_id": "abc12345",
    "status": "failed",
    "error_message": "Connection timeout",
    ...
  }
}
```

## Testing Strategy

### Unit Tests

```python
# test_job_store.py
def test_create_job():
    store = JobStore()
    job = store.create_job('test', {'foo': 'bar'})
    assert job.status == JobStatus.PENDING

def test_job_lifecycle():
    store = JobStore()
    job = store.create_job('test', {})
    store.start_job(job.id, 12345)
    updated = store.get_job(job.id)
    assert updated.status == JobStatus.RUNNING
    assert updated.pid == 12345
```

### Integration Tests

```python
# test_process_manager.py
def test_agent_execution():
    store = JobStore()
    pm = ProcessManager(store, logs_dir)

    job = store.create_job('research', {'question': 'test'})
    pid = pm.start_agent(job)

    assert pid > 0
    assert pm.is_running(job.id)
```

### End-to-End Tests

```bash
# Create job
JOB_ID=$(persona create -t research -q "test" | jq -r .shortId)

# Wait for completion
while true; do
  STATUS=$(persona info $JOB_ID | jq -r .status)
  if [[ "$STATUS" == "completed" ]]; then
    break
  fi
  sleep 1
done

# Verify result
persona logs $JOB_ID | grep "PERSONA_COMPLETE"
```

## Future Enhancements

### Priority Queue

Add priority field to jobs:

```sql
ALTER TABLE jobs ADD COLUMN priority INTEGER DEFAULT 0;
CREATE INDEX idx_jobs_priority ON jobs(priority DESC, created_at);
```

Update worker to fetch by priority:

```python
pending = store.get_pending_jobs(
    assigned_to=agent_id,
    order_by='priority DESC, created_at ASC',
    limit=available_slots
)
```

### Job Dependencies

Support job dependencies (job B waits for job A):

```sql
ALTER TABLE jobs ADD COLUMN depends_on_job_id UUID REFERENCES jobs(id);
```

Worker checks dependencies before starting.

### Retry Logic

Automatically retry failed jobs:

```sql
ALTER TABLE jobs ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN max_retries INTEGER DEFAULT 0;
```

On failure, increment retry_count and requeue if < max_retries.

### Scheduled Jobs

Support cron-like scheduling:

```sql
CREATE TABLE job_schedules (
    id UUID PRIMARY KEY,
    job_type TEXT,
    payload JSONB,
    cron_expression TEXT,
    next_run_at TIMESTAMPTZ,
    is_active BOOLEAN
);
```

Background scheduler creates jobs based on cron expressions.

### Resource Limits

Track and limit resource usage:

```sql
ALTER TABLE jobs ADD COLUMN cpu_limit_percent FLOAT;
ALTER TABLE jobs ADD COLUMN memory_limit_mb INTEGER;
ALTER TABLE jobs ADD COLUMN max_duration_seconds INTEGER;
```

ProcessManager enforces limits via psutil.

### Web Dashboard

Build real-time web UI using Supabase client:

- Job list with filters
- Real-time updates
- Log viewer
- Agent status
- Performance metrics

Technologies:
- React/Vue/Svelte
- Supabase JS client
- Real-time subscriptions
- Chart.js for metrics

## Migration Path

### Phase 1: Parallel Operation (Week 1-2)

- Install Python components
- Set up Supabase
- Run worker alongside bash scripts
- Create jobs via CLI for testing
- Monitor both systems

### Phase 2: Plugin Integration (Week 3-4)

- Update TypeScript plugin with JobQueueService
- Add feature flag
- Route research questions to job queue
- Keep legacy path for other operations
- Test in production

### Phase 3: Full Migration (Week 5-6)

- Route all agent actions through job queue
- Deprecate bash script execution
- Update cron jobs to use queue
- Remove progress.json polling
- Clean up legacy code

### Phase 4: Optimization (Week 7+)

- Tune worker concurrency
- Optimize database queries
- Add monitoring and alerts
- Implement retry logic
- Build web dashboard

## Conclusion

The Persona Job Queue system provides a robust foundation for reliable AI agent orchestration. By replacing file-based state with Supabase, we achieve:

✅ **Durability**: Database-backed persistence
✅ **Observability**: Real-time monitoring and structured logging
✅ **Determinism**: Clear job lifecycle and state transitions
✅ **Reliability**: Heartbeat monitoring and hung job detection
✅ **Scalability**: Multiple workers and delegation chains
✅ **Maintainability**: Clean architecture and comprehensive tooling

The gradual migration path ensures minimal disruption while unlocking powerful new capabilities for the Persona system.
