"""Tests for JobStore class."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from persona.core.job_store import JobStore, Job, JobStatus


class TestJobStore:
    """Tests for JobStore initialization and configuration."""

    def test_init_with_env_vars(self, mock_env_vars):
        """Should initialize with environment variables."""
        with patch('persona.core.job_store.create_client') as mock_create:
            mock_create.return_value = MagicMock()
            store = JobStore()

            mock_create.assert_called_once_with(
                'http://localhost:54321',
                'test-key'
            )

    def test_init_with_explicit_credentials(self):
        """Should initialize with explicit credentials."""
        with patch('persona.core.job_store.create_client') as mock_create:
            mock_create.return_value = MagicMock()
            store = JobStore(
                supabase_url='http://custom:54321',
                supabase_key='custom-key'
            )

            mock_create.assert_called_once_with(
                'http://custom:54321',
                'custom-key'
            )

    def test_init_missing_credentials(self, monkeypatch):
        """Should raise ValueError if credentials missing."""
        monkeypatch.delenv('SUPABASE_URL', raising=False)
        monkeypatch.delenv('SUPABASE_KEY', raising=False)

        with pytest.raises(ValueError, match='SUPABASE_URL and SUPABASE_KEY must be set'):
            JobStore()


class TestCreateJob:
    """Tests for job creation."""

    def test_create_job_basic(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should create a job with basic fields."""
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.create_job(
                job_type='research',
                payload={'question': 'What is AI?'},
                assigned_to='researcher'
            )

            assert job.job_type == 'research'
            assert job.short_id == 'abc12345'
            assert job.status == JobStatus.PENDING
            assert job.assigned_to == 'researcher'

    def test_create_job_with_all_fields(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should create a job with all optional fields."""
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.create_job(
                job_type='research',
                payload={'question': 'What is AI?'},
                assigned_to='researcher',
                source_file='daily/2025-01-15.md',
                source_line=42,
                tags=['research', 'daily-note']
            )

            # Verify insert was called with correct data
            insert_call = mock_supabase_client.table.return_value.insert.call_args
            insert_data = insert_call[0][0]

            assert insert_data['job_type'] == 'research'
            assert insert_data['assigned_to'] == 'researcher'
            assert insert_data['source_file'] == 'daily/2025-01-15.md'
            assert insert_data['source_line'] == 42
            assert insert_data['tags'] == ['research', 'daily-note']

    def test_create_job_with_parent(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should create a delegated job with parent ID."""
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{**sample_job_row, 'parent_job_id': 'parent-uuid', 'delegated_by': 'assistant'}]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.create_job(
                job_type='research',
                payload={'question': 'Test'},
                parent_id='parent-uuid',
                delegated_by='assistant'
            )

            insert_data = mock_supabase_client.table.return_value.insert.call_args[0][0]
            assert insert_data['parent_job_id'] == 'parent-uuid'
            assert insert_data['delegated_by'] == 'assistant'


class TestGetJob:
    """Tests for job retrieval."""

    def test_get_job_by_uuid(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should get job by full UUID."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.get_job('550e8400-e29b-41d4-a716-446655440000')

            assert job is not None
            assert job.id == '550e8400-e29b-41d4-a716-446655440000'
            assert job.short_id == 'abc12345'

    def test_get_job_by_short_id(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should get job by short ID."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.get_job('abc12345')

            # Should query by short_id, not id
            eq_call = mock_supabase_client.table.return_value.select.return_value.eq.call_args
            assert eq_call[0][0] == 'short_id'
            assert eq_call[0][1] == 'abc12345'

    def test_get_job_not_found(self, mock_supabase_client, mock_env_vars):
        """Should return None if job not found."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.get_job('nonexistent')

            assert job is None


class TestStartJob:
    """Tests for starting jobs."""

    def test_start_job_sets_status_and_pid(self, mock_supabase_client, sample_job_row, sample_running_job_row, mock_env_vars):
        """Should set status to running and record PID."""
        # First call for get_job
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        # Second call for update
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_running_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.start_job('abc12345', pid=12345)

            assert job.status == JobStatus.RUNNING
            assert job.pid == 12345
            assert job.started_at is not None

    def test_start_job_sets_heartbeat(self, mock_supabase_client, sample_job_row, sample_running_job_row, mock_env_vars):
        """Should set initial heartbeat timestamp."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_running_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.start_job('abc12345', pid=12345)

            # Verify update was called with started_at and last_heartbeat
            update_call = mock_supabase_client.table.return_value.update.call_args
            update_data = update_call[0][0]

            assert 'started_at' in update_data
            assert 'last_heartbeat' in update_data


class TestCompleteJob:
    """Tests for completing jobs."""

    def test_complete_job_sets_status(self, mock_supabase_client, sample_job_row, sample_completed_job_row, mock_env_vars):
        """Should set status to completed."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_completed_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.complete_job('abc12345')

            assert job.status == JobStatus.COMPLETED
            assert job.exit_code == 0

    def test_complete_job_with_result(self, mock_supabase_client, sample_job_row, sample_completed_job_row, mock_env_vars):
        """Should store result data."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_completed_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            result_data = {'answer': 'AI is artificial intelligence.'}
            job = store.complete_job('abc12345', result=result_data)

            update_data = mock_supabase_client.table.return_value.update.call_args[0][0]
            assert update_data['result'] == result_data


class TestFailJob:
    """Tests for failing jobs."""

    def test_fail_job_sets_status_and_error(self, mock_supabase_client, sample_job_row, sample_failed_job_row, mock_env_vars):
        """Should set status to failed with error message."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_failed_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.fail_job('abc12345', error='Connection timeout')

            assert job.status == JobStatus.FAILED
            assert job.error_message == 'Connection timeout'

    def test_fail_job_sets_exit_code(self, mock_supabase_client, sample_job_row, sample_failed_job_row, mock_env_vars):
        """Should set custom exit code."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{**sample_failed_job_row, 'exit_code': 2}]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.fail_job('abc12345', error='Error', exit_code=2)

            update_data = mock_supabase_client.table.return_value.update.call_args[0][0]
            assert update_data['exit_code'] == 2


class TestCancelJob:
    """Tests for cancelling jobs."""

    def test_cancel_job(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should set status to cancelled."""
        cancelled_row = {**sample_job_row, 'status': 'cancelled', 'completed_at': '2025-01-15T10:00:00Z'}
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[cancelled_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.cancel_job('abc12345')

            assert job.status == JobStatus.CANCELLED


class TestGetPendingJobs:
    """Tests for getting pending jobs."""

    def test_get_pending_jobs(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should return pending jobs."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            jobs = store.get_pending_jobs()

            assert len(jobs) == 1
            assert jobs[0].status == JobStatus.PENDING

    def test_get_pending_jobs_filtered_by_agent(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should filter by assigned agent."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            jobs = store.get_pending_jobs(assigned_to='researcher')

            # Verify eq was called with assigned_to
            calls = mock_supabase_client.table.return_value.select.return_value.eq.call_args_list
            # First call is for status, second is for assigned_to
            assert any(call[0] == ('assigned_to', 'researcher') for call in calls)


class TestGetRunningJobs:
    """Tests for getting running jobs."""

    def test_get_running_jobs(self, mock_supabase_client, sample_running_job_row, mock_env_vars):
        """Should return running jobs."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_running_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            jobs = store.get_running_jobs()

            assert len(jobs) == 1
            assert jobs[0].status == JobStatus.RUNNING
            assert jobs[0].pid == 12345


class TestHeartbeat:
    """Tests for heartbeat updates."""

    def test_heartbeat_updates_timestamp(self, mock_supabase_client, sample_running_job_row, mock_env_vars):
        """Should update last_heartbeat timestamp."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_running_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            store.heartbeat('abc12345')

            update_call = mock_supabase_client.table.return_value.update.call_args
            update_data = update_call[0][0]
            assert 'last_heartbeat' in update_data


class TestLog:
    """Tests for job logging."""

    def test_log_creates_entry(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should create log entry in job_logs table."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            store.log('abc12345', 'info', 'Processing started')

            # Verify insert was called on job_logs table
            table_calls = [call[0][0] for call in mock_supabase_client.table.call_args_list]
            assert 'job_logs' in table_calls


class TestGetLogs:
    """Tests for retrieving job logs."""

    def test_get_logs(self, sample_job_row, mock_env_vars):
        """Should return log entries for job."""
        log_entries = [
            {'timestamp': '2025-01-15T10:00:00Z', 'level': 'info', 'message': 'Started'},
            {'timestamp': '2025-01-15T10:01:00Z', 'level': 'info', 'message': 'Processing'},
        ]
        # Create a fresh mock to avoid chain conflicts
        client = MagicMock()

        # First call for get_job (short_id lookup)
        job_select_mock = MagicMock()
        job_select_mock.eq.return_value.execute.return_value = MagicMock(data=[sample_job_row])

        # Second call for logs (job_id lookup with order/limit)
        log_select_mock = MagicMock()
        log_select_mock.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=log_entries)

        # Track calls to return different mocks
        call_count = [0]
        def table_side_effect(name):
            table_mock = MagicMock()
            if name == 'jobs':
                table_mock.select.return_value = job_select_mock
            elif name == 'job_logs':
                table_mock.select.return_value = log_select_mock
            return table_mock

        client.table.side_effect = table_side_effect

        with patch('persona.core.job_store.create_client', return_value=client):
            store = JobStore()
            logs = store.get_logs('abc12345')

            assert len(logs) == 2


class TestJobDataclass:
    """Tests for Job dataclass."""

    def test_job_from_row(self, sample_job_row, mock_supabase_client, mock_env_vars):
        """Should correctly convert database row to Job object."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            store = JobStore()
            job = store.get_job('abc12345')

            assert job.id == '550e8400-e29b-41d4-a716-446655440000'
            assert job.short_id == 'abc12345'
            assert job.job_type == 'research'
            assert job.payload == {'question': 'What is AI?'}
            assert job.status == JobStatus.PENDING
            assert job.assigned_to == 'researcher'
            assert job.source_file == 'daily/2025-01-15.md'
            assert job.source_line == 42
            assert job.tags == ['research', 'daily-note']


class TestJobStatus:
    """Tests for JobStatus enum."""

    def test_status_values(self):
        """Should have correct status values."""
        assert JobStatus.PENDING.value == 'pending'
        assert JobStatus.RUNNING.value == 'running'
        assert JobStatus.COMPLETED.value == 'completed'
        assert JobStatus.FAILED.value == 'failed'
        assert JobStatus.CANCELLED.value == 'cancelled'
        assert JobStatus.HUNG.value == 'hung'
