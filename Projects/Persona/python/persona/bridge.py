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


def create_job(data: dict) -> dict:
    """
    Create a new job.

    Args:
        data: Job data from TypeScript

    Returns:
        Created job info
    """
    store = JobStore()

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
    store = JobStore()
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
    store = JobStore()
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
    store = JobStore()
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
    store = JobStore()

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
    store = JobStore()
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
    store = JobStore()

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
    store = JobStore()
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


def get_local_logs(business: str, agent: str, date: str) -> dict:
    """
    Read logs from local log file.

    Args:
        business: Business/instance name
        agent: Agent name
        date: Date string (YYYY-MM-DD)

    Returns:
        Logs from local file
    """
    persona_root = os.environ.get('PERSONA_ROOT', os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    log_path = Path(persona_root) / 'instances' / business / 'logs' / 'agents' / f'{agent}-{date}.log'

    if not log_path.exists():
        return {'logs': [], 'source': 'local', 'path': str(log_path), 'exists': False}

    logs = []
    try:
        with open(log_path, 'r') as f:
            # Read last 100 lines
            lines = f.readlines()[-100:]
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                # Parse: [YYYY-MM-DD HH:MM:SS] message
                match = re.match(r'\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (.+)', line)
                if match:
                    logs.append({
                        'timestamp': match.group(1),
                        'level': 'info',
                        'message': match.group(2),
                        'metadata': {}
                    })
                else:
                    # Log line without timestamp
                    logs.append({
                        'timestamp': '',
                        'level': 'info',
                        'message': line,
                        'metadata': {}
                    })
    except Exception as e:
        return {'logs': [], 'source': 'local', 'error': str(e)}

    return {'logs': logs, 'source': 'local', 'exists': True}


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
    store = JobStore()
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
    store = JobStore()

    summary = {}
    for status in JobStatus:
        result = store.client.table("jobs").select("id", count="exact").eq(
            "status", status.value
        ).execute()
        summary[status.value] = result.count

    return summary


def update_job_status(job_id: str, data: dict) -> dict:
    """
    Update job status.

    Args:
        job_id: Job ID or short ID
        data: Status data with 'status' and optional 'error'

    Returns:
        Success status
    """
    store = JobStore()

    status = data.get('status')
    error = data.get('error')

    job = store.get_job(job_id)
    if not job:
        return {'error': 'Job not found'}

    if status == 'running':
        store.start_job(job_id, pid=os.getpid())
    elif status == 'completed':
        store.complete_job(job_id)
    elif status == 'failed':
        store.fail_job(job_id, error or 'Unknown error')
    elif status == 'cancelled':
        # Directly update status to cancelled
        store.client.table("jobs").update({
            "status": "cancelled",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("short_id", job_id).execute()

    return {'success': True, 'status': status}


def heartbeat(job_id: str) -> dict:
    """
    Update heartbeat timestamp for a running job.

    Args:
        job_id: Job ID or short ID

    Returns:
        Success status
    """
    store = JobStore()

    try:
        store.heartbeat(job_id)
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def get_agent_daily_performance(agent: str = None, days: int = 7) -> dict:
    """
    Get daily performance metrics for agents.

    Args:
        agent: Optional agent filter
        days: Number of days to look back (default 7)

    Returns:
        Daily performance metrics per agent
    """
    store = JobStore()

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
                print(json.dumps({'error': 'Usage: get_local_logs <business> <agent> <date>'}))
                sys.exit(1)
            business = sys.argv[2]
            agent = sys.argv[3]
            date = sys.argv[4]
            result = get_local_logs(business, agent, date)
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

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
