# Job Queue User Guide

## Overview

The Job Queue is a persistent tracking system for agent executions. It uses Supabase to store job records, enabling visibility into job status, logs, and performance metrics across sessions.

## Accessing the Job Queue

Open the Job Queue modal from Obsidian:
- **Command Palette**: `Persona: Open Job Queue`
- **Ribbon Icon**: Click the activity icon in the left ribbon

## Job Lifecycle

Jobs progress through these statuses:

```
┌─────────┐     ┌─────────┐     ┌───────────┐
│ Pending │ ──► │ Running │ ──► │ Completed │
└─────────┘     └─────────┘     └───────────┘
                     │               ▲
                     │               │
                     ▼               │
                ┌─────────┐     ┌────┴────┐
                │ Failed  │     │Cancelled│
                └─────────┘     └─────────┘
```

| Status | Description |
|--------|-------------|
| **Pending** | Job created, waiting to start |
| **Running** | Agent is actively processing |
| **Completed** | Job finished successfully |
| **Failed** | Job encountered an error |
| **Cancelled** | Job was manually cancelled |
| **Hung** | Running longer than threshold (default: 5 min) |

## Job Queue Modal

### Summary Cards

The top of the modal shows clickable stat cards:

| Card | Description |
|------|-------------|
| **Pending** | Jobs waiting to start |
| **Running** | Currently executing jobs |
| **Completed** | Successfully finished jobs |
| **Failed** | Jobs that encountered errors |
| **Hung** | Jobs running longer than expected |

Click any card to filter the job list to that status.

### Job Cards

Each job displays:

- **Job ID** (e.g., `b32e4dab`) - Click the clipboard icon to copy
- **Type** - Job type (e.g., `agent_action`, `research`)
- **Status Badge** - Current status with icon
- **Agent** - Assigned agent name
- **Timestamps** - Created, started, completed times

### Actions

| Button | Description |
|--------|-------------|
| **Logs** | View job execution logs |
| **✓** (checkmark) | Manually mark as completed |
| **✗** (X) | Cancel/kill the job |

The checkmark and X icons appear for pending and running jobs.

### Auto-Refresh

- The modal auto-refreshes every 5 seconds when "Live" is shown
- Click **Pause** to stop auto-refresh
- Click **Resume** to restart it
- Use the refresh icon for manual refresh

## Job Logs

Click **Logs** on any job to view execution logs:

1. **Database logs** - Stored in Supabase `job_logs` table
2. **Local fallback** - If database logs are empty, reads from:
   ```
   instances/{business}/logs/agents/{agent}-{date}.log
   ```

Log entries show:
- Timestamp
- Log level (INFO, WARNING, ERROR)
- Message content

## Job Types

| Type | Created By | Description |
|------|------------|-------------|
| `agent_action` | Agent runner | Standard agent execution |
| `research` | `[?]` markers | Research question processing |
| `meeting_extract` | Meeting parser | Meeting data extraction |

## Timestamps and Duration

Each job tracks:

| Field | Description |
|-------|-------------|
| `created_at` | When job was added to queue |
| `started_at` | When agent began processing |
| `completed_at` | When job finished (success or failure) |

Duration is calculated as `completed_at - started_at`.

## Performance Metrics

The system tracks daily performance metrics per agent:

- Jobs completed (successful/failed)
- Average duration (seconds)
- Min/max duration

Access via bridge command:
```bash
python bridge.py get_agent_daily_performance [agent] [days]
```

## Manual Cleanup

For stuck pending jobs (e.g., from failed status updates):

1. Open Job Queue modal
2. Click **Pending** card to filter
3. For each stuck job:
   - Click **✓** to mark as completed, OR
   - Click **✗** to cancel

## Error Handling

### Retry Logic

Status updates use exponential backoff retry:
- Attempt 1: immediate
- Attempt 2: after 1 second
- Attempt 3: after 2 seconds
- Attempt 4: after 4 seconds

### User Notifications

If all retries fail:
- A notice appears: "Warning: Failed to update job {id} status after 3 retries"
- Error is logged to `instances/{business}/logs/system.log`

## Configuration

Settings are configured in the plugin settings tab:

| Setting | Description | Default |
|---------|-------------|---------|
| `supabaseUrl` | Supabase project URL | Required |
| `supabaseKey` | Supabase service key | Required |
| `hungThresholdMinutes` | Minutes before job is "hung" | 5 |

## Troubleshooting

### Jobs stay pending forever

**Cause**: Status update failed silently (fixed in recent updates)

**Fix**:
1. Manually mark jobs as completed using the ✓ icon
2. Future jobs will retry status updates automatically

### No logs appearing

**Check**:
1. Agent is writing to log file
2. Log path matches expected pattern: `logs/agents/{agent}-{date}.log`
3. Supabase connection is working

### Job Queue modal shows errors

**Check**:
1. Supabase URL and key are configured in settings
2. Network connection to Supabase is working
3. Python bridge script is accessible

## Related Documentation

- [Task Queue PRD](../planning/prds/completed/task-queue-system/prd.md) - Technical specification
- [Provider Guide](provider-guide.md) - Agent provider configuration
