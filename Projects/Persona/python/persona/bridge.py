#!/usr/bin/env python3
"""Bridge script for TypeScript plugin to interact with job queue."""

import sys
import json
import os
from pathlib import Path
from dotenv import load_dotenv

from persona.core.job_store import JobStore, JobStatus

load_dotenv()


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
                'assignedTo': job.assigned_to,
                'pid': job.pid,
                'startedAt': job.started_at
            }
            for job in jobs
        ]
    }


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

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
