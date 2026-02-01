#!/usr/bin/env python3
"""CLI tool for Persona job queue management."""

import click
import os
from pathlib import Path
from tabulate import tabulate
from datetime import datetime
from dotenv import load_dotenv

from persona.core.job_store import JobStore, JobStatus
from persona.core.process_manager import ProcessManager


# Load environment variables
load_dotenv()


@click.group()
@click.pass_context
def cli(ctx):
    """Persona - AI Agent Orchestration for Obsidian"""
    ctx.ensure_object(dict)

    try:
        ctx.obj['store'] = JobStore()
        ctx.obj['pm'] = ProcessManager(
            ctx.obj['store'],
            Path.home() / ".persona/logs"
        )
    except ValueError as e:
        click.echo(f"Error: {e}", err=True)
        click.echo("Please set SUPABASE_URL and SUPABASE_KEY environment variables", err=True)
        ctx.exit(1)


@cli.command()
@click.pass_context
def status(ctx):
    """Show current job status summary"""
    store = ctx.obj['store']

    click.echo("Job Status Summary:")
    click.echo("-" * 40)

    for status_enum in JobStatus:
        try:
            result = store.client.table("jobs").select("id", count="exact").eq(
                "status", status_enum.value
            ).execute()
            count = result.count
            click.echo(f"  {status_enum.value:12s}: {count:4d}")
        except Exception as e:
            click.echo(f"  Error counting {status_enum.value}: {e}", err=True)


@cli.command()
@click.option('--status', '-s', type=click.Choice(['pending', 'running', 'completed', 'failed', 'cancelled', 'hung']), default=None)
@click.option('--agent', '-a', help='Filter by assigned agent')
@click.option('--type', '-t', help='Filter by job type')
@click.option('--limit', '-n', default=20, help='Number of jobs to show')
@click.pass_context
def jobs(ctx, status, agent, type, limit):
    """List jobs with optional filters"""
    store = ctx.obj['store']

    query = store.client.table("job_dashboard").select("*").limit(limit)

    if status:
        query = query.eq("status", status)
    if agent:
        query = query.eq("assigned_to", agent)
    if type:
        query = query.eq("job_type", type)

    result = query.execute()

    if not result.data:
        click.echo("No jobs found")
        return

    table = []
    for j in result.data:
        duration = f"{j['duration_seconds']:.1f}s" if j['duration_seconds'] else "-"
        table.append([
            j['short_id'],
            j['job_type'][:15],
            j['status'],
            j['assigned_to'] or '-',
            j['pid'] or '-',
            duration,
            (j['task_preview'] or '')[:40]
        ])

    click.echo(tabulate(
        table,
        headers=['ID', 'Type', 'Status', 'Agent', 'PID', 'Duration', 'Task'],
        tablefmt='simple'
    ))


@cli.command()
@click.argument('job_id')
@click.option('--tail', '-t', type=int, help='Show last N lines')
@click.option('--follow', '-f', is_flag=True, help='Follow log output (like tail -f)')
@click.pass_context
def logs(ctx, job_id, tail, follow):
    """Show logs for a job"""
    store = ctx.obj['store']

    job = store.get_job(job_id)
    if not job:
        click.echo(f"Job {job_id} not found", err=True)
        return

    logs = store.get_logs(job_id, limit=tail or 100)

    if not logs:
        click.echo("No logs found")
        return

    for log in reversed(logs):
        ts = log['timestamp'][:19]
        level = log['level'].upper()
        color = {
            'DEBUG': 'blue',
            'INFO': 'green',
            'WARN': 'yellow',
            'ERROR': 'red'
        }.get(level, 'white')

        click.echo(f"[{ts}] ", nl=False)
        click.secho(f"{level:5s}", fg=color, nl=False)
        click.echo(f": {log['message']}")

    if follow:
        # TODO: Implement real-time log following via Supabase subscriptions
        click.echo("\nFollow mode not yet implemented")


@cli.command()
@click.argument('job_id')
@click.option('--force', '-f', is_flag=True, help='Force kill with SIGKILL')
@click.pass_context
def kill(ctx, job_id, force):
    """Kill a running job"""
    pm = ctx.obj['pm']
    store = ctx.obj['store']

    job = store.get_job(job_id)
    if not job:
        click.echo(f"Job {job_id} not found", err=True)
        return

    if job.status != JobStatus.RUNNING:
        click.echo(f"Job {job_id} is not running (status: {job.status.value})", err=True)
        return

    if pm.kill_job(job_id, force=force):
        sig = "SIGKILL" if force else "SIGTERM"
        click.echo(f"Killed job {job_id} with {sig}")
    else:
        click.echo(f"Could not kill job {job_id}", err=True)


@cli.command()
@click.argument('job_id')
@click.pass_context
def info(ctx, job_id):
    """Show detailed job info"""
    store = ctx.obj['store']
    pm = ctx.obj['pm']

    job = store.get_job(job_id)
    if not job:
        click.echo(f"Job {job_id} not found", err=True)
        return

    click.echo(f"Job: {job.short_id} (ID: {job.id})")
    click.echo(f"Type: {job.job_type}")
    click.echo(f"Status: {job.status.value}")
    click.echo(f"Assigned to: {job.assigned_to or 'unassigned'}")
    click.echo(f"Created: {job.created_at}")
    click.echo(f"Started: {job.started_at or '-'}")
    click.echo(f"Completed: {job.completed_at or '-'}")

    if job.parent_job_id:
        parent = store.get_job(job.parent_job_id)
        if parent:
            click.echo(f"Parent job: {parent.short_id}")
        click.echo(f"Delegated by: {job.delegated_by}")

    if job.source_file:
        click.echo(f"Source: {job.source_file}:{job.source_line or ''}")

    if job.tags:
        click.echo(f"Tags: {', '.join(job.tags)}")

    if job.status == JobStatus.RUNNING:
        proc_info = pm.get_process_info(job_id)
        if proc_info:
            click.echo(f"\nProcess:")
            click.echo(f"  PID: {proc_info['pid']}")
            click.echo(f"  Status: {proc_info['status']}")
            click.echo(f"  CPU: {proc_info.get('cpu_percent', 0):.1f}%")
            click.echo(f"  Memory: {proc_info.get('memory_mb', 0):.1f} MB")
            if proc_info.get('children'):
                click.echo(f"  Children: {proc_info['children']}")

    if job.error_message:
        click.echo(f"\n{click.style('Error:', fg='red')} {job.error_message}")

    if job.result:
        click.echo(f"\nResult: {job.result}")

    click.echo(f"\nPayload:")
    for key, value in job.payload.items():
        click.echo(f"  {key}: {value}")


@cli.command()
@click.option('--timeout', '-t', type=int, default=300, help='Heartbeat timeout in seconds')
@click.option('--kill', '-k', is_flag=True, help='Kill hung jobs')
@click.pass_context
def hung(ctx, timeout, kill):
    """Find and optionally kill hung jobs"""
    store = ctx.obj['store']
    pm = ctx.obj['pm']

    hung_jobs = store.get_hung_jobs(timeout)

    if not hung_jobs:
        click.echo("No hung jobs detected")
        return

    for job in hung_jobs:
        click.echo(f"Hung: {job.short_id} (PID: {job.pid}) - last heartbeat: {job.last_heartbeat}")

        if kill:
            if click.confirm(f"Kill {job.short_id}?"):
                if pm.kill_job(job.id):
                    click.echo(f"Killed {job.short_id}")
                else:
                    click.echo(f"Failed to kill {job.short_id}", err=True)


@cli.command()
@click.argument('job_id')
@click.pass_context
def tree(ctx, job_id):
    """Show job delegation tree"""
    store = ctx.obj['store']

    jobs = store.get_job_tree(job_id)
    if not jobs:
        click.echo(f"Job {job_id} not found", err=True)
        return

    # Build tree structure
    root = None
    children_map = {}

    for job in jobs:
        if not job.parent_job_id:
            root = job
        else:
            if job.parent_job_id not in children_map:
                children_map[job.parent_job_id] = []
            children_map[job.parent_job_id].append(job)

    def print_tree(job, indent=0):
        prefix = "  " * indent
        status_color = {
            JobStatus.COMPLETED: 'green',
            JobStatus.FAILED: 'red',
            JobStatus.RUNNING: 'yellow',
            JobStatus.PENDING: 'blue',
        }.get(job.status, 'white')

        click.echo(f"{prefix}{job.short_id} ", nl=False)
        click.secho(f"[{job.status.value}]", fg=status_color, nl=False)
        click.echo(f" {job.job_type} ({job.assigned_to or 'unassigned'})")

        for child in children_map.get(job.id, []):
            print_tree(child, indent + 1)

    if root:
        print_tree(root)


@cli.command()
@click.option('--days', '-d', type=int, default=30, help='Keep jobs from last N days')
@click.option('--dry-run', is_flag=True, help='Show what would be deleted')
@click.pass_context
def cleanup(ctx, days, dry_run):
    """Clean up old completed jobs"""
    store = ctx.obj['store']

    if dry_run:
        # Count jobs that would be deleted
        result = store.client.table("jobs").select("id", count="exact").in_(
            "status", ["completed", "cancelled"]
        ).lt("created_at", f"now() - interval '{days} days'").execute()

        click.echo(f"Would delete {result.count} old jobs")
    else:
        result = store.client.rpc("cleanup_old_jobs", {"days_to_keep": days}).execute()
        deleted = result.data if result.data else 0
        click.echo(f"Deleted {deleted} old jobs")


@cli.command()
@click.option('--type', '-t', required=True, help='Job type')
@click.option('--agent', '-a', help='Assign to agent')
@click.option('--question', '-q', help='Research question')
@click.option('--prompt', '-p', help='Custom prompt')
@click.option('--file', '-f', type=click.Path(exists=True), help='Source file')
@click.pass_context
def create(ctx, type, agent, question, prompt, file):
    """Create a new job"""
    store = ctx.obj['store']

    payload = {}
    if question:
        payload['question'] = question
    if prompt:
        payload['prompt'] = prompt

    job = store.create_job(
        job_type=type,
        payload=payload,
        assigned_to=agent,
        source_file=file
    )

    click.echo(f"Created job: {job.short_id}")
    click.echo(f"Type: {job.job_type}")
    click.echo(f"Status: {job.status.value}")
    if agent:
        click.echo(f"Assigned to: {agent}")


@cli.command()
@click.pass_context
def agents(ctx):
    """List available agents"""
    store = ctx.obj['store']

    result = store.client.table("agents").select("*").eq("is_active", True).execute()

    if not result.data:
        click.echo("No agents found")
        return

    table = []
    for agent in result.data:
        capabilities = ', '.join(agent.get('capabilities', []))
        table.append([
            agent['id'],
            agent['display_name'],
            capabilities[:40],
            agent.get('description', '')[:40]
        ])

    click.echo(tabulate(
        table,
        headers=['ID', 'Name', 'Capabilities', 'Description'],
        tablefmt='simple'
    ))


if __name__ == '__main__':
    cli()
