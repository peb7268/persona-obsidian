#!/usr/bin/env python3
"""Real-time job monitoring via Supabase subscriptions."""

import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()


class JobMonitor:
    """Real-time job monitoring via Supabase subscriptions."""

    def __init__(self):
        """Initialize monitor."""
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")

        self.client = create_client(url, key)
        self.callbacks = {
            'job_created': [],
            'job_updated': [],
            'job_completed': [],
            'job_failed': [],
            'log_added': []
        }

    def on(self, event: str, callback):
        """
        Register a callback for an event type.

        Args:
            event: Event type (job_created, job_updated, etc.)
            callback: Callback function to call

        Returns:
            Self for chaining
        """
        if event in self.callbacks:
            self.callbacks[event].append(callback)
        return self

    async def start(self):
        """Start listening for real-time updates."""
        print("Monitor started, listening for real-time updates...")

        # Subscribe to jobs table changes
        jobs_channel = self.client.realtime.channel('jobs')

        jobs_channel.on(
            'postgres_changes',
            event='INSERT',
            schema='public',
            table='jobs',
            callback=lambda payload: self._emit('job_created', payload['new'])
        ).on(
            'postgres_changes',
            event='UPDATE',
            schema='public',
            table='jobs',
            callback=self._handle_job_update
        ).subscribe()

        # Subscribe to logs
        logs_channel = self.client.realtime.channel('logs')

        logs_channel.on(
            'postgres_changes',
            event='INSERT',
            schema='public',
            table='job_logs',
            callback=lambda payload: self._emit('log_added', payload['new'])
        ).subscribe()

        # Keep running
        while True:
            await asyncio.sleep(1)

    def _handle_job_update(self, payload):
        """Handle job update event."""
        job = payload['new']
        self._emit('job_updated', job)

        if job['status'] == 'completed':
            self._emit('job_completed', job)
        elif job['status'] == 'failed':
            self._emit('job_failed', job)

    def _emit(self, event: str, data: dict):
        """Emit event to all registered callbacks."""
        for callback in self.callbacks.get(event, []):
            try:
                callback(data)
            except Exception as e:
                print(f"Error in callback for {event}: {e}")


async def monitor_cli():
    """Simple CLI monitor for jobs."""
    monitor = JobMonitor()

    # Register event handlers
    monitor.on('job_created', lambda j: print(
        f"📝 Created: {j['short_id']} - {j['job_type']} "
        f"(assigned to: {j.get('assigned_to', 'none')})"
    ))

    monitor.on('job_updated', lambda j: print(
        f"🔄 Updated: {j['short_id']} -> {j['status']}"
    ))

    monitor.on('job_completed', lambda j: print(
        f"✅ Done: {j['short_id']} ({j['job_type']})"
    ))

    monitor.on('job_failed', lambda j: print(
        f"❌ Failed: {j['short_id']} - {j.get('error_message', 'unknown error')}"
    ))

    monitor.on('log_added', lambda l: print(
        f"   [{l['level'].upper():5s}] {l['message'][:80]}"
    ))

    await monitor.start()


def main():
    """Entry point for monitor."""
    try:
        asyncio.run(monitor_cli())
    except KeyboardInterrupt:
        print("\nMonitor stopped")


if __name__ == "__main__":
    main()
