"""Process manager for running AI agent subprocesses."""

import subprocess
import signal
import os
import threading
import time
import io
import select
from pathlib import Path
from datetime import datetime
import psutil
from typing import Optional

from .job_store import Job, JobStore


class ProcessManager:
    """
    Manages Claude agent subprocesses with Supabase tracking.

    Handles starting agents, monitoring their health via heartbeats,
    and managing process lifecycle.
    """

    def __init__(
        self,
        job_store: JobStore,
        logs_dir: Path,
        persona_root: Path = None
    ):
        """
        Initialize ProcessManager.

        Args:
            job_store: JobStore instance for updating job status
            logs_dir: Directory to write process logs
            persona_root: Root directory of Persona system
        """
        self.job_store = job_store
        self.logs_dir = logs_dir
        self.logs_dir.mkdir(parents=True, exist_ok=True)

        self.persona_root = persona_root or Path(
            os.environ.get("PERSONA_ROOT", Path.home() / "vault/Projects/Persona")
        )
        self.vault_path = Path(
            os.environ.get("PERSONA_VAULT_PATH", Path.home() / "vault")
        )
        self.business = os.environ.get("PERSONA_BUSINESS", "PersonalMCO")

        self._heartbeat_threads = {}
        self._processes = {}

        # Log streaming configuration
        self._log_batch_size = int(os.environ.get('LOG_BATCH_SIZE', '10'))
        self._log_flush_interval = float(os.environ.get('LOG_FLUSH_INTERVAL', '5.0'))

    def start_agent(self, job: Job, stream_to_supabase: bool = True) -> int:
        """
        Start a Claude agent for a job.

        Args:
            job: Job to execute
            stream_to_supabase: If True, stream output to Supabase in real-time

        Returns:
            Process ID of started agent

        Raises:
            RuntimeError: If agent fails to start
        """
        log_file = self.logs_dir / f"{job.short_id}.log"
        error_file = self.logs_dir / f"{job.short_id}.error.log"

        # Build command based on job type
        cmd = self._build_command(job)

        self.job_store.log(job.id, "info", f"Starting agent: {' '.join(cmd)}")

        # Use PIPE for streaming if enabled, otherwise write to files
        if stream_to_supabase:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,  # Create new process group
                bufsize=1,  # Line buffered
                universal_newlines=True,  # Text mode for easier line reading
                env={
                    **os.environ,
                    'PERSONA_JOB_ID': job.id,
                    'PERSONA_SHORT_ID': job.short_id,
                    'PERSONA_JOB_TYPE': job.job_type,
                }
            )

            # Update job with PID first
            self.job_store.start_job(job.id, process.pid)

            # Store process reference
            self._processes[job.id] = process

            # Start streaming threads (write to both file and Supabase)
            self._start_streaming_threads(job, process, log_file, error_file)
        else:
            # Legacy: write directly to files
            with open(log_file, 'w') as stdout, open(error_file, 'w') as stderr:
                process = subprocess.Popen(
                    cmd,
                    stdout=stdout,
                    stderr=stderr,
                    start_new_session=True,
                    env={
                        **os.environ,
                        'PERSONA_JOB_ID': job.id,
                        'PERSONA_SHORT_ID': job.short_id,
                        'PERSONA_JOB_TYPE': job.job_type,
                    }
                )

            # Update job with PID
            self.job_store.start_job(job.id, process.pid)

            # Store process reference
            self._processes[job.id] = process

            # Start heartbeat and monitoring thread
            self._start_heartbeat(job.id, process)

        return process.pid

    def _start_streaming_threads(
        self,
        job: Job,
        process: subprocess.Popen,
        log_file: Path,
        error_file: Path
    ):
        """
        Start threads to stream stdout/stderr to both local files and Supabase.

        Args:
            job: Job being executed
            process: Subprocess with PIPE stdout/stderr
            log_file: Path to stdout log file
            error_file: Path to stderr log file
        """
        stdout_buffer = []
        stderr_buffer = []
        buffer_lock = threading.Lock()
        last_flush_time = [time.time()]

        def stream_reader(stream, local_file_path, buffer, level):
            """Read from stream, write to file, buffer for Supabase."""
            with open(local_file_path, 'w') as f:
                for line in iter(stream.readline, ''):
                    if not line:
                        break
                    line = line.rstrip('\n')
                    # Write to local file with timestamp
                    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    f.write(f"[{timestamp}] {line}\n")
                    f.flush()

                    # Add to buffer for Supabase
                    with buffer_lock:
                        buffer.append(line)

                        # Flush if batch size reached
                        if len(buffer) >= self._log_batch_size:
                            self._flush_log_buffer(job.id, buffer, level)
                            buffer.clear()
                            last_flush_time[0] = time.time()

        def buffer_flusher():
            """Periodically flush buffers even if not full."""
            heartbeat_interval = int(os.environ.get('JOB_HEARTBEAT_INTERVAL', '30'))

            while process.poll() is None:
                try:
                    self.job_store.heartbeat(job.id)
                except Exception as e:
                    print(f"Heartbeat failed for {job.short_id}: {e}")

                # Check if we should flush buffers based on time
                with buffer_lock:
                    if time.time() - last_flush_time[0] >= self._log_flush_interval:
                        if stdout_buffer:
                            self._flush_log_buffer(job.id, stdout_buffer.copy(), 'info')
                            stdout_buffer.clear()
                        if stderr_buffer:
                            self._flush_log_buffer(job.id, stderr_buffer.copy(), 'error')
                            stderr_buffer.clear()
                        last_flush_time[0] = time.time()

                time.sleep(min(heartbeat_interval, self._log_flush_interval))

            # Final flush when process exits
            with buffer_lock:
                if stdout_buffer:
                    self._flush_log_buffer(job.id, stdout_buffer.copy(), 'info')
                    stdout_buffer.clear()
                if stderr_buffer:
                    self._flush_log_buffer(job.id, stderr_buffer.copy(), 'error')
                    stderr_buffer.clear()

            # Handle process exit
            self._handle_process_exit(job.id, process)

        # Start stdout reader thread
        stdout_thread = threading.Thread(
            target=stream_reader,
            args=(process.stdout, log_file, stdout_buffer, 'info'),
            daemon=True
        )
        stdout_thread.start()

        # Start stderr reader thread
        stderr_thread = threading.Thread(
            target=stream_reader,
            args=(process.stderr, error_file, stderr_buffer, 'error'),
            daemon=True
        )
        stderr_thread.start()

        # Start flusher/heartbeat thread
        flusher_thread = threading.Thread(target=buffer_flusher, daemon=True)
        flusher_thread.start()

        self._heartbeat_threads[job.id] = flusher_thread

    def _flush_log_buffer(self, job_id: str, messages: list, level: str):
        """
        Flush a buffer of log messages to Supabase.

        Args:
            job_id: Job ID
            messages: List of log messages
            level: Log level (info, error)
        """
        if not messages:
            return

        try:
            self.job_store.log_batch(job_id, messages, level)
        except Exception as e:
            # Log locally but don't crash
            print(f"Failed to flush logs to Supabase for {job_id}: {e}")

    def _build_command(self, job: Job) -> list[str]:
        """
        Build the command to execute for this job type.

        Supports both new Python-based execution and legacy bash script execution.

        Args:
            job: Job to build command for

        Returns:
            Command list suitable for subprocess.Popen
        """
        if job.job_type == 'research':
            # Research question from daily note
            question = job.payload.get('question', '')
            prompt = f"""You are a research agent. Research the following question thoroughly:

Question: {question}

Requirements:
1. Search for authoritative sources using web search
2. Synthesize findings into a clear, structured summary
3. Save your findings to: {self.vault_path}/Resources/General/Embeds/{job.short_id}-research.md
4. Include citations and key insights
5. Structure the response with clear sections

When complete, output: PERSONA_COMPLETE
If you encounter an error, output: PERSONA_ERROR: <description>
"""
            return self._build_claude_command(job, prompt)

        elif job.job_type == 'meeting_extract':
            # Extract meeting notes from daily note
            meeting = job.payload.get('meeting', {})
            prompt = f"""Extract meeting notes from the daily note.

Meeting: {meeting.get('title')} at {meeting.get('time_str')}
Source file: {job.source_file}

Create a meeting note at: {self.vault_path}/Meetings/{job.short_id}-{meeting.get('title', 'meeting')}.md

Include:
- Attendees
- Key discussion points
- Action items with owners
- Follow-ups and deadlines

When complete, output: PERSONA_COMPLETE
"""
            return self._build_claude_command(job, prompt)

        elif job.job_type == 'delegate':
            # Agent delegating to another agent
            task = job.payload.get('task', '')
            context = job.payload.get('context', '')
            prompt = f"""You are the {job.assigned_to} agent.

Task delegated by {job.delegated_by}:
{task}

Context:
{context}

Complete this task according to your role capabilities.
Save any outputs to appropriate locations in the vault.

When complete, output: PERSONA_COMPLETE
If you need to delegate to another agent, output: PERSONA_DELEGATE: <agent_id>: <task>
"""
            return self._build_claude_command(job, prompt)

        elif job.job_type == 'agent_action':
            # Legacy agent execution via bash script
            agent_name = job.payload.get('agent', '')
            action = job.payload.get('action', '')
            timeout = job.payload.get('timeout', 300)

            return [
                'bash',
                str(self.persona_root / 'scripts/run-agent.sh'),
                self.business,
                agent_name,
                action,
                str(timeout)
            ]

        else:
            # Generic prompt execution
            prompt = job.payload.get('prompt', 'No prompt provided')
            return self._build_claude_command(job, prompt)

    def _build_claude_command(self, job: Job, prompt: str) -> list[str]:
        """
        Build a Claude CLI command.

        Args:
            job: Job context
            prompt: Prompt to send to Claude

        Returns:
            Command list
        """
        # Use the model specified in payload, or default
        model = job.payload.get('model', os.environ.get('CLAUDE_MODEL', 'opus'))

        return [
            "claude",
            "-p", prompt,
            "--output-format", "text",
            "--max-turns", "20",
            "--model", model,
        ]

    def _start_heartbeat(self, job_id: str, process: subprocess.Popen):
        """
        Start a thread to send heartbeats and monitor process.

        Args:
            job_id: Job ID to monitor
            process: Process to monitor
        """
        def heartbeat_loop():
            heartbeat_interval = int(os.environ.get('JOB_HEARTBEAT_INTERVAL', '30'))

            while process.poll() is None:  # While process is running
                try:
                    self.job_store.heartbeat(job_id)
                except Exception as e:
                    # Log but don't crash the heartbeat thread
                    print(f"Heartbeat failed for {job_id}: {e}")

                time.sleep(heartbeat_interval)

            # Process finished
            self._handle_process_exit(job_id, process)

        thread = threading.Thread(target=heartbeat_loop, daemon=True)
        thread.start()
        self._heartbeat_threads[job_id] = thread

    def _handle_process_exit(self, job_id: str, process: subprocess.Popen):
        """
        Handle process exit by checking logs and updating job status.

        Args:
            job_id: Job ID
            process: Finished process
        """
        exit_code = process.returncode
        job = self.job_store.get_job(job_id)

        if not job:
            return

        # Read logs to check for completion marker
        log_file = self.logs_dir / f"{job.short_id}.log"
        error_file = self.logs_dir / f"{job.short_id}.error.log"

        log_content = log_file.read_text() if log_file.exists() else ""
        error_content = error_file.read_text() if error_file.exists() else ""

        if "PERSONA_COMPLETE" in log_content:
            self.job_store.complete_job(job_id)
            self.job_store.log(job_id, "info", "Job completed successfully")

        elif "PERSONA_ERROR" in log_content or exit_code != 0:
            error = self._extract_error(log_content) or error_content or f"Exit code: {exit_code}"
            self.job_store.fail_job(job_id, error, exit_code)
            self.job_store.log(job_id, "error", f"Job failed: {error}")

        elif "PERSONA_DELEGATE" in log_content:
            # Handle delegation
            delegation = self._extract_delegation(log_content)
            if delegation:
                self.job_store.log(
                    job_id,
                    "info",
                    f"Agent delegated to {delegation['agent']}: {delegation['task']}"
                )
                # Create delegated job
                self.job_store.create_job(
                    job_type="delegate",
                    payload={"task": delegation['task'], "context": log_content},
                    assigned_to=delegation['agent'],
                    parent_id=job.id,
                    delegated_by=job.assigned_to
                )
            self.job_store.complete_job(job_id)

        else:
            # Assume success if no error markers
            self.job_store.complete_job(job_id)
            self.job_store.log(job_id, "info", "Job completed (no explicit marker)")

        # Clean up process reference
        if job_id in self._processes:
            del self._processes[job_id]

    def _extract_error(self, log_content: str) -> Optional[str]:
        """Extract error message from logs."""
        for line in log_content.split('\n'):
            if 'PERSONA_ERROR:' in line:
                return line.split('PERSONA_ERROR:')[1].strip()
        return None

    def _extract_delegation(self, log_content: str) -> Optional[dict]:
        """Extract delegation instruction from logs."""
        for line in log_content.split('\n'):
            if 'PERSONA_DELEGATE:' in line:
                parts = line.split('PERSONA_DELEGATE:')[1].strip().split(':', 1)
                if len(parts) == 2:
                    return {'agent': parts[0].strip(), 'task': parts[1].strip()}
        return None

    def kill_job(self, job_id: str, force: bool = False) -> bool:
        """
        Kill a running job.

        Args:
            job_id: Job ID to kill
            force: Use SIGKILL instead of SIGTERM

        Returns:
            True if killed successfully, False otherwise
        """
        job = self.job_store.get_job(job_id)
        if not job or not job.pid:
            return False

        try:
            sig = signal.SIGKILL if force else signal.SIGTERM
            # Kill the entire process group
            os.killpg(os.getpgid(job.pid), sig)
            self.job_store.cancel_job(job_id)
            self.job_store.log(job_id, "warn", f"Job killed with signal {sig.name}")
            return True
        except ProcessLookupError:
            # Process already dead
            return False
        except Exception as e:
            self.job_store.log(job_id, "error", f"Failed to kill job: {e}")
            return False

    def get_process_info(self, job_id: str) -> Optional[dict]:
        """
        Get detailed process info for a job.

        Args:
            job_id: Job ID

        Returns:
            Dict with process info, or None if not found
        """
        job = self.job_store.get_job(job_id)
        if not job or not job.pid:
            return None

        try:
            proc = psutil.Process(job.pid)
            return {
                'pid': job.pid,
                'status': proc.status(),
                'cpu_percent': proc.cpu_percent(interval=0.1),
                'memory_mb': proc.memory_info().rss / 1024 / 1024,
                'create_time': datetime.fromtimestamp(proc.create_time()).isoformat(),
                'children': len(proc.children(recursive=True)),
                'cmdline': proc.cmdline(),
            }
        except psutil.NoSuchProcess:
            return {'pid': job.pid, 'status': 'terminated'}

    def is_running(self, job_id: str) -> bool:
        """
        Check if a job is currently running.

        Args:
            job_id: Job ID

        Returns:
            True if running, False otherwise
        """
        if job_id in self._processes:
            process = self._processes[job_id]
            return process.poll() is None
        return False
