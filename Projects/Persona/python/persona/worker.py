#!/usr/bin/env python3
"""Worker daemon that processes jobs from the queue."""

import time
import os
import signal
import sys
from pathlib import Path
from dotenv import load_dotenv

from persona.core.job_store import JobStore, JobStatus
from persona.core.process_manager import ProcessManager


load_dotenv()


class Worker:
    """Worker that processes jobs from the queue."""

    def __init__(
        self,
        agent_id: str = None,
        concurrency: int = 3,
        poll_interval: int = 5
    ):
        """
        Initialize worker.

        Args:
            agent_id: Only process jobs for this agent (None = process all)
            concurrency: Maximum number of concurrent jobs
            poll_interval: Seconds between queue checks
        """
        self.agent_id = agent_id
        self.concurrency = concurrency
        self.poll_interval = poll_interval
        self.running = True

        self.job_store = JobStore()
        self.process_manager = ProcessManager(
            self.job_store,
            Path.home() / ".persona/logs"
        )

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        print(f"\nReceived signal {signum}, shutting down gracefully...")
        self.running = False

    def run(self):
        """Main worker loop."""
        print(f"Worker started (agent: {self.agent_id or 'all'}, concurrency: {self.concurrency})")

        while self.running:
            try:
                # Check how many jobs we're currently running
                running = self.job_store.get_running_jobs(assigned_to=self.agent_id)
                active_count = len(running)

                if active_count < self.concurrency:
                    # We have capacity, get pending jobs
                    available_slots = self.concurrency - active_count
                    pending = self.job_store.get_pending_jobs(
                        assigned_to=self.agent_id,
                        limit=available_slots
                    )

                    for job in pending:
                        print(f"Starting job {job.short_id} ({job.job_type})")
                        try:
                            self.process_manager.start_agent(job)
                        except Exception as e:
                            print(f"Failed to start job {job.short_id}: {e}")
                            self.job_store.fail_job(job.id, str(e))

                # Sleep before next poll
                time.sleep(self.poll_interval)

            except KeyboardInterrupt:
                print("\nKeyboard interrupt, shutting down...")
                break
            except Exception as e:
                print(f"Error in worker loop: {e}")
                time.sleep(self.poll_interval)

        print("Worker stopped")

    def check_hung_jobs(self):
        """Check for and handle hung jobs."""
        timeout = int(os.environ.get('JOB_HUNG_TIMEOUT', '300'))
        hung_jobs = self.job_store.get_hung_jobs(timeout)

        for job in hung_jobs:
            print(f"Detected hung job: {job.short_id} (last heartbeat: {job.last_heartbeat})")
            # Mark as hung in database
            self.job_store.update_job(job.id, status=JobStatus.HUNG)
            # Optionally kill the process
            self.process_manager.kill_job(job.id, force=True)


def main():
    """Entry point for worker daemon."""
    import argparse

    parser = argparse.ArgumentParser(description='Persona job queue worker')
    parser.add_argument(
        '--agent', '-a',
        help='Only process jobs for this agent'
    )
    parser.add_argument(
        '--concurrency', '-c',
        type=int,
        default=int(os.environ.get('WORKER_CONCURRENCY', '3')),
        help='Maximum concurrent jobs'
    )
    parser.add_argument(
        '--poll-interval', '-p',
        type=int,
        default=int(os.environ.get('WORKER_POLL_INTERVAL', '5')),
        help='Seconds between queue checks'
    )

    args = parser.parse_args()

    worker = Worker(
        agent_id=args.agent,
        concurrency=args.concurrency,
        poll_interval=args.poll_interval
    )

    try:
        worker.run()
    except Exception as e:
        print(f"Worker crashed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
