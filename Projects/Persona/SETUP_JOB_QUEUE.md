# Persona Job Queue Setup Guide

This guide will help you set up the new Supabase-based job queue system for Persona.

## Prerequisites

- Python 3.10 or later
- pip3
- Supabase account (free tier is fine)
- Existing Persona installation

## Quick Start

### 1. Run Installation Script

```bash
cd Projects/Persona/python
./install.sh
```

This will:
- Install Python dependencies
- Create `.env` file from template
- Set up logs directory

### 2. Set Up Supabase

#### Create Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization and set project name (e.g., "persona-queue")
4. Set a strong database password
5. Choose a region close to you
6. Wait for project to be created (~2 minutes)

#### Get Credentials

1. Go to Project Settings → API
2. Copy your **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy your **service_role key** (NOT the anon key)
   - This is under "Project API keys" → "service_role"
   - ⚠️ Keep this secret! Never commit to git

#### Run Schema Migration

1. In Supabase dashboard, go to SQL Editor
2. Click "New Query"
3. Copy the entire contents of `python/schema.sql`
4. Paste into the query editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify you see success messages and no errors

You should see these tables created:
- jobs
- job_logs
- agents
- daily_note_state

### 3. Configure Environment

Edit `python/.env`:

```bash
nano python/.env  # or your favorite editor
```

Set these required values:

```bash
# Supabase (from step 2)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Persona paths (adjust to your setup)
PERSONA_VAULT_PATH=/home/user/vault
PERSONA_BUSINESS=PersonalMCO
PERSONA_ROOT=/home/user/vault/Projects/Persona
```

### 4. Test the Installation

```bash
# Verify CLI works
persona status

# Should show:
# pending:         0
# running:         0
# completed:       0
# failed:          0
# cancelled:       0
# hung:            0

# List agents
persona agents

# Should show your agents: assistant, researcher, etc.
```

If you see errors about Supabase connection, double-check your `.env` values.

### 5. Migrate Existing Data (Optional)

If you have existing Persona state files, migrate them:

```bash
persona-migrate migrate-all --persona-root $PERSONA_ROOT
```

This will import:
- Execution history from `executions.json`
- Pending updates from `pending-notes.json`
- Agent definitions from `agents/*.md`
- Recent daily note states

### 6. Start a Worker

In a terminal:

```bash
persona-worker
```

You should see:
```
Worker started (agent: all, concurrency: 3)
```

Keep this running to process jobs from the queue.

### 7. Create Your First Job

In another terminal:

```bash
# Create a test research job
persona create -t research \
  -q "What is the latest version of Python?" \
  -a researcher

# Should output:
# Created job: abc12345
# Type: research
# Status: pending
# Assigned to: researcher
```

Watch the worker terminal - you should see it pick up and process the job.

Check status:

```bash
persona jobs

# Should show your job in running or completed state
```

## Integration with Obsidian Plugin

### Option A: Gradual Migration (Recommended)

This approach lets you run both systems in parallel:

1. **Update plugin to include JobQueueService** (already created)
2. **Add feature flag** in plugin settings
3. **Test with research questions first**
4. **Gradually migrate other job types**

The plugin files are ready:
- `JobQueueService.ts` - TypeScript wrapper for job queue
- `JobQueueIntegration.ts` - Integration examples
- `bridge.py` - Python CLI bridge

### Option B: Full Migration

Replace bash script execution with job queue entirely.

## Running Worker as a Service

### Using systemd (Linux)

1. Edit the service template:

```bash
cp python/persona-worker.service.template persona-worker.service
nano persona-worker.service
```

Update paths to match your system:
- `User=` → your username
- `WorkingDirectory=` → path to `python/` directory
- `EnvironmentFile=` → path to `.env` file

2. Install the service:

```bash
sudo cp persona-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable persona-worker
sudo systemctl start persona-worker
```

3. Check status:

```bash
sudo systemctl status persona-worker
```

View logs:

```bash
sudo journalctl -u persona-worker -f
```

### Using launchd (macOS)

Create `~/Library/LaunchAgents/com.persona.worker.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.persona.worker</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>-m</string>
        <string>persona.worker</string>
        <string>--concurrency</string>
        <string>3</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/your/vault/Projects/Persona/python</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/persona-worker.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/persona-worker-error.log</string>
</dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.persona.worker.plist
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY persona/ ./persona/
ENV PYTHONPATH=/app

CMD ["python", "-m", "persona.worker"]
```

Build and run:

```bash
docker build -t persona-worker .
docker run -d --name persona-worker \
  --env-file .env \
  -v ~/.persona/logs:/root/.persona/logs \
  persona-worker
```

## Monitoring

### Real-time Monitor

```bash
persona-monitor
```

Shows live updates as jobs change status.

### Dashboard Queries

```bash
# Summary
persona status

# Recent jobs
persona jobs -n 50

# Running jobs only
persona jobs -s running

# Failed jobs for debugging
persona jobs -s failed -n 20

# Jobs by agent
persona jobs -a researcher

# Job details
persona info abc12345

# Job logs
persona logs abc12345
```

### Supabase Dashboard

You can also view jobs directly in Supabase:

1. Go to Table Editor
2. Select `jobs` table
3. Use filters to find specific jobs
4. Check `job_logs` table for detailed logs

## Troubleshooting

### "No module named 'persona'"

Install the package in editable mode:

```bash
cd python
pip install -e .
```

### "ValueError: SUPABASE_URL and SUPABASE_KEY must be set"

Check your `.env` file:

```bash
cat python/.env | grep SUPABASE
```

Make sure values are set correctly.

Source the file:

```bash
source python/.env
```

### "Bridge script failed"

Make bridge.py executable:

```bash
chmod +x python/persona/bridge.py
```

Verify Python path:

```bash
which python3
```

### Worker Not Processing Jobs

Check for errors:

```bash
persona-worker --poll-interval 2
```

Verify jobs exist:

```bash
persona jobs -s pending
```

Check Supabase connection:

```bash
persona status
```

### Jobs Stuck in Running

Find hung jobs:

```bash
persona hung
```

Kill them:

```bash
persona hung --kill
```

Or manually:

```bash
persona kill <job_id> --force
```

## Maintenance

### Clean Up Old Jobs

Jobs accumulate over time. Clean them up periodically:

```bash
# Keep last 30 days (default)
persona cleanup

# Keep only last 7 days
persona cleanup -d 7

# Dry run to see what would be deleted
persona cleanup --dry-run
```

### Database Backup

Supabase automatically backs up your database daily. To create manual backups:

1. Go to Database → Backups in Supabase dashboard
2. Click "Create backup"

Or export specific tables:

```sql
-- In Supabase SQL Editor
COPY jobs TO '/tmp/jobs_backup.csv' WITH CSV HEADER;
```

## Advanced Configuration

### Multiple Workers

Run specialized workers for different agents:

```bash
# Terminal 1: Assistant jobs only
persona-worker --agent assistant --concurrency 2

# Terminal 2: Researcher jobs only
persona-worker --agent researcher --concurrency 5

# Terminal 3: Everything else
persona-worker --concurrency 3
```

### Custom Job Types

Extend ProcessManager to add custom job types:

```python
# In persona/core/process_manager.py

def _build_command(self, job: Job) -> list[str]:
    if job.job_type == 'my_custom_task':
        prompt = f"Do custom task: {job.payload.get('task')}"
        return self._build_claude_command(job, prompt)

    # ... existing types ...
```

Then create jobs:

```bash
persona create -t my_custom_task \
  -p '{"task": "summarize latest blog posts"}' \
  -a assistant
```

### Real-time Subscriptions

Use Supabase real-time in your own scripts:

```python
from persona.monitor import JobMonitor

monitor = JobMonitor()

monitor.on('job_completed', lambda j: print(f"Done: {j['short_id']}"))
monitor.on('job_failed', lambda j: print(f"Failed: {j['short_id']}"))

await monitor.start()
```

## Next Steps

1. **Run worker continuously** - Set up systemd/launchd service
2. **Integrate with plugin** - Enable job queue in Obsidian plugin
3. **Monitor regularly** - Check `persona status` daily
4. **Set up alerts** - Use Supabase webhooks for failure notifications
5. **Clean up periodically** - Run `persona cleanup` weekly

## Support

For issues, check:
1. This guide
2. `python/README.md` for detailed API docs
3. Logs in `~/.persona/logs/`
4. Supabase logs in dashboard
5. Worker output (`persona-worker`)

## Architecture Overview

```
Daily Note ([?] markers)
    ↓
Obsidian Plugin (TypeScript)
    ↓
bridge.py (Python CLI)
    ↓
JobStore (Supabase)
    ↓
Worker (persona-worker)
    ↓
ProcessManager
    ↓
Claude/Gemini Agent
    ↓
Result saved to vault
    ↓
Job marked complete
```

The job queue provides:
- ✅ Reliability (Supabase persistence)
- ✅ Observability (Real-time logs and monitoring)
- ✅ Scalability (Multiple workers)
- ✅ Delegation (Agent-to-agent task passing)
- ✅ Recovery (Hung job detection and retry)
