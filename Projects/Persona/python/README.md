# Persona Job Queue System

A Supabase-based job queue system for the Persona AI agent orchestration platform.

## Features

- **Durable**: Jobs persisted in Supabase database
- **Observable**: Real-time job monitoring and detailed logging
- **Deterministic**: Reliable job execution with heartbeat monitoring
- **Scalable**: Support for multiple workers and delegation chains

## Installation

### 1. Install Python Dependencies

```bash
cd Projects/Persona/python
pip install -e .
```

Or using requirements.txt:

```bash
pip install -r requirements.txt
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Copy your project URL and service role key
3. Run the schema migration:

```bash
# Copy the schema to your clipboard
cat schema.sql

# Then paste and run in Supabase SQL editor
# Or use the Supabase CLI:
supabase db push
```

### 3. Configure Environment

Copy the template and fill in your values:

```bash
cp .env.template .env
nano .env  # or your favorite editor
```

Required variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase service role key (not anon key)
- `PERSONA_ROOT`: Path to your Persona installation
- `PERSONA_VAULT_PATH`: Path to your Obsidian vault

### 4. Migrate Existing Data (Optional)

If you have existing Persona state files, migrate them:

```bash
persona-migrate migrate-all --persona-root /path/to/vault/Projects/Persona
```

## Usage

### CLI Commands

#### View Job Status

```bash
# Summary of all jobs
persona status

# List recent jobs
persona jobs

# List running jobs only
persona jobs -s running

# List jobs for specific agent
persona jobs -a researcher

# Show detailed job info
persona info abc123

# View job logs
persona logs abc123
```

#### Manage Jobs

```bash
# Create a new research job
persona create -t research -q "What is quantum computing?" -a researcher

# Kill a running job
persona kill abc123
persona kill abc123 --force  # SIGKILL

# View delegation tree
persona tree abc123

# Find hung jobs
persona hung
```

#### Maintenance

```bash
# Clean up old completed jobs (keep last 30 days)
persona cleanup

# Dry run to see what would be deleted
persona cleanup --dry-run

# Keep only last 7 days
persona cleanup -d 7
```

### Worker Daemon

Start a worker to process jobs from the queue:

```bash
# Process all jobs
persona-worker

# Process only researcher jobs
persona-worker --agent researcher

# Configure concurrency
persona-worker --concurrency 5

# Adjust polling interval
persona-worker --poll-interval 10
```

Run multiple workers for different agents:

```bash
# Terminal 1: Process assistant jobs
persona-worker --agent assistant --concurrency 2

# Terminal 2: Process researcher jobs
persona-worker --agent researcher --concurrency 3

# Terminal 3: Process all other jobs
persona-worker --concurrency 5
```

### Real-time Monitoring

Monitor jobs in real-time:

```bash
persona-monitor
```

This will show live updates as jobs are created, updated, completed, or failed.

### Python API

Use the job queue in your Python scripts:

```python
from persona.core import JobStore, ProcessManager
from pathlib import Path

# Initialize
store = JobStore()
pm = ProcessManager(store, Path.home() / ".persona/logs")

# Create a research job
job = store.create_job(
    job_type="research",
    payload={"question": "What is the capital of France?"},
    assigned_to="researcher",
    tags=["geography", "capitals"]
)

print(f"Created job: {job.short_id}")

# Start the job
pm.start_agent(job)

# Check status
updated_job = store.get_job(job.short_id)
print(f"Status: {updated_job.status.value}")

# Get logs
logs = store.get_logs(job.short_id)
for log in logs:
    print(f"[{log['level']}] {log['message']}")
```

### TypeScript Integration

From your Obsidian plugin:

```typescript
import { JobQueueService } from './services/JobQueueService';

// Initialize
const jobQueue = new JobQueueService(settings);

// Create a research job
const job = await jobQueue.createResearchJob(
  "What is quantum computing?",
  "Resources/Agenda/Daily/2024-02-01.md"
);

console.log(`Created job: ${job.shortId}`);

// Check status
const status = await jobQueue.getJobStatus(job.shortId);
console.log(`Status: ${status.status}`);

// Get summary
const summary = await jobQueue.getJobSummary();
console.log(`Running: ${summary.running}, Pending: ${summary.pending}`);
```

## Job Types

### Built-in Job Types

- **research**: Answer research questions from daily notes
- **meeting_extract**: Extract meeting notes from daily notes
- **delegate**: Agent delegation tasks
- **agent_action**: Legacy agent execution (backward compatible)

### Custom Job Types

You can create custom job types by extending the ProcessManager:

```python
def _build_command(self, job: Job) -> list[str]:
    if job.job_type == 'custom_task':
        prompt = f"Custom task: {job.payload.get('task')}"
        return self._build_claude_command(job, prompt)

    # ... existing job types ...
```

## Architecture

### Components

1. **JobStore**: Supabase interface for job CRUD operations
2. **ProcessManager**: Manages agent subprocess execution
3. **Worker**: Daemon that polls queue and processes jobs
4. **CLI**: Command-line interface for management
5. **Bridge**: Python script callable from TypeScript

### Database Schema

- **jobs**: Main job queue with status tracking
- **job_logs**: Detailed log entries per job
- **agents**: Agent registry with capabilities
- **daily_note_state**: Content hash tracking for diff detection

### Job Lifecycle

1. **Created**: Job inserted into queue (status: pending)
2. **Picked up**: Worker claims job and starts agent
3. **Running**: Agent process running, sending heartbeats
4. **Completed/Failed**: Agent finishes, final status set
5. **Cleaned up**: Old jobs deleted after retention period

## Monitoring

### Job Status

Jobs can have the following statuses:

- `pending`: Waiting to be processed
- `running`: Currently executing
- `completed`: Finished successfully
- `failed`: Finished with error
- `cancelled`: Manually cancelled
- `hung`: No heartbeat received (timeout)

### Heartbeats

Running jobs send heartbeats every 30 seconds (configurable via `JOB_HEARTBEAT_INTERVAL`).
Jobs with no heartbeat for 5 minutes (configurable via `JOB_HUNG_TIMEOUT`) are marked as hung.

### Real-time Updates

The system uses Supabase real-time subscriptions for live job updates.
The monitor tool displays updates as they happen.

## Troubleshooting

### Bridge Script Not Found

Ensure the Python package is installed:

```bash
cd Projects/Persona/python
pip install -e .
```

### Supabase Connection Errors

Check your environment variables:

```bash
echo $SUPABASE_URL
echo $SUPABASE_KEY
```

Make sure you're using the **service role key**, not the anon key.

### Jobs Stuck in Running

Check for hung jobs:

```bash
persona hung
```

Kill hung jobs:

```bash
persona hung --kill
```

### Worker Not Processing Jobs

Check worker logs:

```bash
persona-worker --poll-interval 5
```

Verify jobs exist:

```bash
persona jobs -s pending
```

## Configuration

All configuration via environment variables (`.env` file):

### Supabase
- `SUPABASE_URL`: Project URL
- `SUPABASE_KEY`: Service role key

### Persona Paths
- `PERSONA_ROOT`: Root directory (e.g., `/home/user/vault/Projects/Persona`)
- `PERSONA_VAULT_PATH`: Vault root (e.g., `/home/user/vault`)
- `PERSONA_BUSINESS`: Business instance name (default: `PersonalMCO`)

### Job Settings
- `JOB_HEARTBEAT_INTERVAL`: Heartbeat frequency in seconds (default: 30)
- `JOB_HUNG_TIMEOUT`: Hung job timeout in seconds (default: 300)
- `JOB_LOG_RETENTION_DAYS`: Log retention period (default: 30)

### Worker Settings
- `WORKER_CONCURRENCY`: Max concurrent jobs (default: 3)
- `WORKER_POLL_INTERVAL`: Queue polling interval in seconds (default: 5)

### AI Provider Settings
- `CLAUDE_MODEL`: Default Claude model (default: opus)
- `GEMINI_MODEL`: Default Gemini model (default: pro)

## Development

### Running Tests

```bash
pytest
```

### Code Style

```bash
black persona/
isort persona/
```

### Type Checking

```bash
mypy persona/
```

## Migration from Legacy System

The job queue system is designed to run alongside the existing bash script system.
Use the feature flag approach in the TypeScript plugin to gradually migrate:

1. Install Python components
2. Set up Supabase
3. Enable job queue in plugin settings
4. Monitor both systems in parallel
5. Gradually migrate agent actions to use queue
6. Deprecate bash scripts once stable

See `JobQueueIntegration.ts` for integration examples.

## License

MIT
