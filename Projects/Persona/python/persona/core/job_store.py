"""Job store for managing jobs in Supabase."""

import os
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
from supabase import create_client, Client


class JobStatus(Enum):
    """Job execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    HUNG = "hung"


class UpdateConflictError(Exception):
    """Raised when an optimistic locking conflict occurs during update."""
    pass


@dataclass
class Job:
    """Job representation."""
    id: str
    short_id: str
    job_type: str
    payload: dict
    status: JobStatus
    pid: Optional[int] = None
    hostname: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_heartbeat: Optional[str] = None
    exit_code: Optional[int] = None
    error_message: Optional[str] = None
    result: Optional[dict] = None
    parent_job_id: Optional[str] = None
    delegated_by: Optional[str] = None
    assigned_to: Optional[str] = None
    source_file: Optional[str] = None
    source_line: Optional[int] = None
    tags: list[str] = field(default_factory=list)


class JobStore:
    """
    Manages jobs in Supabase with full observability.

    Provides methods for creating, updating, querying, and managing
    the lifecycle of jobs in the Persona agent system.
    """

    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """
        Initialize JobStore.

        Args:
            supabase_url: Supabase project URL (defaults to SUPABASE_URL env var)
            supabase_key: Supabase service role key (defaults to SUPABASE_KEY env var)
        """
        url = supabase_url or os.environ.get("SUPABASE_URL")
        key = supabase_key or os.environ.get("SUPABASE_KEY")

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")

        self.client: Client = create_client(url, key)
        self.hostname = os.uname().nodename

    def create_job(
        self,
        job_type: str,
        payload: dict,
        assigned_to: str = None,
        parent_id: str = None,
        delegated_by: str = None,
        source_file: str = None,
        source_line: int = None,
        tags: list[str] = None
    ) -> Job:
        """
        Create a new job in the queue.

        Args:
            job_type: Type of job (e.g., 'research', 'meeting_extract', 'delegate')
            payload: Job-specific data (questions, context, etc.)
            assigned_to: Agent ID to assign this job to
            parent_id: Parent job ID if this is a delegated subtask
            delegated_by: Agent that created this job
            source_file: Source file that triggered this job
            source_line: Line number in source file
            tags: Tags for categorization

        Returns:
            Created Job object
        """
        data = {
            "job_type": job_type,
            "payload": payload,
            "status": JobStatus.PENDING.value,
            "hostname": self.hostname,
            "assigned_to": assigned_to,
            "parent_job_id": parent_id,
            "delegated_by": delegated_by,
            "source_file": source_file,
            "source_line": source_line,
            "tags": tags or []
        }

        result = self.client.table("jobs").insert(data).execute()
        return self._row_to_job(result.data[0])

    def get_job(self, job_id: str) -> Optional[Job]:
        """
        Get a job by ID or short_id.

        Args:
            job_id: Full UUID or 8-character short ID

        Returns:
            Job object if found, None otherwise
        """
        # Determine if this is a UUID (36 chars with dashes) or short_id (8 chars)
        # UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        is_uuid = len(job_id) == 36 and job_id.count('-') == 4

        if is_uuid:
            result = self.client.table("jobs").select("*").eq("id", job_id).execute()
        else:
            result = self.client.table("jobs").select("*").eq("short_id", job_id).execute()

        if result.data:
            return self._row_to_job(result.data[0])
        return None

    def update_job(self, job_id: str, max_retries: int = 3, **updates) -> Job:
        """
        Update job fields with optimistic locking to prevent TOCTOU races.

        Uses updated_at field for optimistic concurrency control. If another
        process updates the job between our read and write, we'll detect it
        and retry with fresh data.

        Args:
            job_id: Job ID (full UUID or short ID)
            max_retries: Maximum number of retry attempts on conflict
            **updates: Fields to update

        Returns:
            Updated Job object

        Raises:
            ValueError: If job not found
            UpdateConflictError: If update conflicts persist after retries
        """
        # Convert enums to values
        if 'status' in updates and isinstance(updates['status'], JobStatus):
            updates['status'] = updates['status'].value

        for attempt in range(max_retries):
            # Get the current job state
            job = self.get_job(job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")

            # Always update the updated_at timestamp
            new_updated_at = datetime.now(timezone.utc).isoformat()
            updates['updated_at'] = new_updated_at

            # Build query with optimistic lock
            query = self.client.table("jobs").update(updates).eq("id", job.id)

            # If the job has an updated_at, use it for optimistic locking
            # This ensures no one else modified the row since we read it
            if job.updated_at:
                query = query.eq("updated_at", job.updated_at)

            result = query.execute()

            if result.data:
                return self._row_to_job(result.data[0])

            # No data returned - could be a conflict (another process updated)
            # Retry with fresh data
            if attempt < max_retries - 1:
                import time
                # Small backoff before retry
                time.sleep(0.1 * (attempt + 1))
                continue

        # Exhausted retries - raise specific conflict error
        raise UpdateConflictError(
            f"Update conflict: Job {job_id} was modified by another process after {max_retries} retries"
        )

    def start_job(self, job_id: str, pid: int) -> Job:
        """
        Mark a job as started with its PID.

        Args:
            job_id: Job ID
            pid: Process ID of the running agent

        Returns:
            Updated Job object
        """
        return self.update_job(
            job_id,
            status=JobStatus.RUNNING,
            pid=pid,
            started_at=datetime.now(timezone.utc).isoformat(),
            last_heartbeat=datetime.now(timezone.utc).isoformat()
        )

    def heartbeat(self, job_id: str) -> None:
        """
        Update heartbeat timestamp to indicate job is still alive.

        Args:
            job_id: Job ID
        """
        job = self.get_job(job_id)
        if job:
            self.client.table("jobs").update({
                "last_heartbeat": datetime.now(timezone.utc).isoformat()
            }).eq("id", job.id).execute()

    def complete_job(self, job_id: str, result: dict = None) -> Job:
        """
        Mark a job as completed.

        Args:
            job_id: Job ID
            result: Optional result data to store

        Returns:
            Updated Job object
        """
        return self.update_job(
            job_id,
            status=JobStatus.COMPLETED,
            completed_at=datetime.now(timezone.utc).isoformat(),
            exit_code=0,
            result=result
        )

    def fail_job(self, job_id: str, error: str, exit_code: int = 1) -> Job:
        """
        Mark a job as failed.

        Args:
            job_id: Job ID
            error: Error message
            exit_code: Exit code (default 1)

        Returns:
            Updated Job object
        """
        return self.update_job(
            job_id,
            status=JobStatus.FAILED,
            completed_at=datetime.now(timezone.utc).isoformat(),
            exit_code=exit_code,
            error_message=error
        )

    def cancel_job(self, job_id: str) -> Job:
        """
        Cancel a job.

        Args:
            job_id: Job ID

        Returns:
            Updated Job object
        """
        return self.update_job(
            job_id,
            status=JobStatus.CANCELLED,
            completed_at=datetime.now(timezone.utc).isoformat()
        )

    def get_pending_jobs(self, assigned_to: str = None, limit: int = 10) -> list[Job]:
        """
        Get pending jobs, optionally filtered by agent.

        Args:
            assigned_to: Agent ID to filter by
            limit: Maximum number of jobs to return

        Returns:
            List of pending jobs
        """
        query = self.client.table("jobs").select("*").eq("status", "pending")

        if assigned_to:
            query = query.eq("assigned_to", assigned_to)

        result = query.order("created_at").limit(limit).execute()
        return [self._row_to_job(r) for r in result.data]

    def get_running_jobs(self, assigned_to: str = None) -> list[Job]:
        """
        Get all currently running jobs.

        Args:
            assigned_to: Optional agent ID to filter by

        Returns:
            List of running jobs
        """
        query = self.client.table("jobs").select("*").eq("status", "running")

        if assigned_to:
            query = query.eq("assigned_to", assigned_to)

        result = query.execute()
        return [self._row_to_job(r) for r in result.data]

    def get_hung_jobs(self, timeout_seconds: int = 300) -> list[Job]:
        """
        Get jobs that haven't sent a heartbeat recently.

        Args:
            timeout_seconds: Heartbeat timeout in seconds (default 300 = 5 minutes)

        Returns:
            List of hung jobs
        """
        result = self.client.rpc("detect_hung_jobs", {"timeout_seconds": timeout_seconds}).execute()
        return [self._row_to_job(r) for r in result.data]

    def get_job_tree(self, job_id: str) -> list[Job]:
        """
        Get a job and all its children (delegation chain).

        Args:
            job_id: Root job ID

        Returns:
            List of jobs in the tree
        """
        job = self.get_job(job_id)
        if not job:
            return []

        result = self.client.rpc("get_job_tree", {"job_uuid": job.id}).execute()
        return [self._row_to_job(r) for r in result.data]

    def log(self, job_id: str, level: str, message: str, metadata: dict = None):
        """
        Add a log entry for a job.

        Args:
            job_id: Job ID
            level: Log level (debug, info, warn, error)
            message: Log message
            metadata: Optional metadata dict
        """
        job = self.get_job(job_id)
        if job:
            self.client.table("job_logs").insert({
                "job_id": job.id,
                "level": level,
                "message": message,
                "metadata": metadata or {}
            }).execute()

    def get_logs(self, job_id: str, limit: int = 100) -> list[dict]:
        """
        Get logs for a job.

        Args:
            job_id: Job ID
            limit: Maximum number of log entries to return

        Returns:
            List of log entries
        """
        job = self.get_job(job_id)
        if not job:
            return []

        result = self.client.table("job_logs").select("*").eq(
            "job_id", job.id
        ).order("timestamp", desc=True).limit(limit).execute()
        return result.data

    def get_jobs_by_type(self, job_type: str, limit: int = 50) -> list[Job]:
        """
        Get jobs by type.

        Args:
            job_type: Job type to filter by
            limit: Maximum number of jobs to return

        Returns:
            List of jobs
        """
        result = self.client.table("jobs").select("*").eq(
            "job_type", job_type
        ).order("created_at", desc=True).limit(limit).execute()
        return [self._row_to_job(r) for r in result.data]

    def get_jobs_by_source(self, source_file: str, limit: int = 50) -> list[Job]:
        """
        Get jobs by source file.

        Args:
            source_file: Source file path
            limit: Maximum number of jobs to return

        Returns:
            List of jobs
        """
        result = self.client.table("jobs").select("*").eq(
            "source_file", source_file
        ).order("created_at", desc=True).limit(limit).execute()
        return [self._row_to_job(r) for r in result.data]

    def _row_to_job(self, row: dict) -> Job:
        """Convert database row to Job object."""
        return Job(
            id=row["id"],
            short_id=row["short_id"],
            job_type=row["job_type"],
            payload=row["payload"],
            status=JobStatus(row["status"]),
            pid=row.get("pid"),
            hostname=row.get("hostname"),
            created_at=row.get("created_at"),
            started_at=row.get("started_at"),
            completed_at=row.get("completed_at"),
            updated_at=row.get("updated_at"),
            last_heartbeat=row.get("last_heartbeat"),
            exit_code=row.get("exit_code"),
            error_message=row.get("error_message"),
            result=row.get("result"),
            parent_job_id=row.get("parent_job_id"),
            delegated_by=row.get("delegated_by"),
            assigned_to=row.get("assigned_to"),
            source_file=row.get("source_file"),
            source_line=row.get("source_line"),
            tags=row.get("tags", [])
        )
