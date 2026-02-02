#!/usr/bin/env python3
"""Bridge script for TypeScript plugin to interact with job queue."""

import sys
import json
import os
import re
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Try to load dotenv, but don't fail if unavailable
# Environment may already be set by parent process (e.g., Obsidian plugin)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # Assume environment is pre-configured

from persona.core.job_store import JobStore, JobStatus


# Singleton JobStore instance to avoid creating new connections per call
# This reduces connection overhead and helps avoid rate limits
_store_instance: JobStore = None


def get_store() -> JobStore:
    """
    Get or create the singleton JobStore instance.

    Returns:
        Shared JobStore instance
    """
    global _store_instance
    if _store_instance is None:
        _store_instance = JobStore()
    return _store_instance


def reset_store() -> None:
    """
    Reset the singleton store instance.

    Primarily used for testing to ensure clean state between tests.
    """
    global _store_instance
    _store_instance = None


def create_job(data: dict) -> dict:
    """
    Create a new job.

    Args:
        data: Job data from TypeScript

    Returns:
        Created job info
    """
    store = get_store()

    job = store.create_job(
        job_type=data.get('type', 'unknown'),
        payload=data.get('payload', {}),
        assigned_to=data.get('agent'),
        source_file=data.get('sourceFile'),
        source_line=data.get('sourceLine'),
        tags=data.get('tags', [])
    )

    return {
        'id': job.id,
        'shortId': job.short_id,
        'type': job.job_type,
        'status': job.status.value,
        'assignedTo': job.assigned_to
    }


def get_job_status(job_id: str) -> dict:
    """
    Get job status.

    Args:
        job_id: Job ID or short ID

    Returns:
        Job status info
    """
    store = get_store()
    job = store.get_job(job_id)

    if not job:
        return {'error': 'Job not found'}

    return {
        'id': job.id,
        'shortId': job.short_id,
        'type': job.job_type,
        'status': job.status.value,
        'assignedTo': job.assigned_to,
        'createdAt': job.created_at,
        'startedAt': job.started_at,
        'completedAt': job.completed_at,
        'error': job.error_message,
        'result': job.result,
        'pid': job.pid
    }


def get_pending_jobs(agent: str = None) -> dict:
    """
    Get pending jobs.

    Args:
        agent: Optional agent filter

    Returns:
        List of pending jobs
    """
    store = get_store()
    jobs = store.get_pending_jobs(assigned_to=agent, limit=50)

    return {
        'jobs': [
            {
                'id': job.id,
                'shortId': job.short_id,
                'type': job.job_type,
                'status': job.status.value,
                'assignedTo': job.assigned_to,
                'createdAt': job.created_at
            }
            for job in jobs
        ]
    }


def get_running_jobs(agent: str = None) -> dict:
    """
    Get running jobs.

    Args:
        agent: Optional agent filter

    Returns:
        List of running jobs
    """
    store = get_store()
    jobs = store.get_running_jobs(assigned_to=agent)

    return {
        'jobs': [
            {
                'id': job.id,
                'shortId': job.short_id,
                'type': job.job_type,
                'status': job.status.value,
                'assignedTo': job.assigned_to,
                'pid': job.pid,
                'startedAt': job.started_at
            }
            for job in jobs
        ]
    }


def get_completed_jobs(limit: int = 20) -> dict:
    """
    Get recently completed jobs (completed or failed).

    Args:
        limit: Max number of jobs to return

    Returns:
        List of completed jobs
    """
    store = get_store()

    # Get completed and failed jobs, ordered by completion time desc
    result = store.client.table("jobs").select("*").in_(
        "status", ["completed", "failed"]
    ).order("completed_at", desc=True).limit(limit).execute()

    jobs = []
    for row in result.data:
        jobs.append({
            'id': row['id'],
            'shortId': row['short_id'],
            'type': row['job_type'],
            'status': row['status'],
            'assignedTo': row.get('assigned_to'),
            'pid': row.get('pid'),
            'createdAt': row.get('created_at'),
            'startedAt': row.get('started_at'),
            'completedAt': row.get('completed_at'),
            'error': row.get('error_message'),
            'exitCode': row.get('exit_code')
        })

    return {'jobs': jobs}


def get_hung_jobs(threshold_minutes: int = 5) -> dict:
    """
    Get jobs that have been running longer than threshold.

    Args:
        threshold_minutes: Minutes after which a job is considered hung

    Returns:
        List of hung jobs
    """
    store = get_store()
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=threshold_minutes)

    result = store.client.table("jobs").select("*").eq(
        "status", "running"
    ).lt("started_at", cutoff.isoformat()).execute()

    jobs = []
    for row in result.data:
        jobs.append({
            'id': row['id'],
            'shortId': row['short_id'],
            'type': row['job_type'],
            'status': row['status'],
            'assignedTo': row.get('assigned_to'),
            'pid': row.get('pid'),
            'createdAt': row.get('created_at'),
            'startedAt': row.get('started_at')
        })

    return {'jobs': jobs}


def get_failed_jobs(limit: int = 20) -> dict:
    """
    Get recently failed jobs only.

    Args:
        limit: Max number of jobs to return

    Returns:
        List of failed jobs
    """
    store = get_store()

    result = store.client.table("jobs").select("*").eq(
        "status", "failed"
    ).order("completed_at", desc=True).limit(limit).execute()

    jobs = []
    for row in result.data:
        jobs.append({
            'id': row['id'],
            'shortId': row['short_id'],
            'type': row['job_type'],
            'status': row['status'],
            'assignedTo': row.get('assigned_to'),
            'pid': row.get('pid'),
            'createdAt': row.get('created_at'),
            'startedAt': row.get('started_at'),
            'completedAt': row.get('completed_at'),
            'error': row.get('error_message'),
            'exitCode': row.get('exit_code')
        })

    return {'jobs': jobs}


def get_job_logs(job_id: str, limit: int = 50) -> dict:
    """
    Get job logs.

    Args:
        job_id: Job ID or short ID
        limit: Max number of logs

    Returns:
        Job logs
    """
    store = get_store()
    logs = store.get_logs(job_id, limit=limit)

    return {
        'logs': [
            {
                'timestamp': log['timestamp'],
                'level': log['level'],
                'message': log['message'],
                'metadata': log.get('metadata', {})
            }
            for log in logs
        ]
    }


def get_local_logs(business: str, agent: str, date: str, job_short_id: str = None) -> dict:
    """
    Read logs from local log files.

    Searches both:
    1. Agent-date log: instances/{business}/logs/agents/{agent}-{date}.log
    2. Job-specific log: instances/{business}/logs/{shortId}.log (if job_short_id provided)

    Args:
        business: Business/instance name
        agent: Agent name
        date: Date string (YYYY-MM-DD)
        job_short_id: Optional job short ID to search job-specific logs

    Returns:
        Logs from local file(s)
    """
    persona_root = os.environ.get('PERSONA_ROOT', os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    base_path = Path(persona_root) / 'instances' / business / 'logs'

    logs = []
    found_files = []

    def parse_log_file(file_path: Path, default_level: str = 'info') -> list:
        """Parse a log file and return structured log entries."""
        entries = []
        if not file_path.exists():
            return entries

        found_files.append(str(file_path))
        try:
            with open(file_path, 'r') as f:
                # Read last 100 lines
                lines = f.readlines()[-100:]
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    # Parse: [YYYY-MM-DD HH:MM:SS] message
                    match = re.match(r'\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (.+)', line)
                    if match:
                        entries.append({
                            'timestamp': match.group(1),
                            'level': default_level,
                            'message': match.group(2),
                            'metadata': {'source': str(file_path)}
                        })
                    else:
                        # Log line without timestamp
                        entries.append({
                            'timestamp': '',
                            'level': default_level,
                            'message': line,
                            'metadata': {'source': str(file_path)}
                        })
        except Exception as e:
            entries.append({
                'timestamp': '',
                'level': 'error',
                'message': f'Error reading {file_path}: {e}',
                'metadata': {}
            })
        return entries

    # Path 1: Job-specific log (preferred, more precise)
    if job_short_id:
        job_log_path = base_path / f'{job_short_id}.log'
        logs.extend(parse_log_file(job_log_path))

        # Also check for error log
        job_error_path = base_path / f'{job_short_id}.error.log'
        logs.extend(parse_log_file(job_error_path, 'error'))

    # Path 2: Agent-date log (legacy format)
    agent_log_path = base_path / 'agents' / f'{agent}-{date}.log'
    logs.extend(parse_log_file(agent_log_path))

    # Sort by timestamp (entries with empty timestamp go last)
    logs.sort(key=lambda x: (x['timestamp'] == '', x['timestamp']))

    return {
        'logs': logs,
        'source': 'local',
        'exists': len(found_files) > 0,
        'files_searched': found_files
    }


def log_job_event(job_id: str, level: str, message: str, metadata: dict = None) -> dict:
    """
    Log an event for a job to Supabase.

    Args:
        job_id: Job ID or short ID
        level: Log level (info, warning, error)
        message: Log message
        metadata: Optional metadata dict

    Returns:
        Success status
    """
    store = get_store()
    try:
        store.log(job_id, message, level=level, metadata=metadata or {})
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def get_job_summary() -> dict:
    """
    Get summary of all jobs by status.

    Returns:
        Job counts by status
    """
    store = get_store()

    summary = {}
    for status in JobStatus:
        result = store.client.table("jobs").select("id", count="exact").eq(
            "status", status.value
        ).execute()
        summary[status.value] = result.count

    return summary


def update_job_status(job_id: str, data: dict) -> dict:
    """
    Update job status with idempotency guards.

    This function is called by both TypeScript (ExecutionService) and bash (run-agent.sh)
    as a belt-and-suspenders approach. First one to succeed wins, subsequent updates
    are idempotent:
    - pending → running: Normal start (allowed)
    - running → running: No-op, already running (allowed, returns success)
    - running → completed/failed: Normal finish (allowed)
    - completed/failed → anything: Job finished, reject update (returns error)

    Args:
        job_id: Job ID or short ID
        data: Status data with 'status' and optional 'error'

    Returns:
        Success status or error if transition is invalid
    """
    store = get_store()

    new_status = data.get('status')
    error = data.get('error')

    job = store.get_job(job_id)
    if not job:
        return {'error': 'Job not found'}

    current_status = job.status

    # Idempotency check: if job is already in terminal state, reject updates
    terminal_states = ['completed', 'failed', 'cancelled']
    if current_status in terminal_states:
        # Job already finished - this is a late/duplicate update, ignore it
        return {
            'success': False,
            'error': f'Job already in terminal state: {current_status}',
            'idempotent': True  # Signal this is expected, not a real error
        }

    # Idempotency check: running → running is a no-op (both sides may try)
    if current_status == 'running' and new_status == 'running':
        return {
            'success': True,
            'status': new_status,
            'idempotent': True,
            'message': 'Job already running (no-op)'
        }

    # Apply the status transition
    if new_status == 'running':
        store.start_job(job_id, pid=os.getpid())
    elif new_status == 'completed':
        store.complete_job(job_id)
    elif new_status == 'failed':
        store.fail_job(job_id, error or 'Unknown error')
    elif new_status == 'cancelled':
        # Directly update status to cancelled
        store.client.table("jobs").update({
            "status": "cancelled",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("short_id", job_id).execute()

    return {'success': True, 'status': new_status}


def heartbeat(job_id: str) -> dict:
    """
    Update heartbeat timestamp for a running job.

    Args:
        job_id: Job ID or short ID

    Returns:
        Success status
    """
    store = get_store()

    try:
        store.heartbeat(job_id)
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def cancel_pending_jobs(reason: str = "Batch cancelled - stuck in pending") -> dict:
    """
    Cancel all pending jobs.

    Args:
        reason: Reason for cancellation

    Returns:
        Number of jobs cancelled
    """
    store = get_store()
    count = store.cancel_all_pending(reason)
    return {'cancelled': count, 'reason': reason}


def log_batch(job_id: str, messages: list, level: str = "info") -> dict:
    """
    Log multiple messages at once for a job (streaming logs).

    Args:
        job_id: Job ID or short ID
        messages: List of message strings
        level: Log level (info, warning, error)

    Returns:
        Success status
    """
    store = get_store()
    try:
        store.log_batch(job_id, messages, level)
        return {'success': True, 'count': len(messages)}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def publish_event(event_type: str, job_id: str, data: dict, source: str = "python") -> dict:
    """
    Publish an event to the job_events queue and log to events table.

    This is the primary way to emit job lifecycle events. Events are:
    1. Sent to pgmq queue (guaranteed delivery)
    2. Logged to events table (observability/audit trail)
    3. Job status is updated (triggers Realtime for UI)

    Event Types:
        - job.created: New job added to queue
        - job.started: Agent execution began
        - job.heartbeat: Periodic liveness signal
        - job.progress: Task progress update
        - job.completed: Agent finished successfully
        - job.failed: Agent failed with error
        - job.timeout: Agent exceeded time limit
        - job.cancelled: User cancelled job

    Args:
        event_type: Type of event (e.g., 'job.started', 'job.completed')
        job_id: Job ID or short ID
        data: Event-specific data (pid, error, output_size, etc.)
        source: Event source ('typescript', 'python', 'bash', 'claude')

    Returns:
        Success status with event details
    """
    store = get_store()
    trace_id = os.environ.get("PERSONA_EXEC_ID", "")

    try:
        # Call the database function to publish the event
        result = store.client.rpc('publish_event', {
            'p_type': event_type,
            'p_job_id': job_id,
            'p_source': source,
            'p_trace_id': trace_id,
            'p_data': data
        }).execute()

        # Also update the jobs table based on event type (triggers Realtime)
        if event_type == 'job.started':
            pid = data.get('pid', os.getpid())
            store.start_job(job_id, pid=pid)
        elif event_type == 'job.completed':
            store.complete_job(job_id, result=data.get('result'))
        elif event_type == 'job.failed':
            store.fail_job(job_id, error=data.get('error', 'Unknown error'))
        elif event_type == 'job.cancelled':
            store.client.table("jobs").update({
                "status": "cancelled",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }).eq("short_id", job_id).execute()

        return {
            'success': True,
            'event_type': event_type,
            'job_id': job_id,
            'source': source,
            'trace_id': trace_id,
            'db_result': result.data
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'event_type': event_type,
            'job_id': job_id
        }


def read_events(qty: int = 10, visibility_timeout: int = 30) -> dict:
    """
    Read events from the job_events queue.

    Events are made invisible for the visibility_timeout period.
    If not deleted within that time, they become visible again.

    Args:
        qty: Maximum number of events to read
        visibility_timeout: Seconds to hide events from other consumers

    Returns:
        List of events from the queue
    """
    store = get_store()

    try:
        result = store.client.rpc('read_events', {
            'p_qty': qty,
            'p_visibility_timeout': visibility_timeout
        }).execute()

        return {
            'success': True,
            'events': result.data,
            'count': len(result.data)
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'events': []
        }


def delete_event(msg_id: int) -> dict:
    """
    Delete a processed event from the queue.

    Call this after successfully processing an event to remove it permanently.

    Args:
        msg_id: Message ID from read_events result

    Returns:
        Success status
    """
    store = get_store()

    try:
        result = store.client.rpc('delete_event', {
            'p_msg_id': msg_id
        }).execute()

        return {
            'success': True,
            'deleted': result.data
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def get_events(job_id: str = None, event_type: str = None, limit: int = 50) -> dict:
    """
    Query events from the events audit table.

    Args:
        job_id: Optional job ID filter
        event_type: Optional event type filter
        limit: Maximum events to return

    Returns:
        List of events matching the filter
    """
    store = get_store()

    try:
        query = store.client.table("events").select("*").order("timestamp", desc=True).limit(limit)

        if job_id:
            query = query.eq("job_id", job_id)
        if event_type:
            query = query.eq("type", event_type)

        result = query.execute()

        return {
            'success': True,
            'events': result.data,
            'count': len(result.data)
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'events': []
        }


def get_agent_daily_performance(agent: str = None, days: int = 7) -> dict:
    """
    Get daily performance metrics for agents.

    Args:
        agent: Optional agent filter
        days: Number of days to look back (default 7)

    Returns:
        Daily performance metrics per agent
    """
    store = get_store()

    # Query jobs with both started_at and completed_at
    query = store.client.table("jobs").select(
        "assigned_to, started_at, completed_at, status"
    ).not_.is_("completed_at", "null").not_.is_("started_at", "null")

    if agent:
        query = query.eq("assigned_to", agent)

    # Filter to last N days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = query.gte("completed_at", cutoff).execute()

    # Aggregate by day and agent
    daily_stats = {}
    for row in result.data:
        date = row['completed_at'][:10]  # YYYY-MM-DD
        agent_name = row['assigned_to'] or 'unassigned'
        key = f"{date}:{agent_name}"

        if key not in daily_stats:
            daily_stats[key] = {
                'date': date,
                'agent': agent_name,
                'total': 0,
                'successful': 0,
                'failed': 0,
                'durations': []
            }

        daily_stats[key]['total'] += 1
        if row['status'] == 'completed':
            daily_stats[key]['successful'] += 1
        else:
            daily_stats[key]['failed'] += 1

        # Calculate duration
        try:
            started = datetime.fromisoformat(row['started_at'].replace('Z', '+00:00'))
            completed = datetime.fromisoformat(row['completed_at'].replace('Z', '+00:00'))
            duration = (completed - started).total_seconds()
            daily_stats[key]['durations'].append(duration)
        except (ValueError, TypeError):
            pass  # Skip if timestamps can't be parsed

    # Calculate averages
    metrics = []
    for key, stats in daily_stats.items():
        durations = stats['durations']
        metrics.append({
            'date': stats['date'],
            'agent': stats['agent'],
            'jobsCompleted': stats['total'],
            'successful': stats['successful'],
            'failed': stats['failed'],
            'avgDurationSeconds': sum(durations) / len(durations) if durations else 0,
            'minDurationSeconds': min(durations) if durations else 0,
            'maxDurationSeconds': max(durations) if durations else 0
        })

    return {'metrics': sorted(metrics, key=lambda x: (x['date'], x['agent']), reverse=True)}


def main():
    """
    Bridge script entry point.

    Usage:
        python bridge.py create_job '{"type": "research", "payload": {...}}'
        python bridge.py get_job_status <job_id>
        python bridge.py get_pending_jobs [agent]
        python bridge.py get_running_jobs [agent]
        python bridge.py get_job_logs <job_id> [limit]
        python bridge.py get_job_summary
    """
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command provided'}))
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == 'create_job':
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'No job data provided'}))
                sys.exit(1)

            data = json.loads(sys.argv[2])
            result = create_job(data)
            print(json.dumps(result))

        elif command == 'get_job_status':
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'No job ID provided'}))
                sys.exit(1)

            job_id = sys.argv[2]
            result = get_job_status(job_id)
            print(json.dumps(result))

        elif command == 'get_pending_jobs':
            agent = sys.argv[2] if len(sys.argv) > 2 else None
            result = get_pending_jobs(agent)
            print(json.dumps(result))

        elif command == 'get_running_jobs':
            agent = sys.argv[2] if len(sys.argv) > 2 else None
            result = get_running_jobs(agent)
            print(json.dumps(result))

        elif command == 'get_job_logs':
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'No job ID provided'}))
                sys.exit(1)

            job_id = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
            result = get_job_logs(job_id, limit)
            print(json.dumps(result))

        elif command == 'get_job_summary':
            result = get_job_summary()
            print(json.dumps(result))

        elif command == 'get_completed_jobs':
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20
            result = get_completed_jobs(limit)
            print(json.dumps(result))

        elif command == 'get_hung_jobs':
            threshold = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            result = get_hung_jobs(threshold)
            print(json.dumps(result))

        elif command == 'get_failed_jobs':
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20
            result = get_failed_jobs(limit)
            print(json.dumps(result))

        elif command == 'get_local_logs':
            if len(sys.argv) < 5:
                print(json.dumps({'error': 'Usage: get_local_logs <business> <agent> <date> [job_short_id]'}))
                sys.exit(1)
            business = sys.argv[2]
            agent = sys.argv[3]
            date = sys.argv[4]
            job_short_id = sys.argv[5] if len(sys.argv) > 5 else None
            result = get_local_logs(business, agent, date, job_short_id)
            print(json.dumps(result))

        elif command == 'log_job_event':
            if len(sys.argv) < 5:
                print(json.dumps({'error': 'Usage: log_job_event <job_id> <level> <message> [metadata_json]'}))
                sys.exit(1)
            job_id = sys.argv[2]
            level = sys.argv[3]
            message = sys.argv[4]
            metadata = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
            result = log_job_event(job_id, level, message, metadata)
            print(json.dumps(result))

        elif command == 'update_job_status':
            if len(sys.argv) < 4:
                print(json.dumps({'error': 'Job ID and data required'}))
                sys.exit(1)

            job_id = sys.argv[2]
            data = json.loads(sys.argv[3])
            result = update_job_status(job_id, data)
            print(json.dumps(result))

        elif command == 'get_agent_daily_performance':
            agent = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else None
            days = int(sys.argv[3]) if len(sys.argv) > 3 else 7
            result = get_agent_daily_performance(agent, days)
            print(json.dumps(result))

        elif command == 'heartbeat':
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'No job ID provided'}))
                sys.exit(1)

            job_id = sys.argv[2]
            result = heartbeat(job_id)
            print(json.dumps(result))

        elif command == 'cancel_pending_jobs':
            reason = sys.argv[2] if len(sys.argv) > 2 else "Batch cancelled - stuck in pending"
            result = cancel_pending_jobs(reason)
            print(json.dumps(result))

        elif command == 'log_batch':
            if len(sys.argv) < 4:
                print(json.dumps({'error': 'Usage: log_batch <job_id> <messages_json> [level]'}))
                sys.exit(1)
            job_id = sys.argv[2]
            messages = json.loads(sys.argv[3])
            level = sys.argv[4] if len(sys.argv) > 4 else "info"
            result = log_batch(job_id, messages, level)
            print(json.dumps(result))

        elif command == 'publish_event':
            if len(sys.argv) < 4:
                print(json.dumps({'error': 'Usage: publish_event <event_type> <job_id> <data_json> [source]'}))
                sys.exit(1)
            event_type = sys.argv[2]
            job_id = sys.argv[3]
            data = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
            source = sys.argv[5] if len(sys.argv) > 5 else "python"
            result = publish_event(event_type, job_id, data, source)
            print(json.dumps(result))

        elif command == 'read_events':
            qty = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            visibility_timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 30
            result = read_events(qty, visibility_timeout)
            print(json.dumps(result))

        elif command == 'delete_event':
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'Usage: delete_event <msg_id>'}))
                sys.exit(1)
            msg_id = int(sys.argv[2])
            result = delete_event(msg_id)
            print(json.dumps(result))

        elif command == 'get_events':
            job_id = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else None
            event_type = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != '-' else None
            limit = int(sys.argv[4]) if len(sys.argv) > 4 else 50
            result = get_events(job_id, event_type, limit)
            print(json.dumps(result))

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
